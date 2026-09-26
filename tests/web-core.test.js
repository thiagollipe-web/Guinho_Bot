import test from "node:test";
import assert from "node:assert/strict";
import { normalize, similarity, extractEntities } from "../docs/core/nlp.js";
import { matchPattern, applyReflections } from "../docs/core/eliza.js";
import { calculate } from "../docs/core/calculator.js";
import { KnowledgeStore } from "../docs/core/knowledge.js";
import { route } from "../docs/core/router.js";

test("NLP normaliza português", () => {
  assert.equal(normalize("Olá, ÁRVORE!"), "ola arvore");
});

test("similaridade reconhece pergunta próxima", () => {
  assert.ok(similarity("qual a capital do brasil", "capital do brasil") > 0.5);
});

test("NLP extrai tecnologia e moeda", () => {
  const entities = extractEntities("quero programar em JavaScript e saber o dolar");
  assert.ok(entities.some((item) => item.type === "tecnologia" && item.value === "javascript"));
  assert.ok(entities.some((item) => item.type === "moeda" && item.value === "DOLAR"));
});

test("ELIZA captura wildcard e reflete", () => {
  const match = matchPattern("* eu gosto de *", "acho que eu gosto de programacao");
  assert.equal(match.matched, true);
  assert.equal(match.captures[1], "programacao");
  assert.equal(applyReflections("eu gosto de meu projeto", { eu: "voce", meu: "seu" }), "voce gosto de seu projeto");
});

test("calculadora não executa código arbitrário", () => {
  assert.equal(calculate("2 + 3 * 4"), 14);
  assert.equal(calculate("2 + alert(1)"), null);
});

test("roteador combina memória, regras, conhecimento e intenção", () => {
  const memory = {
    facts: [],
    learned: [],
    remember(value) { this.facts.push(value); },
    learn() {},
    findLearned() { return null; },
    recall() { return this.facts; },
    learnedRules() { return this.learned; }
  };

  const knowledge = new KnowledgeStore(
    { concepts: [{ title: "HTML", aliases: ["html"], keywords: ["web"], response: "HTML estrutura páginas." }] },
    { intents: [{ name: "saudacao", examples: ["oi"], responses: ["Olá."] }] }
  );

  assert.equal(route("quanto é 2 + 3", { knowledge, memory, rules: { keywords: [] }, references: [] }).response, "5");
  assert.equal(route("o que é HTML", { knowledge, memory, rules: { keywords: [] }, references: [] }).response, "HTML estrutura páginas.");
  assert.equal(route("oi", { knowledge, memory, rules: { keywords: [] }, references: [] }).source, "chatterbot");
});
