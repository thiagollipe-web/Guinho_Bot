function normalize(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function createKnowledgeTool(data) {
  const concepts = Array.isArray(data?.concepts) ? data.concepts : [];

  return {
    find(query) {
      const q = normalize(query);
      const words = new Set(q.split(" ").filter(Boolean));

      let best = null;
      for (const concept of concepts) {
        const terms = [
          concept.title,
          ...(concept.aliases || []),
          ...(concept.keywords || [])
        ].flatMap((value) => normalize(value).split(" "));

        let score = 0;
        for (const term of terms) {
          if (words.has(term)) score += 1;
        }

        if (!best || score > best.score) best = { concept, score };
      }

      return best && best.score > 0 ? best.concept : null;
    }
  };
}
