import { useEffect, useMemo, useState } from "react";
import { Link } from "@/router/components/Link";
import {
  buildRe9Graph,
  findNearestRe9TargetPath,
  re9NodePositions,
  re9Source,
  re9Targets,
  re9UndirectedEdges,
} from "@/dataFetchers/re9Graph";
import {
  reconstructPath,
  traceDijkstra,
  type DijkstraTraceHeapFrame,
  type DijkstraTraceHeapEntry,
  type DijkstraTracePhase,
  type DijkstraTraceStep,
} from "@/utils/dijkstra";

const RE9_GRAPH = buildRe9Graph();
const RE9_TRACE = traceDijkstra(RE9_GRAPH, re9Source);
const NEAREST_TARGET_RESULT = findNearestRe9TargetPath(RE9_GRAPH);
const DEFAULT_TARGET = NEAREST_TARGET_RESULT?.target ?? re9Targets[0] ?? re9Source;
const PLAYBACK_DELAY_MS = 280;
const HEAP_VISIBLE_COUNT = 31;
const HEAP_WIDTH = 1040;
const HEAP_LEVEL_HEIGHT = 232;
const HEAP_NODE_RADIUS = 64;
const PHASE_LABELS: Record<DijkstraTracePhase, string> = {
  init: "Initialize",
  pop: "Pop Queue",
  "skip-stale": "Skip Stale",
  "inspect-edge": "Inspect Edge",
  relax: "Relax Edge",
  "no-relax": "Keep Best",
  settle: "Settle Node",
  done: "Complete",
};

const GRAPH_VIEWBOX = getGraphViewBox(re9NodePositions, 28);

function getGraphViewBox(points: Array<[number, number]>, padding: number) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs) - padding;
  const minY = Math.min(...ys) - padding;
  const maxX = Math.max(...xs) + padding;
  const maxY = Math.max(...ys) + padding;

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function formatDistance(value: number) {
  if (!Number.isFinite(value)) {
    return "inf";
  }

  return `${Number(value.toFixed(2))}`;
}

function toNodeAlias(nodeId: number) {
  let current = nodeId + 1;
  let result = "";

  while (current > 0) {
    const offset = (current - 1) % 26;
    result = String.fromCharCode(65 + offset) + result;
    current = Math.floor((current - 1) / 26);
  }

  return result;
}

function getNodeLabel(nodeId: number) {
  return `${toNodeAlias(nodeId)} (#${nodeId})`;
}

function getNodeShortLabel(nodeId: number) {
  return toNodeAlias(nodeId);
}

function getStepMessage(step: DijkstraTraceStep) {
  switch (step.phase) {
    case "init":
      return `Initialize source ${getNodeLabel(step.current ?? re9Source)} with distance 0.`;
    case "pop":
      return `Pop node ${getNodeLabel(step.current ?? re9Source)} with tentative distance ${formatDistance(
        step.popped?.distance ?? step.dist[step.current ?? re9Source] ?? Infinity,
      )}.`;
    case "skip-stale":
      return `Skip stale entry for node ${getNodeLabel(
        step.current ?? re9Source,
      )}; the best known distance is ${formatDistance(step.dist[step.current ?? re9Source] ?? Infinity)}.`;
    case "inspect-edge":
      return `Inspect ${getNodeLabel(step.current ?? re9Source)} -> ${getNodeLabel(
        step.neighbor ?? re9Source,
      )} (weight ${formatDistance(step.edgeWeight ?? Infinity)}): candidate ${formatDistance(
        step.candidateDistance ?? Infinity,
      )} vs known ${formatDistance(step.dist[step.neighbor ?? re9Source] ?? Infinity)}.`;
    case "relax":
      return `Relax node ${getNodeLabel(step.neighbor ?? re9Source)}: set distance to ${formatDistance(
        step.dist[step.neighbor ?? re9Source] ?? Infinity,
      )} and predecessor to ${getNodeLabel(step.current ?? re9Source)}.`;
    case "no-relax":
      return `Keep node ${getNodeLabel(step.neighbor ?? re9Source)} unchanged; ${formatDistance(
        step.dist[step.neighbor ?? re9Source] ?? Infinity,
      )} is already better.`;
    case "settle":
      return `Settle node ${getNodeLabel(
        step.current ?? re9Source,
      )}; its shortest distance is now final.`;
    case "done":
      return "Dijkstra completed. Use prev[] to reconstruct any reachable route.";
    default:
      return step.message;
  }
}

