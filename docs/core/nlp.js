const STOPWORDS = new Set([
  "a","o","as","os","um","uma","uns","umas","de","do","da","dos","das",
  "e","é","em","no","na","nos","nas","por","para","com","sem","que","se",
  "ao","aos","à","às","eu","tu","ele","ela","nós","vocês","meu","minha",
  "seu","sua","isso","isto","esse","essa","esses","essas","aquele","aquela",
  "como","qual","quais","quem","onde","quando","porque","porquê"
]);

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  const text = normalize(value);
  return text ? text.split(" ") : [];
}

function contentTokens(value) {
  return tokens(value).filter((token) => !STOPWORDS.has(token) && token.length > 1);
}

function jaccard(a, b) {
  const A = new Set(contentTokens(a));
  const B = new Set(contentTokens(b));
  if (!A.size || !B.size) return 0;
  let common = 0;
  for (const word of A) if (B.has(word)) common++;
  return common / new Set([...A, ...B]).size;
}

function scoreText(query, example) {
  const q = contentTokens(query);
  const e = contentTokens(example);
  if (!q.length || !e.length) return 0;

  const exact = jaccard(query, example);
  const overlapCount = q.filter((word) =>
    e.some((candidate) => candidate.startsWith(word) || word.startsWith(candidate))
  ).length;
  const overlap = overlapCount / Math.max(q.length, e.length);

  return Math.min(1, exact * 0.7 + overlap * 0.3);
}

function extractEntities(text) {
  const original = String(text ?? "");
  const normalized = normalize(original);
  const entities = [];

  const quoted = original.match(/["“”'‘’]([^"“”'‘’]{2,80})["“”'‘’]/);
  if (quoted) entities.push({ type: "obra_ou_topico", value: quoted[1].trim() });

  const currency = normalized.match(/\b(dolar|dolares|usd|euro|euros|eur|libra|libras|gbp|bitcoin|btc)\b/);
  if (currency) entities.push({ type: "moeda", value: currency[1].toUpperCase() });

  const technologies = [
    "javascript","typescript","python","html","css","node","nodejs",
    "github","git","pwa","java","c","c++","c#","rust","php"
  ];

  for (const technology of technologies) {
    if (normalized.includes(technology)) {
      entities.push({ type: "tecnologia", value: technology });
    }
  }

  const about = normalized.match(/\b(?:sobre|acerca de|a respeito de|o que e|quem e)\s+(.{2,80})$/);
  if (about) entities.push({ type: "topico", value: about[1].trim() });

  const person = original.match(
    /\b(?:o nome e|meu nome e|eu me chamo|me chamo)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ '-]{1,60})/i
  );
  if (person) entities.push({ type: "pessoa", value: person[1].trim() });

  const seen = new Set();
  return entities.filter((entity) => {
    const key = entity.type + ":" + entity.value;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function detectIntents(text, training) {
  const intents = Array.isArray(training?.intents) ? training.intents : [];
  const results = [];

  for (const intent of intents) {
    let best = 0;
    for (const example of intent.examples || []) {
      best = Math.max(best, scoreText(text, example));
    }
    if (best > 0) {
      results.push({
        name: intent.name,
        score: best,
        responses: Array.isArray(intent.responses) ? intent.responses : []
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export {
  STOPWORDS,
  normalize,
  tokens,
  contentTokens,
  jaccard,
  scoreText,
  extractEntities,
  detectIntents
};
