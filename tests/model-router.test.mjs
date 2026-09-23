import test from "node:test";
import assert from "node:assert/strict";
import { detectarComando, listarModelos, removerComando, resolverModelo, selecionarAutomaticamente } from "../model-router.js";

test("lista os três modelos locais",()=>{
  assert.deepEqual(listarModelos().map(x=>x.id),["qwen-0.5b","qwen-1.5b","nemotron-4b"]);
});

test("reconhece comandos explícitos",()=>{
  assert.equal(detectarComando("/fast"),"fast");
  assert.equal(detectarComando("/qwen corrija este código"),"qwen");
  assert.equal(detectarComando("/nano analise o projeto"),"nano");
  assert.equal(detectarComando("olá"),null);
});

test("remove o comando antes de enviar o prompt",()=>{
  assert.equal(removerComando("/qwen  corrija meu JavaScript"),"corrija meu JavaScript");
});

test("auto escolhe qwen para programação",()=>{
  assert.equal(selecionarAutomaticamente("Crie uma função Python para ler CSV"),"qwen");
});

test("auto escolhe nano para análise pesada",()=>{
  assert.equal(selecionarAutomaticamente("Faça uma auditoria da arquitetura do projeto"),"nano");
});

test("auto usa fast para conversa simples",()=>{
  assert.equal(selecionarAutomaticamente("Explique o que é uma variável"),"fast");
});

test("resolverModelo preserva seleção manual",()=>{
  const result=resolverModelo("/nano explique JavaScript");
  assert.equal(result.key,"nano");
  assert.equal(result.source,"command");
  assert.equal(result.prompt,"explique JavaScript");
});