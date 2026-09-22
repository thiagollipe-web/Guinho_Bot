const LIMITE_GANHO=100;
const XP_POR_NIVEL_BASE=100;

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

/*
 * EXPERIÊNCIA DE APRENDIZADO
 * XP é consequência de evidência observável:
 * - tentativa que não pode ser aplicada: pequena recompensa por aprendizado de falha;
 * - correção aplicada e posteriormente confirmada: recompensa maior;
 * - correção aplicada mas não resolvida: recompensa menor por aprendizado negativo.
 * Isto é aprendizado estatístico online, não treinamento de uma rede neural.
 */
export function xpParaNivel(nivel=1){
  const n=Math.max(1,Math.floor(Number(nivel)||1));
  return XP_POR_NIVEL_BASE*(n-1)*n/2;
}

export function nivelPorXp(xp=0){
  const valor=Math.max(0,Number(xp)||0);
  let nivel=1;
  while(xpParaNivel(nivel+1)<=valor)nivel++;
  return nivel;
}

export function xpAteProximoNivel(xp=0){
  const nivel=nivelPorXp(xp);
  return Math.max(0,xpParaNivel(nivel+1)-Math.max(0,Number(xp)||0));
}

function criarExperiencia(seed={}){
  const xp=Math.max(0,Number(seed.xp)||0);
  const nivel=nivelPorXp(xp);
  return {
    xp,
    nivel,
    sequencia:Number(seed.sequencia)||0,
    melhorSequencia:Number(seed.melhorSequencia)||0,
    aprendizados:Number(seed.aprendizados)||0,
    ultimoEvento:seed.ultimoEvento||null
  };
}

function criarHabilidade(seed={}){
  const xp=Math.max(0,Number(seed.xp)||0);
  return {
    xp,
    nivel:nivelPorXp(xp),
    sucessos:Number(seed.sucessos)||0,
    falhas:Number(seed.falhas)||0,
    tentativas:Number(seed.tentativas)||0
  };
}

