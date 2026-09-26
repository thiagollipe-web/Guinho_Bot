const fs = require("fs");
const path = require("path");
const { createEngine } = require("./eliza/engine");

function loadScript(filePath) {
  const absolute = path.resolve(filePath);
  return JSON.parse(fs.readFileSync(absolute, "utf8"));
}

function createGuinho(options = {}) {
  const scriptPath = options.scriptPath || path.join(__dirname, "../scripts/guinho.json");
  const script = loadScript(scriptPath);
  const engine = createEngine(script, options);
  return { script, engine };
}

module.exports = { createGuinho, loadScript };