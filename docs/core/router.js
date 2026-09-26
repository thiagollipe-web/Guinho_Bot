import{normalize,detectIntent,extractEntities}from"./nlp.js";
import{runEliza}from"./eliza.js";
import{extractCalculation,calculate}from"./calculator.js";
export function route(input,{knowledge,memory,rules,references=[]}){
 const text=String(input??"").trim(),normalized=normalize(text);
 if(!text)return{response:"Digite alguma coisa.",source:"system"};
 if(typeof memory.capture==="function")memory.capture(text);
 if(/^(?:quem e voce|quem e o guinho|o que voce e)$/i.test(normalized))return{response:"Meu nome é Guinho. Sou um assistente conversacional local.",source:"identity"};
 if(/\b(?:fonte|fontes|link|links|referencia|referencias)\b/i.test(normalized)){
  const last=references.at(-1);return{response:last?.url?"Fonte: "+last.url:"Nenhuma fonte foi registrada nesta sessão.",source:"reference"}
 }
 const nameMatch=text.match(/^meu nome\s+(?:e|é)\s+(.+)$/i);
 if(nameMatch){const display=nameMatch[1].trim(),name=normalize(display);if(name)return{response:(memory.remember("meu nome e "+name),"Prazer, "+display+"."),source:"memory"}}
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
 const contextQuestion=/^(?:o que acabamos de conversar|sobre o que estavamos falando|o que eu falei agora|qual foi minha ultima mensagem)$/i.test(normalized);
 if(contextQuestion){const recent=typeof memory.recent==="function"?memory.recent(6):[];const users=recent.filter(x=>x.role==="user");const last=users.at(-1);return{response:last?`Sua última mensagem foi: "${last.text}".`:"Ainda não há conversa suficiente para recuperar o contexto.",source:"memory"} }
 const memoryQuestion=/^(?:qual e meu nome|como eu me chamo|o que voce sabe sobre mim|o que voce lembra de mim|voce lembra de mim|o que voce lembra)$/i.test(normalized)||(/\b(?:lembra|lembrar|recorda|recordar)\b/i.test(normalized)&&/\b(?:mim|sobre|memoria|eu)\b/i.test(normalized));
 if(memoryQuestion){
  const targeted=/\b(?:o que voce lembra|o que voce sabe)\s+(?:sobre|de)\s+(.+)$/i.exec(normalized);
  const subject=targeted?.[1]&&targeted[1]!=="mim"?targeted[1].trim():"";
  const facts=subject?memory.recall(subject,.25):memory.recall(),names=facts.filter(f=>/\b(?:meu nome|me chamo|sou)\b/i.test(f));
  if(/^(?:qual e meu nome|como eu me chamo)$/i.test(normalized)&&names.length){
   const name=names.at(-1).replace(/^(?:meu nome e|me chamo|sou)\s*/,"");
   return{response:"Meu nome é "+name+".",source:"memory"}
  }
  if(names.length)return{response:"Lembro de você. "+names.at(-1)+".",source:"memory"};
  if(subject&&facts.length)return{response:"Lembro disso: "+facts.join("; ")+"." ,source:"memory"};
  if(facts.length)return{response:"Tenho "+facts.length+" item(ns) guardado(s) na memória deste navegador.",source:"memory"};
  return{response:"Ainda não tenho nenhuma informação sua guardada.",source:"memory"}
 }
 const contextualText=contextualize(text,memory);
 const learned=memory.findLearned(contextualText);if(learned)return{response:chooseResponse(learned.item.responses),source:"learned"};
 const calc=extractCalculation(text);if(calc){const n=calculate(calc);if(n!==null)return{response:String(n),source:"calculator"}}
 const eliza=runEliza(contextualText,rules);if(eliza)return eliza;
 const intent=detectIntent(contextualText,knowledge.training);if(intent?.score>=.55)return{response:chooseResponse(intent.intent.responses),source:"chatterbot",intent:intent.intent.name};
 const concept=knowledge.findConcept(text);if(concept)return{response:concept.concept.response,source:"knowledge"};
 const entities=extractEntities(contextualText);if(entities.length)return{response:"Entendi. Você mencionou "+entities.map(e=>e.value).join(", ")+". O que deseja fazer com isso?",source:"nlp"};
 return{response:chooseResponse(rules.default)||"Entendi. Me explique um pouco mais.",source:"fallback"}
}
function contextualize(text,memory){
 const normalized=normalize(text);
 if(!memory)return text;
 const context=typeof memory.context==="function"?memory.context(8):[];
 const previous=context.filter(x=>x.role==="user").map(x=>x.text).filter(Boolean);
 if(!previous.length)return text;
 const references=previous.slice(-4);
 const mentionsReference=/\b(ele|ela|eles|elas|isso|isto|esse|essa|esses|essas|aquele|aquela|dele|dela|desse|dessa|nessa|nesse|o projeto|o jogo|a ideia|isso ai)\b/i.test(normalized);
 if(!mentionsReference)return text;
 return text+" [Contexto recente: "+references.join(" | ")+"]";
}
function chooseResponse(items){return Array.isArray(items)&&items.length?items[Math.floor(Math.random()*items.length)]:"Entendi."}