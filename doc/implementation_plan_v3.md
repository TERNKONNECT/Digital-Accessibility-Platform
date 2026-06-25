# TernConnect — Implementation Plan v3

A cloud-deployed AI brain that gives blind and visually impaired users voice control over web platforms — especially LMS systems — built with the auth, capacity, compliance, and testing guardrails needed to actually run it in production, not just demo it. Deployable as Chrome extension (Phase 1), desktop app (Phase 3), and mobile app (Phase 4).

---

## Changelog: v2 → v3

Every row below is a gap identified in the v2 review and the corresponding fix in this plan.

| # | Gap in v2 | Fix in v3 |
|---|---|---|
| 1 | No auth, rate-limiting, or cost control on the Phase 1 backend | Platform-issued short-lived JWT, validated locally by the Intelligence backend, + per-key/global concurrency caps (`core/auth.py`, `core/session_manager.py`) — see **System Topology** below |
| 2 | Payment-form data handled with no compliance treatment | Redaction layer (`core/redaction.py`), sensitive-data history policy, card autofill gated behind `ENABLE_PAYMENT_AUTOFILL` (default off) pending legal/PCI review |
| 3 | CAPTCHA limitation papered over by an unverified "~92% coverage" claim | Explicit **Known Limitations** section; coverage claim removed until measured by usability testing |
| 4 | No defined behavior after retries are exhausted | New `action_failed_final` flow: forced orientation + screenshot offer, never silent |
| 5 | Latency claim ("~500ms vs ~2.5s") covered model turnaround only, not the full action loop | Explicit end-to-end latency budgets + "still working on it" filler speech for long reasoning turns |
| 6 | No echo-cancellation strategy for speaker (non-headphone) users | Half-duplex default (mic muted during TTS) + browser AEC constraints + instant-interrupt shortcut |
| 7 | No session capacity or cost model for the "one brain" backend | `MAX_CONCURRENT_SESSIONS`, idle/duration auto-disconnect, per-session usage logging |
| 8 | Verification plan was manual-only, with no accessibility validation | Automated test suite (tool router, prompt eval harness, DOM controller, redaction) + mandatory blind-user usability testing gate before Phase 1 sign-off |
| 9 | Generic element-finder unvalidated against shadow DOM / virtualized lists | Shadow-DOM traversal, scroll-and-retry for virtualized lists, MutationObserver wait-for-element |
| 10 | Phase 1 shipped fully open, with no usage tracking, as "BUILD NOW" | Phase 1 scope revised to require items 1–9 above before being considered done |
| 11 | No defined interaction/auth model across the three actual services (Platform, Intelligence backend, Extension) | New **System Topology & Cross-Service Interaction** section below: Platform issues short-lived JWTs, the Intelligence backend validates them statelessly and reports usage back asynchronously |

---

## Implementation Notes — Phase 1, As Built

Phase 1 has been implemented against the three real repos (`Ternkonnect-Digital-Accessibilty-Platform`, `digital-accessibility-intelligence`, `new-chrome-extension`). A few details changed from the original plan once they hit the existing, working code — recorded here so this doc stays an accurate reference rather than diverging from reality.

