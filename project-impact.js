function unique(items = []) { return [...new Set(items.filter(Boolean))]; }

export function calcularImpactoProjeto(plan = {}, dependencias = {}, files = {}) {
  const existentes = new Set(Object.keys(files || {}));
  const planejados = Array.isArray(plan.files) ? plan.files : [];
  const diretos = planejados
    .map(item => String(item?.path || ""))
    .filter(path => path && existentes.has(path));
  const relacionados = new Set();
  for (const path of diretos) {
    for (const dep of dependencias?.graph?.[path] || []) if (dep.resolvido) relacionados.add(dep.resolvido);
    for (const dependente of dependencias?.dependentes?.[path] || []) relacionados.add(dependente);
  }
  diretos.forEach(path => relacionados.delete(path));

  const ausentes = (dependencias?.problemas || [])
    .filter(item => diretos.includes(item.arquivo) || diretos.includes(item.alvo))
    .map(item => item.arquivo + " → " + item.alvo);

  const actions = {};
  for (const item of planejados) actions[item.path] = item.action || "update";

  return {
    diretos: unique(diretos),
    relacionados: unique([...relacionados]),
    criados: unique(planejados.filter(x => x.action === "create").map(x => x.path)),
    removidos: unique(planejados.filter(x => x.action === "delete").map(x => x.path)),
    riscos: unique([...(plan.risks || []), ...ausentes]).slice(0, 8),
    total: unique([...diretos, ...relacionados, ...planejados.map(x => x.path)]).length,
    actions
  };
}

export function resumoImpacto(impacto = {}) {
  return [
    "Diretos: " + (impacto.diretos || []).length,
    "Relacionados: " + (impacto.relacionados || []).length,
    "Criados: " + (impacto.criados || []).length,
    "Removidos: " + (impacto.removidos || []).length,
    impacto.riscos?.length ? "Atenções: " + impacto.riscos.length : "Atenções: nenhuma"
  ].join(" • ");
}
