import test from "node:test";
import assert from "node:assert/strict";
import { executarCicloEngenharia, relatorioEngenharia } from "../engine.js";
import { criarMemoriaEngenharia, registrarProblemas, registrarResolvidos, selecionarEstrategia, registrarTentativa, estrategiaJaFalhou, serializarMemoriaEngenharia, relatorioMemoriaEngenharia } from "../engineering-memory.js";
test("ENGINE executa ciclo completo",()=>{const r=executarCicloEngenharia("Crie uma PWA offline");assert.equal(r.ok,true);assert.ok(["APROVADO","APROVADO_COM_AVISOS"].includes(r.status));assert.ok(r.historico.some(x=>x.etapa==="CRIAR"));assert.ok(r.historico.some(x=>x.etapa==="ANALISAR"));assert.ok(r.historico.some(x=>x.etapa==="VALIDAR"));});
test("ENGINE corrige viewport ausente",()=>{const r=executarCicloEngenharia("projeto",{criar:false,files:{"index.html":"<!doctype html><html><head></head><body><h1>Teste</h1></body></html>"}});assert.equal(r.ok,true);assert.ok(r.historico.some(x=>x.etapa==="CORRIGIR"));});
test("ENGINE termina com limite",()=>{const r=executarCicloEngenharia("projeto",{criar:false,maxCiclos:2,files:{"index.html":"<!doctype html><html><head><meta name=\"viewport\" content=\"width=device-width\"></head><body><script>eval(1)</script></body></html>"}});assert.notEqual(r.status,"EM_EXECUCAO");});
test("ENGINE gera relatório",()=>{const r=executarCicloEngenharia("Crie um site responsivo");assert.match(relatorioEngenharia(r),/CICLO DE ENGENHARIA:/);});
test("ENGINE usa VALIDAR como gate e tenta correção após reprovação",()=>{
  const r=executarCicloEngenharia("projeto",{
    criar:false,
    maxCiclos:2,
    files:{"app.js":"const x=1;"}
  });
  assert.ok(r.historico.some(x=>x.etapa==="VALIDAR"));
  assert.ok(r.historico.some(x=>x.etapa==="CORRIGIR"));
  assert.ok(r.memoria.ignorados.length>=0);
  assert.notEqual(r.status,"EM_EXECUCAO");
});


test("MEMÓRIA rastreia problema, tentativa e relatório",()=>{
  const m=criarMemoriaEngenharia();
  registrarProblemas(m,{achados:[{severidade:"alta",categoria:"seguranca",mensagem:"Uso de eval",evidencia:"eval(1)"}]},1);
  const p=[...m.problemas.values()][0];
  assert.ok(p?.fingerprint);
  registrarTentativa(m,{fingerprint:p.fingerprint,ciclo:1,estrategia:"CORRIGIR",antesScore:70,depoisScore:70,ganho:0,status:"FALHOU"});
  assert.equal(estrategiaJaFalhou(m,p.fingerprint,"CORRIGIR"),true);
  const dados=serializarMemoriaEngenharia(m);
  assert.equal(dados.tentativas.length,1);
  assert.match(relatorioMemoriaEngenharia(dados),/MEMORIA DE ENGENHARIA/);
});

test("ENGINE registra memória no resultado e evita repetir estratégia falha",()=>{
  const r=executarCicloEngenharia("projeto",{criar:false,maxCiclos:4,files:{
    "index.html":"<!doctype html><html><head><meta name=\"viewport\" content=\"width=device-width\"></head><body><script>eval(1)</script></body></html>"
  }});
  assert.ok(r.memoria);
  assert.ok(Array.isArray(r.memoria.problemas));
  assert.ok(Array.isArray(r.memoria.tentativas));
  assert.match(r.relatorioMemoria,/MEMORIA DE ENGENHARIA/);
  assert.ok(r.status!=="EM_EXECUCAO");
});


test("MEMÓRIA escolhe estratégia específica antes da genérica",()=>{
  const m=criarMemoriaEngenharia();
  registrarProblemas(m,{achados:[{severidade:"alta",categoria:"Mobile",mensagem:"Viewport ausente",evidencia:"index.html"}]},1);
  const p=[...m.problemas.values()][0];
  assert.equal(selecionarEstrategia(m,p),"CORRIGIR_MOBILE");
  registrarTentativa(m,{fingerprint:p.fingerprint,estrategia:"CORRIGIR_MOBILE",status:"FALHOU",ciclo:1});
  assert.equal(selecionarEstrategia(m,p),"CORRIGIR");
  registrarTentativa(m,{fingerprint:p.fingerprint,estrategia:"CORRIGIR",status:"FALHOU",ciclo:2});
  assert.equal(selecionarEstrategia(m,p),null);
});

test("MEMÓRIA só marca problema como resolvido depois de ele desaparecer da análise",()=>{
  const m=criarMemoriaEngenharia();
  const achado={severidade:"alta",categoria:"Segurança",mensagem:"Uso de eval()",evidencia:"eval(1)"};
  registrarProblemas(m,{achados:[achado]},1);
  const p=[...m.problemas.values()][0];
  registrarTentativa(m,{fingerprint:p.fingerprint,estrategia:"CORRIGIR_SEGURANCA",status:"OK",ciclo:1,antesScore:40,depoisScore:70,ganho:30});
  assert.equal(p.resolvido,false);
  registrarResolvidos(m,{achados:[]},2);
  assert.equal(p.resolvido,true);
});
