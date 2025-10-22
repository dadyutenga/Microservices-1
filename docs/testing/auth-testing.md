# Auth Microservice Testing Documentation

## 1. Overview

### Purpose
Testing validates that the Auth & Identity microservice delivers secure and reliable authentication, authorization, and session management experiences across all supported channels (web, mobile, and service-to-service integrations). The goal is to detect regressions early, enforce compliance with product requirements, and confirm that all security-critical paths function correctly under normal and adverse conditions.

### Objectives
- **Reliability:** Ensure every endpoint behaves predictably for valid and invalid inputs, including recovery flows.
- **Security:** Catch vulnerabilities (credential leakage, token reuse, injection attacks) before they reach production.
- **Scalability:** Validate rate limiting, connection pooling, and cache usage under high load.
- **Specification Compliance:** Guarantee responses, schemas, and side effects conform to the API contract and business rules.

### Toolchain
- **Jest** for unit testing core logic and utilities.
- **Supertest** for exercising HTTP handlers in integration tests.
- **Postman** for manual and exploratory testing.
- **k6** for scripted load and performance testing.
- **Redis-CLI** for validating cache state, OTP storage, and rate limiter counters during investigations.

## 2. Test Environment Setup

### Prerequisites
- **Node.js:** v20.x (per `package.json` engines).
- **PostgreSQL:** v15+ (locally or via Docker).
- **Redis:** v7+ (locally or via Docker).
- **Docker Compose:** v2.x for orchestration of Postgres and Redis in CI and local setups.

### Docker Compose Services
The root `docker-compose.yml` spins up `postgres` and `redis` services. Use dedicated testing instances to isolate state:

```bash
docker compose -f docker-compose.yml up -d postgres redis
```

### Environment Configuration
Create `.env.test` at the project root:

```env
NODE_ENV=test
PORT=4002
DATABASE_URL=postgres://auth_test:auth_test@localhost:5544/auth_service_test
REDIS_URL=redis://localhost:6380
JWT_SECRET=super-secret-test-signing-key
JWT_REFRESH_SECRET=super-secret-test-refresh-key
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_SALT_ROUNDS=12
OTP_EXPIRY_SECONDS=300
OTP_RESEND_COOLDOWN=60
RATE_LIMIT_WINDOW=60
RATE_LIMIT_MAX_ATTEMPTS=5
EMAIL_FROM=no-reply@example.com
SMS_FROM=+15551234567
```

Configure Docker Compose overrides or `docker-compose.yml` to expose testing ports `5544` (Postgres) and `6380` (Redis) if the defaults differ.

### Database Preparation
Run migrations and seed data before integration or E2E suites:

```bash
# Apply SQL migrations
psql "$DATABASE_URL" -f migrations/001_init.sql

# Seed baseline users and MFA fixtures (example script)
node scripts/seed-test-users.mjs --env .env.test
```

### Starting the Service in Test Mode
Use isolated npm scripts or add the following to `package.json` under `scripts`:

```json
{
  "test": "NODE_ENV=test jest --runInBand",
  "test:unit": "NODE_ENV=test jest --runInBand --selectProjects unit",
  "test:integration": "NODE_ENV=test jest --runInBand --selectProjects integration",
  "test:e2e": "NODE_ENV=test jest --runInBand --selectProjects e2e"
}
```

