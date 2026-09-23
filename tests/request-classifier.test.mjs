import test from "node:test";
import assert from "node:assert/strict";
import { pedidoDeCodigo } from "../request-classifier.js";

test("não confunde saudação com pedido de código",()=>{
  assert.equal(pedidoDeCodigo("Olá"),false);
  assert.equal(pedidoDeCodigo("Oi, tudo bem?"),false);
});

test("detecta pedidos e referências de programação",()=>{
  assert.equal(pedidoDeCodigo("corrija meu código"),true);
  assert.equal(pedidoDeCodigo("quero programar em Python"),true);
  assert.equal(pedidoDeCodigo("explique React com Vite"),true);
  assert.equal(pedidoDeCodigo("este é meu código"),true);
  assert.equal(pedidoDeCodigo("```js\nconsole.log('oi')\n```"),true);
  assert.equal(pedidoDeCodigo("faça uma página <canvas></canvas>"),true);
  assert.equal(pedidoDeCodigo("faça em C#"),true);
  assert.equal(pedidoDeCodigo("faça em C++"),true);
});
