import { CONHECIMENTO } from "./knowledge.js";
import { RecuperadorSemantico } from "./retrieval.js";
import { MemoriaSessao } from "./memory.js";
import { EstatisticaLinguistica, GeradorEstatistico } from "./probabilistic.js";
import { BIBLIOTECA_JOGOS } from "./game-library.js";
import { ContextoConversacional } from "./context.js";
import { perfilPergunta } from "./prompt-library.js";
import { construirPerfilProgramador, respostaElizaProgramacao, ehConversaProgramacao } from "./guinho-programmer.js";
import { gerarProjeto } from "./generator.js";
import { extrairBlocosCodigo, analisarCodigo, analisarProjeto, relatorioAnalise } from "./analyzer.js";
import { corrigirProjeto, relatorioCorrecao } from "./fixer.js";
import { sugerirMelhorias, aplicarMelhoriasSeguras, relatorioMelhorias } from "./improver.js";
import { validarProjeto, relatorioValidacao } from "./validator.js";
import { executarCicloEngenharia, relatorioEngenharia } from "./engine.js";
import { hidratarModeloAprendizado, serializarModeloAprendizado } from "./engineering-learning.js";
import { criarWorkspace, atualizarWorkspace, carregarWorkspace, salvarWorkspace, resumoWorkspace } from "./project-workspace.js";
import { gerarDiffProjeto, resumoDiff } from "./project-diff.js";
import { criarTokenRuntime, montarDocumentoSandbox, validarEventoRuntime, interpretarEventoRuntime } from "./sandbox-runtime.js";
import { MAX_RUNTIME_AUTOFIX, deveAutocorrigirRuntime, proximaTentativaRuntime, construirPedidoAutocorrecao } from "./runtime-autofix.js";
import { criarSnapshot, registrarSnapshot, desfazerWorkspace, removerUltimoSnapshot, salvarHistoricoWorkspace, carregarHistoricoWorkspace, resumoHistoricoWorkspace } from "./workspace-history.js";
import { AI_CHAT_URL, AI_CHAT_TIMEOUT_MS } from "./ai-config.js";

const chat=document.querySelector("#chat");
const form=document.querySelector("#composer");
const input=document.querySelector("#message");
const statusText=document.querySelector("#status-text");
const buttons=document.querySelectorAll("[data-cmd]");
const siteSearch=document.querySelector("#site-search");
const newChatButton=document.querySelector("#new-chat");
const clearChatButton=document.querySelector("#clear-chat");
const focusInputButton=document.querySelector("#focus-input");
const drawerOverlay=document.querySelector("#drawer-overlay");
const leftSidebar=document.querySelector(".sidebar-left");
const openLeft=document.querySelector("#open-left");
const closeLeft=document.querySelector("#close-left");
const rightSidebar=document.querySelector(".sidebar-right");
const openRight=document.querySelector("#open-right");
const closeRight=document.querySelector("#close-right");
const selectedModes=document.querySelectorAll("[data-mode]");
const navItems=document.querySelectorAll("[data-nav]");
const topicButtons=document.querySelectorAll("[data-topic]");
const toast=document.querySelector("#toast");
const engineeringWorkspace=document.querySelector("#engineering-workspace");
const engTitle=document.querySelector("#eng-title");
const engStatus=document.querySelector("#eng-status");
const engFileList=document.querySelector("#eng-file-list");
const engFileName=document.querySelector("#eng-file-name");
const engFileMeta=document.querySelector("#eng-file-meta");
const engEditor=document.querySelector("#eng-editor");
const engSave=document.querySelector("#eng-save");
const engAnalyze=document.querySelector("#eng-analyze");
const engFix=document.querySelector("#eng-fix");
const engImprove=document.querySelector("#eng-improve");
const engValidate=document.querySelector("#eng-validate");
const engCycle=document.querySelector("#eng-cycle");
const engPreview=document.querySelector("#eng-preview-frame");
const engPreviewButton=document.querySelector("#eng-preview");
const engClose=document.querySelector("#eng-close");
const engRun=document.querySelector("#eng-run");
const engSummary=document.querySelector("#eng-summary");
const engMemory=document.querySelector("#eng-memory");
const engRuntime=document.querySelector("#eng-runtime");
const engExecute=document.querySelector("#eng-execute");
const engUndo=document.querySelector("#eng-undo");
let runtimeToken="";
let runtimeTimer=null;
let runtimeAutofixAttempts=0;
let runtimeAutofixRunning=false;
const engDiff=document.querySelector("#eng-diff");
const LEARNING_KEY="guinho-engineering-learning-v1";
let ultimoProjetoEngenharia=null;
let workspaceEngenharia=null;
let historicoWorkspace=[];
let arquivoEngenhariaAtual="index.html";

const pnl=new EstatisticaLinguistica();
const recuperador=new RecuperadorSemantico(CONHECIMENTO);
const memoria=new MemoriaSessao();
const gerador=new GeradorEstatistico();
const contexto=new ContextoConversacional();
let modoAtual="standard";
let ultimaOrigemResposta="local";

function carregarAprendizadoEngenharia(){
  try{
    const bruto=localStorage.getItem(LEARNING_KEY);
    return hidratarModeloAprendizado(bruto?JSON.parse(bruto):{});
  }catch{
    return hidratarModeloAprendizado({});
  }
}

function salvarAprendizadoEngenharia(aprendizado){
  try{
    localStorage.setItem(LEARNING_KEY,JSON.stringify(serializarModeloAprendizado(aprendizado)));
  }catch{}
}

function executarCicloComAprendizado(entrada,opcoes={}){
  const aprendizado=carregarAprendizadoEngenharia();
  const resultado=executarCicloEngenharia(entrada,{...opcoes,aprendizado});
  if(resultado.aprendizado)salvarAprendizadoEngenharia(resultado.aprendizado);
  return resultado;
}


function respostaCriacao(texto,analise){
  const projeto=gerarProjeto(texto,analise);
  const nomes=Object.keys(projeto.files);
  const estado=projeto.validacao.valido?"VALIDAÇÃO OK":"VALIDAÇÃO COM ERROS";
  const avisos=projeto.validacao.avisos.length?`\\nAvisos: ${projeto.validacao.avisos.join(" • ")}`:"";
  const primeiro=projeto.files[projeto.entry]||"";
  const limite=primeiro.length>14000?primeiro.slice(0,13997)+"...":primeiro;
  return `Projeto gerado: ${projeto.plano.tipo}\\nEstratégia: ${projeto.plano.estrategia}\\nTecnologias: ${projeto.plano.tecnologias.join(", ")}\\nArquivos: ${nomes.join(", ")}\\n${estado}${projeto.validacao.erros.length?`\\nErros: ${projeto.validacao.erros.join(" • ")}`:""}${avisos}\\n\\nArquivo de entrada: ${projeto.entry}\\n\\n${limite}`;
}


