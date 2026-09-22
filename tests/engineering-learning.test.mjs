import test from "node:test";
import assert from "node:assert/strict";
import {
  criarModeloAprendizado,
  chaveAprendizado,
  utilidadeEstrategia,
  selecionarEstrategiaAprendida,
  registrarTentativaAprendida,
  atualizarResultadosAprendidos,
  serializarModeloAprendizado,
  hidratarModeloAprendizado,
  relatorioAprendizado
} from "../engineering-learning.js";

test("APRENDIZADO cria e normaliza chaves por categoria e estratégia",()=>{
  const m=criarModeloAprendizado();
  assert.equal(chaveAprendizado("Segurança","Corrigir específico"),"SEGURANCA::CORRIGIR_ESPECIFICO");
  assert.equal(Object.keys(m.estrategias).length,0);
});

test("APRENDIZADO explora estratégias novas antes de acumular evidência",()=>{
  const m=criarModeloAprendizado();
  const p={categoria:"Mobile"};
  assert.equal(selecionarEstrategiaAprendida(m,p,["CORRIGIR_MOBILE","CORRIGIR"]), "CORRIGIR_MOBILE");
});

test("APRENDIZADO passa a preferir estratégia com melhor histórico",()=>{
  const m=criarModeloAprendizado();
  for(let i=0;i<4;i++){
    registrarTentativaAprendida(m,{fingerprint:"a"+i,categoria:"Mobile",estrategia:"CORRIGIR_MOBILE",ciclo:i,ganho:20,aplicada:true});
    atualizarResultadosAprendidos(m,{achados:[]},x=>x.achados||[],i+1,"ANALISE");
  }
  for(let i=0;i<4;i++){
    registrarTentativaAprendida(m,{fingerprint:"b"+i,categoria:"Mobile",estrategia:"CORRIGIR",ciclo:i,ganho:0,aplicada:false,status:"FALHOU"});
  }
  const r=selecionarEstrategiaAprendida(m,{categoria:"Mobile"},["CORRIGIR_MOBILE","CORRIGIR"]);
  assert.equal(r,"CORRIGIR_MOBILE");
  assert.ok(utilidadeEstrategia(m,"Mobile","CORRIGIR_MOBILE")>utilidadeEstrategia(m,"Mobile","CORRIGIR"));
});

test("APRENDIZADO só recompensa sucesso quando a evidência desaparece",()=>{
  const m=criarModeloAprendizado();
  registrarTentativaAprendida(m,{fingerprint:"problema-1",categoria:"Segurança",estrategia:"CORRIGIR_SEGURANCA",ciclo:1,ganho:30,aplicada:true});
  atualizarResultadosAprendidos(m,{achados:[{fingerprint:"problema-1"}]},x=>x.achados||[],2,"ANALISE");
  let r=m.estrategias[chaveAprendizado("Segurança","CORRIGIR_SEGURANCA")];
  assert.equal(r.sucessos,0);
  assert.equal(r.falhas,1);
  registrarTentativaAprendida(m,{fingerprint:"problema-2",categoria:"Segurança",estrategia:"CORRIGIR_SEGURANCA",ciclo:3,ganho:30,aplicada:true});
  atualizarResultadosAprendidos(m,{achados:[]},x=>x.achados||[],4,"ANALISE");
  r=m.estrategias[chaveAprendizado("Segurança","CORRIGIR_SEGURANCA")];
  assert.equal(r.sucessos,1);
});

test("APRENDIZADO serializa e hidrata estado persistente",()=>{
  const m=criarModeloAprendizado();
  registrarTentativaAprendida(m,{fingerprint:"p",categoria:"PWA",estrategia:"CORRIGIR_PWA",ciclo:1,ganho:15,aplicada:false,status:"FALHOU"});
  const dados=serializarModeloAprendizado(m);
  const h=hidratarModeloAprendizado(dados);
  assert.deepEqual(serializarModeloAprendizado(h),dados);
  assert.match(relatorioAprendizado(h),/APRENDIZADO DE ESTRATÉGIAS/);
});
