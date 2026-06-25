# 🚀 TernKonnect Digital Accessibility Platform — Backend

> Node.js/Express API backend for the TernConnect digital accessibility platform.  
> Manages users, subscriptions, Chrome extension integrations, session tokens, and serves as the central hub connecting all platform services.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Session Tokens](#session-tokens)
  - [Integration Pins](#integration-pins)
  - [Chrome Integration](#chrome-integration)
  - [Usage Reporting](#usage-reporting)
  - [Statistics](#statistics)
  - [Tools Proxy](#tools-proxy)
- [Database](#database)
  - [Models](#models)
  - [Seeding](#seeding)
  - [Migrations](#migrations)
- [WebSocket Proxy](#websocket-proxy)
- [Subscription & Billing](#subscription--billing)
- [Inter-Service Communication](#inter-service-communication)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The **Platform Backend** is the central API for the TernConnect ecosystem. It:

- **Manages users** — registration, email verification, login, password reset, profile management
- **Handles subscriptions** — Starter (free tier), Pro, and Enterprise plans with billing cycles
- **Integrates Chrome extensions** — links browser profiles to user accounts via integration codes
- **Issues session tokens** — mints short-lived JWTs for the [Intelligence backend](../../digital-accessibility-intelligence) to verify
- **Proxies Gemini API** — WebSocket proxy for the Chrome extension to stream voice through Gemini Live
- **Tracks usage** — receives and stores usage reports from the Intelligence service
- **Logs activity** — records Chrome profile actions for analytics and auditing

---

## Architecture

```
┌──────────────────────┐
│  Frontend Dashboard  │
│  (React / Next.js)   │
│                      │
│  • User management   │
│  • Billing           │
│  • Analytics         │
└─────────┬────────────┘
          │ REST API
          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Platform Backend (this repo)                │
│                                                             │
│  Express.js Server (port 9001)                              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Routes                                               │   │
│  │  /api/auth     — register, login, verify, session    │   │
│  │  /api/pin      — integration pin management          │   │
│  │  /api/platform — Chrome integration, profiles, sites │   │
│  │  /api/tools    — tools proxy endpoint                │   │
│  │  /api/stats    — dashboard statistics                │   │
│  │  /api/usage    — usage reporting (from Intelligence) │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────┐  ┌────────────────────────────────┐   │
│  │ WebSocket Proxy  │  │ Database (SQLite / PostgreSQL) │   │
│  │ /api/tools/proxy │  │  Users, Subscriptions, Plans   │   │
│  │ Client ←→ Gemini │  │  ChromeIntegrations, Profiles  │   │
│  └──────────────────┘  │  UsageLogs, PaymentHistory     │   │
│                        └────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────┘
                               │
          ┌────────────────────┼─────────────────────┐
          ▼                    ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐
│ Chrome Extension │  │ Intelligence     │  │ Google Gemini  │
│ (browser client) │  │ Backend (Python) │  │ Live API       │
│                  │  │                  │  │                │
│ Links account    │  │ Reports usage    │  │ Proxied via    │
│ via /integrate   │  │ via POST /usage  │  │ WebSocket      │
└──────────────────┘  └──────────────────┘  └───────────────┘
```

---

## Key Features

| Feature | Description |
|---|---|
| **User Management** | Registration with email verification (OTP), login, password reset, profile updates |
| **Subscription Plans** | Starter (free, capped), Pro, Enterprise — with billing cycles and session limits |
| **Chrome Integration** | Links Chrome browser profiles to user accounts via unique integration codes |
| **Voice Session Tokens** | Issues short-lived JWTs for the Intelligence backend (30 min Pro, 5 min Starter) |
| **Trial Session Tracking** | Counts Starter plan sessions (30 lifetime limit before upgrade required) |
| **WebSocket Proxy** | Proxies Chrome extension traffic directly to Google Gemini Live API |
| **Usage Reporting** | Accepts and stores session duration, tool calls, and audio seconds from the Intelligence service |
| **Activity Logging** | Tracks Chrome profile actions (page visits, tool executions) for analytics |
| **Multi-Profile Support** | Organizations can manage multiple Chrome profiles per subscription |
| **Swagger Documentation** | Interactive API docs at `/docs` |
| **Auto-Seeding** | Creates default users, subscription plans, and test data on startup |

---

## Tech Stack

| Technology | Purpose |
|---|---|
| [Node.js](https://nodejs.org/) | Runtime |
| [Express 5](https://expressjs.com/) | HTTP framework |
| [Sequelize 6](https://sequelize.org/) | ORM (SQLite + PostgreSQL) |
| [SQLite3](https://www.sqlite.org/) | Default local database |
| [PostgreSQL](https://www.postgresql.org/) | Optional production database |
| [JSON Web Tokens](https://jwt.io/) | Auth tokens (user sessions + voice sessions) |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | Password hashing |
| [ws](https://github.com/websockets/ws) | WebSocket proxy to Gemini Live |
| [Swagger UI](https://swagger.io/) | API documentation |
| [nodemon](https://nodemon.io/) | Development auto-restart |

---

## Project Structure

```
backend/
├── server.js                  # Express app entry point — routes, WebSocket proxy, migrations
├── package.json               # Dependencies and scripts
├── seed.js                    # Database seeder — default users, plans, test subscriptions
├── swagger.json               # OpenAPI/Swagger specification
├── vercel.json                # Vercel deployment config
├── .env.example               # Environment variable template
│
├── config/
│   ├── database.js            # Sequelize connection setup (SQLite / PostgreSQL)
│   └── email.js               # Email templates and transporter (verification, password reset)
│
├── middleware/
│   └── authenticate.js        # JWT authentication middleware
│
├── models/
│   ├── index.js               # Sequelize model registry and associations
│   ├── User.js                # User model — name, email, password, role, subscription
│   ├── Subscription.js        # Subscription model — plan, status, limits, trial tracking
│   ├── SubscriptionPlan.js    # Plan definitions — Starter, Pro, Enterprise
│   ├── ChromeIntegration.js   # Chrome extension ←→ user account linking
│   ├── ChromeProfile.js       # Browser profile tracking
│   ├── ChromeProfileActivity.js # Per-profile activity logs
│   ├── IntegrationPin.js      # Legacy integration PIN (bcrypt-hashed)
│   ├── Organization.js        # Multi-user organization model
│   ├── PaymentHistory.js      # Payment transaction records (NGN)
│   ├── UsageLog.js            # Voice session usage records
│   ├── ActivityLog.js         # General activity logging
│   ├── Tool.js                # Available tool definitions
│   ├── WidgetSite.js          # Website accessibility widget registrations
│   └── SystemSetting.js       # Platform-wide settings
│
├── routes/
│   ├── auth.js                # /api/auth — register, login, verify, session, password reset
│   ├── pin.js                 # /api/pin — integration pin management
│   ├── platform.js            # /api/platform — Chrome integration, profiles, widget sites
│   ├── tools.js               # /api/tools — tool management endpoints
│   ├── stats.js               # /api/stats — dashboard statistics
│   └── usage.js               # /api/usage — usage reporting (service-to-service)
│
└── data/
    └── database.sqlite        # Local SQLite database file (auto-created)
```

---

## Prerequisites

- **Node.js 18+** (LTS recommended)
- **npm** or **yarn**
- **SQLite3** (bundled via `sqlite3` npm package) — or **PostgreSQL** for production

---

## Getting Started

### 1. Enter the directory

```bash
cd Ternkonnect-Digital-Accessibilty-Platform/backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your values (see Environment Variables below)
```

### 4. Run the server

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

The server starts at `http://localhost:9001`. Verify with:

```bash
curl http://localhost:9001/health
# → {"status": "ok"}
```

### 5. Seed the database (optional)

The database auto-seeds on startup if `seed.js` exists. To run manually:

```bash
npm run seed
```

This creates:
- 3 default users (Regular, Super Admin, Org Admin)
- 3 subscription plans (Starter, Pro, Enterprise)
- 15 test subscriptions

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | | `9001` | Server port |
| `JWT_SECRET` | ✅ | — | Secret for signing/verifying JWTs. **Must match** the Intelligence backend's `JWT_SECRET` |
| `INTELLIGENCE_SERVICE_KEY` | ✅ | — | Shared secret for service-to-service auth with the Intelligence backend |
| `DB_DIALECT` | | `sqlite` | Database dialect: `sqlite` or `postgres` |
| `DATABASE_STORAGE` | | `./data/database.sqlite` | SQLite database file path |
| `DATABASE_URL` | | — | PostgreSQL connection string (when `DB_DIALECT=postgres`) |
| `GEMINI_API_KEY` | | — | Google Gemini API key (for WebSocket proxy) |

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | None | Register a new user (sends email verification OTP) |
| `POST` | `/api/auth/verify-email` | None | Verify email with OTP code |
| `POST` | `/api/auth/resend-verification` | None | Resend verification OTP |
| `POST` | `/api/auth/login` | None | Login with email + password → returns JWT |
| `POST` | `/api/auth/forgot-password` | None | Request password reset OTP |
| `POST` | `/api/auth/reset-password` | None | Reset password with OTP |
| `GET` | `/api/auth/me` | JWT | Get current user profile |
| `PATCH` | `/api/auth/profile` | JWT | Update name/email |
| `POST` | `/api/auth/change-password` | JWT | Change password (requires current password) |

### Session Tokens

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/session` | None | Issue a voice session JWT for the Intelligence backend |

**Request:**
```json
{
  "email": "user@example.com",
  "integrationCode": "ACCESS-EXT-abc123"
}
```

**Response (success):**
```json
{
  "token": "eyJhbG...",
  "expiresIn": 1800,
  "trial": false
}
```

**Response (trial exhausted):**
```json
{
  "error": "You've used all 30 free sessions on the Starter plan...",
  "trialExhausted": true
}
```

**Token Claims:**

| Claim | Description |
|---|---|
| `scope` | Always `"voice_session"` |
| `user_id` | User UUID |
| `integration_id` | ChromeIntegration UUID |
| `plan_tier` | Subscription plan name (Starter/Pro/Enterprise) |
| `max_session_seconds` | 300 (Starter) or 1800 (Pro/Enterprise) |
| `max_concurrent_sessions` | 1 (Starter), 2 (Pro), 5 (Enterprise) |

### Integration Pins

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/pin/generate` | JWT | Generate a new integration pin |

### Chrome Integration

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/platform/chrome/integrate` | None | Link a Chrome profile to a user account |
| `POST` | `/api/platform/chrome/track` | None | Track Chrome profile check-ins |
| `POST` | `/api/platform/chrome/log-activity` | None | Log Chrome profile activity |

### Usage Reporting

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/usage/report` | `X-Service-Key` | Record voice session usage (from Intelligence backend) |

**Request:**
```json
{
  "user_id": "uuid",
  "integration_id": "uuid",
  "session_duration_seconds": 245.5,
  "tool_call_count": 12,
  "audio_seconds": 180.3
}
```

### Statistics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/stats/dashboard` | JWT | Dashboard statistics (users, subscriptions, usage) |

### Tools Proxy

| Protocol | Endpoint | Auth | Description |
|---|---|---|---|
| `WebSocket` | `/api/tools/proxy` | Query params | Direct WebSocket proxy to Google Gemini Live API |

**Query Parameters:** `email`, `integrationCode` (or `pin`), `profileId`

---

## Database

### Models

```
┌───────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│     User      │────▶│  Subscription    │────▶│  SubscriptionPlan    │
│               │     │                  │     │                      │
│ name          │     │ plan (name)      │     │ name (Starter/Pro/   │
│ email         │     │ status (active)  │     │       Enterprise)    │
│ password      │     │ limits (JSON)    │     │ amount (NGN)         │
│ role          │     │ planId           │     │ maxChromeProfiles    │
│ subscriptionId│     │ trialSessionsUsed│     │ maxWebsites          │
│ organizationId│     │ endsAt           │     │ billingCycle          │
└───────┬───────┘     └──────────────────┘     └──────────────────────┘
        │
        ├──────────▶ ChromeIntegration (integrationCode, status)
        │               └──▶ ChromeProfile (profileId, profileName)
        │                       └──▶ ChromeProfileActivity (actionType, metadata)
        │
        ├──────────▶ IntegrationPin (pin, status)
        ├──────────▶ UsageLog (actionType, durationSeconds, toolCallCount, audioSeconds)
        ├──────────▶ PaymentHistory (amount, currency, status, reference)
        └──────────▶ Organization (name)

Standalone:
  Tool (name, description, category)
  WidgetSite (domain, name, settings)
  SystemSetting (key, value)
  ActivityLog (action, description, metadata)
```

### Seeding

The `seed.js` file creates:

| Entity | Details |
|---|---|
| **Users** | `user@ternkonnect.com` (solo), `admin@ternkonnect.com` (superadmin), `orgadmin@ternkonnect.com` (org_admin) |
| **Plans** | Starter (₦29/mo), Pro (₦79/mo), Enterprise (yearly, custom pricing) |
| **Test Subscriptions** | 15 test users with alternating Starter/Pro plans |

> **Default password for all seeded users:** `Password123`

### Migrations

The server runs automatic migrations on startup:

1. **Currency normalization** — ensures all amounts are in NGN (Naira)
2. **Payment status migration** — converts legacy `"paid"` status to `"successful"`
3. **UsageLog columns** — adds `integrationId`, `durationSeconds`, `toolCallCount`, `audioSeconds`
4. **Subscription trial tracking** — adds `trialSessionsUsed` column
5. **Orphaned subscription healing** — links subscriptions with null `planId` to matching active plans

---

## WebSocket Proxy

The server includes a WebSocket proxy at `/api/tools/proxy` that:

1. Authenticates the client via query params (`email` + `integrationCode`)
2. Validates the user has an active subscription
3. Opens a bidirectional WebSocket to Google Gemini Live
4. Relays messages transparently between client and Gemini

> **Note:** This proxy is the legacy connection path. The new architecture routes through the [Intelligence backend](../../digital-accessibility-intelligence) instead, which adds server-side system prompts, tool declarations, session management, and usage tracking.

---

## Subscription & Billing

### Plan Tiers

| Plan | Price | Session Duration | Concurrent Sessions | Trial Sessions | Chrome Profiles | Websites |
|---|---|---|---|---|---|---|
| **Starter** | ₦29/mo | 5 min | 1 | 30 lifetime | 5 | 1 |
| **Pro** | ₦79/mo | 30 min | 2 | — | 25 | 10 |
| **Enterprise** | Custom/yr | 30 min | 5 | — | Unlimited | Unlimited |

### Trial Flow

1. New user registers → automatically on Starter plan
2. Each voice session increments `subscription.trialSessionsUsed`
3. At 30 sessions, `POST /api/auth/session` returns `{ trialExhausted: true }`
4. Extension shows "Sessions Used Up" with upgrade button
5. User upgrades via the dashboard billing page

---

## Inter-Service Communication

### This backend **receives** from:

| Source | Endpoint | Auth | Purpose |
|---|---|---|---|
| Chrome Extension | `/api/platform/chrome/integrate` | None (email + code) | Account linking |
| Chrome Extension | `/api/auth/session` | None (email + code) | Voice session JWT |
| Chrome Extension | `/api/tools/proxy` | Query params | WebSocket proxy (legacy) |
| Intelligence Backend | `/api/usage/report` | `X-Service-Key` header | Usage recording |

### This backend **provides** to:

| Consumer | What | How |
|---|---|---|
| Intelligence Backend | `JWT_SECRET` | Shared environment variable |
| Intelligence Backend | `INTELLIGENCE_SERVICE_KEY` | Shared environment variable |
| Chrome Extension | Session JWTs | `POST /api/auth/session` response |
| Chrome Extension | Integration validation | `POST /api/platform/chrome/integrate` response |

---

## Deployment

### Vercel

The project includes a `vercel.json` configuration:

```bash
vercel deploy
```

### Manual

```bash
npm start
```

### Environment Setup

For production, set:
- `DB_DIALECT=postgres`
- `DATABASE_URL` to your PostgreSQL connection string
- `JWT_SECRET` to a strong, unique secret
- `INTELLIGENCE_SERVICE_KEY` to a strong, unique secret

---

## API Documentation

Interactive Swagger documentation is available at:

```
http://localhost:9001/docs
```

The landing page at `/` provides a quick link to the docs.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

This project is proprietary software owned by TernConnect. All rights reserved.
