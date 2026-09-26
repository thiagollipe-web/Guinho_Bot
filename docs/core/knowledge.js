import { scoreText } from "./nlp.js";

function choose(items) {
  if (!Array.isArray(items) || !items.length) return "";
  return items[Math.floor(Math.random() * items.length)] || "";
}

class KnowledgeStore {
  constructor(base, training) {
    this.base = base || { concepts: [] };
    this.training = training || { intents: [] };
  }

  findConcept(query) {
    let best = null;
    for (const concept of this.base.concepts || []) {
      for (const term of [concept.title, ...(concept.aliases || []), ...(concept.keywords || [])]) {
        const score = scoreText(query, term);
        if (!best || score > best.score) best = { concept, score };
      }
    }
    return best && best.score >= 0.45 ? best : null;
  }

  findTraining(query) {
    let best = null;
    for (const intent of this.training.intents || []) {
      for (const example of intent.examples || []) {
        const score = scoreText(query, example);
        if (!best || score > best.score) best = { intent, score };
      }
    }
    return best && best.score >= 0.45 ? best : null;
  }
}

async function loadKnowledge() {
  const [baseResponse, trainingResponse, rulesResponse] = await Promise.all([
    fetch("./knowledge/base.json"),
    fetch("./knowledge/training.json"),
    fetch("./knowledge/rules.json")
  ]);

  if (!baseResponse.ok || !trainingResponse.ok || !rulesResponse.ok) {
    throw new Error("Não foi possível carregar a base de conhecimento.");
  }

  return {
    store: new KnowledgeStore(await baseResponse.json(), await trainingResponse.json()),
    rules: await rulesResponse.json()
  };
}

export { KnowledgeStore, loadKnowledge, choose };