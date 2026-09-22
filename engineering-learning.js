const LIMITE_GANHO=100;

const normalizarTexto=valor=>String(valor??"")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g,"")
  .replace(/\s+/g," ")
  .trim();

const normalizarCategoria=valor=>normalizarTexto(valor)
  .replace(/[^a-z0-9]+/g,"_")
  .replace(/^_+|_+$/g,"")
  .toUpperCase()||"GERAL";

const normalizarEstrategia=valor=>normalizarTexto(valor)
  .replace(/[^a-z0-9]+/g,"_")
  .replace(/^_+|_+$/g,"")
  .toUpperCase()||"CORRIGIR";

const limitar=(valor,min,max)=>Math.max(min,Math.min(max,Number(valor)||0));

export function chaveAprendizado(categoria,estrategia){
  return normalizarCategoria(categoria)+"::"+normalizarEstrategia(estrategia);
}

export function criarModeloAprendizado(seed={}){
  const modelo={
    versao:1,
    observacoes:Number(seed.observacoes)||0,
    estrategias:{},
    pendentes:{},
    ultimaAtualizacao:Number(seed.ultimaAtualizacao)||0
  };
  for(const [chave,registro] of Object.entries(seed.estrategias||{})){
    modelo.estrategias[chave]={
      categoria:registro.categoria||"GERAL",
      estrategia:registro.estrategia||"CORRIGIR",
      tentativas:Number(registro.tentativas)||0,
      sucessos:Number(registro.sucessos)||0,
      falhas:Number(registro.falhas)||0,
      ganhoTotal:Number(registro.ganhoTotal)||0,
      ganhoMedio:Number(registro.ganhoMedio)||0,
      ultimaCiclo:Number(registro.ultimaCiclo)||0,
      ultimoResultado:registro.ultimoResultado||null
    };
  }
  for(const [fingerprint,pendente] of Object.entries(seed.pendentes||{})){
    if(pendente&&pendente.chave){
      modelo.pendentes[fingerprint]={...pendente};
    }
  }
  return modelo;
}

function obterRegistro(modelo,categoria,estrategia){
  const chave=chaveAprendizado(categoria,estrategia);
  if(!modelo.estrategias[chave]){
    modelo.estrategias[chave]={
      categoria:String(categoria||"geral"),
      estrategia:String(estrategia||"CORRIGIR"),
      tentativas:0,
      sucessos:0,
      falhas:0,
      ganhoTotal:0,
      ganhoMedio:0,
      ultimaCiclo:0,
      ultimoResultado:null
    };
  }
  return modelo.estrategias[chave];
}

export function utilidadeEstrategia(modelo,categoria,estrategia){
  const r=obterRegistro(modelo,categoria,estrategia);
  const taxaSucesso=(r.sucessos+1)/(r.tentativas+2);
  const ganhoNormalizado=limitar(r.ganhoMedio/LIMITE_GANHO,-1,1);
  const recompensa=0.62*taxaSucesso+0.28*((ganhoNormalizado+1)/2);
  const exploracao=0.10/Math.sqrt(r.tentativas+1);
  return recompensa+exploracao;
}

export function selecionarEstrategiaAprendida(modelo,problema={},candidatas=[] ,estrategiasBloqueadas=[]){
  const lista=(Array.isArray(candidatas)&&candidatas.length?candidatas:["CORRIGIR"]).filter(Boolean);
  const bloqueadas=new Set(estrategiasBloqueadas.map(normalizarEstrategia));
  const disponiveis=lista.filter(x=>!bloqueadas.has(normalizarEstrategia(x)));
  const universo=disponiveis.length?disponiveis:lista;
  const categoria=problema.categoria||"geral";
  return [...universo]
    .map((estrategia,indice)=>({
      estrategia,
      indice,
      utilidade:utilidadeEstrategia(modelo,categoria,estrategia),
      registro:obterRegistro(modelo,categoria,estrategia)
    }))
    .sort((a,b)=>b.utilidade-a.utilidade||a.indice-b.indice)[0]?.estrategia||null;
}

