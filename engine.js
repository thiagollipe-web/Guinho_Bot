import { gerarProjeto } from "./generator.js";
import { analisarProjeto } from "./analyzer.js";
import { corrigirProjeto } from "./fixer.js";
import { aplicarMelhoriasSeguras } from "./improver.js";
import { validarProjeto } from "./validator.js";
const clonar=xs=>Object.fromEntries(Object.entries(xs||{}).map(([k,v])=>[k,String(v??"")]));
const fp=xs=>Object.keys(xs).sort().map(k=>k+"\0"+xs[k]).join("\1");
const bloqueios=a=>(a.resumo?.contagem?.critica||0)+(a.resumo?.contagem?.alta||0);
export function executarCicloEngenharia(entrada="",opcoes={}){
 const max=Math.max(1,Math.min(6,Number(opcoes.maxCiclos)||3)),h=[],criar=opcoes.criar!==false;
 let files=clonar(opcoes.files||{}),plano=null,criado=false,a=null,v=null,status="EM_EXECUCAO";
 if(!Object.keys(files).length&&criar){const g=gerarProjeto(String(entrada||""),opcoes.analise||{});files=clonar(g.files);plano=g.plano;criado=true;h.push({etapa:"CRIAR",status:"OK",arquivos:Object.keys(files)});}
 else h.push({etapa:"CRIAR",status:"IGNORADO"});
 const vistos=new Set();
 for(let ciclo=1;ciclo<=max;ciclo++){
  const antes=fp(files); if(vistos.has(antes)){status="PARADO_SEM_PROGRESSO";h.push({etapa:"GUARDA",ciclo,status});break;} vistos.add(antes);
  a=analisarProjeto(files); h.push({etapa:"ANALISAR",ciclo,status:a.valido?"OK":"BLOQUEADORES",score:a.score});
  if(bloqueios(a)>0){
   const r=corrigirProjeto({files});
   if(!r.aplicado){status="BLOQUEADO_SEM_CORRECAO";h.push({etapa:"CORRIGIR",ciclo,status});break;}
   const ganho=(r.depois?.score??0)-(a.score??0); if(ganho<0){status="BLOQUEADO_REGRESSAO";h.push({etapa:"CORRIGIR",ciclo,status});break;}
   files=clonar(r.files);h.push({etapa:"CORRIGIR",ciclo,status:"OK",ganho,alteracoes:r.alteracoes||[]});continue;
  }
  const m=aplicarMelhoriasSeguras({files});
  if(m.aplicado){const ganho=(m.depois?.score??0)-(a.score??0);if(ganho>=0){files=clonar(m.files);h.push({etapa:"MELHORAR",ciclo,status:"OK",ganho});}else h.push({etapa:"MELHORAR",ciclo,status:"PRESERVADO",ganho});}
  else h.push({etapa:"MELHORAR",ciclo,status:"SEM_ALTERACOES"});
  a=analisarProjeto(files);v=validarProjeto(files,opcoes.validacao||{});h.push({etapa:"VALIDAR",ciclo,status:v.estado,score:v.score,bloqueadores:v.bloqueadores});
  if(v.valido){status=v.estado==="APROVADO"?"APROVADO":"APROVADO_COM_AVISOS";break;}
  if(ciclo===max){status="REPROVADO_LIMITE";break;}
  if(fp(files)===antes){status="PARADO_SEM_PROGRESSO";h.push({etapa:"GUARDA",ciclo,status});break;}
 }
 if(!a)a=analisarProjeto(files); if(!v)v=validarProjeto(files,opcoes.validacao||{});
 return {ok:v.valido,status:v.valido?status:"REPROVADO",ciclos:h.filter(x=>x.etapa==="ANALISAR").length,criado,plano,entry:opcoes.entry||"index.html",files,analise:a,validacao:v,historico:h};
}
export function relatorioEngenharia(r={}){
 const c=r.analise?.resumo?.contagem||{},l=["CICLO DE ENGENHARIA: "+(r.status||"SEM RESULTADO"),"Criado: "+(r.criado?"sim":"não")+" • Ciclos: "+(r.ciclos??0),"Arquivos: "+Object.keys(r.files||{}).length+" • Score análise: "+(r.analise?.score??0)+"/100","Validação: "+(r.validacao?.estado||"não executada")+" • Score: "+(r.validacao?.score??0)+"/100","Bloqueadores: "+(r.validacao?.bloqueadores??((c.critica||0)+(c.alta||0)))];
 if(r.plano)l.push("Plano: "+r.plano.tipo+" / "+r.plano.estrategia); for(const x of r.historico||[])l.push((x.ciclo?"["+x.ciclo+"] ":"")+"["+x.etapa+"] "+x.status); return l.join("\n");
}