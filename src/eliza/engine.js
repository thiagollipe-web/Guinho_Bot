const { matchPattern, normalizeTokens } = require("./pattern-matcher");

function applyReflections(text, reflections = {}) {
  const words = normalizeTokens(text);
  const map = new Map();

  for (const [from, to] of Object.entries(reflections)) {
    const fromWord = normalizeTokens(from)[0];
    const toWord = normalizeTokens(to)[0];
    if (fromWord && toWord) map.set(fromWord, toWord);
  }

  return words.map((word) => map.get(word) || word).join(" ");
}

function choose(items, random = Math.random) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items[Math.floor(random() * items.length)];
}

function fill(template, captures, reflections) {
  if (!template) return "";
  return String(template)
    .replace(/\$(\d+)/g, (_, n) => {
      const index = Number(n) - 1;
      return index >= 0 && index < captures.length ? captures[index] : "";
    })
    .replace(/\{reflect:(\d+)\}/g, (_, n) => {
      const index = Number(n) - 1;
      return index >= 0 && index < captures.length
        ? applyReflections(captures[index], reflections)
        : "";
    })
    .trim();
}

function createEngine(script, options = {}) {
  const random = options.random || Math.random;
  const state = { memory: [] };

  function keywordsFor(input) {
    const normalized = normalizeTokens(input);
    const keywordMap = Array.isArray(script.keywords) ? script.keywords : [];
    return keywordMap
      .filter((entry) => normalized.includes(normalizeTokens(entry.keyword)[0]))
      .sort((a, b) => (Number(b.precedence) || 0) - (Number(a.precedence) || 0));
  }

  function respond(input) {
    const candidates = keywordsFor(input);

    for (const keyword of candidates) {
      for (const rule of Array.isArray(keyword.rules) ? keyword.rules : []) {
        const result = matchPattern(rule.decomposition, input, script.groups || {});
        if (!result.matched) continue;

        if (rule.memory === true && result.captures[0]) state.memory.push(result.captures[0]);

        const response = fill(choose(rule.reassembly, random), result.captures, script.reflections || {});
        if (response) return { response, source: "eliza", keyword: keyword.keyword };
      }
    }

    const remembered = state.memory.shift();
    if (remembered) return { response: remembered, source: "memory" };

    return { response: choose(script.default || [], random) || "não tenho uma resposta para isso ainda.", source: "fallback" };
  }

  return { respond, state };
}

module.exports = { createEngine, applyReflections, fill };