function respostaCorrecao(texto){
  const blocos=extrairBlocosCodigo(texto);
  if(blocos.length===0)return "Para corrigir, cole o código na mensagem. O CORRIGIR aplica apenas alterações automáticas seguras e revalida o resultado.";
  const arquivos={};
  blocos.slice(0,8).forEach((codigo,i)=>{
    const q=codigo.toLowerCase();
    const nome=/<(?:!doctype|html|body|canvas)\b/.test(q)?"codigo-"+(i+1)+".html":/[.#][\w-]+\s*\{/.test(q)?"codigo-"+(i+1)+".css":"codigo-"+(i+1)+".js";
    arquivos[nome]=codigo;
  });
  const resultado=corrigirProjeto(arquivos);
  return relatorioCorrecao(resultado);
}

function arquivosDaMensagem(texto){
  const blocos=extrairBlocosCodigo(texto);
  const arquivos={};
  blocos.slice(0,8).forEach((codigo,i)=>{
    const q=codigo.toLowerCase();
    const nome=/<(?:!doctype|html|body|canvas)\b/.test(q)?"codigo-"+(i+1)+".html":/[.#][\w-]+\s*\{/.test(q)?"codigo-"+(i+1)+".css":"codigo-"+(i+1)+".js";
    arquivos[nome]=codigo;
  });
  return arquivos;
}

function atualizarUndoUI(){
  if(!engUndo)return;
  engUndo.disabled=historicoWorkspace.length===0;
  engUndo.title=historicoWorkspace.length
    ?"Desfazer última alteração ("+historicoWorkspace.length+" ponto(s) de restauração)"
    :"Nenhum ponto de restauração";
  if(engMemory&&historicoWorkspace.length){
    const base=engMemory.textContent||"";
    if(!base.includes("HISTÓRICO DE RESTAURAÇÃO"))engMemory.textContent=base+"\n\nHISTÓRICO DE RESTAURAÇÃO\n"+resumoHistoricoWorkspace(historicoWorkspace);
  }
}
function criarPontoRestauracao(motivo){
  const base=workspaceEngenharia||ultimoProjetoEngenharia;
  if(!base||!Object.keys(base.files||{}).length)return false;
  const snapshot=criarSnapshot(base,motivo);
  historicoWorkspace=registrarSnapshot(historicoWorkspace,snapshot);
  salvarHistoricoWorkspace(historicoWorkspace);
  atualizarUndoUI();
  return true;
}
function desfazerUltimaAlteracao(){
  sincronizarEditorEngenharia();
  if(!historicoWorkspace.length){showToast("Nenhum ponto de restauração disponível");return;}
  const antes={...(ultimoProjetoEngenharia?.files||{})};
  const snapshot=historicoWorkspace.at(-1);
  const restaurado=desfazerWorkspace(ultimoProjetoEngenharia||workspaceEngenharia||{},historicoWorkspace);
  if(!restaurado)return;
  const delta=gerarDiffProjeto(antes,restaurado.files);
  const resumo=resumoDiff(antes,restaurado.files);
  const resultado={...restaurado,lastDiff:delta,diffResumo:resumo,runtime:null,historico:[...(restaurado.historico||[]),{etapa:"UNDO",status:"OK",motivo:snapshot.motivo||"alteração"}]};
  historicoWorkspace=removerUltimoSnapshot(historicoWorkspace);
  salvarHistoricoWorkspace(historicoWorkspace);
  ultimoProjetoEngenharia=resultado;
  workspaceEngenharia=atualizarWorkspace(workspaceEngenharia||criarWorkspace(resultado),resultado);
  salvarWorkspace(workspaceEngenharia);
  abrirWorkspace(resultado);
  atualizarWorkspaceStatus("Última alteração desfeita.","RESTAURADO");
  atualizarUndoUI();
  showToast("Alteração desfeita");
}

function persistirWorkspaceEngenharia(){
  if(!ultimoProjetoEngenharia)return;
  workspaceEngenharia=atualizarWorkspace(workspaceEngenharia||criarWorkspace(ultimoProjetoEngenharia),ultimoProjetoEngenharia);
  workspaceEngenharia=atualizarWorkspace(workspaceEngenharia,{files:ultimoProjetoEngenharia.files,entry:ultimoProjetoEngenharia.entry,status:ultimoProjetoEngenharia.status,ok:ultimoProjetoEngenharia.ok,plano:ultimoProjetoEngenharia.plano,historico:ultimoProjetoEngenharia.historico,problemas:ultimoProjetoEngenharia.memoria?.problemas||workspaceEngenharia.problemas,runtime:ultimoProjetoEngenharia.runtime||workspaceEngenharia.runtime||null});
  salvarWorkspace(workspaceEngenharia);
}
function restaurarWorkspaceEngenharia(){
  const salvo=carregarWorkspace();
  if(!salvo||!Object.keys(salvo.files||{}).length)return false;
  workspaceEngenharia=salvo;
  ultimoProjetoEngenharia={files:{...salvo.files},entry:salvo.entry,plano:salvo.plano,status:salvo.status,ok:Boolean(salvo.ok),runtime:salvo.runtime||null,historico:salvo.historico||[],memoria:{problemas:salvo.problemas||[]},proximasTarefas:salvo.proximasTarefas||[]};
  abrirWorkspace(ultimoProjetoEngenharia);
  atualizarWorkspaceStatus(resumoWorkspace(salvo),"RECUPERADO");
  if(salvo.runtime)atualizarRuntimeStatus(salvo.runtime.estado,salvo.runtime.mensagem,salvo.runtime.detalhes);
  return true;
}

function sincronizarEditorEngenharia(){
  if(!ultimoProjetoEngenharia||!engEditor)return;
  ultimoProjetoEngenharia.files=ultimoProjetoEngenharia.files||{};
  ultimoProjetoEngenharia.files[arquivoEngenhariaAtual]=engEditor.value;
  ultimoProjetoEngenharia._editado=true;
  persistirWorkspaceEngenharia();
}
function atualizarWorkspaceStatus(texto,estado){
  if(engSummary)engSummary.textContent=texto;
  if(engStatus&&estado)engStatus.textContent=estado;
}
function abrirWorkspace(resultado){
  if(!engineeringWorkspace)return;
  ultimoProjetoEngenharia=resultado;
  arquivoEngenhariaAtual=resultado.entry||Object.keys(resultado.files||{})[0]||"index.html";
  engineeringWorkspace.hidden=false;
  engTitle.textContent=resultado.plano?.tipo||"Projeto de Engenharia";
  engStatus.textContent=resultado.status||"SEM RESULTADO";
  atualizarWorkspaceStatus(relatorioEngenharia(resultado).split("\\n").slice(0,3).join(" • "),resultado.status);
  if(engMemory)engMemory.textContent=[resultado.relatorioMemoria,resultado.relatorioAprendizado].filter(Boolean).join("\\n\\n")||"Nenhuma memória de engenharia registrada.";
  const ordem=["CRIAR","ANALISAR","CORRIGIR","MELHORAR","VALIDAR","EXECUTAR"];
  const etapas=(resultado.historico||[]).map(x=>x.etapa);
  const ultima=etapas.at(-1);
  document.querySelectorAll("#eng-pipeline [data-stage]").forEach(el=>{el.classList.remove("active","done");const i=ordem.indexOf(el.dataset.stage);if(i>=0&&ordem.indexOf(ultima)>=i)el.classList.add("done");if(el.dataset.stage===ultima)el.classList.add("active");});
  renderArquivosEngenharia(); mostrarArquivoEngenharia(arquivoEngenhariaAtual); atualizarPreviewEngenharia();
  persistirWorkspaceEngenharia();
}
function renderArquivosEngenharia(){
  if(!engFileList||!ultimoProjetoEngenharia)return;
  engFileList.innerHTML="";
  Object.keys(ultimoProjetoEngenharia.files||{}).forEach(nome=>{const b=document.createElement("button");b.type="button";b.className="eng-file"+(nome===arquivoEngenhariaAtual?" active":"");b.textContent=nome;b.addEventListener("click",()=>{sincronizarEditorEngenharia();arquivoEngenhariaAtual=nome;renderArquivosEngenharia();mostrarArquivoEngenharia(nome);});engFileList.appendChild(b);});
}
function mostrarArquivoEngenharia(nome){
  if(!ultimoProjetoEngenharia||!engEditor)return;
  const codigo=String(ultimoProjetoEngenharia.files?.[nome]??"");
  engFileName.textContent=nome;engFileMeta.textContent=codigo.split("\\n").length+" linhas";engEditor.value=codigo;engEditor.dataset.dirty="false";
}
function atualizarRuntimeStatus(estado,mensagem,detalhes=""){
  if(!engRuntime)return;
  engRuntime.dataset.state=estado||"IDLE";
  engRuntime.textContent=(estado||"IDLE")+(mensagem?": "+mensagem:"")+(detalhes?" • "+detalhes:"");
}
function executarProjetoNoSandbox(){
  if(!ultimoProjetoEngenharia?.files?.["index.html"]){
    atualizarRuntimeStatus("INDISPONÍVEL","index.html não encontrado");
    return;
  }
  sincronizarEditorEngenharia();
  if(!ultimoProjetoEngenharia.ok){
    atualizarRuntimeStatus("BLOQUEADO","Valide o projeto antes da execução");
    showToast("Execução bloqueada: projeto inválido");
    return;
  }
  runtimeToken=criarTokenRuntime();
  clearTimeout(runtimeTimer);
  atualizarRuntimeStatus("EXECUTANDO","aguardando runtime");
  engExecute.disabled=true;
  engPreview.setAttribute("sandbox","allow-scripts");
  engPreview.srcdoc=montarDocumentoSandbox(montarPreviewEngenharia(),runtimeToken);
  runtimeTimer=setTimeout(()=>{
    atualizarRuntimeStatus("TIMEOUT","o iframe não respondeu em 6s");
    if(engExecute)engExecute.disabled=false;
  },6000);
}
window.addEventListener("message",event=>{
  if(!engPreview||!validarEventoRuntime(event,engPreview.contentWindow,runtimeToken))return;
  const resultado=interpretarEventoRuntime(event.data);
  if(!resultado)return;
  clearTimeout(runtimeTimer);
  atualizarRuntimeStatus(resultado.estado,resultado.mensagem,resultado.detalhes);
  engExecute.disabled=false;
  if(resultado.estado==="ERRO"){
    const antes=ultimoProjetoEngenharia||{};
    const falha={
      etapa:"EXECUTAR",
      status:"ERRO",
      mensagem:resultado.mensagem,
      detalhes:resultado.detalhes
    };
    ultimoProjetoEngenharia={...antes,historico:[...(antes.historico||[]),falha],runtime:resultado};
    persistirWorkspaceEngenharia();
    void tentarAutocorrecaoRuntime(resultado);
  }else{
    runtimeAutofixAttempts=0;
    ultimoProjetoEngenharia={...ultimoProjetoEngenharia,runtime:resultado,historico:[...(ultimoProjetoEngenharia.historico||[]),{etapa:"EXECUTAR",status:"OK",detalhes:resultado.detalhes}]};
    persistirWorkspaceEngenharia();
  }
});

function atualizarPreviewEngenharia(){
  const pode=Boolean(ultimoProjetoEngenharia?.ok&&ultimoProjetoEngenharia?.files?.["index.html"]);
  engPreviewButton.disabled=!pode;
  document.querySelector("#eng-preview-note").textContent=pode?"sandbox • projeto atual":"preview indisponível";
  if(pode){runtimeToken=criarTokenRuntime();engPreview.setAttribute("sandbox","allow-scripts");engPreview.srcdoc=montarDocumentoSandbox(montarPreviewEngenharia(),runtimeToken);}
  else {engPreview.setAttribute("sandbox","allow-scripts");engPreview.srcdoc="<body style='font-family:system-ui;padding:24px'>Execute VALIDAR/CORRIGIR até obter um projeto válido para visualizar.</body>";}
  if(engRuntime&&!pode)atualizarRuntimeStatus("INDISPONÍVEL","preview indisponível");
}
function montarPreviewEngenharia(){
  if(!ultimoProjetoEngenharia)return "";
  let html=String(ultimoProjetoEngenharia.files?.["index.html"]||"");
  const files=ultimoProjetoEngenharia.files||{};
  if(files["styles.css"]){const cssText=files["styles.css"].replace(/<[/]style/gi,"<\\/style");html=html.replace(/<link[^>]+href=["'][^"']*styles[.]css["'][^>]*>/gi,"<style data-guinho-inline>"+cssText+"</style>");}
  if(files["app.js"]){const jsText=files["app.js"].replace(/<[/]script/gi,"<\\/script");html=html.replace(/<script[^>]+src=["'][^"']*app[.]js["'][^>]*>[\\s\\S]*?<[/]script>/gi,"<script>"+jsText+"<\\/script>");}
  return html;
}
function salvarWorkspaceEngenharia(){
  criarPontoRestauracao("edição manual salva");
  sincronizarEditorEngenharia();
  persistirWorkspaceEngenharia();
  mostrarArquivoEngenharia(arquivoEngenhariaAtual); atualizarPreviewEngenharia(); atualizarWorkspaceStatus("Alterações salvas no Workspace local.","SALVO"); showToast("Arquivo salvo");
}
function atualizarResultadoWorkspace(resultado,etapa){
  ultimoProjetoEngenharia=resultado;
  arquivoEngenhariaAtual=resultado.entry||arquivoEngenhariaAtual;
  workspaceEngenharia=atualizarWorkspace(workspaceEngenharia||criarWorkspace(resultado),resultado);
  abrirWorkspace(resultado);
  persistirWorkspaceEngenharia();
  atualizarWorkspaceStatus(etapa+" • "+(resultado.validacao?.estado||resultado.status||"concluído"),resultado.status);
}
function executarAcaoWorkspace(tipo){
  sincronizarEditorEngenharia();
  const files={...(ultimoProjetoEngenharia?.files||{})};
  try{
    let resultado;
    if(tipo==="analisar"){
      const a=Object.keys(files).length===1?analisarCodigo(Object.values(files)[0],Object.keys(files)[0]):analisarProjeto(files);
      atualizarWorkspaceStatus(relatorioAnalise(a).split("\\n").slice(0,4).join(" • "),a.valido?"ANÁLISE OK":"ACHADOS");
      const etapas=[...(ultimoProjetoEngenharia.historico||[]),{etapa:"ANALISAR",status:a.valido?"OK":"ACHADOS",score:a.score}];ultimoProjetoEngenharia={...ultimoProjetoEngenharia,files,analise:a,historico:etapas};atualizarPipelineEngenharia(etapas);return;
    }
    if(tipo==="corrigir"){
      criarPontoRestauracao("correção automática");
      const r=corrigirProjeto({files});resultado={...ultimoProjetoEngenharia,files:r.files,analise:r.depois,lastDiff:gerarDiffProjeto(files,r.files),diffResumo:resumoDiff(files,r.files),historico:[...(ultimoProjetoEngenharia.historico||[]),{etapa:"CORRIGIR",status:r.aplicado?"OK":"SEM_ALTERACOES",alteracoes:r.alteracoes||[]}]};
    }else if(tipo==="melhorar"){
      criarPontoRestauracao("melhoria automática");
      const r=aplicarMelhoriasSeguras({files});resultado={...ultimoProjetoEngenharia,files:r.files,analise:r.depois,lastDiff:gerarDiffProjeto(files,r.files),diffResumo:resumoDiff(files,r.files),historico:[...(ultimoProjetoEngenharia.historico||[]),{etapa:"MELHORAR",status:r.aplicado?"OK":"SEM_ALTERACOES"}]};
    }else if(tipo==="validar"){
      const a=analisarProjeto(files),v=validarProjeto(files);resultado={...ultimoProjetoEngenharia,files,analise:a,validacao:v,status:v.valido?(v.estado==="APROVADO"?"APROVADO":"APROVADO_COM_AVISOS"):"REPROVADO",ok:v.valido,historico:[...(ultimoProjetoEngenharia.historico||[]),{etapa:"VALIDAR",status:v.estado,score:v.score,bloqueadores:v.bloqueadores}]};
    }else if(tipo==="ciclo"){
      criarPontoRestauracao("ciclo de engenharia");
      resultado=executarCicloComAprendizado("Projeto editado no Workspace",{criar:false,files,maxCiclos:4});
      resultado={...resultado,lastDiff:gerarDiffProjeto(files,resultado.files),diffResumo:resumoDiff(files,resultado.files)};
    }
    if(resultado){atualizarResultadoWorkspace(resultado,tipo.toUpperCase());showToast(tipo.toUpperCase()+" concluído");}
  }catch(err){atualizarWorkspaceStatus("Erro: "+err.message,"ERRO");showToast("Erro: "+err.message);}
}
function atualizarPipelineEngenharia(etapas){
  const ordem=["CRIAR","ANALISAR","CORRIGIR","MELHORAR","VALIDAR","EXECUTAR"];const ultima=etapas.at(-1)?.etapa;
  document.querySelectorAll("#eng-pipeline [data-stage]").forEach(el=>{el.classList.remove("active","done");const i=ordem.indexOf(el.dataset.stage);if(i>=0&&ordem.indexOf(ultima)>=i)el.classList.add("done");if(el.dataset.stage===ultima)el.classList.add("active");});
}
function fecharWorkspace(){sincronizarEditorEngenharia();if(engineeringWorkspace)engineeringWorkspace.hidden=true;}
function executarNovoCicloWorkspace(){
  const pedido=window.prompt("O que o Guinho deve construir?");
  if(!pedido)return;
  try{const r=executarCicloComAprendizado(pedido);abrirWorkspace(r);add("bot",relatorioEngenharia(r));}
  catch(err){showToast("Erro no ciclo: "+err.message);}
}
function respostaEngenharia(texto){
  const arquivos=arquivosDaMensagem(texto);
  const temProjeto=Object.keys(arquivos).length>0;
  const arquivosAntes=temProjeto?arquivos:{};
  criarPontoRestauracao(temProjeto?"substituição por projeto fornecido":"novo projeto");
  const resultado=executarCicloComAprendizado(temProjeto?"Projeto fornecido pelo usuário":texto,{criar:!temProjeto,files:arquivos});
  resultado.lastDiff=gerarDiffProjeto(arquivosAntes,resultado.files);
  resultado.diffResumo=resumoDiff(arquivosAntes,resultado.files);
  if(resultado.ok)abrirWorkspace(resultado);
  const relatorio=relatorioEngenharia(resultado);
  const resumo=[
    "Projeto de engenharia concluído.",
    "Status: "+(resultado.status||"SEM RESULTADO"),
    "Arquivos: "+Object.keys(resultado.files||{}).length,
    "Análise: "+(resultado.analise?.score??0)+"/100",
    "Validação: "+(resultado.validacao?.estado||"não executada")+" ("+(resultado.validacao?.score??0)+"/100)",
    "Ciclos: "+(resultado.ciclos??0)
  ];
  if(resultado.plano?.tipo)resumo.push("Tipo: "+resultado.plano.tipo);
  if(resultado.diffResumo?.total)resumo.push("Alterações: "+resultado.diffResumo.total+" arquivo(s) • +"+resultado.diffResumo.criados.length+" criado(s) • ~"+resultado.diffResumo.alterados.length+" alterado(s) • -"+resultado.diffResumo.removidos.length+" removido(s)");
  if(!resultado.ok){
    return resumo.join("\n")+"\n\nO ciclo foi interrompido com segurança. Abra o Workspace para ver os problemas e tentativas.";
  }
  const entry=resultado.files?.[resultado.entry]||"";
  const linguagem=resultado.entry?.endsWith(".js")?"javascript":resultado.entry?.endsWith(".css")?"css":"html";
  const limite=entry.length>12000?entry.slice(0,11997)+"...":entry;
  const fence="```";
  return resumo.join("\n")+"\n\nCódigo gerado em "+resultado.entry+":\n\n"+fence+linguagem+"\n"+limite+"\n"+fence+"\n\nO Workspace de Engenharia foi aberto para editar, executar, corrigir e validar o projeto.";
}

function respostaValidacao(texto){
  const arquivos=arquivosDaMensagem(texto);
  if(!Object.keys(arquivos).length)return "Para validar, cole o código ou projeto na mensagem. O VALIDAR verifica entrada, estrutura, referências, PWA e os achados do ANALYZE.";
  const resultado=validarProjeto(arquivos);
  return relatorioValidacao(resultado);
}

function respostaMelhoria(texto,aplicar=false){
  const arquivos=arquivosDaMensagem(texto);
  if(!Object.keys(arquivos).length)return "Para melhorar, cole o código na mensagem. O MELHORAR procura oportunidades de performance, mobile, acessibilidade, robustez, UX, games e PWA.";
  const resultado=aplicar?aplicarMelhoriasSeguras(arquivos):sugerirMelhorias(arquivos);
  return relatorioMelhorias(resultado);
}

function respostaAnalise(texto){
  const arquivos=arquivosDaMensagem(texto);
  if(!Object.keys(arquivos).length)return "Para fazer a análise, cole o código na mensagem. Posso auditar HTML, CSS e JavaScript e verificar DOM, eventos, Canvas, mobile, PWA, segurança e performance.";
  const resultado=Object.keys(arquivos).length===1
    ? analisarCodigo(Object.values(arquivos)[0],Object.keys(arquivos)[0])
    : analisarProjeto(arquivos);
  return relatorioAnalise(resultado);
}
class GeradorRespostaEstruturada{
  constructor({pnl,recuperador,memoria,gerador}){this.pnl=pnl;this.recuperador=recuperador;this.memoria=memoria;this.gerador=gerador;}
  recuperar(consulta,analise){
    const resultados=this.recuperador.recuperar(consulta,8);
    const frases=this.recuperador.frasesRelevantes(consulta,8,12);
    const limiar=analise.confident?.62:.72;
    return {
      documentos:resultados.filter(x=>x.score>=.08),
      frases:frases.filter(x=>x.score>=.16&&x.score>=limiar*.22)
    };
  }
  deduplicar(frases){
    const vistos=new Set();
    return frases.filter(x=>{
      const chave=this.pnl.normalizar(x.frase);
      if(!chave||vistos.has(chave))return false;
      vistos.add(chave);return true;
    });
  }
  estruturar(consulta,analise){
    const recuperado=this.recuperar(consulta,analise);
    const {documentos}=recuperado;
    if(!documentos.length)return null;
    const frases=this.deduplicar(recuperado.frases);
    const melhor=documentos[0];
    const tema=melhor.titulo||melhor.tema||"o assunto";
    const tipo=analise.tipo||"geral";
    const linhas=[];
    const corpo=frases.slice(0,tipo==="lista"?4:tipo==="como"?3:2);

    if(tipo==="definicao"){
      linhas.push("Em termos simples, "+tema+" é "+this.compactar(melhor.texto||corpo[0]?.frase||"um conceito da base local.")+".");
    }else if(tipo==="como"){
      linhas.push("Funciona assim:");
      corpo.forEach((x,i)=>linhas.push((i+1)+". "+this.limparFrase(x.frase)));
    }else if(tipo==="lista"){
      linhas.push("Os pontos principais são:");
      corpo.forEach(x=>linhas.push("• "+this.limparFrase(x.frase)));
    }else if(tipo==="comparacao"){
      linhas.push("A comparação depende do aspecto considerado.");
      corpo.forEach(x=>linhas.push("• "+this.limparFrase(x.frase)));
    }else if(tipo==="por_que"){
      linhas.push("O ponto central é:");
      corpo.forEach(x=>linhas.push(this.limparFrase(x.frase)));
    }else{
      linhas.push(corpo.length?corpo.map(x=>this.limparFrase(x.frase)).join(" "):this.compactar(melhor.texto||""));
    }

    const assunto=melhor.titulo||melhor.tema;
    this.memoria.definirAssunto(assunto);
    const confianca=Number(melhor.score||0);
    if(confianca>=.25&&tipo!=="geral")linhas.push("","Se quiser, posso aprofundar esse ponto ou mostrar um exemplo.");
    return {texto:linhas.join("\n"),assunto,fontes:documentos.slice(0,3).map(x=>x.titulo),confianca};
  }
  limparFrase(frase){
    return String(frase||"").replace(/^\s*[•*-]\s*/,"").trim();
  }
  compactar(texto){
    return this.limparFrase(String(texto||"").replace(/\s+/g," ").trim());
  }
  gerar(consulta,analise){
    const resultado=this.estruturar(consulta,analise);
    if(!resultado)return null;
    const fontes=[...new Set(resultado.fontes.filter(Boolean))].slice(0,3);
    const texto=fontes.length
      ? resultado.texto+"\n\nFonte local: "+fontes.join(" • ")
      : resultado.texto;
    return {...resultado,texto};
  }
}

const geradorResposta=new GeradorRespostaEstruturada({pnl,recuperador,memoria,gerador});


class CalculadoraSegura{
  constructor(){this.precedencia={"+":1,"-":1,"*":2,"/":2,"%":2,"u-":3};}
  tokenizar(s){return s.replace(/,/g,".").match(/\d+(?:\.\d+)?|[()+\-*/%]/g)||[];}
  resolver(expr){
    const limpo=expr.replace(/\s/g,"").replace(/,/g,".");
    const tokens=this.tokenizar(limpo);
    if(!tokens.length||tokens.join("")!==limpo)return null;
    const vals=[],ops=[];let espera=true;
    const aplicar=()=>{
      const op=ops.pop();
      if(op==="u-"){if(!vals.length)throw new Error("Expressão inválida");vals.push(-vals.pop());return;}
      const b=vals.pop(),a=vals.pop();
      if(!Number.isFinite(a)||!Number.isFinite(b))throw new Error("Expressão inválida");
      if(op==="/"&&b===0)throw new Error("Divisão por zero");
      vals.push(op==="+"?a+b:op==="-"?a-b:op==="*"?a*b:op==="/" ? a/b:a%b);
    };
    for(const t of tokens){
      if(/^\d/.test(t)){vals.push(Number(t));espera=false;continue;}
      if(t==="("){ops.push(t);espera=true;continue;}
      if(t===")"){while(ops.length&&ops.at(-1)!=="(")aplicar();if(ops.pop()!=="(")throw new Error("Parênteses inválidos");espera=false;continue;}
      if(espera&&t==="-"){ops.push("u-");continue;}
      if(espera)throw new Error("Operador inesperado");
      while(ops.length&&ops.at(-1)!=="("&&this.precedencia[ops.at(-1)]>=this.precedencia[t])aplicar();
      ops.push(t);espera=true;
    }
    if(espera)throw new Error("Expressão incompleta");
    while(ops.length){if(ops.at(-1)==="(")throw new Error("Parênteses inválidos");aplicar();}
    return vals.length===1?vals[0]:null;
  }
}
const calc=new CalculadoraSegura();
const gerarRespostaEstruturada=(texto,analise)=>geradorResposta.gerar(texto,analise);


const api={
  async moeda(){
    const r=await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL");
    if(!r.ok)throw new Error("A cotação está indisponível no momento.");
    const d=await r.json();
    const usd=Number(d.USDBRL?.bid),eur=Number(d.EURBRL?.bid);
    return `Agora, a cotação está em aproximadamente R$ ${usd.toFixed(4)} para US$ 1 e R$ ${eur.toFixed(4)} para € 1.`;
  },
  async noticias(){
    const r=await fetch("https://servicodados.ibge.gov.br/api/v3/noticias/?qtd=3");
    if(!r.ok)throw new Error("As notícias do IBGE estão indisponíveis.");
    const d=await r.json();
    const items=(d.items||[]).slice(0,3);
    if(!items.length)return "O IBGE não retornou notícias agora.";
    return "As três manchetes mais recentes que recebi do IBGE são:\n\n"+items.map((x,i)=>`${i+1}) ${x.titulo}\n${x.introducao||""}\n${x.link||""}`).join("\n\n");
  },
  async tempo(texto){
    let lat=-23.5505,lon=-46.6333,nome="São Paulo";
    const nums=texto.match(/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/);
    if(nums){lat=Number(nums[1]);lon=Number(nums[2]);nome=`${lat}, ${lon}`;}
    const u=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m&timezone=auto`;
    const r=await fetch(u);
    if(!r.ok)throw new Error("O serviço de clima está indisponível.");
    const d=await r.json();
    return `Em ${nome}, a temperatura atual é ${d.current?.temperature_2m??"?"} °C e o vento está em ${d.current?.wind_speed_10m??"?"} km/h.`;
  },
  async cep(texto){
    const m=texto.match(/\b\d{5}-?\d{3}\b/);
    if(!m)return "Envie um CEP com 8 dígitos, por exemplo 01001000.";
    const c=m[0].replace(/\D/g,"");
    const r=await fetch(`https://viacep.com.br/ws/${c}/json/`);
    if(!r.ok)throw new Error("O ViaCEP está indisponível.");
    const d=await r.json();
    if(d.erro)return "Não encontrei esse CEP.";
    return `Encontrei este endereço: ${d.logradouro||"logradouro não informado"}, ${d.bairro||"bairro não informado"}, ${d.localidade||"cidade não informada"} - ${d.uf||"UF não informada"}.`;
  }
};

function extrairMemoria(texto){
  const nome=texto.match(/(?:meu nome é|meu nome e|me chamo|sou o|sou a)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,50})$/i);
  if(nome)memoria.definirUsuario("nome",nome[1].trim().replace(/\s+/g," "));
  const cidade=texto.match(/(?:moro em|sou de|estou em)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,50})$/i);
  if(cidade)memoria.definirUsuario("cidade",cidade[1].trim());
}

