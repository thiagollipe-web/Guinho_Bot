const CHAVE="guinho-project-workspace-v1";

const PRIORIDADE_LINGUAGEM={
  "JavaScript":10,"TypeScript":10,"Python":10,"Java":10,"C#":10,"C++":10,"C":10,"Rust":10,"Go":10,"PHP":10,"Ruby":10,"Kotlin":10,"Swift":10,"Dart":10,"Lua":10,"Shell":10,"SQL":9,"CSS":6,"HTML":2,"JSON":1
};

const EXTENSOES={
  ".js":"JavaScript",".mjs":"JavaScript",".cjs":"JavaScript",".ts":"TypeScript",".tsx":"TypeScript",
  ".py":"Python",".java":"Java",".cs":"C#",".cpp":"C++",".c":"C",".rs":"Rust",".go":"Go",
  ".php":"PHP",".rb":"Ruby",".kt":"Kotlin",".swift":"Swift",".dart":"Dart",".lua":"Lua",
  ".html":"HTML",".css":"CSS",".json":"JSON",".sql":"SQL",".sh":"Shell"
};

function texto(valor){return String(valor??"").trim();}
function linguagemDosArquivos(files={}){
  const contagem={};
  for(const nome of Object.keys(files)){
    const m=nome.toLowerCase().match(/\.[a-z0-9]+$/);
    if(!m)continue;
    const linguagem=EXTENSOES[m[0]];
    if(linguagem)contagem[linguagem]=(contagem[linguagem]||0)+1;
  }
  return Object.entries(contagem)
    .sort((a,b)=>(b[1]-a[1])||(PRIORIDADE_LINGUAGEM[b[0]]||0)-(PRIORIDADE_LINGUAGEM[a[0]]||0))[0]?.[0]||"JavaScript";
}
function nomeProjeto(plano={},files={}){
  if(texto(plano.nome))return texto(plano.nome);
  if(texto(plano.tipo))return texto(plano.tipo);
  if(Object.keys(files).some(x=>x==="game.js"||x==="player.js"))return "Projeto de Jogo";
  return "Projeto Guinho";
}
export function criarWorkspace(resultado={}){
  const files={...(resultado.files||{})};
  return {
    versao:1,
    nome:nomeProjeto(resultado.plano,files),
    objetivo:texto(resultado.objetivo||resultado.plano?.estrategia||"Construir projeto"),
    linguagem:linguagemDosArquivos(files),
    entry:resultado.entry||Object.keys(files)[0]||"index.html",
    files,
    status:resultado.status||"AGUARDANDO",
    ok:Boolean(resultado.ok),
    plano:resultado.plano||null,
    ultimaEtapa:resultado.historico?.at(-1)?.etapa||null,
    historico:Array.isArray(resultado.historico)?resultado.historico.slice(-40):[],
    problemas:resultado.memoria?.problemas||[],
    proximasTarefas:gerarProximasTarefas({files,...resultado}),
    atualizadoEm:Date.now()
  };
}
export function gerarProximasTarefas(projeto={}){
  const files=projeto.files||{};
  const tarefas=[];
  if(Object.keys(files).length===0)tarefas.push("Criar o primeiro arquivo do projeto");
  if(files["index.html"]&&files["app.js"]&&!files["styles.css"])tarefas.push("Separar e organizar o estilo em styles.css");
  if(files["index.html"]&&!files["manifest.json"])tarefas.push("Adicionar PWA com manifest.json");
  if(files["index.html"]&&!files["service-worker.js"])tarefas.push("Adicionar cache offline com Service Worker");
  if((files["game.js"]||files["player.js"]||/jogo|game/i.test(String(projeto.plano?.tipo||"")))&&!files["enemies.js"])tarefas.push("Adicionar sistema de inimigos");
  if(projeto.validacao&&!projeto.validacao.valido)tarefas.unshift("Resolver os bloqueadores encontrados na validação");
  if(projeto.ok)tarefas.push("Executar uma nova auditoria antes da próxima funcionalidade");
  return [...new Set(tarefas)].slice(0,5);
}
export function atualizarWorkspace(workspace={},patch={}){
  const atual={...workspace,...patch,files:{...(workspace.files||{}),...(patch.files||{})}};
  atual.linguagem=patch.linguagem||linguagemDosArquivos(atual.files);
  atual.proximasTarefas=gerarProximasTarefas(atual);
  atual.atualizadoEm=Date.now();
  return atual;
}
export function salvarWorkspace(workspace,storage=globalThis.localStorage){
  if(!storage)return false;
  try{storage.setItem(CHAVE,JSON.stringify(workspace));return true;}catch{return false;}
}
export function carregarWorkspace(storage=globalThis.localStorage){
  if(!storage)return null;
  try{
    const raw=storage.getItem(CHAVE);
    if(!raw)return null;
    const data=JSON.parse(raw);
    if(!data||typeof data!=="object"||typeof data.files!=="object")return null;
    return atualizarWorkspace(data);
  }catch{return null;}
}
export function limparWorkspace(storage=globalThis.localStorage){
  try{storage?.removeItem(CHAVE);return true;}catch{return false;}
}
export function resumoWorkspace(workspace={}){
  const tarefas=(workspace.proximasTarefas||[]).slice(0,3);
  return [
    "PROJETO: "+(workspace.nome||"Projeto Guinho"),
    "Linguagem: "+(workspace.linguagem||"não definida"),
    "Arquivos: "+Object.keys(workspace.files||{}).length,
    "Status: "+(workspace.status||"AGUARDANDO"),
    "Próximas tarefas: "+(tarefas.length?tarefas.join(" • "):"nenhuma registrada")
  ].join("\n");
}
export { CHAVE };
