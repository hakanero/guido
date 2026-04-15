# Guido

**AI-powered walking tour guide** — discover the history beneath your feet.

Guido generates real-time, location-aware audio tours as you walk. It identifies nearby points of interest, crafts narration with AI, and reads it aloud so you can explore any neighborhood hands-free.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Project History](#project-history)
- [License](#license)

---

## Features

- **Live location tracking** — continuously watches your position via the browser Geolocation API and reverse-geocodes it to a street name.
- **Nearby POI discovery** — queries the OpenStreetMap Overpass API for historic, tourism, and amenity nodes within 50 m.
- **AI narration** — sends the discovered context to Google Gemma (via the GenAI SDK) to produce a concise, walking-tour-style script. Strict prompt rules prevent hallucinated facts and ensure a seamless, continuous narration style.
- **Text-to-speech** — converts the script to audio with gTTS and streams it back to the client as base64-encoded MP3.
- **Auto-advance** — when audio finishes and the user has moved more than 30 m, a new tour segment is fetched and played automatically.
- **Multi-language support** — narration can be generated in 10 languages (English, Spanish, French, German, Chinese, Turkish, Hindi, Arabic, Russian, Korean).
- **Playback controls** — play/pause toggle and adjustable playback speed (1×–2×).
- **User accounts** — register, log in, and persist sessions with JWT authentication and bcrypt password hashing.
- **Location history** — authenticated users can review past sessions and the GPS breadcrumbs recorded during each one.
- **Interactive map** — a Leaflet-based navigation view renders visited coordinates as a polyline on a live map.
- **Usage gating** — anonymous users get a 5-minute free preview; authenticated users get 1 hour per session.

---

## Architecture

```
guido/
├── guido_backend/       # Python / Flask REST API
│   ├── app.py           # Routes: auth, location tracking, audio generation
│   ├── check.py         # Overpass POI lookup, Gemma narration, gTTS synthesis
│   ├── auth.py          # JWT helpers and Flask decorators
│   ├── db.py            # PostgreSQL (Neon) connection and schema init
│   ├── backend.py       # Legacy CLI loop (deprecated)
│   ├── Dockerfile       # Production container image
│   └── fly.toml         # Fly.io deployment config
│
└── guido_frontend/      # React / TypeScript SPA
    ├── src/
    │   ├── App.tsx          # Core app shell, audio lifecycle, view routing
    │   ├── LandingPage.tsx  # Marketing / sign-up landing
    │   ├── AuthPage.tsx     # Login & registration forms
    │   ├── NavigationPage.tsx # Leaflet map with visited-coordinate polyline
    │   ├── HistoryPage.tsx  # Session history list and detail view
    │   ├── UserMenu.tsx     # Settings dropdown (language, account, history)
    │   ├── hooks/           # useAuth, useLocation, useVoiceGuide
    │   └── lib/             # API client, utility functions
    └── index.html           # Vite entry point
```

---

## Tech Stack

### Backend

| Component      | Technology                                    |
| -------------- | --------------------------------------------- |
| Framework      | Flask 3 + Flask-CORS                          |
| AI Model       | Gemma 3 27B-IT (Google GenAI SDK)             |
| Text-to-Speech | gTTS                                          |
| POI Data       | OpenStreetMap Overpass API                     |
| Database       | PostgreSQL (Neon) via psycopg 3               |
| Auth           | JWT (PyJWT) + bcrypt                          |
| Server         | Gunicorn                                      |
| Runtime        | Python 3.11                                   |

### Frontend

| Component   | Technology                                     |
| ----------- | ---------------------------------------------- |
| Framework   | React 19 + TypeScript                          |
| Build Tool  | Vite 7                                         |
| Styling     | Tailwind CSS 4                                 |
| Animations  | Framer Motion                                  |
| Maps        | Leaflet + React Leaflet                        |
| Icons       | Phosphor Icons                                 |

---

## Prerequisites

- **Node.js** >= 18 and **npm**
- **Python** >= 3.11 and **pip** (or a virtual environment manager)
- A **Google GenAI API key** with access to Gemma models
- A **PostgreSQL** database (e.g. [Neon](https://neon.tech))

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/hakanero/guido.git
cd guido
```

### 2. Backend

```bash
cd guido_backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables (see section below)
cp .env.example .env       # then fill in your values

# Start the dev server
python app.py
```

The API will be available at `http://localhost:8080`.

### 3. Frontend

```bash
cd guido_frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env       # set VITE_BACKEND_URL

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Environment Variables

### Backend (`guido_backend/.env`)

| Variable       | Description                                      |
| -------------- | ------------------------------------------------ |
| `GENAI_API_KEY`| Google GenAI API key for Gemma model access       |
| `DATABASE_URL` | PostgreSQL connection string (Neon recommended)   |
| `JWT_SECRET`   | Secret key for signing JWT tokens                 |
| `PORT`         | Server port (default: `8080`)                     |

### Frontend (`guido_frontend/.env`)

| Variable            | Description                              |
| ------------------- | ---------------------------------------- |
| `VITE_BACKEND_URL`  | Full URL of the backend API              |

---

## API Reference

### Health

| Method | Endpoint   | Description            |
| ------ | ---------- | ---------------------- |
| GET    | `/health`  | Returns `{ status: "healthy" }` |

### Authentication

| Method | Endpoint          | Body                                            | Description              |
| ------ | ----------------- | ----------------------------------------------- | ------------------------ |
| POST   | `/auth/register`  | `{ email, password, display_name }`             | Create a new account     |
| POST   | `/auth/login`     | `{ email, password }`                           | Log in, receive JWT      |
| POST   | `/auth/logout`    | —                                               | End the current session  |
| GET    | `/auth/me`        | —                                               | Get current user profile |

### Audio Tour

| Method | Endpoint  | Body / Params                                    | Description                           |
| ------ | --------- | ------------------------------------------------ | ------------------------------------- |
| POST   | `/audio`  | `{ latitude, longitude, place_name, language? }` | Generate narration + audio for a location |
| GET    | `/audio`  | `?latitude=&longitude=&place_name=&language=`    | Same as above, via query params       |

### Location Tracking (authenticated)

| Method | Endpoint                        | Description                         |
| ------ | ------------------------------- | ----------------------------------- |
| POST   | `/location`                     | Save a GPS breadcrumb               |
| GET    | `/location/history`             | List all sessions with point counts |
| GET    | `/location/session/:session_id` | Get points for a specific session   |

All authenticated endpoints require a `Bearer <token>` header.

---

## Deployment

### Backend (Render / Fly.io)

The backend includes both a `Dockerfile` and a `fly.toml` for deployment:

```bash
# Fly.io
cd guido_backend
fly deploy

# Render
# Connect the repo and set the root directory to guido_backend.
# Build command: pip install -r requirements.txt
# Start command: gunicorn --bind 0.0.0.0:8080 --workers 2 --timeout 120 app:app
```

Set the environment variables listed above in your hosting provider's dashboard.

### Frontend (Vercel / Netlify / Static hosting)

```bash
cd guido_frontend
npm run build
```

The production build is output to `dist/`. Deploy it to any static hosting provider and set `VITE_BACKEND_URL` at build time.

---

## Project History

Guido originated at **HackHarvard 2025**, built by Rudransh Agrawal and Coleman Hayes. The current version has been substantially rewritten and expanded by Hakan Eroglu — migrating from the Google Maps API to OpenStreetMap Overpass, replacing ElevenLabs TTS with gTTS, upgrading the AI model to Gemma, adding user authentication and session tracking, and building a full React frontend.

---

## License

This project is not currently published under an open-source license. All rights reserved.
