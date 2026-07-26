# API Documentation

## Base URL

- Development: `http://localhost:5000/api`
- Production: `https://your-domain.com/api`

## Authentication

All authenticated endpoints require a Bearer token:

```
Authorization: Bearer <token>
```

## Endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/telegram | Login via Telegram |
| GET | /auth/profile | Get user profile |
| PUT | /auth/profile | Update profile |
| POST | /auth/become-driver | Register as driver |
| GET | /auth/verify | Verify token |

### Rides

| Method | Path | Description |
|--------|------|-------------|
| POST | /rides | Create ride order |
| GET | /rides | Get orders |
| GET | /rides/estimate | Estimate price |
| GET | /rides/:id | Get order details |
| POST | /rides/:id/cancel | Cancel order |
| PUT | /rides/:id/status | Update status |

### Drivers

| Method | Path | Description |
|--------|------|-------------|
| GET | /drivers/dashboard | Driver dashboard |
| POST | /drivers/toggle-online | Toggle online status |
| POST | /drivers/location | Update location |
| GET | /drivers/history | Ride history |
| GET | /drivers/wallet | Wallet info |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/dashboard | Dashboard stats |
| GET | /admin/users | List users |
| GET | /admin/drivers | List drivers |
| GET | /admin/orders | List orders |
| GET | /admin/settings | Get settings |
| PUT | /admin/settings | Update settings |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET | /api/readiness | Readiness probe |
| GET | /api/liveness | Liveness probe |
