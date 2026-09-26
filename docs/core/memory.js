import{similarity,normalize}from"./nlp.js";
const KEY="guinho-memory-v1",MAX=200,THRESHOLD=.72;
function clean(v){return normalize(String(v??""))}
function validHistory(x){return x&&typeof x==="object"&&["user","bot"].includes(x.role)&&String(x.text??"").trim()}
export class Memory{
 constructor(){this.data=this.load()}
 load(){
  try{
   const d=JSON.parse(localStorage.getItem(KEY)||"null");
   if(d?.facts&&d?.history&&d?.learned){
    const facts=d.facts.map(clean).filter(Boolean).slice(-MAX);
    const meta=Array.isArray(d.factMeta)?d.factMeta.filter(x=>x&&facts.includes(clean(x.value))).slice(-MAX):[];
    return{facts,history:Array.isArray(d.history)?d.history.filter(validHistory).slice(-MAX):[],learned:Array.isArray(d.learned)?d.learned.slice(-MAX):[],factMeta:meta}
   }
  }catch{}
  return{facts:[],history:[],learned:[],factMeta:[]}
 }
 save(){try{localStorage.setItem(KEY,JSON.stringify(this.data))}catch{}}
 remember(v){
  const value=clean(v);
  if(!value)return false;
  const now=Date.now(),index=this.data.facts.indexOf(value);
  if(index>=0){
   const meta=this.data.factMeta.find(x=>x.value===value);
   if(meta){meta.updatedAt=now;meta.hits=(meta.hits||0)+1}else this.data.factMeta.push({value,createdAt:now,updatedAt:now,hits:1});
  }else{
   this.data.facts.push(value);
   this.data.factMeta.push({value,createdAt:now,updatedAt:now,hits:1});
   this.data.facts=this.data.facts.slice(-MAX);
   this.data.factMeta=this.data.factMeta.filter(x=>this.data.facts.includes(x.value)).slice(-MAX);
  }
  this.save();return true
 }
 forget(v){
  const value=clean(v);if(!value)return false;
  const index=this.data.facts.indexOf(value);if(index<0)return false;
  this.data.facts.splice(index,1);this.data.factMeta=this.data.factMeta.filter(x=>x.value!==value);this.save();return true
 }
 learn(p,r){
  const pattern=clean(p),response=String(r||"").trim();if(!pattern||!response)return false;
  const found=this.data.learned.find(x=>x.pattern===pattern);
  if(found&&!found.responses.includes(response))found.responses.push(response);
  else if(!found)this.data.learned.push({pattern,responses:[response]});
  this.data.learned=this.data.learned.slice(-MAX);this.save();return true
 }
 findLearned(input){
  let best=null;for(const item of this.data.learned){const score=similarity(input,item.pattern);if(!best||score>best.score)best={item,score}}
  return best?.score>=THRESHOLD?best:null
 }
 findFact(input,threshold=THRESHOLD){
  let best=null;for(const value of this.data.facts){const score=similarity(input,value);if(!best||score>best.score)best={value,score}}
  if(best&&best.score>=threshold){
   const meta=this.data.factMeta.find(x=>x.value===best.value);if(meta){meta.hits=(meta.hits||0)+1;meta.updatedAt=Date.now();this.save()}
   return best
  }
  return null
 }
 recall(query="",threshold=THRESHOLD){
  if(!query)return[...this.data.facts];
  const q=clean(query);return this.data.facts.filter(x=>similarity(q,x)>=threshold)
 }
 learnedRules(){return this.data.learned.map(x=>({pattern:x.pattern,responses:[...x.responses]}))}
 addHistory(role,text){
  const value=String(text??"").trim();if(!value)return;
  this.data.history.push({role,text:value,at:Date.now()});this.data.history=this.data.history.slice(-MAX);this.save()
 }
 clear(){this.data={facts:[],history:[],learned:[],factMeta:[]};this.save()}
 snapshot(){return{format:"guinho-memory",version:2,facts:[...this.data.facts],history:[...this.data.history],learned:this.learnedRules(),factMeta:[...this.data.factMeta]}}
 importSnapshot(s){
  if(s?.format!=="guinho-memory")throw new Error("Memória inválida.");
  const facts=Array.isArray(s.facts)?s.facts.map(clean).filter(Boolean).slice(-MAX):[];
  const now=Date.now(),sourceMeta=Array.isArray(s.factMeta)?s.factMeta:[];
  this.data={
   facts,
   history:Array.isArray(s.history)?s.history.filter(validHistory).slice(-MAX):[],
   learned:Array.isArray(s.learned)?s.learned.slice(-MAX):[],
   factMeta:facts.map(value=>{const m=sourceMeta.find(x=>x&&clean(x.value)===value);return m?{value,createdAt:Number(m.createdAt)||now,updatedAt:Number(m.updatedAt)||now,hits:Number(m.hits)||0}:{value,createdAt:now,updatedAt:now,hits:0}})
  };
  this.save()
 }
}