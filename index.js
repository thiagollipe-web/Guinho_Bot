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

const SYSTEM_PROMPT = "Você é o Guinho, um Programador Sênior Pragmático. Responda em português do Brasil. Ajude com programação, desenvolvimento web e depuração. Seja direto e tecnicamente preciso. Priorize código pronto para copiar. Use blocos de código. Nunca invente APIs, bibliotecas, funções ou resultados.";

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "guinho-codegemma" }),
  puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] }
});

function history(id) { return histories.has(id) ? [...histories.get(id)] : []; }
function save(id, messages) {
  const h = histories.get(id) || [];
  h.push(...messages);
  while (h.length > HISTORY_LIMIT) h.shift();
  histories.set(id, h);
}
function messages(id, prompt) {
  return [{ role: "system", content: SYSTEM_PROMPT }, ...history(id), { role: "user", content: prompt }];
}

async function askGroq(id, prompt) {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY não configurada.");
  const r = await fetch(GROQ_BASE_URL + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + GROQ_API_KEY },
    body: JSON.stringify({ model: GROQ_MODEL, messages: messages(id, prompt), temperature: 0.2, max_completion_tokens: 2048 })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("Groq: " + (data?.error?.message || "HTTP " + r.status));
  const answer = data?.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("Groq retornou resposta vazia.");
  save(id, [{ role: "user", content: prompt }, { role: "assistant", content: answer }]);
  return answer;
}

async function askOllama(id, prompt) {
  const r = await ollama.chat({ model: OLLAMA_MODEL, messages: messages(id, prompt), stream: false, options: { temperature: 0.2, num_predict: 768 } });
  const answer = r?.message?.content?.trim();
  if (!answer) throw new Error("Ollama retornou resposta vazia.");
  save(id, [{ role: "user", content: prompt }, { role: "assistant", content: answer }]);
  return answer;
}

async function askAI(id, prompt, provider = DEFAULT_PROVIDER) {
  if (provider === "groq") return { provider: "Groq", answer: await askGroq(id, prompt) };
  if (provider === "ollama" || provider === "local") return { provider: "Ollama", answer: await askOllama(id, prompt) };
  try { return { provider: "Groq", answer: await askGroq(id, prompt) }; }
  catch (e) {
    console.warn("Groq indisponível; fallback para Ollama:", e.message);
    return { provider: "Ollama", answer: await askOllama(id, prompt) };
  }
}

async function checkAI() {
  console.log("Guinho WhatsApp + Router Groq/Ollama");
  console.log("Provider:", DEFAULT_PROVIDER);
  console.log("Groq:", GROQ_API_KEY ? GROQ_MODEL : "sem chave");
  try {
    const r = await ollama.list();
    console.log("Ollama:", (r.models || []).map(m => m.name).join(", ") || "nenhum modelo");
  } catch (e) { console.warn("Ollama indisponível:", e.message); }
}

client.on("qr", qr => { console.log("Escaneie o QR Code:"); qrcode.generate(qr, { small: true }); });
client.on("authenticated", () => console.log("WhatsApp autenticado."));
client.on("ready", () => console.log("Bot conectado!"));
client.on("auth_failure", e => console.error("Falha WhatsApp:", e));
client.on("disconnected", r => console.warn("WhatsApp desconectado:", r));

client.on("message", async message => {
  if (message.fromMe) return;
  const body = String(message.body || "").trim();
  if (!body.toLowerCase().startsWith("!code")) return;

  const parts = body.split(/\s+/);
  let provider = DEFAULT_PROVIDER;
  let start = 1;
  const route = (parts[1] || "").toLowerCase();
  if (["groq", "!groq"].includes(route)) { provider = "groq"; start = 2; }
  else if (["local", "!local", "ollama"].includes(route)) { provider = "ollama"; start = 2; }
  else if (["auto", "!auto"].includes(route)) { provider = "auto"; start = 2; }

  const prompt = parts.slice(start).join(" ").trim();
  if (!prompt) return message.reply("Use: !code sua pergunta\nRotas: !code groq ... | !code local ... | !code auto ...");

  try {
    await message.reply(provider === "groq" ? "Consultando o Groq..." : provider === "ollama" ? "Consultando a IA local..." : "Consultando o Guinho...");
    const result = await askAI(message.from, prompt, provider);
    await message.reply("[" + result.provider + "]\n\n" + result.answer);
  } catch (e) {
    console.error("Erro IA:", e);
    await message.reply("Não consegui obter uma resposta. Configure GROQ_API_KEY ou deixe o Ollama ativo.\n\n" + e.message);
  }
});

async function shutdown() { await client.destroy(); process.exit(0); }
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
await checkAI();
client.initialize();
