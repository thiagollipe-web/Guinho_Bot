const MODELS={
  fast:{id:"qwen-0.5b",name:"Qwen2.5-Coder 0.5B",description:"Programação leve e respostas rápidas.",command:"/fast",provider:"local"},
  qwen:{id:"qwen-1.5b",name:"Qwen2.5-Coder 1.5B",description:"Programação e engenharia de software.",command:"/qwen",provider:"local"},
  nano:{id:"nemotron-4b",name:"NVIDIA Nemotron 3 Nano 4B",description:"Análise e tarefas mais complexas.",command:"/nano",provider:"local"}
};

export function listarModelos(){return Object.values(MODELS).map(model=>({...model}));}
export function obterModelo(id){const key=String(id||"").trim().toLowerCase();return MODELS[key]?{...MODELS[key]}:null;}
export function detectarComando(texto){
  const match=String(texto??"").trim().match(/^\\/(fast|qwen|nano|auto)\\b/i);
  return match?match[1].toLowerCase():null;
}
export function removerComando(texto){return String(texto??"").trim().replace(/^\\/(fast|qwen|nano|auto)\\b\\s*/i,"").trim();}
export function selecionarAutomaticamente(texto,{programacao=false,complexa=false}={}){
  const value=String(texto??"").toLowerCase();
  if(complexa||/\\b(arquitetura|refator|auditoria|diagn[oó]stico|projeto inteiro|depend[eê]ncia)\\b/.test(value))return "nano";
  if(programacao||/\\b(c[oó]digo|programa|programa[cç][aã]o|javascript|typescript|python|html|css|canvas|sql|bug|debug|fun[cç][aã]o|classe|algoritmo|react|node(?:\\.js)?)\\b/.test(value))return "qwen";
  return "fast";
}
export function resolverModelo(texto,opcoes={}){
  const command=detectarComando(texto);
  if(command&&command!=="auto")return {key:command,model:obterModelo(command),prompt:removerComando(texto),source:"command"};
  const prompt=command==="auto"?removerComando(texto):String(texto??"").trim();
  const key=selecionarAutomaticamente(prompt,opcoes);
  return {key,model:obterModelo(key),prompt,source:command==="auto"?"auto-command":"auto"};
}
export {MODELS};