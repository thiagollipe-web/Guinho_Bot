import { buscarPadroes, pontuarBiblioteca } from "./prompt-library.js";
export class EstatisticaLinguistica{
  constructor(){
    this.stop=new Set(["a","o","e","os","as","um","uma","uns","umas","de","da","do","das","dos","em","no","na","nos","nas","por","para","com","sem","que","se","ao","aos","como","me","te","ele","ela","eles","elas","eu","voce","voces","isso","isto","esse","essa","este","esta"]);
    this.intencoes={
      saudacao:["oi","ola","bom dia","boa tarde","boa noite","e ai","tudo bem","prazer em conhecer","quem e voce"],
      despedida:["tchau","ate mais","falou","vou embora","nos vemos"],
      agradecimento:["obrigado","obrigada","valeu","agradeco","muito obrigado","muito obrigada"],
      ajuda:["ajuda","o que voce sabe fazer","comandos","como usar","recursos","menu"],
      memoria:["lembra de mim","o que voce lembra","qual meu nome","me conhece","lembra meu nome"],
      moeda:["dolar","euro","cotacao","quanto custa o dolar","quanto vale o euro","preco do dolar","preco do euro"],
      noticias:["noticias","ultimas noticias","manchetes","o que aconteceu hoje","novidades"],
      tempo:["clima","tempo","temperatura","previsao do tempo","vai chover","vento"],
      cep:["cep","endereco","logradouro","bairro","codigo postal"],
      matematica:["calcule","calcular","quanto e","bhaskara","equacao","porcentagem","raiz quadrada","regra de tres","matematica"],
      programacao:["javascript","html","css","programacao","codigo","canvas","git","github","software","web","site","aplicativo"],
      ciencias:["biologia","biologia celular","celula","anatomia","corpo humano","ecossistema","astronomia","sistema solar","planeta","fotossintese","fisica","quimica"],
      conhecimento:["o que e","como funciona","me explique","explique","defina","fale sobre","qual a diferenca","por que","porque","para que","quando","onde","quem"],
      jogos:["jogo","jogos","game","game dev","desenvolvimento de jogos","sprite","sprites","pixel art","spritesheet","tilemap","personagem","movimento de personagem","makecode","microstudio","tic 80","tic-80","piskel","pixelorama","kenney","opengameart","itch io","itch.io"]
    };
    this.objetivos={
      criar:["crie","criar","faca","fazer","monte","montar","gere","gerar","desenvolva","desenvolver","escreva","escrever","construa","construir","implemente","implementar","quero criar","preciso criar"],
      aprender:["aprender","estudar","ensine","ensinar","curso","aula","quero aprender","como faço","como faco","passo a passo","me ensine"],
      explicar:["explique","explica","o que e","como funciona","defina","fale sobre","entender"],
      melhorar:["melhore","melhorar","otimize","otimizar","aperfeicoe","aperfeicoar","deixar melhor","sugira melhorias","dicas para melhorar"],
      analisar:["analise","analisar","avalie","avaliar","revise","revisar","verifique","diagnostique","diagnosticar","encontre erros","bugs"],
      comparar:["compare","comparar","diferenca","diferença","versus","vs"],
      corrigir:["corrija","corrigir","conserte","consertar","arrume","arrumar","resolver erro","corrigir erro"]
    };
    this.tipos={
      como:["como","de que forma","qual o processo","passo a passo","como faco","como faço"],
      por_que:["por que","porque","qual o motivo","qual a razao","qual a razão"],
      comparacao:["qual a diferenca","qual e a diferenca","compare","comparacao","versus","vs"],
      lista:["quais","liste","listar","exemplos","tipos","opcoes","opções"],
      definicao:["o que e","o que é","quem e","quem é","defina","significa"],
      calculo:["calcule","calcular","quanto e","quanto é","resultado","bhaskara"],
      criacao:["crie","criar","faca","fazer","monte","gere","desenvolva","implemente","construa"],
      diagnostico:["analise","analisar","revise","revisar","corrija","corrigir","erro","bug","problema","diagnostico","diagnóstico"],
      melhoria:["melhore","melhorar","otimize","otimizar","aperfeicoe","aperfeiçoar","melhorias","dicas"],
      geral:[]
    };
    this.corpus=[];
    for(const [intent,examples] of Object.entries(this.intencoes))for(const text of examples)this.corpus.push({intent,text});
    this.vocab=new Set();
    this.termCount=new Map();
    this.intentDocs=new Map();
    this.documentFrequency=new Map();
    for(const intent of Object.keys(this.intencoes)){this.termCount.set(intent,new Map());this.intentDocs.set(intent,0);}
    for(const item of this.corpus){
      const terms=[...new Set(this.features(item.text))];
      this.intentDocs.set(item.intent,(this.intentDocs.get(item.intent)||0)+1);
      const bag=this.termCount.get(item.intent);
      for(const term of terms){this.vocab.add(term);bag.set(term,(bag.get(term)||0)+1);this.documentFrequency.set(term,(this.documentFrequency.get(term)||0)+1);}
    }
    this.totalDocs=this.corpus.length;
    this.intentNames=Object.keys(this.intencoes);
    this.totalTerms=new Map([...this.termCount].map(([k,m])=>[k,[...m.values()].reduce((a,b)=>a+b,0)]));
    this.idf=new Map([...this.documentFrequency].map(([term,df])=>[term,Math.log((this.totalDocs+1)/(df+1))+1]));
  }

