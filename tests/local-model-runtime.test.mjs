import test from "node:test";
import assert from "node:assert/strict";
import { especificacaoRuntime, gerarRespostaLocal, runtimeNativoDisponivel } from "../local-model-runtime.js";

test("runtime não é considerado disponível sem bridge",()=>assert.equal(runtimeNativoDisponivel({}),false));
test("bridge é detectado quando expõe generate",()=>assert.equal(runtimeNativoDisponivel({GuinhoNativeAI:{generate(){}}}),true));
test("runtime serializa modelo, prompt e histórico para o bridge",async()=>{
  let request=null;
  const result=await gerarRespostaLocal(
    {model:{id:"qwen-1.5b"},prompt:"Olá",history:[{role:"user",content:"Oi"}]},
    {GuinhoNativeAI:{async generate(value){request=JSON.parse(value);return JSON.stringify({content:"Resposta local"});}}}
  );
  assert.equal(request.modelId,"qwen-1.5b");
  assert.equal(request.prompt,"Olá");
  assert.deepEqual(request.history,[{role:"user",content:"Oi"}]);
  assert.equal(result.content,"Resposta local");
});
test("erros nativos chegam ao JavaScript",async()=>{
  await assert.rejects(
    gerarRespostaLocal({model:{id:"qwen-0.5b"},prompt:"teste"},{GuinhoNativeAI:{generate(){return JSON.stringify({error:"GGUF ausente"});}}}),
    /GGUF ausente/
  );
});
test("especificação documenta os três modelos",()=>assert.deepEqual(especificacaoRuntime().models,["qwen-0.5b","qwen-1.5b","nemotron-4b"]));
