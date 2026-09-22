const normalizar = texto => String(texto ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

const escapar = texto => String(texto ?? "").replace(/[<>&"]/g, c => ({
  "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;"
}[c]));

function tipoProjeto(texto){
  const q=normalizar(texto);
  if(/\bpwa\b|progressive web app|instalavel|offline/.test(q)) return "pwa";
  if(/\b(site|pagina|landing page|portfolio|portifolio|blog)\b/.test(q) && !/\bjogo\b|\bgame\b/.test(q)) return "site";
  return "jogo";
}

function extrairTecnologias(texto){
  const q=normalizar(texto);
  return ["html","css","javascript","canvas","pwa"].filter(x => q.includes(x));
}

function planoCriacao(texto, analise={}){
  const tipo=tipoProjeto(texto);
  const tecnologias=extrairTecnologias(texto);
  const mobile=/\b(mobile|celular|smartphone|responsivo|touch|android|ios)\b/.test(normalizar(texto));
  return {
    tipo,
    mobile,
    tecnologias:[...new Set(tecnologias.length ? tecnologias : (tipo==="jogo"?["html","css","javascript","canvas"]:["html","css","javascript"]))],
    objetivo:analise.objetivo||"criar",
    entry:"index.html",
    estrategia:tipo==="jogo"?"canvas-mobile":tipo==="site"?"site-responsivo":"pwa-offline"
  };
}

