import type { Edge } from "@/utils/graphTypes";

export const graph: Edge[][] = [
  [
    { to: 1, weight: 2 },
    { to: 2, weight: 5 },
  ],
  [
    { to: 0, weight: 2 },
    { to: 2, weight: 1 },
  ],
  [
    { to: 0, weight: 5 },
    { to: 1, weight: 1 },
  ],
];
