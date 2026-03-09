import {
  buildRe9Graph,
  // findNearestRe9TargetPath,
  getPath,
  re9Source,
} from "@/dataFetchers/re9Graph";

const graph = buildRe9Graph();

// const nearest = findNearestRe9TargetPath(graph);
// console.log(nearest);

const result = getPath(graph, re9Source, 105);
console.log(result);
