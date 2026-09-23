const EXTENSION_INDEX={".js":".js",".mjs":".mjs",".cjs":".cjs",".ts":".ts",".tsx":".tsx",".jsx":".jsx",".css":".css",".html":".html",".htm":".html",".json":".json",".py":".py"};
const MAX_FILES=80;
const MAX_FILE_CHARS=120000;
const MAX_TOTAL_CHARS=1200000;

function normalizarCaminho(path=""){
  const bruto=String(path||"").replace(/\\/g,"/").replace(/^\.\//,"");
  const partes=[];
  for(const parte of bruto.split("/")){
    if(!parte||parte===".")continue;
    if(parte==="..")return null;
    partes.push(parte);
  }
  return partes.join("/");
}
function extensao(path=""){const m=String(path).toLowerCase().match(/\.[a-z0-9]+$/);return m?m[0]:"";}
function candidatosLocal(base,target){
  const t=normalizarCaminho(target);if(!t)return [];
  const dir=base.includes("/")?base.slice(0,base.lastIndexOf("/")+1):"";
  const raw=normalizarCaminho(dir+t);if(!raw)return [];
  const ext=extensao(raw);
  const out=[raw];
  if(!ext)for(const e of [".js",".mjs",".ts",".tsx",".jsx",".py",".css",".json",".html"])out.push(raw+e);
  out.push(raw+"/index.js",raw+"/index.ts",raw+"/index.html");
  return [...new Set(out)];
}
function resolver(files,base,target){
  const mapa=new Set(Object.keys(files||{}).map(normalizarCaminho).filter(Boolean));
  return candidatosLocal(base,target).find(x=>mapa.has(x))||null;
}
function extrairDependencias(nome,codigo){
  const deps=[];
  const add=(tipo,valor)=>{const v=String(valor||"").trim();if(v&&(/^(\.|\/)/.test(v)))deps.push({tipo,alvo:v});};
  const texto=String(codigo||"");
  if(/\.(?:js|mjs|cjs|ts|tsx|jsx)$/i.test(nome)){
    for(const m of texto.matchAll(/\b(?:import|export)\s+(?:[^"'\n]*?\s+from\s+)?["']([^"']+)["']/g))add("import",m[1]);
    for(const m of texto.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g))add("dynamic-import",m[1]);
    for(const m of texto.matchAll(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/g))add("require",m[1]);
  }
  if(/\.css$/i.test(nome))for(const m of texto.matchAll(/@import\s+(?:url\()?["']?([^"')\s]+)["']?/g))add("css-import",m[1]);
  if(/\.html?$/i.test(nome)){
    for(const m of texto.matchAll(/<(?:script|link)[^>]+(?:src|href)=["']([^"']+)["']/gi))add("html-reference",m[1]);
    for(const m of texto.matchAll(/url\(["']?([^"')]+)["']?\)/gi))add("asset",m[1]);
  }
  if(/\.py$/i.test(nome))for(const m of texto.matchAll(/^\s*(?:from|import)\s+([A-Za-z_][\w.]*)/gm)){const alvo=m[1];if(alvo.startsWith("."))deps.push({tipo:"python-import",alvo});}
  return deps;
}
export function analisarDependencias(files={}){
  const graph={};
  const problemas=[];
  const nomes=Object.keys(files||{});
  for(const nome of nomes){
    graph[nome]=extrairDependencias(nome,files[nome]).map(dep=>{
      const resolvido=resolver(files,nome,dep.alvo);
      return {...dep,resolvido};
    });
    for(const dep of graph[nome]){
      if(!dep.resolvido)problemas.push({arquivo:nome,tipo:"dependencia-ausente",alvo:dep.alvo,dependencia:dep.tipo});
    }
  }
  const dependentes={};
  for(const [arquivo,deps] of Object.entries(graph))for(const dep of deps)if(dep.resolvido)(dependentes[dep.resolvido]??=[]).push(arquivo);
  return {graph,dependentes,problemas,total:nomes.length,comProblemas:problemas.length>0};
}
export function arquivosRelacionados(files,nome){
  const analise=analisarDependencias(files);
  const relacionados=new Set([nome]);
  for(const dep of analise.graph[nome]||[])if(dep.resolvido)relacionados.add(dep.resolvido);
  for(const [arquivo,dependentes] of Object.entries(analise.dependentes))if(arquivo===nome)dependentes.forEach(x=>relacionados.add(x));
  return [...relacionados];
}
export function validarDependencias(files){
  const analise=analisarDependencias(files);
  return {ok:!analise.comProblemas,score:analise.comProblemas?Math.max(0,100-analise.problemas.length*15):100,...analise};
}
export function normalizarArquivosImportados(entries=[]){
  const files={};const rejeitados=[];let total=0;
  for(const entry of entries){
    const nome=normalizarCaminho(entry?.path||entry?.name||"");
    const content=String(entry?.content??"");
    if(!nome){rejeitados.push({nome:entry?.name||"",motivo:"caminho inválido"});continue;}
    if(nome.startsWith(".git/")||nome==="package-lock.json"||nome.includes("/node_modules/")||nome.startsWith("node_modules/")){rejeitados.push({nome,motivo:"arquivo de dependência/controle não importado"});continue;}
    if(content.length>MAX_FILE_CHARS){rejeitados.push({nome,motivo:"arquivo excede o limite"});continue;}
    if(Object.prototype.hasOwnProperty.call(files,nome)){rejeitados.push({nome,motivo:"arquivo duplicado"});continue;}
    if(Object.keys(files).length>=MAX_FILES){rejeitados.push({nome,motivo:"limite de arquivos"});continue;}
    total+=content.length;
    if(total>MAX_TOTAL_CHARS){rejeitados.push({nome,motivo:"limite total do projeto"});break;}
    files[nome]=content;
  }
  return {files,rejeitados,totalChars:total,dependencias:validarDependencias(files)};
}
export { MAX_FILES, MAX_FILE_CHARS, MAX_TOTAL_CHARS, normalizarCaminho };
