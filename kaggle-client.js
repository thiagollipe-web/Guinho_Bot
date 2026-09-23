const MAX_KAGGLE_QUERY=240;
const MAX_RESULTS=6;

function compactQuery(text){
  return String(text||"").replace(/\s+/g," ").trim().slice(0,MAX_KAGGLE_QUERY);
}

function decode(value){
  if(typeof value!=="string") return value;
  try{return JSON.parse(value);}catch{return value;}
}

function extractContent(result){
  const content=result?.result?.content||result?.content;
  if(!Array.isArray(content)) return [];
  return content.map(x=>decode(x?.text)).filter(Boolean);
}

function collectObjects(value,out=[],depth=0){
  if(depth>5||value==null)return out;
  if(Array.isArray(value)){
    for(const item of value)collectObjects(item,out,depth+1);
    return out;
  }
  if(typeof value!=="object")return out;
  const keys=Object.keys(value);
  if(keys.some(k=>["ref","title","name","url"].includes(k)))out.push(value);
  for(const item of Object.values(value))collectObjects(item,out,depth+1);
  return out;
}

function pick(value,keys){
  for(const key of keys){
    if(value?.[key]!=null&&String(value[key]).trim())return String(value[key]).trim();
  }
  return "";
}

function formatDate(value){
  if(!value)return "";
  const date=new Date(value);
  return Number.isNaN(date.getTime())?String(value):new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium"}).format(date);
}

function formatItems(result,tool,query){
  const items=collectObjects(extractContent(result));
  const seen=new Set();
  const unique=items.filter(item=>{
    const id=pick(item,["ref","url","id","title","name"]);
    if(!id||seen.has(id))return false;
    seen.add(id);
    return true;
  }).slice(0,MAX_RESULTS);
  if(!unique.length)return "";

  const kind=tool==="search_competitions"?"COMPETIÇÕES":tool==="search_notebooks"?"NOTEBOOKS":tool==="search_models"?"MODELOS":"DATASETS";
  const lines=[`KAGGLE • ${kind}`,`Busca: ${query}`,""];
  unique.forEach((item,index)=>{
    const title=pick(item,["title","name"])||"Recurso sem título";
    const ref=pick(item,["ref","fullPath","full_path","slug"]);
    const owner=pick(item,["ownerRef","owner_ref","ownerName","owner_name","creatorName","creator_name"]);
    const url=pick(item,["url","webUrl","web_url"]);
    const updated=pick(item,["lastUpdated","last_updated","updatedAt","updated_at"]);
    lines.push(`${index+1}. ${title}`);
    if(ref)lines.push(`   Ref: ${owner?owner+"/":""}${ref}`);
    if(updated)lines.push(`   Atualizado: ${formatDate(updated)}`);
    if(url)lines.push(`   ${url}`);
    lines.push("");
  });
  lines.push(`Mostrando ${unique.length} resultado(s).`);
  return lines.join("\n");
}

function fallbackText(result){
  const content=result?.result?.content||result?.content;
  if(!Array.isArray(content))return "";
  return content.map(x=>typeof x?.text==="string"?x.text:"").filter(Boolean).join("\n").trim().slice(0,10000);
}

export async function consultarKaggle(action,name,argumentsObject={}){
  const response=await fetch("/api/kaggle",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action,name,arguments:argumentsObject})
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.ok!==true)return null;
  return data.result;
}

export function detectarIntencaoKaggle(texto){
  const q=compactQuery(texto).toLowerCase();
  if(!q)return null;
  const explicit=/\\bkaggle\\b/.test(q);
  const dataset=/\\b(dataset|datasets|conjunto de dados|base de dados)\\b/.test(q);
  const competition=/\\b(competição|competicoes|competições|competition|competitions)\\b/.test(q);
  const model=/\\b(modelo|modelos|model|models|llm)\\b/.test(q);
  const notebook=/\\b(notebook|notebooks)\\b/.test(q);
  if(!(explicit||dataset||competition||model||notebook))return null;
  return {
    type:competition?"competition":model?"model":notebook?"notebook":"dataset",
    query:q
  };
}

export async function pesquisarKaggle(texto){
  const intent=detectarIntencaoKaggle(texto);
  if(!intent)return null;
  let tool=intent.type==="competition"?"search_competitions":intent.type==="notebook"?"search_notebooks":"search_datasets";
  if(intent.type==="model"){
    const catalog=await consultarKaggle("tools");
    const tools=catalog?.tools||[];
    const found=tools.find(x=>/^search_.*models?$/i.test(String(x?.name||"")));
    if(!found)return null;
    tool=found.name;
  }
  const result=await consultarKaggle("call",tool,{request:{search:intent.query}});
  if(!result)return null;
  const text=formatItems(result,tool,intent.query)||fallbackText(result);
  if(!text)return null;
  return {text,tool};
}
