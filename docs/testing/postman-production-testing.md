# Auth & Identity Microservice — Postman Production Testing Guide

This checklist documents how to exercise the production-grade authentication and identity flows using Postman against the Express.js microservice backed by PostgreSQL and Redis. It is designed for **real environment verification** (no mocks) in both production and local modes.

## 1. Base Configuration

| Setting | Value |
| --- | --- |
| Base URL | `https://api.yourdomain.com/auth` |
| Local URL | `http://localhost:8001` |
| Authorization | Bearer Token (supply `{{jwt_token}}`) |
| Required Header | `Content-Type: application/json` |
| Recommended Environment Variables | `{{base_url}}`, `{{jwt_token}}`, `{{refresh_token}}`, `{{otp_code}}`, `{{user_email}}`, `{{user_password}}` |

> **Tip:** Create two Postman environments (e.g., `Auth-Prod`, `Auth-Local`) with the same variable names so you can switch between production and local testing instantly.

## 2. Collection Structure

Create a Postman collection named **Auth & Identity (Prod)** and add the following folders to reflect the real flows:

1. **Registration & OTP**
2. **Authentication Tokens**
3. **User Session Management**
4. **Multi-Factor Authentication (MFA)**
5. **Diagnostics**

The sections below describe each request you should add, including prerequisites, request body, example responses, and validation notes.

## 3. Registration & OTP

### 3.1 Register User — `POST {{base_url}}/register`

**Purpose:** Create a new user record and trigger OTP delivery.

- **Body (raw JSON):**
  ```json
  {
    "email": "{{user_email}}",
    "password": "{{user_password}}",
    "phone": "+15555550100", // optional
    "name": "QA Automation" // optional
  }
  ```
- **Expected Response:** `201 Created`
  ```json
  {
    "userId": "a46ce5f9-4f5f-4e8e-a4b8-2d1494cdbb6d",
    "emailSent": true,
    "smsSent": true
  }
  ```
- **Validation:**
  - Confirm the OTP was sent via the configured channel (email/SMS) and stored in Redis with a TTL of 300 seconds.
  - Re-run quickly to validate rate limiting (`429 Too Many Requests` if exceeding policy).

### 3.2 Send OTP (Manual) — `POST {{base_url}}/otp/send`

Use when you need to re-issue an OTP without re-registering.

- **Body:**
  ```json
  {
    "destination": "{{user_email}}",
    "purpose": "login"
  }
  ```
- **Expected Response:** `201 Created`
  ```json
  {
    "expiresAt": "2024-04-08T15:42:00.000Z"
  }
  ```
- **Validation:** Confirm rate limiting (3 sends per 5 minutes) and that the channel is inferred from the destination (email vs SMS).

### 3.3 Verify OTP — `POST {{base_url}}/otp/verify`

- **Body:**
  ```json
  {
    "destination": "{{user_email}}",
    "purpose": "login",
    "code": "{{otp_code}}"
  }
  ```
- **Expected Response:** `200 OK`
  ```json
  {
    "verified": true
  }
  ```
- **Validation:** Invalid or expired codes should return `422 Unprocessable Entity` and keep Redis entries untouched.

## 4. Authentication Tokens

### 4.1 Login — `POST {{base_url}}/login`

Authenticate the user and receive tokens.

- **Body:**
  ```json
  {
    "emailOrPhone": "{{user_email}}",
    "password": "{{user_password}}"
  }
  ```
- **Expected Response:** `200 OK`
  ```json
  {
    "accessToken": "eyJhbGci...",
    "refreshToken": "d530f4d1-9a8f-4f57-9a59-1d6ad0d1f1c4",
    "userId": "a46ce5f9-4f5f-4e8e-a4b8-2d1494cdbb6d",
    "expiresIn": 900
  }
  ```
- **Postman Tests:**
  ```javascript
  const data = pm.response.json();
  pm.environment.set('jwt_token', data.accessToken);
  pm.environment.set('refresh_token', data.refreshToken);
  ```
- **Validation:** Ensure rate limiting counters increment on failed attempts. After five wrong passwords in a minute expect `429`.

### 4.2 Refresh Token — `POST {{base_url}}/token/refresh`

Rotate the access token using the refresh token.

- **Headers:** None beyond defaults.
- **Body:**
  ```json
  {
    "refreshToken": "{{refresh_token}}"
  }
  ```