function memoriaReply(){
  const r=memoria.resumo();
  return r?"Eu me lembro, nesta sessão, de:\n"+r:"Ainda não guardei informações pessoais nesta sessão.";
}

function intencaoEspecial(analise,texto){
  if(analise.intent==="saudacao")return "Olá. Eu sou o Guinho-Bot. Eu analiso a linguagem localmente, procuro evidências na minha base e uso probabilidades para decidir como responder.";
  if(analise.intent==="despedida")return "Até mais. Quando voltar, a base local estará disponível novamente.";
  if(analise.intent==="agradecimento")return "De nada. Fico por aqui para a próxima pergunta.";
  if(analise.intent==="ajuda")return "Posso conversar usando a base local, recuperar conceitos por similaridade, calcular, lembrar informações desta sessão e consultar moeda, notícias, clima e CEP.";
  if(analise.intent==="jogos")return "A biblioteca de jogos está disponível no Guinho-Bot. Ela reúne MakeCode Arcade, microStudio e TIC-80, além de Kenney, OpenGameArt, Itch.io, Piskel e Pixelorama.\n\nPara o primeiro protótipo de movimentação em SVG, a referência visual será o Piskel e a referência de lógica será o MakeCode Arcade.\n\nUse a seção Biblioteca de Jogos na interface para abrir os recursos.";
  if(analise.intent==="memoria")return memoriaReply();
  if(analise.intent==="matematica"){
    const q=pnl.normalizar(texto);
    const bh=q.match(/bhaskara\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/);
    if(bh){const [a,b,c]=bh.slice(1).map(Number);if(a===0)return "Para Bhaskara, a precisa ser diferente de zero.";const delta=b*b-4*a*c;if(delta<0)return `O discriminante é ${delta}, então não há raízes reais.`;return `O discriminante é ${delta}. As raízes são aproximadamente x₁=${(-b+Math.sqrt(delta))/(2*a)} e x₂=${(-b-Math.sqrt(delta))/(2*a)}.`;}
    const trecho=texto.replace(/^.*?(calcule|quanto é|quanto e)\s*/i,"").trim();
    try{const n=calc.resolver(trecho);if(n!==null)return `O resultado é ${n}.`;}catch(err){return err.message;}
    return "Consigo resolver expressões e Bhaskara. Exemplo: bhaskara 1 -5 6.";
  }
  return null;
}

