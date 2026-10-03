// Code-node sources for W7 with the closed question list written in. The list lives once, in
// src/lib/navigator/classifier-spec.json; the workflow builder, the smoke test and the tests all load it here.
import { readFileSync } from "node:fs";

export const SPEC = JSON.parse(readFileSync(new URL("../../src/lib/navigator/classifier-spec.json", import.meta.url), "utf8"));
const read = (name) => readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8");
export const w7src = (name) => read(name).replace("__SPEC__", JSON.stringify(SPEC));
