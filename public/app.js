const chat=document.querySelector("#chat");
const form=document.querySelector("#composer");
const input=document.querySelector("#message");
const statusText=document.querySelector("#status-text");
const buttons=document.querySelectorAll("[data-cmd]");

class MotorPNL{
  constructor(){
    this.stop=new Set(["a","o","e","de","da","do","das","dos","que","em","no","na","nos","nas","para","por","com","um","uma","como","me","eu","voce"]);
    this.intencoes=[
      {nome:"saudacao",padroes:["oi","ola","bom dia","boa tarde","boa noite","e ai","tudo bem","quem e voce"]},
      {nome:"ajuda",padroes:["ajuda","o que voce sabe fazer","comandos","menu"]},
      {nome:"moeda",padroes:["dolar","cotacao dolar","quanto custa dolar","euro","cotacao euro","quanto vale euro","quanto custa"],acao:"moeda"},
      {nome:"noticias",padroes:["noticias","ultimas noticias","noticias do ibge","manchetes"],acao:"noticias"},
      {nome:"tempo",padroes:["clima","tempo","temperatura","vai chover","previsao","vento"],acao:"tempo"},
      {nome:"cep",padroes:["cep","endereco","buscar endereco","logradouro","bairro","cidade"],acao:"cep"},
      {nome:"exatas",padroes:["calcule","quanto e","bhaskara","equacao","formula","raiz quadrada"],acao:"exatas"},
      {nome:"desenvolvimento",padroes:["javascript","html","css","programacao","programar","canvas","jogo","pixel art","sprite","codigo"],acao:"desenvolvimento"},
      {nome:"natureza",padroes:["biologia","celula","anatomia","corpo humano","ecossistema","astronomia","sistema solar","planeta","fotossintese"],acao:"natureza"}
    ];
  }
  normalizar(texto){
    return String(texto??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
  }
  tokens(texto){return this.normalizar(texto).split(" ").filter(Boolean).filter(t=>!this.stop.has(t));}
  distancia(a,b){
    if(a===b)return 1;
    if(!a||!b)return 0;
    const m=a.length,n=b.length;
    if(Math.abs(m-n)>3)return 0;
    let prev=Array.from({length:n+1},(_,i)=>i);
    for(let i=1;i<=m;i++){
      const cur=[i];
      for(let j=1;j<=n;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
      prev=cur;
    }
    return 1-prev[n]/Math.max(m,n);
  }
  score(texto,padrao){
    const a=this.tokens(texto),b=this.tokens(padrao);
    if(!a.length||!b.length)return 0;
    let total=0;
    for(const p of b){
      let best=0;
      for(const t of a){
        best=Math.max(best,this.distancia(t,p));
        if(t.includes(p)||p.includes(t))best=Math.max(best,.86);
      }
      total+=best;
    }
    const cobertura=total/b.length;
    const presenca=b.filter(x=>a.includes(x)).length/b.length;
    return cobertura*.7+presenca*.3;
  }
  detectar(texto){
    let melhor=null;
    for(const i of this.intencoes)for(const p of i.padroes){
      const score=this.score(texto,p);
      if(!melhor||score>melhor.score)melhor={...i,score};
    }
    return melhor&&melhor.score>=.46?melhor:null;
  }
}

const pnl=new MotorPNL();

const Natureza={
  celula:"A célula é a unidade estrutural e funcional básica dos seres vivos. Em células eucarióticas, núcleo, membrana, citoplasma e organelas possuem funções específicas.",
  fotossintese:"Na fotossíntese, organismos autotróficos usam energia luminosa para produzir matéria orgânica a partir de água e dióxido de carbono; em muitos organismos há liberação de oxigênio.",
  coracao:"O coração é um órgão muscular que impulsiona o sangue pelo sistema circulatório.",
  pulmao:"Os pulmões participam das trocas gasosas entre o ar e o sangue.",
  ecossistema:"Um ecossistema reúne organismos vivos e fatores abióticos que interagem em uma área.",
  cadeia:"Uma cadeia alimentar representa relações de alimentação e o fluxo de energia entre organismos.",
  planetas:"Os oito planetas do Sistema Solar são Mercúrio, Vênus, Terra, Marte, Júpiter, Saturno, Urano e Netuno."
};

const DevLib={
  pixelArt:"PROMPT PIXEL ART: sprites 16-bit originais, grade consistente, silhueta legível, paleta limitada, clusters de sombra, outlines seletivos, sem antialiasing e fundo transparente.",
  spriteSheet:"PROMPT SPRITESHEET: idle, walk, run, jump, fall, attack e hit; mesmo pivô, escala e proporções em todos os frames; organize em linhas regulares.",
  canvas:`const canvas=document.querySelector("canvas"),ctx=canvas.getContext("2d");const p={x:40,y:80,w:12,h:12,vx:0,vy:0};const keys={left:false,right:false,jump:false};function loop(){p.vx=(keys.right-keys.left)*1.5;p.x+=p.vx;p.vy+=.25;p.y+=p.vy;if(p.y+p.h>=120){p.y=108;p.vy=0}ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,160,120);ctx.fillRect(p.x,p.y,p.w,p.h);requestAnimationFrame(loop)}loop();`
};

function add(role,text){
  const el=document.createElement("div");
  el.className="line "+(role==="user"?"user":"bot");
  const meta=role==="user"?"VOCÊ >":"GUINHO >";
  const box=document.createElement("div");
  box.className="bubble";
  box.textContent=text;
  const m=document.createElement("div");
  m.className="meta";
  m.textContent=meta;
  el.append(m,box);
  chat.appendChild(el);
  chat.scrollTop=chat.scrollHeight;
}

function calc(texto){
  const q=pnl.normalizar(texto);
  const b=q.match(/bhaskara\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/);
  if(b){
    const [a,bb,c]=b.slice(1).map(Number);
    if(a===0)return "Para Bhaskara, a precisa ser diferente de zero.";
    const delta=bb*bb-4*a*c;
    if(delta<0)return `Δ = ${delta}. Não há raízes reais.`;
    return `Δ = ${delta}\nx₁ = ${(-bb+Math.sqrt(delta))/(2*a)}\nx₂ = ${(-bb-Math.sqrt(delta))/(2*a)}`;
  }
  const expr=texto.replace(/[^0-9+\-*/().%\s]/g,"").trim();
  if(expr&&/[+*/%]/.test(expr)){
    try{return "Resultado: "+Function('"use strict";return ('+expr+')')();}catch{}
  }
  return null;
}

async function moeda(){
  const r=await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL");
  if(!r.ok)throw new Error("Falha na cotação.");
  const d=await r.json();
  return `USD/BRL: R$ ${Number(d.USDBRL.bid).toFixed(4)}\nEUR/BRL: R$ ${Number(d.EURBRL.bid).toFixed(4)}`;
}

async function noticias(){
  const r=await fetch("https://servicodados.ibge.gov.br/api/v3/noticias/?qtd=3");
  if(!r.ok)throw new Error("Falha ao consultar o IBGE.");
  const d=await r.json();
  const items=d.items||[];
  if(!items.length)return "Nenhuma notícia foi retornada.";
  return items.slice(0,3).map((x,i)=>`${i+1}. ${x.titulo}\n${x.introducao||""}\n${x.link||""}`).join("\n\n");
}

async function tempo(texto){
  let lat=-23.5505,lon=-46.6333,nome="São Paulo";
  const nums=texto.match(/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/);
  if(nums){lat=Number(nums[1]);lon=Number(nums[2]);nome=`${lat},${lon}`;}
  const u=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m&timezone=auto`;
  const r=await fetch(u);
  if(!r.ok)throw new Error("Falha ao consultar o Open-Meteo.");
  const d=await r.json();
  return `Local: ${nome}\nTemperatura: ${d.current?.temperature_2m??"?"} °C\nVento: ${d.current?.wind_speed_10m??"?"} km/h`;
}

async function cep(texto){
  const m=texto.match(/\b\d{5}-?\d{3}\b/);
  if(!m)return "Envie um CEP com 8 dígitos. Ex.: 01001000";
  const c=m[0].replace(/\D/g,"");
  const r=await fetch(`https://viacep.com.br/ws/${c}/json/`);
  if(!r.ok)throw new Error("Falha no ViaCEP.");
  const d=await r.json();
  if(d.erro)return "CEP não encontrado.";
  return `${d.logradouro||""}\nBairro: ${d.bairro||""}\nCidade: ${d.localidade||""}\nUF: ${d.uf||""}`;
}

function localReply(texto,intencao){
  if(intencao?.nome==="saudacao")return "Olá. Eu sou o Guinho-Bot. Meu processamento de linguagem roda localmente no navegador.";
  if(intencao?.nome==="ajuda")return "Recursos: /moeda, /noticias, /tempo, CEP, cálculos, Bhaskara, desenvolvimento, ciência da natureza e PLN local.";
  if(intencao?.nome==="desenvolvimento")return `Biblioteca de desenvolvimento local:\n\nPixel Art:\n${DevLib.pixelArt}\n\nSpritesheet:\n${DevLib.spriteSheet}\n\nCanvas:\n${DevLib.canvas}`;
  const q=pnl.normalizar(texto);
  if(intencao?.nome==="natureza"){
    if(q.includes("celula"))return Natureza.celula;
    if(q.includes("fotossintese"))return Natureza.fotossintese;
    if(q.includes("coracao"))return Natureza.coracao;
    if(q.includes("pulmao"))return Natureza.pulmao;
    if(q.includes("ecossistema"))return Natureza.ecossistema;
    if(q.includes("cadeia alimentar"))return Natureza.cadeia;
    return Natureza.planetas;
  }
  if(intencao?.nome==="exatas")return calc(texto)||"Use, por exemplo: bhaskara 1 -5 6 ou 10*(4+2).";
  return null;
}

async function responder(texto){
  if(texto.startsWith("/"))texto=texto.slice(1);
  const intent=pnl.detectar(texto);
  const local=localReply(texto,intent);
  if(intent?.acao==="moeda")return await moeda();
  if(intent?.acao==="noticias")return await noticias();
  if(intent?.acao==="tempo")return await tempo(texto);
  if(intent?.acao==="cep")return await cep(texto);
  if(intent?.acao==="exatas")return local||calc(texto)||"Não consegui interpretar o cálculo.";
  if(intent?.acao==="desenvolvimento"||intent?.acao==="natureza")return local;
  return local||"Não encontrei uma intenção local para essa frase. Tente /ajuda ou seja mais específico.";
}

form.addEventListener("submit",async e=>{
  e.preventDefault();
  const texto=input.value.trim();
  if(!texto)return;
  add("user",texto);
  input.value="";
  buttons.forEach(b=>b.disabled=true);
  statusText.textContent="PROCESSANDO";
  try{add("bot",await responder(texto));}
  catch(err){add("bot","Falha: "+err.message);}
  finally{buttons.forEach(b=>b.disabled=false);statusText.textContent="LOCAL READY";input.focus();}
});

buttons.forEach(b=>b.addEventListener("click",()=>{input.value=b.dataset.cmd;form.requestSubmit();}));
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/service-worker.js"));
add("bot","Sistema iniciado. PLN local ativo. Nenhuma API_KEY de IA é necessária. Digite /ajuda.");
