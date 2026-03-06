export type Edge = { to: number; weight: number };

export type DijkstraTraceQueueEntry = {
  id: number;
  node: number;
  distance: number;
};

export type DijkstraTraceHeapEntry = {
  node: number;
  distance: number;
};

export type DijkstraHeapOperationKind = "push" | "pop";

export type DijkstraTraceHeapFrame = {
  heap: DijkstraTraceHeapEntry[];
  message: string;
  activeIndices: number[];
  swapIndices: number[];
};

export type DijkstraTraceHeapOperation = {
  kind: DijkstraHeapOperationKind;
  frames: DijkstraTraceHeapFrame[];
};

export type DijkstraTracePhase =
  | "init"
  | "pop"
  | "skip-stale"
  | "inspect-edge"
  | "relax"
  | "no-relax"
  | "settle"
  | "done";

export type DijkstraTraceStep = {
  phase: DijkstraTracePhase;
  message: string;
  dist: number[];
  prev: Array<number | null>;
  queue: DijkstraTraceQueueEntry[];
  heap: DijkstraTraceHeapEntry[];
  heapOperation?: DijkstraTraceHeapOperation;
  settled: number[];
  current?: number;
  neighbor?: number;
  edgeWeight?: number;
  candidateDistance?: number;
  popped?: DijkstraTraceQueueEntry;
};

type HeapNode<T> = {
  key: number;
  value: T;
};

type HeapTraceFrame<T> = {
  heap: HeapNode<T>[];
  message: string;
  activeIndices: number[];
  swapIndices: number[];
};

type HeapOperationTrace<T> = {
  kind: DijkstraHeapOperationKind;
  frames: HeapTraceFrame<T>[];
};

class MinHeap<T> {
  private data: HeapNode<T>[] = [];
  private lastOperationTrace: HeapOperationTrace<T> | undefined;

  get size() {
    return this.data.length;
  }

  snapshot() {
    return [...this.data];
  }

  consumeLastOperationTrace() {
    const trace = this.lastOperationTrace;
    this.lastOperationTrace = undefined;
    return trace;
  }

  push(key: number, value: T) {
    const frames: HeapTraceFrame<T>[] = [];
    this.data.push({ key, value });
    const insertedIndex = this.data.length - 1;
    this.recordHeapFrame(frames, `Insert new entry at index ${insertedIndex}.`, [insertedIndex]);
    this.bubbleUp(this.data.length - 1, frames);
    this.lastOperationTrace = {
      kind: "push",
      frames,
    };
  }

  pop(): HeapNode<T> | undefined {
    const first = this.data[0];
    if (!first) return undefined;
    const frames: HeapTraceFrame<T>[] = [];
    this.recordHeapFrame(frames, "Remove root entry from the heap.", [0]);

    const last = this.data.pop();

    if (this.data.length > 0 && last) {
      this.data[0] = last;
      this.recordHeapFrame(frames, "Move the last entry to the root.", [0]);
      this.bubbleDown(0, frames);
    } else {
      this.recordHeapFrame(frames, "Heap is now empty after removing the root.", []);
    }

    this.lastOperationTrace = {
      kind: "pop",
      frames,
    };

    return first;
  }

  private bubbleUp(index: number, frames: HeapTraceFrame<T>[]) {
    let current = index;

    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      const parentNode = this.data[parent];
      const currentNode = this.data[current];

      this.recordHeapFrame(frames, `Compare index ${current} with parent index ${parent}.`, [
        current,
        parent,
      ]);

      if (!parentNode || !currentNode || parentNode.key <= currentNode.key) {
        this.recordHeapFrame(frames, "bubbleUp stops because the heap order is satisfied.", [
          current,
        ]);
        break;
      }

      [this.data[parent], this.data[current]] = [currentNode, parentNode];
      this.recordHeapFrame(
        frames,
        `Swap index ${current} with parent index ${parent}.`,
        [parent, current],
        [parent, current],
      );
      current = parent;
    }