function ehComandoLocal(texto){
  return /^\s*\/(pnl|diagnostico|analisar|corrigir|melhorar|validar|ajuda|moeda|noticias|tempo)\b/i.test(String(texto||""));
}

function ehPerguntaGeralParaIA(texto,analise,perfil={}){
  if(analise?.intent==="programacao"){
    const tarefas=["criar","corrigir","analisar","diagnosticar","melhorar","validar"];
    const localmenteGeravel=!perfil.linguagem||perfil.linguagem==="JavaScript";
    if(tarefas.includes(analise.objetivo)&&perfil.linguagem&&!localmenteGeravel)return true;
  }
  if(ehComandoLocal(texto))return false;
  if(pedidoDeCodigo(texto))return false;
  const dominiosLocais=new Set(["moeda","noticias","tempo","cep","matematica","memoria","jogos"]);
  if(dominiosLocais.has(analise?.intent))return false;
  if(["criar","corrigir","analisar","diagnosticar","melhorar","validar"].includes(analise?.objetivo)
    &&["jogos","programacao"].includes(analise?.intent))return false;
  return true;
}

function historicoParaIA(){
  return memoria.historico()
    .slice(-12)
    .filter(item=>item?.role==="user"||item?.role==="assistant")
    .map(item=>({role:item.role,content:String(item.content||"").slice(0,12000)}));
}

