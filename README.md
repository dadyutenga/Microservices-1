# Auth & Identity Microservice

Production-ready authentication and identity service built with Express.js, PostgreSQL, Redis, JWT, and bcrypt. This service is intended to sit behind an API gateway and expose a `/v1` API surface for user lifecycle management, token issuance, OTP flows, and MFA verification.

## Features

- User registration, login, logout, and activity auditing
- JWT access tokens and rotating refresh tokens stored as hashes
- Redis-backed rate limiting
- Email and SMS OTP delivery via pluggable providers
- TOTP-based multi-factor authentication verification
- Health, readiness, and Prometheus metrics endpoints
- Docker Compose stack for local development (Postgres, Redis, Mailhog)

## Getting Started

### Requirements

- Node.js 20+
- Docker and Docker Compose (for local setup)

### Installation

```bash
npm install
```

### Environment

Copy `.env.example` to `.env` and adjust values as needed.

```bash
cp .env.example .env
```

Ensure RSA keys are available if using RS256. For development you can rely on the fallback symmetric key.

### Running Locally

```bash
docker-compose up --build
```

The service will be available at `http://localhost:8001`.

### API Overview

Key endpoints under `/v1`:

- `POST /register` — register a new user
- `POST /login` — authenticate and receive JWT tokens
- `POST /token/refresh` — rotate refresh token
- `POST /logout` — revoke session
- `POST /otp/send` — send verification OTP
- `POST /otp/verify` — verify OTP codes
- `POST /mfa/verify` — verify MFA code (TOTP)
- `GET /user/activity` — fetch recent activity (requires access token)
- `GET /verify-token` — validate a token for service-to-service scenarios

Health and metrics:

- `GET /healthz`
- `GET /readyz`
- `GET /metrics`

## Database Migrations

Migrations are provided as plain SQL under `migrations/`. Apply them using your preferred migration runner or manually via `psql`:

```bash
psql $DATABASE_URL -f migrations/001_init.sql
```

## Testing

Testing scaffolding is not yet included. Recommended next steps include unit tests for services and integration tests with PostgreSQL and Redis test containers.

## License

MIT
