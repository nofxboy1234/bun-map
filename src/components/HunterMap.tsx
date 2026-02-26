import { useEffect, useMemo, useState } from "react";
import {
  cancelSubscription,
  ensureSubscriber,
  getMapPresets,
  getMapSession,
  subscribeMonthly,
  type MapEdge,
  type MapNode,
  type MapPreset,
  type MapSession,
  type SubscriberResponse,
} from "@/dataFetchers/hunter";

type RouteResult = {
  distance: number;
  pathNodeIds: string[];
};

function formatMoney(amountCents: number | null, currency: string | null) {
  if (amountCents === null || !currency) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

function formatDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
}

function edgeKey(from: string, to: string) {
  return from < to ? `${from}|${to}` : `${to}|${from}`;
}

function buildPathEdgeSet(pathNodeIds: string[]) {
  const set = new Set<string>();

  for (let i = 0; i < pathNodeIds.length - 1; i++) {
    const from = pathNodeIds[i];
    const to = pathNodeIds[i + 1];

    if (from && to) {
      set.add(edgeKey(from, to));
    }
  }

  return set;
}

function buildAdjacency(edges: MapEdge[]) {
  const graph = new Map<string, Array<{ to: string; weight: number }>>();

  for (const edge of edges) {
    const fromEntries = graph.get(edge.from) ?? [];
    fromEntries.push({ to: edge.to, weight: edge.distance });
    graph.set(edge.from, fromEntries);

    const toEntries = graph.get(edge.to) ?? [];
    toEntries.push({ to: edge.from, weight: edge.distance });
    graph.set(edge.to, toEntries);
  }

  return graph;
}

function dijkstra(nodes: MapNode[], edges: MapEdge[], startNodeId: string, goalNodeId: string) {
  const nodeIds = nodes.map((node) => node.id);
  const unvisited = new Set(nodeIds);
  const distances = new Map(nodeIds.map((id) => [id, Number.POSITIVE_INFINITY] as const));
  const previous = new Map<string, string | null>();
  const graph = buildAdjacency(edges);

  distances.set(startNodeId, 0);

  while (unvisited.size > 0) {
    let current: string | null = null;
    let smallest = Number.POSITIVE_INFINITY;

    for (const nodeId of unvisited) {
      const distance = distances.get(nodeId) ?? Number.POSITIVE_INFINITY;

      if (distance < smallest) {
        smallest = distance;
        current = nodeId;
      }
    }

    if (!current || smallest === Number.POSITIVE_INFINITY) {
      break;
    }

    if (current === goalNodeId) {
      break;
    }

    unvisited.delete(current);

    const neighbors = graph.get(current) ?? [];

    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.to)) {
        continue;
      }

      const tentativeDistance = smallest + neighbor.weight;
      const existingDistance = distances.get(neighbor.to) ?? Number.POSITIVE_INFINITY;

      if (tentativeDistance < existingDistance) {
        distances.set(neighbor.to, tentativeDistance);
        previous.set(neighbor.to, current);
      }
    }
  }

  const goalDistance = distances.get(goalNodeId) ?? Number.POSITIVE_INFINITY;

  if (!Number.isFinite(goalDistance)) {
    return null;
  }

  const path: string[] = [];
  let current: string | null = goalNodeId;

  while (current) {
    path.unshift(current);
    current = previous.get(current) ?? null;
  }

  if (path[0] !== startNodeId) {
    return null;
  }

  return {
    distance: Number(goalDistance.toFixed(2)),
    pathNodeIds: path,
  } satisfies RouteResult;
}

function getNodeMap(nodes: MapNode[]) {
  return new Map(nodes.map((node) => [node.id, node] as const));
}

