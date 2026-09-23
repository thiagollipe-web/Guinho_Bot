export const MAX_WORKSPACE_SNAPSHOTS=10;
export const WORKSPACE_HISTORY_KEY="guinho-workspace-history-v1";

function clonarArquivos(files={}){return Object.fromEntries(Object.entries(files).map(([nome,conteudo])=>[String(nome),String(conteudo??"")]));}

export function criarSnapshot(workspace={},motivo="alteração"){
  return {
    id:String(Date.now())+"-"+Math.random().toString(36).slice(2,8),
    motivo:String(motivo||"alteração").slice(0,200),
    criadoEm:Date.now(),
    files:clonarArquivos(workspace.files||{}),
    entry:String(workspace.entry||Object.keys(workspace.files||{})[0]||"index.html"),
    nome:String(workspace.nome||"Projeto Guinho"),
    plano:workspace.plano||null
  };
}

export function registrarSnapshot(historico=[],snapshot,max=MAX_WORKSPACE_SNAPSHOTS){
  const limite=Math.max(1,Math.min(50,Number(max)||MAX_WORKSPACE_SNAPSHOTS));
  const atual=Array.isArray(historico)?historico:[];
  return [...atual,snapshot].slice(-limite);
}

export function desfazerWorkspace(workspace={},historico=[]){
  const lista=Array.isArray(historico)?historico:[];
  const snapshot=lista.at(-1);
  if(!snapshot)return null;
  return {
    ...workspace,
    files:clonarArquivos(snapshot.files||{}),
    entry:snapshot.entry||workspace.entry,
    nome:snapshot.nome||workspace.nome,
    plano:snapshot.plano||workspace.plano,
    status:"RESTAURADO",
    ok:false,
    runtime:null,
    ultimaEtapa:"UNDO",
    undoMotivo:snapshot.motivo||"alteração"
  };
}

export function removerUltimoSnapshot(historico=[]){
  const lista=Array.isArray(historico)?historico:[];
  return lista.slice(0,-1);
}

export function salvarHistoricoWorkspace(historico=[],storage=globalThis.localStorage){
  if(!storage)return false;
  try{storage.setItem(WORKSPACE_HISTORY_KEY,JSON.stringify(historico));return true;}catch{return false;}
}

export function carregarHistoricoWorkspace(storage=globalThis.localStorage){
  if(!storage)return [];
  try{
    const raw=storage.getItem(WORKSPACE_HISTORY_KEY);
    if(!raw)return [];
    const data=JSON.parse(raw);
    return Array.isArray(data)?data.slice(-MAX_WORKSPACE_SNAPSHOTS):[];
  }catch{return [];}
}

export function limparHistoricoWorkspace(storage=globalThis.localStorage){
  try{storage?.removeItem(WORKSPACE_HISTORY_KEY);return true;}catch{return false;}
}

export function resumoHistoricoWorkspace(historico=[]){
  const lista=Array.isArray(historico)?historico:[];
  if(!lista.length)return "Nenhum ponto de restauração.";
  return lista.slice().reverse().slice(0,5).map((x,i)=>
    (i+1)+". "+(x.motivo||"alteração")+" • "+new Date(Number(x.criadoEm)||Date.now()).toLocaleString("pt-BR")+" • "+Object.keys(x.files||{}).length+" arquivo(s)"
  ).join("\n");
}
