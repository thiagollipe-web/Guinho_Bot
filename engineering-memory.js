const normalizarTexto = valor => String(valor ?? "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .trim();

const hashTexto = valor => {
  let hash = 2166136261;
  for (const caractere of String(valor ?? "")) {
    hash ^= caractere.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const evidencias = finding => {
  if (!finding || typeof finding !== "object") return [];
  const candidatas = [
    finding.evidencia,
    finding.evidence,
    finding.exemplo,
    finding.achado,
    finding.message,
    finding.mensagem,
    finding.file,
    finding.arquivo
  ];
  return [...new Set(candidatas
    .filter(v => v != null && String(v).trim())
    .map(v => normalizarTexto(v))
  )].slice(0, 4);
};

export function fingerprintProblema(finding = {}) {
  const severidade = normalizarTexto(finding.severidade || finding.severity || "info");
  const categoria = normalizarTexto(finding.categoria || finding.category || "geral");
  const mensagem = normalizarTexto(finding.mensagem || finding.message || finding.titulo || finding.title || "");
  const ev = evidencias(finding).join("|");
  return hashTexto([severidade, categoria, mensagem, ev].join("::"));
}

export function extrairProblemas(analise = {}) {
  const colecoes = [
    analise.achados,
    analise.problemas,
    analise.findings,
    analise.itens,
    analise.detalhes
  ];
  const lista = colecoes.find(Array.isArray) || [];
  return lista.map(finding => ({
    id: fingerprintProblema(finding),
    fingerprint: fingerprintProblema(finding),
    severidade: finding?.severidade || finding?.severity || "info",
    categoria: finding?.categoria || finding?.category || "geral",
    mensagem: finding?.mensagem || finding?.message || finding?.titulo || finding?.title || "Problema sem descrição",
    evidencias: evidencias(finding)
  }));
}

export function criarMemoriaEngenharia() {
  return {
    problemas: new Map(),
    tentativas: [],
    resolvidos: [],
    ignorados: []
  };
}

export function registrarProblemas(memoria, analise = {}, ciclo = 0) {
  for (const problema of extrairProblemas(analise)) {
    const atual = memoria.problemas.get(problema.fingerprint);
    if (atual) {
      atual.vezesObservado += 1;
      atual.ultimoCiclo = ciclo;
      atual.mensagem = problema.mensagem;
      atual.severidade = problema.severidade;
      atual.categoria = problema.categoria;
      atual.evidencias = problema.evidencias;
    } else {
      memoria.problemas.set(problema.fingerprint, {
        ...problema,
        primeiroCiclo: ciclo,
        ultimoCiclo: ciclo,
        vezesObservado: 1,
        tentativas: 0,
        falhas: 0,
        sucessos: 0,
        resolvido: false,
        resolvidoNoCiclo: null,
        ultimaAcao: null,
        ultimaVariacao: null
      });
    }
  }
  return memoria;
}

const slugEstratégia = valor => normalizarTexto(valor)
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "")
  .toUpperCase();

export function gerarEstrategiasProblema(problema = {}) {
  const categoria = slugEstratégia(problema.categoria || "GERAL");
  const especifica = categoria ? "CORRIGIR_" + categoria : "CORRIGIR";
  return especifica === "CORRIGIR" ? ["CORRIGIR"] : [especifica, "CORRIGIR"];
}

export function selecionarEstrategia(memoria, problema = {}) {
  const candidatas = gerarEstrategiasProblema(problema);
  return candidatas.find(estrategia => !estrategiaJaTentada(memoria, problema.fingerprint, estrategia)) || null;
}

export function estrategiaJaTentada(memoria, fingerprint, estrategia = "CORRIGIR") {
  const chave = fingerprint + "::" + normalizarTexto(estrategia);
  return memoria.tentativas.some(x => x.chave === chave);
}

export function estrategiaJaFalhou(memoria, fingerprint, estrategia = "CORRIGIR") {
  const chave = fingerprint + "::" + normalizarTexto(estrategia);
  return memoria.tentativas.some(x => x.chave === chave && x.status !== "RESOLVIDO");
}

export function registrarTentativa(memoria, dados = {}) {
  const fingerprint = dados.fingerprint || "desconhecido";
  const estrategia = normalizarTexto(dados.estrategia || "CORRIGIR") || "corrigir";
  const tentativa = {
    fingerprint,
    chave: fingerprint + "::" + estrategia,
    ciclo: Number(dados.ciclo) || 0,
    etapa: dados.etapa || estrategia.toUpperCase(),
    estrategia: dados.estrategia || "CORRIGIR",
    antesScore: Number(dados.antesScore) || 0,
    depoisScore: Number(dados.depoisScore) || 0,
    ganho: Number(dados.ganho) || 0,
    status: dados.status || "INDEFINIDO",
    alteracoes: Array.isArray(dados.alteracoes) ? [...dados.alteracoes] : []
  };
  memoria.tentativas.push(tentativa);

  const problema = memoria.problemas.get(fingerprint);
  if (problema) {
    problema.tentativas += 1;
    problema.ultimaAcao = tentativa.estrategia;
    problema.ultimaVariacao = tentativa.ganho;
    if (tentativa.status === "RESOLVIDO") {
      problema.sucessos += 1;
    } else if (tentativa.status === "FALHOU" || tentativa.status === "PRESERVADO" || tentativa.status === "SEM_PROGRESSO") {
      problema.falhas += 1;
    }
  }

  return tentativa;
}

export function registrarResolvidos(memoria, analise = {}, ciclo = 0) {
  const problemasAtuais = extrairProblemas(analise);
  const atuais = new Set(problemasAtuais.map(x => x.fingerprint));
  for (const problema of memoria.problemas.values()) {
    if (problema.vezesObservado > 0 && !atuais.has(problema.fingerprint) && !problema.resolvido) {
      problema.resolvido = true;
      problema.resolvidoNoCiclo = ciclo;
      memoria.resolvidos.push(problema.fingerprint);
    }
  }
  return memoria;
}

export function registrarIgnorado(memoria, dados = {}) {
  memoria.ignorados.push({
    fingerprint: dados.fingerprint || "desconhecido",
    ciclo: Number(dados.ciclo) || 0,
    motivo: dados.motivo || "estrategia_repetida",
    estrategia: dados.estrategia || "CORRIGIR"
  });
}

export function serializarMemoriaEngenharia(memoria) {
  const problemas = [...memoria.problemas.values()].map(({ ...x }) => ({ ...x }));
  return {
    problemas,
    tentativas: [...memoria.tentativas],
    resolvidos: [...memoria.resolvidos],
    ignorados: [...memoria.ignorados]
  };
}

export function relatorioMemoriaEngenharia(memoriaOuResultado = {}) {
  const memoria = memoriaOuResultado.memoria || memoriaOuResultado;
  const dados = memoria.problemas instanceof Map
    ? serializarMemoriaEngenharia(memoria)
    : memoria;

  const problemas = Array.isArray(dados.problemas) ? dados.problemas : [];
  const tentativas = Array.isArray(dados.tentativas) ? dados.tentativas : [];
  const resolvidos = Array.isArray(dados.resolvidos) ? dados.resolvidos : [];
  const ignorados = Array.isArray(dados.ignorados) ? dados.ignorados : [];
  const abertos = problemas.filter(x => !x.resolvido);

  return [
    "MEMORIA DE ENGENHARIA",
    "Problemas rastreados: " + problemas.length,
    "Tentativas: " + tentativas.length,
    "Resolvidos: " + resolvidos.length,
    "Em aberto: " + abertos.length,
    "Estratégias ignoradas por repetição: " + ignorados.length,
    ...problemas.map(x =>
      "[" + x.severidade + "] " + x.categoria + ": " + x.mensagem +
      " • tentativas=" + x.tentativas +
      " • resolvido=" + (x.resolvido ? "sim" : "não") +
      (x.ultimaAcao ? " • última ação=" + x.ultimaAcao : "")
    )
  ].join("\n");
}
