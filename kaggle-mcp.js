const KAGGLE_MCP_URL = "https://www.kaggle.com/mcp";

const ALLOWED_TOOLS = new Set([
  "search_datasets",
  "get_dataset",
  "list_dataset_files",
  "search_competitions",
  "get_competition",
  "search_models",
  "get_model",
  "list_notebooks",
  "get_notebook",
  "get_notebook_output"
]);

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers }
  });
}

function safeToken() {
  return String(process.env.KAGGLE_API_TOKEN || "").trim();
}

function toolAllowed(name) {
  return typeof name === "string" && ALLOWED_TOOLS.has(name);
}

export function normalizeAction(body) {
  const action = String(body?.action || "").trim();
  if (!["tools", "call"].includes(action)) return { ok: false, error: "Ação Kaggle inválida." };
  if (action === "tools") return { ok: true, action };
  const name = String(body?.name || "").trim();
  if (!toolAllowed(name)) return { ok: false, error: "Ferramenta Kaggle não permitida pelo Guinho." };
  const args = body?.arguments;
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return { ok: false, error: "Os argumentos da ferramenta Kaggle devem ser um objeto." };
  }
  return { ok: true, action, name, arguments: args };
}

async function mcpRequest(method, params = {}) {
  const token = safeToken();
  if (!token) {
    return { ok: false, status: 503, error: "Kaggle não configurado no servidor." };
  }

  const response = await fetch(KAGGLE_MCP_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params
    })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status === 401 || response.status === 403 ? 503 : 502,
      error: response.status === 401 || response.status === 403
        ? "Token da Kaggle inválido ou sem autorização."
        : "O servidor MCP da Kaggle está indisponível."
    };
  }

  if (data?.error) {
    return { ok: false, status: 502, error: data.error.message || "A Kaggle retornou um erro MCP." };
  }

  return { ok: true, data };
}

export async function kaggleHandler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "https://thiagollipe-web.github.io",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "Método não permitido. Use POST." }, 405, { Allow: "POST, OPTIONS" });
  }

  const origin = request.headers.get("origin");
  const configuredOrigin = String(process.env.CORS_ORIGIN || "https://thiagollipe-web.github.io").trim();
  if (origin && origin !== configuredOrigin) {
    return json({ ok: false, error: "Origem não autorizada." }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "JSON inválido." }, 400);
  }

  const action = normalizeAction(body);
  if (!action.ok) return json(action, 400);

  const result = await mcpRequest(
    action.action === "tools" ? "tools/list" : "tools/call",
    action.action === "tools" ? {} : { name: action.name, arguments: action.arguments }
  );

  if (!result.ok) return json(result, result.status || 502);

  return json({
    ok: true,
    action: action.action,
    result: result.data?.result ?? result.data,
    provider: "kaggle-mcp"
  });
}

export default kaggleHandler;
