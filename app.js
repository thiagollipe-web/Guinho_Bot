import { CONHECIMENTO } from "./knowledge.js";
import { RecuperadorSemantico } from "./retrieval.js";
import { MemoriaSessao } from "./memory.js";
import { EstatisticaLinguistica, GeradorEstatistico } from "./probabilistic.js";
import { BIBLIOTECA_JOGOS } from "./game-library.js";
import { ContextoConversacional } from "./context.js";
import { perfilPergunta } from "./prompt-library.js";
import { gerarProjeto } from "./generator.js";
import { extrairBlocosCodigo, analisarCodigo, analisarProjeto, relatorioAnalise } from "./analyzer.js";

const chat=document.querySelector("#chat");
const form=document.querySelector("#composer");
const input=document.querySelector("#message");
const statusText=document.querySelector("#status-text");
const buttons=document.querySelectorAll("[data-cmd]");
const siteSearch=document.querySelector("#site-search");
const newChatButton=document.querySelector("#new-chat");
const clearChatButton=document.querySelector("#clear-chat");
const focusInputButton=document.querySelector("#focus-input");
const drawerOverlay=document.querySelector("#drawer-overlay");
const leftSidebar=document.querySelector(".sidebar-left");
const openLeft=document.querySelector("#open-left");
const closeLeft=document.querySelector("#close-left");
const selectedModes=document.querySelectorAll("[data-mode]");
const navItems=document.querySelectorAll("[data-nav]");
const topicButtons=document.querySelectorAll("[data-topic]");
const toast=document.querySelector("#toast");

const pnl=new EstatisticaLinguistica();
const recuperador=new RecuperadorSemantico(CONHECIMENTO);
const memoria=new MemoriaSessao();
const gerador=new GeradorEstatistico();
const contexto=new ContextoConversacional();
let modoAtual="standard";

function respostaCriacao(texto,analise){
  const projeto=gerarProjeto(texto,analise);
  const nomes=Object.keys(projeto.files);
  const estado=projeto.validacao.valido?"VALIDAÇÃO OK":"VALIDAÇÃO COM ERROS";
  const avisos=projeto.validacao.avisos.length?`\\nAvisos: ${projeto.validacao.avisos.join(" • ")}`:"";
  const primeiro=projeto.files[projeto.entry]||"";
  const limite=primeiro.length>14000?primeiro.slice(0,13997)+"...":primeiro;
  return `Projeto gerado: ${projeto.plano.tipo}\\nEstratégia: ${projeto.plano.estrategia}\\nTecnologias: ${projeto.plano.tecnologias.join(", ")}\\nArquivos: ${nomes.join(", ")}\\n${estado}${projeto.validacao.erros.length?`\\nErros: ${projeto.validacao.erros.join(" • ")}`:""}${avisos}\\n\\nArquivo de entrada: ${projeto.entry}\\n\\n${limite}`;
}


