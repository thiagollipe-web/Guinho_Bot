import { gerarProjeto } from "./generator.js";
import { analisarProjeto } from "./analyzer.js";
import { corrigirProjeto } from "./fixer.js";
import { aplicarMelhoriasSeguras } from "./improver.js";
import { validarProjeto } from "./validator.js";
import {
  criarModeloAprendizado,
  selecionarEstrategiaAprendida,
  registrarTentativaAprendida,
  atualizarResultadosAprendidos,
  serializarModeloAprendizado,
  hidratarModeloAprendizado,
  relatorioAprendizado,
  utilidadeEstrategia
} from "./engineering-learning.js";
import {
  criarMemoriaEngenharia,
  registrarProblemas,
  registrarTentativa,
  registrarResolvidos,
  gerarEstrategiasProblema,
  registrarIgnorado,
  serializarMemoriaEngenharia,
  relatorioMemoriaEngenharia
} from "./engineering-memory.js";

const clonar=xs=>Object.fromEntries(Object.entries(xs||{}).map(([k,v])=>[k,String(v??"")]));
const fp=xs=>Object.keys(xs).sort().map(k=>k+"::"+xs[k]).join("\n---\n");
const bloqueios=a=>(a.resumo?.contagem?.critica||0)+(a.resumo?.contagem?.alta||0);
const severidadePeso=sev=>({critica:4,alta:3,media:2,baixa:1,info:0}[String(sev||"info").toLowerCase()]??0);

function registrar(h,etapa,ciclo,status,extra={}){
  h.push({etapa,ciclo,status,...extra});
}

function escolherProblema(memoria){
  return [...memoria.problemas.values()]
    .filter(x=>!x.resolvido&&["critica","alta"].includes(String(x.severidade).toLowerCase()))
    .sort((a,b)=>severidadePeso(b.severidade)-severidadePeso(a.severidade))[0]||null;
}

function opcoesDaEstrategia(problema,estrategia){
  const categoria=String(problema?.categoria||"");
  return estrategia&&estrategia!=="CORRIGIR" ? {categorias:[categoria]} : {};
}

function resultadoFinal(files,plano,criado,entry,a,v,h,status,memoria,aprendizado){
  return {
    ok:Boolean(v?.valido),
    status:v?.valido?status:"REPROVADO",
    ciclos:h.filter(x=>x.etapa==="ANALISAR").length,
    criado,plano,entry,files,analise:a,validacao:v,historico:h,
    memoria:serializarMemoriaEngenharia(memoria),
    relatorioMemoria:relatorioMemoriaEngenharia(memoria),
    aprendizado:serializarModeloAprendizado(aprendizado),
    relatorioAprendizado:relatorioAprendizado(aprendizado)
  };
}

function aplicarCorrecaoAdaptativa(files,analise,memoria,aprendizado,ciclo,h){
  const problema=escolherProblema(memoria);
  if(!problema){
    registrar(h,"MEMORIA",ciclo,"SEM_PROBLEMA_PRIORITARIO");
    return {ok:false,status:"BLOQUEADO_SEM_PROBLEMA_PRIORITARIO"};
  }

  const candidatas=gerarEstrategiasProblema(problema);
  const bloqueadas=memoria.tentativas
    .filter(x=>x.fingerprint===problema.fingerprint)
    .map(x=>x.estrategia);
  const estrategia=selecionarEstrategiaAprendida(aprendizado,problema,candidatas,bloqueadas);
  if(!estrategia){
    registrarIgnorado(memoria,{
      fingerprint:problema.fingerprint,
      ciclo,
      motivo:"todas as estratégias disponíveis já foram tentadas",
      estrategia:"CORRIGIR"
    });
    const status="BLOQUEADO_SEM_ESTRATEGIA_NOVA";
    registrar(h,"MEMORIA",ciclo,status,{problema:problema.mensagem,fingerprint:problema.fingerprint});
    return {ok:false,status};
  }

  const antesScore=analise?.score??0;
  const utilidade=utilidadeEstrategia(aprendizado,problema.categoria,estrategia);
  const r=corrigirProjeto({files},opcoesDaEstrategia(problema,estrategia));
  const depoisScore=r.depois?.score??antesScore;
  const ganho=depoisScore-antesScore;
  const houveAplicacao=Boolean(r.aplicado);
  const statusTentativa=!houveAplicacao
    ? "FALHOU"
    : "OK";

  registrarTentativa(memoria,{
    fingerprint:problema.fingerprint,
    ciclo,
    etapa:"CORRIGIR",
    estrategia,
    antesScore,
    depoisScore,
    ganho,
    status:statusTentativa,
    alteracoes:r.alteracoes||[]
  });
  registrarTentativaAprendida(aprendizado,{
    fingerprint:problema.fingerprint,
    categoria:problema.categoria,
    estrategia,
    ciclo,
    ganho,
    aplicada:houveAplicacao,
    status:statusTentativa
  });

  if(!houveAplicacao){
    registrar(h,"CORRIGIR",ciclo,"SEM_ALTERACOES",{
      estrategia,
      utilidade:Number(utilidade.toFixed(4)),
      ganho,
      problema:problema.mensagem,
      alteracoes:[]
    });
    return {ok:false,status:"BLOQUEADO_SEM_CORRECAO"};
  }

  if(ganho<0){
    registrar(h,"CORRIGIR",ciclo,"REGRESSAO_PRESERVADA",{
      estrategia,
      ganho,
      problema:problema.mensagem,
      alteracoes:r.alteracoes||[]
    });
    return {ok:false,status:"BLOQUEADO_REGRESSAO"};
  }

  registrar(h,"CORRIGIR",ciclo,"OK",{
    estrategia,
    utilidade:Number(utilidade.toFixed(4)),
    ganho,
    problema:problema.mensagem,
    alteracoes:r.alteracoes||[]
  });
  return {ok:true,files:r.files};
}

