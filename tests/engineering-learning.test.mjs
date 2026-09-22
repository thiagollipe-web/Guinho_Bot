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
  relatorioAprendizado,
  nivelPorXp,
  xpParaNivel
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
  assert.match(relatorioAprendizado(h),/SISTEMA DE EXPERIÊNCIA POR APRENDIZADO/);
});


test("EXPERIÊNCIA converte aprendizado confirmado em XP e níveis",()=>{
  const m=criarModeloAprendizado();
  registrarTentativaAprendida(m,{
    fingerprint:"xp-1",
    categoria:"Segurança",
    estrategia:"CORRIGIR_SEGURANCA",
    ciclo:1,
    ganho:30,
    aplicada:true,
    severidade:"alta"
  });
  assert.equal(m.experiencia.xp,0);
  atualizarResultadosAprendidos(m,{achados:[]},x=>x.achados||[],2,"ANALISE");
  assert.ok(m.experiencia.xp>0);
  assert.equal(m.experiencia.nivel,nivelPorXp(m.experiencia.xp));
  assert.equal(m.experiencia.aprendizados,1);
  assert.equal(m.experiencia.sequencia,1);
});

test("EXPERIÊNCIA também aprende com uma tentativa que falha imediatamente",()=>{
  const m=criarModeloAprendizado();
  registrarTentativaAprendida(m,{
    fingerprint:"xp-falha",
    categoria:"Mobile",
    estrategia:"CORRIGIR_MOBILE",
    ciclo:1,
    aplicada:false,
    severidade:"media",
    status:"FALHOU"
  });
  assert.ok(m.experiencia.xp>0);
  assert.equal(m.experiencia.sequencia,0);
  assert.equal(m.experiencia.aprendizados,1);
});

test("EXPERIÊNCIA mantém habilidades por categoria",()=>{
  const m=criarModeloAprendizado();
  registrarTentativaAprendida(m,{
    fingerprint:"skill-1",
    categoria:"PWA",
    estrategia:"CORRIGIR_PWA",
    ciclo:1,
    aplicada:false,
    severidade:"baixa"
  });
  const h=m.habilidades.PWA;
  assert.ok(h);
  assert.ok(h.xp>0);
  assert.equal(h.nivel,nivelPorXp(h.xp));
  assert.equal(h.tentativas,1);
});

test("EXPERIÊNCIA serializada preserva progresso",()=>{
  const m=criarModeloAprendizado();
  registrarTentativaAprendida(m,{
    fingerprint:"persist-xp",
    categoria:"Canvas",
    estrategia:"CORRIGIR_CANVAS",
    ciclo:1,
    aplicada:false,
    severidade:"alta"
  });
  const dados=serializarModeloAprendizado(m);
  const h=hidratarModeloAprendizado(dados);
  assert.deepEqual(serializarModeloAprendizado(h),dados);
  assert.match(relatorioAprendizado(h),/SISTEMA DE EXPERIÊNCIA POR APRENDIZADO/);
  assert.match(relatorioAprendizado(h),/Nível:/);
});
