import { CONHECIMENTO } from "./knowledge.js";
import { RecuperadorSemantico } from "./retrieval.js";
import { MemoriaSessao } from "./memory.js";

const chat=document.querySelector("#chat");
const form=document.querySelector("#composer");
const input=document.querySelector("#message");
const statusText=document.querySelector("#status-text");
const buttons=document.querySelectorAll("[data-cmd]");

class MotorPNL{
  constructor(){
    this.stop=new Set(["a","o","e","de","da","do","das","dos","que","em","no","na","nos","nas","para","por","com","um","uma","como","me","eu","voce","sobre","qual","quais","se"]);
    this.intencoes=[
      {nome:"saudacao",padroes:["oi","ola","bom dia","boa tarde","boa noite","e ai","tudo bem","quem e voce"]},
      {nome:"ajuda",padroes:["ajuda","o que voce sabe fazer","comandos","menu","recursos"]},
      {nome:"memoria",padroes:["lembra de mim","o que voce lembra","qual meu nome","me conhece"],acao:"memoria"},
      {nome:"moeda",padroes:["dolar","cotacao dolar","quanto custa dolar","euro","cotacao euro","quanto vale euro","quanto custa"],acao:"moeda"},
      {nome:"noticias",padroes:["noticias","ultimas noticias","noticias do ibge","manchetes"],acao:"noticias"},
      {nome:"tempo",padroes:["clima","tempo","temperatura","vai chover","previsao","vento"],acao:"tempo"},
      {nome:"cep",padroes:["cep","endereco","buscar endereco","logradouro","bairro","cidade"],acao:"cep"},
      {nome:"exatas",padroes:["calcule","quanto e","bhaskara","equacao","formula","raiz quadrada","porcentagem","regra de tres"],acao:"exatas"},
      {nome:"desenvolvimento",padroes:["javascript","html","css","programacao","programar","canvas","jogo","pixel art","sprite","codigo","git"],acao:"desenvolvimento"},
      {nome:"natureza",padroes:["biologia","celula","anatomia","corpo humano","ecossistema","astronomia","sistema solar","planeta","fotossintese"],acao:"natureza"},
      {nome:"conhecimento",padroes:["o que e","quem foi","como funciona","me explique","explique","defina","fale sobre","qual a diferenca","por que","porque"],acao:"conhecimento"}
    ];
  }
  normalizar(texto){return String(texto??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();}
  tokens(texto){return this.normalizar(texto).split(" ").filter(Boolean).filter(t=>!this.stop.has(t));}
  distancia(a,b){
    if(a===b)return 1;if(!a||!b)return 0;
    const m=a.length,n=b.length;if(Math.abs(m-n)>3)return 0;
    let prev=Array.from({length:n+1},(_,i)=>i);
    for(let i=1;i<=m;i++){const cur=[i];for(let j=1;j<=n;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur;}
    return 1-prev[n]/Math.max(m,n);
  }
  score(texto,padrao){
    const a=this.tokens(texto),b=this.tokens(padrao);if(!a.length||!b.length)return 0;
    let total=0;
    for(const p of b){
      let best=0;
      for(const t of a){best=Math.max(best,this.distancia(t,p));if(t.includes(p)||p.includes(t))best=Math.max(best,.86);}
      total+=best;
    }
    return total/b.length*.7+b.filter(x=>a.includes(x)).length/b.length*.3;
  }
  detectar(texto){
    let melhor=null;
    for(const i of this.intencoes)for(const p of i.padroes){const score=this.score(texto,p);if(!melhor||score>melhor.score)melhor={...i,score};}
    return melhor&&melhor.score>=.46?melhor:null;
  }
}

class CompositorRespostas{
  constructor(recuperador,memoria,pnl){this.recuperador=recuperador;this.memoria=memoria;this.pnl=pnl;}
  contexto(texto){
    const q=this.pnl.normalizar(texto);
    const pronomes=["isso","isto","esse","essa","ele","ela","eles","elas","sobre isso","a respeito disso"];
    if(pronomes.some(p=>q===p||q.includes(" "+p))&&this.memoria.estado.assuntoAtual)return texto+" "+this.memoria.estado.assuntoAtual;
    return texto;
  }
  compor(consulta){
    const q=this.contexto(consulta);
    const docs=this.recuperador.recuperar(q,5);
    if(!docs.length)return null;
    this.memoria.definirAssunto(docs[0].tema);
    const modo=this.pnl.normalizar(consulta);
    const abertura=modo.includes("diferenca")?"A diferença principal está no conceito e na função de cada item.":modo.includes("como funciona")?"Funciona, em termos gerais, da seguinte maneira:":modo.includes("por que")||modo.includes("porque")?"A ideia central pode ser entendida assim:":"Encontrei informações relacionadas na minha base local:";
    const selecionados=docs.slice(0,3);
    const blocos=selecionados.map((d,i)=>`${i+1}. ${d.titulo}\n${d.texto}`).join("\n\n");
    const fontes="\n\nBase: Guinho local • "+selecionados.map(d=>d.titulo).join(" • ");
    return abertura+"\n\n"+blocos+fontes;
  }
}

const pnl=new MotorPNL();
const recuperador=new RecuperadorSemantico(CONHECIMENTO);
const memoria=new MemoriaSessao();
const compositor=new CompositorRespostas(recuperador,memoria,pnl);

const DevLib={
  pixelArt:"Crie uma spritesheet 16-bit original com grade consistente, silhueta clara, paleta limitada, clusters de sombra, outlines seletivos, sem antialiasing, fundo transparente e iluminação coerente.",
  spriteSheet:"Frames: idle, walk, run, jump, fall, attack e hit. Mesmo pivô, escala, proporções e quantidade de pixels por frame.",
  canvas:"Loop HTML5 Canvas 2D: entrada → atualização de estado → colisões → renderização → requestAnimationFrame. Para mobile, use Pointer Events em um D-Pad virtual."
};

const Natureza={
  celula:"A célula é a unidade estrutural e funcional básica dos seres vivos. Células procarióticas não possuem núcleo delimitado por membrana; células eucarióticas possuem.",
  fotossintese:"Na fotossíntese, organismos como plantas e algas transformam energia luminosa em energia química armazenada em compostos orgânicos.",
  coracao:"O coração é um órgão muscular que impulsiona o sangue pelo sistema circulatório.",
  pulmao:"Os pulmões participam das trocas gasosas entre o ar nos alvéolos e o sangue.",
  ecossistema:"Um ecossistema reúne organismos vivos e fatores abióticos em interação.",
  planetas:"Os oito planetas são Mercúrio, Vênus, Terra, Marte, Júpiter, Saturno, Urano e Netuno."
};

function add(role,text){
  const el=document.createElement("div");el.className="line "+(role==="user"?"user":"bot");
  const meta=document.createElement("div");meta.className="meta";meta.textContent=role==="user"?"VOCÊ >":"GUINHO >";
  const box=document.createElement("div");box.className="bubble";box.textContent=text;el.append(meta,box);chat.appendChild(el);chat.scrollTop=chat.scrollHeight;
}

class CalculadoraSegura{
  constructor(){this.precedencia={"+":1,"-":1,"*":2,"/":2,"%":2,"u-":3};}
  tokenizar(s){return s.replace(/,/g,".").match(/\d+(?:\.\d+)?|[()+\-*/%]/g)||[];}
  resolver(expr){
    const tokens=this.tokenizar(expr);if(!tokens.length||tokens.join("")!==expr.replace(/\s/g,"").replace(/,/g,"."))return null;
    const vals=[],ops=[];let esperadoNumero=true;
    const aplicar=()=>{const op=ops.pop();if(op==="u-"){vals.push(-vals.pop());return;}const b=vals.pop(),a=vals.pop();if([a,b].some(v=>!Number.isFinite(v)))throw new Error("Expressão inválida");if(op==="/"&&b===0)throw new Error("Divisão por zero");vals.push(op==="+"?a+b:op==="-"?a-b:op==="*"?a*b:op==="/" ? a/b : a%b);};
    for(let i=0;i<tokens.length;i++){const t=tokens[i];
      if(/^\d/.test(t)){vals.push(Number(t));esperadoNumero=false;continue;}
      if(t==="("){ops.push(t);esperadoNumero=true;continue;}
      if(t===")"){while(ops.length&&ops.at(-1)!=="(")aplicar();if(ops.pop()!=="(")throw new Error("Parênteses inválidos");esperadoNumero=false;continue;}
      const op=t;
      if(esperadoNumero&&op==="-"){while(ops.length&&ops.at(-1)==="u-")aplicar();ops.push("u-");continue;}
      if(esperadoNumero)throw new Error("Operador inesperado");
      while(ops.length&&ops.at(-1)!=="("&&this.precedencia[ops.at(-1)]>=this.precedencia[op])aplicar();
      ops.push(op);esperadoNumero=true;
    }
    if(esperadoNumero)throw new Error("Expressão incompleta");
    while(ops.length){if(ops.at(-1)==="(")throw new Error("Parênteses inválidos");aplicar();}
    return vals.length===1&&Number.isFinite(vals[0])?vals[0]:null;
  }
}
const calc=new CalculadoraSegura();

async function moeda(){const r=await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL");if(!r.ok)throw new Error("Cotação indisponível.");const d=await r.json();return `USD/BRL: R$ ${Number(d.USDBRL.bid).toFixed(4)}\nEUR/BRL: R$ ${Number(d.EURBRL.bid).toFixed(4)}`;}
async function noticias(){const r=await fetch("https://servicodados.ibge.gov.br/api/v3/noticias/?qtd=3");if(!r.ok)throw new Error("Notícias indisponíveis.");const d=await r.json();return (d.items||[]).slice(0,3).map((x,i)=>`${i+1}. ${x.titulo}\n${x.introducao||""}\n${x.link||""}`).join("\n\n")||"Nenhuma notícia retornada.";}
async function tempo(texto){let lat=-23.5505,lon=-46.6333,nome="São Paulo";const nums=texto.match(/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/);if(nums){lat=Number(nums[1]);lon=Number(nums[2]);nome=`${lat},${lon}`;}const u=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m&timezone=auto`;const r=await fetch(u);if(!r.ok)throw new Error("Clima indisponível.");const d=await r.json();return `Local: ${nome}\nTemperatura: ${d.current?.temperature_2m??"?"} °C\nVento: ${d.current?.wind_speed_10m??"?"} km/h`;}
async function cep(texto){const m=texto.match(/\b\d{5}-?\d{3}\b/);if(!m)return "Envie um CEP com 8 dígitos. Ex.: 01001000";const c=m[0].replace(/\D/g,"");const r=await fetch(`https://viacep.com.br/ws/${c}/json/`);if(!r.ok)throw new Error("ViaCEP indisponível.");const d=await r.json();if(d.erro)return "CEP não encontrado.";return `${d.logradouro||""}\nBairro: ${d.bairro||""}\nCidade: ${d.localidade||""}\nUF: ${d.uf||""}`;}

function extrairMemoria(texto){
  const m=texto.match(/(?:meu nome é|me chamo|sou o|sou a)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,50})$/i);
  if(m){const nome=m[1].trim().replace(/\s+/g," ");memoria.definirUsuario("nome",nome);}
  const cidade=texto.match(/(?:moro em|sou de|estou em)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,50})$/i);
  if(cidade)memoria.definirUsuario("cidade",cidade[1].trim());
}

