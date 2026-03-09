import { getPath } from "@/dataFetchers/re9Graph";
import { graph } from "@/dataFetchers/simpleGraph";

let result;

result = getPath(graph, 0, 2);
console.log(result);

result = getPath(graph, 2, 0);
console.log(result);

result = getPath(graph, 2, 2);
console.log(result);
