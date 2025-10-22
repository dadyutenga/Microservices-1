# Auth & Identity Microservice

Production-ready authentication and identity service built with Express.js, PostgreSQL, Redis, JWT, and bcrypt. This service is intended to sit behind an API gateway and expose a `/v1` API surface for user lifecycle management, token issuance, OTP flows, and MFA verification.

## Features

- User registration, login, logout, and activity auditing
- JWT access tokens and rotating refresh tokens stored as hashes
- Redis-backed rate limiting
- Email and SMS OTP delivery via pluggable providers (Gmail SMTP supported)
- TOTP-based multi-factor authentication verification and password recovery
- Role-based access control with JWT roles and permissions baked into every token
- Role-protected service status and analytics APIs secured via RBAC
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

For production email delivery with Gmail you must configure an App Password and set:

```
GMAIL_USER=your.account@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_FROM=Auth Service <your.account@gmail.com>
```

Alternatively, provide a custom SMTP host and credentials.

### Running Locally

```bash
docker-compose up --build
```

The service will be available at `http://localhost:8001`.

### API Overview

Key endpoints under `/v1`:

- `POST /register` — register a new user (auto-assigns `user` role)
- `POST /login` — authenticate and receive JWT/refresh tokens enriched with roles & permissions
- `POST /token/refresh` — rotate refresh token and rehydrate permissions
- `POST /logout` — revoke session
- `POST /otp/send` — send verification OTP
- `POST /otp/verify` — verify OTP codes
- `POST /mfa/verify` — verify MFA code (TOTP)
- `POST /recovery/request` — trigger password recovery via email/SMS OTP
- `POST /recovery/confirm` — reset password using OTP or emailed token
- `GET /user/activity` — fetch recent activity (requires access token)
- `GET /verify-token` — validate a token for service-to-service scenarios
- `GET /roles` — list available roles (admin only)
- `POST /roles/assign` — assign a role to a user (admin only)
- `GET /roles/user/:id` — inspect a user's roles (admin/manager)
- `GET /status/summary` — service health summary (optionally authenticated)
- `GET /analytics/summary` — consolidated user/login/payment metrics (admin & service roles)
- `GET /analytics/activity` — timeline of recent activity log events (admin & service roles)

Analytics routes accept optional query parameters to tailor reporting windows:

- `GET /analytics/summary?window=7&paymentsWindow=30`
- `GET /analytics/activity?days=14`

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