  normalizar(texto){return String(texto??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();}
  stem(token){
    let t=token;
    const sufixos=["mente","amentos","imentos","amento","imento","acoes","coes","cao","ções","ção","ando","endo","indo","ados","idos","adas","idas","amente","mente","os","as","es","em","am","ou","ar","er","ir","s"];
    for(const s of sufixos)if(t.length>s.length+3&&t.endsWith(s)){t=t.slice(0,-s.length);break;}
    return t;
  }
  tokens(texto){return this.normalizar(texto).split(" ").filter(Boolean).filter(t=>!this.stop.has(t)).map(t=>this.stem(t));}
  features(texto){
    const t=this.tokens(texto),out=[...t];
    for(let i=0;i<t.length-1;i++)out.push(t[i]+"_"+t[i+1]);
    for(let i=0;i<t.length-2;i++)out.push(t[i]+"_"+t[i+1]+"_"+t[i+2]);
    return out;
  }
  pesosTermos(texto){
    const counts=new Map();
    for(const term of this.features(texto))counts.set(term,(counts.get(term)||0)+1);
    return [...counts].map(([term,count])=>({term,peso:(1+Math.log(count))*(this.idf.get(term)||1)}));
  }
  laplace(term,intent){
    const bag=this.termCount.get(intent),count=bag?.get(term)||0,total=this.totalTerms.get(intent)||0;
    return Math.log((count+1)/(total+this.vocab.size));
  }
  edit(a,b){
    if(a===b)return 1;if(!a||!b||Math.abs(a.length-b.length)>3)return 0;
    let prev=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){const cur=[i];for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur;}
    return 1-prev[b.length]/Math.max(a.length,b.length);
  }
  fuzzy(text,intent){
    const q=this.tokens(text);if(!q.length)return 0;let best=0;
    for(const p of this.intencoes[intent]){
      const terms=this.tokens(p);if(!terms.length)continue;let hits=0;
      for(const term of terms){
        let local=0;
        for(const qt of q){
          if(qt===term)local=1;
          else if(qt.includes(term)||term.includes(qt))local=Math.max(local,.84);
          else local=Math.max(local,this.edit(qt,term));
        }
        hits+=local;
      }
      const cobertura=hits/terms.length,precisao=Math.min(1,hits/Math.max(1,q.length));
      best=Math.max(best,cobertura*.7+precisao*.3);
    }
    return best;
  }
  keywordBoost(text,intent){
    const q=this.normalizar(text);let hits=0;
    for(const example of this.intencoes[intent]||[]){const e=this.normalizar(example);if(e.length>=4&&q.includes(e))hits++;}
    return Math.min(1,hits/Math.max(1,Math.min(3,this.intencoes[intent]?.length||1)));
  }
  posterior(text){
    const feats=this.pesosTermos(text);
    const biblioteca=pontuarBiblioteca(text);
    const porIntent=new Map(Object.entries(biblioteca));
    const q=this.normalizar(text);
    const assinaturas=[
      {intent:"jogos",regex:/\b(jogo|jogos|game|piskel|pixelorama|sprite|spritesheet|tilemap|makecode|microstudio|tic 80|kenney|opengameart)\b/,bonus:4.0},
      {intent:"programacao",regex:/\b(codigo|código|programacao|programação|javascript|typescript|html|css|python|nodejs|node\.js|github|canvas|npm|git|ollama|llama\.cpp|gguf|pwa|service worker|manifest)\b/,bonus:4.0}
    ];
    for(const a of assinaturas)if(a.regex.test(q))porIntent.set(a.intent,(porIntent.get(a.intent)||0)+a.bonus);
    const marcaJogo=/\b(jogo|jogos|game|gameplay|personagem|inimigo|fase|checkpoint|spritesheet|tilemap|pixel art|piskel|pixelorama|makecode|microstudio|tic 80|kenney|opengameart)\b/.test(q);
    const marcaSite=/\b(site|pagina|página|landing page|portifolio|portfólio|blog)\b/.test(q);
    const marcaCodigo=/\b(codigo|código|script|programacao|programação)\b/.test(q);
    if(marcaJogo){
      porIntent.set("jogos",12);
      if(/\b(html|css|javascript|typescript|canvas)\b/.test(q))porIntent.set("jogos",13);
      if(marcaSite&&!/\bjogo\b|\bgame\b/.test(q))porIntent.set("jogos",Math.min(8,porIntent.get("jogos")||0));
    }
    if(/\b(pwa|service worker|manifest|javascript|typescript|html|css|python|nodejs|node\.js|ollama|llama\.cpp|gguf)\b/.test(q))porIntent.set("programacao",marcaJogo&&!marcaSite?4:8);
    if(marcaCodigo&&!marcaJogo)porIntent.set("programacao",Math.max(6,porIntent.get("programacao")||0));
    const perguntaConceitual=/^(por que|porque|o que e|o que significa|como funciona|qual a diferenca)\\b/.test(q);
    const temDominioTecnico=/\\b(javascript|typescript|html|css|python|nodejs|node\\.js|github|git|canvas|pwa|service worker|manifest|ollama|llama\\.cpp|gguf|codigo|programacao|site|aplicativo|jogo|game|sprite|piskel|pixelorama|makecode|microstudio|tic 80|kenney|opengameart|itch io|fisica|quimica|biologia|astronomia)\\b/.test(q);
    if(perguntaConceitual&&!temDominioTecnico)porIntent.set("conhecimento",10);
    const rows=this.intentNames.map(intent=>{
      const prior=Math.log((this.intentDocs.get(intent)+1)/(this.totalDocs+this.intentNames.length));
      const likelihood=feats.reduce((sum,item)=>sum+item.peso*this.laplace(item.term,intent),0);
      const fuzzy=this.fuzzy(text,intent),keywordBoost=this.keywordBoost(text,intent);
      const evidenciaBiblioteca=porIntent.get(intent)||0;
      const reforco=Math.min(4.5,evidenciaBiblioteca*.55);
      return {intent,logScore:prior*.12+likelihood*.36+fuzzy*.15+keywordBoost*.07+reforco,fuzzy,keywordBoost,biblioteca:evidenciaBiblioteca,reforco};
    });
    const probabilities=softmax(rows.map(r=>r.logScore),.82);
    return rows.map((r,i)=>({...r,probability:probabilities[i]})).sort((a,b)=>b.probability-a.probability);
  }
  objetivo(text){
    const q=this.normalizar(text),tokens=this.tokens(text);
    const sinais=buscarPadroes(text,20).filter(x=>x.dominio==="objetivo");
    const sinalObjetivo=sinais[0];
    if(sinalObjetivo&&sinalObjetivo.score>=.72){
      return {objetivo:sinalObjetivo.intencao,probability:Math.min(.97,.72+sinalObjetivo.score*.25),probabilidades:[{objetivo:sinalObjetivo.intencao,probability:Math.min(.97,.72+sinalObjetivo.score*.25)}]};
    }
    const regras=[
      {objetivo:"aprender",frases:["como faco","como fazer","passo a passo","me ensine"]},
      {objetivo:"explicar",frases:["o que e","como funciona","defina","explique"]},
      {objetivo:"criar",frases:["crie","quero criar","preciso criar","gere","desenvolva","implemente"]},
      {objetivo:"melhorar",frases:["como melhorar","melhorar meu","sugira melhorias","dicas para melhorar"]},
      {objetivo:"analisar",frases:["analise","encontre bugs","encontre erros","diagnostique"]},
      {objetivo:"comparar",frases:["qual a diferenca","compare","versus"," vs "]},
      {objetivo:"corrigir",frases:["corrija","corrigir erro","resolver erro","conserte"]}
    ];
    for(const regra of regras)if(regra.frases.some(frase=>q.includes(frase)))return {objetivo:regra.objetivo,probability:.94,probabilidades:[{objetivo:regra.objetivo,probability:.94}]};
    const resultados=Object.entries(this.objetivos).map(([objetivo,exemplos])=>{
      let score=0;
      for(const exemplo of exemplos){
        const normalizado=this.normalizar(exemplo);
        if(normalizado.length>=4&&q.includes(normalizado))score+=2.5;
        const eTokens=this.tokens(exemplo);
        for(const e of eTokens)for(const t of tokens)score+=e===t?1:(e.includes(t)||t.includes(e)?0.65:0);
      }
      return {objetivo,score};
    });
    const max=Math.max(...resultados.map(x=>x.score),0);
    if(max===0)return {objetivo:"informar",probability:1,probabilidades:[{objetivo:"informar",probability:1}]};
    const probs=softmax(resultados.map(x=>x.score),.72);
    const maxP=Math.max(...probs);
    return {objetivo:resultados[probs.indexOf(maxP)].objetivo,probability:maxP,probabilidades:resultados.map((x,i)=>({...x,probability:probs[i]})).sort((a,b)=>b.probability-a.probability)};
  }
  detectarTipo(text){
    const q=this.normalizar(text),t=this.tokens(text);
    const formato=buscarPadroes(text,12).filter(x=>x.dominio==="formato");
    const mapaFormato={codigo:"criacao",passos:"como",resumo:"lista",detalhado:"geral",exemplo:"geral",tabela:"lista",lista:"lista"};
    const sinalFormato=formato[0];
    if(sinalFormato&&sinalFormato.score>=.82&&mapaFormato[sinalFormato.intencao]){
      const tipo=mapaFormato[sinalFormato.intencao];
      return [{tipo,score:1,probability:.88},...Object.keys(this.tipos).filter(x=>x!==tipo).map(x=>({tipo:x,score:0,probability:0}))];
    }
    const resultados=Object.entries(this.tipos).map(([tipo,exemplos])=>{
      if(tipo==="geral")return {tipo,score:.05};
      let score=0;
      for(const exemplo of exemplos){
        const normalizado=this.normalizar(exemplo);
        if(normalizado.length>=4&&q.includes(normalizado))score+=2.2;
        for(const x of this.tokens(exemplo))for(const y of t)score+=x===y?1:(x.includes(y)||y.includes(x)?0.45:0);
      }
      return {tipo,score};
    });
    const probs=softmax(resultados.map(x=>x.score),.8);
    return resultados.map((x,i)=>({...x,probability:probs[i]})).sort((a,b)=>b.probability-a.probability);
  }
  entropia(probabilidades){return -probabilidades.reduce((s,p)=>{const x=Math.max(p,1e-12);return s+x*Math.log2(x);},0);}
  detectar(text,contexto=null){
    let probs=this.posterior(text);
    const normalizado=this.normalizar(text);
    const curtaPergunta=normalizado.split(" ").filter(Boolean).length<=7;
    const comecaContinuacao=/^(e|tambem|também)\b/.test(normalizado);
    const continuidade=curtaPergunta&&(comecaContinuacao||/\b(e agora|e depois|e nesse caso|mais detalhes|explique melhor|e para|e no caso|nesse caso|nessa situacao|nessa situação)\b/.test(normalizado));
    if(continuidade&&contexto?.intencao){
      const confiancaContexto=Number(contexto.confianca||0);
      const alvo=probs.find(x=>x.intent===contexto.intencao);
      if(alvo){
        const outros=probs.filter(x=>x!==alvo);
        if(confiancaContexto>=.8){
          const alvoProb=.97;
          const restante=1-alvoProb;
          const soma=outros.reduce((s,x)=>s+x.probability,0)||1;
          alvo.probability=alvoProb;
          for(const item of outros)item.probability=restante*(item.probability/soma);
          probs=[alvo,...outros].sort((a,b)=>b.probability-a.probability);
        }else{
          const intensidade=Math.min(1.2,Math.max(.3,confiancaContexto*1.2));
          alvo.logScore+=intensidade;
          const recalculadas=softmax(probs.map(x=>x.logScore),.82);
          probs=probs.map((x,i)=>({...x,probability:recalculadas[i]})).sort((a,b)=>b.probability-a.probability);
        }
      }
    }
    const top=probs[0],second=probs[1]?.probability||0,margin=top.probability-second,entropy=this.entropia(probs.map(x=>x.probability));
    const objetivo=this.objetivo(text),tipos=this.detectarTipo(text),tipo=tipos[0]?.tipo||"geral",entidades=this.entidades(text);
    const confidence=Math.min(1,Math.max(0,top.probability*.55+Math.max(0,margin)*.30+objetivo.probability*.10+(1-Math.min(1,entropy/4.5))*.05));
    return {...top,probability:confidence,rawProbability:top.probability,second,margin,entropy,confident:confidence>=.52&&margin>=.035,ambiguous:confidence<.62||margin<.08,objetivo:objetivo.objetivo,objetivoProbability:objetivo.probability,objetivos:objetivo.probabilidades,tipo,tipos,entidades,probabilities:probs};
  }
  tipoPergunta(text){return this.detectarTipo(text)[0]?.tipo||"geral";}
  detectarTecnologias(text){
    const q=this.normalizar(text),mapa={javascript:["javascript","js"],typescript:["typescript","ts"],html:["html","html5"],css:["css","css3"],python:["python"],canvas:["canvas"],github:["github","git"],makecode:["makecode","arcade"],microstudio:["microstudio"],tic80:["tic 80","tic-80"],piskel:["piskel"],pixelorama:["pixelorama"],ollama:["ollama"]};
    return Object.entries(mapa).filter(([,terms])=>terms.some(t=>q.includes(t))).map(([nome])=>nome);
  }
  entidades(text){
    const s=String(text??"");
    return {cep:s.match(/\b\d{5}-?\d{3}\b/)?.[0]||null,coordenadas:s.match(/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/)?.[0]||null,numeros:[...s.matchAll(/-?\d+(?:[,.]\d+)?/g)].map(m=>m[0]),tecnologias:this.detectarTecnologias(s)};
  }
  explicar(text){
    const d=this.detectar(text);
    return {intencao:d.intent,confianca:d.probability,probabilidadeBruta:d.rawProbability,margem:d.margin,entropia:d.entropy,ambigua:d.ambiguous,tipo:d.tipo,objetivo:d.objetivo,objetivoConfianca:d.objetivoProbability,probabilidades:d.probabilities.slice(0,5),objetivos:d.objetivos.slice(0,5),entidades:d.entidades};
  }
}