    if (current === 0) {
      this.recordHeapFrame(frames, "bubbleUp ends at the root.", [current]);
    }
  }

  private bubbleDown(index: number, frames: HeapTraceFrame<T>[]) {
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
        this.recordHeapFrame(
          frames,
          `Left child at index ${left} is smaller than index ${smallest}.`,
          [current, left],
        );
        smallest = left;
      }

      const newSmallestNode = this.data[smallest];
      if (right < length && newSmallestNode && rightNode && rightNode.key < newSmallestNode.key) {
        this.recordHeapFrame(
          frames,
          `Right child at index ${right} is smaller than index ${smallest}.`,
          [current, right],
        );
        smallest = right;
      }

      if (smallest === current) {
        this.recordHeapFrame(frames, "bubbleDown stops because the heap order is satisfied.", [
          current,
        ]);
        break;
      }

      const currentNode = this.data[current];
      const chosenNode = this.data[smallest];
      if (!currentNode || !chosenNode) break;
      [this.data[current], this.data[smallest]] = [chosenNode, currentNode];
      this.recordHeapFrame(
        frames,
        `Swap index ${current} with child index ${smallest}.`,
        [current, smallest],
        [current, smallest],
      );
      current = smallest;
    }
  }

  private recordHeapFrame(
    frames: HeapTraceFrame<T>[],
    message: string,
    activeIndices: number[],
    swapIndices: number[] = [],
  ) {
    frames.push({
      heap: this.snapshot(),
      message,
      activeIndices,
      swapIndices,
    });
  }
}

export type DijkstraResult = {
  dist: number[];
  prev: Array<number | null>;
};

export type DijkstraTraceResult = DijkstraResult & {
  steps: DijkstraTraceStep[];
};

type DijkstraTraceRecorder = {
  capture: (
    step: Omit<DijkstraTraceStep, "dist" | "prev" | "queue" | "heap" | "settled">,
    heap: DijkstraTraceHeapEntry[],
    heapOperation: DijkstraTraceHeapOperation | undefined,
  ) => void;
  enqueue: (node: number, distance: number) => DijkstraTraceQueueEntry;
  dequeue: (node: number, distance: number) => DijkstraTraceQueueEntry | undefined;
  settle: (node: number) => void;
};

function formatDistance(value: number) {
  if (!Number.isFinite(value)) {
    return "inf";
  }

  return `${Number(value.toFixed(2))}`;
}

function sortTraceQueueEntries(entries: DijkstraTraceQueueEntry[]) {
  return [...entries].sort((left, right) => {
    if (left.distance !== right.distance) {
      return left.distance - right.distance;
    }

    return left.id - right.id;
  });
}

function mapHeapOperation<T extends number>(
  operation: HeapOperationTrace<T> | undefined,
): DijkstraTraceHeapOperation | undefined {
  if (!operation) {
    return undefined;
  }

  return {
    kind: operation.kind,
    frames: operation.frames.map((frame) => ({
      heap: frame.heap.map((entry) => ({
        node: entry.value,
        distance: entry.key,
      })),
      message: frame.message,
      activeIndices: [...frame.activeIndices],
      swapIndices: [...frame.swapIndices],
    })),
  };
}

function createTraceRecorder(
  dist: number[],
  prev: Array<number | null>,
  steps: DijkstraTraceStep[],
): DijkstraTraceRecorder {
  const queue: DijkstraTraceQueueEntry[] = [];
  const settled = new Set<number>();
  let nextId = 0;

  return {
    capture(step, heap, heapOperation) {
      steps.push({
        ...step,
        dist: [...dist],
        prev: [...prev],
        queue: sortTraceQueueEntries(queue),
        heap: heap.map((entry) => ({ ...entry })),
        heapOperation,
        settled: [...settled],
      });
    },
    enqueue(node, distance) {
      const entry = { id: nextId++, node, distance };
      queue.push(entry);
      return entry;
    },
    dequeue(node, distance) {
      const entryIndex = queue.findIndex(
        (entry) => entry.node === node && entry.distance === distance,
      );

      if (entryIndex < 0) {
        return undefined;
      }

      const [entry] = queue.splice(entryIndex, 1);
      return entry;
    },
    settle(node) {
      settled.add(node);
    },
  };
}

