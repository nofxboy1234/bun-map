export type Entitlement = {
  active: boolean;
  status: "none" | "active" | "canceled";
  renewalEnabled: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  nextBillingAt: string | null;
  planCode: string | null;
  planName: string | null;
  amountCents: number | null;
  currency: string | null;
};

export type SubscriberResponse = {
  subscriber: {
    id: number;
    email: string;
  };
  entitlement: Entitlement;
};

export type MapPreset = {
  id: string;
  name: string;
};

export type MapNode = {
  id: string;
  x: number;
  y: number;
};

export type MapEdge = {
  from: string;
  to: string;
  distance: number;
};

export type DevilTarget = {
  id: string;
  name: string;
  nodeId: string;
};

export type MapSession = {
  mapId: string;
  mapName: string;
  seed: number;
  hunterNodeId: string;
  nodes: MapNode[];
  edges: MapEdge[];
  devils: DevilTarget[];
};

type ErrorPayload = {
  error?: string;
};

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T | ErrorPayload;

  if (!response.ok) {
    const message = (payload as ErrorPayload).error ?? "Request failed.";
    throw new Error(message);
  }

  return payload as T;
}

export async function ensureSubscriber(email: string) {
  const response = await fetch("/api/subscriptions/subscriber", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  return parseJsonOrThrow<SubscriberResponse>(response);
}

export async function getSubscriptionStatus(email: string) {
  const query = new URLSearchParams({ email });
  const response = await fetch(`/api/subscriptions/status?${query.toString()}`);
  return parseJsonOrThrow<SubscriberResponse>(response);
}

export async function subscribeMonthly(email: string) {
  const response = await fetch("/api/subscriptions/subscribe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  return parseJsonOrThrow<SubscriberResponse>(response);
}

export async function cancelSubscription(email: string) {
  const response = await fetch("/api/subscriptions/cancel", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  return parseJsonOrThrow<SubscriberResponse>(response);
}

export async function getMapPresets() {
  const response = await fetch("/api/maps");
  return parseJsonOrThrow<{ maps: MapPreset[] }>(response);
}

export async function getMapSession(email: string, mapId: string) {
  const query = new URLSearchParams({ email, mapId });
  const response = await fetch(`/api/maps/session?${query.toString()}`);
  return parseJsonOrThrow<MapSession>(response);
}
