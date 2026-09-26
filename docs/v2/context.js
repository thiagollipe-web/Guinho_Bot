export class ContextoConversacional{
  constructor(chave="guinho-context-v2",limite=8){
    this.chave=chave;
    this.limite=limite;
    this.estado={
      turnos:[],
      assunto:null,
      intencao:null,
      objetivo:null,
      tipo:null,
      entidades:{},
      confianca:0,
      ultimaPergunta:"",
      ultimaResposta:"",
      estrategia:null
    };
    this.carregar();
  }

  carregar(){
    try{
      const raw=sessionStorage.getItem(this.chave);
      if(raw)this.estado={...this.estado,...JSON.parse(raw)};
    }catch{}
  }

  salvar(){
    try{sessionStorage.setItem(this.chave,JSON.stringify(this.estado));}catch{}
  }

  atualizar({texto="",resposta="",analise=null,estrategia=null,assunto=null}={}){
    const turno={
      texto,
      resposta,
      intencao:analise?.intent||null,
      confianca:Number(analise?.probability||0),
      tipo:analise?.tipo||null,
      objetivo:analise?.objetivo||null,
      ts:Date.now()
    };
    this.estado.turnos=[...this.estado.turnos,turno].slice(-this.limite);
    if(analise){
      this.estado.intencao=analise.intent||this.estado.intencao;
      this.estado.objetivo=analise.objetivo||this.estado.objetivo;
      this.estado.tipo=analise.tipo||this.estado.tipo;
      this.estado.entidades=analise.entidades||this.estado.entidades;
      this.estado.confianca=Number(analise.probability||0);
    }
    if(assunto)this.estado.assunto=assunto;
    if(estrategia)this.estado.estrategia=estrategia;
    this.estado.ultimaPergunta=texto||this.estado.ultimaPergunta;
    this.estado.ultimaResposta=resposta||this.estado.ultimaResposta;
    this.salvar();
  }

  ultimoTurno(){
    return this.estado.turnos.at(-1)||null;
  }

  referencia(texto,pnl){
    const q=pnl.normalizar(texto);
    const tokens=q.split(" ").filter(Boolean);
    const curta=tokens.length<=7;
    const anafora=/\b(isso|isto|esse|essa|este|esta|ele|ela|eles|elas|aquilo|nesse|nessa|neste|nesta|desse|dessa|disso|dele|dela)\b/.test(q);
    const continuidade=/\b(e agora|e depois|e nesse caso|como faço|como faco|como fazer|mais detalhes|explique melhor|e para|e no caso|tambem|também)\b/.test(q);
    if((curta||anafora||continuidade)&&this.estado.assunto){
      return `${texto} ${this.estado.assunto}`;
    }
    return texto;
  }

  resumo(){
    return {
      assunto:this.estado.assunto,
      intencao:this.estado.intencao,
      objetivo:this.estado.objetivo,
      tipo:this.estado.tipo,
      confianca:this.estado.confianca,
      entidades:{...this.estado.entidades},
      estrategia:this.estado.estrategia
    };
  }

  limpar(){
    this.estado={
      turnos:[],
      assunto:null,
      intencao:null,
      objetivo:null,
      tipo:null,
      entidades:{},
      confianca:0,
      ultimaPergunta:"",
      ultimaResposta:"",
      estrategia:null
    };
    this.salvar();
  }
}
