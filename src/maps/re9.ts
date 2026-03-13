import { buildRe9Graph, getPath } from "@/dataFetchers/re9Graph";

const graph = buildRe9Graph();
const result = getPath(graph, 126, 105);
console.log(result);
