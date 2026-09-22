import test from "node:test";
import assert from "node:assert/strict";
import { EstatisticaLinguistica, GeradorEstatistico, softmax } from "../probabilistic.js";
import { ContextoConversacional } from "../context.js";
import { buscarPadroes } from "../prompt-library.js";

const pnl = new EstatisticaLinguistica();

const casos = [
  ["O que é JavaScript?", "programacao", "explicar"],
  ["Como faço um jogo de plataforma em HTML?", "jogos", "aprender"],
  ["Quero criar um site em CSS e JavaScript", "programacao", "criar"],
  ["Analise meu código e encontre bugs", "programacao", "analisar"],
  ["Como melhorar meu código?", "programacao", "melhorar"],
  ["Qual a diferença entre Piskel e Pixelorama?", "jogos", "comparar"],
  ["Por que existe o dia e a noite?", "conhecimento", "explicar"],
  ["Calcule 25 + 17", "matematica", "informar"],
  ["Vai chover hoje?", "tempo", "informar"],
  ["Qual é o meu nome?", "memoria", "informar"]
];

test("softmax produz distribuição normalizada", () => {
  const p = softmax([1, 2, 3]);
  assert.equal(p.length, 3);
  assert.ok(p.every(Number.isFinite));
  assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  assert.ok(p[2] > p[1] && p[1] > p[0]);
});

test("classificador reconhece intenção e objetivo em casos principais", () => {
  for (const [texto, intencao, objetivo] of casos) {
    const d = pnl.detectar(texto);
    assert.equal(d.intent, intencao, texto + ": intenção esperada " + intencao + ", obtida " + d.intent);
    assert.equal(d.objetivo, objetivo, texto + ": objetivo esperado " + objetivo + ", obtido " + d.objetivo);
    assert.ok(d.probability >= 0 && d.probability <= 1);
    assert.ok(d.margin >= -1 && d.margin <= 1);
    assert.ok(Number.isFinite(d.entropy));
  }
});

test("n-gramas preservam sequências de contexto", () => {
  const features = pnl.features("desenvolvimento de jogos em html");
  assert.ok(features.length > 4);
  assert.ok(features.some(x => x.split("_").length === 2));
  assert.ok(features.some(x => x.split("_").length === 3));
});

test("tecnologias são extraídas da pergunta", () => {
  const d = pnl.detectar("Crie um jogo em JavaScript usando Canvas para celular");
  assert.ok(d.entidades.tecnologias.includes("javascript"));
  assert.ok(d.entidades.tecnologias.includes("canvas"));
});

test("estratégia muda conforme objetivo e tipo", () => {
  const g = new GeradorEstatistico();
  const criar = g.estrategia(pnl.detectar("Crie um jogo em HTML"));
  const melhorar = g.estrategia(pnl.detectar("Como melhorar meu código JavaScript?"));
  assert.equal(criar.estrategia, "codigo");
  assert.equal(melhorar.estrategia, "melhoria");
  assert.ok(criar.probability > 0);
  assert.ok(melhorar.probability > 0);
});

test("contexto expande referências curtas ao assunto anterior", () => {
  const contexto = new ContextoConversacional("guinho-test-context");
  contexto.limpar();
  contexto.atualizar({
    texto: "Quero criar um jogo de plataforma",
    resposta: "Vamos trabalhar com HTML e Canvas.",
    analise: pnl.detectar("Quero criar um jogo de plataforma"),
    assunto: "desenvolvimento de jogos"
  });
  assert.equal(contexto.referencia("E para celular?", pnl), "E para celular? desenvolvimento de jogos");
  contexto.limpar();
});

test("contexto anterior reforça intenção em continuidade explícita", () => {
  const semContexto = pnl.detectar("E para celular?");
  const comContexto = pnl.detectar("E para celular?", { intencao: "jogos", confianca: 0.9 });
  console.log("DEBUG_CONTEXT", JSON.stringify({intent:comContexto.intent, probability:comContexto.probability, raw:comContexto.rawProbability, probs:comContexto.probabilities.slice(0,5)}, null, 2));
  assert.equal(comContexto.intent, "jogos");
  assert.ok(comContexto.probability >= semContexto.probability || comContexto.rawProbability >= semContexto.rawProbability);
});

test("entropia aumenta quando a distribuição fica mais ambígua", () => {
  const concentrada = pnl.entropia([0.92, 0.04, 0.04]);
  const ambigua = pnl.entropia([0.34, 0.33, 0.33]);
  assert.ok(ambigua > concentrada);
});


test("biblioteca ampla reconhece domínios e formatos", () => {
  const codigo = buscarPadroes("Crie um site responsivo em HTML e CSS com código completo", 10);
  assert.ok(codigo.some(x => x.dominio === "web"));
  assert.ok(codigo.some(x => x.intencao === "codigo"));
  const jogo = buscarPadroes("Como melhorar o movimento do personagem e o FPS do jogo?", 10);
  assert.ok(jogo.some(x => x.dominio === "jogos"));
  const ensino = buscarPadroes("Prepare uma aula com exercícios e gabarito", 10);
  assert.ok(ensino.some(x => x.dominio === "educacao"));
});

test("biblioteca de padrões reforça intenção sem substituir a estatística", () => {
  const d = pnl.detectar("Crie um site responsivo em HTML com código completo");
  assert.equal(d.intent, "programacao");
  assert.equal(d.objetivo, "criar");
  assert.ok(d.probability > 0);
});


test("biblioteca cobre perguntas em linguagem natural e mantém formato esperado", () => {
  const casos = [
    ["Quem criou o JavaScript?", "programacao"],
    ["Quando devo usar Canvas?", "programacao"],
    ["Onde posso criar jogos sem instalar uma engine?", "jogos"],
    ["Quantos pixels tem um canvas de 160 por 120?", "programacao"],
    ["Qual a causa de uma queda de FPS em um jogo?", "jogos"],
    ["Como instalar Ollama no Windows?", "programacao"],
    ["O que significa PWA?", "programacao"],
    ["Por que o céu é azul?", "conhecimento"]
  ];
  for (const [texto, intencao] of casos) {
    const d = pnl.detectar(texto);
    assert.equal(d.intent, intencao, texto + ": intenção esperada " + intencao + ", obtida " + d.intent);
  }
});

test("perfil da pergunta expõe evidências de domínio, intenção e formato", async () => {
  const { perfilPergunta } = await import("../prompt-library.js");
  const p = perfilPergunta("Crie um jogo em HTML com código completo passo a passo");
  assert.ok(p.dominios.jogos > 0 || p.dominios.web > 0);
  assert.ok(p.intencoes.programacao > 0 || p.intencoes.jogos > 0);
  assert.ok(p.formatos.codigo > 0);
  assert.ok(p.formatos.passos > 0);
});
