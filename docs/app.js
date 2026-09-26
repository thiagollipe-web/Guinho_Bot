import base from "./knowledge/base.json" with { type: "json" };
import training from "./knowledge/training.json" with { type: "json" };

const STOPWORDS = new Set("a o as os um uma uns umas de do da dos das e é em no na nos nas por para com sem que se ao aos à às eu tu ele ela nós vocês meu minha seu sua isso isto esse essa aquele".split(" "));

function normalize(text) {
  return String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}
function tokens(text) { const value = normalize(text); return value ? value.split(" ") : []; }
function contentTokens(text) { return tokens(text).filter((word) => !STOPWORDS.has(word)); }
function choose(items) { return items[Math.floor(Math.random() * items.length)]; }

function similarity(a,b) {
  const A=new Set(contentTokens(a)), B=new Set(contentTokens(b));
  if(!A.size||!B.size) return 0;
  let common=0; for(const word of A) if(B.has(word)) common++;
  return common/Math.max(A.size,B.size);
}

function matchPattern(pattern,input) {
  const p=tokens(pattern), w=tokens(input), captures=[];
  function walk(pi,wi){
    if(pi>=p.length) return wi===w.length;
    if(p[pi]==="*"){
      for(let end=wi;end<=w.length;end++){ captures.push(w.slice(wi,end).join(" ")); if(walk(pi+1,end)) return true; captures.pop(); }
      return false;
    }
    if(w[wi]!==p[pi]) return false;
    return walk(pi+1,wi+1);
  }
  return walk(0,0)?[...captures]:null;
}

function reflect(text, reflections) {
  return tokens(text).map(word => reflections[word] || word).join(" ");
}

function fill(template,captures,reflections) {
  return String(template).replace(/\$(\d+)/g,(_,n)=>captures[Number(n)-1]||"").replace(/\{reflect:(\d+)\}/g,(_,n)=>reflect(captures[Number(n)-1]||"",reflections)).trim();
}

class Memory {
  constructor(){ this.key="guinho-memory-v4"; this.data=this.read(); }
  read(){
    try{
      const raw=JSON.parse(localStorage.getItem(this.key)||"null");
      if(raw&&Array.isArray(raw.facts)&&Array.isArray(raw.history)) return raw;
    }catch{}
    try{
      const legacy=JSON.parse(localStorage.getItem("guinho-memory-v3")||"null");
      if(legacy&&Array.isArray(legacy.facts)&&Array.isArray(legacy.history)) return {
        facts:legacy.facts.slice(0,500),
        history:legacy.history.slice(-100)
      };
    }catch{}
    return {facts:[],history:[]};
  }
  save(){localStorage.setItem(this.key,JSON.stringify(this.data))}
  remember(text){
    const value=normalize(text);
    if(value&&!this.data.facts.includes(value)){
      this.data.facts.push(value);
      this.data.facts=this.data.facts.slice(-500);
      this.save();
    }
    return !!value;
  }
  recall(){return [...this.data.facts]}
  addHistory(role,text){
    this.data.history.push({role,text:String(text),at:Date.now()});
    this.data.history=this.data.history.slice(-100);
    this.save();
  }
  snapshot(){
    return {
      format:"guinho-memory",
      version:1,
      exportedAt:new Date().toISOString(),
      facts:[...this.data.facts],
      history:[...this.data.history]
    };
  }
  importSnapshot(snapshot){
    if(!snapshot||snapshot.format!=="guinho-memory"||!Array.isArray(snapshot.facts)||!Array.isArray(snapshot.history)){
      throw new Error("Arquivo de memória inválido.");
    }
    this.data={
      facts:snapshot.facts.map(v=>normalize(v)).filter(Boolean).slice(-500),
      history:snapshot.history
        .filter(v=>v&&["user","bot"].includes(v.role)&&typeof v.text==="string")
        .map(v=>({role:v.role,text:v.text,at:Number(v.at)||Date.now()}))
        .slice(-100)
    };
    this.save();
  }
  clearAll(){this.data={facts:[],history:[]};this.save()}
}

class Knowledge {
  constructor(){
    this.concepts=Array.isArray(base.concepts)?base.concepts:[];
    this.intents=Array.isArray(training.intents)?training.intents:[];
  }
  find(query){
    let best=null;
    for(const concept of this.concepts){
      const terms=[concept.title,...(concept.aliases||[]),...(concept.keywords||[])];
      const score=Math.max(...terms.map(term=>similarity(query,term)),0);
      if(!best||score>best.score) best={concept,score};
    }
    return best&&best.score>=0.45?best.concept:null;
  }
}