async function consultarIAOnline(texto){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),AI_CHAT_TIMEOUT_MS);
  try{
    const mensagens=historicoParaIA();
    if(!mensagens.length||mensagens.at(-1)?.content!==texto){
      mensagens.push({role:"user",content:texto});
    }
    const response=await fetch(AI_CHAT_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({messages:mensagens.slice(-12)}),
      signal:controller.signal
    });
    const data=await response.json().catch(()=>null);
    const content=typeof data?.content==="string"?data.content.trim():"";
    if(!response.ok||data?.ok!==true||!content)return null;
    return {content,provider:data.provider||"openai",model:data.model||""};
  }catch{
    return null;
  }finally{
    clearTimeout(timer);
  }
}

async function consultarIAEngenharia(texto,runtime=null){
  if(!workspaceEngenharia||!Object.keys(workspaceEngenharia.files||{}).length)return null;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),AI_CHAT_TIMEOUT_MS);
  try{
    const mensagens=historicoParaIA();
    if(!mensagens.length||mensagens.at(-1)?.content!==texto)mensagens.push({role:"user",content:texto});
    const response=await fetch(AI_CHAT_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        mode:"engineering",
        messages:mensagens.slice(-12),
        workspace:{
          name:workspaceEngenharia.nome||"Projeto Guinho",
          language:workspaceEngenharia.linguagem||"JavaScript",
          files:workspaceEngenharia.files,
          runtime:runtime||workspaceEngenharia.runtime||null
        }
      }),
      signal:controller.signal
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok||data?.ok!==true||data?.mode!=="engineering"||!data.patch)return null;
    return data.patch;
  }catch{
    return null;
  }finally{
    clearTimeout(timer);
  }
}

