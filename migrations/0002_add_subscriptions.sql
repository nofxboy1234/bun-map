CREATE TABLE users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email VARCHAR(320) NOT NULL
);
CREATE UNIQUE INDEX users_email_idx ON users (email);

CREATE TABLE plans (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency CHAR(3) NOT NULL,
  interval_months INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX plans_code_idx ON plans (code);

CREATE TABLE subscriptions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES plans (id) ON DELETE RESTRICT,
  status VARCHAR(32) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  next_billing_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT subscriptions_status_chk CHECK (status IN ('active', 'canceled')),
  CONSTRAINT subscriptions_period_chk CHECK (current_period_end > current_period_start)
);
CREATE UNIQUE INDEX subscriptions_user_id_idx ON subscriptions (user_id);
CREATE INDEX subscriptions_status_idx ON subscriptions (status);
CREATE INDEX subscriptions_next_billing_idx ON subscriptions (next_billing_at);

CREATE TABLE subscription_invoices (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  subscription_id INTEGER NOT NULL REFERENCES subscriptions (id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency CHAR(3) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status VARCHAR(32) NOT NULL DEFAULT 'paid',
  CONSTRAINT subscription_invoices_status_chk CHECK (status IN ('paid')),
  CONSTRAINT subscription_invoices_period_chk CHECK (period_end > period_start)
);
CREATE UNIQUE INDEX subscription_invoices_subscription_period_idx
  ON subscription_invoices (subscription_id, period_start, period_end);