Then execute:

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
```

For Supertest-based suites that require the HTTP server, ensure the app binds to an ephemeral port (`0`) or uses `supertest`’s in-memory server to avoid port collisions.

## 3. Testing Layers

1. **Unit Tests**
   - Target pure functions and isolated modules (password hashing helpers, JWT utilities, OTP generation, validation schemas, service-layer business logic).
   - Stub external dependencies (Redis, Postgres, email/SMS providers) using Jest mocks or dependency injection.

2. **Integration Tests**
   - Exercise Express routes with real Postgres and Redis using Supertest.
   - Validate controller-service-database flows (e.g., registration, login, OTP verification) while mocking only third-party gateways (email, SMS) through HTTP interceptors or local SMTP/SMTPS servers.

3. **End-to-End (E2E) Tests**
   - Cover multi-step user journeys: registration → OTP verification → login → refresh token rotation → logout and blacklist.
   - Optionally orchestrate via Jest projects or Cypress/Postman Collections using Newman to simulate real clients.

## 4. Test Scenarios

### Registration
- ✅ **Valid registration:** Accepts required fields (email, password) and optional phone number, persists user record, and triggers OTP issuance.
- ❌ **Duplicate email / invalid password:** Returns 409 for duplicates, 422 for password policy violations, without revealing sensitive details.
- 📨 **OTP generation & notification:** Confirms OTP stored in Redis with correct TTL and emits email/SMS queue events (assert on mocked provider calls).

### Login
- ✅ **Valid credentials:** Returns 200 with access token, refresh token, MFA status, and audit log entry.
- ❌ **Wrong password:** Increments Redis-based failure counter, returns 401, and after five attempts within the window returns 429 (rate limited) while preserving response consistency.
- 🔒 **MFA required:** Flow returns challenge state; providing correct TOTP (or backup code) authenticates user and resets counters.

### OTP Management
- ✅ **Generate OTP:** Stores hashed OTP in Redis with expected key pattern `otp:user:{id}` and TTL.
- ❌ **Invalid/expired code:** Returns 422 and leaves Redis entries untouched.
- ⚙️ **Resend cooldown:** Prevents repeated resends within cooldown window and logs attempt; ensure the cooldown resets when TTL expires or OTP is verified.

### JWT & Refresh Tokens
- ✅ **Issue access token:** Contains claims (`sub`, `iat`, `exp`, `roles`, `mfa_verified`) signed with configured secret.
- ✅ **Refresh rotation:** Exchange refresh token for new pair; old token added to rotation chain with timestamp.
- ❌ **Replay attack:** Reusing spent refresh tokens returns 401 and marks token family as compromised.
- ✅ **Blacklisting on logout:** Adds access & refresh tokens to Redis blacklist with expiry matching token TTL.

### Rate Limiting
- 🔁 **Flood attempts:** Simulate burst login attempts exceeding `RATE_LIMIT_MAX_ATTEMPTS`; expect 429 and `Retry-After` header.
- ♻️ **Counter reset:** After TTL elapses, rate limiter resets and allows successful login.

### Account Recovery
- ✅ **Request reset:** Generates recovery token/OTP, dispatches notification, and stores hashed token with TTL.
- ✅ **Complete reset:** New password replaces old hash; all sessions (refresh tokens) revoked.
- ❌ **Expired token:** Returns 410 Gone or 422 with appropriate message; verify token removed or flagged.

### MFA (Multi-Factor Authentication)
- ✅ **TOTP verification:** Correct code accepted; incorrect or reused codes rejected with 400/401.
- ✅ **Backup codes:** Consumption removes code from user profile and logs action.
- ✅ **Disable MFA:** Requires password confirmation or backup code; ensure logs and session invalidation per policy.

### User Activity & Logs
- ✅ **Activity entries:** Every critical action (register, login, OTP verify, logout, password reset) writes to `user_activity` table.
- ✅ **Retrieval endpoint:** `/user/activity` respects pagination, filters by user ID, and enforces auth/mfa checks.

## 5. Security & Performance Testing

- **Password hashing:** Ensure bcrypt cost factor (`BCRYPT_SALT_ROUNDS`) meets policy. Unit tests assert cost and verify hashing rejects short passwords.
- **JWT forgery detection:** Attempt to sign tokens with invalid secret; service must reject via signature verification and log incident.
- **Redis injection prevention:** Validate key construction sanitizes user input to prevent delimiter injection; fuzz tests with malicious emails/usernames.
- **k6 Load Tests:**
  - Write `tests/load/login.js` for `/auth/login` and `/auth/refresh` scenarios.
  - Use ramping arrival rate to 200 RPS, monitor latency, error rate, and Redis command stats.
  - Run via `k6 run tests/load/login.js` against staging stack.
- **SQL injection/XSS:** Include integration tests with malicious payloads ensuring parameterized queries and HTML encoding on templated emails.

## 6. Manual Testing via Postman

1. **Environment Variables:**
   - `{{base_url}}`, `{{email}}`, `{{password}}`, `{{jwt_token}}`, `{{refresh_token}}`, `{{otp_code}}`.
2. **Pre-request Scripts:**
   - Auto-refresh tokens before protected requests:

```javascript
if (!pm.environment.get('jwt_token') || pm.environment.get('token_expired')) {
  pm.sendRequest({
    url: pm.environment.get('base_url') + '/auth/refresh',
    method: 'POST',
    header: { 'Content-Type': 'application/json' },
    body: { mode: 'raw', raw: JSON.stringify({ refreshToken: pm.environment.get('refresh_token') }) }
  }, (err, res) => {
    if (!err && res.code === 200) {
      const data = res.json();
      pm.environment.set('jwt_token', data.accessToken);
      pm.environment.set('refresh_token', data.refreshToken);
      pm.environment.unset('token_expired');
    }
  });
}
```

3. **Collection Flow:**
   - `POST /auth/register` → capture OTP from email/SMS mock.
   - `POST /auth/verify-otp` → sets verified flag.
   - `POST /auth/login` → store tokens.
   - `POST /auth/mfa/verify` (if required) → update environment variables.
   - `GET /user/profile` with `Authorization: Bearer {{jwt_token}}`.
   - `POST /auth/refresh` before expiry to maintain session.
   - `POST /auth/logout` to validate blacklist behavior.

## 7. CI/CD Integration

- **GitHub Actions Workflow:**
  - Trigger on pull requests and merges to main.
  - Steps: checkout → setup Node 20 → cache dependencies → `docker compose -f docker-compose.yml up -d` → run `npm ci` → `npm run test`.
- **Service Containers:** Use `services:` in workflow to launch Postgres/Redis with matching ports and credentials as `.env.test`.
- **Coverage Reporting:** Generate coverage via `jest --coverage`. Publish reports using `actions/upload-artifact`, and optionally expose a badge via Codecov or Shields.io.

## 8. Error & Edge Case Testing

- **Missing headers / invalid JSON:** Ensure 400 responses with descriptive error body and correlation IDs.
- **Expired JWT:** Protected endpoints must return 401 with `token_expired` flag prompting refresh.
- **Invalid refresh rotation:** Detect tokens outside expected rotation tree and revoke entire family.
- **Locked/disabled accounts:** Test `user.status` flags that block login/OTP issuance while allowing support override flows.

## 9. Reporting

- **Test Result Structure:** Include suite name, total tests, passed/failed count, and duration.
- **Automated Reports:** Integrate Jest HTML Reporter or Allure for visual dashboards. Store artifacts per CI run (coverage, screenshots, k6 summaries).
- **Operational Logs:** Forward structured logs to ELK/Loki for cross-referencing failed tests with service-side traces.

## 10. Future Improvements

- **Fuzz Testing:** Adopt tools like `fast-check` for property-based tests covering malformed payloads, encoding edge cases, and Unicode inputs.
- **OWASP ZAP Integration:** Automate ZAP baseline scans in CI against staging deployments.
- **Continuous Load Testing:** Schedule nightly k6 runs via GitHub Actions cron to detect rate-limiting regressions and cache pressure trends.

---

For questions or contributions, follow the repository’s contribution guidelines and keep this document updated as new features land.
