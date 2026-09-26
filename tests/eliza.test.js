import test from "node:test";
import assert from "node:assert/strict";
import { matchPattern } from "../src/eliza/pattern-matcher.js";
import { createEngine } from "../src/eliza/engine.js";

test("matcher captura curingas", () => {
  const result = matchPattern("* ajuda *", "eu preciso de ajuda agora");
  assert.equal(result.matched, true);
  assert.deepEqual(result.captures, ["eu preciso de", "agora"]);
});

test("engine respeita precedência e resposta", () => {
  const engine = createEngine({
    default: ["fallback"],
    keywords: [
      {
        keyword: "ajuda",
        precedence: 100,
        rules: [{ decomposition: "* ajuda *", reassembly: ["posso ajudar."] }]
      }
    ]
  }, { random: () => 0 });

  assert.equal(engine.respond("preciso de ajuda").response, "posso ajudar.");
});

test("engine mantém memória por instância", () => {
  const engine = createEngine({
    default: ["fallback"],
    keywords: [{
      keyword: "guardar",
      precedence: 10,
      rules: [{
        decomposition: "* guardar *",
        memory: true,
        reassembly: ["ok"]
      }]
    }]
  }, { random: () => 0 });

  assert.equal(engine.respond("quero guardar isso").response, "ok");
  assert.equal(engine.state.memory.length, 1);
});
