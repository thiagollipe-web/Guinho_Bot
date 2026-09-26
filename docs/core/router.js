import { normalize, extractEntities, detectIntents } from "./nlp.js";
import { respondWithRules } from "./eliza.js";
import { extractCalculation, calculate } from "./calculator.js";

function wantsSource(text) {
  return /\b(fonte|fontes|link|links|referencia|referências)\b/i.test(text);
}

function wantsMemory(text) {
  return /\b(voce lembra|você lembra|lembra de mim|o que voce sabe|o que você sabe|o que voce lembra|o que você lembra|minha memoria|minha memória)\b/i.test(text);
}

function learningValue(text) {
  const clean = normalize(text);
  const match = clean.match(/^(?:lembre|lembrar|guarde|guarda|memorize|memorizar|ensine|ensinar)\s+(?:que\s+)?(.+)$/);
  return match ? match[1].trim() : null;
}

function teachRule(text) {
  const match = String(text).match(
    /^(?:quando eu disser|quando eu falar)\s+["“]?(.+?)["”]?\s*,?\s*(?:responda|diga|responda com)\s+["“]?(.+?)["”]?$/i
  );
  return match ? { pattern: match[1].trim(), response: match[2].trim() } : null;
}

function route(input, { knowledge, memory, rules, references = [] }) {
  const text = String(input ?? "").trim();
  if (!text) return { response: "Digite alguma coisa.", source: "system" };

  if (wantsSource(text)) {
    const last = references.at(-1);
    return {
      response: last?.url ? "Fonte: " + last.url : "Nenhuma fonte foi registrada nesta conversa.",
      source: "reference"
    };
  }

  const taught = teachRule(text);
  if (taught) {
    memory.learn(taught.pattern, taught.response);
    return { response: "Aprendi essa regra.", source: "learning" };
  }

  const learned = memory.findLearned(text);
  if (learned) {
    const responses = learned.item.responses;
    return {
      response: responses[Math.floor(Math.random() * responses.length)] || "Entendi.",
      source: "learned",
      confidence: learned.score
    };
  }

  const fact = learningValue(text);
  if (fact) {
    memory.remember(fact);
    return { response: "Certo. Vou guardar isso.", source: "memory" };
  }

  if (wantsMemory(text)) {
    const facts = memory.recall();
    const learnedRules = memory.learnedRules();
    if (!facts.length && !learnedRules.length) {
      return { response: "Ainda não tenho nenhuma memória guardada.", source: "memory" };
    }

    const parts = [];
    if (facts.length) parts.push("informações: " + facts.slice(-8).join("; "));
    if (learnedRules.length) parts.push("regras ensinadas: " + learnedRules.slice(-5).map((item) => item.pattern).join("; "));
    return { response: "Lembro destas " + parts.join(" | ") + ".", source: "memory" };
  }

  const calculation = extractCalculation(text) ?? (/^[\d\s,().+\-*/%]+$/.test(text) ? text : null);
  if (calculation) {
    const result = calculate(calculation);
    if (result !== null) {
      return { response: String(result), source: "calculator", intent: "calculo" };
    }
  }

  const rule = respondWithRules(text, rules || {});
  if (rule) return rule;

  const intents = detectIntents(text, knowledge.training);
  if (intents[0] && intents[0].score >= 0.55) {
    const item = intents[0];
    const response = item.responses[Math.floor(Math.random() * item.responses.length)] || "Entendi.";
    return { response, source: "chatterbot", intent: item.name, confidence: item.score };
  }

  const concept = knowledge.findConcept(text);
  if (concept) {
    return {
      response: concept.concept.response,
      source: "knowledge",
      intent: "conceito",
      confidence: concept.score,
      reference: concept.concept.reference || null
    };
  }

  const entities = extractEntities(text);
  if (entities.length) {
    return {
      response: "Entendi. Você mencionou " + entities.map((entity) => entity.value).join(", ") + ". O que deseja fazer com isso?",
      source: "nlp",
      entities
    };
  }

  const defaults = Array.isArray(rules?.default) ? rules.default : [];
  return {
    response: defaults[Math.floor(Math.random() * defaults.length)] || "Entendi. Me explique um pouco mais para eu acompanhar.",
    source: "fallback"
  };
}

export { route, wantsSource, wantsMemory, learningValue, teachRule };