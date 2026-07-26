# TaxiGo - Telegram Taxi Platform

[![CI/CD](https://github.com/yourusername/taxigo/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/taxigo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-20.x-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)](https://www.typescriptlang.org/)

TaxiGo is a full-featured taxi ordering platform integrated with Telegram. Users can order rides, track drivers in real-time, and manage payments directly from Telegram's WebApp interface.

## Features

- **Telegram Integration** - Full Telegram bot with inline keyboard and WebApp support
- **Real-time Tracking** - Live driver location updates via WebSocket
- **Smart Driver Matching** - Geospatial search with expanding radius
- **Multiple Payment Methods** - Cash, Click, Payme, Uzum, Card, Wallet
- **Dynamic Pricing** - Base + distance + time + surge pricing
- **Driver Dashboard** - Earnings, ratings, ride history
- **Admin Panel** - User/driver management, revenue reports, settings
- **Food Delivery** - Extensible food delivery module (preview)
- **PWA Support** - Installable on mobile devices
- **Multi-language** - Ready for localization

## Architecture

```
Telegram App → Telegram Bot → Backend (Node.js/Express) → MongoDB
                                   ↓
WebApp (React/Vite) ← → REST API  ← → Redis (Pub/Sub, Geo)
```

## Screenshots

*Screenshots coming soon*

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js, Express, TypeScript |
| Frontend | React, Vite, TailwindCSS |
| Database | MongoDB (Mongoose) |
| Cache | Redis (ioredis) |
| Real-time | Socket.io |
| Maps | Leaflet, OpenStreetMap |
| Bot | Telegraf |
| Auth | JWT, Telegram Login |
| Container | Docker, docker-compose |

## Installation

### Prerequisites

- Node.js 20+
- MongoDB 7+
- Redis 7+
- Telegram Bot Token (from @BotFather)

### Quick Start with Docker

```bash
git clone <repo-url>
cp .env.example backend/.env
docker-compose up -d
```

### Manual Setup

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your configuration
npm install
npm run build
npm start

# Frontend
cd frontend
npm install
npm run dev
```

## Development

### Backend

```bash
cd backend
npm run dev
```

### Frontend

```bash
cd frontend
npm run dev
```

### Infrastructure

```bash
docker-compose up -d mongo redis
```

## Docker

```bash
# Build and run all services
docker-compose up -d

# Build individual services
docker-compose build backend
docker-compose build frontend
```

## Railway Deployment

### Prerequisites

- [Railway Account](https://railway.app)
- Railway CLI: `npm i -g @railway/cli`

### Deploy

```bash
railway login
railway link

# Deploy backend
cd backend && railway up

# Deploy frontend
cd frontend && railway up
```

See [docs/deployment.md](docs/deployment.md) for detailed instructions.

## Telegram Bot Setup

1. Create a bot with [@BotFather](https://t.me/BotFather)
2. Set bot commands:
   ```
   start - Open TaxiGo
   status - Driver status
   online - Go online
   offline - Go offline
   history - Ride history
   balance - Earnings
   support - Contact support
   admin - Admin panel
   ```
3. Create a WebApp via @BotFather → Bot Settings → Domain
4. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBAPP_URL` in .env

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| NODE_ENV | Environment | Yes |
| PORT | Server port | Yes |
| HOST | Server host | Yes |
| MONGODB_URI | MongoDB connection | Yes |
| REDIS_URL | Redis connection | Yes |
| JWT_SECRET | JWT signing secret | Yes |
| JWT_EXPIRES_IN | Token expiry | Yes |
| TELEGRAM_BOT_TOKEN | Bot token | Yes |
| TELEGRAM_WEBAPP_URL | WebApp URL | Yes |
| TELEGRAM_ADMIN_IDS | Admin Telegram IDs | Yes |
| FRONTEND_URL | CORS origin | Yes |
| LOG_LEVEL | Logging level | No |

### Frontend (`frontend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| VITE_API_URL | Backend API URL | Yes (prod) |

## API Documentation

Full API documentation can be found in [docs/api.md](docs/api.md).

## Project Structure

```
├── backend/           # Express API server
│   ├── src/
│   │   ├── config/    # Environment & logging
│   │   ├── controllers/ # Route handlers
│   │   ├── middleware/   # Auth, validation, errors
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # Express routes
│   │   ├── services/     # Business logic
│   │   ├── sockets/      # WebSocket
│   │   └── bot/          # Telegram bot
│   └── Dockerfile
├── frontend/          # React WebApp
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Route pages
│   │   ├── services/    # API & socket clients
│   │   └── store/       # State management
│   └── Dockerfile
├── nginx/             # Production reverse proxy
├── docker-compose.yml # Local development
├── railway.json       # Railway config
└── Procfile           # Process manager
```

## License

[MIT](LICENSE)

## Support

- Telegram: @taxigo_support
- Email: support@taxigo.uz