function memoriaReply(){
  const r=memoria.resumo();
  if(!r)return "Nesta sessão ainda não guardei informações sobre você.";
  return "Nesta sessão eu tenho:\n"+r;
}

function localEspecial(texto,intent){
  const q=pnl.normalizar(texto);
  if(intent?.nome==="saudacao")return "Olá. Eu sou o Guinho-Bot. O núcleo de conversa roda localmente no navegador.";
  if(intent?.nome==="ajuda")return "Posso conversar sobre a base local, recuperar conceitos, calcular, consultar moeda, notícias, clima e CEP. Também mantenho memória durante esta sessão. Atalhos: /ajuda, /moeda, /noticias e /tempo.";
  if(intent?.nome==="memoria")return memoriaReply();
  if(intent?.nome==="desenvolvimento")return "Biblioteca Dev:\n\nPixel Art: "+DevLib.pixelArt+"\n\nSpritesheet: "+DevLib.spriteSheet+"\n\nCanvas: "+DevLib.canvas;
  if(intent?.nome==="natureza"){
    if(q.includes("celula"))return Natureza.celula;
    if(q.includes("fotossintese"))return Natureza.fotossintese;
    if(q.includes("coracao"))return Natureza.coracao;
    if(q.includes("pulmao"))return Natureza.pulmao;
    if(q.includes("ecossistema"))return Natureza.ecossistema;
    return Natureza.planetas;
  }
  if(intent?.nome==="exatas"){
    const bh=q.match(/bhaskara\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/);
    if(bh){const[a,b,c]=bh.slice(1).map(Number);if(a===0)return "Para Bhaskara, a precisa ser diferente de zero.";const delta=b*b-4*a*c;if(delta<0)return `Δ = ${delta}. Não há raízes reais.`;return `Δ = ${delta}\nx₁ = ${(-b+Math.sqrt(delta))/(2*a)}\nx₂ = ${(-b-Math.sqrt(delta))/(2*a)}`;}
    try{const e=texto.replace(/^.*?(calcule|quanto e)\s*/i,"").trim();const n=calc.resolver(e);if(n!==null)return "Resultado: "+n;}catch(err){return err.message;}
    return "Exemplos: bhaskara 1 -5 6 ou 10*(4+2)-3.";
  }
  return null;
}

