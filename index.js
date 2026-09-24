import "dotenv/config";
import { Ollama } from "ollama";
import qrcode from "qrcode-terminal";
import pkg from "whatsapp-web.js";

const { Client, LocalAuth } = pkg;

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "codegemma:instruct";
const HISTORY_LIMIT = Math.max(2, Number.parseInt(process.env.HISTORY_LIMIT || "10", 10) || 10);
const DEFAULT_PROVIDER = (process.env.AI_PROVIDER || "auto").toLowerCase();

const ollama = new Ollama({ host: OLLAMA_HOST });
const histories = new Map();

const SYSTEM_PROMPT = [
  "Você é o Guinho, um Programador Sênior Pragmático.",
  "Ajude o usuário com programação, desenvolvimento web, scripts e depuração.",
  "Responda em português do Brasil, salvo pedido explícito por outro idioma.",
  "Seja direto, limpo, estruturado e tecnicamente preciso.",
  "Priorize soluções práticas e código pronto para copiar.",
  "Use blocos de código com três crases e identifique a linguagem quando possível.",
  "Formate tudo para leitura rápida no WhatsApp.",
  "Evite tabelas complexas, introduções longas e explicações desnecessárias.",
  "Quando receber código com erro, explique a causa e mostre a correção.",
  "Nunca invente APIs, bibliotecas, funções ou resultados de execução."
].join("\n");

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "guinho-codegemma" }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  }
});

function getHistory(chatId) {
  return histories.has(chatId) ? [...histories.get(chatId)] : [];
}

function pushHistory(chatId, message) {
  const history = histories.get(chatId) || [];
  history.push(message);
  while (history.length > HISTORY_LIMIT) history.shift();
  histories.set(chatId, history);
}

function buildMessages(chatId, prompt) {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...getHistory(chatId),
    { role: "user", content: prompt }
  ];
}

function saveConversation(chatId, prompt, answer) {
  pushHistory(chatId, { role: "user", content: prompt });
  pushHistory(chatId, { role: "assistant", content: answer });
}

async function askGroq(chatId, prompt) {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY não configurada.");

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: buildMessages(chatId, prompt),
      temperature: 0.2,
      max_completion_tokens: 2048,
      stream: false
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Groq: ${detail}`);
  }

  const answer = data?.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("Groq retornou uma resposta vazia.");

  saveConversation(chatId, prompt, answer);
  return answer;
}

async function askOllama(chatId, prompt) {
  const response = await ollama.chat({
    model: OLLAMA_MODEL,
    messages: buildMessages(chatId, prompt),
    stream: false,
    options: { temperature: 0.2, num_predict: 768 }
  });

  const answer = response?.message?.content?.trim();
  if (!answer) throw new Error("Ollama retornou uma resposta vazia.");

  saveConversation(chatId, prompt, answer);
  return answer;
}

async function askAI(chatId, prompt, provider = DEFAULT_PROVIDER) {
  const selected = provider === "local" ? "ollama" : provider;

  if (selected === "groq") {
    return { provider: "Groq", answer: await askGroq(chatId, prompt) };
  }

  if (selected === "ollama") {
    return { provider: "Ollama", answer: await askOllama(chatId, prompt) };
  }

  try {
    return { provider: "Groq", answer: await askGroq(chatId, prompt) };
  } catch (groqError) {
    console.warn("Groq indisponível; tentando Ollama:", groqError?.message || groqError);
    try {
      return { provider: "Ollama", answer: await askOllama(chatId, prompt) };
    } catch (ollamaError) {
      const combined = `Groq: ${groqError?.message || groqError}; Ollama: ${ollamaError?.message || ollamaError}`;
      throw new Error(combined);
    }
  }
}

async function checkAI() {
  console.log("========================================");
  console.log("Guinho WhatsApp + Router Groq/Ollama");
  console.log("========================================");
  console.log("Provider padrão:", DEFAULT_PROVIDER);
  console.log("Groq:", GROQ_API_KEY ? `configurado (${GROQ_MODEL})` : "sem chave");
  console.log("Ollama:", `${OLLAMA_HOST} / ${OLLAMA_MODEL}`);

  try {
    const result = await ollama.list();
    const models = Array.isArray(result?.models) ? result.models : [];
    console.log("Modelos Ollama:", models.map((m) => m?.name).filter(Boolean).join(", ") || "nenhum");
  } catch (error) {
    console.warn("Ollama não está acessível:", error?.message || error);
  }
}

client.on("qr", (qr) => {
  console.log("\nEscaneie este QR Code no WhatsApp:");
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => console.log("WhatsApp autenticado."));
client.on("ready", () => console.log("Bot conectado!"));
client.on("auth_failure", (error) => console.error("Falha na autenticação do WhatsApp:", error));
client.on("disconnected", (reason) => console.warn("WhatsApp desconectado:", reason));

client.on("message", async (message) => {
  if (message.fromMe) return;

  const body = String(message.body || "").trim();
  if (!body.toLowerCase().startsWith("!code")) return;

  const parts = body.split(/\s+/);
  const command = parts[0].toLowerCase();
  const firstArg = parts[1]?.toLowerCase();

  let provider = DEFAULT_PROVIDER;
  let promptStart = 1;

  if (firstArg === "!groq" || firstArg === "groq") {
    provider = "groq";
    promptStart = 2;
  } else if (firstArg === "!local" || firstArg === "local" || firstArg === "ollama") {
    provider = "ollama";
    promptStart = 2;
  } else if (firstArg === "!auto" || firstArg === "auto") {
    provider = "auto";
    promptStart = 2;
  }

  const prompt = parts.slice(promptStart).join(" ").trim();

  if (!prompt) {
    await message.reply("Use: !code sua pergunta\n\nRotas: !code groq sua pergunta | !code local sua pergunta | !code auto sua pergunta");
    return;
  }

  const chatId = message.from;

  try {
    await message.reply(provider === "groq" ? "Consultando o Groq..." : provider === "ollama" ? "Consultando a IA local..." : "Consultando o Guinho...");

    const result = await askAI(chatId, prompt, provider);
    await message.reply(`[${result.provider}]\n\n${result.answer}`);
  } catch (error) {
    console.error("Erro no roteador de IA:", error);
    await message.reply(
      "Não consegui obter uma resposta.\n\n" +
      "Verifique GROQ_API_KEY para Groq ou se o Ollama está ativo e possui o modelo local.\n\n" +
      `Detalhe: ${error?.message || error}`
    );
  }
});

async function shutdown() {
  console.log("\nEncerrando o Guinho...");
  await client.destroy();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await checkAI();
client.initialize();
