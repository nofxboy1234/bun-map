const MAPS = [
  {
    id: "tokyo-sprawl",
    name: "Tokyo Special Division 4",
    width: 6,
    height: 4,
  },
  {
    id: "church-sector",
    name: "Chainsaw Man Church District",
    width: 5,
    height: 5,
  },
  {
    id: "hell-gate",
    name: "Hell Gate Access Zone",
    width: 7,
    height: 3,
  },
] as const;

const DEVIL_NAMES = [
  "Bat Devil",
  "Leech Devil",
  "Ghost Devil",
  "Snake Devil",
  "Eternity Devil",
  "Katana Fiend",
  "Bomb Hybrid",
  "Falling Devil",
  "Zombie Devil",
  "Typhoon Devil",
] as const;

export type MapPreset = {
  id: string;
  name: string;
};

export type MapNode = {
  id: string;
  x: number;
  y: number;
};

export type MapEdge = {
  from: string;
  to: string;
  distance: number;
};

export type DevilTarget = {
  id: string;
  name: string;
  nodeId: string;
};

export type MapSession = {
  mapId: string;
  mapName: string;
  seed: number;
  hunterNodeId: string;
  nodes: MapNode[];
  edges: MapEdge[];
  devils: DevilTarget[];
};

function seedFromString(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

function createRng(seed: number) {
  let state = seed;

  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickDistinctNodeIds(
  rng: () => number,
  nodes: MapNode[],
  count: number,
  exclude: string[],
) {
  const excluded = new Set(exclude);
  const pool = nodes.filter((node) => !excluded.has(node.id));
  const picks: string[] = [];

  while (picks.length < count && pool.length > 0) {
    const index = Math.floor(rng() * pool.length);
    const [selected] = pool.splice(index, 1);

    if (selected) {
      picks.push(selected.id);
    }
  }

  return picks;
}

function hasEdge(edges: MapEdge[], from: string, to: string) {
  return edges.some((edge) => {
    return (edge.from === from && edge.to === to) || (edge.from === to && edge.to === from);
  });
}

function getNodeId(x: number, y: number) {
  return `n-${x}-${y}`;
}

function getDistance(fromX: number, fromY: number, toX: number, toY: number) {
  const dx = fromX - toX;
  const dy = fromY - toY;
  return Number(Math.sqrt(dx * dx + dy * dy).toFixed(2));
}

export function listMapPresets(): MapPreset[] {
  return MAPS.map((item) => ({ id: item.id, name: item.name }));
}

export function createMapSession(mapId: string, identityKey: string): MapSession {
  const preset = MAPS.find((item) => item.id === mapId) ?? MAPS[0];
  const nowMinuteBucket = Math.floor(Date.now() / 30_000);
  const seed = seedFromString(`${preset.id}-${identityKey}-${nowMinuteBucket}`);
  const rng = createRng(seed);

  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];

  for (let y = 0; y < preset.height; y++) {
    for (let x = 0; x < preset.width; x++) {
      nodes.push({ id: getNodeId(x, y), x, y });
    }
  }

  for (let y = 0; y < preset.height; y++) {
    for (let x = 0; x < preset.width; x++) {
      const fromId = getNodeId(x, y);

      if (x < preset.width - 1) {
        const toId = getNodeId(x + 1, y);
        edges.push({
          from: fromId,
          to: toId,
          distance: getDistance(x, y, x + 1, y),
        });
      }

      if (y < preset.height - 1) {
        const toId = getNodeId(x, y + 1);
        edges.push({
          from: fromId,
          to: toId,
          distance: getDistance(x, y, x, y + 1),
        });
      }
    }
  }

  const extraLinks = Math.max(2, Math.floor((preset.width * preset.height) / 5));

  for (let i = 0; i < extraLinks; i++) {
    const a = nodes[Math.floor(rng() * nodes.length)];
    const b = nodes[Math.floor(rng() * nodes.length)];

    if (!a || !b || a.id === b.id || hasEdge(edges, a.id, b.id)) {
      continue;
    }

    edges.push({
      from: a.id,
      to: b.id,
      distance: getDistance(a.x, a.y, b.x, b.y),
    });
  }

  const hunterNodeId = nodes[Math.floor(rng() * nodes.length)]?.id ?? nodes[0]!.id;
  const devilNodeIds = pickDistinctNodeIds(rng, nodes, 3, [hunterNodeId]);

  const devils: DevilTarget[] = devilNodeIds.map((nodeId, index) => ({
    id: `devil-${index + 1}`,
    name: DEVIL_NAMES[Math.floor(rng() * DEVIL_NAMES.length)]!,
    nodeId,
  }));

  return {
    mapId: preset.id,
    mapName: preset.name,
    seed,
    hunterNodeId,
    nodes,
    edges,
    devils,
  };
}
