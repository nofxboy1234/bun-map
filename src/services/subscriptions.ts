import { sql } from "bun";

export type EntitlementStatus = "none" | "active" | "canceled";

type UserRow = {
  id: number;
  email: string;
};

type PlanRow = {
  id: number;
  code: string;
  name: string;
  amountCents: number;
  currency: string;
  intervalMonths: number;
};

type SubscriptionRow = {
  id: number;
  userId: number;
  planId: number;
  status: "active" | "canceled";
  startedAt: Date;
  canceledAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingAt: Date;
  planCode: string;
  planName: string;
  amountCents: number;
  currency: string;
  intervalMonths: number;
};

export type Entitlement = {
  active: boolean;
  status: EntitlementStatus;
  renewalEnabled: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  nextBillingAt: string | null;
  planCode: string | null;
  planName: string | null;
  amountCents: number | null;
  currency: string | null;
};

export type SubscriberWithEntitlement = {
  subscriber: {
    id: number;
    email: string;
  };
  entitlement: Entitlement;
};

const DEFAULT_PLAN = {
  code: "chainsaw_map_monthly",
  name: "Chainsaw Map Monthly",
  amountCents: 799,
  currency: "USD",
  intervalMonths: 1,
} as const;

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function addMonthsKeepingAnchor(input: Date, months: number) {
  const year = input.getUTCFullYear();
  const month = input.getUTCMonth();
  const day = input.getUTCDate();
  const hours = input.getUTCHours();
  const minutes = input.getUTCMinutes();
  const seconds = input.getUTCSeconds();
  const millis = input.getUTCMilliseconds();

  const totalMonths = month + months;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);

  return new Date(Date.UTC(targetYear, targetMonth, clampedDay, hours, minutes, seconds, millis));
}

function buildEntitlement(subscription: SubscriptionRow | null, now: Date): Entitlement {
  if (!subscription) {
    return {
      active: false,
      status: "none",
      renewalEnabled: false,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      nextBillingAt: null,
      planCode: null,
      planName: null,
      amountCents: null,
      currency: null,
    };
  }

  const periodEnd = subscription.currentPeriodEnd;
  const hasAccess = now < periodEnd;

  return {
    active: hasAccess,
    status: subscription.status,
    renewalEnabled: subscription.status === "active",
    currentPeriodStart: toIso(subscription.currentPeriodStart),
    currentPeriodEnd: toIso(periodEnd),
    nextBillingAt: toIso(subscription.nextBillingAt),
    planCode: subscription.planCode,
    planName: subscription.planName,
    amountCents: subscription.amountCents,
    currency: subscription.currency,
  };
}

async function ensureDefaultPlan() {
  const rows = await sql<PlanRow[]>`
    INSERT INTO plans (
      code,
      name,
      amount_cents,
      currency,
      interval_months,
      is_active
    )
    VALUES (
      ${DEFAULT_PLAN.code},
      ${DEFAULT_PLAN.name},
      ${DEFAULT_PLAN.amountCents},
      ${DEFAULT_PLAN.currency},
      ${DEFAULT_PLAN.intervalMonths},
      true
    )
    ON CONFLICT (code)
    DO UPDATE SET
      name = EXCLUDED.name,
      amount_cents = EXCLUDED.amount_cents,
      currency = EXCLUDED.currency,
      interval_months = EXCLUDED.interval_months,
      is_active = true
    RETURNING
      id,
      code,
      name,
      amount_cents AS "amountCents",
      currency,
      interval_months AS "intervalMonths"
  `;

  return rows[0]!;
}

async function findUserByEmail(email: string) {
  const rows = await sql<UserRow[]>`
    SELECT id, email
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function createUser(email: string) {
  const rows = await sql<UserRow[]>`
    INSERT INTO users (email)
    VALUES (${email})
    ON CONFLICT (email)
    DO UPDATE SET email = EXCLUDED.email
    RETURNING id, email
  `;

  return rows[0]!;
}

async function getSubscriptionForUser(userId: number) {
  const rows = await sql<SubscriptionRow[]>`
    SELECT
      subscriptions.id,
      subscriptions.user_id AS "userId",
      subscriptions.plan_id AS "planId",
      subscriptions.status,
      subscriptions.started_at AS "startedAt",
      subscriptions.canceled_at AS "canceledAt",
      subscriptions.current_period_start AS "currentPeriodStart",
      subscriptions.current_period_end AS "currentPeriodEnd",
      subscriptions.next_billing_at AS "nextBillingAt",
      plans.code AS "planCode",
      plans.name AS "planName",
      plans.amount_cents AS "amountCents",
      plans.currency,
      plans.interval_months AS "intervalMonths"
    FROM subscriptions
    INNER JOIN plans ON plans.id = subscriptions.plan_id
    WHERE subscriptions.user_id = ${userId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function recordInvoice(
  subscriptionId: number,
  periodStart: Date,
  periodEnd: Date,
  amountCents: number,
  currency: string,
) {
  await sql`
    INSERT INTO subscription_invoices (
      subscription_id,
      period_start,
      period_end,
      amount_cents,
      currency,
      status
    )
    VALUES (
      ${subscriptionId},
      ${periodStart},
      ${periodEnd},
      ${amountCents},
      ${currency},
      'paid'
    )
    ON CONFLICT (subscription_id, period_start, period_end)
    DO NOTHING
  `;
}

async function autoRenewIfNeeded(subscription: SubscriptionRow, now: Date) {
  if (subscription.status !== "active") {
    return subscription;
  }

  let currentStart = subscription.currentPeriodStart;
  let currentEnd = subscription.currentPeriodEnd;
  let renewedCycles = 0;
  const billedPeriods: Array<{ start: Date; end: Date }> = [];

  while (now >= currentEnd && renewedCycles < 120) {
    const nextStart = currentEnd;
    const nextEnd = addMonthsKeepingAnchor(nextStart, subscription.intervalMonths);
    billedPeriods.push({ start: nextStart, end: nextEnd });

    currentStart = nextStart;
    currentEnd = nextEnd;
    renewedCycles += 1;
  }

  if (renewedCycles === 0) {
    return subscription;
  }

  await sql`
    UPDATE subscriptions
    SET
      current_period_start = ${currentStart},
      current_period_end = ${currentEnd},
      next_billing_at = ${currentEnd},
      updated_at = now()
    WHERE id = ${subscription.id}
  `;

  for (const period of billedPeriods) {
    await recordInvoice(
      subscription.id,
      period.start,
      period.end,
      subscription.amountCents,
      subscription.currency,
    );
  }

  return (await getSubscriptionForUser(subscription.userId)) ?? subscription;
}

async function assertEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    throw new Error("Please provide a valid email address.");
  }

  return normalizedEmail;
}

