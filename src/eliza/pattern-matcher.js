function escapeRegex(value) {
  return value.replace(/[.*+?^()|[\]\\]/g, "\\$&");
}

function normalizeTokens(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function tokenPattern(token) {
  if (token === "*") return { type: "wildcard" };
  const exact = token.match(/^#(\d+)$/);
  if (exact) return { type: "count", count: Number(exact[1]) };
  const alternatives = token.match(/^\[([^\]]+)\]$/);
  if (alternatives) return { type: "alternatives", values: alternatives[1].split(/\s+/).map(normalizeTokens).flat() };
  const group = token.match(/^@(.+)$/);
  if (group) return { type: "group", name: group[1] };
  return { type: "literal", value: normalizeTokens(token)[0] };
}

function matchPattern(pattern, input, groups = {}) {
  const p = String(pattern ?? "").trim().split(/\s+/).filter(Boolean).map(tokenPattern);
  const words = normalizeTokens(input);
  const captures = [];

  function walk(pi, wi, localCaptures) {
    if (pi >= p.length) return wi === words.length ? localCaptures : null;
    const part = p[pi];

    if (part.type === "wildcard") {
      for (let end = wi; end <= words.length; end += 1) {
        const result = walk(pi + 1, end, [...localCaptures, words.slice(wi, end).join(" ")]);
        if (result) return result;
      }
      return null;
    }

    if (part.type === "count") {
      const end = wi + part.count;
      if (end > words.length) return null;
      return walk(pi + 1, end, [...localCaptures, words.slice(wi, end).join(" ")]);
    }

    if (wi >= words.length) return null;

    const word = words[wi];
    if (part.type === "literal" && word !== part.value) return null;

    if (part.type === "alternatives" && !part.values.includes(word)) return null;

    if (part.type === "group") {
      const members = Array.isArray(groups[part.name]) ? groups[part.name].map((value) => normalizeTokens(value)[0]) : [];
      if (!members.includes(word)) return null;
    }

    return walk(pi + 1, wi + 1, localCaptures);
  }

  const result = walk(0, 0, captures);
  return result ? { matched: true, captures: result } : { matched: false, captures: [] };
}

module.exports = { matchPattern, normalizeTokens };