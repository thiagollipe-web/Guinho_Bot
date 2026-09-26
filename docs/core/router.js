import{normalize,detectIntent,extractEntities}from"./nlp.js";
import{runEliza}from"./eliza.js";
import{extractCalculation,calculate}from"./calculator.js";
export function route(input,options={}){
 try{return routeCore(input,options)}catch(error){console.error("Guinho router:",error);return{response:"Entendi. Houve um problema ao processar essa mensagem. Tente novamente.",source:"error"}}
}
function routeCore(input,{knowledge,memory,rules,references=[]}={}){
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
 if(contextQuestion){
  const recent=typeof memory.recent==="function"?memory.recent(6):[],users=recent.filter(x=>x.role==="user"),last=users.at(-1);
  return{response:last?"Sua última mensagem foi: \""+last.text+"\".":"Ainda não há conversa suficiente para recuperar o contexto.",source:"memory"}
 }
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
 const variants=contextVariants(text,memory);
 const learned=bestLearned(variants,memory);
 if(learned)return{response:selectResponse(learned.item.responses,memory),source:"learned"};
 const calc=extractCalculation(text);
 if(calc){const n=calculate(calc);if(n!==null)return{response:String(n),source:"calculator"}}
 for(const candidate of variants){const eliza=runEliza(candidate,rules);if(eliza)return{response:selectResponse([eliza.response],memory),source:"eliza"}}
 const intent=bestIntent(variants,knowledge.training),intentThreshold=variants.length>1?.4:.55;
 if(intent?.score>=intentThreshold)return{response:selectResponse(intent.intent.responses,memory),source:"chatterbot",intent:intent.intent.name};
 const concept=knowledge.findConcept(text);
 if(concept)return{response:concept.concept.response,source:"knowledge"};
 const entities=extractEntities(text);
 if(entities.length){
  const values=entities.map(e=>e.value).join(", ");
  return{response:selectResponse(["Entendi. Você mencionou "+values+". O que deseja fazer com isso?","Você mencionou "+values+". O que quer fazer com isso?"],memory),source:"nlp"}
 }
 return{response:selectResponse(rules.default,memory)||"Entendi. Me explique um pouco mais.",source:"fallback"}
}
function hasReference(text){
 return/\b(?:ele|ela|eles|elas|isso|isto|esse|essa|esses|essas|aquele|aquela|dele|dela|desse|dessa|nessa|nesse|o projeto|o jogo|a ideia|isso ai)\b/i.test(normalize(text));
}
function contextVariants(text,memory){
 if(!hasReference(text)||typeof memory?.recent!=="function")return[text];
 const users=memory.recent(8).filter(x=>x.role==="user").slice(-4).reverse(),variants=[text];
 for(const item of users)variants.push(text+" "+item.text);
 return[...new Set(variants)];
}
function bestLearned(variants,memory){
 let best=null;
 for(const value of variants){const found=memory.findLearned(value);if(found&&(!best||found.score>best.score))best=found}
 return best;
}
function bestIntent(variants,training){
 let best=null;
 for(const value of variants){const found=detectIntent(value,training);if(found&&(!best||found.score>best.score))best=found}
 return best;
}
function selectResponse(items,memory){
 const options=[...new Set((Array.isArray(items)?items:[]).map(x=>String(x??"").trim()).filter(Boolean))];
 if(!options.length)return"Entendi.";
 const recent=new Set((typeof memory?.recent==="function"?memory.recent(10):[]).filter(x=>x.role==="bot").map(x=>normalize(x.text)));
 const fresh=options.filter(x=>!recent.has(normalize(x)));
 const pool=fresh.length?fresh:options;
 return pool[Math.floor(Math.random()*pool.length)];
}