function respostaAnalise(texto){
  const blocos=extrairBlocosCodigo(texto);
  if(blocos.length===0)return "Para fazer a análise, cole o código na mensagem. Posso auditar HTML, CSS e JavaScript e verificar DOM, eventos, Canvas, mobile, PWA, segurança e performance.";
  const arquivos={};
  blocos.slice(0,8).forEach((codigo,i)=>{
    const q=codigo.toLowerCase();
    const nome=/<(?:!doctype|html|body|canvas)\b/.test(q)?"codigo-"+(i+1)+".html":/[.#][\w-]+\s*\{/.test(q)?"codigo-"+(i+1)+".css":"codigo-"+(i+1)+".js";
    arquivos[nome]=codigo;
  });
  const resultado=Object.keys(arquivos).length===1
    ? analisarCodigo(Object.values(arquivos)[0],Object.keys(arquivos)[0])
    : analisarProjeto(arquivos);
  return relatorioAnalise(resultado);
}
class CompositorRespostas{
  constructor({pnl,recuperador,memoria,gerador}){this.pnl=pnl;this.recuperador=recuperador;this.memoria=memoria;this.gerador=gerador;}
  contexto(texto){
    const q=this.pnl.normalizar(texto);
    const curtas=q.split(" ").length<=5;
    const referencia=/\b(isso|isto|esse|essa|ele|ela|eles|elas|aquilo)\b/.test(q);
    if((curtas||referencia)&&this.memoria.estado.assuntoAtual)return contexto.referencia(texto,this.pnl);
    return texto;
  }
  selecionarFrases(consulta,tipo){
    const candidatas=this.recuperador.frasesRelevantes(this.contexto(consulta),6,10);
    const escolhidas=[];
    const vistos=new Set();
    for(const c of candidatas){
      const chave=this.pnl.normalizar(c.frase);
      if(vistos.has(chave))continue;
      const incompat=(tipo==="lista"&&c.frase.length<25)?1:0;
      if(c.score+incompat<.1)continue;
      if(escolhidas.every(x=>x.tema!==c.tema)||escolhidas.length<2){
        escolhidas.push(c);vistos.add(chave);
      }
      if(escolhidas.length>=3)break;
    }
    return escolhidas;
  }
  compor(consulta,analise){
    const tipo=analise.tipo;
    const frases=this.selecionarFrases(consulta,tipo);
    if(!frases.length)return null;
    this.memoria.definirAssunto(frases[0].tema);
    const estrategia=this.gerador.estrategia(analise);
    const tipoResposta=estrategia.estrategia==="tutorial"?"como":estrategia.estrategia==="diagnostico"?"diagnostico":estrategia.estrategia==="melhoria"?"melhoria":tipo;
    const abertura=this.gerador.abertura(tipoResposta,analise.probability);
    let corpo=frases.map(x=>x.frase);
    if(tipo==="comparacao"&&corpo.length>=2)corpo=[corpo[0],corpo[1]];
    if(tipo==="lista")corpo=corpo.slice(0,3);
    if(tipo==="definicao")corpo=corpo.slice(0,2);
    const fechamento=this.gerador.fechamento(tipoResposta,analise.probability);
    const fonte="\n\nBase local: "+[...new Set(frases.map(x=>x.titulo))].slice(0,3).join(" • ");
    return abertura+" "+corpo.join(" ")+(fechamento?" "+fechamento:"")+fonte;
  }
}

const compositor=new CompositorRespostas({pnl,recuperador,memoria,gerador});

class CalculadoraSegura{
  constructor(){this.precedencia={"+":1,"-":1,"*":2,"/":2,"%":2,"u-":3};}
  tokenizar(s){return s.replace(/,/g,".").match(/\d+(?:\.\d+)?|[()+\-*/%]/g)||[];}
  resolver(expr){
    const limpo=expr.replace(/\s/g,"").replace(/,/g,".");
    const tokens=this.tokenizar(limpo);
    if(!tokens.length||tokens.join("")!==limpo)return null;
    const vals=[],ops=[];let espera=true;
    const aplicar=()=>{
      const op=ops.pop();
      if(op==="u-"){if(!vals.length)throw new Error("Expressão inválida");vals.push(-vals.pop());return;}
      const b=vals.pop(),a=vals.pop();
      if(!Number.isFinite(a)||!Number.isFinite(b))throw new Error("Expressão inválida");
      if(op==="/"&&b===0)throw new Error("Divisão por zero");
      vals.push(op==="+"?a+b:op==="-"?a-b:op==="*"?a*b:op==="/" ? a/b:a%b);
    };
    for(const t of tokens){
      if(/^\d/.test(t)){vals.push(Number(t));espera=false;continue;}
      if(t==="("){ops.push(t);espera=true;continue;}
      if(t===")"){while(ops.length&&ops.at(-1)!=="(")aplicar();if(ops.pop()!=="(")throw new Error("Parênteses inválidos");espera=false;continue;}
      if(espera&&t==="-"){ops.push("u-");continue;}
      if(espera)throw new Error("Operador inesperado");
      while(ops.length&&ops.at(-1)!=="("&&this.precedencia[ops.at(-1)]>=this.precedencia[t])aplicar();
      ops.push(t);espera=true;
    }
    if(espera)throw new Error("Expressão incompleta");
    while(ops.length){if(ops.at(-1)==="(")throw new Error("Parênteses inválidos");aplicar();}
    return vals.length===1?vals[0]:null;
  }
}
const calc=new CalculadoraSegura();

const api={
  async moeda(){
    const r=await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL");
    if(!r.ok)throw new Error("A cotação está indisponível no momento.");
    const d=await r.json();
    const usd=Number(d.USDBRL?.bid),eur=Number(d.EURBRL?.bid);
    return `Agora, a cotação está em aproximadamente R$ ${usd.toFixed(4)} para US$ 1 e R$ ${eur.toFixed(4)} para € 1.`;
  },
  async noticias(){
    const r=await fetch("https://servicodados.ibge.gov.br/api/v3/noticias/?qtd=3");
    if(!r.ok)throw new Error("As notícias do IBGE estão indisponíveis.");
    const d=await r.json();
    const items=(d.items||[]).slice(0,3);
    if(!items.length)return "O IBGE não retornou notícias agora.";
    return "As três manchetes mais recentes que recebi do IBGE são:\n\n"+items.map((x,i)=>`${i+1}) ${x.titulo}\n${x.introducao||""}\n${x.link||""}`).join("\n\n");
  },
  async tempo(texto){
    let lat=-23.5505,lon=-46.6333,nome="São Paulo";
    const nums=texto.match(/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/);
    if(nums){lat=Number(nums[1]);lon=Number(nums[2]);nome=`${lat}, ${lon}`;}
    const u=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m&timezone=auto`;
    const r=await fetch(u);
    if(!r.ok)throw new Error("O serviço de clima está indisponível.");
    const d=await r.json();
    return `Em ${nome}, a temperatura atual é ${d.current?.temperature_2m??"?"} °C e o vento está em ${d.current?.wind_speed_10m??"?"} km/h.`;
  },
  async cep(texto){
    const m=texto.match(/\b\d{5}-?\d{3}\b/);
    if(!m)return "Envie um CEP com 8 dígitos, por exemplo 01001000.";
    const c=m[0].replace(/\D/g,"");
    const r=await fetch(`https://viacep.com.br/ws/${c}/json/`);
    if(!r.ok)throw new Error("O ViaCEP está indisponível.");
    const d=await r.json();
    if(d.erro)return "Não encontrei esse CEP.";
    return `Encontrei este endereço: ${d.logradouro||"logradouro não informado"}, ${d.bairro||"bairro não informado"}, ${d.localidade||"cidade não informada"} - ${d.uf||"UF não informada"}.`;
  }
};

function extrairMemoria(texto){
  const nome=texto.match(/(?:meu nome é|meu nome e|me chamo|sou o|sou a)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,50})$/i);
  if(nome)memoria.definirUsuario("nome",nome[1].trim().replace(/\s+/g," "));
  const cidade=texto.match(/(?:moro em|sou de|estou em)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{1,50})$/i);
  if(cidade)memoria.definirUsuario("cidade",cidade[1].trim());
}

