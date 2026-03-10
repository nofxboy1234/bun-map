import type { Edge } from "@/utils/graphTypes";

import {
  buildClosedTourResult,
  buildWaypointContext,
  createTrivialClosedTourResult,
  type TargetVisitTourResult,
  type WaypointContext,
} from "./shared";

type HeldKarpLayer = Map<number, Float64Array>;
type HeldKarpParentTable = Int8Array;

function createHeldKarpRow(targetCount: number): Float64Array {
  const row = new Float64Array(targetCount);
  row.fill(Infinity);
  return row;
}

function getHeldKarpParentIndex(mask: number, targetIndex: number, targetCount: number): number {
  return mask * targetCount + targetIndex;
}

function reconstructHeldKarpTargetOrder(
  parents: HeldKarpParentTable,
  targetCount: number,
  fullMask: number,
  bestTargetIndex: number,
): number[] {
  const order: number[] = [];

  let mask = fullMask;
  let currentTargetIndex = bestTargetIndex;

  while (currentTargetIndex !== -1) {
    order.push(currentTargetIndex);

    const parentIndex = getHeldKarpParentIndex(mask, currentTargetIndex, targetCount);
    const previousTargetIndex = parents[parentIndex] ?? -1;
    mask ^= 1 << currentTargetIndex;
    currentTargetIndex = previousTargetIndex;
  }

  order.reverse();
  return order;
}

function findBestClosedTourOrder(
  waypointContext: WaypointContext,
  targetCount: number,
): number[] | null {
  const { waypointDistances } = waypointContext;

  if (targetCount > 30) {
    throw new Error("Held-Karp target visit search supports at most 30 targets.");
  }

  const fullMask = (1 << targetCount) - 1;
  const parents: HeldKarpParentTable = new Int8Array((fullMask + 1) * targetCount);
  parents.fill(-1);

  let currentLayer: HeldKarpLayer = new Map();

  for (let targetIndex = 0; targetIndex < targetCount; targetIndex += 1) {
    const mask = 1 << targetIndex;
    const row = createHeldKarpRow(targetCount);
    const distanceFromSource = waypointDistances[0]?.[targetIndex + 1];

    if (typeof distanceFromSource !== "number" || !Number.isFinite(distanceFromSource)) {
      return null;
    }

    row[targetIndex] = distanceFromSource;
    currentLayer.set(mask, row);
  }

  // Keep only one subset-size layer of distances in memory; parents store reconstruction state.
  for (let subsetSize = 1; subsetSize < targetCount; subsetSize += 1) {
    const nextLayer: HeldKarpLayer = new Map();

    for (const [mask, row] of currentLayer) {
      for (let lastTargetIndex = 0; lastTargetIndex < targetCount; lastTargetIndex += 1) {
        if ((mask & (1 << lastTargetIndex)) === 0) continue;

        const baseDistance = row[lastTargetIndex] ?? Infinity;
        if (!Number.isFinite(baseDistance)) continue;

        for (let nextTargetIndex = 0; nextTargetIndex < targetCount; nextTargetIndex += 1) {
          const nextBit = 1 << nextTargetIndex;
          if ((mask & nextBit) !== 0) continue;

          const legDistance = waypointDistances[lastTargetIndex + 1]?.[nextTargetIndex + 1];
          if (typeof legDistance !== "number" || !Number.isFinite(legDistance)) continue;

          const nextMask = mask | nextBit;
          const nextDistance = baseDistance + legDistance;
          let nextRow = nextLayer.get(nextMask);

          if (!nextRow) {
            const createdRow = createHeldKarpRow(targetCount);
            nextLayer.set(nextMask, createdRow);
            nextRow = createdRow;
          }

          const knownNextDistance = nextRow[nextTargetIndex] ?? Infinity;
          if (nextDistance < knownNextDistance) {
            nextRow[nextTargetIndex] = nextDistance;
            const parentIndex = getHeldKarpParentIndex(nextMask, nextTargetIndex, targetCount);
            parents[parentIndex] = lastTargetIndex;
          }
        }
      }
    }

    currentLayer = nextLayer;
  }

  const finalRow = currentLayer.get(fullMask);
  if (!finalRow) return null;

  let bestTargetIndex = -1;
  let bestDistance = Infinity;

  for (let targetIndex = 0; targetIndex < targetCount; targetIndex += 1) {
    const openDistance = finalRow[targetIndex] ?? Infinity;
    const returnDistance = waypointDistances[targetIndex + 1]?.[0] ?? Infinity;
    const closedDistance = openDistance + returnDistance;

    if (!Number.isFinite(closedDistance)) continue;

    if (closedDistance < bestDistance) {
      bestDistance = closedDistance;
      bestTargetIndex = targetIndex;
    }
  }

  if (bestTargetIndex === -1) return null;

  return reconstructHeldKarpTargetOrder(parents, targetCount, fullMask, bestTargetIndex);
}

export function findHeldKarpClosedTargetVisitTour(
  graph: Edge[][],
  source: number,
  targets: readonly number[],
): TargetVisitTourResult | null {
  if (!graph[source]) return null;
  if (targets.length === 0) {
    return createTrivialClosedTourResult("held-karp", source, targets);
  }

  const waypointContext = buildWaypointContext(graph, source, targets);
  if (!waypointContext) return null;

  const targetOrderIndices = findBestClosedTourOrder(waypointContext, targets.length);
  if (!targetOrderIndices) return null;

  return buildClosedTourResult("held-karp", source, targets, targetOrderIndices, waypointContext);
}