function getEdgeKey(from: number, to: number) {
  return from < to ? `${from}-${to}` : `${to}-${from}`;
}

function getKnownPath(step: Pick<DijkstraTraceStep, "dist" | "prev">, target: number) {
  const distance = step.dist[target];

  if (!Number.isFinite(distance)) {
    return [];
  }

  return reconstructPath(step.prev, target);
}

function toEdgeKeySet(path: number[]) {
  return new Set(
    path.slice(0, -1).map((node, index) => {
      return getEdgeKey(node, path[index + 1]!);
    }),
  );
}

function formatPath(path: number[]) {
  if (path.length === 0) {
    return "unreachable";
  }

  if (path.length <= 8) {
    return path.map(getNodeLabel).join(" -> ");
  }

  const head = path.slice(0, 4).map(getNodeLabel);
  const tail = path.slice(-3).map(getNodeLabel);
  return [...head, "...", ...tail].join(" -> ");
}

function describePath(path: number[], dist: number[], target: number) {
  if (path.length === 0 || !Number.isFinite(dist[target] ?? Infinity)) {
    return "unreachable";
  }

  return `${formatPath(path)} (${formatDistance(dist[target]!)})`;
}

function shouldLabelNode(nodeId: number, currentStep: DijkstraTraceStep, selectedTarget: number) {
  return (
    nodeId === re9Source ||
    nodeId === selectedTarget ||
    nodeId === currentStep.current ||
    nodeId === currentStep.neighbor
  );
}

function getNodeClassNames(nodeId: number, currentStep: DijkstraTraceStep, selectedTarget: number) {
  const classNames = ["re9-node"];

  if (currentStep.settled.includes(nodeId)) {
    classNames.push("is-settled");
  }

  if (nodeId === re9Source) {
    classNames.push("is-source");
  }

  if (nodeId === selectedTarget) {
    classNames.push("is-target");
  }

  if (nodeId === currentStep.current) {
    classNames.push("is-current");
  }

  if (nodeId === currentStep.neighbor) {
    classNames.push("is-neighbor");
  }

  return classNames.join(" ");
}

function getHeapHeight(heapLength: number) {
  const visibleCount = Math.min(Math.max(heapLength, 1), HEAP_VISIBLE_COUNT);
  const levelCount = Math.floor(Math.log2(visibleCount)) + 1;
  return levelCount * HEAP_LEVEL_HEIGHT + 60;
}

function getHeapNodePosition(index: number, visibleCount: number) {
  const level = Math.floor(Math.log2(index + 1));
  const firstIndexInLevel = 2 ** level - 1;
  const positionInLevel = index - firstIndexInLevel;
  const nodesInLevel = Math.min(2 ** level, visibleCount - firstIndexInLevel);
  const x = (HEAP_WIDTH / (nodesInLevel + 1)) * (positionInLevel + 1);
  const y = 44 + level * HEAP_LEVEL_HEIGHT;

  return { x, y };
}

