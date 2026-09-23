import test from "node:test";
import assert from "node:assert/strict";
import handler, { extractResponseText, validateMessages, validateWorkspace, validateWorkspacePatch } from "../api/chat.js";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

function restoreEnv() {
  for (const key of ["OPENAI_API_KEY", "OPENAI_MODEL", "AI_TIMEOUT_MS", "AI_MAX_TOKENS", "CORS_ORIGIN"]) {
    if (key in originalEnv) process.env[key] = originalEnv[key];
    else delete process.env[key];
  }
}

function configure() {
  process.env.OPENAI_API_KEY = "test-secret";
  process.env.OPENAI_MODEL = "test-model";
  process.env.AI_TIMEOUT_MS = "1000";
  process.env.AI_MAX_TOKENS = "200";
  process.env.CORS_ORIGIN = "https://thiagollipe-web.github.io";
}

function request(body, options = {}) {
  const method = options.method || "POST";
  const init = {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: "https://thiagollipe-web.github.io",
      ...(options.headers || {})
    }
  };
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    init.body = options.body === undefined ? JSON.stringify(body) : options.body;
  }
  return new Request("https://guinho-test.vercel.app/api/chat", init);
}

test.beforeEach(() => {
  restoreEnv();
  configure();
});

test.after(() => {
  restoreEnv();
  globalThis.fetch = originalFetch;
});

test("requisição sem mensagens retorna 400", async () => {
  const response = await handler(request({}));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).ok, false);
});

test("requisição sem OPENAI_API_KEY retorna 503", async () => {
  delete process.env.OPENAI_API_KEY;
  const response = await handler(request({ messages: [{ role: "user", content: "Olá" }] }));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).ok, false);
});

test("chamada bem-sucedida à OpenAI retorna resposta padronizada", async () => {
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return new Response(JSON.stringify({
      output_text: "Olá! Como posso ajudar?"
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const response = await handler(request({
    messages: [
      { role: "user", content: "Olá" },
      { role: "assistant", content: "Olá!" }
    ]
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    content: "Olá! Como posso ajudar?",
    provider: "openai",
    model: "test-model"
  });
  assert.equal(captured.url, "https://api.openai.com/v1/responses");
  assert.match(captured.options.headers.Authorization, /^Bearer test-secret$/);
});

test("resposta vazia do provedor retorna 502", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ output_text: "   " }), { status: 200 });
  const response = await handler(request({ messages: [{ role: "user", content: "Olá" }] }));
  assert.equal(response.status, 502);
  assert.equal((await response.json()).ok, false);
});

test("timeout retorna 504", async () => {
  globalThis.fetch = (_url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      reject(error);
    });
  });

  const response = await handler(request({ messages: [{ role: "user", content: "Olá" }] }));
  assert.equal(response.status, 504);
  assert.equal((await response.json()).retryable, true);
});

test("erro HTTP do provedor não expõe detalhes internos", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: { message: "secret provider detail", type: "billing_error" }
  }), { status: 500 });

  const response = await handler(request({ messages: [{ role: "user", content: "Olá" }] }));
  const data = await response.json();
  assert.equal(response.status, 502);
  assert.equal(data.ok, false);
  assert.equal(data.error.includes("secret provider detail"), false);
  assert.equal(JSON.stringify(data).includes("billing_error"), false);
});

test("payload acima do limite é rejeitado", async () => {
  const huge = "x".repeat(70000);
  const response = await handler(request({ messages: [{ role: "user", content: huge }] }));
  assert.equal(response.status, 413);
});

test("método HTTP inválido retorna 405", async () => {
  const response = await handler(request({}, { method: "GET" }));
  assert.equal(response.status, 405);
});

test("origem diferente é rejeitada", async () => {
  const response = await handler(request(
    { messages: [{ role: "user", content: "Olá" }] },
    { headers: { Origin: "https://evil.example" } }
  ));
  assert.equal(response.status, 403);
});

test("origem do próprio deployment Vercel é aceita", async () => {
  process.env.VERCEL_URL = "guinho-bot.vercel.app";
  const response = await handler(request(
    { messages: [{ role: "user", content: "Olá" }] },
    { headers: { Origin: "https://guinho-bot.vercel.app" } }
  ));
  assert.notEqual(response.status, 403);
  delete process.env.VERCEL_URL;
});

test("validação aceita apenas user e assistant", () => {
  assert.equal(validateMessages([{ role: "system", content: "x" }]).ok, false);
  assert.equal(validateMessages([{ role: "user", content: "x" }]).ok, true);
});

test("extrator suporta output_text e estrutura output", () => {
  assert.equal(extractResponseText({ output_text: "A" }), "A");
  assert.equal(extractResponseText({
    output: [{ content: [{ type: "output_text", text: "B" }] }]
  }), "B");
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("segredo não aparece no bundle público", () => {
  const arquivos = ["index.html", "app.js", "ai-config.js", "styles.css"].map(nome => readFileSync(resolve(process.cwd(), nome), "utf8")).join("\n");
  assert.equal(arquivos.includes("OPENAI_API_KEY"), false);
});

test("modo engineering retorna patch estruturado e valida operações", async () => {
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return new Response(JSON.stringify({
      output_text: JSON.stringify({
        summary: "Adicionado contador",
        next_task: "Validar interação no navegador",
        files: [
          { path: "app.js", action: "update", content: "const contador = 1;" }
        ]
      })
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const response = await handler(request({
    mode: "engineering",
    messages: [{ role: "user", content: "adicione um contador" }],
    workspace: {
      name: "Teste",
      files: { "app.js": "const contador = 0;" }
    }
  }));

  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.mode, "engineering");
  assert.equal(data.patch.files[0].action, "update");
  assert.equal(data.patch.files[0].path, "app.js");
  assert.match(captured.options.body, /json_schema/);
});

test("workspace e patch rejeitam caminhos e arquivos protegidos", () => {
  assert.equal(validateWorkspace({ files: { "../segredo.js": "x" } }).ok, false);
  assert.equal(validateWorkspace({ files: { ".env": "x" } }).ok, false);
  assert.equal(validateWorkspace({ files: { "node_modules/x.js": "x" } }).ok, false);
  assert.equal(validateWorkspace({ files: { "src/main.js": "console.log(1);" } }).ok, true);

  const patch = validateWorkspacePatch({
    summary: "x",
    next_task: "y",
    files: [{ path: "novo.js", action: "create", content: "x" }]
  }, { files: {} });
  assert.equal(patch.ok, true);

  const invalido = validateWorkspacePatch({
    summary: "x",
    next_task: "y",
    files: [{ path: "app.js", action: "update", content: "x" }]
  }, { files: {} });
  assert.equal(invalido.ok, false);
});

test("modo engineering rejeita patch que quebra dependência local", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    output_text: JSON.stringify({
      summary: "Remove player",
      next_task: "n/a",
      files: [{ path: "player.js", action: "delete", content: "" }]
    })
  }), { status: 200, headers: { "Content-Type": "application/json" } });

  const response = await handler(request({
    mode: "engineering",
    messages: [{ role: "user", content: "remova player" }],
    workspace: {
      name: "Teste",
      files: {
        "app.js": 'import "./player.js";',
        "player.js": "export const player={};"
      }
    }
  }));
  const data = await response.json();
  assert.equal(response.status, 422);
  assert.equal(data.ok, false);
});
