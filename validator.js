import { analisarProjeto } from "./analyzer.js";

const PESOS={critica:4,alta:3,media:2,baixa:1,info:0};

function achado(lista,severidade,categoria,mensagem,evidencia="",acao=""){
  lista.push({severidade,categoria,mensagem,evidencia,acao});
}

function uniq(lista){return [...new Set(lista.filter(Boolean))];}

function validarReferencias(arquivos,lista){
  const nomes=new Set(Object.keys(arquivos));
  const htmlNomes=Object.keys(arquivos).filter(n=>/\.html?$/i.test(n));
  for(const nome of htmlNomes){
    const html=String(arquivos[nome]||"");
    for(const m of html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)=["']([^"']+)["']/gi)){
      const alvo=m[1].split("?")[0].split("#")[0].replace(/^\.\//,"");
      if(!alvo||/^(?:https?:|data:|mailto:|tel:|#)/i.test(alvo))continue;
      if(!nomes.has(alvo))achado(lista,"alta","Integração","HTML referencia um arquivo que não existe.",nome+" → "+m[1],"Criar o arquivo referenciado ou corrigir o caminho.");
    }
  }
}

function validarManifest(arquivos,lista){
  if(!arquivos["manifest.json"])return;
  let manifest;
  try{manifest=JSON.parse(String(arquivos["manifest.json"]));}
  catch{return;}
  for(const campo of ["name","short_name","start_url","display"]){
    if(!manifest[campo])achado(lista,"media","PWA","Manifest sem campo recomendado: "+campo,"manifest.json","Completar os metadados do aplicativo.");
  }
  if(!manifest.icons||!Array.isArray(manifest.icons)||!manifest.icons.length){
    achado(lista,"baixa","PWA","Manifest sem ícones detectáveis.","manifest.json","Adicionar ícones adequados ao aplicativo.");
  }
}

function validarServiceWorker(arquivos,lista){
  const sw=String(arquivos["service-worker.js"]||"");
  if(!sw)return;
  if(!/addEventListener\s*\(\s*["']install["']/i.test(sw))achado(lista,"media","PWA","Service Worker sem evento install detectável.","service-worker.js","Implementar instalação do cache.");
  if(!/addEventListener\s*\(\s*["']activate["']/i.test(sw))achado(lista,"media","PWA","Service Worker sem evento activate detectável.","service-worker.js","Implementar ativação e limpeza de caches.");
  if(!/addEventListener\s*\(\s*["']fetch["']/i.test(sw))achado(lista,"media","PWA","Service Worker sem evento fetch detectável.","service-worker.js","Implementar estratégia de interceptação de recursos se o modo offline exigir.");
}

function validarHTMLPrincipal(arquivos,lista,entrada){
  const html=String(arquivos[entrada]||"");
  if(!html) {
    achado(lista,"critica","Projeto","Arquivo de entrada não encontrado.",entrada,"Definir um entry válido e existente.");
    return;
  }
  if(!/^\s*<!doctype html>/i.test(html))achado(lista,"alta","HTML","Arquivo de entrada sem DOCTYPE.","Entrada","Adicionar <!doctype html>.");
  if(!/<html\b[^>]*>/i.test(html)||!/<\/html>/i.test(html))achado(lista,"critica","HTML","Estrutura HTML raiz inválida.","Entrada","Corrigir a estrutura do documento.");
  if(!/<head\b/i.test(html)||!/<body\b/i.test(html))achado(lista,"alta","HTML","Entrada sem head/body completos.","Entrada","Garantir head e body.");
  if(!/<meta[^>]+name=["']viewport["']/i.test(html))achado(lista,"alta","Mobile","Entrada sem viewport.","Entrada","Adicionar meta viewport.");
}

function validarEstrutura(arquivos,lista){
  for(const [nome,codigo] of Object.entries(arquivos)){
    const texto=String(codigo??"");
    if(!texto.trim())achado(lista,"alta","Projeto","Arquivo vazio.","Arquivo: "+nome,"Preencher o arquivo ou removê-lo do projeto.");
    if(/\u0000/.test(texto))achado(lista,"alta","Integridade","Arquivo contém byte NUL.","Arquivo: "+nome,"Remover conteúdo binário inválido de arquivo textual.");
  }
}

export function validarProjeto(projeto={},opcoes={}){
  const arquivos=projeto.files&&typeof projeto.files==="object"?projeto.files:projeto;
  const entrada=opcoes.entry||projeto.entry||"index.html";
  const achados=[];
  const nomes=Object.keys(arquivos||{});
  if(!nomes.length)achado(achados,"critica","Projeto","Nenhum arquivo foi fornecido.","Projeto vazio","Gerar ou fornecer os arquivos do projeto.");
  validarEstrutura(arquivos||{},achados);
  validarReferencias(arquivos||{},achados);
  if(nomes.some(n=>/\.html?$/i.test(n)))validarHTMLPrincipal(arquivos,achados,entrada);
  validarManifest(arquivos||{},achados);
  validarServiceWorker(arquivos||{},achados);

  const analise=analisarProjeto(arquivos||{});
  const combinados=[...analise.achados,...achados].sort((a,b)=>(PESOS[b.severidade]??0)-(PESOS[a.severidade]??0));
  const contagem={critica:0,alta:0,media:0,baixa:0,info:0};
  for(const item of combinados)contagem[item.severidade]=(contagem[item.severidade]||0)+1;
  const bloqueadores=contagem.critica+contagem.alta;
  const score=Math.max(0,100-(contagem.critica*35+contagem.alta*18+contagem.media*8+contagem.baixa*2));
  const valido=bloqueadores===0;
  const estado=valido?(contagem.media===0?"APROVADO":"APROVADO COM AVISOS"):"REPROVADO";
  return {
    valido,estado,score,entrada,
    resumo:{arquivos:nomes.length,linhas:analise.resumo?.linhas??0,contagem},
    bloqueadores,
    achados:combinados,
    analise,
    criterios:{
      entrada:!!arquivos[entrada],
      estrutura:!combinados.some(x=>x.categoria==="HTML"&&x.severidade==="critica"),
      integridade:!combinados.some(x=>x.categoria==="Integridade"),
      referencias:!combinados.some(x=>x.categoria==="Integração"&&x.severidade==="alta")
    },
    recomendacoes:uniq(combinados.slice(0,8).map(x=>x.acao||x.correcao))
  };
}

export function validarCodigo(codigo,nome="index.html"){
  return validarProjeto({[nome]:String(codigo||"")},{entry:nome});
}

export function relatorioValidacao(resultado){
  const r=resultado||{};
  const c=r.resumo?.contagem||{};
  const linhas=[
    "VALIDAÇÃO FINAL: "+(r.estado||"SEM RESULTADO"),
    "Score: "+(r.score??0)+"/100",
    "Entrada: "+(r.entrada||"não definida"),
    "Arquivos: "+(r.resumo?.arquivos??0)+" • Linhas: "+(r.resumo?.linhas??0),
    "Críticos: "+(c.critica||0)+" • Altos: "+(c.alta||0)+" • Médios: "+(c.media||0)+" • Baixos: "+(c.baixa||0)
  ];
  if(r.bloqueadores)linhas.push("Bloqueadores: "+r.bloqueadores);
  for(const item of (r.achados||[]).slice(0,10)){
    linhas.push("["+String(item.severidade||"info").toUpperCase()+"] "+item.categoria+": "+item.mensagem);
    if(item.evidencia)linhas.push("Evidência: "+item.evidencia);
    if(item.acao||item.correcao)linhas.push("Ação: "+(item.acao||item.correcao));
  }
  if(r.recomendacoes?.length)linhas.push("Prioridades: "+r.recomendacoes.slice(0,5).join(" • "));
  return linhas.join("\n");
}
