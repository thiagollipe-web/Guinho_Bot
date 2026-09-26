export class RecuperadorSemantico{
  constructor(documentos){
    this.documentos=documentos;
    this.stop=new Set(["a","o","e","os","as","um","uma","uns","umas","de","da","do","das","dos","em","no","na","nos","nas","por","para","com","sem","que","se","ao","aos","à","às","como","me","te","ele","ela","eles","elas","eu","voce","vocês","sobre","qual","quais"]);
    this.synonyms={
      valor:["preco","preço","custo","quanto","cotacao","cotação"],
      programacao:["codigo","código","desenvolvimento","software","dev","programar"],
      clima:["tempo","temperatura","previsao","previsão","meteorologia"],
      noticia:["noticias","notícias","manchete","atualidade"],
      celular:["celula","célula"],
      planeta:["planetas","astronomia","espaco","espaço"],
      jogo:["game","games","jogar"],
      imagem:["arte","pixel","sprites","spritesheet"],
      explicacao:["explica","explique","entenda","defina"]
    };
    this.docs=documentos.map((d,id)=>({...d,id,indexText:this.expandir(d.titulo+" "+d.texto+" "+d.tema)}));
    this.df=new Map();
    this.docs.forEach(d=>new Set(this.tokens(d.indexText)).forEach(t=>this.df.set(t,(this.df.get(t)||0)+1)));
    this.N=this.docs.length;
    this.vetores=new Map(this.docs.map(d=>[d.id,this.vector(d.indexText)]));
  }
  normalizar(s){return String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();}
  stem(t){
    let x=t;
    const suf=["mente","amento","imento","amentos","imentos","ções","coes","cao","acao","ando","endo","indo","ados","idos","adas","idas","os","as","es","em","am","ou","ar","er","ir","s"];
    for(const s of suf){if(x.length>s.length+3&&x.endsWith(s)){x=x.slice(0,-s.length);break;}}
    return x;
  }
  tokensBasicos(s){return this.normalizar(s).split(" ").filter(Boolean).filter(t=>!this.stop.has(t));}
  tokens(s){return this.tokensBasicos(s).map(t=>this.stem(t));}
  expandir(s){
    const t=this.tokensBasicos(s),extra=[];
    for(const term of t){
      for(const [root,words] of Object.entries(this.synonyms)){
        if(root===term||words.includes(term)){extra.push(root,...words);}
      }
    }
    return [...t,...extra].join(" ");
  }
  tfidf(term,tokens){
    const tf=tokens.filter(t=>t===term).length;
    if(!tf)return 0;
    const idf=Math.log((this.N+1)/((this.df.get(term)||0)+1))+1;
    return (1+Math.log(tf))*idf;
  }
  vector(texto){
    const tokens=this.tokens(texto),v=new Map();
    for(const term of new Set(tokens))v.set(term,this.tfidf(term,tokens));
    return v;
  }
  cosine(a,b){
    let dot=0,na=0,nb=0;
    for(const [k,v] of a){dot+=v*(b.get(k)||0);na+=v*v;}
    for(const v of b.values())nb+=v*v;
    return na&&nb?dot/(Math.sqrt(na)*Math.sqrt(nb)):0;
  }
  jaccard(a,b){
    const A=new Set(this.tokens(a)),B=new Set(this.tokens(b));if(!A.size||!B.size)return 0;
    let inter=0;for(const t of A)if(B.has(t))inter++;
    return inter/(A.size+B.size-inter);
  }
  sentencas(doc){
    return String(doc.texto).split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(s=>s.length>20);
  }
  pontuarFrase(frase,consulta){
    const c=this.tokens(consulta),f=this.tokens(frase);if(!c.length||!f.length)return 0;
    let hit=0;
    for(const q of new Set(c)){
      let best=0;
      for(const t of f){if(t===q)best=1;else if(t.includes(q)||q.includes(t))best=Math.max(best,.82);}
      hit+=best;
    }
    const cobertura=hit/new Set(c).size;
    return cobertura;
  }
  recuperar(consulta,limite=6){
    const q=this.expandir(consulta),qvec=this.vector(q);
    return this.docs.map(d=>{
      const cosine=this.cosine(qvec,this.vetores.get(d.id));
      const jaccard=this.jaccard(q,d.indexText);
      const title=this.jaccard(q,d.titulo);
      const score=cosine*.60+jaccard*.28+title*.12;
      return {...d,score,similaridade:{cosine,jaccard,title}};
    }).sort((a,b)=>b.score-a.score).slice(0,limite);
  }
  probabilidades(consulta,limite=6){
    const docs=this.recuperar(consulta,limite);
    const max=Math.max(...docs.map(d=>d.score),0);
    const exp=docs.map(d=>Math.exp((d.score-max)/.18));
    const sum=exp.reduce((a,b)=>a+b,0)||1;
    return docs.map((d,i)=>({...d,probabilidade:exp[i]/sum}));
  }
  frasesRelevantes(consulta,limiteDocumentos=5,limiteFrases=4){
    const docs=this.probabilidades(consulta,limiteDocumentos),frases=[];
    for(const d of docs){
      for(const frase of this.sentencas(d)){
        const relevance=this.pontuarFrase(frase,consulta);
        const score=d.probabilidade*.65+relevance*.35;
        if(relevance>=.15)frases.push({frase,titulo:d.titulo,tema:d.tema,score,relevance,probabilidadeDocumento:d.probabilidade});
      }
    }
    return frases.sort((a,b)=>b.score-a.score).slice(0,limiteFrases);
  }
}