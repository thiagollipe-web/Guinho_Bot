const BRIDGE_NAME="GuinhoNativeAI";

export function runtimeNativoDisponivel(globalThisRef=globalThis){
  const bridge=globalThisRef?.[BRIDGE_NAME];
  return Boolean(bridge&&typeof bridge.generate==="function");
}

export async function gerarRespostaLocal({model,prompt,history=[]}={},globalThisRef=globalThis){
  if(!model?.id)throw new Error("Modelo local não selecionado.");
  const bridge=globalThisRef?.[BRIDGE_NAME];
  if(!bridge||typeof bridge.generate!=="function"){
    throw new Error("Runtime nativo ainda não está disponível neste ambiente.");
  }
  const payload=JSON.stringify({
    modelId:model.id,
    prompt:String(prompt??""),
    history:Array.isArray(history)?history:[],
    maxTokens:512
  });
  const raw=await bridge.generate(payload);
  let result=raw;
  if(typeof raw==="string"){
    try{result=JSON.parse(raw);}catch{}
  }
  if(result?.error)throw new Error(String(result.error));
  const content=typeof result==="string"?result:result?.content;
  if(!String(content??"").trim())throw new Error("O runtime local não retornou conteúdo.");
  return {content:String(content),model:model.id};
}

export function especificacaoRuntime(){
  return {
    bridge:BRIDGE_NAME,
    protocol:"generate(JSON.stringify({modelId,prompt,history,maxTokens})) -> JSON {content}",
    transport:"Android WebView JavaScript bridge",
    models:["gemma-270m","qwen-0.5b","qwen-1.5b","nemotron-4b"]
  };
}
