import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEngine } from "./eliza/engine.js";

const here = path.dirname(fileURLToPath(import.meta.url));

function loadScript(filePath = path.join(here, "../scripts/guinho.json")) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function createGuinho(options = {}) {
  const script = options.script || loadScript(options.scriptPath);
  return {
    script,
    engine: createEngine(script, options)
  };
}

export { createGuinho, loadScript };