class Guinho {
  constructor(){
    this.memory=new Memory();
    this.knowledge=new Knowledge();
    this.context=null;
    this.reflections={eu:"você",me:"você",meu:"seu",minha:"sua",estou:"está",comigo:"com você"};
  }

  findFact(prefix){
    const facts=this.memory.recall();
    return facts.find(f=>f.startsWith(prefix));
  }

  learn(input){
    const clean=normalize(input);

    const explicit=clean.match(/^(lembre|lembrar|guarde|guarda) (que )?(.+)$/);
    if(explicit){
      this.memory.remember(explicit[3]);
      return "Certo. Vou guardar isso.";
    }

    const name=clean.match(/^(?:meu nome e|eu me chamo|me chamo) (.+)$/);
    if(name){
      const value=name[1].trim();
      this.memory.data.facts=this.memory.data.facts.filter(f=>!f.startsWith("meu nome e "));
      this.memory.remember("meu nome e "+value);
      return "Entendi. Vou lembrar do seu nome.";
    }

    const likes=clean.match(/^(?:eu gosto de|eu adoro|eu prefiro) (.+)$/);
    if(likes){
      this.memory.remember("preferencia: "+likes[1].trim());
      return "Entendi. Vou levar isso em conta nas próximas conversas.";
    }

    const project=clean.match(/^(?:estou trabalhando em|estou fazendo|meu projeto e|meu projeto é) (.+)$/);
    if(project){
      this.memory.remember("projeto: "+project[1].trim());
      return "Entendi. Vou considerar isso como contexto do projeto.";
    }

    return null;
  }

  recall(input){
    const clean=normalize(input);
    if(!/^(o que|qual|quais|me diga).*(lembra|lembranca|memoria|sabe sobre mim)/.test(clean)) return null;

    const facts=this.memory.recall();
    if(!facts.length) return "Ainda não tenho nenhuma memória guardada.";

    const visible=facts.slice(-12);
    return "Lembro destas informações: "+visible.join("; ")+".";
  }

  personalityResponse(clean){
    const name=this.findFact("meu nome e ");
    const nameValue=name ? name.replace("meu nome e ","") : null;

    if(/^(oi|ola|oie|bom dia|boa tarde|boa noite)/.test(clean)){
      return nameValue
        ? `Olá, ${nameValue}. O que vamos resolver hoje?`
        : choose(["Olá. O que vamos resolver?","Oi. Estou aqui. Me diga o que você precisa.","Olá. Pode falar."]);
    }

    if(/^(quem e voce|o que voce e|quem e o guinho|quem e guinho)/.test(clean)){
      return "Sou o Guinho. Um assistente conversacional feito para conversar de forma natural, lembrar do contexto e ajudar a resolver problemas.";
    }

    if(/^(como voce esta|tudo bem|como vai)/.test(clean)){
      return "Estou por aqui e pronto para continuar. E você, como está?";
    }

    if(/^(obrigado|obrigada|valeu|agradeco)/.test(clean)){
      return choose(["Por nada.","De nada. Vamos em frente.","Disponha."]);
    }

    if(/^(tchau|ate mais|ate logo|falou)/.test(clean)){
      return "Até mais. Quando voltar, podemos continuar de onde paramos.";
    }

    if(/^(sim|nao|não|talvez)/.test(clean) && this.context){
      if(this.context==="programacao") return "Certo. Então vamos continuar pela parte de programação.";
      if(this.context==="erro") return "Entendi. Me passe o erro ou o trecho que está causando o problema.";
    }

    return null;
  }

