# TernConnect — End-to-End Flow: Integration to Live Usage 

How the three services connect, from a user's first integration through a live voice session to teardown: `Ternkonnect-Digital-Accessibilty-Platform` (control plane — accounts, billing, usage), `digital-accessibility-intelligence` (data plane — Gemini Live session, tools), and `new-chrome-extension` (client).

---

## Phase A — Integration (one-time setup)

```
new-chrome-extension          Ternkonnect-Digital-Accessibilty-Platform
        |                              |
        |  1. (web dashboard) login -> | POST /api/auth/login
        |                              |   validates User+password -> dashboard JWT (1 day)
        |                              |
        |  2. (web dashboard)          | POST /api/platform/chrome-integration  (auth: dashboard JWT)
        |     "create integration"  -> |   creates ChromeIntegration { userId, integrationCode }
        |                              |
        |  3. install extension,       |
        |     open popup, enter        |
        |     email + integrationCode  |
        |                              |
        |  4. integrate_profile     -> | POST /api/platform/chrome/integrate
        |                              |   checks: User exists, Subscription active,
        |                              |   ChromeIntegration.integrationCode matches
        |                              |   -> marks integration "active", links ChromeProfile
        |  <- {success: true} ---------|
        |                              |
        |  5. stores ternkonnectEmail/ |
        |     ternkonnectCode in       |
        |     chrome.storage.local     |
```

Integration happens once. From here on, every voice session reuses the stored email + integrationCode.

---

## Phase B — Starting a voice session (triggered by the wake phrase)

The extension boots **dormant**: it only runs a local wake-word listener (Chrome's `SpeechRecognition`, matching "Hey TernKonnect") and does *not* open a Gemini Live connection. Step 6 below only fires once that phrase is heard — not at boot — specifically so a capped session's minutes (5 on Starter, 30 on Pro/Enterprise) don't tick away while the extension just sits open and waiting. After ~90 seconds of quiet following a conversation, the extension proactively disconnects and returns to dormant, re-arming the wake-word listener.

```
Extension (offscreen.js)   Platform                     digital-accessibility-intelligence   Gemini Live
        |                     |                                    |                              |
   6.   | get_chrome_session_ |                                    |                              |
        | token (via bg.js)   |                                    |                              |
   7.   |-------------------->| POST /api/auth/session              |                              |
        |                     |   {email, integrationCode}          |                              |
   8.   |                     |   re-validates Subscription +       |                              |
        |                     |   ChromeIntegration, signs JWT       |                              |
        |                     |   (JWT_SECRET, scope:"voice_session",|                              |
        |                     |    plan_tier, max_session_seconds,   |                              |
        |                     |    max_concurrent_sessions, 30m TTL) |                              |
   9.   |<--------------------| {token, expiresIn}                  |                              |
        | (cached in background.js until ~60s before expiry)        |                              |
        |                                                           |                              |
  10.   |------------------------ open WebSocket ----------------->|                              |
  11.   |---- {type:"auth", token} --------------------------------->|                              |
  12.   |                                                           | validate_token(): verify     |
        |                                                           | signature w/ same JWT_SECRET,|
        |                                                           | check scope — NO db call     |
  13.   |                                                           | session_manager.acquire():   |
        |                                                           | check per-user + global caps |
        |              (if over capacity: send capacity_exceeded,   |                              |
        |               close — no Gemini cost incurred at all)     |                              |
  14.   |                                                           |---- open WS, send "setup" -->|
        |                                                           |  (system prompt from         |
        |                                                           |   core/prompts.py + 27 tool  |
        |                                                           |   declarations from tools.py)|
  15.   |<---------------------------------- setupComplete ----------------------------------------|
        | (sends "Begin." nudge on first connect -> Gemini speaks the welcome greeting)            |
```

---

## Phase C — Live usage loop (repeats continuously while the session is open)

```
Extension                  Intelligence backend                Gemini Live
   |                              |                                 |
16.| mic audio (realtimeInput) -->| relay + track audio_seconds_in  |
   | (skipped while isPlaying —   |-------------------------------->|
   |  half-duplex, avoids echo)   |                                 |
   |                              |                          18. Gemini does STT + reasoning,
   |                              |                              decides to act
   |                              |<----------- toolCall -----------|
19.|                       19. intercept: tool_call_count++,         |
   |                           send feedback_sound "tick",          |
   |                           log (redacted), relay unmodified      |
   |<---- toolCall ---------------|                                 |
20.| forward to background.js -> chrome.scripting.executeScript     |
21.| background.js runs the real DOM action (click/type/scroll/     |
   | shadow-DOM-aware element find / dismiss_overlay / etc.)        |
   | <- {success / error} result                                    |
22.| toolResponse ---------------->| 23. intercept: success/fail ->  |
   |                              |     feedback_sound, retry-count  |
   |                              |     tracking (3 fails in a row   |
   |                              |     on the same tool ->          |
   |                              |     action_failed_final)         |
   |                              |---------- toolResponse --------->|
   |                              |                          24. Gemini continues, eventually
   |                              |                              emits TTS audio / text
   |<------------------- serverContent (audio/text) ------------------|
25.| play TTS audio -> isPlaying=true (mutes mic send until drained) |
26.|                              | (>8s reasoning gap with no output
   |<---- thinking_filler --------|  -> filler sent, logged client-side)
   |                              |                                 |
   `-------------------------- loop repeats ---------------------------`
```

---

## Phase D — Token refresh, idle/duration limits, teardown

```
~25 min in:  offscreen.js force-refreshes the token (same Phase B call to
             /api/auth/session) and sends {type:"reauth", token} over the
             SAME open socket -> Intelligence backend swaps in new claims,
             Gemini session is never interrupted.

Idle/duration watchdog (Intelligence backend): no activity for
IDLE_DISCONNECT_SECONDS, or duration >= min(token.max_session_seconds,
MAX_SESSION_DURATION_SECONDS) -> cancels all tasks, closes Gemini WS + client WS.

On shutdown (clean close, idle timeout, duration cap, or crash) AND every
USAGE_REPORT_INTERVAL_SECONDS during long sessions:
  Intelligence backend --POST /api/usage/report--> Platform
    (X-Service-Key: INTELLIGENCE_SERVICE_KEY, NOT the user's JWT)
    {user_id, integration_id, duration_seconds delta, tool_call_count delta, audio_seconds delta}
  Platform writes a UsageLog row.

Extension's service-worker sees the WS close -> reconnects after 5s backoff,
unless the close was caused by auth_failed (suppressNextReconnect=true).
```

---

## Trial = Starter plan, not a separate path

There is no anonymous trial mode anymore. Every session — free or paid — goes through Phases A–D above: link email + integration code, get a JWT from `POST /api/auth/session`, connect to `digital-accessibility-intelligence`. "Trial" is just the Starter plan's tighter limits:

- `max_session_seconds: 300` (5 min) instead of `1800` (30 min) for Pro/Enterprise
- A hard cap of 3 lifetime sessions, tracked via `Subscription.trialSessionsUsed` and incremented each time `/api/auth/session` issues a Starter-plan token
- Once exhausted, that endpoint returns `402 { trialExhausted: true }` instead of a token; the extension shows an "Upgrade Plan" prompt (opens the dashboard's billing page) instead of retrying

The Platform's old anonymous `?trial=true` bypass in its raw WebSocket proxy (`server.js`) was removed — every connection now requires a real email + integrationCode, same as the rest of the system.