function runDijkstra(
  graph: Edge[][],
  source: number,
  createRecorder?: (dist: number[], prev: Array<number | null>) => DijkstraTraceRecorder,
): DijkstraResult {
  const nodeCount = graph.length;
  const dist = Array<number>(nodeCount).fill(Infinity);
  const prev = Array<number | null>(nodeCount).fill(null);
  const queue = new MinHeap<number>();
  const recorder = createRecorder?.(dist, prev);
  const capture = (
    step: Omit<DijkstraTraceStep, "dist" | "prev" | "queue" | "heap" | "settled">,
    includeHeapOperation = false,
  ) => {
    const heapOperation = includeHeapOperation
      ? mapHeapOperation(queue.consumeLastOperationTrace())
      : undefined;
    recorder?.capture(
      step,
      queue.snapshot().map((entry) => ({
        node: entry.value,
        distance: entry.key,
      })),
      heapOperation,
    );
  };

  if (!graph[source]) {
    capture({
      phase: "done",
      current: source,
      message: `Source ${source} is outside the graph or has no adjacency list.`,
    });
    return { dist, prev };
  }

  dist[source] = 0;
  queue.push(0, source);
  recorder?.enqueue(source, 0);
  capture(
    {
      phase: "init",
      current: source,
      message: `Initialize source ${source} with distance 0.`,
    },
    true,
  );

  while (queue.size > 0) {
    const current = queue.pop();
    if (!current) break;

    const { key: currentDistance, value: u } = current;
    const popped = recorder?.dequeue(u, currentDistance);
    capture(
      {
        phase: "pop",
        current: u,
        popped,
        message: `Pop node ${u} with tentative distance ${formatDistance(currentDistance)}.`,
      },
      true,
    );
    if (currentDistance !== dist[u]) {
      capture({
        phase: "skip-stale",
        current: u,
        popped,
        message: `Skip stale entry for node ${u}; the best known distance is ${formatDistance(
          dist[u] ?? Infinity,
        )}.`,
      });
      continue;
    }

    const edges = graph[u];
    if (!edges) {
      recorder?.settle(u);
      capture({
        phase: "settle",
        current: u,
        message: `Settle node ${u}; it has no outgoing edges to inspect.`,
      });
      continue;
    }

    for (const { to: v, weight } of edges) {
      if (v < 0 || v >= nodeCount) continue;
      if (weight < 0) {
        throw new Error("Dijkstra requires non-negative edge weights.");
      }

      const knownDistance = dist[v];
      if (typeof knownDistance !== "number") continue;
      const nextDistance = currentDistance + weight;
      capture({
        phase: "inspect-edge",
        current: u,
        neighbor: v,
        edgeWeight: weight,
        candidateDistance: nextDistance,
        message:
          `Inspect ${u} -> ${v} (weight ${formatDistance(weight)}): ` +
          `candidate ${formatDistance(nextDistance)} vs known ${formatDistance(knownDistance)}.`,
      });

      if (nextDistance < knownDistance) {
        dist[v] = nextDistance;
        prev[v] = u;
        queue.push(nextDistance, v);
        recorder?.enqueue(v, nextDistance);
        capture(
          {
            phase: "relax",
            current: u,
            neighbor: v,
            edgeWeight: weight,
            candidateDistance: nextDistance,
            message:
              `Relax node ${v}: set distance to ${formatDistance(nextDistance)} ` +
              `and predecessor to ${u}.`,
          },
          true,
        );
      } else {
        capture({
          phase: "no-relax",
          current: u,
          neighbor: v,
          edgeWeight: weight,
          candidateDistance: nextDistance,
          message: `Keep node ${v} unchanged; ${formatDistance(knownDistance)} is already better.`,
        });
      }
    }

    recorder?.settle(u);
    capture({
      phase: "settle",
      current: u,
      message: `Settle node ${u}; its shortest distance is now final.`,
    });
  }

  return { dist, prev };
}

export function dijkstra(graph: Edge[][], source: number): DijkstraResult {
  return runDijkstra(graph, source);
}

export function traceDijkstra(graph: Edge[][], source: number): DijkstraTraceResult {
  const steps: DijkstraTraceStep[] = [];
  const result = runDijkstra(graph, source, (dist, prev) => createTraceRecorder(dist, prev, steps));

  const tracedSteps = steps.map((step) => ({
    ...step,
    dist: [...step.dist],
    prev: [...step.prev],
    queue: [...step.queue],
    heap: [...step.heap],
    heapOperation: step.heapOperation
      ? {
          kind: step.heapOperation.kind,
          frames: step.heapOperation.frames.map((frame) => ({
            heap: [...frame.heap],
            message: frame.message,
            activeIndices: [...frame.activeIndices],
            swapIndices: [...frame.swapIndices],
          })),
        }
      : undefined,
    settled: [...step.settled],
  }));
  const alreadyCompleted = tracedSteps.at(-1)?.phase === "done";
  const lastSettled = tracedSteps.at(-1)?.settled ?? [];

  if (!alreadyCompleted) {
    tracedSteps.push({
      phase: "done",
      message: "Dijkstra completed. Use prev[] to reconstruct any reachable route.",
      dist: [...result.dist],
      prev: [...result.prev],
      queue: [],
      heap: [],
      heapOperation: undefined,
      settled: [...lastSettled],
    });
  }

  return {
    ...result,
    steps: tracedSteps,
  };
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
