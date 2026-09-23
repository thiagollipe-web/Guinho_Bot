import test from "node:test";
import assert from "node:assert/strict";
import { especificacaoRuntime, gerarRespostaLocal, runtimeNativoDisponivel } from "../local-model-runtime.js";

test("runtime não é considerado disponível sem bridge",()=>assert.equal(runtimeNativoDisponivel({}),false));
test("bridge é detectado quando expõe generate",()=>assert.equal(runtimeNativoDisponivel({GuinhoNativeAI:{generate(){}}}),true));
test("runtime envia modelo e prompt ao bridge",async()=>{
  let request=null;
  const result=await gerarRespostaLocal({model:{id:"qwen-1.5b"},prompt:"Olá",history:[{role:"user",content:"Oi"}]},{GuinhoNativeAI:{async generate(value){request=value;return {content:"Resposta local"};}}});
  assert.deepEqual(request,{modelId:"qwen-1.5b",prompt:"Olá",history:[{role:"user",content:"Oi"}]});
  assert.equal(result.content,"Resposta local");
});
test("especificação documenta os três modelos",()=>assert.deepEqual(especificacaoRuntime().models,["qwen-0.5b","qwen-1.5b","nemotron-4b"]));