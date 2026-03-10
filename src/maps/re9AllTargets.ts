import {
  buildRe9Graph,
  findRe9TargetVisitTour,
  routeAlgorithms,
  type RouteAlgorithm,
} from "@/dataFetchers/re9Graph";

type RouteSummary = {
  algorithm: RouteAlgorithm;
  distance: number;
  elapsedMs: number;
  targetOrder: number[];
  waypointOrder: number[];
  pathLength: number;
};

function isRouteAlgorithm(value: string): value is RouteAlgorithm {
  return routeAlgorithms.includes(value as RouteAlgorithm);
}

function summarizeResult(
  result: NonNullable<ReturnType<typeof findRe9TargetVisitTour>>,
  elapsedMs: number,
): RouteSummary {
  return {
    algorithm: result.algorithm,
    distance: result.distance,
    elapsedMs,
    targetOrder: result.targetOrder,
    waypointOrder: result.waypointOrder,
    pathLength: result.path.length,
  };
}

const requestedMode = process.argv[2];
const shouldCompare = !requestedMode || requestedMode === "compare";

if (requestedMode && !shouldCompare && !isRouteAlgorithm(requestedMode)) {
  throw new Error(
    `Unknown route algorithm "${requestedMode}". Use one of: compare, ${routeAlgorithms.join(", ")}.`,
  );
}

const graph = buildRe9Graph();

if (shouldCompare) {
  const summaries: RouteSummary[] = [];

  for (const algorithm of routeAlgorithms) {
    const startedAt = Date.now();
    const result = findRe9TargetVisitTour(graph, algorithm);
    const elapsedMs = Date.now() - startedAt;

    if (!result) {
      throw new Error(`No route found for algorithm "${algorithm}".`);
    }

    summaries.push(summarizeResult(result, elapsedMs));
  }

  console.log(JSON.stringify(summaries, null, 2));
} else {
  const algorithm = requestedMode as RouteAlgorithm;
  const startedAt = Date.now();
  const result = findRe9TargetVisitTour(graph, algorithm);
  const elapsedMs = Date.now() - startedAt;

  if (!result) {
    throw new Error(`No route found for algorithm "${algorithm}".`);
  }

  console.log(
    JSON.stringify(
      {
        ...result,
        elapsedMs,
      },
      null,
      2,
    ),
  );
}
