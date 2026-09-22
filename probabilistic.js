export class EstatisticaLinguistica{
  constructor(){
    this.stop=new Set(["a","o","e","os","as","um","uma","uns","umas","de","da","do","das","dos","em","no","na","nos","nas","por","para","com","sem","que","se","ao","aos","à","às","como","me","te","ele","ela","eles","elas","eu","voce","vocês","isso","isto","esse","essa","este","esta"]);
    this.intencoes={
      saudacao:["oi","ola","olá","bom dia","boa tarde","boa noite","e ai","tudo bem","prazer em conhecer","quem e voce"],
      despedida:["tchau","ate mais","até mais","falou","obrigado ate","vou embora"],
      agradecimento:["obrigado","obrigada","valeu","agradeço","agradeco","muito obrigado"],
      ajuda:["ajuda","o que voce sabe fazer","comandos","como usar","recursos","menu"],
      memoria:["lembra de mim","o que voce lembra","qual meu nome","me conhece","lembra meu nome"],
      moeda:["dolar","dólar","euro","cotacao","cotação","quanto custa o dolar","quanto vale o euro","preco do dolar","preço do euro"],
      noticias:["noticias","notícias","ultimas noticias","últimas notícias","manchetes","o que aconteceu hoje","novidades"],
      tempo:["clima","tempo","temperatura","previsao do tempo","previsão","vai chover","vento"],
      cep:["cep","endereco","endereço","logradouro","bairro","codigo postal","código postal"],
      matematica:["calcule","calcular","quanto e","quanto é","bhaskara","equacao","equação","porcentagem","raiz quadrada","regra de tres","regra de três","matematica","matemática"],
      programacao:["javascript","html","css","programacao","programação","codigo","código","canvas","git","github","software","jogo","pixel art","sprite"],
      ciencias:["biologia","biologia celular","celula","célula","anatomia","corpo humano","ecossistema","astronomia","sistema solar","planeta","fotossintese","fotossíntese","fisica","física","quimica","química"],
      conhecimento:["o que e","o que é","como funciona","me explique","explique","defina","fale sobre","qual a diferenca","qual a diferença","por que","porque","para que","quando","onde","quem"]
    };
    this.corpus=[];
    for(const [intent,examples] of Object.entries(this.intencoes))for(const text of examples)this.corpus.push({intent,text});
    this.vocab=new Set();
    this.termCount=new Map();
    this.intentTerms=new Map();
    this.intentDocs=new Map();
    for(const intent of Object.keys(this.intencoes)){this.termCount.set(intent,new Map());this.intentDocs.set(intent,0);}
    for(const item of this.corpus){
      const terms=this.features(item.text);
      this.intentDocs.set(item.intent,(this.intentDocs.get(item.intent)||0)+1);
      const bag=this.termCount.get(item.intent);
      for(const term of terms){this.vocab.add(term);bag.set(term,(bag.get(term)||0)+1);}
    }
    this.totalDocs=this.corpus.length;
    this.totalTerms=new Map([...this.termCount].map(([k,m])=>[k,[...m.values()].reduce((a,b)=>a+b,0)]));
  }
  normalizar(texto){return String(texto??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();}
  stem(token){
    let t=token;
    const sufixos=["mente","amentos","imentos","amento","imento","ções","cao","coes","ção","ando","endo","indo","ados","idos","adas","idas","os","as","es","em","am","ou","ar","er","ir","s"];
    for(const s of sufixos)if(t.length>s.length+3&&t.endsWith(s)){t=t.slice(0,-s.length);break;}
    return t;
  }
  tokens(texto){return this.normalizar(texto).split(" ").filter(Boolean).filter(t=>!this.stop.has(t)).map(t=>this.stem(t));}
  features(texto){
    const t=this.tokens(texto);const out=[...t];
    for(let i=0;i<t.length-1;i++)out.push(t[i]+"_"+t[i+1]);
    return out;
  }
  laplace(term,intent){
    const bag=this.termCount.get(intent);const count=bag?.get(term)||0;
    const total=this.totalTerms.get(intent)||0;
    return Math.log((count+1)/(total+this.vocab.size));
  }
  fuzzy(text,intent){
    const q=this.tokens(text);
    let best=0;
    for(const p of this.intencoes[intent]){
      const terms=this.tokens(p);if(!terms.length)continue;
      let hits=0;
      for(const term of terms){
        let local=0;
        for(const qt of q){if(qt===term)local=1;else if(qt.includes(term)||term.includes(qt))local=Math.max(local,.82);else local=Math.max(local,this.edit(qt,term));}
        hits+=local;
      }
      best=Math.max(best,hits/terms.length);
    }
    return best;
  }
  edit(a,b){
    if(a===b)return 1;if(!a||!b||Math.abs(a.length-b.length)>2)return 0;
    let prev=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){const cur=[i];for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur;}
    return 1-prev[b.length]/Math.max(a.length,b.length);
  }
  posterior(text){
    const feats=this.features(text);
    const rows=Object.keys(this.intencoes).map(intent=>{
      const prior=Math.log((this.intentDocs.get(intent)+1)/(this.totalDocs+Object.keys(this.intencoes).length));
      const likelihood=feats.reduce((sum,term)=>sum+this.laplace(term,intent),0);
      const fuzzy=this.fuzzy(text,intent);
      const logScore=prior*.35+likelihood*.45+fuzzy*.20;
      return {intent,logScore,fuzzy};
    });
    const max=Math.max(...rows.map(r=>r.logScore));
    const exps=rows.map(r=>({...r,raw:Math.exp(r.logScore-max)}));
    const total=exps.reduce((s,r)=>s+r.raw,0)||1;
    return exps.map(r=>({...r,probability:r.raw/total})).sort((a,b)=>b.probability-a.probability);
  }
  detectar(text){
    const probs=this.posterior(text);
    const top=probs[0],second=probs[1]?.probability||0;
    return { ...top, second, margin:top.probability-second, confident:top.probability>=.24||top.margin>=.10, probabilities:probs };
  }
  tipoPergunta(text){
    const q=this.normalizar(text);
    if(/\b(como|de que forma|qual o processo)\b/.test(q))return "como";
    if(/\b(por que|porque|qual o motivo)\b/.test(q))return "por_que";
    if(/\b(qual a diferenca|qual e a diferenca|compare|comparacao)\b/.test(q))return "comparacao";
    if(/\b(quais|liste|listar|exemplos|tipos)\b/.test(q))return "lista";
    if(/^\s*(o que e|o que é|quem e|quem é|defina)\b/.test(q))return "definicao";
    if(/\b(calcul|bhaskara|quanto e|quanto é)\b/.test(q))return "calculo";
    return "geral";
  }
  entidades(text){
    const s=String(text??"");
    return {
      cep:s.match(/\b\d{5}-?\d{3}\b/)?.[0]||null,
      coordenadas:s.match(/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/)?.[0]||null,
      numeros:[...s.matchAll(/-?\d+(?:[,.]\d+)?/g)].map(m=>m[0])
    };
  }
  explicar(text){const d=this.detectar(text);return {intencao:d.intent,confianca:d.probability,margem:d.margin,tipo:this.tipoPergunta(text),probabilidades:d.probabilities.slice(0,5),entidades:this.entidades(text)};}
}