export async function ensureSubscriber(email: string): Promise<SubscriberWithEntitlement> {
  const normalizedEmail = await assertEmail(email);
  const user = (await findUserByEmail(normalizedEmail)) ?? (await createUser(normalizedEmail));
  const now = new Date();
  const subscription = await getSubscriptionForUser(user.id);
  const currentSubscription = subscription ? await autoRenewIfNeeded(subscription, now) : null;

  return {
    subscriber: user,
    entitlement: buildEntitlement(currentSubscription, now),
  };
}

export async function getSubscriberStatus(email: string): Promise<SubscriberWithEntitlement> {
  const normalizedEmail = await assertEmail(email);
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    return {
      subscriber: {
        id: 0,
        email: normalizedEmail,
      },
      entitlement: buildEntitlement(null, new Date()),
    };
  }

  const now = new Date();
  const subscription = await getSubscriptionForUser(user.id);
  const currentSubscription = subscription ? await autoRenewIfNeeded(subscription, now) : null;

  return {
    subscriber: user,
    entitlement: buildEntitlement(currentSubscription, now),
  };
}

export async function subscribeMonthly(email: string): Promise<SubscriberWithEntitlement> {
  const normalizedEmail = await assertEmail(email);
  const user = (await findUserByEmail(normalizedEmail)) ?? (await createUser(normalizedEmail));
  const plan = await ensureDefaultPlan();
  const now = new Date();
  const periodStart = now;
  const periodEnd = addMonthsKeepingAnchor(periodStart, plan.intervalMonths);

  const current = await getSubscriptionForUser(user.id);

  if (!current) {
    const insertedRows = await sql<{ id: number }[]>`
      INSERT INTO subscriptions (
        user_id,
        plan_id,
        status,
        started_at,
        current_period_start,
        current_period_end,
        next_billing_at
      )
      VALUES (
        ${user.id},
        ${plan.id},
        'active',
        ${periodStart},
        ${periodStart},
        ${periodEnd},
        ${periodEnd}
      )
      RETURNING id
    `;

    await recordInvoice(
      insertedRows[0]!.id,
      periodStart,
      periodEnd,
      plan.amountCents,
      plan.currency,
    );
  } else {
    if (current.status === "active" && now < current.currentPeriodEnd) {
      return getSubscriberStatus(normalizedEmail);
    }

    if (current.status === "canceled" && now < current.currentPeriodEnd) {
      await sql`
        UPDATE subscriptions
        SET
          plan_id = ${plan.id},
          status = 'active',
          canceled_at = NULL,
          next_billing_at = current_period_end,
          updated_at = now()
        WHERE user_id = ${user.id}
      `;

      return getSubscriberStatus(normalizedEmail);
    }

    await sql`
      UPDATE subscriptions
      SET
        plan_id = ${plan.id},
        status = 'active',
        canceled_at = NULL,
        started_at = COALESCE(started_at, ${periodStart}),
        current_period_start = ${periodStart},
        current_period_end = ${periodEnd},
        next_billing_at = ${periodEnd},
        updated_at = now()
      WHERE user_id = ${user.id}
    `;

    await recordInvoice(current.id, periodStart, periodEnd, plan.amountCents, plan.currency);
  }

  return getSubscriberStatus(normalizedEmail);
}

export async function cancelSubscription(email: string): Promise<SubscriberWithEntitlement> {
  const normalizedEmail = await assertEmail(email);
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    return {
      subscriber: {
        id: 0,
        email: normalizedEmail,
      },
      entitlement: buildEntitlement(null, new Date()),
    };
  }

  await sql`
    UPDATE subscriptions
    SET
      status = 'canceled',
      canceled_at = now(),
      updated_at = now()
    WHERE user_id = ${user.id}
      AND status = 'active'
  `;

  return getSubscriberStatus(normalizedEmail);
}

export async function hasActiveSubscription(email: string) {
  const status = await getSubscriberStatus(email);
  return status.entitlement.active;
}
