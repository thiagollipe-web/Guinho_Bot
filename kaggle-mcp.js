const KAGGLE_MCP_URL = "https://www.kaggle.com/mcp";
const TOOL_CATALOG_TTL_MS = 5 * 60 * 1000;
const WRITE_TOOLS_ENV = "KAGGLE_ALLOW_WRITE_TOOLS";

let requestId = 0;
let toolCatalog = new Map();
let toolCatalogFetchedAt = 0;
let toolCatalogPromise = null;

const TOOL_ALIASES = {
  list_notebooks: ["list_notebooks", "search_notebooks"],
  get_dataset: ["get_dataset", "get_dataset_metadata"],
  get_notebook_output: ["get_notebook_output", "download_notebook_output"]
};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

function safeToken() {
  return String(process.env.KAGGLE_API_TOKEN || "").trim();
}

function writeToolsEnabled() {
  return /^(1|true|yes|on)$/i.test(
    String(process.env[WRITE_TOOLS_ENV] || "").trim()
  );
}

function isWriteLikeTool(name) {
  return /^(authorize|cancel|create|delete|save|submit|start|stop|update|upload|run|execute|write)/i.test(name);
}

function isReadOnlyTool(name) {
  return /^(search|get|list|download|find|fetch|view|describe|lookup|check)/i.test(name);
}

function toolAllowedByPolicy(name) {
  if (writeToolsEnabled()) return true;
  return isReadOnlyTool(name) && !isWriteLikeTool(name);
}

function normalizeToolArguments(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return null;
  }

  if (
    Object.prototype.hasOwnProperty.call(args, "request") &&
    args.request &&
    typeof args.request === "object" &&
    !Array.isArray(args.request)
  ) {
    return args;
  }

  return { request: args };
}

export function normalizeAction(body) {
  const action = String(body?.action || "").trim();

  if (!["tools", "call"].includes(action)) {
    return { ok: false, error: "Ação Kaggle inválida." };
  }

  if (action === "tools") {
    return { ok: true, action };
  }

  const name = String(body?.name || "").trim();
  if (!name) {
    return { ok: false, error: "Nome da ferramenta Kaggle ausente." };
  }

  const args = normalizeToolArguments(body?.arguments);
  if (!args) {
    return {
      ok: false,
      error: "Os argumentos da ferramenta Kaggle devem ser um objeto."
    };
  }

  return {
    ok: true,
    action,
    name,
    arguments: args
  };
}

function parseJsonCandidate(value) {
  const text = String(value || "").replace(/^\uFEFF/, "").trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function parseMcpResponseText(rawText) {
  const direct = parseJsonCandidate(rawText);
  if (direct !== null) return direct;

  const blocks = String(rawText || "")
    .split(/\r?\n\r?\n+/)
    .map(block => block.trim())
    .filter(Boolean);

  const candidates = [];

  for (const block of blocks) {
    const dataLines = block
      .split(/\r?\n/)
      .filter(line => line.startsWith("data:"))
      .map(line => line.slice(5).trim());

    if (!dataLines.length) continue;

    const payload = parseJsonCandidate(dataLines.join("\n"));
    if (payload !== null) candidates.push(payload);
  }

  if (!candidates.length) {
    const lines = String(rawText || "").split(/\r?\n/);
    const dataLines = lines
      .filter(line => line.startsWith("data:"))
      .map(line => line.slice(5).trim());

    if (dataLines.length) {
      const payload = parseJsonCandidate(dataLines.join("\n"));
      if (payload !== null) return payload;
    }

    return null;
  }

  return (
    candidates.find(
      candidate =>
        candidate &&
        typeof candidate === "object" &&
        ("result" in candidate || "error" in candidate || "jsonrpc" in candidate)
    ) || candidates[candidates.length - 1]
  );
}

function extractToolList(payload) {
  const result = payload?.result ?? payload;

  if (Array.isArray(result?.tools)) return result.tools;

  const nested = result?.result;
  if (Array.isArray(nested?.tools)) return nested.tools;

  return [];
}

function updateToolCatalog(payload) {
  const tools = extractToolList(payload);
  if (!tools.length) return;

  const next = new Map();

  for (const tool of tools) {
    const name = String(tool?.name || "").trim();
    if (!name) continue;
    next.set(name, tool);
  }

  if (next.size) {
    toolCatalog = next;
    toolCatalogFetchedAt = Date.now();
  }
}

async function mcpRequest(method, params = {}) {
  const token = safeToken();

  if (!token) {
    return {
      ok: false,
      status: 503,
      error: "Kaggle não configurado no servidor."
    };
  }

  const id = ++requestId;

  let response;

  try {
    response = await fetch(KAGGLE_MCP_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params
      })
    });
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: "Não foi possível conectar ao servidor MCP da Kaggle.",
      detail: error instanceof Error ? error.message : String(error)
    };
  }

  const rawText = await response.text().catch(() => "");

  if (!response.ok) {
    return {
      ok: false,
      status: response.status === 401 || response.status === 403 ? 503 : 502,
      error:
        response.status === 401 || response.status === 403
          ? "Token da Kaggle inválido ou sem autorização."
          : "O servidor MCP da Kaggle está indisponível.",
      contentType: response.headers.get("content-type") || null
    };
  }

  const data = parseMcpResponseText(rawText);

  if (data === null) {
    return {
      ok: false,
      status: 502,
      error: "Resposta MCP da Kaggle não pôde ser interpretada.",
      contentType: response.headers.get("content-type") || null
    };
  }

  if (data?.error) {
    return {
      ok: false,
      status: 502,
      error: data.error.message || "A Kaggle retornou um erro MCP.",
      code: data.error.code ?? null
    };
  }

  return {
    ok: true,
    data,
    contentType: response.headers.get("content-type") || null
  };
}

