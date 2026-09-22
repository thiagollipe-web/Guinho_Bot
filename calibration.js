import { EstatisticaLinguistica } from "./probabilistic.js";

export const BENCHMARK_INTENCOES = [
  ["O que é JavaScript?", "programacao"],
  ["Como criar um site responsivo?", "programacao"],
  ["Meu código JavaScript está dando erro", "programacao"],
  ["Analise este código e encontre problemas", "programacao"],
  ["Como instalar o Node.js?", "programacao"],
  ["Como usar Git e GitHub?", "programacao"],

  ["Crie um jogo de plataforma em HTML", "jogos"],
  ["Como funciona a colisão AABB?", "jogos"],
  ["Como fazer um personagem pular?", "jogos"],
  ["Como melhorar o FPS do meu jogo?", "jogos"],
  ["Quero fazer um jogo em MakeCode Arcade", "jogos"],
  ["O que é um spritesheet?", "jogos"],

  ["O que significa fotossíntese?", "ciencias"],
  ["Por que o céu é azul?", "conhecimento"],
  ["Como funciona um buraco negro?", "ciencias"],
  ["O que é uma reação química?", "ciencias"],

  ["Quanto é 25 + 17?", "matematica"],
  ["Calcule 15% de 200", "matematica"],
  ["Resolva a equação x + 5 = 12", "matematica"],
  ["Qual a área de um círculo?", "matematica"],

  ["Vai chover hoje?", "tempo"],
  ["Qual a temperatura agora?", "tempo"],
  ["Como está o clima?", "tempo"],
  ["Qual a previsão do tempo?", "tempo"],

  ["Qual o valor do dólar?", "moeda"],
  ["Quanto vale o euro?", "moeda"],
  ["Qual a cotação do dólar?", "moeda"],
  ["Quanto está o euro hoje?", "moeda"],

  ["Qual é o meu nome?", "memoria"],
  ["Você lembra de mim?", "memoria"],
  ["O que você lembra sobre mim?", "memoria"],

  ["Quais são as notícias de hoje?", "noticias"],
  ["O que aconteceu hoje?", "noticias"],
  ["Quais são as últimas notícias?", "noticias"],

  ["Oi, Guinho", "saudacao"],
  ["Bom dia", "saudacao"],
  ["Olá, tudo bem?", "saudacao"],
  ["E aí?", "saudacao"],

  ["Obrigado pela ajuda", "agradecimento"],
  ["Valeu", "agradecimento"],
  ["Muito obrigado", "agradecimento"],

  ["Tchau", "despedida"],
  ["Até mais", "despedida"],
  ["Vou embora", "despedida"],

  ["Me ajude", "ajuda"],
  ["O que você pode fazer?", "ajuda"],
  ["Como usar o Guinho?", "ajuda"]
];

export function avaliarClassificador(pnl=new EstatisticaLinguistica(),dataset=BENCHMARK_INTENCOES){
  const labels=[...new Set(dataset.map(x=>x[1]))];
  const matriz=Object.fromEntries(labels.map(l=>[l,Object.fromEntries(labels.map(x=>[x,0]))]));
  let acertos=0;
  const previsoes=[];
  for(const [texto,esperada] of dataset){
    const d=pnl.detectar(texto);
    const acertou=d.intent===esperada;
    if(acertou)acertos++;
    matriz[esperada][d.intent]=(matriz[esperada][d.intent]||0)+1;
    previsoes.push({texto,esperada,obtida:d.intent,acertou,confianca:d.probability,bruta:d.rawProbability});
  }
  const porClasse={};
  for(const label of labels){
    const tp=matriz[label][label]||0;
    const fn=labels.reduce((s,x)=>s+(x===label?0:matriz[label][x]||0),0);
    const fp=labels.reduce((s,x)=>s+(x===label?0:matriz[x]?.[label]||0),0);
    const precision=tp/(tp+fp||1),recall=tp/(tp+fn||1);
    const f1=(2*precision*recall)/(precision+recall||1);
    porClasse[label]={precision,recall,f1,suporte:tp+fn};
  }
  const macroF1=Object.values(porClasse).reduce((s,x)=>s+x.f1,0)/(labels.length||1);
  const bins=Array.from({length:10},()=>({n:0,somaConfianca:0,somaAcerto:0}));
  for(const p of previsoes){
    const i=Math.min(9,Math.floor(Math.max(0,p.confianca)*10));
    bins[i].n++;
    bins[i].somaConfianca+=p.confianca;
    bins[i].somaAcerto+=p.acertou?1:0;
  }
  const ece=bins.reduce((s,b)=>{
    if(!b.n)return s;
    return s+(b.n/dataset.length)*Math.abs((b.somaConfianca/b.n)-(b.somaAcerto/b.n));
  },0);
  const brier=previsoes.reduce((s,p)=>s+Math.pow(p.confianca-(p.acertou?1:0),2),0)/(dataset.length||1);
  return {total:dataset.length,acertos,accuracy:acertos/(dataset.length||1),macroF1,ece,brier,porClasse,matriz,previsoes};
}

export function relatorioCalibracao(resultado){
  return [
    `Amostras: ${resultado.total}`,
    `Accuracy: ${(resultado.accuracy*100).toFixed(1)}%`,
    `Macro-F1: ${(resultado.macroF1*100).toFixed(1)}%`,
    `ECE: ${resultado.ece.toFixed(4)}`,
    `Brier: ${resultado.brier.toFixed(4)}`
  ].join(" | ");
}
