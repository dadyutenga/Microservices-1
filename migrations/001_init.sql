CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_status AS ENUM ('active', 'locked', 'disabled');
CREATE TYPE otp_channel AS ENUM ('email', 'sms');
CREATE TYPE otp_purpose AS ENUM ('verify_email', 'verify_phone', 'login', 'recovery');
CREATE TYPE mfa_type AS ENUM ('totp', 'sms', 'email');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT UNIQUE NOT NULL,
    phone VARCHAR(32) UNIQUE,
    password_hash TEXT NOT NULL,
    is_email_verified BOOLEAN DEFAULT false,
    is_phone_verified BOOLEAN DEFAULT false,
    status user_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    ip INET,
    ua TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_activity_logs_user_created ON activity_logs(user_id, created_at DESC);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    issued_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    rotated_from UUID,
    revoked_at TIMESTAMPTZ,
    ip INET,
    ua TEXT
);
CREATE INDEX idx_refresh_tokens_user_expires ON refresh_tokens(user_id, expires_at);

CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    destination TEXT NOT NULL,
    channel otp_channel NOT NULL,
    code_hash TEXT NOT NULL,
    purpose otp_purpose NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    attempts SMALLINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE mfa_secrets (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    type mfa_type NOT NULL,
    secret_enc TEXT,
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE recovery_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_payments_status_created ON payments(status, created_at DESC);

INSERT INTO roles (name) VALUES
    ('admin'),
    ('manager'),
    ('user'),
    ('service')
ON CONFLICT (name) DO NOTHING;