export function criarModeloAprendizado(seed={}){
  const modelo={
    versao:2,
    observacoes:Number(seed.observacoes)||0,
    estrategias:{},
    pendentes:{},
    experiencia:criarExperiencia(seed.experiencia||{}),
    habilidades:{},
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
    if(pendente&&pendente.chave)modelo.pendentes[fingerprint]={...pendente};
  }
  for(const [categoria,habilidade] of Object.entries(seed.habilidades||{})){
    modelo.habilidades[normalizarCategoria(categoria)]=criarHabilidade(habilidade);
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

function obterHabilidade(modelo,categoria){
  const chave=normalizarCategoria(categoria);
  if(!modelo.habilidades[chave])modelo.habilidades[chave]=criarHabilidade();
  return modelo.habilidades[chave];
}

export function utilidadeEstrategia(modelo,categoria,estrategia){
  const r=obterRegistro(modelo,categoria,estrategia);
  const taxaSucesso=(r.sucessos+1)/(r.tentativas+2);
  const ganhoNormalizado=limitar(r.ganhoMedio/LIMITE_GANHO,-1,1);
  const recompensa=0.62*taxaSucesso+0.28*((ganhoNormalizado+1)/2);
  const exploracao=0.10/Math.sqrt(r.tentativas+1);
  const experienciaCategoria=Math.min(0.08,obterHabilidade(modelo,categoria).xp/5000);
  return recompensa+exploracao+experienciaCategoria;
}

export function selecionarEstrategiaAprendida(modelo,problema={},candidatas=[],estrategiasBloqueadas=[]){
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

function severidadePeso(severidade){
  return {critica:4,alta:3,media:2,baixa:1,info:0}[normalizarTexto(severidade)]??0;
}

function aplicarXp(modelo,dados={}){
  const sucesso=Boolean(dados.sucesso);
  const categoria=dados.categoria||"geral";
  const habilidade=obterHabilidade(modelo,categoria);
  const ganho=Number(dados.ganho)||0;
  const peso=severidadePeso(dados.severidade);
  let xp=sucesso
    ? 20+(peso*6)+limitar(Math.max(0,ganho)*0.5,0,30)+Math.min(20,modelo.experiencia.sequencia*3)
    : 5+(peso*2);

  xp=Math.max(1,Math.round(xp));
  if(sucesso){
    modelo.experiencia.sequencia+=1;
    modelo.experiencia.melhorSequencia=Math.max(modelo.experiencia.melhorSequencia,modelo.experiencia.sequencia);
    habilidade.sucessos+=1;
  }else{
    modelo.experiencia.sequencia=0;
    habilidade.falhas+=1;
  }
  habilidade.tentativas+=1;
  habilidade.xp+=xp;
  habilidade.nivel=nivelPorXp(habilidade.xp);
  modelo.experiencia.xp+=xp;
  modelo.experiencia.nivel=nivelPorXp(modelo.experiencia.xp);
  modelo.experiencia.aprendizados+=1;
  modelo.experiencia.ultimoEvento={
    tipo:sucesso?"RESOLUCAO":"FALHA_APRENDIDA",
    categoria:String(categoria),
    estrategia:String(dados.estrategia||"CORRIGIR"),
    xp,
    ciclo:Number(dados.ciclo)||0,
    timestamp:Date.now()
  };
  modelo.ultimaAtualizacao=Date.now();
  return xp;
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

  if(aplicada){
    modelo.pendentes[fingerprint]={
      chave:chaveAprendizado(categoria,estrategia),
      categoria:String(categoria),
      estrategia:String(estrategia),
      severidade:String(dados.severidade||"media"),
      origem:String(dados.origem||"ANALISE"),
      ciclo:Number(dados.ciclo)||0,
      ganho
    };
  }else{
    r.falhas+=1;
    aplicarXp(modelo,{...dados,categoria,estrategia,sucesso:false});
  }
  modelo.ultimaAtualizacao=Date.now();
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
      aplicarXp(modelo,{
        categoria:pendente.categoria,
        estrategia:pendente.estrategia,
        severidade:pendente.severidade,
        ganho:pendente.ganho,
        ciclo,
        sucesso:true
      });
      delete modelo.pendentes[fingerprint];
      continue;
    }
    if((Number(pendente.ciclo)||0)<ciclo){
      r.falhas+=1;
      r.ultimoResultado="NAO_RESOLVIDO";
      aplicarXp(modelo,{
        categoria:pendente.categoria,
        estrategia:pendente.estrategia,
        severidade:pendente.severidade,
        ganho:pendente.ganho,
        ciclo,
        sucesso:false
      });
      delete modelo.pendentes[fingerprint];
    }
  }
  return modelo;
}

export function serializarModeloAprendizado(modelo={}){
  return {
    versao:2,
    observacoes:Number(modelo.observacoes)||0,
    estrategias:Object.fromEntries(Object.entries(modelo.estrategias||{}).map(([chave,r])=>[chave,{...r}])),
    pendentes:Object.fromEntries(Object.entries(modelo.pendentes||{}).map(([fp,r])=>[fp,{...r}])),
    experiencia:criarExperiencia(modelo.experiencia||{}),
    habilidades:Object.fromEntries(Object.entries(modelo.habilidades||{}).map(([categoria,r])=>[categoria,criarHabilidade(r)])),
    ultimaAtualizacao:Number(modelo.ultimaAtualizacao)||0
  };
}

export function hidratarModeloAprendizado(dados={}){
  return criarModeloAprendizado(dados&&typeof dados==="object"?dados:{});
}

export function relatorioAprendizado(modeloOuResultado={}){
  const modelo=modeloOuResultado.aprendizado||modeloOuResultado;
  const dados=serializarModeloAprendizado(modelo);
  const registros=Object.entries(dados.estrategias||{})
    .map(([chave,r])=>{
      const taxa=(Number(r.sucessos||0)+1)/(Number(r.tentativas||0)+2);
      return {...r,chave,taxa};
    })
    .sort((a,b)=>utilidadeEstrategia(dados,a.categoria,a.estrategia)-utilidadeEstrategia(dados,b.categoria,b.estrategia));
  const topo=[...registros].reverse().slice(0,8);
  const xp=dados.experiencia.xp;
  const nivel=dados.experiencia.nivel;
  return [
    "SISTEMA DE EXPERIÊNCIA POR APRENDIZADO",
    "Nível: "+nivel+" • XP: "+xp+" • Próximo nível: "+xpAteProximoNivel(xp)+" XP",
    "Aprendizados confirmados/observados: "+dados.experiencia.aprendizados,
    "Sequência atual: "+dados.experiencia.sequencia+" • Melhor sequência: "+dados.experiencia.melhorSequencia,
    "Categorias com experiência: "+Object.keys(dados.habilidades).length,
    "Estratégias aprendidas: "+registros.length+" • Pendentes: "+Object.keys(dados.pendentes||{}).length,
    ...Object.entries(dados.habilidades)
      .sort((a,b)=>b[1].xp-a[1].xp)
      .slice(0,5)
      .map(([categoria,h])=>"["+categoria+"] nível "+h.nivel+" • "+h.xp+" XP • sucessos="+h.sucessos+" • falhas="+h.falhas),
    ...topo.map(r=>"ESTRATÉGIA ["+r.categoria+"] "+r.estrategia+
      " • tentativas="+r.tentativas+
      " • sucesso posterior="+(r.taxa*100).toFixed(1)+"%"+
      " • ganho médio="+Number(r.ganhoMedio||0).toFixed(1))
  ].join("\n");
}
