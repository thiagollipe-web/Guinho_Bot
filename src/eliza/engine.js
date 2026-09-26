import { matchPattern, normalizeTokens } from "./pattern-matcher.js";

function applyReflections(text, reflections = {}) {
  return normalizeTokens(text)
    .map((word) => {
      for (const [from, to] of Object.entries(reflections)) {
        if (normalizeTokens(from)[0] === word) {
          return normalizeTokens(to)[0];
        }
      }
      return word;
    })
    .join(" ");
}

function choose(items, random = Math.random) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items[Math.floor(random() * items.length)];
}

function fill(template, captures, reflections = {}) {
  if (!template) return "";

  return String(template)
    .replace(/\$(\d+)/g, (_, n) => captures[Number(n) - 1] || "")
    .replace(/\{reflect:(\d+)\}/g, (_, n) =>
      applyReflections(captures[Number(n) - 1] || "", reflections)
    )
    .trim();
}

function createEngine(script, options = {}) {
  const random = options.random || Math.random;
  const state = { memory: [], context: null };

  function keywordsFor(input) {
    const normalized = normalizeTokens(input);
    return (script.keywords || [])
      .filter((entry) => normalized.includes(normalizeTokens(entry.keyword)[0]))
      .sort((a, b) => (Number(b.precedence) || 0) - (Number(a.precedence) || 0));
  }

  function respond(input) {
    const candidates = keywordsFor(input);

    for (const keyword of candidates) {
      for (const rule of keyword.rules || []) {
        const result = matchPattern(rule.decomposition, input, script.groups || {});
        if (!result.matched) continue;

        if (rule.memory === true && result.captures[0]) {
          state.memory.push(result.captures[0]);
        }

        const response = fill(
          choose(rule.reassembly, random),
          result.captures,
          script.reflections || {}
        );

        if (response) {
          state.context = keyword.keyword;
          return {
            response,
            source: "eliza",
            intent: keyword.intent || keyword.keyword,
            keyword: keyword.keyword
          };
        }
      }
    }

    const remembered = state.memory.shift();
    if (remembered) {
      return { response: remembered, source: "memory", intent: "memory" };
    }

    return {
      response: choose(script.default || [], random) || "não entendi.",
      source: "fallback",
      intent: "fallback"
    };
  }

  return { respond, state };
}

export { createEngine, applyReflections, fill };
