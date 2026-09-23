import test from "node:test";
import assert from "node:assert/strict";
import { MAX_RUNTIME_AUTOFIX, deveAutocorrigirRuntime, proximaTentativaRuntime, construirPedidoAutocorrecao } from "../runtime-autofix.js";

test("autocorreção é limitada e exige workspace/erro",()=>{
  assert.equal(MAX_RUNTIME_AUTOFIX,2);
  assert.equal(deveAutocorrigirRuntime({temWorkspace:true,estado:"ERRO",tentativas:0}),true);
  assert.equal(deveAutocorrigirRuntime({temWorkspace:true,estado:"ERRO",tentativas:2}),false);
  assert.equal(deveAutocorrigirRuntime({temWorkspace:false,estado:"ERRO",tentativas:0}),false);
  assert.equal(deveAutocorrigirRuntime({temWorkspace:true,estado:"OK",tentativas:0}),false);
  assert.equal(deveAutocorrigirRuntime({temWorkspace:true,estado:"ERRO",tentativas:0,emExecucao:true}),false);
});

test("próxima tentativa nunca passa do limite",()=>{
  assert.equal(proximaTentativaRuntime(0),1);
  assert.equal(proximaTentativaRuntime(1),2);
  assert.equal(proximaTentativaRuntime(2),2);
  assert.equal(proximaTentativaRuntime(99),2);
});

test("pedido de autocorreção preserva evidência do runtime",()=>{
  const pedido=construirPedidoAutocorrecao({mensagem:"x is not defined",detalhes:"app.js • linha 10"});
  assert.match(pedido,/x is not defined/);
  assert.match(pedido,/app\.js/);
});
