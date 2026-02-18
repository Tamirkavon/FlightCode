# ✈ FlyAI – Smart Flight Search

FlyAI is a full-stack flight search app that lets you:

- **Search flights** between any two airports (IATA codes)
- **Save favourite routes** for quick one-click re-searching
- **Set price alerts** – get an email when the price drops below your threshold, or when a sale is detected

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite (via `better-sqlite3`) |
| Auth | JWT (stored in `localStorage`) |
| Email | Nodemailer (SMTP) |
| Flight data | [Amadeus API](https://developers.amadeus.com) (free tier) with mock fallback |
| Price monitor | `node-cron` background job |

---

## Project Structure

```
flyai/
├── backend/          Express API
│   ├── src/
│   │   ├── routes/   auth, flights, favorites, alerts
│   │   ├── services/ flightService, emailService
│   │   ├── db/       SQLite schema + connection
│   │   ├── middleware/auth (JWT)
│   │   ├── index.ts  API server entry
│   │   └── cron.ts   Price-watch background job
│   └── .env.example
└── frontend/         React SPA
    └── src/
        ├── pages/    SearchPage, FavoritesPage, NotificationsPage, AuthPage
        ├── components/Navbar, FlightCard, AuthProvider
        ├── services/ api.ts (axios client)
        └── hooks/    useAuth
```

---

## Quick Start

### 1. Clone & install

```bash
git clone <repo>
cd flyai
npm install
```

### 2. Configure the backend

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and fill in:
#   JWT_SECRET      – any random string
#   SMTP_*          – your email SMTP credentials
#   AMADEUS_*       – optional (mock data used if empty)
```

### 3. Run in development

```bash
npm run dev
```

This starts:
- Backend API on `http://localhost:3001`
- Frontend dev server on `http://localhost:5173`

### 4. Run the price-watch cron (optional)

```bash
cd backend && npm run cron
```

This checks active price alerts every hour (configurable via `PRICE_CHECK_CRON` in `.env`).

---

## API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | – | Create account |
| POST | `/api/auth/login` | – | Sign in, get JWT |
| GET | `/api/auth/me` | JWT | Current user |
| GET | `/api/flights/search` | – | Search flights |
| GET | `/api/favorites` | JWT | List saved routes |
| POST | `/api/favorites` | JWT | Save a route |
| DELETE | `/api/favorites/:id` | JWT | Remove a route |
| GET | `/api/alerts` | JWT | List price alerts |
| POST | `/api/alerts` | JWT | Create alert |
| PATCH | `/api/alerts/:id` | JWT | Toggle / update alert |
| DELETE | `/api/alerts/:id` | JWT | Delete alert |

---

## Flight Data

Without Amadeus credentials the app returns **mock flight data** (randomly generated per search, same fields/structure). To enable live data:

1. Sign up at [developers.amadeus.com](https://developers.amadeus.com) (free)
2. Create a test app to get `Client ID` and `Client Secret`
3. Add them to `backend/.env`:
   ```
   AMADEUS_CLIENT_ID=your_id
   AMADEUS_CLIENT_SECRET=your_secret
   ```

---

## Email Alerts

Two alert types are supported:

| Type | Trigger |
|------|---------|
| `price_drop` | Price falls **below your threshold** (e.g. < $300) |
| `sale` | Price drops **>20% from the last recorded price** |

The cron job checks all active alerts on the configured schedule and sends HTML emails via your SMTP provider.

---

## Environment Variables

See `backend/.env.example` for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `PORT` | API port (default 3001) |
| `JWT_SECRET` | Token signing secret |
| `DB_PATH` | Path to SQLite file |
| `SMTP_HOST/PORT/USER/PASS` | Email SMTP config |
| `AMADEUS_CLIENT_ID/SECRET` | Live flight data (optional) |
| `PRICE_CHECK_CRON` | Cron schedule for price checks |
| `FRONTEND_URL` | Used in email links (default `http://localhost:5173`) |
