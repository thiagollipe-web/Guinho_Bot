import { CONHECIMENTO } from "./knowledge.js";
import { RecuperadorSemantico } from "./retrieval.js";
import { MemoriaSessao } from "./memory.js";
import { EstatisticaLinguistica, GeradorEstatistico } from "./probabilistic.js";

const chat=document.querySelector("#chat");
const form=document.querySelector("#composer");
const input=document.querySelector("#message");
const statusText=document.querySelector("#status-text");
const buttons=document.querySelectorAll("[data-cmd]");

const pnl=new EstatisticaLinguistica();
const recuperador=new RecuperadorSemantico(CONHECIMENTO);
const memoria=new MemoriaSessao();
const gerador=new GeradorEstatistico();

class CompositorRespostas{
  constructor({pnl,recuperador,memoria,gerador}){this.pnl=pnl;this.recuperador=recuperador;this.memoria=memoria;this.gerador=gerador;}
  contexto(texto){
    const q=this.pnl.normalizar(texto);
    const curtas=q.split(" ").length<=5;
    const referencia=/\b(isso|isto|esse|essa|ele|ela|eles|elas|aquilo)\b/.test(q);
    if((curtas||referencia)&&this.memoria.estado.assuntoAtual)return `${texto} ${this.memoria.estado.assuntoAtual}`;
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
    const abertura=this.gerador.abertura(tipo,analise.probability);
    let corpo=frases.map(x=>x.frase);
    if(tipo==="comparacao"&&corpo.length>=2)corpo=[corpo[0],corpo[1]];
    if(tipo==="lista")corpo=corpo.slice(0,3);
    if(tipo==="definicao")corpo=corpo.slice(0,2);
    const fechamento=tipo==="como"?"Esse é o fluxo essencial; os detalhes dependem do contexto em que o conceito é usado.":tipo==="por_que"?"Esse mecanismo explica o resultado de forma geral.":tipo==="comparacao"?"Em resumo, os conceitos têm funções relacionadas, mas não são equivalentes.":"";
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
  const limpo=texto.replace(/^\/(ajuda|moeda|noticias|tempo|pnl|diagnostico)\b/i,"$1").trim();
  if(/^pnl\b|^diagnostico\b/i.test(limpo)){
    const alvo=limpo.replace(/^(pnl|diagnostico)\b/i,"").trim()||texto;
    const rel=pnl.explicar(alvo);
    return `Diagnóstico local:\nIntenção: ${rel.intencao}\nConfiança: ${(rel.confianca*100).toFixed(1)}%\nMargem: ${(rel.margem*100).toFixed(1)}%\nTipo: ${rel.tipo}\n\nProbabilidades:\n${rel.probabilidades.slice(0,5).map(x=>`${x.intent}: ${(x.probability*100).toFixed(1)}%`).join("\n")}`;
  }
  const analise=pnl.detectar(limpo);
  if(analise.intent==="moeda")return api.moeda();
  if(analise.intent==="noticias")return api.noticias();
  if(analise.intent==="tempo")return api.tempo(limpo);
  if(analise.intent==="cep")return api.cep(limpo);
  const especial=intencaoEspecial(analise,limpo);
  if(especial)return especial;
  const composta=compositor.compor(limpo,analise);
  if(composta)return composta;
  return "Eu não tenho evidência suficiente para responder com segurança. Tente reformular a pergunta com um pouco mais de contexto.";
}

function add(role,text){
  const el=document.createElement("div");el.className="line "+(role==="user"?"user":"bot");
  const meta=document.createElement("div");meta.className="meta";meta.textContent=role==="user"?"VOCÊ >":"GUINHO >";
  const box=document.createElement("div");box.className="bubble";box.textContent=text;
  el.append(meta,box);chat.appendChild(el);chat.scrollTop=chat.scrollHeight;
}

form.addEventListener("submit",async e=>{
  e.preventDefault();
  const texto=input.value.trim();
  if(!texto)return;
  add("user",texto);memoria.adicionar("user",texto);input.value="";
  buttons.forEach(b=>b.disabled=true);statusText.textContent="ANALISANDO";
  try{const resposta=await responder(texto);add("bot",resposta);memoria.adicionar("assistant",resposta);}
  catch(err){add("bot","Não consegui consultar uma fonte externa: "+err.message);}
  finally{buttons.forEach(b=>b.disabled=false);statusText.textContent="LOCAL READY";input.focus();}
});
buttons.forEach(b=>b.addEventListener("click",()=>{input.value=b.dataset.cmd;form.requestSubmit();}));
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js"));
const historico=memoria.historico();if(historico.length){historico.slice(-8).forEach(m=>add(m.role,m.content));}else add("bot","Sistema iniciado. Motor probabilístico local, recuperação semântica e memória de sessão ativos. Experimente: “o que é JavaScript?”, “por que existe o dia e a noite?” ou “diagnostico o que é um planeta”.");