async function tentarAutocorrecaoRuntime(resultado){
  if(!deveAutocorrigirRuntime({
    temWorkspace:Boolean(workspaceEngenharia),
    estado:resultado?.estado||"ERRO",
    tentativas:runtimeAutofixAttempts,
    emExecucao:runtimeAutofixRunning
  }))return false;
  runtimeAutofixRunning=true;
  runtimeAutofixAttempts=proximaTentativaRuntime(runtimeAutofixAttempts);
  const tentativa=runtimeAutofixAttempts;
  atualizarRuntimeStatus("CORRIGINDO","IA analisando erro de runtime","tentativa "+tentativa+"/"+MAX_RUNTIME_AUTOFIX);
  const pedido=construirPedidoAutocorrecao(resultado||{});
  try{
    const patch=await consultarIAEngenharia(pedido,resultado);
    if(!patch?.files?.length){
      atualizarRuntimeStatus("ERRO","IA não produziu uma correção aplicável","tentativa "+tentativa+"/"+MAX_RUNTIME_AUTOFIX);
      return false;
    }
    const resposta=aplicarPatchIAEngenharia(patch,pedido);
    if(!resposta){
      atualizarRuntimeStatus("ERRO","patch de autocorreção rejeitado","tentativa "+tentativa+"/"+MAX_RUNTIME_AUTOFIX);
      return false;
    }
    atualizarRuntimeStatus("EXECUTANDO","retestando após autocorreção","tentativa "+tentativa+"/"+MAX_RUNTIME_AUTOFIX);
    return true;
  }catch{
    atualizarRuntimeStatus("ERRO","falha na autocorreção","tentativa "+tentativa+"/"+MAX_RUNTIME_AUTOFIX);
    return false;
  }finally{
    runtimeAutofixRunning=false;
  }
}

function patchEngenhariaSeguro(patch,files){
  if(!patch||!Array.isArray(patch.files)||patch.files.length>8)return false;
  const vistos=new Set();
  for(const item of patch.files){
    const path=String(item?.path||"");
    const action=String(item?.action||"");
    if(!path||path.length>180||path.startsWith("/")||path.includes("\\")||path.split("/").includes(".."))return false;
    if(path===".env"||path.startsWith(".env.")||path.startsWith(".git/")||path.startsWith("node_modules/"))return false;
    if(!["create","update","delete"].includes(action)||vistos.has(path))return false;
    vistos.add(path);
    if(action==="create"&&Object.prototype.hasOwnProperty.call(files,path))return false;
    if((action==="update"||action==="delete")&&!Object.prototype.hasOwnProperty.call(files,path))return false;
    if(typeof item?.content!=="string"||item.content.length>16000)return false;
  }
  return true;
}

function aplicarPatchIAEngenharia(patch,pedido){
  const antes={...(workspaceEngenharia?.files||{})};
  if(!patchEngenhariaSeguro(patch,antes))return null;
  const files={...antes};
  for(const item of patch.files){
    if(item.action==="delete")delete files[item.path];
    else files[item.path]=item.content;
  }
  const resultado=executarCicloComAprendizado(pedido,{
    criar:false,
    files,
    maxCiclos:4
  });
  const depois=resultado.files||files;
  const delta=gerarDiffProjeto(antes,depois);
  const deltaResumo=resumoDiff(antes,depois);
  const enriquecido={
    ...resultado,
    lastDiff:delta,
    diffResumo:deltaResumo,
    patchResumo:patch.summary||"Alteração aplicada.",
    proximaTarefa:patch.next_task||"Executar uma nova auditoria antes da próxima alteração."
  };
  ultimoProjetoEngenharia=enriquecido;
  workspaceEngenharia=atualizarWorkspace(workspaceEngenharia||criarWorkspace(enriquecido),{
    ...enriquecido,
    files:enriquecido.files,
    lastDiff:delta,
    diffResumo:deltaResumo
  });
  salvarWorkspace(workspaceEngenharia);
  if(resultado.ok)abrirWorkspace(enriquecido);
  else{
    ultimoProjetoEngenharia=enriquecido;
    abrirWorkspace(enriquecido);
  }
  const alterados=deltaResumo.alterados.length,criados=deltaResumo.criados.length,removidos=deltaResumo.removidos.length;
  const linhas=[
    "ALTERAÇÃO DE PROJETO CONCLUÍDA",
    "Status: "+(resultado.status||"SEM RESULTADO"),
    "Resumo: "+(patch.summary||"patch aplicado"),
    "Arquivos: "+Object.keys(depois).length,
    "Mudanças: "+(criados+alterados+removidos)+" • criados="+criados+" • alterados="+alterados+" • removidos="+removidos,
    "Validação: "+(resultado.validacao?.estado||"não executada")+" ("+(resultado.validacao?.score??0)+"/100)"
  ];
  if(patch.next_task)linhas.push("Próxima tarefa: "+patch.next_task);
  if(delta)linhas.push("\nDiff disponível no Workspace de Engenharia.");
  return linhas.join("\n");
}

