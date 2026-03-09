import { getPath } from "@/dataFetchers/re9Graph";
import { graph } from "@/dataFetchers/simpleGraph";

const result = getPath(graph, 0, 2);
console.log(result);
