const BRIDGE_NAME="GuinhoNativeAI";

export function runtimeNativoDisponivel(globalThisRef=globalThis){
  return Boolean(globalThisRef?.[BRIDGE_NAME]&&typeof globalThisRef[BRIDGE_NAME].generate==="function");
}

export async function gerarRespostaLocal({model,prompt,history=[]}={},globalThisRef=globalThis){
  if(!model?.id)throw new Error("Modelo local não selecionado.");
  const bridge=globalThisRef?.[BRIDGE_NAME];
  if(!bridge||typeof bridge.generate!=="function"){
    throw new Error("Runtime nativo ainda não está disponível neste ambiente.");
  }
  const result=await bridge.generate({modelId:model.id,prompt:String(prompt??""),history:Array.isArray(history)?history:[]});
  const content=typeof result==="string"?result:result?.content;
  if(!String(content??"").trim())throw new Error("O runtime local não retornou conteúdo.");
  return {content:String(content),model:model.id};
}

export function especificacaoRuntime(){
  return {
    bridge:BRIDGE_NAME,
    protocol:"generate({modelId,prompt,history}) -> {content}",
    transport:"Android WebView JavaScript bridge",
    models:["qwen-0.5b","qwen-1.5b","nemotron-4b"]
  };
}