import test from "node:test";
import assert from "node:assert/strict";
import { analisarCodigo, analisarProjeto, extrairBlocosCodigo, relatorioAnalise } from "../analyzer.js";
import { gerarProjeto } from "../generator.js";

test("ANALYZE reconhece bloco fenced e detecta linguagem", () => {
  const blocos=extrairBlocosCodigo("Aqui está:\n\`\`\`js\nconst x = 1;\n\`\`\`");
  assert.equal(blocos.length,1);
  assert.equal(blocos[0],"const x = 1;");
});

test("ANALYZE encontra risco de execução dinâmica", () => {
  const resultado=analisarCodigo('const dado=entrada; eval(dado);',"app.js");
  assert.equal(resultado.valido,false);
  assert.ok(resultado.achados.some(x=>x.categoria==="Segurança"&&x.severidade==="alta"));
});

test("ANALYZE detecta inconsistência entre DOM e JavaScript", () => {
  const resultado=analisarProjeto({
    "index.html":'<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><button id="ok">OK</button><script src="app.js"></script></body></html>',
    "app.js":'document.querySelector("#inexistente").addEventListener("click",()=>{});'
  });
  assert.equal(resultado.valido,false);
  assert.ok(resultado.achados.some(x=>x.categoria==="Integração"||x.categoria==="DOM"));
});

test("ANALYZE reconhece requisitos de jogo mobile", () => {
  const projeto=gerarProjeto("Crie um jogo de plataforma mobile em HTML");
  const resultado=analisarProjeto(projeto.files);
  assert.equal(resultado.resumo.arquivos,1);
  assert.ok(resultado.resumo.linguagens.includes("html"));
  assert.ok(!resultado.achados.some(x=>x.severidade==="alta"));
});

test("ANALYZE valida PWA e gera relatório legível", () => {
  const projeto=gerarProjeto("Crie uma PWA offline");
  const resultado=analisarProjeto(projeto.files);
  assert.ok(resultado.resumo.linguagens.includes("html"));
  assert.equal(resultado.valido,true);
  const relatorio=relatorioAnalise(resultado);
  assert.match(relatorio,/Análise estática:/);
  assert.match(relatorio,/Arquivos:/);
});

test("ANALYZE identifica ausência de viewport", () => {
  const resultado=analisarCodigo("<!doctype html><html><body><h1>Teste</h1></body></html>","index.html");
  assert.equal(resultado.valido,false);
  assert.ok(resultado.achados.some(x=>x.categoria==="Mobile"&&x.severidade==="alta"));
});
