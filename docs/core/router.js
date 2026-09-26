import{normalize,detectIntent,extractEntities}from"./nlp.js";
import{runEliza}from"./eliza.js";
import{extractCalculation,calculate}from"./calculator.js";
export function route(input,{knowledge,memory,rules,references=[]}){
 const text=String(input??"").trim(),normalized=normalize(text);
 if(!text)return{response:"Digite alguma coisa.",source:"system"};
 if(/\b(?:fonte|fontes|link|links|referencia|referencias)\b/i.test(normalized)){
  const last=references.at(-1);return{response:last?.url?"Fonte: "+last.url:"Nenhuma fonte foi registrada nesta sessão.",source:"reference"}
 }
 if(/^(?:lembre|lembrar|guarde|guarda|memorize|memorizar|ensine|ensinar)\s+(?:que\s+)?/i.test(text)){
  const fact=normalized.replace(/^(?:lembre|lembrar|guarde|guarda|memorize|memorizar|ensine|ensinar)\s+(?:que\s+)?/,"");
  if(!fact)return{response:"Diga o que devo guardar.",source:"memory"};
  memory.remember(fact);return{response:"Certo. Vou guardar isso.",source:"memory"}
 }
 const forget=text.match(/^(?:esque(?:ca|ça)|apague|apaga|remova|remova da memoria|remova da memória)\s+(?:que\s+)?(.+)$/i);
 if(forget){
  const value=normalize(forget[1]);
  return{response:memory.forget(value)?"Certo. Removi essa informação da memória.":"Não encontrei essa informação exata na memória.",source:"memory"}
 }
 const teach=text.match(/^(?:quando eu disser|quando eu falar)\s+["“]?(.+?)["”]?\s*,?\s*(?:responda|diga|responda com)\s+["“]?(.+?)["”]?$/i);
 if(teach){memory.learn(teach[1],teach[2]);return{response:"Aprendi essa regra.",source:"learning"}}
 const memoryQuestion=/^(?:qual e meu nome|como eu me chamo|o que voce sabe sobre mim|o que voce lembra de mim|voce lembra de mim|o que voce lembra)$/i.test(normalized)||(/\b(?:lembra|lembrar|recorda|recordar)\b/i.test(normalized)&&/\b(?:mim|sobre mim|memoria|eu)\b/i.test(normalized));
 if(memoryQuestion){
  const facts=memory.recall(),names=facts.filter(f=>/\b(?:meu nome|me chamo|sou)\b/i.test(f));
  if(/^(?:qual e meu nome|como eu me chamo)$/i.test(normalized)&&names.length){
   const name=names.at(-1).replace(/^(?:meu nome e|me chamo|sou)\s*/,"");
   return{response:"Meu nome é "+name+".",source:"memory"}
  }
  if(names.length)return{response:"Lembro de você. "+names.at(-1)+".",source:"memory"};
  if(facts.length)return{response:"Tenho "+facts.length+" item(ns) guardado(s) na memória deste navegador.",source:"memory"};
  return{response:"Ainda não tenho nenhuma informação sua guardada.",source:"memory"}
 }
 const learned=memory.findLearned(text);if(learned)return{response:chooseResponse(learned.item.responses),source:"learned"};
 const calc=extractCalculation(text);if(calc){const n=calculate(calc);if(n!==null)return{response:String(n),source:"calculator"}}
 const eliza=runEliza(text,rules);if(eliza)return eliza;
 const intent=detectIntent(text,knowledge.training);if(intent?.score>=.55)return{response:chooseResponse(intent.intent.responses),source:"chatterbot",intent:intent.intent.name};
 const concept=knowledge.findConcept(text);if(concept)return{response:concept.concept.response,source:"knowledge"};
 const entities=extractEntities(text);if(entities.length)return{response:"Entendi. Você mencionou "+entities.map(e=>e.value).join(", ")+". O que deseja fazer com isso?",source:"nlp"};
 return{response:chooseResponse(rules.default)||"Entendi. Me explique um pouco mais.",source:"fallback"}
}
function chooseResponse(items){return Array.isArray(items)&&items.length?items[Math.floor(Math.random()*items.length)]:"Entendi."}