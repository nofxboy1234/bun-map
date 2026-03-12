import type { Edge } from "@/utils/graphTypes";

import { MinHeap } from "@/utils/minHeap";

export type AStarHeuristic = (node: number, target: number) => number;

export type AStarResult = {
  source: number;
  target: number;
  distance: number;
  path: number[];
  dist: number[];
  prev: Array<number | null>;
};

export function reconstructPath(prev: Array<number | null>, target: number): number[] {
  if (target < 0 || target >= prev.length) return [];

  const path: number[] = [];
  let current: number | null = target;

  while (current !== null) {
    path.push(current);
    current = prev[current] ?? null;
  }

  path.reverse();
  return path;
}

export function aStar(
  graph: Edge[][],
  source: number,
  target: number,
  heuristic: AStarHeuristic = () => 0,
): AStarResult | null {
  const nodeCount = graph.length;
  const dist = Array<number>(nodeCount).fill(Infinity);
  const prev = Array<number | null>(nodeCount).fill(null);
  const queue = new MinHeap<number>();

  if (!graph[source] || !graph[target]) return null;

  dist[source] = 0;
  queue.push(heuristic(source, target), source);

  while (queue.size > 0) {
    const current = queue.pop();
    if (!current) break;

    const currentNodeIndex = current.value;
    const currentDistance = dist[currentNodeIndex];
    if (typeof currentDistance !== "number" || !Number.isFinite(currentDistance)) continue;

    const bestKnownPriority = currentDistance + heuristic(currentNodeIndex, target);
    if (current.key > bestKnownPriority + 1e-9) continue;

    if (currentNodeIndex === target) {
      const path = reconstructPath(prev, target);
      if (path[0] !== source) return null;

      return {
        source,
        target,
        distance: currentDistance,
        path,
        dist,
        prev,
      };
    }

    const edges = graph[currentNodeIndex];
    if (!edges) continue;

    for (const { to: neighborNodeIndex, weight } of edges) {
      if (neighborNodeIndex < 0 || neighborNodeIndex >= nodeCount) continue;

      if (weight < 0) {
        throw new Error("A* requires non-negative edge weights.");
      }

      const nextDistance = currentDistance + weight;
      const knownDistance = dist[neighborNodeIndex];
      if (typeof knownDistance !== "number") continue;
      if (nextDistance >= knownDistance) continue;

      dist[neighborNodeIndex] = nextDistance;
      prev[neighborNodeIndex] = currentNodeIndex;
      queue.push(nextDistance + heuristic(neighborNodeIndex, target), neighborNodeIndex);
    }
  }

  return null;
}