- **Expected Response:** `200 OK`
  ```json
  {
    "accessToken": "eyJhbGci...",
    "refreshToken": "c7a8c992-8f34-4711-a1c6-9cb0d5748b6c",
    "expiresIn": 900
  }
  ```
- **Postman Tests:** Update `jwt_token` and `refresh_token` with new values.
- **Validation:** Check Redis/DB for invalidated previous refresh tokens if rotation policy is enabled.

## 5. User Session Management

### 5.1 Logout — `POST {{base_url}}/logout`

Invalidate the active session and blacklist the refresh token.

- **Headers:** `Authorization: Bearer {{jwt_token}}`
- **Body:**
  ```json
  {
    "refreshToken": "{{refresh_token}}"
  }
  ```
- **Expected Response:** `204 No Content`
- **Validation:** Ensure the refresh token is removed from Redis/DB and future refresh calls return `401`.

### 5.2 User Activity Feed — `GET {{base_url}}/user/activity`

Retrieve latest audit events for the authenticated user.

- **Headers:** `Authorization: Bearer {{jwt_token}}`
- **Query Params:** `limit` (optional, defaults to 20)
- **Expected Response:** `200 OK`
  ```json
  {
    "items": [
      {
        "id": "3c5f1a10-5e1a-4d6a-8d2b-e3efb337f0b8",
        "event": "LOGIN_SUCCESS",
        "ip": "198.51.100.10",
        "userAgent": "PostmanRuntime/7.36.0",
        "createdAt": "2024-04-08T15:45:02.000Z"
      }
    ]
  }
  ```
- **Validation:** Confirm ordering (newest first) and that sensitive fields (passwords, secrets) are absent.

## 6. Multi-Factor Authentication (MFA)

### 6.1 Verify TOTP — `POST {{base_url}}/mfa/verify`

Complete MFA after login if TOTP is required.

- **Headers:** `Authorization: Bearer {{jwt_token}}`
- **Body:**
  ```json
  {
    "method": "totp",
    "code": "123456"
  }
  ```
- **Expected Response:** `200 OK`
  ```json
  {
    "verified": true
  }
  ```
- **Validation:** Non-`totp` methods return `501 Not Implemented`.

## 7. Diagnostics & Token Verification

### 7.1 Verify Access Token — `GET {{base_url}}/verify-token`

Confirm if a token is still valid without performing authorization.

- **Query Param:** `token={{jwt_token}}`
- **Expected Response:** `200 OK`
  ```json
  {
    "valid": true,
    "sub": "a46ce5f9-4f5f-4e8e-a4b8-2d1494cdbb6d",
    "roles": ["user"],
    "scope": ["auth:read"],
    "exp": 1712593502
  }
  ```
- **Invalid Tokens:** Return `{ "valid": false }` with `200 OK` to avoid leaking failure reasons.

## 8. Postman Environment Template

```json
{
  "id": "8a5d5b45-7c2d-4d0d-91a1-a4fe0bbce0a4",
  "name": "Auth-Prod",
  "values": [
    { "key": "base_url", "value": "https://api.yourdomain.com/auth", "type": "default" },
    { "key": "jwt_token", "value": "", "type": "secret" },
    { "key": "refresh_token", "value": "", "type": "secret" },
    { "key": "otp_code", "value": "", "type": "default" },
    { "key": "user_email", "value": "qa+auth@example.com", "type": "default" },
    { "key": "user_password", "value": "Sup3r$ecure!", "type": "secret" }
  ],
  "_postman_variable_scope": "environment",
  "_postman_exported_at": "2024-04-08T15:50:00.000Z",
  "_postman_exported_using": "Postman/10.24"
}
```

Import this JSON via **Environments → Import** to bootstrap your QA setup quickly.

## 9. Execution Checklist

1. **Register & OTP**
   - Register a new user.
   - Fetch OTP from delivery channel or monitoring tools.
   - Verify OTP.
2. **Login Flow**
   - Authenticate with email/password (+ OTP if required).
   - Store the returned tokens in Postman env variables automatically.
3. **Token Rotation**
   - Call refresh endpoint until a new access token is issued.
   - Confirm old refresh tokens are invalidated as expected.
4. **Session Controls**
   - Logout with the refresh token.
   - Attempt to refresh again (should fail with `401`).
5. **MFA**
   - If MFA is enabled, complete the TOTP verification.
6. **Diagnostics**
   - Use `verify-token` to validate token metadata.
   - Retrieve recent user activity to ensure audit logs capture events.

Following this guide ensures the Auth & Identity microservice behaves correctly end-to-end in a production environment using Postman.