function memoriaReply(){
  const r=memoria.resumo();
  return r?"Eu me lembro, nesta sessão, de:\n"+r:"Ainda não guardei informações pessoais nesta sessão.";
}

function intencaoEspecial(analise,texto){
  if(analise.intent==="saudacao")return "Olá. Eu sou o Guinho-Bot. Eu analiso a linguagem localmente, procuro evidências na minha base e uso probabilidades para decidir como responder.";
  if(analise.intent==="despedida")return "Até mais. Quando voltar, a base local estará disponível novamente.";
  if(analise.intent==="agradecimento")return "De nada. Fico por aqui para a próxima pergunta.";
  if(analise.intent==="ajuda")return "Posso conversar usando a base local, recuperar conceitos por similaridade, calcular, lembrar informações desta sessão e consultar moeda, notícias, clima e CEP.";
  if(analise.intent==="jogos")return "A biblioteca de jogos está disponível no Guinho-Bot. Ela reúne MakeCode Arcade, microStudio e TIC-80, além de Kenney, OpenGameArt, Itch.io, Piskel e Pixelorama.\n\nPara o primeiro protótipo de movimentação em SVG, a referência visual será o Piskel e a referência de lógica será o MakeCode Arcade.\n\nUse a seção Biblioteca de Jogos na interface para abrir os recursos.";
  if(analise.intent==="memoria")return memoriaReply();
  if(analise.intent==="matematica"){
    const q=pnl.normalizar(texto);
    const bh=q.match(/bhaskara\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/);
    if(bh){const [a,b,c]=bh.slice(1).map(Number);if(a===0)return "Para Bhaskara, a precisa ser diferente de zero.";const delta=b*b-4*a*c;if(delta<0)return `O discriminante é ${delta}, então não há raízes reais.`;return `O discriminante é ${delta}. As raízes são aproximadamente x₁=${(-b+Math.sqrt(delta))/(2*a)} e x₂=${(-b-Math.sqrt(delta))/(2*a)}.`;}
    const trecho=texto.replace(/^.*?(calcule|quanto é|quanto e)\s*/i,"").trim();
    try{const n=calc.resolver(trecho);if(n!==null)return `O resultado é ${n}.`;}catch(err){return err.message;}
    return "Consigo resolver expressões e Bhaskara. Exemplo: bhaskara 1 -5 6.";
  }
  return null;
}