export function registrarTentativaAprendida(modelo,dados={}){
  const categoria=dados.categoria||"geral";
  const estrategia=dados.estrategia||"CORRIGIR";
  const fingerprint=dados.fingerprint||"desconhecido";
  const r=obterRegistro(modelo,categoria,estrategia);
  const ganho=limitar(dados.ganho,-LIMITE_GANHO,LIMITE_GANHO);
  const aplicada=Boolean(dados.aplicada);
  r.tentativas+=1;
  r.ganhoTotal+=ganho;
  r.ganhoMedio=r.ganhoTotal/Math.max(1,r.tentativas);
  r.ultimaCiclo=Number(dados.ciclo)||0;
  r.ultimoResultado=aplicada?"PENDENTE":(dados.status||"FALHOU");
  modelo.observacoes+=1;
  modelo.ultimaAtualizacao=Date.now();
  if(aplicada){
    modelo.pendentes[fingerprint]={
      chave:chaveAprendizado(categoria,estrategia),
      categoria:String(categoria),
      estrategia:String(estrategia),
      origem:String(dados.origem||"ANALISE"),
      ciclo:Number(dados.ciclo)||0
    };
  }else{
    r.falhas+=1;
  }
  return r;
}

export function atualizarResultadosAprendidos(modelo,analise={},extrairProblemas,ciclo=0,origem="ANALISE"){
  if(typeof extrairProblemas!=="function")return modelo;
  const atuais=new Set(extrairProblemas(analise).map(x=>x.fingerprint));
  for(const [fingerprint,pendente] of Object.entries({...modelo.pendentes})){
    if(String(pendente.origem||"ANALISE")!==String(origem))continue;
    const r=modelo.estrategias[pendente.chave];
    if(!r){
      delete modelo.pendentes[fingerprint];
      continue;
    }
    if(!atuais.has(fingerprint)){
      r.sucessos+=1;
      r.ultimoResultado="RESOLVIDO";
      delete modelo.pendentes[fingerprint];
      modelo.ultimaAtualizacao=Date.now();
      continue;
    }
    if((Number(pendente.ciclo)||0)<ciclo){
      r.falhas+=1;
      r.ultimoResultado="NAO_RESOLVIDO";
      delete modelo.pendentes[fingerprint];
      modelo.ultimaAtualizacao=Date.now();
    }
  }
  return modelo;
}

export function serializarModeloAprendizado(modelo={}){
  return {
    versao:1,
    observacoes:Number(modelo.observacoes)||0,
    estrategias:Object.fromEntries(Object.entries(modelo.estrategias||{}).map(([chave,r])=>[chave,{...r}])),
    pendentes:Object.fromEntries(Object.entries(modelo.pendentes||{}).map(([fp,r])=>[fp,{...r}])),
    ultimaAtualizacao:Number(modelo.ultimaAtualizacao)||0
  };
}

export function hidratarModeloAprendizado(dados={}){
  return criarModeloAprendizado(dados&&typeof dados==="object"?dados:{});
}

export function relatorioAprendizado(modeloOuResultado={}){
  const modelo=modeloOuResultado.aprendizado||modeloOuResultado;
  const dados=modelo.estrategias&&!(modelo.estrategias instanceof Map)
    ? modelo
    : serializarModeloAprendizado(modelo);
  const registros=Object.entries(dados.estrategias||{})
    .map(([chave,r])=>{
      const taxa=(Number(r.sucessos||0)+1)/(Number(r.tentativas||0)+2);
      return {...r,chave,taxa};
    })
    .sort((a,b)=>utilidadeEstrategia(dados,a.categoria,a.estrategia)-utilidadeEstrategia(dados,b.categoria,b.estrategia));
  const topo=[...registros].reverse().slice(0,8);
  return [
    "APRENDIZADO DE ESTRATÉGIAS",
    "Observações: "+(dados.observacoes||0),
    "Estratégias aprendidas: "+registros.length,
    "Tentativas pendentes: "+Object.keys(dados.pendentes||{}).length,
    ...topo.map(r=>"["+r.categoria+"] "+r.estrategia+
      " • tentativas="+r.tentativas+
      " • sucesso posterior="+(r.taxa*100).toFixed(1)+"%"+
      " • ganho médio="+Number(r.ganhoMedio||0).toFixed(1))
  ].join("\n");
}
