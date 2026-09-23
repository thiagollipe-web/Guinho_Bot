import { analisarDependencias, normalizarCaminho } from "./project-dependencies.js";
import { gerarArvoreProjeto } from "./project-tree.js";

export const MAX_INTELLIGENCE_FILES = 80;
export const MAX_INTELLIGENCE_FILE_CHARS = 120000;
export const MAX_INTELLIGENCE_TOTAL_CHARS = 1200000;
export const MAX_CONTEXT_FILES = 14;
export const MAX_CONTEXT_CHARS = 52000;

const LANGUAGE_BY_EXT = {
  js:"JavaScript",mjs:"JavaScript",cjs:"JavaScript",jsx:"JavaScript",
  ts:"TypeScript",tsx:"TypeScript",py:"Python",java:"Java",cs:"C#",
  cpp:"C++",c:"C",rs:"Rust",go:"Go",php:"PHP",rb:"Ruby",kt:"Kotlin",
  swift:"Swift",dart:"Dart",lua:"Lua",html:"HTML",htm:"HTML",css:"CSS",
  json:"JSON",sql:"SQL",sh:"Shell"
};

function ext(path=""){ return String(path).toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || ""; }
function isProtected(path){
  return path === ".env" || path.startsWith(".env.") || path.startsWith(".git/") || path.startsWith("node_modules/");
}
function scoreFile(path, content, request, entry, deps){
  const q=String(request||"").toLowerCase();
  let score=0;
  if(path===entry) score+=50;
  if(path.endsWith(".html")) score += /(ui|tela|página|pagina|layout|frontend|html|visual|botão|botao)/i.test(q) ? 20 : 0;
  if(/\.(js|mjs|cjs|ts|tsx|jsx)$/.test(path)) score += /(javascript|typescript|script|lógica|logica|evento|função|funcao|api|jogo|player|inimigo)/i.test(q) ? 18 : 0;
  if(path.endsWith(".css")) score += /(css|estilo|visual|layout|responsiv|design|tela)/i.test(q) ? 18 : 0;
  for(const token of q.split(/[^a-z0-9áéíóúãõç_./-]+/i).filter(x=>x.length>=4).slice(0,16)){
    if(path.toLowerCase().includes(token)) score+=8;
  }
  score += Math.min(15,(deps.dependents?.[path]||[]).length*3);
  score += Math.min(10,(deps.graph?.[path]||[]).filter(x=>x.resolvido).length*2);
  score += Math.min(8,Math.floor(String(content||"").length/4000));
  return score;
}

export function validateProjectSnapshot(payload={}){
  const files=payload?.files;
  if(!files || typeof files!=="object" || Array.isArray(files))
    return {ok:false,status:400,error:"Snapshot de projeto inválido."};
  const names=Object.keys(files);
  if(names.length>MAX_INTELLIGENCE_FILES)
    return {ok:false,status:413,error:"Snapshot excede o limite de arquivos."};
  let total=0;
  const normalized={};
  for(const rawPath of names){
    const path=normalizarCaminho(rawPath);
    if(!path || path!==rawPath || path.length>180 || path.startsWith("/") || path.includes("\\") || path.split("/").includes(".."))
      return {ok:false,status:400,error:"Caminho inválido no snapshot."};
    if(isProtected(path))
      return {ok:false,status:400,error:"Arquivo protegido não pode entrar no snapshot."};
    if(typeof files[rawPath]!=="string")
      return {ok:false,status:400,error:"Todos os arquivos devem conter texto."};
    if(files[rawPath].length>MAX_INTELLIGENCE_FILE_CHARS)
      return {ok:false,status:413,error:"Arquivo excede o limite permitido."};
    total+=files[rawPath].length;
    if(total>MAX_INTELLIGENCE_TOTAL_CHARS)
      return {ok:false,status:413,error:"Snapshot excede o tamanho total permitido."};
    normalized[path]=files[rawPath];
  }
  return {ok:true,project:{...payload,files:normalized}};
}

export function buildProjectIntelligence(payload={}){
  const validation=validateProjectSnapshot(payload);
  if(!validation.ok)return validation;
  const project=validation.project;
  const files=project.files;
  const names=Object.keys(files);
  const deps=analisarDependencias(files);
  const languages=[...new Set(names.map(ext).map(x=>LANGUAGE_BY_EXT[x]).filter(Boolean))];
  const entry=(typeof project.entry==="string" && files[project.entry]) ? project.entry
    : files["index.html"] ? "index.html"
    : names.find(x=>/^((src\/)?)(main|app|index)\.(js|mjs|ts|tsx|jsx|py)$/i.test(x)) || names[0] || null;
  const metadata=names.map(path=>({path,size:files[path].length,extension:ext(path),language:LANGUAGE_BY_EXT[ext(path)]||"desconhecida"}));
  const hotspots=metadata.map(item=>({path:item.path,score:scoreFile(item.path,files[item.path],project.request||"",entry,deps)})).sort((a,b)=>b.score-a.score).slice(0,12);
  return {ok:true,intelligence:{
    version:1,
    project:{name:String(project.name||"Projeto Guinho").slice(0,120),entry,files:names.length,totalChars:Object.values(files).reduce((n,x)=>n+x.length,0),languages},
    dependencies:{total:deps.total,broken:deps.problemas.length,ok:!deps.comProblemas,graph:deps.graph,dependents:deps.dependentes},
    diagnostics:deps.problemas.slice(0,20),
    hotspots,
    tree:gerarArvoreProjeto(files)
  }};
}

export function selectRelevantContext(payload={}, intelligence={}){
  const files=payload?.files||{};
  const request=String(payload?.request||"");
  const deps=intelligence?.dependencies||{};
  const entry=intelligence?.project?.entry;
  const candidates=Object.keys(files).map(path=>({path,score:scoreFile(path,files[path],request,entry,deps)})).sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path));
  const selected=new Set(candidates.slice(0,MAX_CONTEXT_FILES).map(x=>x.path));
  for(const path of [...selected]){
    for(const rel of [...(deps.graph?.[path]||[]),...(deps.dependents?.[path]||[])]){
      const p=typeof rel==="string"?rel:rel?.resolvido;
      if(p && files[p] && selected.size<MAX_CONTEXT_FILES)selected.add(p);
    }
  }
  let total=0;
  const context=[];
  for(const path of selected){
    const remaining=MAX_CONTEXT_CHARS-total;
    if(remaining<=0)break;
    const content=String(files[path]||"").slice(0,remaining);
    context.push({path,content});
    total+=content.length;
  }
  return {files:context,totalChars:total,candidates:candidates.slice(0,16)};
}

export function formatIntelligenceContext(intelligence,context){
  return {
    project:intelligence.project,
    diagnostics:intelligence.diagnostics,
    hotspots:intelligence.hotspots,
    dependencies:{broken:intelligence.dependencies.broken,graph:intelligence.dependencies.graph,dependents:intelligence.dependencies.dependents},
    relevant_files:context.files
  };
}
