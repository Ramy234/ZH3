// Some script tests check files that only exist in the Grok sandbox this app was built in (the `.grok/` folder).
// Where that folder is absent (a cloud copy, a clean clone) those tests are skipped with a visible reason, not failed.
// They still run, and pass, wherever `.grok/` is present.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const HAS_GROK = existsSync(join(ROOT, ".grok", "app-env.json")) && existsSync(join(ROOT, ".grok", "skills", "og", "SKILL.md"));

/** Options for node:test: `test(name, GROK_ONLY, fn)`. */
export const GROK_ONLY = HAS_GROK ? {} : { skip: "needs the Grok sandbox files (.grok/); not present in this copy" };