export function executarCicloEngenharia(entrada="",opcoes={}){
  const max=Math.max(1,Math.min(6,Number(opcoes.maxCiclos)||4));
  const h=[];
  const criar=opcoes.criar!==false;
  let files=clonar(opcoes.files||{});
  let plano=null,criado=false,a=null,v=null,status="EM_EXECUCAO";
  const memoria=criarMemoriaEngenharia();
  const aprendizado=hidratarModeloAprendizado(opcoes.aprendizado||{});

  if(!Object.keys(files).length&&criar){
    const g=gerarProjeto(String(entrada||""),opcoes.analise||{});
    files=clonar(g.files);
    plano=g.plano;
    criado=true;
    registrar(h,"CRIAR",0,"OK",{arquivos:Object.keys(files)});
  }else{
    registrar(h,"CRIAR",0,"IGNORADO");
  }

  const vistos=new Set();

  for(let ciclo=1;ciclo<=max;ciclo++){
    const antes=fp(files);
    if(vistos.has(antes)){
      status="PARADO_SEM_PROGRESSO";
      registrar(h,"GUARDA",ciclo,status);
      break;
    }
    vistos.add(antes);

    a=analisarProjeto(files);
    registrarResolvidos(memoria,a,ciclo);
    atualizarResultadosAprendidos(aprendizado,a,extrairProblemas,ciclo);
    registrarProblemas(memoria,a,ciclo);
    registrar(h,"ANALISAR",ciclo,bloqueios(a)>0?"BLOQUEADORES":"OK",{
      score:a.score,
      bloqueadores:bloqueios(a),
      problemasRastreados:memoria.problemas.size
    });

    if(bloqueios(a)>0){
      const correcao=aplicarCorrecaoAdaptativa(files,a,memoria,aprendizado,ciclo,h);
      if(!correcao.ok){
        status=correcao.status;
        break;
      }
      files=clonar(correcao.files);
      continue;
    }

    const m=aplicarMelhoriasSeguras({files});
    if(m.aplicado){
      const ganho=(m.depois?.score??a.score)-a.score;
      if(ganho>=0){
        files=clonar(m.files);
        registrar(h,"MELHORAR",ciclo,"OK",{ganho,alteracoes:m.alteracoes||[]});
      }else{
        registrar(h,"MELHORAR",ciclo,"PRESERVADO",{ganho});
      }
    }else{
      registrar(h,"MELHORAR",ciclo,"SEM_ALTERACOES");
    }

    a=analisarProjeto(files);
    registrarResolvidos(memoria,a,ciclo);
    atualizarResultadosAprendidos(aprendizado,a,extrairProblemas,ciclo);
    v=validarProjeto(files,opcoes.validacao||{});
    registrar(h,"VALIDAR",ciclo,v.estado,{
      score:v.score,
      bloqueadores:v.bloqueadores
    });

    if(v.valido){
      status=v.estado==="APROVADO"?"APROVADO":"APROVADO_COM_AVISOS";
      break;
    }

    registrarProblemas(memoria,v,ciclo);
    atualizarResultadosAprendidos(aprendizado,v,ciclo);

    if(ciclo===max){
      status="REPROVADO_LIMITE";
      break;
    }

    const correcaoValidacao=aplicarCorrecaoAdaptativa(files,v.analise||v,memoria,aprendizado,ciclo,h);
    if(!correcaoValidacao.ok){
      status=correcaoValidacao.status.startsWith("BLOQUEADO_SEM_PROBLEMA")
        ?"BLOQUEADO_VALIDACAO_SEM_PROBLEMA"
        :correcaoValidacao.status;
      break;
    }
    files=clonar(correcaoValidacao.files);
    registrar(h,"CORRIGIR",ciclo,"VALIDACAO_FALHOU",{
      tentativaAdaptativa:true,
      mudou:true
    });
  }

  if(!a)a=analisarProjeto(files);
  if(!v)v=validarProjeto(files,opcoes.validacao||{});
  registrarResolvidos(memoria,a,h.filter(x=>x.etapa==="ANALISAR").length);
  if(v.valido&&status==="EM_EXECUCAO")status=v.estado==="APROVADO"?"APROVADO":"APROVADO_COM_AVISOS";

  return resultadoFinal(files,plano,criado,opcoes.entry||"index.html",a,v,h,status,memoria);
}

export function relatorioEngenharia(r={}){
  const c=r.analise?.resumo?.contagem||{};
  const l=[
    "CICLO DE ENGENHARIA: "+(r.status||"SEM RESULTADO"),
    "Criado: "+(r.criado?"sim":"não")+" • Ciclos: "+(r.ciclos??0),
    "Arquivos: "+Object.keys(r.files||{}).length+" • Score análise: "+(r.analise?.score??0)+"/100",
    "Validação: "+(r.validacao?.estado||"não executada")+" • Score: "+(r.validacao?.score??0)+"/100",
    "Bloqueadores: "+(r.validacao?.bloqueadores??((c.critica||0)+(c.alta||0)))
  ];
  if(r.plano)l.push("Plano: "+r.plano.tipo+" / "+r.plano.estrategia);
  if(r.memoria)l.push(...relatorioMemoriaEngenharia(r.memoria).split("\n"));
  if(r.aprendizado)l.push(...relatorioAprendizado(r.aprendizado).split("\n"));
  for(const x of r.historico||[])l.push((x.ciclo?"["+x.ciclo+"] ":"")+"["+x.etapa+"] "+x.status+(x.estrategia?" • estratégia="+x.estrategia:""));
  return l.join("\n");
}