async function responder(texto){
  extrairMemoria(texto);
  const limpo=texto.replace(/^\/(ajuda|moeda|noticias|tempo|pnl|diagnostico|analisar)\b/i,"$1").trim();
  if(/^analisar\b/i.test(limpo)){
    const alvo=limpo.replace(/^analisar\b/i,"").trim();
    const r=respostaAnalise(alvo);
    contexto.atualizar({texto:limpo,resposta:r,analise:pnl.detectar(limpo),estrategia:"diagnostico",assunto:memoria.estado.assuntoAtual});
    return r;
  }
    if(/^pnl\b|^diagnostico\b/i.test(limpo)){
    const alvo=limpo.replace(/^(pnl|diagnostico)\b/i,"").trim()||texto;
    const rel=pnl.explicar(alvo);
    const est=pnl.detectar(alvo);
    const estrategia=gerador.estrategia(est);
    const perfil=perfilPergunta(alvo);
    return `Diagnóstico local:
Intenção: ${rel.intencao}
Confiança combinada: ${(rel.confianca*100).toFixed(1)}%
Probabilidade bruta: ${(rel.probabilidadeBruta*100).toFixed(1)}%
Margem: ${(rel.margem*100).toFixed(1)}%
Entropia: ${rel.entropia.toFixed(2)}
Ambiguidade: ${rel.ambigua?"sim":"não"}
Tipo: ${rel.tipo}
Objetivo: ${rel.objetivo}
Estratégia: ${estrategia.estrategia}
Domínios da biblioteca: ${Object.keys(perfil.dominios).slice(0,5).join(", ")||"nenhum"}
Intenções reforçadas: ${Object.keys(perfil.intencoes).slice(0,5).join(", ")||"nenhuma"}
Formatos detectados: ${Object.keys(perfil.formatos).join(", ")||"nenhum"}

Probabilidades:
${rel.probabilidades.slice(0,5).map(x=>`${x.intent}: ${(x.probability*100).toFixed(1)}%`).join("\n")}

Objetivos:
${rel.objetivos.slice(0,4).map(x=>`${x.objetivo}: ${(x.probability*100).toFixed(1)}%`).join("\n")}`;
  }
  const textoContextual=contexto.referencia(limpo,pnl);
  const analise=pnl.detectar(textoContextual,contexto.resumo());
  if(analise.confident&&analise.intent==="moeda"){const r=await api.moeda();contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"conversa"});return r;}
  if(analise.confident&&analise.intent==="noticias"){const r=await api.noticias();contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"explicacao"});return r;}
  if(analise.confident&&analise.intent==="tempo"){const r=await api.tempo(limpo);contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"explicacao"});return r;}
  if(analise.confident&&analise.intent==="cep"){const r=await api.cep(limpo);contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"explicacao"});return r;}
  if(analise.confident&&(analise.objetivo==="analisar"||analise.objetivo==="diagnosticar")&&["jogos","programacao"].includes(analise.intent)){
    const r=respostaAnalise(limpo);
    contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"diagnostico",assunto:memoria.estado.assuntoAtual});
    return r;
  }
  if(analise.confident&&analise.objetivo==="criar"&&["jogos","programacao"].includes(analise.intent)){
    const r=respostaCriacao(limpo,analise);
    contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"codigo",assunto:memoria.estado.assuntoAtual});
    return r;
  }
  const especial=analise.confident?intencaoEspecial(analise,limpo):null;
  if(especial){contexto.atualizar({texto:limpo,resposta:especial,analise,estrategia:gerador.estrategia(analise).estrategia,assunto:memoria.estado.assuntoAtual});return especial;}
  const composta=compositor.compor(textoContextual,analise);
  if(composta){contexto.atualizar({texto:limpo,resposta:composta,analise,estrategia:gerador.estrategia(analise).estrategia,assunto:memoria.estado.assuntoAtual});return composta;}
  const r=analise.confident
    ? "Eu não encontrei evidência suficiente na base local para responder com segurança. Tente acrescentar o assunto, uma definição ou o contexto da pergunta."
    : "Ainda estou dividido entre algumas interpretações. Se você acrescentar o objetivo ou a tecnologia envolvida, consigo direcionar melhor a resposta.";
  contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:gerador.estrategia(analise).estrategia,assunto:memoria.estado.assuntoAtual});
  return r;
}

