import { buildRe9Graph, findNearestRe9TargetPath } from "@/dataFetchers/re9Graph";

const graph = buildRe9Graph();
const nearest = findNearestRe9TargetPath(graph);

console.log(nearest);