- **Wire protocol: native Gemini Live format, not a custom one.** `new-chrome-extension` already speaks Gemini Live's own message shapes end-to-end (`setup` / `clientContent` / `realtimeInput` out; `setupComplete` / `serverContent` / `toolCall` / `toolResponse` in) via the existing `offscreen.js`. Rather than introducing the full custom protocol originally sketched (`request_page_state`, `execute_action`, etc.), the Intelligence backend **relays Gemini's native messages directly** and layers a small set of additive control messages on top (`auth`, `reauth`, `auth_failed`, `capacity_exceeded`, `action_failed_final`, `thinking_filler`, `feedback_sound`, `idle_warning` — see `models/messages.py`), distinguished from native messages by a top-level `"type"` key the client checks for first. This avoided a much larger, riskier rewrite of both the extension and backend for no behavioral benefit.
- **JWT secret is the Platform's existing `JWT_SECRET`, not a new `PLATFORM_JWT_SECRET`.** The Platform already issues dashboard-login JWTs via `jsonwebtoken` + `process.env.JWT_SECRET` (`middleware/authenticate.js`). The chrome-session token reuses that exact secret with a `scope: "voice_session"` claim the Intelligence backend requires, instead of provisioning a second signing secret.
- **`POST /api/auth/session` reuses the existing ChromeIntegration/Subscription validation**, the same check `/api/platform/chrome/integrate` already performs (email → User → active Subscription → matching `ChromeIntegration.integrationCode`), rather than a new auth subsystem. It lives in `routes/auth.js` next to `/login`.
- **Tool count is 27, not exactly 25.** The existing extension already implemented 20 of the originally-planned tools (under slightly different names, e.g. `fill_form_field` instead of `type_text`). Phase 1 added the 7 that were missing: `get_orientation`, `dismiss_overlay`, `keyboard_navigate`, `select_option`, `type_rich_text`, `submit_quiz`, `get_quiz_timer`. Dedicated drag-and-drop tooling was scoped out — `keyboard_navigate` is the documented fallback for reorderable widgets, consistent with this plan's own guidance, since synthetic drag events are unreliable across frameworks.
- **Trial mode was unified into the same authenticated flow, not kept as a separate anonymous path.** The original anonymous trial (3 sessions × 5 minutes tracked in `chrome.storage.local`, connecting through the Platform's raw proxy with no auth) was removed, including the proxy's `trial=true` bypass in `server.js` — that bypass would have stayed reachable by anyone regardless of extension UI changes, which defeats the point of requiring login. Every session, free or paid, now goes through the same `POST /api/auth/session` → JWT → Intelligence backend flow. "Trial" became: every new user gets a Starter plan (already auto-assigned by the Platform's existing `ensureSubscription()`), and the Starter plan gets a tighter `max_session_seconds` (300s vs. 1800s) plus a hard lifetime cap of 3 sessions, tracked server-side via `Subscription.trialSessionsUsed` and enforced in `/api/auth/session` (402 + `trialExhausted: true` once exhausted). This closes the trivial "clear extension storage for unlimited trials" loophole and means trial users get the real v3 brain (27 tools, full prompt) instead of a separate, weaker client-side prompt.
- **Half-duplex audio ships without a new keyboard shortcut.** The mic-mute-during-TTS fix is implemented (`offscreen.js` skips sending audio chunks while playback is active), but the "instant interrupt via shortcut" half of the original fix was deferred — `manifest.json` doesn't declare a `commands` entry yet, and adding one is a small, separate follow-up rather than a blocker for the core echo fix.
- **Feedback sounds are synthesized client-side, not bundled `.wav` assets.** `offscreen.js` plays short oscillator tones keyed by sound name instead of loading/base64-decoding pre-recorded files, since no actual sound design assets exist yet. Swapping in real recorded cues later is a client-only change — the `feedback_sound` message contract doesn't need to change.
- **Popup UI for a configurable backend URL was not added.** `INTELLIGENCE_WS_URL` is a constant in `offscreen.js` (defaults to local dev) rather than a popup settings field; wiring it through `popup.html` is straightforward follow-up work, not done in this pass.

---

## Architecture

```
Cloud Backend (The Brain)
├── Auth Gate                 [NEW] Validates Platform-issued JWT (signature + expiry)
├── Session Manager           [NEW] Concurrency caps from JWT claims, idle/duration auto-disconnect
├── WebSocket Gateway (FastAPI)
├── Gemini Live API Session
│    ├── Audio In
│    ├── Gemini 2.5 Flash (STT + Reasoning + TTS)
│    ├── Audio Out
│    └── Function Calls (25 browser tools)
├── Tool Router (actions → client)
├── Redaction Layer           [NEW] Strips sensitive data before history/logs
└── Audio Feedback Engine

Clients (Thin)
├── Chrome Extension (Phase 1)
├── Desktop App (Phase 3)
└── Mobile App (Phase 4)
```

Every client connects over WebSocket. The Auth Gate and Session Manager sit in front of the Gemini Live session so that no paid Gemini session opens for an unauthenticated or over-capacity connection.

### Key Decisions

| Decision | Rationale |
|---|---|
| Central deployed backend | One brain powers all clients. Update once, every platform improves. |
| Gemini Live API (not 3 separate APIs) | Single connection handles STT + reasoning + TTS. ~500ms model turnaround vs ~2.5s, ~60% cheaper. (Full action-loop latency is budgeted separately below — this number covers model turnaround only.) |
| Chrome extension as primary client | Controls the user's real browser/DOM directly. Uses their existing sessions. |
| WebSocket protocol | Real-time bidirectional audio streaming. |
| Audio feedback engine | Blind users need continuous sound cues — silence = uncertainty. |
| Keyboard navigation fallback | When DOM clicks fail, Tab/Enter always works. |
| Cross-origin iframe injection | Payment forms and video embeds live in iframes — must reach them. |
| **Platform-issued JWT gate** *(new)* | The Platform already owns identity/billing — the Intelligence backend validates a short-lived token it issues rather than re-implementing auth or sharing DB access. |
| **Claims-driven + global session caps** *(new)* | Per-user/plan caps travel in the JWT (no DB lookup); a global ceiling backstops the whole backend regardless of plan. |
| **Redaction layer on history/logs** *(new)* | Payment and other sensitive data must never persist in logs or the rolling conversation-history buffer. |
| **Half-duplex audio default** *(new)* | Simpler and safer than full acoustic echo cancellation; mic is muted while TTS plays, with an instant-interrupt shortcut. |
| **Mandatory usability-testing gate** *(new)* | Coverage and usability claims must be measured with real blind/screen-reader users, not asserted up front. |

---

## Known Limitations

Stated explicitly rather than implied away, so the team and users have accurate expectations.

- **Visual CAPTCHA is not solvable by the agent.** When one blocks progress, the agent tells the user plainly, asks if a sighted helper is available, and stops trying to brute-force it. Any future coverage metric must exclude CAPTCHA-gated flows or count them as a defined "needs assistance" outcome, not a failure.
- **Audio-only.** This plan supports speech input/output. It does not support refreshable braille displays or other tactile output, so it does not yet serve deaf-blind users. State this rather than imply universal blind-user coverage.
- **No coverage percentage is claimed in this plan.** The "~92% of scenarios" figure from v2 had no stated methodology. Coverage will be defined and measured via the usability-testing protocol below, not asserted before testing happens.

## Compliance Notes

- **Payment card entry is gated.** `keyboard_navigate` can still walk a payment iframe, but card-digit auto-entry only runs if `ENABLE_PAYMENT_AUTOFILL=true`, which defaults to `false` until legal/PCI review signs off. With the flag off, the agent reads each field aloud and waits for the user to enter it via their own input method (mouse, keyboard, or native screen reader), confirming only the last 4 digits back.
- **No raw card/CVV data persists.** `core/redaction.py` strips card-number-like and CVV-like digit sequences before they reach disk-based logs or the rolling conversation-history window, regardless of the autofill flag.
- **Data sent to Gemini is scoped to the active tab's content needed for the current request** (screenshot, accessibility tree, page text) — this plan does not add background or always-on page scraping.

---

## System Topology & Cross-Service Interaction

This plan spans three separate codebases, each owning a distinct responsibility. This section is the map between them.

| Service | Repo / Folder | Role | Owns the DB? |
|---|---|---|---|
| **Platform** | `Ternkonnect-Digital-Accessibilty-Platform` *(existing)* | Control plane: users, integration PINs, subscriptions, billing, usage tracking | **Yes** — sole owner of Postgres |
| **Intelligence backend** | `digital-accessibility-intelligence` *(this plan builds here)* | Data plane: Gemini Live session, the 25 browser tools, real-time WebSocket with the extension | No — stateless w.r.t. user records |
| **Extension** | `new-chrome-extension` *(existing, modified by this plan)* | Client: captures audio, executes DOM actions, renders feedback | No |

Everything in the **Backend — File by File** and **Chrome Extension — File by File** sections below refers to `digital-accessibility-intelligence` and `new-chrome-extension` respectively. The Platform is treated as an external dependency this plan integrates with, not something this plan rebuilds.

### Why the DB stays in the Platform only

The Intelligence backend is the latency-sensitive, real-time leg of the system — every voice turn flows through it. It must never block on a Postgres round-trip to the Platform to authenticate a connection or check a session cap. So the design splits identity/entitlement (slow-changing, DB-backed, lives in the Platform) from session execution (fast-changing, in-memory, lives in the Intelligence backend), connected by a short-lived signed credential instead of shared DB access.

### The three interaction paths

```
┌─────────────────────┐                      ┌──────────────────────────┐
│   new-chrome-        │   1. REST (HTTPS)    │   Ternkonnect-Digital-    │
│   extension           │ ──────────────────▶ │   Accessibilty-Platform  │
│   (popup: email+PIN)  │ ◀────────────────── │   (owns Postgres)        │
└──────────┬───────────┘   JWT (15–30 min TTL)  └────────────┬─────────────┘
           │                                                 ▲
           │ 2. WSS, JWT in first `auth` message             │ 3. REST (service-to-service)
           ▼                                                 │    usage report on session close
┌──────────────────────────┐                                 │
│   digital-accessibility-  │ ────────────────────────────────┘
│   intelligence            │
│   (Gemini Live + tools)   │
└──────────────────────────┘
```

1. **Extension ↔ Platform (REST/HTTPS)** — user enters email + integration PIN in the extension popup (reusing the Platform's existing `IntegrationPin`/`Subscription` validation). On success, Platform mints a short-lived signed JWT and returns it. This is the only path where the user's credentials touch the database.
2. **Extension ↔ Intelligence backend (WSS)** — the extension opens the WebSocket and sends the JWT as its first `auth` message. The Intelligence backend verifies the signature and expiry **locally — no network call, no DB access**. This keeps connection setup fast and means this service never holds Postgres credentials at all.
3. **Intelligence backend ↔ Platform (REST, service-to-service)** — on session close, and periodically during long sessions, the Intelligence backend POSTs usage (duration, tool-call counts, approximate audio/token volume) back to the Platform, authenticated with a separate service credential — never the user's JWT. The Platform writes this to `UsageLog` and bills against `Subscription`.

### Token shape

```json
{
  "user_id": "uuid",
  "integration_id": "uuid",
  "plan_tier": "free | pro | org",
  "max_session_seconds": 3600,
  "max_concurrent_sessions": 2,
  "iat": 1719256800,
  "exp": 1719258600
}
```

Signed by the Platform (HS256 with a shared secret for Phase 1; upgrade to RS256 with the Platform holding the private key and the Intelligence backend holding only the public key, once there's more than one verifying service). `plan_tier`, `max_session_seconds`, and `max_concurrent_sessions` let the Intelligence backend enforce entitlement-aware caps in `session_manager.py` without a DB lookup.

### New Platform-side endpoints required

The Platform already has the data model (`User`, `IntegrationPin`, `Subscription`, `UsageLog`) — it needs two new endpoints to support this flow:

- `POST /api/auth/session` — body: `{ email, pin }`. Validates against `IntegrationPin` + `Subscription` status, returns the JWT above. Reuses the validation logic already in the existing Gemini proxy route.
- `POST /api/usage/report` — body: `{ user_id, integration_id, session_duration_seconds, tool_call_count, audio_seconds, ended_at }`. Authenticated via a static service-to-service key (`INTELLIGENCE_SERVICE_KEY`, shared secret, rotated independently of user-facing keys). Writes a `UsageLog` row and updates running totals against `Subscription` limits.

### Revocation tradeoff

A stateless JWT can't reflect a mid-session cancellation or ban until it expires — there's a revocation-lag window bounded by the token TTL. Mitigation: keep the TTL short (15–30 minutes), have the extension silently refresh in the background before expiry (Platform issues a fresh token if the subscription is still valid), and cap `MAX_SESSION_DURATION_SECONDS` in the Intelligence backend so no single session can outlive several refresh cycles unnoticed. This is the same pattern real-time metered APIs (Twilio, OpenAI Realtime) use for the same reason — favoring low-latency local validation over perfectly real-time revocation.

### End-to-End Flow: Integration to Live Usage

**Phase A — Integration (one-time setup)**

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

**Phase B — Starting a voice session (every time the user starts talking)**

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

**Phase C — Live usage loop (repeats continuously while the session is open)**

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

**Phase D — Token refresh, idle/duration limits, teardown**

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

**Trial is no longer a separate branch.** Every session — free Starter-plan or paid — goes through the same flow above. "Trial" is just the Starter plan's tighter limits: `max_session_seconds: 300` instead of `1800`, and a hard cap of `TRIAL_SESSION_LIMIT = 3` lifetime sessions tracked via `Subscription.trialSessionsUsed`, incremented in `POST /api/auth/session` each time a Starter-plan token is issued. Once exhausted, that endpoint returns `402 { trialExhausted: true }` instead of a token, and the extension shows an "Upgrade Plan" prompt linking to the dashboard's billing page rather than retrying. The old anonymous `?trial=true` bypass in the Platform's raw WebSocket proxy was removed entirely — leaving it in place would have kept an unauthenticated door open regardless of what the extension UI did.

---

## Project Structure

`backend/` below maps to `digital-accessibility-intelligence/` and `extension/` maps to `new-chrome-extension/` (existing repo, modified in place — not rebuilt). The tree is shown with logical names for readability against the rest of this plan.

```
ternconnect/
├── backend/                      # = digital-accessibility-intelligence/
│   ├── main.py                  # FastAPI app, WebSocket endpoint, auth gate
│   ├── config.py                # Env vars, model config, capacity/timeout defaults
│   ├── requirements.txt
│   ├── .env.example
│   ├── Dockerfile
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── auth.py              # [NEW] Validates Platform-issued JWTs (signature + expiry)
│   │   ├── session_manager.py   # [NEW] Concurrency caps from JWT claims + idle/duration auto-disconnect
│   │   ├── usage_reporter.py    # [NEW] Reports session usage back to the Platform (REST)
│   │   ├── redaction.py         # [NEW] Strips payment/PII data before history/logs
│   │   ├── session.py           # Per-client session: Gemini Live + state
│   │   ├── gemini_live.py       # Gemini Live API WebSocket client
│   │   ├── tools.py             # 25 tool/function definitions
│   │   ├── tool_executor.py     # Routes tool calls → client
│   │   └── prompts.py           # System prompt (10 rule sections + capacity/retry rules)
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   └── websocket_handler.py # Client WebSocket protocol handler (now auth-gated)
│   │
│   ├── audio/
│   │   ├── __init__.py
│   │   ├── feedback.py          # Audio feedback state machine
│   │   └── sounds/
│   │       ├── chime_up.wav
│   │       ├── chime_down.wav
│   │       ├── thinking.wav
│   │       ├── tick.wav
│   │       ├── success.wav
│   │       ├── error.wav
│   │       ├── whoosh.wav
│   │       └── capacity_full.wav   # [NEW] Session-cap-reached cue
│   │
│   └── models/
│       ├── __init__.py
│       └── messages.py          # WebSocket message protocol types (+ new types below)
│
├── extension/                    # = new-chrome-extension/
│   ├── manifest.json             # MV3 manifest
│   │
│   ├── background/
│   │   └── service-worker.js     # WebSocket + routing + shortcut + tab monitor + auth key handling
│   │
│   ├── content/
│   │   ├── dom-controller.js     # Click/type/scroll/select/drag-drop + shadow DOM + virtualized-list retry
│   │   ├── page-reader.js        # Accessibility tree, math, PDF, session monitor
│   │   ├── video-handler.js
│   │   ├── video-controller.js
│   │   ├── quiz-monitor.js
│   │   ├── accessibility.js
│   │   ├── keyboard-navigator.js
│   │   └── content.css
│   │
│   ├── offscreen/
│   │   ├── offscreen.html
│   │   └── audio-handler.js      # Mic capture + TTS + feedback sounds + half-duplex mic-mute-during-TTS
│   │
│   ├── popup/
│   │   ├── popup.html            # Status + settings + email/PIN login → JWT [NEW]
│   │   ├── popup.js
│   │   └── popup.css
│   │
│   └── shared/
│       ├── protocol.js
│       └── config.js
│
└── README.md

~30 files total.
```

---

## Backend — File by File

### [NEW] `backend/core/auth.py`

Validates the JWT issued by the Platform (`Ternkonnect-Digital-Accessibilty-Platform`) before any Gemini session opens. No DB access from this service — verification is purely cryptographic.

- `validate_token(jwt: str) -> Claims | None` — verifies signature against `PLATFORM_JWT_SECRET` (HS256 for Phase 1) and checks `exp`; returns the decoded claims (`user_id`, `integration_id`, `plan_tier`, `max_session_seconds`, `max_concurrent_sessions`) or `None`
- On failure (bad signature, expired, malformed): closes the WebSocket with a structured `auth_failed` message **before** any Gemini Live session — and therefore any cost — is incurred
- Does not call back to the Platform on the connect path; the Platform is only contacted asynchronously via `usage_reporter.py`

### [NEW] `backend/core/session_manager.py`

Tracks active sessions and enforces capacity limits, driven by JWT claims rather than a DB lookup.

- `max_concurrent_sessions` per key comes from the token's `max_concurrent_sessions` claim (set by the Platform based on `plan_tier`); `MAX_CONCURRENT_SESSIONS` (global, env-configured) is an additional backend-wide ceiling regardless of plan
- `IDLE_DISCONNECT_SECONDS` — auto-closes a session after N minutes of no audio/tool activity; sends a warning chime + spoken notice 30 seconds before disconnecting
- Per-session duration is capped at `min(token.max_session_seconds, MAX_SESSION_DURATION_SECONDS)` — never lets a session outlive its entitlement or the hard backend ceiling
- On capacity exceeded: sends `capacity_exceeded` + plays `capacity_full.wav`; agent speaks "TernConnect is at capacity right now, please try again shortly"
- On session close: hands off final duration/tool-call counts to `usage_reporter.py`

### [NEW] `backend/core/usage_reporter.py`

The only place this service talks back to the Platform.

- `report_usage(user_id, integration_id, duration_seconds, tool_call_count, audio_seconds) -> None` — `POST`s to the Platform's `/api/usage/report`, authenticated with `INTELLIGENCE_SERVICE_KEY` (a static service-to-service secret, distinct from any user-facing credential)
- Fires on session close, and on a periodic interval (e.g. every 5 minutes) for long-running sessions so usage isn't lost if the process restarts
- Failures are retried with backoff and logged, but never block or terminate the user's live session — usage reporting is best-effort and decoupled from the real-time path

### [NEW] `backend/core/redaction.py`

Strips sensitive data before it reaches logs or the rolling conversation history.

- `redact(text: str) -> str` — regex-based detection of card-number-like (13–19 digit) and CVV-like (3–4 digit, adjacent to a card pattern) sequences, replaced with a masked form (`**** **** **** 1234`)
- Applied to tool-call arguments before persisting to history, and to transcript text before logging
- Any history entry from an `ENABLE_PAYMENT_AUTOFILL` flow is marked `sensitive: true` and dropped from the rolling window immediately after the action completes, rather than kept for the full 20-turn window

### [UPDATED] `backend/main.py`

Same as v2 (FastAPI app, mounts `/ws`, health check at `/health`, CORS, lifespan handler) plus: the WebSocket handshake now requires a valid `auth` message before upgrading to a Gemini Live session; otherwise responds with `auth_failed` and closes.

### [UPDATED] `backend/config.py`

```python
import os
from dotenv import load_dotenv

load_dotenv()

# API Keys
GEMINI_API_KEY: str = os.environ["GEMINI_API_KEY"]

# Models
GEMINI_MODEL: str = "gemini-2.5-flash"

# Server
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))
CORS_ORIGINS: list[str] = ["chrome-extension://*", "http://localhost:*"]

# AI Behavior
CONVERSATION_HISTORY_MAX_TURNS: int = 20
ACTION_TIMEOUT_SECONDS: float = 10.0
MAX_RETRY_ATTEMPTS: int = 3
THINKING_FILLER_THRESHOLD_SECONDS: float = 8.0   # [NEW] speak a filler if reasoning runs long

# Auth & Capacity [NEW]
PLATFORM_JWT_SECRET: str = os.environ["PLATFORM_JWT_SECRET"]          # shared secret, issued by the Platform (HS256)
INTELLIGENCE_SERVICE_KEY: str = os.environ["INTELLIGENCE_SERVICE_KEY"]  # service-to-service auth for usage reporting
PLATFORM_USAGE_REPORT_URL: str = os.getenv(
    "PLATFORM_USAGE_REPORT_URL", "https://platform.ternconnect.com/api/usage/report"
)
MAX_CONCURRENT_SESSIONS: int = int(os.getenv("MAX_CONCURRENT_SESSIONS", "50"))  # backend-wide ceiling, independent of plan_tier
IDLE_DISCONNECT_SECONDS: float = 600.0
MAX_SESSION_DURATION_SECONDS: float = 3600.0  # hard ceiling; actual cap = min(this, token.max_session_seconds)
USAGE_REPORT_INTERVAL_SECONDS: float = 300.0

# Compliance [NEW]
ENABLE_PAYMENT_AUTOFILL: bool = os.getenv("ENABLE_PAYMENT_AUTOFILL", "false").lower() == "true"

# Audio Feedback
FEEDBACK_SOUNDS_DIR: str = os.path.join(os.path.dirname(__file__), "audio", "sounds")
```

### [UPDATED] `backend/core/session.py`

Same responsibilities as v2, plus:

- Checks `session_manager` capacity before opening a Gemini Live session; rejects with `capacity_exceeded` if full
- If a logical user request exhausts `MAX_RETRY_ATTEMPTS`: triggers `action_failed_final` — forced full orientation plus an offer to describe the screen via `capture_screenshot` — never just stops responding
- If Gemini reasoning runs longer than `THINKING_FILLER_THRESHOLD_SECONDS` without a tool call or speech: sends a `thinking_filler` TTS phrase ("Still working on it...") so silence never implies a hang
- Flags `type_text` / `type_rich_text` calls with payment-context heuristics (e.g. field labeled "card number," parent form action pointing at a payment processor) so `redaction.py` knows to scrub the result

### [UPDATED] `backend/core/prompts.py`

Sections 1–10 are unchanged from v2. Two additions:

**Section 9 (Obstacle Handling)** gains:
- *Retry exhaustion:* "If 3 attempts fail, stop retrying silently. Say exactly what you tried, give full orientation (where the user is, what's on the page), and offer to describe the screen via screenshot."
- *Payment forms:* "If payment autofill is off, read each field aloud and wait for the user to enter it themselves; confirm only the last 4 digits of any card number back to them, never the full number."

**New Section 11: CAPACITY & ERRORS** — scripted lines for `capacity_exceeded` ("TernConnect is at capacity right now, please try again in a few minutes") and `action_failed_final`, so these states are never silent.

### [UPDATED] `backend/models/messages.py`

New message types added to the 20 from v2:

| Direction | Type | Purpose |
|---|---|---|
| Client → Backend | `auth` | First message on connect; carries the JWT issued by the Platform (not a static API key) |
| Client → Backend | `reauth` | Carries a refreshed JWT mid-session, ahead of the current token's expiry, so a long session doesn't get cut off |
| Backend → Client | `auth_failed` | Invalid, malformed, or expired JWT — connection will close |
| Backend → Client | `capacity_exceeded` | Global ceiling or the token's `max_concurrent_sessions` claim reached |
| Backend → Client | `action_failed_final` | Retries exhausted on the current action |
| Backend → Client | `thinking_filler` | Reasoning is taking a while; here's a filler phrase to speak |

---

## Chrome Extension — File by File

Only files with material changes from v2 are listed; the rest (`page-reader.js`, `video-handler.js`, `video-controller.js`, `quiz-monitor.js`, `accessibility.js`, `keyboard-navigator.js`, `content.css`, `manifest.json`) are unchanged.

### [UPDATED] `extension/content/dom-controller.js`

`_findElement()` gains three fallback behaviors before giving up:

1. **Shadow DOM traversal** — recursively checks `element.shadowRoot` when present, since modern LMS components increasingly use shadow DOM for custom widgets
2. **Virtualized-list handling** — if not found on the first pass, scrolls the nearest scrollable ancestor incrementally and retries (bounded attempts) before failing; many course-list and quiz-question UIs only render visible rows
3. **Short wait-for-element** — a brief `MutationObserver`-based poll (~1.5s) for elements that render asynchronously after a click or navigation, before falling back to `keyboard_navigate`

### [UPDATED] `extension/offscreen/audio-handler.js`

- `getUserMedia` constraints now explicitly set `echoCancellation: true, noiseSuppression: true, autoGainControl: true`
- **Default half-duplex behavior**: mic capture is muted while TTS is actively playing. The shortcut key (Ctrl+Shift+Space) immediately stops TTS playback and reopens the mic for an instant interrupt. This avoids needing full acoustic echo cancellation in Phase 1, at the cost of true simultaneous barge-in (acceptable tradeoff — revisit in Phase 2 if user testing shows it's limiting)
- Plays an `idle_warning` cue when the backend's idle-disconnect timer is about to fire

### [UPDATED] `extension/popup/` (`popup.html` + `popup.js` + `popup.css`)

- Login form: email + integration PIN (reuses the same credential the user already has from the Platform's existing integration flow) — no separate "API key" concept exposed to the user
- On submit, calls `POST {PLATFORM_BASE_URL}/api/auth/session` directly against the Platform, receives the JWT, and stores it via `chrome.storage` (along with its `exp`) — the Intelligence backend's WebSocket is never given raw email/PIN, only the resulting token
- Connection status now distinguishes **Connected** / **Auth failed** / **At capacity** / **Disconnected**, each with a distinct color and screen-reader-readable label

### [UPDATED] `extension/background/service-worker.js`

- Reads the stored JWT and sends it as the `auth` message immediately on WebSocket open, before any audio streaming begins
- Background refresh: tracks the token's `exp`; a few minutes before expiry, silently calls the Platform's `/api/auth/session` again (re-using the stored email/PIN or a refresh credential) and sends the new token via a `reauth` message over the existing WebSocket, so long sessions don't drop
- On `auth_failed` or `capacity_exceeded`: surfaces a popup notification and caps reconnect attempts with backoff, instead of retrying forever

---

## Deployment

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```
# backend/requirements.txt
fastapi>=0.110.0
uvicorn[standard]>=0.29.0
websockets>=12.0
google-genai>=1.0.0
python-dotenv>=1.0.0
pyjwt>=2.8.0
httpx>=0.27.0
```

```bash
# backend/.env.example
GEMINI_API_KEY=
PLATFORM_JWT_SECRET=                           # [NEW] shared with Ternkonnect-Digital-Accessibilty-Platform, verifies user JWTs
INTELLIGENCE_SERVICE_KEY=                      # [NEW] this service's own credential for POSTing usage reports
PLATFORM_USAGE_REPORT_URL=https://platform.ternconnect.com/api/usage/report  # [NEW]
MAX_CONCURRENT_SESSIONS=50                     # [NEW] backend-wide ceiling, on top of per-plan caps in the JWT
ENABLE_PAYMENT_AUTOFILL=false                  # [NEW] keep off until compliance review
```

```bash
# Build + deploy
docker build -t ternconnect-backend ./backend
docker push registry/ternconnect-backend

# Run on Railway / Fly.io / AWS ECS / GCP Cloud Run
# All support WebSocket connections
```

Clients connect to `wss://api.ternconnect.com/ws` and must send `{"type": "auth", "token": "<JWT from Platform>"}` as their first message. The Intelligence backend and the Platform must share `PLATFORM_JWT_SECRET` (or, once on RS256, the Platform's public key) — this is the one piece of deployment config the two services must agree on out-of-band.

---

## Verification Plan

### Backend

```bash
cd ternconnect/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
curl http://localhost:8000/health   # → {"status": "ok"}
```

### Extension

1. `chrome://extensions` → Developer mode → Load unpacked → select `extension/`
2. Open popup, enter email + integration PIN → verify the Platform returns a JWT and status shows "Connected"
3. Re-test with a deliberately wrong PIN → Platform rejects before any JWT is issued → status shows "Auth failed"
4. Manually craft an expired/tampered JWT and send it as the `auth` message → backend rejects with `auth_failed`, no Gemini session opens
5. Set `MAX_CONCURRENT_SESSIONS=1` on the backend, open two sessions on the same account → second shows "At capacity"
6. Force a token near-expiry (short TTL in a test config) → verify the extension sends `reauth` and the session continues uninterrupted
7. Navigate to coursera.org, Ctrl+Shift+Space, speak, verify audio response

### Cross-Service Integration Tests *(new)*

- **Token issuance**: `POST /api/auth/session` on the Platform with a valid email+PIN returns a JWT with the expected claims (`plan_tier`, `max_session_seconds`, `max_concurrent_sessions`) matching that user's `Subscription`
- **Token validation**: the Intelligence backend accepts a Platform-issued JWT and rejects one signed with the wrong secret, an expired one, and one with a tampered claim (e.g. inflated `max_concurrent_sessions`)
- **Usage reporting**: end a session, confirm the Platform's `UsageLog` gets a row via `/api/usage/report` within `USAGE_REPORT_INTERVAL_SECONDS`; confirm the Intelligence backend doesn't crash or block the user's session if the Platform is temporarily unreachable (usage report retries with backoff, session keeps running)

### Automated Tests *(new)*

- **Tool router**: unit test confirming each of the 25 tool names routes to the correct client message type
- **Prompt eval harness**: a fixed set of sample utterances mapped to expected tool-call sequences, run on every prompt change to catch behavioral drift (e.g. "submit the quiz" must always trigger a confirmation step first)
- **DOM controller unit tests** (jsdom/Playwright) against synthetic fixtures: click / type / dismiss-overlay / shadow-DOM / virtualized-list cases
- **Redaction unit tests**: confirm card-number-like and CVV-like patterns never appear in persisted history or logs, with and without `ENABLE_PAYMENT_AUTOFILL`

### Accessibility Usability Testing *(new — gates Phase 1 sign-off)*

- Recruit at least 5 blind/low-vision users, ideally existing screen-reader users, for moderated sessions running the 15 end-to-end scenarios below
- Capture: task completion rate, time-to-completion, number of "I'm stuck" moments, qualitative feedback on narration pacing and clarity
- Phase 1 is not considered complete until this round runs and blocking issues are resolved — this replaces the unverified "~92% coverage" claim from v2 with a measured baseline

### End-to-End Scenarios

```
1.  Course Discovery:   "Find python courses on Coursera"
2.  Cookie Dismissal:   Cookie banner auto-dismissed, announced
3.  Account Creation:   "Sign up" → form fill → CAPTCHA handling
4.  OAuth Login:        "Sign in with Google" → popup handled → back to main
5.  Enrollment:         "Enroll in the first course" → payment form via keyboard nav
6.  Video Lesson:       "Read the transcript" → transcript extracted and narrated
7.  Quiz (untimed):     Full question→answer→submit→score flow
8.  Quiz (timed):       Timer announcements at thresholds
9.  Discussion Post:    "Post a comment" → rich text editor → submit
10. Session Expiry:     Session timeout → auto-relogin → navigate back
11. Error Recovery:     Bad selector → retry with alternative → success
12. Math Content:       LaTeX formula read as spoken math
13. Capacity Limit:     [NEW] Third concurrent session on a key gets `capacity_exceeded` + spoken explanation
14. Retry Exhaustion:   [NEW] Force a selector to fail 3x → agent gives full orientation + offers screenshot, never silent
15. Payment Field:      [NEW] With autofill off, agent reads fields aloud and confirms only last 4 digits after the user enters their own card
```

---

## Phases

### Phase 1 — Core + Chrome Extension (BUILD NOW)

Carried over from v2:
- [ ] FastAPI backend with Gemini Live API
- [ ] 25 Gemini tools (page, nav, DOM, video, quiz, keyboard, overlay)
- [ ] System prompt (10 sections: orientation, tutor, quiz, obstacles, narration)
- [ ] Audio feedback engine (7+ sounds)
- [ ] WebSocket protocol (20+ message types)
- [ ] Chrome extension: 8 content scripts + offscreen audio + popup
- [ ] Cross-origin iframe support
- [ ] Screen reader bridge (ARIA)
- [ ] Keyboard navigation fallback
- [ ] Cookie/modal auto-dismissal
- [ ] Session expiry detection
- [ ] Dockerfile for deployment

New in v3 — required before Phase 1 is considered done:

**`digital-accessibility-intelligence` (Intelligence backend):**
- [ ] JWT auth gate validating Platform-issued tokens (`core/auth.py`)
- [ ] Session capacity manager driven by JWT claims + idle/duration auto-disconnect (`core/session_manager.py`)
- [ ] Usage reporting client (`core/usage_reporter.py`)
- [ ] Redaction layer for payment/PII data (`core/redaction.py`)
- [ ] Payment autofill behind `ENABLE_PAYMENT_AUTOFILL` flag (default off pending legal/PCI review)
- [ ] Retry-exhaustion + thinking-filler prompt rules (Section 11)
- [ ] Automated test suite (tool router, prompt eval harness, DOM controller, redaction)

**`Ternkonnect-Digital-Accessibilty-Platform` (existing — additions needed to support the above):**
- [ ] `POST /api/auth/session` — issues the short-lived JWT from email + integration PIN, using the existing `IntegrationPin`/`Subscription` validation
- [ ] `POST /api/usage/report` — service-to-service endpoint, writes to `UsageLog`, authenticated via `INTELLIGENCE_SERVICE_KEY`
- [ ] Shared `PLATFORM_JWT_SECRET` provisioned to both services

**`new-chrome-extension` (existing — modifications):**
- [ ] Popup login flow (email + PIN → JWT) replacing any prior API-key field
- [ ] Background JWT refresh + `reauth` message before token expiry
- [ ] Shadow-DOM / virtualized-list / wait-for-element handling in `dom-controller.js`
- [ ] Half-duplex audio default + browser AEC constraints in `audio-handler.js`

**Process gate:**
- [ ] Blind-user usability testing round (gating sign-off)
- [ ] "Known Limitations" doc published alongside release

### Phase 2 — LinkedIn + Polish

- [ ] LinkedIn tools and prompts (feed, posts, jobs, messaging)
- [ ] Full user authentication (login/password or OAuth) on the Platform, layered on top of the existing PIN/subscription model — the JWT issuance contract from Phase 1 carries forward unchanged, so the Intelligence backend needs no changes
- [ ] ElevenLabs premium voice option
- [x] Wake word detection ("Hey TernKonnect") — built ahead of schedule, see below
- [ ] Usage analytics dashboard (built on the `UsageLog` data already flowing in from Phase 1)

#### Wake word detection — as built

Pulled forward from the Phase 2 backlog because it directly addresses a Phase 1 cost problem: with the Gemini Live session opening at boot, a user who just left the extension running (very plausible for a hands-free accessibility tool) would burn through their capped session minutes — 5 on Starter, 30 on Pro/Enterprise — without ever issuing a command.

- **Detection**: Chrome's built-in `SpeechRecognition` (`webkitSpeechRecognition`) running continuously in `offscreen.js`, matched against a forgiving regex (`/\bhey,?\s*t[ue]rn\s*-?\s*konnect\b/i` — STT commonly mis-hears "Tern" as "Turn"). No new dependencies, no bundled ML model — but it does mean audio is continuously sent to Google's free speech-recognition service while dormant, a different (and separately free) service from the paid Gemini Live API. There's no good on-device alternative without bundling a WASM keyword-spotting model, which was out of scope for this pass.
- **Lifecycle inversion**: the Gemini Live connection no longer opens at boot. The extension starts *dormant* (wake-word listening only) and only calls `connectToGemini()` once the phrase is heard. After a quiet period (`WAKE_REARM_IDLE_SECONDS = 90`, well under the server's own `IDLE_DISCONNECT_SECONDS = 600`) it proactively disconnects and returns to dormant — trading a few seconds of reconnect latency for not silently eating a capped session's minutes during a pause.
- **Unified retry model**: the old timer-based `scheduleReconnect()` (retry every 5s) was removed entirely. Every failure path — auth failure, capacity exceeded, upstream service error, trial exhaustion, session eviction, idle timeout — now funnels through the same `goToSleep()` function back to wake-word listening, rather than silently retrying on a timer. The user re-summons by saying the phrase again; this avoids the previous failure mode where a bad config could spin a 5-second reconnect loop indefinitely.
- **Popup UI**: a new `dormant` status (`wsStatus`) gets its own calm, non-error treatment — "Say 'Hey TernKonnect'" — distinct from "Disconnected", which is now reserved for genuinely unexpected states.

### Phase 3 — Desktop App

- [ ] Electron wrapper
- [ ] System tray + global hotkeys
- [ ] Mac + Windows installers

### Phase 4 — Mobile App

- [ ] React Native voice client
- [ ] Server-side Playwright for mobile browsing
- [ ] VoiceOver / TalkBack integration
