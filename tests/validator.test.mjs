import test from "node:test";
import assert from "node:assert/strict";
import { validarProjeto, validarCodigo, relatorioValidacao } from "../validator.js";
import { gerarProjeto } from "../generator.js";

test("VALIDAR aprova projeto gerado válido", () => {
  const projeto=gerarProjeto("Crie uma PWA offline");
  const r=validarProjeto(projeto);
  assert.equal(r.valido,true);
  assert.match(r.estado,/APROVADO/);
  assert.equal(r.entrada,"index.html");
});

test("VALIDAR reprova referência para arquivo inexistente", () => {
  const r=validarProjeto({
    "index.html":'<!doctype html><html><head><meta name="viewport" content="width=device-width"><script src="nao-existe.js"></script></head><body></body></html>'
  });
  assert.equal(r.valido,false);
  assert.ok(r.achados.some(x=>x.categoria==="Integração"&&x.severidade==="alta"));
});

test("VALIDAR reprova entrada ausente", () => {
  const r=validarProjeto({"app.js":"const x=1;"},{entry:"index.html"});
  assert.equal(r.valido,false);
  assert.ok(r.achados.some(x=>x.categoria==="Projeto"&&x.severidade==="critica"));
});

test("VALIDAR identifica problemas de segurança do ANALYZE", () => {
  const r=validarCodigo('eval(codigo);',"app.js");
  assert.equal(r.valido,false);
  assert.ok(r.achados.some(x=>x.categoria==="Segurança"));
});

test("VALIDAR valida manifest e Service Worker", () => {
  const r=validarProjeto({
    "index.html":'<!doctype html><html><head><meta name="viewport" content="width=device-width"><link rel="manifest" href="manifest.json"></head><body></body></html>',
    "manifest.json":'{"name":"Teste","short_name":"Teste","start_url":".","display":"standalone","icons":[{"src":"icon.svg","sizes":"any"}]}',
    "service-worker.js":'self.addEventListener("install",()=>{});self.addEventListener("activate",()=>{});self.addEventListener("fetch",()=>{});'
  });
  assert.equal(r.valido,true);
});

test("VALIDAR gera relatório final", () => {
  const r=validarProjeto({"index.html":"<html><body></body></html>"});
  const relatorio=relatorioValidacao(r);
  assert.match(relatorio,/VALIDAÇÃO FINAL:/);
  assert.match(relatorio,/Score:/);
});
