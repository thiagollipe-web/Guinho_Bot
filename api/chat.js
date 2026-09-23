const MAX_BODY_BYTES = 64 * 1024;
const MAX_MESSAGES = 12;
const MAX_CONTENT_CHARS = 12000;
const MAX_TOTAL_CONTENT_CHARS = 48000;
const DEFAULT_TIMEOUT_MS = 25000;
const DEFAULT_MAX_TOKENS = 1200;
const DEFAULT_MODEL = "gpt-5.6-luna";

function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

function corsHeaders(request) {
  const configured = String(process.env.CORS_ORIGIN || "https://thiagollipe-web.github.io").trim();
  const origin = request.headers.get("origin");
  const vercelOrigin = process.env.VERCEL_URL
    ? `https://${String(process.env.VERCEL_URL).trim()}`
    : "";
  const allowed = new Set([configured, vercelOrigin].filter(Boolean));

  if (origin && allowed.size && !allowed.has(origin)) return null;

  if (origin && allowed.has(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
  }

  return {};
}

function safeError(message, status, retryable = true, headers = {}) {
  return json({ ok: false, error: message, retryable }, status, headers);
}

function parseLimit(value, fallback, min, max) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, status: 400, error: "Envie pelo menos uma mensagem.", retryable: false };
  }

  if (messages.length > MAX_MESSAGES) {
    return { ok: false, status: 413, error: "Histórico de conversa excede o limite permitido.", retryable: false };
  }

  const normalized = [];
  let total = 0;

  for (const message of messages) {
    if (!message || typeof message !== "object") {
      return { ok: false, status: 400, error: "Formato de mensagem inválido.", retryable: false };
    }

    const role = message.role;
    if (role !== "user" && role !== "assistant") {
      return { ok: false, status: 400, error: "Cada mensagem deve usar role user ou assistant.", retryable: false };
    }

    if (typeof message.content !== "string") {
      return { ok: false, status: 400, error: "O conteúdo da mensagem deve ser texto.", retryable: false };
    }

    const content = message.content.trim();
    if (!content) {
      return { ok: false, status: 400, error: "O conteúdo da mensagem não pode estar vazio.", retryable: false };
    }

    if (content.length > MAX_CONTENT_CHARS) {
      return { ok: false, status: 413, error: "Uma mensagem excede o tamanho permitido.", retryable: false };
    }

    total += content.length;
    if (total > MAX_TOTAL_CONTENT_CHARS) {
      return { ok: false, status: 413, error: "O histórico enviado é grande demais.", retryable: false };
    }

    normalized.push({ role, content });
  }

  return { ok: true, messages: normalized };
}

export function extractResponseText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const parts = [];
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === "string" && content.text.trim()) {
        parts.push(content.text.trim());
      }
    }
  }

  return parts.join("\n").trim();
}

export function createTimeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

export async function chatHandler(request) {
  const headers = corsHeaders(request);
  if (headers === null) {
    return safeError("Origem não autorizada.", 403, false);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        "Access-Control-Max-Age": "600"
      }
    });
  }

  if (request.method !== "POST") {
    return safeError("Método não permitido. Use POST.", 405, false, {
      Allow: "POST, OPTIONS",
      ...headers
    });
  }

  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return safeError("Serviço de IA não configurado.", 503, true, headers);
  }

  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    return safeError("Content-Type deve ser application/json.", 415, false, headers);
  }

  const declaredLength = Number.parseInt(request.headers.get("content-length") || "", 10);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return safeError("Payload excede o limite permitido.", 413, false, headers);
  }

  let raw;
  try {
    raw = await request.text();
  } catch {
    return safeError("Não foi possível ler a requisição.", 400, false, headers);
  }

  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return safeError("Payload excede o limite permitido.", 413, false, headers);
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return safeError("JSON inválido.", 400, false, headers);
  }

  const validation = validateMessages(body?.messages);
  if (!validation.ok) {
    return safeError(validation.error, validation.status, validation.retryable, headers);
  }

  const model = String(process.env.OPENAI_MODEL || DEFAULT_MODEL).trim();

  const timeoutMs = parseLimit(process.env.AI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 1000, 30000);
  const maxTokens = parseLimit(process.env.AI_MAX_TOKENS, DEFAULT_MAX_TOKENS, 64, 4000);
  const timeout = createTimeoutSignal(timeoutMs);

  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        instructions: "Você é o Guinho, um companheiro de programação em português do Brasil, inspirado no estilo conversacional da ELIZA: converse naturalmente, faça perguntas quando faltarem informações, mantenha o contexto do projeto e ajude o usuário a transformar ideias em software. Seu foco é programação. Reconheça linguagens, frameworks e ferramentas. Pode criar, explicar, analisar, corrigir, refatorar, testar, otimizar e sugerir melhorias. Não imponha decisões: apresente opções e deixe a escolha ao usuário. Quando a tarefa estiver ambígua, pergunte primeiro. Ao gerar código, entregue código utilizável e explique somente o necessário. Preserve blocos de código em Markdown quando forem úteis. Não invente que executou código, acessou arquivos, consultou a internet ou serviços que não foram fornecidos. Se não puder verificar algo, diga isso claramente. Quando o pedido não for relacionado a programação ou desenvolvimento de software, redirecione brevemente a conversa para esse domínio em vez de responder ao assunto externo. Seja preciso, colaborativo e incremental.",
        input: validation.messages,
        max_output_tokens: maxTokens
      }),
      signal: timeout.signal
    });

    const providerData = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return safeError("O serviço de IA atingiu um limite temporário ou de uso.", 503, true, headers);
      }
      if (upstream.status === 401 || upstream.status === 403) {
        return safeError("O serviço de IA não está autorizado ou configurado.", 503, false, headers);
      }
      return safeError("O serviço de IA está indisponível no momento.", 502, true, headers);
    }

    const content = extractResponseText(providerData);
    if (!content) {
      return safeError("O serviço de IA não retornou conteúdo.", 502, true, headers);
    }

    return json({
      ok: true,
      content,
      provider: "openai",
      model
    }, 200, headers);
  } catch (error) {
    if (error?.name === "AbortError") {
      return safeError("A consulta à IA excedeu o tempo limite.", 504, true, headers);
    }
    return safeError("Não foi possível consultar o serviço de IA.", 502, true, headers);
  } finally {
    timeout.clear();
  }
}

export default chatHandler;
