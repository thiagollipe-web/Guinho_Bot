import { gerarProjeto } from "./generator.js";
import { analisarProjeto } from "./analyzer.js";
import { corrigirProjeto } from "./fixer.js";
import { aplicarMelhoriasSeguras } from "./improver.js";
import { validarProjeto } from "./validator.js";
import { criarMemoriaEngenharia, registrarProblemas, registrarTentativa, registrarResolvidos, estrategiaJaFalhou, registrarIgnorado, serializarMemoriaEngenharia, relatorioMemoriaEngenharia } from "./engineering-memory.js";

const clonar=xs=>Object.fromEntries(Object.entries(xs||{}).map(([k,v])=>[k,String(v??"")]));
const fp=xs=>Object.keys(xs).sort().map(k=>k+"\0"+xs[k]).join("\1");
const bloqueios=a=>(a.resumo?.contagem?.critica||0)+(a.resumo?.contagem?.alta||0);

function registrar(h,etapa,ciclo,status,extra={}){
  h.push({etapa,ciclo,status,...extra});
}

function resultadoFinal(files,plano,criado,entry,a,v,h,status){
  return {
    ok:Boolean(v?.valido),
    status:v?.valido?status:"REPROVADO",
    ciclos:h.filter(x=>x.etapa==="ANALISAR").length,
    criado,plano,entry,files,analise:a,validacao:v,historico:h
  };
}

