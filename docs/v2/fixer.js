import { analisarProjeto } from "./analyzer.js";

function trocarPrimeira(texto,regex,replacement){
  const antes=String(texto);
  const depois=antes.replace(regex,replacement);
  return {texto:depois,alterado:antes!==depois};
}

function corrigirHTML(codigo,achados){
  let texto=String(codigo);
  const alteracoes=[];
  if(achados.some(a=>a.categoria==="Mobile"&&a.mensagem.includes("Viewport mobile"))&&!/name=["']viewport["']/i.test(texto)){
    texto=texto.replace(/<head\b[^>]*>/i,m=>m+'\n<meta name="viewport" content="width=device-width,initial-scale=1">');
    alteracoes.push("adicionou meta viewport");
  }
  if(achados.some(a=>a.categoria==="HTML"&&a.mensagem.includes("DOCTYPE"))&&!/^\s*<!doctype html>/i.test(texto)){
    texto="<!doctype html>\n"+texto;
    alteracoes.push("adicionou DOCTYPE");
  }
  if(achados.some(a=>a.categoria==="Canvas"&&a.mensagem.includes("requestAnimationFrame"))&&/<canvas\b/i.test(texto)&&!/<script\b/i.test(texto)){
    texto=texto.replace(/<\/body>/i,'<script>requestAnimationFrame(()=>{});</script>\n</body>');
    alteracoes.push("adicionou estrutura mínima de requestAnimationFrame");
  }
  return {texto,alteracoes};
}

function corrigirCSS(codigo,achados){
  let texto=String(codigo),alteracoes=[];
  if(achados.some(a=>a.categoria==="Mobile"&&a.mensagem.includes("100vh"))){
    texto=texto.replace(/\b100vh\b/g,"100dvh");
    if(texto!==codigo)alteracoes.push("substituiu 100vh por 100dvh em interface fixa");
  }
  if(achados.some(a=>a.categoria==="Acessibilidade"&&a.mensagem.includes("foco"))&&!/:focus-visible/i.test(texto)){
    texto += '\n\n:focus-visible{outline:3px solid currentColor;outline-offset:3px;}';
    alteracoes.push("adicionou foco visível");
  }
  return {texto,alteracoes};
}

function corrigirJavaScript(codigo,achados){
  let texto=String(codigo),alteracoes=[];
  if(achados.some(a=>a.categoria==="Segurança"&&a.mensagem.includes("eval()"))){
    texto=texto.replace(/\beval\s*\(([^)]*)\)/g,"String($1)");
    if(texto!==codigo)alteracoes.push("removeu eval e preservou o valor como texto");
  }
  if(achados.some(a=>a.categoria==="Segurança"&&a.mensagem.includes("new Function"))){
    texto=texto.replace(/\bnew\s+Function\s*\(([^)]*)\)/g,"(()=>{ throw new Error('Execucao dinamica removida pelo CORRIGIR'); })");
    if(texto!==codigo)alteracoes.push("removeu execução dinâmica com new Function");
  }
  if(achados.some(a=>a.categoria==="Qualidade"&&a.mensagem.includes("Logs"))){
    const antes=texto;
    texto=texto.replace(/^\s*console\.(?:log|debug|warn)\s*\([^;]*\);?\s*$/gm,"");
    if(texto!==antes)alteracoes.push("removeu logs de depuração");
  }
  return {texto,alteracoes};
}

export function corrigirProjeto(projeto={},opcoes={}){
  const arquivos={...(projeto.files&&typeof projeto.files==="object"?projeto.files:projeto)};
  const antes=analisarProjeto(arquivos);
  const alteracoes=[];
  const aplicados=[];
  for(const [nome,codigo] of Object.entries(arquivos)){
    const categorias=Array.isArray(opcoes.categorias)&&opcoes.categorias.length
      ? new Set(opcoes.categorias.map(String))
      : null;
    const achados=antes.achados.filter(a=>{
      const ev=String(a.evidencia||"");
      const mesmaCategoria=!categorias||categorias.has(String(a.categoria||""));
      return mesmaCategoria&&(!ev||ev.includes(nome)||Object.keys(arquivos).length===1);
    });
    let resultado={texto:String(codigo),alteracoes:[]};
    if(/\.html?$/i.test(nome))resultado=corrigirHTML(codigo,achados);
    else if(/\.css$/i.test(nome))resultado=corrigirCSS(codigo,achados);
    else if(/\.m?js$/i.test(nome))resultado=corrigirJavaScript(codigo,achados);
    arquivos[nome]=resultado.texto;
    for(const acao of resultado.alteracoes){
      alteracoes.push(nome+": "+acao);
      aplicados.push({arquivo:nome,acao});
    }
  }
  const depois=analisarProjeto(arquivos);
  const melhorou=depois.score>=antes.score;
  if(!melhorou&&!opcoes.permitirPiorar)return {
    aplicado:false,
    motivo:"A correção automática não melhorou a pontuação da análise; versão original preservada.",
    antes,depois:antes,files:projeto.files&&typeof projeto.files==="object"?{...projeto.files}:{...projeto},
    alteracoes:[]
  };
  return {
    aplicado:alteracoes.length>0,
    motivo:alteracoes.length?"Correções automáticas aplicadas e reanalisadas.":"Nenhuma correção automática segura foi identificada.",
    antes,depois,
    files:arquivos,
    alteracoes:aplicados
  };
}

export function relatorioCorrecao(resultado){
  if(!resultado)return "Nenhum resultado de correção.";
  const linhas=[
    resultado.aplicado?"CORREÇÃO APLICADA":"CÓDIGO ORIGINAL PRESERVADO",
    "Score: "+(resultado.antes?.score??0)+" → "+(resultado.depois?.score??0),
    "Alterações: "+(resultado.alteracoes?.length||0)
  ];
  for(const a of resultado.alteracoes||[])linhas.push("- "+a.arquivo+": "+a.acao);
  if(resultado.depois?.achados?.length){
    linhas.push("Achados restantes: "+resultado.depois.achados.length);
    for(const a of resultado.depois.achados.slice(0,5))linhas.push("["+String(a.severidade).toUpperCase()+"] "+a.categoria+": "+a.mensagem);
  }else{
    linhas.push("Validação estática: sem achados restantes.");
  }
  return linhas.join("\n");
}
