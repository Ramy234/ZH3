// Runs W7's Code nodes outside n8n, exactly as written in n8n/src, so tests and the smoke script exercise the same code.
import { readFileSync } from "node:fs";
import { SPEC, w7src } from "./w7-source.mjs";

const plain = (name) => readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8");

export function runNode(source, input = [{}], refs = {}) {
  const wrap = (arr) => ({ all: () => arr.map((json) => ({ json })), first: () => ({ json: arr[0] }) });
  const $ = (name) => {
    if (!(name in refs)) throw new Error(`no reference to ${name}`);
    return wrap(refs[name]);
  };
  return new Function("$input", "$", `return (function(){${source}})()`)(wrap(input), $).map((i) => i.json);
}

/** The steps before the Jev call. Throws like the workflow does when the input is refused (the 400 path). */
export function prepare(words) {
  const checked = runNode(plain("w6-input.js"), [{ body: { words } }]);
  const scrubbed = runNode(w7src("w7-scrub.js"), checked);
  const ruled = runNode(plain("w6-rules.js"), scrubbed);
  const built = runNode(w7src("w7-build.js"), ruled);
  return { checked, scrubbed, ruled, built };
}

/** The step after the call. `jev` is the raw Jev response, or null when the call was off or failed. */
export function decide(prepared, jev) {
  return runNode(w7src("w7-decide.js"), [jev ?? {}], { Rules: prepared.ruled, Scrub: prepared.scrubbed })[0];
}

/** One real call to Jev. The key is passed in by the caller and never stored. */
export async function callJev(request, key, fetchImpl = fetch) {
  const t0 = Date.now();
  const res = await fetchImpl("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(15000),
  });
  const ms = Date.now() - t0;
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, ms });
  return { body: await res.json(), ms };
}

export { SPEC };
