const MAX_KAGGLE_QUERY = 240;

function compactQuery(text) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, MAX_KAGGLE_QUERY);
}

function extractToolText(result) {
  const content = result?.result?.content || result?.content;
  if (!Array.isArray(content)) return "";

  return content
    .map(item => typeof item?.text === "string" ? item.text : "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function consultarKaggle(action, name, argumentsObject = {}) {
  const response = await fetch("/api/kaggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      name,
      arguments: argumentsObject
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.ok !== true) return null;

  return data.result;
}

export function detectarIntencaoKaggle(texto) {
  const q = compactQuery(texto).toLowerCase();
  if (!q) return null;

  const explicit = /\bkaggle\b/.test(q);
  const dataset = /\b(dataset|datasets|conjunto de dados|base de dados)\b/.test(q);
  const competition = /\b(competição|competicoes|competições|competition|competitions)\b/.test(q);
  const model = /\b(modelo|modelos|model|models|llm)\b/.test(q);
  const notebook = /\b(notebook|notebooks)\b/.test(q);

  if (!(explicit || dataset || competition || model || notebook)) return null;

  let tool = "search_datasets";

  if (competition) {
    tool = "search_competitions";
  } else if (model) {
    tool = "search_models";
  } else if (notebook) {
    tool = "search_notebooks";
  }

  return {
    tool,
    query: q
  };
}

export async function pesquisarKaggle(texto) {
  const intent = detectarIntencaoKaggle(texto);
  if (!intent) return null;

  const result = await consultarKaggle("call", intent.tool, {
    search: intent.query
  });

  const text = extractToolText(result);
  if (!text) return null;

  return {
    text: `Encontrei recursos na Kaggle usando ${intent.tool}:\n\n${text}`,
    tool: intent.tool
  };
}