export function executarCicloEngenharia(entrada="",opcoes={}){
  const max=Math.max(1,Math.min(6,Number(opcoes.maxCiclos)||4));
  const h=[];
  const criar=opcoes.criar!==false;
  let files=clonar(opcoes.files||{});
  let plano=null,criado=false,a=null,v=null,status="EM_EXECUCAO";

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
  const memoria=criarMemoriaEngenharia();
  let memoriaAnaliseAnterior=null;

  for(let ciclo=1;ciclo<=max;ciclo++){
    const antes=fp(files);

    if(vistos.has(antes)){
      status="PARADO_SEM_PROGRESSO";
      registrar(h,"GUARDA",ciclo,status);
      break;
    }
    vistos.add(antes);

    a=analisarProjeto(files);
    registrarProblemas(memoria,a,ciclo);
    registrarResolvidos(memoria,a,ciclo);
    memoriaAnaliseAnterior=a;
    registrar(h,"ANALISAR",ciclo,bloqueios(a)>0?"BLOQUEADORES":"OK",{score:a.score,bloqueadores:bloqueios(a),problemasRastreados:memoria.problemas.size});

    if(bloqueios(a)>0){
      const problemas=Array.from(memoria.problemas.values()).filter(x=>!x.resolvido&&["critica","alta"].includes(String(x.severidade).toLowerCase()));
      const repetido=problemas.find(x=>estrategiaJaFalhou(memoria,x.fingerprint,"CORRIGIR"));
      if(repetido){
        registrarIgnorado(memoria,{fingerprint:repetido.fingerprint,ciclo,motivo:"mesma estratégia já falhou para o problema",estrategia:"CORRIGIR"});
        status="BLOQUEADO_ESTRATEGIA_REPETIDA";
        registrar(h,"MEMORIA",ciclo,status,{problema:repetido.mensagem,fingerprint:repetido.fingerprint});
        break;
      }
      const r=corrigirProjeto({files});
      const ganho=(r.depois?.score??a.score)-(a.score??0);

      if(!r.aplicado){
        const alvo=problemas[0];
        if(alvo) registrarTentativa(memoria,{fingerprint:alvo.fingerprint,ciclo,etapa:"CORRIGIR",estrategia:"CORRIGIR",antesScore:a.score,depoisScore:a.score,ganho,status:"FALHOU",alteracoes:[]});
        status="BLOQUEADO_SEM_CORRECAO";
        registrar(h,"CORRIGIR",ciclo,status,{ganho,alteracoes:[]});
        break;
      }

      if(ganho<0){
        const alvo=problemas[0];
        if(alvo) registrarTentativa(memoria,{fingerprint:alvo.fingerprint,ciclo,etapa:"CORRIGIR",estrategia:"CORRIGIR",antesScore:a.score,depoisScore:r.depois?.score,ganho,status:"FALHOU",alteracoes:r.alteracoes||[]});
        status="BLOQUEADO_REGRESSAO";
        registrar(h,"CORRIGIR",ciclo,status,{ganho,alteracoes:r.alteracoes||[]});
        break;
      }

      const alvo=problemas[0];
      if(alvo) registrarTentativa(memoria,{fingerprint:alvo.fingerprint,ciclo,etapa:"CORRIGIR",estrategia:"CORRIGIR",antesScore:a.score,depoisScore:r.depois?.score,ganho,status:"OK",alteracoes:r.alteracoes||[]});
      files=clonar(r.files);
      registrar(h,"CORRIGIR",ciclo,"OK",{ganho,alteracoes:r.alteracoes||[]});
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
    v=validarProjeto(files,opcoes.validacao||{});
    registrar(h,"VALIDAR",ciclo,v.estado,{score:v.score,bloqueadores:v.bloqueadores});

    if(v.valido){
      status=v.estado==="APROVADO"?"APROVADO":"APROVADO_COM_AVISOS";
      break;
    }

    if(ciclo===max){
      status="REPROVADO_LIMITE";
      break;
    }

    // O VALIDAR é um gate real: se reprovar por qualquer motivo,
    // o ciclo tenta uma nova CORREÇÃO antes da próxima análise.
    const antesValidacao=fp(files);
    const problemasValidacao=Array.from(memoria.problemas.values()).filter(x=>!x.resolvido&&["critica","alta"].includes(String(x.severidade).toLowerCase()));
    const repetidoValidacao=problemasValidacao.find(x=>estrategiaJaFalhou(memoria,x.fingerprint,"CORRIGIR"));
    if(repetidoValidacao){
      registrarIgnorado(memoria,{fingerprint:repetidoValidacao.fingerprint,ciclo,motivo:"mesma estratégia já falhou durante o gate de validação",estrategia:"CORRIGIR"});
      status="BLOQUEADO_VALIDACAO_ESTRATEGIA_REPETIDA";
      registrar(h,"MEMORIA",ciclo,status,{problema:repetidoValidacao.mensagem,fingerprint:repetidoValidacao.fingerprint});
      break;
    }
    const r=corrigirProjeto({files});
    const ganho=(r.depois?.score??a.score)-a.score;

    if(!r.aplicado){
      const alvo=problemasValidacao[0];
      if(alvo) registrarTentativa(memoria,{fingerprint:alvo.fingerprint,ciclo,etapa:"CORRIGIR",estrategia:"CORRIGIR",antesScore:a.score,depoisScore:a.score,ganho,status:"FALHOU",alteracoes:[]});
      status="BLOQUEADO_VALIDACAO_SEM_CORRECAO";
      registrar(h,"CORRIGIR",ciclo,status,{ganho,alteracoes:[]});
      break;
    }

    if(ganho<0){
      const alvo=problemasValidacao[0];
      if(alvo) registrarTentativa(memoria,{fingerprint:alvo.fingerprint,ciclo,etapa:"CORRIGIR",estrategia:"CORRIGIR",antesScore:a.score,depoisScore:r.depois?.score,ganho,status:"FALHOU",alteracoes:r.alteracoes||[]});
      status="BLOQUEADO_VALIDACAO_REGRESSAO";
      registrar(h,"CORRIGIR",ciclo,status,{ganho,alteracoes:r.alteracoes||[]});
      break;
    }

    const alvo=problemasValidacao[0];
    if(alvo) registrarTentativa(memoria,{fingerprint:alvo.fingerprint,ciclo,etapa:"CORRIGIR",estrategia:"CORRIGIR",antesScore:a.score,depoisScore:r.depois?.score,ganho,status:"OK",alteracoes:r.alteracoes||[]});
    files=clonar(r.files);
    registrar(h,"CORRIGIR",ciclo,"VALIDACAO_FALHOU",{ganho,alteracoes:r.alteracoes||[],mudou:antesValidacao!==fp(files)});
  }

  if(!a)a=analisarProjeto(files);
  if(!v)v=validarProjeto(files,opcoes.validacao||{});
  if(v.valido&&status==="EM_EXECUCAO")status=v.estado==="APROVADO"?"APROVADO":"APROVADO_COM_AVISOS";

  const resultado=resultadoFinal(files,plano,criado,opcoes.entry||"index.html",a,v,h,status);
  const memoriaSerializada=serializarMemoriaEngenharia(memoria);
  registrarResolvidos(memoria,a,h.filter(x=>x.etapa==="ANALISAR").length);
  resultado.memoria=serializarMemoriaEngenharia(memoria);
  resultado.relatorioMemoria=relatorioMemoriaEngenharia(resultado.memoria);
  return resultado;
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
  if(r.memoria)l.push(...relatorioMemoriaEngenharia(r.memoria).split("\\n"));
  for(const x of r.historico||[])l.push((x.ciclo?"["+x.ciclo+"] ":"")+"["+x.etapa+"] "+x.status);
  return l.join("\n");
}
