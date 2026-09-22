import test from "node:test";
import assert from "node:assert/strict";
import { sugerirMelhorias, aplicarMelhoriasSeguras, relatorioMelhorias } from "../improver.js";

test("MELHORAR detecta oportunidades de acessibilidade e performance", () => {
  const projeto={
    "index.html":"<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body><button>OK</button><img src="foto.png"><canvas></canvas><script src="app.js"></script></body></html>",
    "app.js":"document.querySelector('#x'); window.addEventListener('scroll',()=>{}); fetch('/api');"
  };
  const r=sugerirMelhorias(projeto);
  assert.ok(r.total>=3);
  assert.ok(r.melhorias.some(x=>x.categoria==="Acessibilidade"));
  assert.ok(r.melhorias.some(x=>x.categoria==="Performance"));
});

test("MELHORAR detecta suporte a movimento reduzido ausente", () => {
  const r=sugerirMelhorias({"styles.css":"button{transition:transform .2s;font-size:14px;}"});
  assert.ok(r.melhorias.some(x=>x.mensagem.includes("prefers-reduced-motion")));
});

test("MELHORAR detecta oportunidades específicas para jogos", () => {
  const r=sugerirMelhorias({"index.html":"<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body><canvas id="game"></canvas><script>addEventListener('keydown',()=>{});</script></body></html>"});
  assert.ok(r.melhorias.some(x=>x.categoria==="Games"));
});

test("MELHORAR pode aplicar melhoria segura e revalidar", () => {
  const original={"index.html":"<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body><button>OK</button></body></html>"};
  const r=aplicarMelhoriasSeguras(original);
  assert.equal(r.aplicado,true);
  assert.ok(r.depois.score>=r.antes.score);
  assert.match(r.files["index.html"],/:focus-visible/);
});

test("MELHORAR não aplica alteração arriscada de domínio", () => {
  const original={"app.js":"function regraDeNegocio(){ return 42; }"};
  const r=aplicarMelhoriasSeguras(original);
  assert.equal(r.alteracoes.length,0);
  assert.equal(r.files["app.js"],original["app.js"]);
});

test("MELHORAR gera relatório", () => {
  const r=sugerirMelhorias({"styles.css":"button{transition:all .2s;font-size:14px;}"});
  const relatorio=relatorioMelhorias(r);
  assert.match(relatorio,/MELHORIAS SUGERIDAS/);
  assert.match(relatorio,/Total:/);
});