function adaptarModo(resposta){
  if(modoAtual==="standard")return resposta;
  if(modoAtual==="resumido"){
    const partes=resposta.split(/\n\n+/).filter(Boolean);
    const texto=partes[0]||resposta;
    return texto.length>620?texto.slice(0,617).trimEnd()+"...":texto;
  }
  if(modoAtual==="passo"){
    const partes=resposta.replace(/\n+/g," ").split(/(?<=[.!?])\s+/).filter(Boolean);
    if(partes.length<2)return resposta;
    return partes.slice(0,6).map((p,i)=>`${i+1}. ${p}`).join("\n");
  }
  if(modoAtual==="criativo"){
    return "Vamos olhar para isso por outro ângulo.\n\n"+resposta;
  }
  if(modoAtual==="detalhado"){
    return resposta+"\n\nModo detalhado: a resposta acima foi composta a partir das evidências locais recuperadas e da intenção identificada pelo motor probabilístico.";
  }
  return resposta;
}

function showToast(message){
  if(!toast)return;
  toast.textContent=message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer=setTimeout(()=>toast.classList.remove("show"),2200);
}

function closeDrawer(){
  leftSidebar?.classList.remove("open");
  drawerOverlay?.classList.remove("show");
}
function openDrawer(){
  leftSidebar?.classList.add("open");
  drawerOverlay?.classList.add("show");
}

function resetChat(){
  memoria.limpar();
  contexto.limpar();
  chat.innerHTML="";
  add("bot","Nova conversa iniciada. A sessão de memória foi limpa e o motor local está pronto.");
  input?.focus();
  showToast("Nova conversa iniciada");
}

function runCommand(value){
  if(!input)return;
  input.value=value;
  input.dispatchEvent(new Event("input"));
  form.requestSubmit();
}

function inserirQuebraAuto(){
  if(!input)return;
  input.style.height="auto";
  input.style.height=Math.min(input.scrollHeight,140)+"px";
}