export function HunterMap() {
  const [email, setEmail] = useState("akira@devilhunter.jp");
  const [subscriber, setSubscriber] = useState<SubscriberResponse | null>(null);
  const [mapPresets, setMapPresets] = useState<MapPreset[]>([]);
  const [selectedMapId, setSelectedMapId] = useState("");
  const [session, setSession] = useState<MapSession | null>(null);
  const [selectedDevilId, setSelectedDevilId] = useState("");
  const [isSavingSubscriber, setIsSavingSubscriber] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMapPresets()
      .then((result) => {
        setMapPresets(result.maps);
        setSelectedMapId(result.maps[0]?.id ?? "");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load map presets.");
      });
  }, []);

  const selectedDevil = useMemo(() => {
    return session?.devils.find((devil) => devil.id === selectedDevilId) ?? null;
  }, [session, selectedDevilId]);

  const routeResult = useMemo(() => {
    if (!session || !selectedDevil) {
      return null;
    }

    return dijkstra(session.nodes, session.edges, session.hunterNodeId, selectedDevil.nodeId);
  }, [session, selectedDevil]);

  const pathEdgeSet = useMemo(() => {
    if (!routeResult) {
      return new Set<string>();
    }

    return buildPathEdgeSet(routeResult.pathNodeIds);
  }, [routeResult]);

  const nodeById = useMemo(() => {
    if (!session) {
      return new Map<string, MapNode>();
    }

    return getNodeMap(session.nodes);
  }, [session]);

  const hasAccess = subscriber?.entitlement.active ?? false;

  async function handleCreateSubscriber() {
    setIsSavingSubscriber(true);
    setError(null);

    try {
      const result = await ensureSubscriber(email);
      setSubscriber(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create subscriber.");
    } finally {
      setIsSavingSubscriber(false);
    }
  }

  async function handleSubscribe() {
    setIsSavingSubscriber(true);
    setError(null);

    try {
      const result = await subscribeMonthly(email);
      setSubscriber(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to subscribe.");
    } finally {
      setIsSavingSubscriber(false);
    }
  }

  async function handleCancel() {
    setIsSavingSubscriber(true);
    setError(null);

    try {
      const result = await cancelSubscription(email);
      setSubscriber(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel subscription.");
    } finally {
      setIsSavingSubscriber(false);
    }
  }

  async function handleLoadMapSession() {
    if (!selectedMapId) {
      return;
    }

    setIsMapLoading(true);
    setError(null);

    try {
      const mapSession = await getMapSession(email, selectedMapId);
      setSession(mapSession);
      setSelectedDevilId(mapSession.devils[0]?.id ?? "");
    } catch (err) {
      setSession(null);
      setSelectedDevilId("");
      setError(err instanceof Error ? err.message : "Failed to load map session.");
    } finally {
      setIsMapLoading(false);
    }
  }

  return (
    <section className="hunter-page">
      <h2>Chainsaw Map Subscription Demo</h2>
      <p className="subtitle">
        Monthly prepay subscription with map entitlement checks and Dijkstra shortest-route
        highlighting.
      </p>

      <div className="panel">
        <label htmlFor="email">Devil Hunter Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="hunter@publicsafety.jp"
        />

        <div className="actions-row">
          <button onClick={handleCreateSubscriber} disabled={isSavingSubscriber}>
            {isSavingSubscriber ? "Saving..." : "Create / Load Subscriber"}
          </button>
          <button onClick={handleSubscribe} disabled={isSavingSubscriber}>
            {isSavingSubscriber ? "Updating..." : "Start Monthly Subscription"}
          </button>
          <button onClick={handleCancel} disabled={isSavingSubscriber}>
            {isSavingSubscriber ? "Updating..." : "Cancel Renewal"}
          </button>
        </div>
      </div>

      <div className="panel">
        <h3>Entitlement</h3>
        <p>
          Status: <strong>{subscriber?.entitlement.status ?? "none"}</strong>
        </p>
        <p>
          Access now: <strong>{hasAccess ? "Granted" : "Blocked"}</strong>
        </p>
        <p>
          Plan: <strong>{subscriber?.entitlement.planName ?? "No active plan"}</strong>
        </p>
        <p>
          Price:{" "}
          <strong>
            {formatMoney(
              subscriber?.entitlement.amountCents ?? null,
              subscriber?.entitlement.currency ?? null,
            )}
          </strong>
        </p>
        <p>
          Current period:{" "}
          <strong>{formatDate(subscriber?.entitlement.currentPeriodStart ?? null)}</strong> to{" "}
          <strong>{formatDate(subscriber?.entitlement.currentPeriodEnd ?? null)}</strong>
        </p>
        <p>
          Next billing: <strong>{formatDate(subscriber?.entitlement.nextBillingAt ?? null)}</strong>
        </p>
      </div>

      <div className="panel">
        <h3>Maps</h3>
        <div className="actions-row">
          <select value={selectedMapId} onChange={(event) => setSelectedMapId(event.target.value)}>
            {mapPresets.map((mapPreset) => (
              <option key={mapPreset.id} value={mapPreset.id}>
                {mapPreset.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleLoadMapSession}
            disabled={!hasAccess || isMapLoading || !selectedMapId}
          >
            {isMapLoading ? "Locating Devils..." : "Refresh Hunt"}
          </button>
        </div>
        {!hasAccess ? <p className="hint">Subscribe first to unlock map sessions.</p> : null}
      </div>

      {session ? (
        <div className="panel">
          <h3>{session.mapName}</h3>
          <p className="hint">Session seed: {session.seed}</p>

          <div className="actions-row">
            <label htmlFor="devil-select">Target Devil</label>
            <select
              id="devil-select"
              value={selectedDevilId}
              onChange={(event) => setSelectedDevilId(event.target.value)}
            >
              {session.devils.map((devil) => (
                <option key={devil.id} value={devil.id}>
                  {devil.name}
                </option>
              ))}
            </select>
          </div>

          {routeResult ? (
            <p>
              Shortest route distance: <strong>{routeResult.distance}</strong>
            </p>
          ) : (
            <p>No route found to the selected Devil.</p>
          )}

          <svg viewBox="0 0 640 420" className="map-svg" role="img" aria-label="Devil hunter map">
            {session.edges.map((edge) => {
              const from = nodeById.get(edge.from);
              const to = nodeById.get(edge.to);

              if (!from || !to) {
                return null;
              }

              const active = pathEdgeSet.has(edgeKey(edge.from, edge.to));
              const x1 = 50 + from.x * 90;
              const y1 = 50 + from.y * 90;
              const x2 = 50 + to.x * 90;
              const y2 = 50 + to.y * 90;

              return (
                <line
                  key={`${edge.from}-${edge.to}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={active ? "edge active" : "edge"}
                />
              );
            })}

            {session.nodes.map((node) => {
              const isHunter = node.id === session.hunterNodeId;
              const devilOnNode = session.devils.find((devil) => devil.nodeId === node.id);
              const onPath = routeResult?.pathNodeIds.includes(node.id) ?? false;
              const x = 50 + node.x * 90;
              const y = 50 + node.y * 90;

              return (
                <g key={node.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r={12}
                    className={
                      isHunter
                        ? "node hunter"
                        : devilOnNode
                          ? "node devil"
                          : onPath
                            ? "node path"
                            : "node"
                    }
                  />
                  <text x={x + 15} y={y + 6} className="node-label">
                    {devilOnNode ? devilOnNode.name : node.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
