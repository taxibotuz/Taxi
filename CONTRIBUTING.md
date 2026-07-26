# Contributing

We love contributions! Here's how to get started.

## Development

1. Fork the repository
2. Clone your fork
3. Copy `.env.example` to `backend/.env` and configure
4. Run `docker-compose up -d mongo redis` for infrastructure
5. Run `cd backend && npm install && npm run dev`
6. Run `cd frontend && npm install && npm run dev`

## Pull Requests

- Use meaningful commit messages
- Update documentation for any changed behavior
- Add tests for new features
- Ensure all checks pass

## Code Style

- Backend: TypeScript with strict mode
- Frontend: TypeScript with React
- Follow existing patterns in the codebase