function add(role,text){
  const el=document.createElement("div");el.className="line "+(role==="user"?"user":"bot");
  const meta=document.createElement("div");meta.className="meta";meta.textContent=role==="user"?"VOCÊ >":"GUINHO >";
  const box=document.createElement("div");box.className="bubble";
  const fonteIndex=text.indexOf("\n\nBase local:");
  if(role==="bot"&&fonteIndex>=0){
    const corpo=text.slice(0,fonteIndex);
    const fonte=text.slice(fonteIndex+2);
    box.textContent=corpo;
    const source=document.createElement("div");
    source.className="message-source";
    source.textContent=fonte;
    box.appendChild(source);
  }else{
    box.textContent=text;
  }
  el.append(meta,box);chat.appendChild(el);chat.scrollTop=chat.scrollHeight;
}

form.addEventListener("submit",async e=>{
  e.preventDefault();
  const texto=input.value.trim();
  if(!texto)return;
  add("user",texto);memoria.adicionar("user",texto);input.value="";
  buttons.forEach(b=>b.disabled=true);statusText.textContent="ANALISANDO";
  try{const respostaBruta=await responder(texto);const resposta=adaptarModo(respostaBruta);add("bot",resposta);memoria.adicionar("assistant",resposta);}
  catch(err){add("bot","Não consegui consultar uma fonte externa: "+err.message);}
  finally{buttons.forEach(b=>b.disabled=false);statusText.textContent="LOCAL READY";input.focus();}
});
buttons.forEach(b=>b.addEventListener("click",()=>runCommand(b.dataset.cmd)));

selectedModes.forEach(mode=>{
  mode.addEventListener("click",()=>{
    modoAtual=mode.dataset.mode;
    selectedModes.forEach(x=>x.classList.toggle("active",x===mode));
    showToast("Modo: "+mode.querySelector("strong")?.textContent);
    input?.focus();
  });
});

topicButtons.forEach(button=>{
  button.addEventListener("click",()=>{
    const topico=button.dataset.topic;
    runCommand(`Explique ${topico} de forma clara.`);
    closeDrawer();
  });
});

navItems.forEach(item=>{
  item.addEventListener("click",()=>{
    navItems.forEach(x=>x.classList.toggle("active",x===item));
    const nav=item.dataset.nav;
    if(nav==="chat"){input?.focus();closeDrawer();return;}
    if(nav==="history"){showToast("O histórico desta sessão aparece na conversa atual.");return;}
    if(nav==="favorites"){showToast("Favoritos locais ainda não foram criados nesta sessão.");return;}
    if(nav==="explore"){siteSearch?.focus();showToast("Use a busca para explorar a base local.");return;}
    if(nav==="settings"){showToast("Configurações locais: memória, modo e cache estão ativos.");}
  });
});

newChatButton?.addEventListener("click",()=>{resetChat();closeDrawer();});
clearChatButton?.addEventListener("click",resetChat);
focusInputButton?.addEventListener("click",()=>input?.focus());
openLeft?.addEventListener("click",openDrawer);
closeLeft?.addEventListener("click",closeDrawer);
drawerOverlay?.addEventListener("click",closeDrawer);

siteSearch?.addEventListener("keydown",event=>{
  if(event.key==="Enter"){
    event.preventDefault();
    const q=siteSearch.value.trim();
    if(q)runCommand(`Pesquise na base local: ${q}`);
  }
});

document.addEventListener("keydown",event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){
    event.preventDefault();
    siteSearch?.focus();
  }
});

input?.addEventListener("input",inserirQuebraAuto);
input?.addEventListener("keydown",event=>{
  if(event.key==="Enter"&&!event.shiftKey){
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelector("#attach-placeholder")?.addEventListener("click",()=>showToast("Anexos ainda não estão conectados ao motor local."));
document.querySelector("#voice-placeholder")?.addEventListener("click",()=>showToast("Entrada de voz ainda não está conectada."));

if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js"));
const historico=memoria.historico();if(historico.length){historico.slice(-8).forEach(m=>add(m.role,m.content));}else add("bot","Sistema iniciado. Motor probabilístico local, recuperação semântica e memória de sessão ativos. Experimente: “o que é JavaScript?”, “por que existe o dia e a noite?” ou “diagnostico o que é um planeta”.");
