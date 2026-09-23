import test from "node:test";
import assert from "node:assert/strict";
import { gerarArvoreProjeto, achatarArvore } from "../project-tree.js";
import { calcularImpactoProjeto, resumoImpacto } from "../project-impact.js";

test("árvore agrupa pastas e arquivos", () => {
  const tree = gerarArvoreProjeto({"src/app.js":"x","src/ui/index.html":"x","README.md":"x"});
  const flat = achatarArvore(tree);
  assert.ok(flat.some(x => x.path === "src" && x.type === "folder"));
  assert.ok(flat.some(x => x.path === "src/ui" && x.type === "folder"));
  assert.ok(flat.some(x => x.path === "src/app.js" && x.type === "file"));
});

test("impacto separa arquivos diretos e relacionados", () => {
  const impacto = calcularImpactoProjeto(
    { files: [{ path: "app.js", action: "update" }] },
    { graph: { "app.js": [{ resolvido: "utils.js" }] }, dependentes: { "app.js": ["index.html"] } },
    { "app.js": "", "utils.js": "", "index.html": "" }
  );
  assert.deepEqual(impacto.diretos, ["app.js"]);
  assert.deepEqual(new Set(impacto.relacionados), new Set(["utils.js", "index.html"]));
  assert.match(resumoImpacto(impacto), /Diretos: 1/);
});

test("árvore preserva estado de pastas sem depender do DOM", () => {
  const tree = gerarArvoreProjeto({"src/a.js":"x","src/sub/b.js":"x"});
  const flat = achatarArvore(tree);
  assert.deepEqual(flat.filter(x => x.type === "folder").map(x => x.path), ["src","src/sub"]);
});
