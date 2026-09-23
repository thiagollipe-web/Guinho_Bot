import test from "node:test";
import assert from "node:assert/strict";
import { executarCicloEngenharia } from "../engine.js";

test("pipeline do Guinho transforma ideia em projeto validado", () => {
  const resultado=executarCicloEngenharia(
    "criar um jogo 2D em JavaScript com Canvas",
    {maxCiclos:4}
  );

  assert.equal(resultado.criado,true);
  assert.ok(Object.keys(resultado.files).length>=1);
  assert.ok(resultado.files[resultado.entry]);
  assert.ok(resultado.historico.some(x=>x.etapa==="CRIAR"));
  assert.ok(resultado.historico.some(x=>x.etapa==="ANALISAR"));
  assert.ok(resultado.historico.some(x=>x.etapa==="VALIDAR"));
  assert.ok(resultado.analise);
  assert.ok(resultado.validacao);
});

test("pipeline aceita projeto existente e executa análise/validação", () => {
  const resultado=executarCicloEngenharia("validar projeto",{
    criar:false,
    files:{
      "index.html":"<!doctype html><html><body><h1>Guinho</h1></body></html>"
    },
    maxCiclos:2
  });

  assert.equal(resultado.criado,false);
  assert.ok(resultado.historico.some(x=>x.etapa==="ANALISAR"));
  assert.ok(resultado.validacao);
  assert.ok(resultado.files["index.html"]);
});
