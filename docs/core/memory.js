const STORAGE_KEY = "guinho-memory-v6";
const MAX_FACTS = 500;
const MAX_HISTORY = 100;

function normalizeFact(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

class Memory {
  constructor() { this.data = this.load(); }

  load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (value && Array.isArray(value.facts) && Array.isArray(value.history)) {
        return {
          facts: value.facts.map(normalizeFact).filter(Boolean).slice(-MAX_FACTS),
          history: value.history.filter((item) => item && (item.role === "user" || item.role === "bot"))
            .map((item) => ({ role: item.role, text: String(item.text ?? ""), at: Number(item.at) || Date.now() }))
            .slice(-MAX_HISTORY)
        };
      }
    } catch {}
    return { facts: [], history: [] };
  }

  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch {}
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

  remove(value) {
    const target = normalizeFact(value);
    this.data.facts = this.data.facts.filter((item) => item !== target);
    this.save();
  }

  recall() { return [...this.data.facts]; }

  addHistory(role, text) {
    this.data.history.push({ role, text: String(text ?? ""), at: Date.now() });
    this.data.history = this.data.history.slice(-MAX_HISTORY);
    this.save();
  }

  clear() {
    this.data = { facts: [], history: [] };
    this.save();
  }

  snapshot() {
    return { format: "guinho-memory", version: 3, exportedAt: new Date().toISOString(), facts: [...this.data.facts], history: [...this.data.history] };
  }

  import(snapshot) {
    if (!snapshot || snapshot.format !== "guinho-memory" || !Array.isArray(snapshot.facts) || !Array.isArray(snapshot.history)) {
      throw new Error("Arquivo de memória inválido.");
    }
    this.data = {
      facts: snapshot.facts.map(normalizeFact).filter(Boolean).slice(-MAX_FACTS),
      history: snapshot.history.filter((item) => item && (item.role === "user" || item.role === "bot"))
        .map((item) => ({ role: item.role, text: String(item.text ?? ""), at: Number(item.at) || Date.now() }))
        .slice(-MAX_HISTORY)
    };
    this.save();
  }
}

export { Memory, STORAGE_KEY };