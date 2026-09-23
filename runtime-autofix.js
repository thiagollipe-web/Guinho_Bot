export const MAX_RUNTIME_AUTOFIX=2;

export function deveAutocorrigirRuntime({temWorkspace=false,estado="ERRO",tentativas=0,emExecucao=false}={}){
  return Boolean(temWorkspace&&estado==="ERRO"&&!emExecucao&&Number(tentativas)<MAX_RUNTIME_AUTOFIX);
}

export function proximaTentativaRuntime(tentativas=0){
  return Math.min(MAX_RUNTIME_AUTOFIX,Math.max(0,Number(tentativas)||0)+1);
}

export function construirPedidoAutocorrecao(runtime={}){
  return [
    "Corrija o erro de runtime detectado no projeto.",
    "Não remova funcionalidades sem necessidade.",
    "Faça a menor alteração possível.",
    runtime.mensagem?"Erro: "+String(runtime.mensagem):"",
    runtime.detalhes?"Detalhes: "+String(runtime.detalhes):""
  ].filter(Boolean).join("\n");
}
