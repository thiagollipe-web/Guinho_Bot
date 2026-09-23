const MAX_PLAN_FILES = 12;

function textoNormalizado(valor = "") {
  return String(valor || "").replace(/\s+/g, " ").trim();
}

function motivoPadrao(action) {
  if (action === "create") return "novo arquivo necessário para implementar o pedido";
  if (action === "delete") return "arquivo removido a pedido do usuário";
  return "arquivo diretamente afetado pelo pedido";
}

function relacionadosDoGrafo(deps, nome) {
  const out = new Set([nome]);
  for (const dep of deps?.graph?.[nome] || []) {
    if (dep.resolvido) out.add(dep.resolvido);
  }
  for (const [arquivo, dependentes] of Object.entries(deps?.dependentes || {})) {
    if (arquivo === nome) for (const dependente of dependentes) out.add(dependente);
  }
  return [...out];
}

export function gerarPlanoAlteracao(pedido, workspace = {}, dependencias = {}) {
  const files = workspace?.files && typeof workspace.files === "object" ? workspace.files : {};
  const nomes = Object.keys(files);
  const texto = textoNormalizado(pedido).toLowerCase();
  const tokens = texto.split(/[^a-z0-9_./-]+/).filter(Boolean);
  const plano = [];

  function adicionar(path, action = "update", reason = "") {
    if (!path || plano.some(item => item.path === path)) return;
    if ((action === "update" || action === "delete") && !Object.prototype.hasOwnProperty.call(files, path)) return;
    plano.push({ path, action, reason: reason || motivoPadrao(action) });
  }

  for (const nome of nomes) {
    const base = nome.toLowerCase();
    if (tokens.some(token => token.length >= 4 && base.includes(token))) {
      adicionar(nome, "update", "o nome do arquivo coincide com um termo relevante do pedido");
    }
  }

  const entry = workspace?.entry && nomes.includes(workspace.entry)
    ? workspace.entry
    : nomes.includes("index.html") ? "index.html" : nomes[0];

  if (entry && /(interface|tela|pagina|layout|ui|frontend|html|css|botao|botão|visual)/i.test(texto)) {
    adicionar(entry, "update", "ponto de entrada afetado pela mudança de interface");
  }

  if (entry && /(javascript|script|logica|lógica|jogo|inimigo|player|movimento|evento|api|backend|função|funcao)/i.test(texto)) {
    adicionar(entry, "update", "ponto de entrada pode integrar a nova lógica");
  }

  const relacionados = new Set();
  for (const item of plano) {
    for (const rel of relacionadosDoGrafo(dependencias, item.path)) relacionados.add(rel);
  }
  for (const rel of relacionados) {
    if (rel !== entry || plano.length === 0) {
      adicionar(rel, "update", "arquivo relacionado por dependência local");
    }
  }

  if (plano.length === 0 && entry) {
    adicionar(entry, "update", "ponto de entrada usado como contexto inicial");
  }

  return {
    summary: "Plano gerado a partir do pedido, do ponto de entrada e do grafo de dependências.",
    reason: "O plano precede a geração do patch para tornar visíveis os arquivos potencialmente afetados.",
    files: plano.slice(0, MAX_PLAN_FILES),
    risks: (dependencias.problemas || []).slice(0, 5).map(item => item.arquivo + " → " + item.alvo),
    next_task: "Revisar os arquivos impactados e aplicar o plano quando estiver correto."
  };
}

export function arquivosImpactadosDoPlano(plano, files = {}) {
  const current = new Set(Object.keys(files || {}));
  const seen = new Set();
  return (Array.isArray(plano?.files) ? plano.files : [])
    .filter(item => {
      const path = String(item?.path || "");
      const action = String(item?.action || "");
      if (!path || seen.has(path) || !["create", "update", "delete"].includes(action)) return false;
      if ((action === "update" || action === "delete") && !current.has(path)) return false;
      seen.add(path);
      return true;
    })
    .slice(0, MAX_PLAN_FILES)
    .map(item => ({
      path: String(item.path),
      action: String(item.action),
      reason: String(item.reason || "impacto identificado").slice(0, 600)
    }));
}

export function resumirPlano(plano) {
  if (!plano) return "Nenhum plano pendente.";
  const files = Array.isArray(plano.files) ? plano.files : [];
  const lines = [
    String(plano.summary || "Plano de alteração."),
    "Arquivos impactados: " + files.length
  ];
  for (const item of files) {
    lines.push("• " + String(item.action || "update").toUpperCase() + " " + item.path + " — " + String(item.reason || "impacto identificado"));
  }
  if (plano.risks?.length) lines.push("Riscos/atenções: " + plano.risks.join("; "));
  if (plano.next_task) lines.push("Próxima etapa: " + plano.next_task);
  return lines.join("\n");
}

export { MAX_PLAN_FILES };
