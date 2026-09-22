import test from "node:test";
import assert from "node:assert/strict";
import { corrigirProjeto, relatorioCorrecao } from "../fixer.js";
import { analisarProjeto } from "../analyzer.js";

test("CORRIGIR adiciona viewport e DOCTYPE com reanalise", () => {
  const original={"index.html":"<html><head></head><body><button id=\"ok\">OK</button></body></html>"};
  const resultado=corrigirProjeto(original);
  assert.equal(resultado.aplicado,true);
  assert.match(resultado.files["index.html"],/<!doctype html>/i);
  assert.match(resultado.files["index.html"],/name=\"viewport\"/i);
  assert.ok(resultado.depois.score>=resultado.antes.score);
});

test("CORRIGIR remove eval", () => {
  const original={"app.js":"const x=eval(codigo);"};
  const resultado=corrigirProjeto(original);
  assert.equal(resultado.aplicado,true);
  assert.doesNotMatch(resultado.files["app.js"],/\beval\s*\(/);
});

test("CORRIGIR remove logs de depuracao", () => {
  const original={"app.js":"function teste(){\n console.log('debug');\n return 1;\n}"};
  const resultado=corrigirProjeto(original);
  assert.equal(resultado.aplicado,true);
  assert.doesNotMatch(resultado.files["app.js"],/console\.log/);
});

test("CORRIGIR nao piora o projeto", () => {
  const original={"index.html":"<!doctype html><html><head><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head><body><h1>OK</h1></body></html>"};
  const antes=analisarProjeto(original);
  const resultado=corrigirProjeto(original);
  assert.ok(resultado.depois.score>=antes.score);
  assert.equal(resultado.depois.score,antes.score);
});

test("CORRIGIR produz relatorio", () => {
  const resultado=corrigirProjeto({"index.html":"<html><body></body></html>"});
  const relatorio=relatorioCorrecao(resultado);
  assert.match(relatorio,/CORREÇÃO|CÓDIGO ORIGINAL/);
  assert.match(relatorio,/Score:/);
});
