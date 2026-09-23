import test from "node:test";
import assert from "node:assert/strict";
import {
  detectarLinguagens,
  detectarTecnologias,
  detectarIntencaoProgramacao,
  detectarTipoProjeto,
  construirPerfilProgramador,
  sugerirIdeiasProgramacao,
  respostaElizaProgramacao,
  ehConversaProgramacao
} from "../guinho-programmer.js";

test("reconhece linguagens populares e extensão de arquivo", () => {
  assert.equal(detectarLinguagens("quero criar em Python").at(0)?.nome, "Python");
  assert.equal(detectarLinguagens("corrija meu arquivo Player.cs").at(0)?.nome, "C#");
  assert.equal(detectarLinguagens("faça em Rust").at(0)?.nome, "Rust");
  assert.equal(detectarLinguagens("projeto TypeScript").at(0)?.nome, "TypeScript");
});

test("reconhece tecnologias e ecossistemas", () => {
  const nomes=detectarTecnologias("React com Vite, Node.js e Docker").map(x=>x.nome);
  assert.ok(nomes.includes("React"));
  assert.ok(nomes.includes("Vite"));
  assert.ok(nomes.includes("Node.js"));
  assert.ok(nomes.includes("Docker"));
});

test("classifica intenção e tipo de projeto", () => {
  assert.equal(detectarIntencaoProgramacao("quero criar um jogo").intencao, "criar");
  assert.equal(detectarIntencaoProgramacao("me sugira uma melhoria").intencao, "sugerir");
  assert.equal(detectarTipoProjeto("quero fazer um jogo 2D mobile"), "jogo");
});

test("recupera contexto da linguagem no histórico", () => {
  const perfil=construirPerfilProgramador("e agora adiciono inimigos?", {
    contexto:{assunto:"jogo"},
    historico:[
      {role:"user",content:"vamos fazer em JavaScript"},
      {role:"assistant",content:"Certo. Vamos usar Canvas."}
    ]
  });
  assert.equal(perfil.linguagem, "JavaScript");
  assert.equal(perfil.tecnologia, "Canvas");
  assert.equal(perfil.tipoProjeto, "jogo");
});

test("Guinho pergunta antes de decidir uma stack ausente", () => {
  const perfil=construirPerfilProgramador("quero criar um programa");
  const resposta=respostaElizaProgramacao("quero criar um programa",perfil);
  assert.match(resposta,/qual linguagem ou tecnologia/i);
});

test("Guinho fornece sugestões relacionadas ao projeto", () => {
  const ideias=sugerirIdeiasProgramacao({tipoProjeto:"jogo"});
  assert.equal(ideias.length,3);
  assert.ok(ideias.every(x=>typeof x==="string"&&x.length>10));
});

test("Guinho mantém conversa orientada a programação", () => {
  const perfil=construirPerfilProgramador("como faço um projeto em Python");
  const resposta=respostaElizaProgramacao("como faço um projeto em Python",perfil);
  assert.match(resposta,/Python/i);
});

test("Guinho mantém o escopo de programação", () => {
  assert.equal(ehConversaProgramacao("quanto é 2 + 2?"), false);
  assert.equal(ehConversaProgramacao("tenho uma ideia para um jogo"), true);
  assert.equal(ehConversaProgramacao("oi"), true);
});