export function softmax(values,temperature=1){
  if(!values.length)return[];
  const t=Math.max(.05,temperature),max=Math.max(...values);
  const ex=values.map(v=>Math.exp((v-max)/t)),sum=ex.reduce((a,b)=>a+b,0)||1;
  return ex.map(v=>v/sum);
}

export class GeradorEstatistico{
  constructor(){this.inicios={
    definicao:["A ideia central é esta:","Em termos simples,","De forma direta,"],
    como:["Em termos práticos, funciona assim:","O mecanismo pode ser entendido assim:","A sequência básica é:"],
    por_que:["O ponto principal é:","Isso acontece principalmente porque","A razão central está em"],
    comparacao:["A diferença principal está em","Os conceitos se separam principalmente porque","A comparação fica mais clara quando"],
    lista:["Os pontos mais importantes são","Entre os aspectos principais estão","Os elementos centrais são"],
    calculo:["Vamos ao cálculo:","Aplicando a fórmula:","Matematicamente,"],
    geral:["Pelo que encontrei na minha base local,","A informação mais relevante que tenho é","A melhor síntese com os dados disponíveis é"]
  };}
  escolher(lista,pesos=[]){
    if(!lista.length)return"";
    if(!pesos.length)return lista[0];
    const p=softmax(pesos,.8);let r=0;const x=Math.random();for(let i=0;i<p.length;i++){r+=p[i];if(x<=r)return lista[i];}return lista.at(-1);
  }
  abertura(tipo,confianca){
    const lista=this.inicios[tipo]||this.inicios.geral;
    const pesos=lista.map((_,i)=>Math.max(.05,confianca*(1/(i+1))));
    return this.escolher(lista,pesos);
  }
}