const CHANNEL="guinho-sandbox-runtime-v1";

export function criarTokenRuntime(seed=Math.random()){
  const base=String(seed)+":"+Date.now()+":"+Math.random();
  let h=2166136261;
  for(const ch of base){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16)+"-"+Date.now().toString(36);
}

function escaparScript(valor){
  return JSON.stringify(String(valor)).replace(/<\\/script/gi,"<\\\\/script");
}

export function montarDocumentoSandbox(html,token){
  const seguro=String(html??"");
  const csp='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src \'none\'; form-action \'none\'; frame-src \'none\'; object-src \'none\'; base-uri \'none\';">';
  const bridge='<script>(function(){const CHANNEL='+JSON.stringify(CHANNEL)+',TOKEN='+escaparScript(token)+';const send=(type,data)=>{try{parent.postMessage({channel:CHANNEL,token:TOKEN,type,...data},\"*\")}catch{}};window.addEventListener("error",e=>send("error",{message:String(e.message||"Erro de runtime"),source:String(e.filename||""),line:Number(e.lineno)||0,column:Number(e.colno)||0}));window.addEventListener("unhandledrejection",e=>send("unhandledrejection",{message:String(e.reason?.message||e.reason||"Promise rejeitada")}));const originalError=console.error;console.error=(...args)=>{send("console-error",{message:args.map(x=>typeof x==="string"?x:JSON.stringify(x)).join(" ")});originalError.apply(console,args)};window.addEventListener("DOMContentLoaded",()=>send("ready",{title:document.title||"Projeto Guinho"}));})();</script>';
  const lower=seguro.toLowerCase();
  let documento=seguro;
  if(lower.includes("<head")) documento=documento.replace(/<head([^>]*)>/i,(_,attrs)=>"<head"+attrs+">"+csp);
  else documento=csp+documento;
  if(documento.toLowerCase().includes("<body")){
    documento=documento.replace(/<body([^>]*)>/i,(_,attrs)=>"<body"+attrs+">"+bridge);
    if(!documento.toLowerCase().includes(bridge.toLowerCase()) && !documento.match(/<\/body>/i))documento+=bridge;
  }else if(/<\/head>/i.test(documento)){
    documento=documento.replace(/<\/head>/i,"</head>"+bridge);
  }else{
    documento+=bridge;
  }
  return documento;
}

export function validarEventoRuntime(event,sourceWindow,token){
  const data=event?.data;
  return Boolean(event?.source===sourceWindow&&data&&data.channel===CHANNEL&&data.token===String(token));
}

export function interpretarEventoRuntime(data){
  if(!data||typeof data!=="object")return null;
  if(data.type==="ready")return {estado:"OK",mensagem:"Projeto executado sem erro de runtime detectado na inicialização.",detalhes:data.title||""};
  if(data.type==="error")return {estado:"ERRO",mensagem:String(data.message||"Erro de JavaScript"),detalhes:[data.source&&String(data.source),data.line&&("linha "+data.line),data.column&&("coluna "+data.column)].filter(Boolean).join(" • ")};
  if(data.type==="unhandledrejection")return {estado:"ERRO",mensagem:"Promise rejeitada sem tratamento: "+String(data.message||"sem detalhes"),detalhes:"unhandledrejection"};
  if(data.type==="console-error")return {estado:"ERRO",mensagem:String(data.message||"console.error detectado"),detalhes:"console.error"};
  return null;
}

export { CHANNEL };
