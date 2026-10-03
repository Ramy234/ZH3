import { test } from "node:test";
import assert from "node:assert/strict";
import { GLOSSARY } from "./glossary.ts";

test("glossary has unique terms and short plain definitions", () => {
  const terms = GLOSSARY.map((w) => w.term);
  assert.equal(new Set(terms).size, terms.length);
  for (const w of GLOSSARY) {
    assert.ok(w.plain.length > 30 && w.plain.length < 260, w.term);
  }
});

test("glossary covers the words the check uses", () => {
  const all = GLOSSARY.map((w) => w.term.toLowerCase()).join(" ");
  for (const t of ["kwh", "kw", "wallbox", "load management", "battery health", "residual value", "payback"]) assert.ok(all.includes(t), t);
});