function renderHeapTree(
  heapEntries: DijkstraTraceHeapEntry[],
  activeIndices: number[] = [],
  swapIndices: number[] = [],
) {
  const visibleEntries = heapEntries.slice(0, HEAP_VISIBLE_COUNT);
  const heapHeight = getHeapHeight(visibleEntries.length);
  const activeIndexSet = new Set(activeIndices);
  const swapIndexSet = new Set(swapIndices);

  return (
    <svg
      viewBox={`0 0 ${HEAP_WIDTH} ${heapHeight}`}
      className="heap-graph"
      aria-label="MinHeap state"
    >
      {visibleEntries.map((entry, index) => {
        if (index === 0) {
          return null;
        }

        const parentIndex = Math.floor((index - 1) / 2);
        const parent = visibleEntries[parentIndex];
        if (!parent) {
          return null;
        }

        const parentPoint = getHeapNodePosition(parentIndex, visibleEntries.length);
        const childPoint = getHeapNodePosition(index, visibleEntries.length);
        const linkClassNames = ["heap-link"];

        if (swapIndexSet.has(index) || swapIndexSet.has(parentIndex)) {
          linkClassNames.push("is-swap");
        } else if (activeIndexSet.has(index) || activeIndexSet.has(parentIndex)) {
          linkClassNames.push("is-active");
        }

        return (
          <line
            key={`heap-link-${index}`}
            className={linkClassNames.join(" ")}
            x1={parentPoint.x}
            y1={parentPoint.y}
            x2={childPoint.x}
            y2={childPoint.y}
          />
        );
      })}

      {visibleEntries.map((entry, index) => {
        const point = getHeapNodePosition(index, visibleEntries.length);
        const classNames = ["heap-node"];

        if (index === 0) {
          classNames.push("is-root");
        }
        if (activeIndexSet.has(index)) {
          classNames.push("is-active");
        }
        if (swapIndexSet.has(index)) {
          classNames.push("is-swap");
        }

        return (
          <g
            key={`heap-node-${entry.node}-${index}`}
            className={classNames.join(" ")}
            transform={`translate(${point.x}, ${point.y})`}
          >
            <circle r={HEAP_NODE_RADIUS} />
            <text className="heap-node-label" y="-18">
              {getNodeShortLabel(entry.node)}
            </text>
            <text className="heap-node-distance" y="26">
              {formatDistance(entry.distance)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function DijkstraDemo() {
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedTarget, setSelectedTarget] = useState(DEFAULT_TARGET);
  const [isPlaying, setIsPlaying] = useState(false);
  const [heapFrameIndex, setHeapFrameIndex] = useState(0);
  const maxStepIndex = RE9_TRACE.steps.length - 1;
  const currentStep = RE9_TRACE.steps[stepIndex] ?? RE9_TRACE.steps[maxStepIndex]!;
  const currentHeapOperation = currentStep.heapOperation;

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    if (stepIndex >= maxStepIndex) {
      setIsPlaying(false);
      return;
    }

    const timerId = window.setTimeout(() => {
      setStepIndex((value) => Math.min(value + 1, maxStepIndex));
    }, PLAYBACK_DELAY_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [isPlaying, maxStepIndex, stepIndex]);

  useEffect(() => {
    setHeapFrameIndex(0);
  }, [stepIndex]);

  const currentPath = useMemo(() => {
    return getKnownPath(currentStep, selectedTarget);
  }, [currentStep, selectedTarget]);

  const finalPath = useMemo(() => {
    return getKnownPath(RE9_TRACE, selectedTarget);
  }, [selectedTarget]);

  const currentPathEdges = useMemo(() => toEdgeKeySet(currentPath), [currentPath]);
  const inspectedEdgeKey =
    currentStep.current !== undefined && currentStep.neighbor !== undefined
      ? getEdgeKey(currentStep.current, currentStep.neighbor)
      : null;

  const togglePlayback = () => {
    if (stepIndex >= maxStepIndex) {
      setStepIndex(0);
      setIsPlaying(true);
      return;
    }

    setIsPlaying((value) => !value);
  };

  const jumpToStep = (nextStep: number) => {
    setIsPlaying(false);
    setStepIndex(Math.min(Math.max(nextStep, 0), maxStepIndex));
  };

  const heapFrames = currentHeapOperation?.frames ?? [];
  const hasHeapControls = heapFrames.length > 1;
  const currentHeapFrame: DijkstraTraceHeapFrame | undefined = heapFrames[heapFrameIndex];
  const displayedHeapEntries = currentHeapFrame?.heap ?? currentStep.heap;
  const displayedHeapActiveIndices = currentHeapFrame?.activeIndices ?? [];
  const displayedHeapSwapIndices = currentHeapFrame?.swapIndices ?? [];

  return (
    <section className="dijkstra-page">
      <div className="dijkstra-hero">
        <div>
          <p className="eyebrow">Algorithm Visualizer</p>
          <h2>Dijkstra Step Trace</h2>
          <p className="dijkstra-intro">
            This replay runs against the original <code>re9UndirectedEdges</code> dataset and
            overlays the live shortest-path state on the Rhodes Hill graph.
          </p>
        </div>

        <div className="dijkstra-summary">
          <div>
            <span className="summary-label">Source</span>
            <strong>{getNodeLabel(re9Source)}</strong>
          </div>
          <div>
            <span className="summary-label">Target</span>
            <strong>{getNodeLabel(selectedTarget)}</strong>
          </div>
          <div>
            <span className="summary-label">Nearest target</span>
            <strong>
              {NEAREST_TARGET_RESULT
                ? `${getNodeLabel(NEAREST_TARGET_RESULT.target)} (${formatDistance(NEAREST_TARGET_RESULT.distance)})`
                : "n/a"}
            </strong>
          </div>
        </div>
      </div>

      <div className="dijkstra-toolbar">
        <label className="target-select">
          <span className="summary-label">Trace target</span>
          <select
            value={selectedTarget}
            onChange={(event) => setSelectedTarget(Number(event.currentTarget.value))}
          >
            {re9Targets.map((target) => (
              <option key={target} value={target}>
                {getNodeLabel(target)}
              </option>
            ))}
          </select>
        </label>

        <div className="dijkstra-actions">
          <button type="button" onClick={() => jumpToStep(0)}>
            Reset
          </button>
          <button type="button" onClick={() => jumpToStep(stepIndex - 1)} disabled={stepIndex <= 0}>
            Prev
          </button>
          <button type="button" className="primary-button" onClick={togglePlayback}>
            {isPlaying ? "Pause" : stepIndex >= maxStepIndex ? "Replay" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => jumpToStep(stepIndex + 1)}
            disabled={stepIndex >= maxStepIndex}
          >
            Next
          </button>
          <button type="button" onClick={() => jumpToStep(maxStepIndex)}>
            Finish
          </button>
        </div>
      </div>

      <label className="dijkstra-step-slider">
        <span>
          Timeline: {stepIndex + 1} / {RE9_TRACE.steps.length}
        </span>
        <input
          type="range"
          min={0}
          max={maxStepIndex}
          value={stepIndex}
          onChange={(event) => jumpToStep(Number(event.currentTarget.value))}
        />
      </label>

      <div className="dijkstra-layout">
        <section className="dijkstra-panel dijkstra-map-panel">
          <div className="dijkstra-graph-header">
            <div>
              <span className="phase-badge">{PHASE_LABELS[currentStep.phase]}</span>
              <p className="dijkstra-message">{getStepMessage(currentStep)}</p>
            </div>
            <Link href="/" className="ghost-link">
              Back to Pokemon
            </Link>
          </div>

          <svg
            viewBox={`${GRAPH_VIEWBOX.minX} ${GRAPH_VIEWBOX.minY} ${GRAPH_VIEWBOX.width} ${GRAPH_VIEWBOX.height}`}
            className="dijkstra-graph re9-graph"
            aria-label="RE9 graph"
          >
            {re9UndirectedEdges.map(([from, to, weight]) => {
              const sourcePoint = re9NodePositions[from];
              const targetPoint = re9NodePositions[to];

              if (!sourcePoint || !targetPoint) {
                return null;
              }

              const edgeKey = getEdgeKey(from, to);
              const edgeClassNames = ["dijkstra-edge"];

              if (currentPathEdges.has(edgeKey)) {
                edgeClassNames.push("is-path");
              }

              if (inspectedEdgeKey === edgeKey) {
                edgeClassNames.push("is-active");
              }

              if (currentStep.phase === "relax" && inspectedEdgeKey === edgeKey) {
                edgeClassNames.push("is-relaxed");
              }

              return (
                <g key={edgeKey}>
                  <line
                    className={edgeClassNames.join(" ")}
                    x1={sourcePoint[0]}
                    y1={sourcePoint[1]}
                    x2={targetPoint[0]}
                    y2={targetPoint[1]}
                  />
                  {inspectedEdgeKey === edgeKey ? (
                    <text
                      className="dijkstra-edge-label"
                      x={(sourcePoint[0] + targetPoint[0]) / 2}
                      y={(sourcePoint[1] + targetPoint[1]) / 2 - 6}
                    >
                      {formatDistance(weight)}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {re9NodePositions.map(([x, y], nodeId) => (
              <g
                key={nodeId}
                className={getNodeClassNames(nodeId, currentStep, selectedTarget)}
                transform={`translate(${x}, ${y})`}
              >
                <circle
                  r={nodeId === currentStep.current ? 8 : nodeId === selectedTarget ? 6.5 : 5}
                />
                {shouldLabelNode(nodeId, currentStep, selectedTarget) ? (
                  <text className="re9-node-label" x="10" y="-10">
                    {getNodeShortLabel(nodeId)}
                  </text>
                ) : null}
              </g>
            ))}
          </svg>

          <div className="dijkstra-legend">
            <span>
              <i className="legend-swatch current-node" />
              current queue pop
            </span>
            <span>
              <i className="legend-swatch relaxed-edge" />
              successful relaxation
            </span>
            <span>
              <i className="legend-swatch path-edge" />
              current best route to target
            </span>
            <span>
              <i className="legend-swatch settled-node" />
              settled node
            </span>
          </div>
        </section>

        <div className="dijkstra-side-panel">
          <div className="dijkstra-side-row">
            <section className="dijkstra-panel route-summary-panel">
              <h3>Route Reconstruction</h3>
              <div className="meta-grid">
                <div className="meta-card">
                  <span className="summary-label">Current best</span>
                  <strong>{describePath(currentPath, currentStep.dist, selectedTarget)}</strong>
                </div>
                <div className="meta-card">
                  <span className="summary-label">Final shortest route</span>
                  <strong>{describePath(finalPath, RE9_TRACE.dist, selectedTarget)}</strong>
                </div>
              </div>
              <p className="trace-note">
                <code>prev[]</code> still points backward from the target. The highlighted route is
                the reversed pointer chain for the currently selected target.
              </p>
            </section>

            <section className="dijkstra-panel heap-panel">
              <div className="dijkstra-graph-header">
                <div>
                  <h3>MinHeap State</h3>
                  <p className="dijkstra-message">
                    This is the real heap array behind the priority queue. The root is the next
                    candidate pop, and the tree layout mirrors array indices.
                  </p>
                </div>
                <div className="heap-panel-actions">
                  <div className="meta-card heap-summary">
                    <span className="summary-label">Heap size</span>
                    <strong>{displayedHeapEntries.length}</strong>
                  </div>
                  <div className="heap-controls">
                    <button
                      type="button"
                      onClick={() => setHeapFrameIndex((value) => Math.max(value - 1, 0))}
                      disabled={!hasHeapControls || heapFrameIndex <= 0}
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setHeapFrameIndex((value) => Math.min(value + 1, heapFrames.length - 1))
                      }
                      disabled={!hasHeapControls || heapFrameIndex >= heapFrames.length - 1}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>

              {currentHeapOperation ? (
                <p className="heap-frame-meta">
                  {currentHeapOperation.kind.toUpperCase()} step {heapFrameIndex + 1} /{" "}
                  {currentHeapOperation.frames.length}: {currentHeapFrame?.message}
                </p>
              ) : (
                <p className="heap-frame-meta">No heap movement on this Dijkstra step.</p>
              )}

              {renderHeapTree(
                displayedHeapEntries,
                displayedHeapActiveIndices,
                displayedHeapSwapIndices,
              )}
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
