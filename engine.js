import { gerarProjeto } from "./generator.js";
import { analisarProjeto } from "./analyzer.js";
import { corrigirProjeto } from "./fixer.js";
import { aplicarMelhoriasSeguras } from "./improver.js";
import { validarProjeto } from "./validator.js";

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

  for(let ciclo=1;ciclo<=max;ciclo++){
    const antes=fp(files);

    if(vistos.has(antes)){
      status="PARADO_SEM_PROGRESSO";
      registrar(h,"GUARDA",ciclo,status);
      break;
    }
    vistos.add(antes);

    a=analisarProjeto(files);
    registrar(h,"ANALISAR",ciclo,bloqueios(a)>0?"BLOQUEADORES":"OK",{score:a.score,bloqueadores:bloqueios(a)});

    if(bloqueios(a)>0){
      const r=corrigirProjeto({files});
      const ganho=(r.depois?.score??a.score)-(a.score??0);

      if(!r.aplicado){
        status="BLOQUEADO_SEM_CORRECAO";
        registrar(h,"CORRIGIR",ciclo,status,{ganho,alteracoes:[]});
        break;
      }

      if(ganho<0){
        status="BLOQUEADO_REGRESSAO";
        registrar(h,"CORRIGIR",ciclo,status,{ganho,alteracoes:r.alteracoes||[]});
        break;
      }

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
    const r=corrigirProjeto({files});
    const ganho=(r.depois?.score??a.score)-a.score;

    if(!r.aplicado){
      status="BLOQUEADO_VALIDACAO_SEM_CORRECAO";
      registrar(h,"CORRIGIR",ciclo,status,{ganho,alteracoes:[]});
      break;
    }

    if(ganho<0){
      status="BLOQUEADO_VALIDACAO_REGRESSAO";
      registrar(h,"CORRIGIR",ciclo,status,{ganho,alteracoes:r.alteracoes||[]});
      break;
    }

    files=clonar(r.files);
    registrar(h,"CORRIGIR",ciclo,"VALIDACAO_FALHOU",{ganho,alteracoes:r.alteracoes||[],mudou:antesValidacao!==fp(files)});
  }

  if(!a)a=analisarProjeto(files);
  if(!v)v=validarProjeto(files,opcoes.validacao||{});
  if(v.valido&&status==="EM_EXECUCAO")status=v.estado==="APROVADO"?"APROVADO":"APROVADO_COM_AVISOS";

  return resultadoFinal(files,plano,criado,opcoes.entry||"index.html",a,v,h,status);
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
  for(const x of r.historico||[])l.push((x.ciclo?"["+x.ciclo+"] ":"")+"["+x.etapa+"] "+x.status);
  return l.join("\n");
}