function jogoHTML(titulo){
  const t=escapar(titulo||"Guinho Game");
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#07111c">
<title>${t}</title>
<style>
:root{color-scheme:dark;font-family:system-ui,sans-serif}
*{box-sizing:border-box}
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#07111c;color:#eef6ff}
body{display:grid;place-items:center}
#wrap{position:relative;width:min(100vw,720px);height:100dvh;display:grid;place-items:center;background:radial-gradient(circle at 50% 20%,#15395b 0,#0b1b2b 48%,#050a10 100%)}
canvas{width:100%;height:auto;max-height:100%;image-rendering:pixelated;touch-action:none}
#hud{position:absolute;top:env(safe-area-inset-top,10px);left:0;right:0;padding:12px;display:flex;justify-content:space-between;font-weight:800;pointer-events:none;text-shadow:0 2px 4px #000}
#touch{position:absolute;left:0;right:0;bottom:max(14px,env(safe-area-inset-bottom));display:flex;justify-content:space-between;align-items:flex-end;padding:18px;pointer-events:none}
.pad{display:flex;gap:10px}.btn{width:62px;height:62px;border:1px solid #6f9ac6;border-radius:18px;background:#102a42dd;color:#fff;font-size:25px;font-weight:900;pointer-events:auto;touch-action:none;user-select:none}
#jump{width:74px;height:74px;border-radius:50%}
@media(min-width:800px){#touch{max-width:720px;margin:auto}}
</style>
</head>
<body>
<div id="wrap">
<canvas id="game" width="320" height="180" aria-label="Jogo"></canvas>
<div id="hud"><span id="score">PONTOS 0000</span><span>GUINHO PLATFORMER</span></div>
<div id="touch">
<div class="pad"><button class="btn" data-key="left" aria-label="Esquerda">◀</button><button class="btn" data-key="right" aria-label="Direita">▶</button></div>
<button class="btn" id="jump" data-key="jump" aria-label="Pular">▲</button>
</div>
</div>
<script>
"use strict";
const canvas=document.querySelector("#game"),ctx=canvas.getContext("2d"),scoreEl=document.querySelector("#score");
const W=canvas.width,H=canvas.height,keys={left:false,right:false,jump:false};
const player={x:28,y:110,w:12,h:16,vx:0,vy:0,onGround:false};
const platforms=[{x:0,y:160,w:320,h:20},{x:48,y:125,w:65,h:8},{x:145,y:105,w:70,h:8},{x:248,y:78,w:50,h:8}];
let score=0,last=performance.now(),jumpLatch=false;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function resizeCanvas(){
const dpr=Math.min(3,window.devicePixelRatio||1);const rect=canvas.getBoundingClientRect();
canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);
}
function reset(){player.x=28;player.y=80;player.vx=0;player.vy=0;score=0}
function update(dt){
const s=80,gravity=380,jump=-170;player.vx=(keys.right-keys.left)*s;
if(keys.jump&&player.onGround&&!jumpLatch){player.vy=jump;jumpLatch=true}if(!keys.jump)jumpLatch=false;
player.vy+=gravity*dt;const oldY=player.y;player.x=clamp(player.x+player.vx*dt,0,W-player.w);player.y+=player.vy*dt;player.onGround=false;
for(const p of platforms){const falling=player.vy>=0,crossed=oldY+player.h<=p.y&&player.y+player.h>=p.y;if(falling&&crossed&&player.x+player.w>p.x&&player.x<p.x+p.w){player.y=p.y-player.h;player.vy=0;player.onGround=true}}
if(player.y>H+30)reset();score+=Math.max(0,player.vx)*dt*.1;scoreEl.textContent="PONTOS "+String(Math.floor(score)).padStart(4,"0");
}
function draw(){const scaleX=canvas.clientWidth/W,scaleY=canvas.clientHeight/H,s=Math.min(scaleX,scaleY);ctx.save();ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);ctx.scale(s,s);ctx.fillStyle="#0b1d2e";ctx.fillRect(0,0,W,H);ctx.fillStyle="#244d6f";ctx.fillRect(0,130,W,30);ctx.fillStyle="#67b7ff";for(const p of platforms)ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle="#ffd166";ctx.fillRect(player.x,player.y,player.w,player.h);ctx.restore()}
function frame(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(frame)}
window.addEventListener("resize",resizeCanvas,{passive:true});
window.addEventListener("keydown",e=>{if(e.key==="ArrowLeft")keys.left=true;if(e.key==="ArrowRight")keys.right=true;if(e.key===" "||e.key==="ArrowUp")keys.jump=true});
window.addEventListener("keyup",e=>{if(e.key==="ArrowLeft")keys.left=false;if(e.key==="ArrowRight")keys.right=false;if(e.key===" "||e.key==="ArrowUp")keys.jump=false});
document.querySelectorAll("[data-key]").forEach(btn=>{const k=btn.dataset.key,set=v=>{keys[k]=v};btn.addEventListener("pointerdown",e=>{e.preventDefault();btn.setPointerCapture?.(e.pointerId);set(true)},{passive:false});["pointerup","pointercancel","pointerleave"].forEach(ev=>btn.addEventListener(ev,()=>set(false)))});
resizeCanvas();requestAnimationFrame(frame);
</script>
</body>
</html>`;
}

function siteHTML(titulo){
  const t=escapar(titulo||"Meu Site");
  return `<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Site responsivo gerado pelo Guinho-Bot"><title>${t}</title>
<style>
:root{font-family:Inter,system-ui,sans-serif;color:#eef4ff;background:#07111c}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;line-height:1.6}
main{max-width:1120px;margin:auto;padding:24px}nav{display:flex;justify-content:space-between;align-items:center;padding:14px 0}nav a{color:#a9c7e8;text-decoration:none;margin-left:14px}
.hero{min-height:66vh;display:grid;place-items:center;text-align:center;padding:60px 10px}.hero h1{font-size:clamp(2.5rem,8vw,5rem);line-height:1;margin:0 0 18px}.hero p{max-width:700px;margin:0 auto 24px;color:#98a9bc}
.cta{display:inline-block;padding:13px 18px;border-radius:12px;background:#64a8ff;color:#08111b;text-decoration:none;font-weight:800}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.card{padding:20px;border:1px solid #20334a;border-radius:16px;background:#0d1927}
@media(max-width:700px){main{padding:18px}.grid{grid-template-columns:1fr}nav{align-items:flex-start;gap:10px}nav div:last-child{display:flex;flex-wrap:wrap;justify-content:flex-end}}
</style></head><body><main>
<nav><strong>${t}</strong><div><a href="#sobre">Sobre</a><a href="#contato">Contato</a></div></nav>
<section class="hero"><div><div>GUINHO-BOT / WEB</div><h1>${t}</h1><p>Uma estrutura responsiva, rápida e sem dependências externas.</p><a class="cta" href="#sobre">Explorar</a></div></section>
<section id="sobre"><h2>Sobre</h2><div class="grid"><article class="card"><h3>Responsivo</h3><p>Layout adaptado para celular, tablet e desktop.</p></article><article class="card"><h3>Leve</h3><p>HTML, CSS e JavaScript puros para reduzir dependências.</p></article><article class="card"><h3>Acessível</h3><p>Estrutura semântica, foco em contraste e navegação simples.</p></article></div></section>
<section id="contato" style="padding:80px 0"><h2>Contato</h2><p>Substitua este bloco pelos dados do seu projeto.</p></section>
</main></body></html>`;
}

function pwaFiles(titulo){
  const t=escapar(titulo||"Guinho PWA");
  return {
    "index.html":`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#07111c"><link rel="manifest" href="./manifest.json"><title>${t}</title><link rel="stylesheet" href="./styles.css"></head><body><main><h1>${t}</h1><p>Aplicação PWA pronta para instalação.</p><button id="install">Instalar</button></main><script src="./app.js"></script></body></html>`,
    "styles.css":`body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07111c;color:#eef6ff;font:16px system-ui}main{width:min(92vw,620px);padding:32px;border:1px solid #20344b;border-radius:20px;background:#0d1826}button{padding:12px 16px;border:0;border-radius:10px;background:#64a8ff;color:#07111c;font-weight:800}`,
    "app.js":`let deferredPrompt=null;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e});document.querySelector("#install")?.addEventListener("click",async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();deferredPrompt=null});navigator.serviceWorker?.register("./service-worker.js");`,
    "manifest.json":JSON.stringify({name:titulo||"Guinho PWA",short_name:"Guinho PWA",start_url:"./",display:"standalone",background_color:"#07111c",theme_color:"#07111c"},null,2),
    "service-worker.js":`const CACHE="guinho-generated-pwa-v1";self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(["./","./index.html","./styles.css","./app.js","./manifest.json"]))));self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));`
  };
}

export function validarProjeto(projeto){
  const erros=[],avisos=[],arquivos=projeto?.files||{},html=arquivos["index.html"]||"";
  if(!/^<!doctype html>/i.test(html))erros.push("index.html sem DOCTYPE HTML.");
  if(!/<meta[^>]+name=["']viewport["']/i.test(html))erros.push("Viewport mobile ausente.");
  if(/canvas/i.test(html)){
    if(!/requestAnimationFrame\s*\(/.test(html))avisos.push("Canvas sem requestAnimationFrame detectável.");
    if(!/devicePixelRatio/.test(html))erros.push("Canvas sem tratamento de devicePixelRatio.");
    if(!/pointerdown|touchstart/.test(html))erros.push("Jogo mobile sem evento de toque/apontamento.");
  }
  for(const nome of Object.keys(arquivos))if(nome.endsWith(".js"))try{new Function(arquivos[nome]);}catch(err){erros.push(`${nome}: JavaScript inválido (${err.message}).`);}
  for(const [ab,fe] of [["<div>","</div>"],["<script>","</script>"],["<style>","</style>"]]){
    const a=(html.match(new RegExp(ab.replace(/[<>]/g,"\\$&"),"gi"))||[]).length,b=(html.match(new RegExp(fe.replace(/[<>]/g,"\\$&"),"gi"))||[]).length;
    if(a!==b)erros.push(`HTML desequilibrado: ${ab} /${fe}.`);
  }
  return {valido:erros.length===0,erros,avisos};
}

export function gerarProjeto(texto,analise={}){
  const plano=planoCriacao(texto,analise);
  const titulo=normalizar(texto).includes("jogo")?"Guinho Platformer":plano.tipo==="site"?"Guinho Web":"Guinho PWA";
  const files=plano.tipo==="jogo"?{"index.html":jogoHTML(titulo)}:plano.tipo==="site"?{"index.html":siteHTML(titulo)}:pwaFiles(titulo);
  return {plano,files,entry:"index.html",validacao:validarProjeto({files})};
}

export { planoCriacao };
