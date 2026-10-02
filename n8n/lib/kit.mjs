// Shared pieces for the n8n workflow builders (W1, W3, W4, W5). W2 and the live-synced draft keep their own files.
// A builder only says which nodes exist and how they connect. Names, ids, credentials and safety defaults live here once.
import { readFileSync } from "node:fs";

export const PG = { postgres: { id: "Tj1nxebs0zLxWTBj", name: "bev Postgres" } };
export const src = (name) => readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8");

// A table name may only come from the allowed pair. The real table is chosen only after a test insert worked.
export function pickTable(value, real, test) {
  const t = value || test;
  if (t !== real && t !== test) throw new Error(`table must be ${real} or ${test}`);
  return t;
}

export function node(name, type, typeVersion, position, parameters = {}, extra = {}) {
  return { parameters, id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, type: `n8n-nodes-base.${type}`, typeVersion, position, ...extra };
}
export const note = (text, position, width = 460, height = 360) => node("Read first", "stickyNote", 1, position, { content: text, width, height });
export const code = (name, jsCode, position, extra) => node(name, "code", 2, position, { jsCode }, extra);
export const postgres = (name, query, position, { replacement, off = false, always = false } = {}) =>
  node(name, "postgres", 2.5, position, { operation: "executeQuery", query, options: replacement ? { queryReplacement: replacement } : {} }, {
    credentials: PG,
    ...(off ? { disabled: true } : {}),
    ...(always ? { alwaysOutputData: true } : {}),
  });
export const noop = (name, position) => node(name, "noOp", 1, position);

// connect("A", "B") or connect("A", "B", 1) for the second output. Several targets per output are allowed.
export function wire(pairs) {
  const connections = {};
  for (const [from, to, out = 0] of pairs) {
    const c = (connections[from] ??= { main: [] });
    while (c.main.length <= out) c.main.push([]);
    c.main[out].push({ node: to, type: "main", index: 0 });
  }
  return connections;
}

// Every workflow starts inactive and keeps no successful execution data (payloads must not outlive the run).
export function workflow(name, nodes, pairs) {
  const names = new Set(nodes.map((n) => n.name));
  for (const [a, b] of pairs) if (!names.has(a) || !names.has(b)) throw new Error(`connection to a missing node: ${a} -> ${b}`);
  return { name, active: false, settings: { executionOrder: "v1", saveDataSuccessExecution: "none" }, nodes, connections: wire(pairs) };
}