export function softmax(values,temperature=1){
  if(!values.length)return[];
  const t=Math.max(.05,temperature),max=Math.max(...values),ex=values.map(v=>Math.exp((v-max)/t)),sum=ex.reduce((a,b)=>a+b,0)||1;
  return ex.map(v=>v/sum);
}

export class GeradorEstatistico{
  constructor(){
    this.inicios={
      definicao:["A ideia central é esta:","Em termos simples,","De forma direta,"],
      como:["Em termos práticos, funciona assim:","O mecanismo pode ser entendido assim:","A sequência básica é:"],
      por_que:["O ponto principal é:","Isso acontece principalmente porque","A razão central está em"],
      comparacao:["A diferença principal está em","A comparação fica mais clara quando","Os conceitos se separam principalmente porque"],
      lista:["Os pontos mais importantes são","Entre os aspectos principais estão","Os elementos centrais são"],
      calculo:["Vamos ao cálculo:","Aplicando a fórmula:","Matematicamente,"],
      criacao:["Podemos estruturar isso assim:","Uma forma prática de começar é:","Para construir isso, a base seria:"],
      diagnostico:["Analisando o problema,","O diagnóstico aponta para","Os pontos que merecem atenção são:"],
      melhoria:["Eu começaria por estes pontos:","As melhorias mais úteis aqui são:","Para deixar isso mais sólido:"],
      geral:["Pelo que encontrei na minha base local,","A informação mais relevante que tenho é","Com os dados disponíveis, a melhor síntese é"]
    };
    this.fechamentos={definicao:["Se quiser aprofundar, podemos separar o conceito em exemplos práticos.","O contexto de uso é o que determina os detalhes."],como:["A partir daí, o restante depende da tecnologia e do objetivo.","Esse é o fluxo essencial para começar."],criacao:["Depois podemos validar cada parte separadamente.","A estrutura pode ser refinada conforme o objetivo do projeto."],diagnostico:["Esses pontos podem ser verificados individualmente antes de alterar o restante do código."],melhoria:["A ideia é melhorar primeiro o que tem maior impacto, sem complicar desnecessariamente o projeto."],geral:["Se o contexto mudar, a resposta também pode mudar; posso refinar a análise a partir da próxima informação."]};
  }
  escolher(lista,pesos=[]){
    if(!lista.length)return"";
    if(!pesos.length)return lista[0];
    const p=softmax(pesos,.85),x=Math.random();let acumulado=0;
    for(let i=0;i<p.length;i++){acumulado+=p[i];if(x<=acumulado)return lista[i];}
    return lista.at(-1);
  }
  abertura(tipo,confianca=.5){
    const lista=this.inicios[tipo]||this.inicios.geral;
    return this.escolher(lista,lista.map((_,i)=>Math.max(.05,confianca/(i+1))));
  }
  fechamento(tipo,confianca=.5){
    const lista=this.fechamentos[tipo]||this.fechamentos.geral;
    return this.escolher(lista,lista.map((_,i)=>Math.max(.05,confianca/(i+1))));
  }
  estrategia(analise){
    const candidatos={
      codigo:analise.objetivo==="criar"&&["programacao","jogos"].includes(analise.intent)?1:.05,
      diagnostico:["analisar","corrigir"].includes(analise.objetivo)||analise.tipo==="diagnostico"?1:.05,
      melhoria:analise.objetivo==="melhorar"||analise.tipo==="melhoria"?1:.05,
      tutorial:analise.tipo==="como"||analise.objetivo==="aprender"?1:.05,
      comparacao:analise.tipo==="comparacao"||analise.objetivo==="comparar"?1:.05,
      explicacao:["conhecimento","ciencias","programacao","jogos"].includes(analise.intent)&&analise.objetivo!=="criar"?1:.05,
      conversa:["saudacao","despedida","agradecimento"].includes(analise.intent)?1:.05,
      esclarecimento:analise.ambiguous&&analise.objetivoProbability<.60?1.15:.05
    };
    const nomes=Object.keys(candidatos),probs=softmax(nomes.map(n=>candidatos[n]),.55);
    const probabilidades=nomes.map((estrategia,i)=>({estrategia,probability:probs[i]})).sort((a,b)=>b.probability-a.probability);
    return {estrategia:probabilidades[0].estrategia,probability:probabilidades[0].probability,probabilidades};
  }
}
