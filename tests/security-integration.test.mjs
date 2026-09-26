import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("segredo não aparece no bundle público", () => {
  for (const file of ["index.html", "app.js", "ai-config.js", "styles.css", "manifest.json"]) {
    const content = read(file);
    assert.equal(content.includes("OPENAI_API_KEY"), false, file);
    assert.equal(/sk-[A-Za-z0-9_-]{20,}/.test(content), false, file);
    assert.equal(content.includes("process.env."), false, file);
  }
});

test("backend não executa código recebido dinamicamente", () => {
  const content = read("api/chat.js");
  assert.equal(/\beval\s*\(/.test(content), false);
  assert.equal(/\bnew\s+Function\s*\(/.test(content), false);
});

test("frontend possui fallback explícito para o motor local", () => {
  const content = read("app.js");
  assert.match(content, /await gerarWebGPU\(/);
  assert.match(content, /ultimaOrigemResposta="local-fallback"/);
  assert.match(content, /intencaoEspecial\(analise,texto\)/);
  assert.match(content, /gerarRespostaEstruturada\(texto,analise\)/);
});