async function responder(texto){
  ultimaOrigemResposta="local";
  extrairMemoria(texto);
  const limpo=texto.replace(/^\/(ajuda|moeda|noticias|tempo|pnl|diagnostico|analisar|corrigir|melhorar|validar)\b/i,"$1").trim();
  if(/^validar\b|^valide\b|^validacao\b|^validação\b/i.test(limpo)){
    const alvo=limpo.replace(/^(validar|valide|validacao|validação)\b/i,"").trim();
    const r=respostaValidacao(alvo);
    contexto.atualizar({texto:limpo,resposta:r,analise:pnl.detectar(limpo),estrategia:"validacao",assunto:memoria.estado.assuntoAtual});
    return r;
  }
  if(/^melhorar\b|^melhore\b/i.test(limpo)){
    const aplicar=/\b(aplicar|aplique|automatize|automaticamente)\b/i.test(limpo);
    const alvo=limpo.replace(/^(melhorar|melhore)\b/i,"").replace(/\b(aplicar|aplique|automatize|automaticamente)\b/ig,"").trim();
    const r=respostaMelhoria(alvo,aplicar);
    contexto.atualizar({texto:limpo,resposta:r,analise:pnl.detectar(limpo),estrategia:"melhoria",assunto:memoria.estado.assuntoAtual});
    return r;
  }
  if(/^corrigir\b|^corrija\b/i.test(limpo)){
    const alvo=limpo.replace(/^(corrigir|corrija)\b/i,"").trim();
    const r=respostaCorrecao(alvo);
    contexto.atualizar({texto:limpo,resposta:r,analise:pnl.detectar(limpo),estrategia:"correcao",assunto:memoria.estado.assuntoAtual});
    return r;
  }
    if(/^analisar\b/i.test(limpo)){
    const alvo=limpo.replace(/^analisar\b/i,"").trim();
    const r=respostaAnalise(alvo);
    contexto.atualizar({texto:limpo,resposta:r,analise:pnl.detectar(limpo),estrategia:"diagnostico",assunto:memoria.estado.assuntoAtual});
    return r;
  }
    if(/^pnl\b|^diagnostico\b/i.test(limpo)){
    const alvo=limpo.replace(/^(pnl|diagnostico)\b/i,"").trim()||texto;
    const rel=pnl.explicar(alvo);
    const est=pnl.detectar(alvo);
    const estrategia=gerador.estrategia(est);
    const perfil=perfilPergunta(alvo);
    return `Diagnóstico local:
Intenção: ${rel.intencao}
Confiança combinada: ${(rel.confianca*100).toFixed(1)}%
Probabilidade bruta: ${(rel.probabilidadeBruta*100).toFixed(1)}%
Margem: ${(rel.margem*100).toFixed(1)}%
Entropia: ${rel.entropia.toFixed(2)}
Ambiguidade: ${rel.ambigua?"sim":"não"}
Tipo: ${rel.tipo}
Objetivo: ${rel.objetivo}
Estratégia: ${estrategia.estrategia}
Domínios da biblioteca: ${Object.keys(perfil.dominios).slice(0,5).join(", ")||"nenhum"}
Intenções reforçadas: ${Object.keys(perfil.intencoes).slice(0,5).join(", ")||"nenhuma"}
Formatos detectados: ${Object.keys(perfil.formatos).join(", ")||"nenhum"}

Probabilidades:
${rel.probabilidades.slice(0,5).map(x=>`${x.intent}: ${(x.probability*100).toFixed(1)}%`).join("\n")}

Objetivos:
${rel.objetivos.slice(0,4).map(x=>`${x.objetivo}: ${(x.probability*100).toFixed(1)}%`).join("\n")}`;
  }
  const textoContextual=contexto.referencia(limpo,pnl);
  const analise=pnl.detectar(textoContextual,contexto.resumo());
  const perfilProgramador=construirPerfilProgramador(textoContextual,{
    contexto:contexto.resumo(),
    historico:memoria.historico()
  });
  if(!ehConversaProgramacao(limpo,perfilProgramador)){
    const r="Eu sou o Guinho, seu companheiro de programação. Posso ajudar a criar, explicar, corrigir, analisar e melhorar código. Me conte o que você quer construir ou qual problema quer resolver.";
    contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"escopo-programacao",assunto:memoria.estado.assuntoAtual});
    return r;
  }
  if(ehPerguntaGeralParaIA(limpo,analise,perfilProgramador)){

    const online=await consultarIAOnline(limpo);
    if(online){
      ultimaOrigemResposta="openai";
      contexto.atualizar({texto:limpo,resposta:online.content,analise,estrategia:"ia-online",assunto:memoria.estado.assuntoAtual});
      return online.content;
    }
    ultimaOrigemResposta="local-fallback";
  }
  if(analise.confident&&analise.intent==="moeda"){const r=await api.moeda();contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"conversa"});return r;}
  if(analise.confident&&analise.intent==="noticias"){const r=await api.noticias();contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"explicacao"});return r;}
  if(analise.confident&&analise.intent==="tempo"){const r=await api.tempo(limpo);contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"explicacao"});return r;}
  if(analise.confident&&analise.intent==="cep"){const r=await api.cep(limpo);contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"explicacao"});return r;}
  const pedidoEngenharia = ["criar","corrigir","analisar","diagnosticar","melhorar","validar"].includes(analise.objetivo)
    && ["jogos","programacao"].includes(analise.intent);
  const criacaoConcreta = analise.objetivo==="criar"
    && (pedidoDeCodigo(limpo) || perfilProgramador.linguagem || perfilProgramador.tecnologia || perfilProgramador.tipoProjeto);

  if(workspaceEngenharia && pedidoEngenharia && ["criar","corrigir","melhorar","analisar","diagnosticar"].includes(analise.objetivo)){
    const patch=await consultarIAEngenharia(limpo);
    if(patch){
      ultimaOrigemResposta="openai";
      const r=aplicarPatchIAEngenharia(patch,limpo);
      if(r){
        contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"agente-ia-patch",assunto:memoria.estado.assuntoAtual});
        return r;
      }
    }
    ultimaOrigemResposta="local-fallback";
  }

  if(criacaoConcreta && (!perfilProgramador.linguagem || perfilProgramador.linguagem==="JavaScript")){
    const r=respostaEngenharia(limpo);
    contexto.atualizar({
      texto:limpo,
      resposta:r,
      analise:{...analise,entidades:{...(analise.entidades||{}),linguagem:perfilProgramador.linguagem,tecnologia:perfilProgramador.tecnologia,tipoProjeto:perfilProgramador.tipoProjeto}},
      estrategia:"agente-criar-projeto",
      assunto:memoria.estado.assuntoAtual
    });
    return r;
  }

  if(analise.confident&&analise.objetivo==="validar"&&["jogos","programacao"].includes(analise.intent)){
    const r=respostaValidacao(limpo);
    contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"validacao",assunto:memoria.estado.assuntoAtual});
    return r;
  }
  if(analise.confident&&analise.objetivo==="melhorar"&&["jogos","programacao"].includes(analise.intent)){
    const r=respostaMelhoria(limpo,false);
    contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"melhoria",assunto:memoria.estado.assuntoAtual});
    return r;
  }
  if(analise.confident&&(analise.objetivo==="analisar"||analise.objetivo==="diagnosticar")&&["jogos","programacao"].includes(analise.intent)){
    const r=respostaAnalise(limpo);
    contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"diagnostico",assunto:memoria.estado.assuntoAtual});
    return r;
  }
  if(pedidoEngenharia && ["corrigir","analisar","diagnosticar","melhorar"].includes(analise.objetivo)){
    const r=respostaEngenharia(limpo);
    contexto.atualizar({
      texto:limpo,
      resposta:r,
      analise,
      estrategia:"agente-engenharia",
      assunto:memoria.estado.assuntoAtual
    });
    return r;
  }

  const falaGuinho=respostaElizaProgramacao(limpo,perfilProgramador);
  if(falaGuinho){
    contexto.atualizar({
      texto:limpo,
      resposta:falaGuinho,
      analise:{...analise,entidades:{...(analise.entidades||{}),linguagem:perfilProgramador.linguagem,tecnologia:perfilProgramador.tecnologia,tipoProjeto:perfilProgramador.tipoProjeto}},
      estrategia:"conversa-programacao",
      assunto:memoria.estado.assuntoAtual
    });
    return falaGuinho;
  }
  if((pedidoDeCodigo(limpo)||(analise.confident&&analise.objetivo==="criar"))&&["jogos","programacao"].includes(analise.intent)
    &&(!perfilProgramador.linguagem||perfilProgramador.linguagem==="JavaScript")){

    const r=respostaEngenharia(limpo);
    contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"engenharia",assunto:memoria.estado.assuntoAtual});
    return r;
  }
  
  function respostaNaturalFallback(texto,analise){
  ultimaOrigemResposta=ultimaOrigemResposta==="local-fallback"?"local-fallback":"local";
  const resultado=geradorResposta.gerar(texto,analise);
  if(!resultado)return null;
  contexto.atualizar({texto,resposta:resultado.texto,analise,estrategia:gerador.estrategia(analise).estrategia,assunto:resultado.assunto});
  return resultado.texto;
}

const especial=analise.confident?intencaoEspecial(analise,limpo):null;
  if(especial){contexto.atualizar({texto:limpo,resposta:especial,analise,estrategia:gerador.estrategia(analise).estrategia,assunto:memoria.estado.assuntoAtual});return especial;}
  const natural=respostaNaturalFallback(textoContextual,analise);
  if(natural)return natural;
  const r=analise.confident
    ? "Eu não encontrei evidência suficiente na base local para responder com segurança. Tente acrescentar o assunto, uma definição ou o contexto da pergunta."
    : "Ainda estou dividido entre algumas interpretações. Se você acrescentar o objetivo ou a tecnologia envolvida, consigo direcionar melhor a resposta.";
  contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:gerador.estrategia(analise).estrategia,assunto:memoria.estado.assuntoAtual});
  return r;
}

function adaptarModo(resposta){
  if(ultimaOrigemResposta==="openai")return resposta;
  if(modoAtual==="standard")return resposta;
  if(modoAtual==="resumido"){
    const partes=resposta.split(/\n\n+/).filter(Boolean);
    const texto=partes[0]||resposta;
    return texto.length>620?texto.slice(0,617).trimEnd()+"...":texto;
  }
  if(modoAtual==="passo"){
    const partes=resposta.replace(/\n+/g," ").split(/(?<=[.!?])\s+/).filter(Boolean);
    if(partes.length<2)return resposta;
    return partes.slice(0,6).map((p,i)=>`${i+1}. ${p}`).join("\n");
  }
  if(modoAtual==="criativo"){
    return "Vamos olhar para isso por outro ângulo.\n\n"+resposta;
  }
  if(modoAtual==="detalhado"){
    return resposta+"\n\nModo detalhado: a resposta acima foi composta a partir das evidências locais recuperadas e da intenção identificada pelo motor probabilístico.";
  }
  return resposta;
}

