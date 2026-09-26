export class MemoriaSessao{
  constructor(chave="guinho-session-v1",limite=24){
    this.chave=chave;this.limite=limite;this.estado={mensagens:[],usuario:{},assuntoAtual:null};
    this.carregar();
  }
  carregar(){try{const raw=sessionStorage.getItem(this.chave);if(raw)this.estado={...this.estado,...JSON.parse(raw)};}catch{}}
  salvar(){try{sessionStorage.setItem(this.chave,JSON.stringify(this.estado));}catch{}}
  adicionar(role,content){this.estado.mensagens.push({role,content,ts:Date.now()});this.estado.mensagens=this.estado.mensagens.slice(-this.limite);this.salvar();}
  historico(){return this.estado.mensagens.slice();}
  definirUsuario(campo,valor){if(valor)this.estado.usuario[campo]=valor;this.salvar();}
  definirAssunto(assunto){this.estado.assuntoAtual=assunto||null;this.salvar();}
  resumo(){
    const termos=[];
    if(this.estado.assuntoAtual)termos.push("Assunto atual: "+this.estado.assuntoAtual);
    for(const [k,v] of Object.entries(this.estado.usuario))termos.push(k+": "+v);
    return termos.join("\n");
  }
  limpar(){this.estado={mensagens:[],usuario:{},assuntoAtual:null};this.salvar();}
}