  respond(input){
    const clean=normalize(input);
    if(!clean) return "Digite alguma coisa.";

    const learned=this.learn(input);
    if(learned) return learned;

    const recalled=this.recall(input);
    if(recalled) return recalled;

    const natural=this.personalityResponse(clean);
    if(natural) return natural;

    if(/^(o que|quem|qual|explique|explicar|como funciona|me fale)/.test(clean)){
      const concept=this.knowledge.find(clean);
      if(concept){
        this.context="knowledge";
        return concept.response;
      }
    }

    if(/^(voce lembra|lembra de mim|o que sabe sobre mim)/.test(clean)){
      const facts=this.memory.recall();
      return facts.length ? "Sim. Tenho algumas informações guardadas sobre você." : "Ainda não guardei informações suficientes sobre você.";
    }

    let best=null;
    for(const intent of this.knowledge.intents){
      for(const example of intent.examples||[]){
        const score=similarity(clean,example);
        if(!best||score>best.score) best={intent,score};
      }
    }
    if(best&&best.score>=0.55){
      this.context=best.intent.name;
      return choose(best.intent.responses||["Entendi."]);
    }

    if(/\b(erro|bug|falha|nao funciona|não funciona|problema)\b/.test(clean)){
      this.context="erro";
      return "Vamos descobrir a causa. Me mostre o erro exato ou o trecho que não está funcionando.";
    }

    if(/\b(codigo|programacao|javascript|python|html|css|node|pwa|github)\b/.test(clean)){
      this.context="programacao";
      return "Vamos tratar isso como um problema de programação. Me diga o que você quer construir ou mostre o código.";
    }

    if(this.context==="programacao"){
      return "Entendi. Vamos continuar por aí. Qual é a parte que está travando?";
    }

    if(this.context==="erro"){
      return "Vamos por partes. O que aconteceu e o que você esperava que acontecesse?";
    }

    return choose([
      "Entendi. Me explique um pouco mais para eu acompanhar o que você quer.",
      "Ainda não tenho uma regra específica para isso. Mas podemos analisar juntos.",
      "Vamos por partes: qual é exatamente o resultado que você espera?"
    ]);
  }
}

const guinho=new Guinho();
const chat=document.querySelector("#chat"), form=document.querySelector("#composer"), input=document.querySelector("#input"), menuButton=document.querySelector("#menuButton"), menu=document.querySelector("#menu"), memoryPanel=document.querySelector("#memoryPanel"), memoryList=document.querySelector("#memoryList");

function addMessage(role,text,persist=true){const el=document.createElement("div");el.className="message "+role;el.textContent=text;chat.appendChild(el);chat.scrollTop=chat.scrollHeight;if(persist)guinho.memory.addHistory(role,text)}
function renderMemory(){
  memoryList.replaceChildren();
  const facts=guinho.memory.recall();
  if(!facts.length){
    const e=document.createElement("div");
    e.className="memory-empty";
    e.textContent="Nenhuma informação foi guardada ainda.";
    memoryList.appendChild(e);
    return;
  }
  for(const fact of facts){
    const e=document.createElement("div");
    e.className="memory-item";
    e.textContent=fact;
    memoryList.appendChild(e);
  }
}
function restoreHistory(){
  const h=guinho.memory.data.history;
  if(!h.length){addMessage("bot","Olá. Sou o Guinho. Como posso ajudar?",false);return}
  for(const item of h)addMessage(item.role==="user"?"user":"bot",item.text,false);
}
function downloadMemory(){
  const blob=new Blob([JSON.stringify(guinho.memory.snapshot(),null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="guinho-memoria.json";
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function importMemory(file){
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      guinho.memory.importSnapshot(JSON.parse(reader.result));
      guinho.context=null;
      chat.replaceChildren();
      restoreHistory();
      renderMemory();
      memoryPanel.hidden=false;
    }catch(error){
      alert(error.message||"Não foi possível importar a memória.");
    }
  };
  reader.readAsText(file);
}

form.addEventListener("submit",e=>{
  e.preventDefault();
  const text=input.value.trim();
  if(!text)return;
  addMessage("user",text);
  addMessage("bot",guinho.respond(text));
  input.value="";
  input.style.height="";
  input.focus();
});
input.addEventListener("input",()=>{input.style.height="auto";input.style.height=Math.min(input.scrollHeight,140)+"px"});
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
menuButton.addEventListener("click",()=>{const open=menu.hidden;menu.hidden=!open;menuButton.setAttribute("aria-expanded",String(open))});
document.querySelector("#memoryButton").addEventListener("click",()=>{menu.hidden=true;menuButton.setAttribute("aria-expanded","false");renderMemory();memoryPanel.hidden=false});
document.querySelector("#exportMemory").addEventListener("click",()=>downloadMemory());
document.querySelector("#importMemory").addEventListener("click",()=>document.querySelector("#memoryFile").click());
document.querySelector("#memoryFile").addEventListener("change",e=>{const file=e.target.files?.[0];if(file)importMemory(file);e.target.value=""});
document.querySelector("#closeMemory").addEventListener("click",()=>memoryPanel.hidden=true);
document.querySelector("#clear").addEventListener("click",()=>{
  menu.hidden=true;
  if(!confirm("Apagar todas as memórias e o histórico desta instalação?"))return;
  guinho.memory.clearAll();
  guinho.context=null;
  chat.replaceChildren();
  addMessage("bot","Tudo limpo. Podemos começar de novo.",false);
});
restoreHistory();
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