async function responder(texto){
  extrairMemoria(texto);
  const limpo=texto.replace(/^\/(ajuda|moeda|noticias|tempo)\b/i,"$1").trim();
  const intent=pnl.detectar(limpo);
  const especial=localEspecial(limpo,intent);
  if(intent?.acao==="moeda")return await moeda();
  if(intent?.acao==="noticias")return await noticias();
  if(intent?.acao==="tempo")return await tempo(limpo);
  if(intent?.acao==="cep")return await cep(limpo);
  if(especial)return especial;
  const composta=compositor.compor(limpo);
  return composta||"Ainda não encontrei informação suficiente na base local. Tente reformular a pergunta ou use /ajuda.";
}

form.addEventListener("submit",async e=>{
  e.preventDefault();const texto=input.value.trim();if(!texto)return;
  add("user",texto);memoria.adicionar("user",texto);input.value="";buttons.forEach(b=>b.disabled=true);statusText.textContent="PLN + RECUPERAÇÃO";
  try{const resposta=await responder(texto);add("bot",resposta);memoria.adicionar("assistant",resposta);}catch(err){add("bot","Falha ao consultar fonte externa: "+err.message);}
  finally{buttons.forEach(b=>b.disabled=false);statusText.textContent="LOCAL READY";input.focus();}
});
buttons.forEach(b=>b.addEventListener("click",()=>{input.value=b.dataset.cmd;form.requestSubmit();}));
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/service-worker.js"));
const antigo=memoria.historico();if(antigo.length){for(const m of antigo.slice(-8))add(m.role,m.content);}else add("bot","Sistema iniciado. PLN local + recuperação semântica + memória de sessão ativos. Nenhuma API_KEY de IA é necessária.");
