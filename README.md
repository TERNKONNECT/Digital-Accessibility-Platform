# Ternkonnect Digital Accessibility Platform

Welcome to the **Ternkonnect Digital Accessibility Platform**. This repository contains the full stack implementation for providing inclusive and accessible educational tools powered by AI.

## Overview

The platform consists of:
1. **Frontend**: A React application built with Vite, styled with modern CSS, and tailored to meet accessibility standards (high contrast, dyslexia fonts, screen reader support, voice commands).
2. **Backend**: A Node.js/Express service that manages users, integration pins, tools, and subscriptions. It also runs a secure **WebSocket Proxy** that connects users directly to Google's Gemini AI for real-time generative capabilities.

## Key Features

- **Inclusive UI/UX**: Designed to be fully accessible with Ternkonnect branding.
- **AI-Powered Capabilities**: Directly interfaces with Gemini's Bidi Generative Service via a custom proxy.
- **Secure Integration**: Uses hashed Integration Pins to authenticate third-party client or frontend access to the AI socket.
- **Usage Tracking**: Logs user interactions, tracks subscription limits, and associates users with organizations.

## Project Structure

```
Ternkonnect-Digital-Accessibilty-Platform/
├── frontend/             # React + Vite application
│   ├── src/              # UI components, assets, and React contexts
│   ├── index.html        # Main HTML entry
│   └── vite.config.ts    # Vite configuration
├── backend/              # Express + WebSocket server
│   ├── models/           # Sequelize Models (User, Pin, Subscription, etc.)
│   ├── routes/           # REST API Routes (Auth, Tools, Pins)
│   ├── middleware/       # JWT Auth and validation middlewares
│   ├── config/           # Database and environment configurations
│   └── server.js         # Entry point and WebSocket proxy
├── .gitignore            # Git ignore configuration
└── ...
```

## Setup & Installation

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL (or an equivalent SQL database supported by Sequelize)

### Backend Setup
1. Navigate to the `backend` directory: `cd backend`
2. Install dependencies: `npm install`
3. Create a `.env` file in the `backend` directory with:
   - `DATABASE_URL` (your Postgres connection string)
   - `JWT_SECRET` (your JWT signing secret)
   - `GEMINI_API_KEY` (Master API key for Gemini WebSocket proxy)
   - `PORT` (e.g., 9001)
4. Start the server: `npm start` or `node server.js`

### Frontend Setup
1. Navigate to the `frontend` directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. The frontend will be available at `http://localhost:5173`.

## Documentation

For deep-dives into the architecture and data flows, please read:
- [implementation.md](./implementation.md): Technical details on database models, REST APIs, and tech stack.
- [flow.md](./flow.md): Detailed explanation of system data flows, specifically the AI Proxy integration.

## License
Proprietary / Internal. All rights reserved by Ternkonnect.
