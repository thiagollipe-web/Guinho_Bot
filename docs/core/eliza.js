import { normalize, tokens } from "./nlp.js";

function choose(items, random = Math.random) {
  if (!Array.isArray(items) || !items.length) return "";
  return items[Math.floor(random() * items.length)] || "";
}

function patternTokens(pattern) {
  return String(pattern ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/\*|#\d+|@[\p{L}\p{N}_-]+|\[[^\]]+\]|[\p{L}\p{N}_-]+/gu) || [];
}

function matchPattern(pattern, input, groups = {}) {
  const parts = patternTokens(pattern);
  const words = tokens(input);

  function walk(pi, wi, current) {
    if (pi >= parts.length) return wi === words.length ? current : null;

    const part = parts[pi];

    if (part === "*") {
      for (let end = wi; end <= words.length; end += 1) {
        const result = walk(pi + 1, end, [
          ...current,
          words.slice(wi, end).join(" ")
        ]);
        if (result) return result;
      }
      return null;
    }

    if (part.startsWith("@")) {
      const members = Array.isArray(groups[part.slice(1)])
        ? groups[part.slice(1)].flatMap((value) => tokens(value))
        : [];
      if (!members.includes(words[wi])) return null;
      return walk(pi + 1, wi + 1, current);
    }

    if (/^#\d+$/.test(part)) {
      const count = Number(part.slice(1));
      const end = wi + count;
      if (end > words.length) return null;
      return walk(pi + 1, end, [
        ...current,
        words.slice(wi, end).join(" ")
      ]);
    }

    const alternatives = part.match(/^\[([^\]]+)\]$/);
    if (alternatives) {
      const values = alternatives[1]
        .split("|")
        .flatMap((value) => tokens(value));
      if (!values.includes(words[wi])) return null;
      return walk(pi + 1, wi + 1, current);
    }

    if (words[wi] !== part) return null;
    return walk(pi + 1, wi + 1, current);
  }

  const captures = walk(0, 0, []);
  return captures
    ? { matched: true, captures }
    : { matched: false, captures: [] };
}

function applyReflections(text, reflections = {}) {
  return tokens(text).map((word) => {
    for (const [from, to] of Object.entries(reflections)) {
      if (normalize(from) === word) return normalize(to);
    }
    return word;
  }).join(" ");
}

function fill(template, captures, reflections = {}) {
  if (!template) return "";

  return String(template)
    .replace(/\$(\d+)/g, (_, number) => captures[Number(number) - 1] || "")
    .replace(/\{reflect:(\d+)\}/g, (_, number) =>
      applyReflections(captures[Number(number) - 1] || "", reflections)
    )
    .trim();
}

function respondWithRules(input, config = {}, random = Math.random) {
  const normalizedWords = tokens(input);
  const keywords = Array.isArray(config.keywords) ? config.keywords : [];

  const ordered = keywords
    .filter((entry) => normalizedWords.includes(normalize(entry.keyword)))
    .sort((a, b) => Number(b.precedence || 0) - Number(a.precedence || 0));

  for (const keyword of ordered) {
    for (const rule of keyword.rules || []) {
      const match = matchPattern(rule.decomposition, input, config.groups || {});
      if (!match.matched) continue;

      const response = fill(
        choose(rule.reassembly, random),
        match.captures,
        config.reflections || {}
      );

      if (response) {
        return {
          response,
          source: "eliza",
          intent: keyword.intent || keyword.keyword,
          keyword: keyword.keyword
        };
      }
    }
  }

  return null;
}

export { choose, patternTokens, matchPattern, applyReflections, fill, respondWithRules };