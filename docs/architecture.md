# Architecture

## Overview

TaxiGo is a Telegram-based taxi ordering platform with real-time driver matching.

## System Architecture

```
Telegram App → Telegram Bot API → Backend (Node.js/Express)
                                      ↓
WebApp (React/Vite) ← → Backend API ← → MongoDB
                                      ↓
                                   Redis (caching, pub/sub, geospatial)
```

## Backend

- **Runtime**: Node.js 20 with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Cache**: Redis (ioredis)
- **Real-time**: Socket.io
- **Bot**: Telegraf

### Directory Structure

```
backend/src/
├── index.ts           # Entry point
├── config/            # Environment config & logger
├── controllers/       # Route handlers
├── middleware/         # Auth, validation, error handling
├── models/            # Mongoose schemas
├── routes/            # Express routes
├── services/          # Business logic
├── sockets/           # WebSocket handlers
└── types/             # TypeScript types
```

## Frontend

- **Framework**: React 18 with TypeScript
- **Build**: Vite 5
- **State**: Zustand
- **Maps**: Leaflet + react-leaflet
- **Styling**: Tailwind CSS
- **Real-time**: Socket.io-client

```
frontend/src/
├── main.tsx           # Entry point
├── App.tsx            # Root component with routing
├── components/        # Reusable UI components
├── pages/             # Page components
├── services/          # API & WebSocket clients
├── store/             # Zustand stores
├── styles/            # Global CSS
└── types/             # TypeScript types
```
