import { similarity, normalize } from "./nlp.js";

const STORAGE_KEY = "guinho-memory-v7";
const MAX_FACTS = 500;
const MAX_HISTORY = 100;
const MAX_LEARNED = 300;

function normalizeFact(value) {
  return normalize(value);
}

class Memory {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (value && Array.isArray(value.facts) && Array.isArray(value.history)) {
        return {
          facts: value.facts.map(normalizeFact).filter(Boolean).slice(-MAX_FACTS),
          history: value.history
            .filter((item) => item && (item.role === "user" || item.role === "bot"))
            .map((item) => ({
              role: item.role,
              text: String(item.text ?? ""),
              at: Number(item.at) || Date.now()
            }))
            .slice(-MAX_HISTORY),
          learned: Array.isArray(value.learned)
            ? value.learned
                .filter((item) => item && item.pattern && Array.isArray(item.responses))
                .map((item) => ({
                  pattern: normalizeFact(item.pattern),
                  responses: item.responses.map(String).filter(Boolean)
                }))
                .filter((item) => item.pattern && item.responses.length)
                .slice(-MAX_LEARNED)
            : []
        };
      }
    } catch {}

    return { facts: [], history: [], learned: [] };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {}
  }

  remember(value) {
    const fact = normalizeFact(value);
    if (!fact) return false;

    if (!this.data.facts.includes(fact)) {
      this.data.facts.push(fact);
      this.data.facts = this.data.facts.slice(-MAX_FACTS);
      this.save();
    }

    return true;
  }

  learn(pattern, response) {
    const normalizedPattern = normalizeFact(pattern);
    const answer = String(response ?? "").trim();
    if (!normalizedPattern || !answer) return false;

    const existing = this.data.learned.find((item) => item.pattern === normalizedPattern);
    if (existing) {
      if (!existing.responses.includes(answer)) existing.responses.push(answer);
    } else {
      this.data.learned.push({ pattern: normalizedPattern, responses: [answer] });
    }

    this.data.learned = this.data.learned.slice(-MAX_LEARNED);
    this.save();
    return true;
  }

  findLearned(input) {
    let best = null;

    for (const item of this.data.learned) {
      const score = similarity(input, item.pattern);
      if (!best || score > best.score) best = { item, score };
    }

    return best && best.score >= 0.72 ? best : null;
  }

  remove(value) {
    const target = normalizeFact(value);
    this.data.facts = this.data.facts.filter((item) => item !== target);
    this.save();
  }

  recall() {
    return [...this.data.facts];
  }

  learnedRules() {
    return this.data.learned.map((item) => ({
      pattern: item.pattern,
      responses: [...item.responses]
    }));
  }

  addHistory(role, text) {
    this.data.history.push({
      role,
      text: String(text ?? ""),
      at: Date.now()
    });

    this.data.history = this.data.history.slice(-MAX_HISTORY);
    this.save();
  }

  clear() {
    this.data = { facts: [], history: [], learned: [] };
    this.save();
  }

  snapshot() {
    return {
      format: "guinho-memory",
      version: 4,
      exportedAt: new Date().toISOString(),
      facts: [...this.data.facts],
      learned: this.learnedRules(),
      history: [...this.data.history]
    };
  }

  import(snapshot) {
    if (
      !snapshot ||
      snapshot.format !== "guinho-memory" ||
      !Array.isArray(snapshot.facts) ||
      !Array.isArray(snapshot.history)
    ) {
      throw new Error("Arquivo de memória inválido.");
    }

    this.data = {
      facts: snapshot.facts.map(normalizeFact).filter(Boolean).slice(-MAX_FACTS),
      learned: Array.isArray(snapshot.learned)
        ? snapshot.learned
            .filter((item) => item && item.pattern && Array.isArray(item.responses))
            .map((item) => ({
              pattern: normalizeFact(item.pattern),
              responses: item.responses.map(String).filter(Boolean)
            }))
            .filter((item) => item.pattern && item.responses.length)
            .slice(-MAX_LEARNED)
        : [],
      history: snapshot.history
        .filter((item) => item && (item.role === "user" || item.role === "bot"))
        .map((item) => ({
          role: item.role,
          text: String(item.text ?? ""),
          at: Number(item.at) || Date.now()
        }))
        .slice(-MAX_HISTORY)
    };

    this.save();
  }
}

export { Memory, STORAGE_KEY };