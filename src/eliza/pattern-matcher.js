function normalizeTokens(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s*#\[\]@]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function tokenPattern(token) {
  if (token === "*") return { type: "wildcard" };

  const exact = token.match(/^#(\d+)$/);
  if (exact) return { type: "count", count: Number(exact[1]) };

  const alternatives = token.match(/^\[([^\]]+)\]$/);
  if (alternatives) {
    return {
      type: "alternatives",
      values: alternatives[1].split(/\s+/).flatMap(normalizeTokens)
    };
  }

  const group = token.match(/^@(.+)$/);
  if (group) return { type: "group", name: group[1] };

  return { type: "literal", value: normalizeTokens(token)[0] };
}

function matchPattern(pattern, input, groups = {}) {
  const parts = normalizeTokens(pattern).map(tokenPattern);
  const words = normalizeTokens(input);

  function walk(pi, wi, captures) {
    if (pi >= parts.length) return wi === words.length ? captures : null;

    const part = parts[pi];

    if (part.type === "wildcard") {
      for (let end = wi; end <= words.length; end += 1) {
        const result = walk(pi + 1, end, [
          ...captures,
          words.slice(wi, end).join(" ")
        ]);
        if (result) return result;
      }
      return null;
    }

    if (part.type === "count") {
      const end = wi + part.count;
      if (end > words.length) return null;
      return walk(pi + 1, end, [
        ...captures,
        words.slice(wi, end).join(" ")
      ]);
    }

    if (wi >= words.length) return null;

    const word = words[wi];

    if (part.type === "literal" && word !== part.value) return null;

    if (part.type === "alternatives" && !part.values.includes(word)) return null;

    if (part.type === "group") {
      const members = Array.isArray(groups[part.name])
        ? groups[part.name].flatMap(normalizeTokens)
        : [];

      if (!members.includes(word)) return null;
    }

    return walk(pi + 1, wi + 1, captures);
  }

  const result = walk(0, 0, []);
  return result
    ? { matched: true, captures: result }
    : { matched: false, captures: [] };
}

export { matchPattern, normalizeTokens };
