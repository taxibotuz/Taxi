# Deployment Guide

## Railway (Recommended)

### Prerequisites

1. Create Railway account: https://railway.app
2. Install Railway CLI: `npm i -g @railway/cli`

### Services Setup

1. **MongoDB**: Add MongoDB plugin in Railway dashboard
2. **Redis**: Add Redis plugin in Railway dashboard
3. **Backend**: Deploy from `backend/` directory
4. **Frontend**: Deploy from `frontend/` directory

### Backend Environment Variables

Set these in Railway dashboard:

```
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
JWT_SECRET=<generate-random-string>
JWT_EXPIRES_IN=7d
MONGODB_URI=<railway-mongodb-uri>
REDIS_URL=<railway-redis-uri>
FRONTEND_URL=<frontend-railway-url>
TELEGRAM_BOT_TOKEN=<your-bot-token>
TELEGRAM_WEBAPP_URL=<frontend-railway-url>
TELEGRAM_ADMIN_IDS=123456789
LOG_LEVEL=info
```

### Frontend Environment Variables

```
VITE_API_URL=<backend-railway-url>
VITE_APP_NAME=TaxiGo
```

### Steps

```bash
# Login to Railway
railway login

# Link project
railway link

# Deploy backend
cd backend
railway up

# Deploy frontend
cd frontend
railway up
```

## Docker (Alternative)

```bash
docker-compose up -d
```

## Manual

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run build
npm start

# Frontend
cd frontend
cp .env.example .env
npm install
npm run build
npm run preview
```
