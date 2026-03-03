export type Edge = { to: number; weight: number };

type HeapNode<T> = {
  key: number;
  value: T;
};

class MinHeap<T> {
  private data: HeapNode<T>[] = [];

  get size() {
    return this.data.length;
  }

  push(key: number, value: T) {
    this.data.push({ key, value });
    this.bubbleUp(this.data.length - 1);
  }

  pop(): HeapNode<T> | undefined {
    const first = this.data[0];
    if (!first) return undefined;

    const last = this.data.pop();
    if (this.data.length > 0 && last) {
      this.data[0] = last;
      this.bubbleDown(0);
    }

    return first;
  }

  private bubbleUp(index: number) {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      const parentNode = this.data[parent];
      const currentNode = this.data[current];
      if (!parentNode || !currentNode || parentNode.key <= currentNode.key) break;
      [this.data[parent], this.data[current]] = [currentNode, parentNode];
      current = parent;
    }
  }

  private bubbleDown(index: number) {
    let current = index;
    const length = this.data.length;

    while (true) {
      let smallest = current;
      const left = current * 2 + 1;
      const right = current * 2 + 2;

      const smallestNode = this.data[smallest];
      const leftNode = this.data[left];
      const rightNode = this.data[right];

      if (left < length && smallestNode && leftNode && leftNode.key < smallestNode.key) {
        smallest = left;
      }

      const newSmallestNode = this.data[smallest];
      if (right < length && newSmallestNode && rightNode && rightNode.key < newSmallestNode.key) {
        smallest = right;
      }

      if (smallest === current) break;
      const currentNode = this.data[current];
      const chosenNode = this.data[smallest];
      if (!currentNode || !chosenNode) break;
      [this.data[current], this.data[smallest]] = [chosenNode, currentNode];
      current = smallest;
    }
  }
}

export type DijkstraResult = {
  dist: number[];
  prev: Array<number | null>;
};

export function dijkstra(graph: Edge[][], source: number): DijkstraResult {
  const nodeCount = graph.length;
  const dist = Array<number>(nodeCount).fill(Infinity);
  const prev = Array<number | null>(nodeCount).fill(null);
  const queue = new MinHeap<number>();

  if (!graph[source]) {
    return { dist, prev };
  }

  dist[source] = 0;
  queue.push(0, source);

  while (queue.size > 0) {
    const current = queue.pop();
    if (!current) break;

    const { key: currentDistance, value: u } = current;
    if (currentDistance !== dist[u]) continue;

    const edges = graph[u];
    if (!edges) continue;

    for (const { to: v, weight } of edges) {
      if (v < 0 || v >= nodeCount) continue;
      if (weight < 0) {
        throw new Error("Dijkstra requires non-negative edge weights.");
      }

      const knownDistance = dist[v];
      if (typeof knownDistance !== "number") continue;
      const nextDistance = currentDistance + weight;
      if (nextDistance < knownDistance) {
        dist[v] = nextDistance;
        prev[v] = u;
        queue.push(nextDistance, v);
      }
    }
  }

  return { dist, prev };
}

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
