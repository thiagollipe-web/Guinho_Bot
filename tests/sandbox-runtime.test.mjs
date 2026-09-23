import test from "node:test";
import assert from "node:assert/strict";
import { criarTokenRuntime, montarDocumentoSandbox, validarEventoRuntime, interpretarEventoRuntime, CHANNEL } from "../sandbox-runtime.js";

test("sandbox adiciona CSP sem conectividade de rede",()=>{
  const token=criarTokenRuntime("teste");
  const html=montarDocumentoSandbox("<!doctype html><html><head><title>Guinho</title></head><body><script>console.log('ok')</script></body></html>",token);
  assert.match(html,/Content-Security-Policy/);
  assert.match(html,/connect-src 'none'/);
  assert.ok(html.includes(token));
  assert.match(html,/guinho-sandbox-runtime-v1/);
});

test("eventos de runtime só são aceitos do iframe e token atuais",()=>{
  const source={};
  const token="abc";
  assert.equal(validarEventoRuntime({source,data:{channel:CHANNEL,token,type:"ready"}},source,token),true);
  assert.equal(validarEventoRuntime({source:{},data:{channel:CHANNEL,token,type:"ready"}},source,token),false);
  assert.equal(validarEventoRuntime({source,data:{channel:CHANNEL,token:"outro",type:"ready"}},source,token),false);
});

test("eventos viram estados verificáveis",()=>{
  assert.deepEqual(interpretarEventoRuntime({type:"ready",title:"Jogo"}),{estado:"OK",mensagem:"Projeto executado sem erro de runtime detectado na inicialização.",detalhes:"Jogo"});
  assert.equal(interpretarEventoRuntime({type:"error",message:"boom",lineno:9}).estado,"ERRO");
  assert.equal(interpretarEventoRuntime({type:"unhandledrejection",message:"falhou"}).estado,"ERRO");
  assert.equal(interpretarEventoRuntime({type:"ignorado"}),null);
});
