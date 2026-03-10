import type { Edge } from "@/utils/graphTypes";

import {
  buildClosedTourResult,
  buildWaypointContext,
  createTrivialClosedTourResult,
  type TargetVisitTourResult,
  type WaypointContext,
} from "./shared";

function buildNearestNeighborOrder(
  waypointContext: WaypointContext,
  targetCount: number,
): number[] | null {
  const { waypointDistances } = waypointContext;
  const remainingTargetIndices = new Set<number>(
    Array.from({ length: targetCount }, (_, index) => index),
  );
  const order: number[] = [];
  let currentWaypointIndex = 0;

  while (remainingTargetIndices.size > 0) {
    let bestTargetIndex = -1;
    let bestDistance = Infinity;

    for (const targetIndex of remainingTargetIndices) {
      const distance = waypointDistances[currentWaypointIndex]?.[targetIndex + 1] ?? Infinity;
      if (!Number.isFinite(distance)) continue;

      if (distance < bestDistance) {
        bestDistance = distance;
        bestTargetIndex = targetIndex;
      }
    }

    if (bestTargetIndex === -1) return null;

    order.push(bestTargetIndex);
    remainingTargetIndices.delete(bestTargetIndex);
    currentWaypointIndex = bestTargetIndex + 1;
  }

  return order;
}

function improveWithTwoOpt(
  initialOrder: readonly number[],
  waypointContext: WaypointContext,
): number[] {
  const { waypointDistances } = waypointContext;
  const order = [...initialOrder];

  if (order.length < 3) return order;

  let improved = true;

  while (improved) {
    improved = false;

    improvementSearch: for (let start = 0; start < order.length - 1; start += 1) {
      const beforeStartWaypoint = start === 0 ? 0 : (order[start - 1] ?? -1) + 1;
      const startWaypoint = (order[start] ?? -1) + 1;

      for (let end = start + 1; end < order.length; end += 1) {
        if (start === 0 && end === order.length - 1) continue;

        const endWaypoint = (order[end] ?? -1) + 1;
        const afterEndWaypoint = end === order.length - 1 ? 0 : (order[end + 1] ?? -1) + 1;

        const currentDistance =
          (waypointDistances[beforeStartWaypoint]?.[startWaypoint] ?? Infinity) +
          (waypointDistances[endWaypoint]?.[afterEndWaypoint] ?? Infinity);
        const swappedDistance =
          (waypointDistances[beforeStartWaypoint]?.[endWaypoint] ?? Infinity) +
          (waypointDistances[startWaypoint]?.[afterEndWaypoint] ?? Infinity);

        if (swappedDistance + 1e-9 >= currentDistance) continue;

        const reversed = order.slice(start, end + 1).reverse();
        order.splice(start, end - start + 1, ...reversed);
        improved = true;
        break improvementSearch;
      }
    }
  }

  return order;
}

export function findNearestNeighborTwoOptClosedTargetVisitTour(
  graph: Edge[][],
  source: number,
  targets: readonly number[],
): TargetVisitTourResult | null {
  if (!graph[source]) return null;
  if (targets.length === 0) {
    return createTrivialClosedTourResult("nearest-neighbor-2opt", source, targets);
  }

  const waypointContext = buildWaypointContext(graph, source, targets);
  if (!waypointContext) return null;

  const initialOrder = buildNearestNeighborOrder(waypointContext, targets.length);
  if (!initialOrder) return null;

  const improvedOrder = improveWithTwoOpt(initialOrder, waypointContext);
  return buildClosedTourResult(
    "nearest-neighbor-2opt",
    source,
    targets,
    improvedOrder,
    waypointContext,
  );
}
