import { dijkstra, reconstructPath, type DijkstraResult } from "@/utils/dijkstra";
import type { Edge } from "@/utils/graphTypes";

export const routeAlgorithms = ["held-karp", "nearest-neighbor-2opt"] as const;

export type RouteAlgorithm = (typeof routeAlgorithms)[number];

export type TargetVisitSegment = {
  from: number;
  to: number;
  distance: number;
  path: number[];
};

export type TargetVisitTourResult = {
  algorithm: RouteAlgorithm;
  source: number;
  targets: readonly number[];
  distance: number;
  targetOrderIndices: number[];
  targetOrder: number[];
  waypointOrder: number[];
  path: number[];
  segments: TargetVisitSegment[];
};

export type WaypointContext = {
  waypoints: number[];
  waypointRuns: Array<DijkstraResult | null>;
  waypointDistances: number[][];
};

export function createTrivialClosedTourResult(
  algorithm: RouteAlgorithm,
  source: number,
  targets: readonly number[],
): TargetVisitTourResult {
  return {
    algorithm,
    source,
    targets,
    distance: 0,
    targetOrderIndices: [],
    targetOrder: [],
    waypointOrder: [source, source],
    path: [source],
    segments: [],
  };
}

export function buildWaypointRuns(
  graph: Edge[][],
  waypoints: readonly number[],
): Array<DijkstraResult | null> {
  return waypoints.map((waypoint) => (graph[waypoint] ? dijkstra(graph, waypoint) : null));
}

export function buildWaypointDistanceMatrix(
  waypoints: readonly number[],
  waypointRuns: ReadonlyArray<DijkstraResult | null>,
): number[][] | null {
  const matrix = waypoints.map(() => Array<number>(waypoints.length).fill(Infinity));

  for (let fromIndex = 0; fromIndex < waypoints.length; fromIndex += 1) {
    const run = waypointRuns[fromIndex];
    if (!run) return null;

    const row = matrix[fromIndex];
    if (!row) return null;

    for (let toIndex = 0; toIndex < waypoints.length; toIndex += 1) {
      const targetNode = waypoints[toIndex];
      if (typeof targetNode !== "number") return null;

      const distance = run.dist[targetNode];
      if (typeof distance !== "number" || !Number.isFinite(distance)) return null;

      row[toIndex] = distance;
    }
  }

  return matrix;
}

export function buildWaypointContext(
  graph: Edge[][],
  source: number,
  targets: readonly number[],
): WaypointContext | null {
  const waypoints = [source, ...targets];
  const waypointRuns = buildWaypointRuns(graph, waypoints);
  const waypointDistances = buildWaypointDistanceMatrix(waypoints, waypointRuns);
  if (!waypointDistances) return null;

  return {
    waypoints,
    waypointRuns,
    waypointDistances,
  };
}

export function buildClosedTourResult(
  algorithm: RouteAlgorithm,
  source: number,
  targets: readonly number[],
  targetOrderIndices: readonly number[],
  waypointContext: WaypointContext,
): TargetVisitTourResult | null {
  const { waypoints, waypointRuns, waypointDistances } = waypointContext;
  const targetOrder = targetOrderIndices
    .map((targetIndex) => targets[targetIndex])
    .filter((target): target is number => typeof target === "number");

  if (targetOrder.length !== targetOrderIndices.length) return null;

  const waypointOrderIndices = [0, ...targetOrderIndices.map((targetIndex) => targetIndex + 1), 0];
  const waypointOrder = waypointOrderIndices
    .map((waypointIndex) => waypoints[waypointIndex])
    .filter((waypoint): waypoint is number => typeof waypoint === "number");

  if (waypointOrder.length !== waypointOrderIndices.length) return null;

  const path: number[] = [];
  const segments: TargetVisitSegment[] = [];
  let distance = 0;

  for (let segmentIndex = 0; segmentIndex < waypointOrderIndices.length - 1; segmentIndex += 1) {
    const fromWaypointIndex = waypointOrderIndices[segmentIndex];
    const toWaypointIndex = waypointOrderIndices[segmentIndex + 1];
    const run = typeof fromWaypointIndex === "number" ? waypointRuns[fromWaypointIndex] : null;
    const fromNode = typeof fromWaypointIndex === "number" ? waypoints[fromWaypointIndex] : null;
    const toNode = typeof toWaypointIndex === "number" ? waypoints[toWaypointIndex] : null;
    const segmentDistance =
      typeof fromWaypointIndex === "number" && typeof toWaypointIndex === "number"
        ? waypointDistances[fromWaypointIndex]?.[toWaypointIndex]
        : null;

    if (!run || typeof fromNode !== "number" || typeof toNode !== "number") return null;
    if (typeof segmentDistance !== "number" || !Number.isFinite(segmentDistance)) return null;

    const segmentPath = reconstructPath(run.prev, toNode);
    if (segmentPath[0] !== fromNode) return null;

    segments.push({
      from: fromNode,
      to: toNode,
      distance: segmentDistance,
      path: segmentPath,
    });

    distance += segmentDistance;

    if (path.length === 0) {
      path.push(...segmentPath);
    } else {
      path.push(...segmentPath.slice(1));
    }
  }

  return {
    algorithm,
    source,
    targets,
    distance,
    targetOrderIndices: [...targetOrderIndices],
    targetOrder,
    waypointOrder,
    path,
    segments,
  };
}
