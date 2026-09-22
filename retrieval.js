export class RecuperadorSemantico{
  constructor(documentos){
    this.documentos=documentos;
    this.stop=new Set(["a","o","e","de","da","do","das","dos","que","em","no","na","nos","nas","para","por","com","um","uma","como","me","eu","voce","sobre","qual","quais","uma","se"]);
    this.synonyms={
      valor:["preco","custo","quanto","cotacao"],
      programacao:["codigo","desenvolvimento","software","dev"],
      clima:["tempo","temperatura","previsao","meteorologia"],
      noticia:["noticias","manchete","atualidade"],
      celular:["celula","celular"],
      planeta:["planetas","astronomia","espaco"],
      jogo:["game","games","jogar"],
      imagem:["arte","pixel","sprites","spritesheet"]
    };
    this.docs=documentos.map((d,i)=>({...d,id:i,textoIndex:this.expandir(d.titulo+" "+d.texto+" "+d.tema)}));
    this.df=new Map();
    this.N=this.docs.length;
    for(const d of this.docs){
      for(const term of new Set(this.tokens(d.textoIndex)))this.df.set(term,(this.df.get(term)||0)+1);
    }
    this.vetores=new Map(this.docs.map(d=>[d.id,this.vector(d.textoIndex)]));
  }
  normalizar(s){return String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();}
  stem(t){
    let x=t;
    const sufixos=["mente","ções","cao","coes","s","es","em","ando","endo","indo","ados","idos","ada","ido","ados","ias","ia"];
    for(const s of sufixos)if(x.length>s.length+3&&x.endsWith(s)){x=x.slice(0,-s.length);break;}
    return x;
  }
  expandir(s){
    const t=this.tokensBasicos(s);
    const extra=[];
    for(const term of t){
      const key=Object.keys(this.synonyms).find(k=>this.synonyms[k].includes(term)||k===term);
      if(key)extra.push(key,...this.synonyms[key]);
    }
    return [...t,...extra].join(" ");
  }
  tokensBasicos(s){return this.normalizar(s).split(" ").filter(Boolean).filter(t=>!this.stop.has(t));}
  tokens(s){return this.tokensBasicos(s).map(t=>this.stem(t));}
  tfidf(term,docTokens){
    const count=docTokens.filter(x=>x===term).length;
    if(!count)return 0;
    const tf=1+Math.log(count);
    const idf=Math.log((this.N+1)/((this.df.get(term)||0)+1))+1;
    return tf*idf;
  }
  vector(texto){
    const tokens=this.tokens(texto);const v=new Map();
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
    let inter=0;for(const x of A)if(B.has(x))inter++;
    return inter/(A.size+B.size-inter);
  }
  recuperar(consulta,limite=5){
    const qvec=this.vector(consulta);const qnorm=this.expandir(consulta);
    return this.docs.map(d=>{
      const c=this.cosine(qvec,this.vetores.get(d.id));
      const j=this.jaccard(qnorm,d.textoIndex);
      const exact=this.normalizar(d.titulo)===this.normalizar(consulta)?1:0;
      return {...d,score:(c*.65)+(j*.3)+(exact*.05)};
    }).sort((a,b)=>b.score-a.score).slice(0,limite).filter(x=>x.score>=.08);
  }
}