function showToast(message){
  if(!toast)return;
  toast.textContent=message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer=setTimeout(()=>toast.classList.remove("show"),2200);
}

function closeDrawer(){
  leftSidebar?.classList.remove("open");
  rightSidebar?.classList.remove("open");
  drawerOverlay?.classList.remove("show");
}
function openDrawer(){
  rightSidebar?.classList.remove("open");
  leftSidebar?.classList.add("open");
  drawerOverlay?.classList.add("show");
}
function openToolsDrawer(){
  leftSidebar?.classList.remove("open");
  rightSidebar?.classList.add("open");
  drawerOverlay?.classList.add("show");
}

function resetChat(){
  memoria.limpar();
  contexto.limpar();
  chat.innerHTML="";
  add("bot","Nova conversa iniciada. A sessão de memória foi limpa e o motor local está pronto.");
  input?.focus();
  showToast("Nova conversa iniciada");
}

function runCommand(value){
  if(!input)return;
  input.value=value;
  input.dispatchEvent(new Event("input"));
  form.requestSubmit();
}

function inserirQuebraAuto(){
  if(!input)return;
  input.style.height="auto";
  input.style.height=Math.min(input.scrollHeight,140)+"px";
}

function renderTextoMensagem(box,text){
  const fence="```";
  const partes=String(text??"").split(fence);
  partes.forEach((parte,index)=>{
    if(index%2===1){
      const primeiraQuebra=parte.indexOf("\n");
      const linguagem=primeiraQuebra>=0?parte.slice(0,primeiraQuebra).trim():"";
      const codigo=primeiraQuebra>=0?parte.slice(primeiraQuebra+1):parte;
      const pre=document.createElement("pre");
      const code=document.createElement("code");
      if(linguagem)code.className="language-"+linguagem;
      code.textContent=codigo.trimEnd();
      pre.appendChild(code);box.appendChild(pre);
    }else if(parte){
      box.appendChild(document.createTextNode(parte));
    }
  });
}

function add(role,text){
  const el=document.createElement("div");el.className="line "+(role==="user"?"user":"bot");
  const meta=document.createElement("div");meta.className="meta";
  meta.textContent=role==="user"?"VOCÊ >":ultimaOrigemResposta==="openai"?"GUINHO • IA ONLINE >":"GUINHO • MOTOR LOCAL >";
  const box=document.createElement("div");box.className="bubble";
  const fonteIndex=text.indexOf("\n\nBase local:");
  if(role==="bot"&&fonteIndex>=0){
    const corpo=text.slice(0,fonteIndex);
    const fonte=text.slice(fonteIndex+2);
    renderTextoMensagem(box,corpo);
    const source=document.createElement("div");
    source.className="message-source";
    source.textContent=fonte;
    box.appendChild(source);
  }else{
    renderTextoMensagem(box,text);
  }
  el.append(meta,box);chat.appendChild(el);chat.scrollTop=chat.scrollHeight;
}
form.addEventListener("submit",async e=>{
  e.preventDefault();
  const texto=input.value.trim();
  if(!texto)return;
  add("user",texto);memoria.adicionar("user",texto);input.value="";
  buttons.forEach(b=>b.disabled=true);statusText.textContent="ANALISANDO";
  try{
    const respostaBruta=await responder(texto);
    const resposta=adaptarModo(respostaBruta);
    add("bot",resposta);
    memoria.adicionar("assistant",resposta);
    statusText.textContent=ultimaOrigemResposta==="openai"?"IA ONLINE":"MODO LOCAL";
    if(ultimaOrigemResposta==="local-fallback")showToast("IA online indisponível — usando o motor local.");
  }catch(err){
    ultimaOrigemResposta="local-fallback";
    add("bot","O serviço online não respondeu. O motor local permanece disponível, mas ocorreu um erro ao gerar a resposta local: "+(err?.message||"erro desconhecido"));
  }finally{
    buttons.forEach(b=>b.disabled=false);
    setTimeout(()=>{statusText.textContent=ultimaOrigemResposta==="openai"?"IA ONLINE":"LOCAL READY";},1800);
    input.focus();
  }
});
buttons.forEach(b=>b.addEventListener("click",()=>runCommand(b.dataset.cmd)));

selectedModes.forEach(mode=>{
  mode.addEventListener("click",()=>{
    modoAtual=mode.dataset.mode;
    selectedModes.forEach(x=>x.classList.toggle("active",x===mode));
    showToast("Modo: "+mode.querySelector("strong")?.textContent);
    input?.focus();
  });
});

topicButtons.forEach(button=>{
  button.addEventListener("click",()=>{
    const topico=button.dataset.topic;
    runCommand(`Explique ${topico} de forma clara.`);
    closeDrawer();
  });
});

navItems.forEach(item=>{
  item.addEventListener("click",()=>{
    navItems.forEach(x=>x.classList.toggle("active",x===item));
    const nav=item.dataset.nav;
    if(nav==="chat"){input?.focus();closeDrawer();return;}
    if(nav==="engineering"){if(ultimoProjetoEngenharia)abrirWorkspace(ultimoProjetoEngenharia);else executarNovoCicloWorkspace();closeDrawer();return;}
    if(nav==="history"){showToast("O histórico desta sessão aparece na conversa atual.");return;}
    if(nav==="favorites"){showToast("Favoritos locais ainda não foram criados nesta sessão.");return;}
    if(nav==="explore"){siteSearch?.focus();showToast("Use a busca para explorar a base local.");return;}
    if(nav==="settings"){showToast("Configurações locais: memória, modo e cache estão ativos.");}
  });
});

newChatButton?.addEventListener("click",()=>{resetChat();closeDrawer();});
clearChatButton?.addEventListener("click",resetChat);
focusInputButton?.addEventListener("click",()=>input?.focus());
openLeft?.addEventListener("click",openDrawer);
closeLeft?.addEventListener("click",closeDrawer);
openRight?.addEventListener("click",openToolsDrawer);
closeRight?.addEventListener("click",closeDrawer);
drawerOverlay?.addEventListener("click",closeDrawer);

siteSearch?.addEventListener("keydown",event=>{
  if(event.key==="Enter"){
    event.preventDefault();
    const q=siteSearch.value.trim();
    if(q)runCommand(`Pesquise na base local: ${q}`);
  }
});

document.addEventListener("keydown",event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){
    event.preventDefault();
    siteSearch?.focus();
  }
});

input?.addEventListener("input",inserirQuebraAuto);
input?.addEventListener("keydown",event=>{
  if(event.key==="Enter"&&!event.shiftKey){
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelector("#attach-placeholder")?.addEventListener("click",()=>showToast("Anexos ainda não estão conectados ao motor local."));
document.querySelector("#voice-placeholder")?.addEventListener("click",()=>showToast("Entrada de voz ainda não está conectada."));
engSave?.addEventListener("click",salvarWorkspaceEngenharia);
engAnalyze?.addEventListener("click",()=>executarAcaoWorkspace("analisar"));
engFix?.addEventListener("click",()=>executarAcaoWorkspace("corrigir"));
engImprove?.addEventListener("click",()=>executarAcaoWorkspace("melhorar"));
engValidate?.addEventListener("click",()=>executarAcaoWorkspace("validar"));
engCycle?.addEventListener("click",()=>executarAcaoWorkspace("ciclo"));
engEditor?.addEventListener("input",()=>{engEditor.dataset.dirty="true";atualizarWorkspaceStatus("Alterações não salvas.","EDITANDO");});
engClose?.addEventListener("click",fecharWorkspace);
engRun?.addEventListener("click",executarNovoCicloWorkspace);
engExecute?.addEventListener("click",executarProjetoNoSandbox);
engUndo?.addEventListener("click",desfazerUltimaAlteracao);
engPreviewButton?.addEventListener("click",executarProjetoNoSandbox);

if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js"));
historicoWorkspace=carregarHistoricoWorkspace();
restaurarWorkspaceEngenharia();
atualizarUndoUI();
const historico=memoria.historico();if(historico.length){historico.slice(-8).forEach(m=>add(m.role,m.content));}else add("bot","Sistema iniciado. Sou o Guinho, seu companheiro de programação. Posso conversar sobre projetos, reconhecer linguagens e tecnologias, criar e corrigir código, analisar problemas e sugerir ideias. Experimente: “quero criar um jogo”, “corrija este código em Python” ou “tenho uma ideia”.");