async function refreshToolCatalog(force = false) {
  const fresh =
    toolCatalog.size > 0 &&
    Date.now() - toolCatalogFetchedAt < TOOL_CATALOG_TTL_MS;

  if (!force && fresh) {
    return { ok: true, tools: [...toolCatalog.values()] };
  }

  if (toolCatalogPromise) return toolCatalogPromise;

  toolCatalogPromise = (async () => {
    const result = await mcpRequest("tools/list", {});

    if (!result.ok) return result;

    updateToolCatalog(result.data);

    return {
      ok: true,
      tools: [...toolCatalog.values()],
      data: result.data
    };
  })();

  try {
    return await toolCatalogPromise;
  } finally {
    toolCatalogPromise = null;
  }
}

function resolveToolName(requestedName) {
  if (toolCatalog.has(requestedName)) return requestedName;

  const aliases = TOOL_ALIASES[requestedName] || [];
  return aliases.find(name => toolCatalog.has(name)) || null;
}

export function isToolAllowed(name) {
  if (!toolAllowedByPolicy(name)) return false;
  return Boolean(toolCatalog.get(name));
}

async function authorizeTool(requestedName) {
  const discovery = await refreshToolCatalog();

  if (!discovery.ok) return discovery;

  const resolvedName = resolveToolName(requestedName);

  if (!resolvedName) {
    return {
      ok: false,
      status: 400,
      error: `A ferramenta Kaggle "${requestedName}" não está disponível no catálogo atual.`
    };
  }

  if (!toolAllowedByPolicy(resolvedName)) {
    return {
      ok: false,
      status: 403,
      error:
        `A ferramenta Kaggle "${resolvedName}" requer habilitação explícita de ferramentas com efeitos colaterais. ` +
        `Defina ${WRITE_TOOLS_ENV}=true somente no servidor.`
    };
  }

  return {
    ok: true,
    requestedName,
    resolvedName,
    tool: toolCatalog.get(resolvedName)
  };
}

export async function kaggleHandler(request) {
  const configuredOrigin = String(
    process.env.CORS_ORIGIN || "https://thiagollipe-web.github.io"
  ).trim();

  const corsHeaders = {
    "Access-Control-Allow-Origin": configuredOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json(
      { ok: false, error: "Método não permitido. Use POST." },
      405,
      { ...corsHeaders, Allow: "POST, OPTIONS" }
    );
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== configuredOrigin) {
    return json(
      { ok: false, error: "Origem não autorizada." },
      403,
      corsHeaders
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "JSON inválido." }, 400, corsHeaders);
  }

  const action = normalizeAction(body);
  if (!action.ok) return json(action, 400, corsHeaders);

  if (action.action === "tools") {
    const result = await refreshToolCatalog(true);

    if (!result.ok) {
      return json(result, result.status || 502, corsHeaders);
    }

    return json(
      {
        ok: true,
        action: "tools",
        result: result.data?.result ?? result.data ?? { tools: result.tools },
        toolCount: result.tools.length,
        provider: "kaggle-mcp"
      },
      200,
      corsHeaders
    );
  }

  const authorization = await authorizeTool(action.name);

  if (!authorization.ok) {
    return json(
      {
        ok: false,
        error: authorization.error,
        provider: "kaggle-mcp"
      },
      authorization.status || 400,
      corsHeaders
    );
  }

  const result = await mcpRequest("tools/call", {
    name: authorization.resolvedName,
    arguments: action.arguments
  });

  if (!result.ok) {
    return json(result, result.status || 502, corsHeaders);
  }

  return json(
    {
      ok: true,
      action: "call",
      requestedTool: authorization.requestedName,
      tool: authorization.resolvedName,
      result: result.data?.result ?? result.data,
      provider: "kaggle-mcp"
    },
    200,
    corsHeaders
  );
}

export default kaggleHandler;
