import "dotenv/config";
import { Ollama } from "ollama";
import qrcode from "qrcode-terminal";
import pkg from "whatsapp-web.js";
import { createGuinho } from "./src/guinho.js";

const { Client, LocalAuth } = pkg;
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "codegemma:instruct";
const HISTORY_LIMIT = Math.max(2, Number.parseInt(process.env.HISTORY_LIMIT || "10", 10) || 10);
const ollama = new Ollama({ host: OLLAMA_HOST });
const histories = new Map();
const guinhoByChat = new Map();

const SYSTEM_PROMPT = [
  "Você é o Guinho, um Programador Sênior Pragmático.",
  "Ajude o usuário com programação, desenvolvimento web, scripts e depuração.",
  "Responda em português do Brasil.",
  "Seja direto, limpo, estruturado e tecnicamente preciso.",
  "Priorize soluções práticas e código pronto para copiar."
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

async function askCodeGemma(chatId, prompt) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...getHistory(chatId),
    { role: "user", content: prompt }
  ];

  const response = await ollama.chat({
    model: OLLAMA_MODEL,
    messages,
    stream: false,
    options: { temperature: 0.2, num_predict: 768 }
  });

  const answer = response?.message?.content?.trim();
  if (!answer) throw new Error("O Ollama retornou uma resposta vazia.");

  pushHistory(chatId, { role: "user", content: prompt });
  pushHistory(chatId, { role: "assistant", content: answer });
  return answer;
}

async function checkOllama() {
  try {
    const result = await ollama.list();
    const models = Array.isArray(result?.models) ? result.models : [];
    const installed = models.some((model) => model?.name === OLLAMA_MODEL);

    console.log("Ollama:", OLLAMA_HOST);
    console.log("Modelo:", OLLAMA_MODEL);
    console.log(installed
      ? "Modelo encontrado no Ollama."
      : "Modelo não encontrado. Execute: ollama pull " + OLLAMA_MODEL);
  } catch (error) {
    console.warn("Ollama não está acessível agora:", error?.message || error);
  }
}

client.on("qr", (qr) => {
  console.log("\nEscaneie este QR Code no WhatsApp:");
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => console.log("WhatsApp autenticado."));
client.on("ready", () => console.log("Bot conectado!"));
client.on("auth_failure", (error) => console.error("Falha na autenticação:", error));
client.on("disconnected", (reason) => console.warn("WhatsApp desconectado:", reason));

function engineForChat(chatId) {
  if (!guinhoByChat.has(chatId)) guinhoByChat.set(chatId, createGuinho().engine);
  return guinhoByChat.get(chatId);
}

client.on("message", async (message) => {
  if (message.fromMe) return;

  const body = String(message.body || "").trim();
  if (!body.toLowerCase().startsWith("!code ")) return;

  const prompt = body.slice("!code ".length).trim();
  if (!prompt) {
    await message.reply("Use assim: !code sua pergunta");
    return;
  }

  const chatId = message.from;
  const engine = engineForChat(chatId);

  try {
    const local = engine.respond(prompt);

    if (local.source !== "fallback") {
      await message.reply(local.response);
      return;
    }

    await message.reply("Consultando o modelo local...");
    await message.reply(await askCodeGemma(chatId, prompt));
  } catch (error) {
    console.error("Erro:", error);
    await message.reply(
      "Não consegui consultar o CodeGemma local agora. Verifique o Ollama e tente novamente."
    );
  }
});

process.on("SIGINT", async () => {
  await client.destroy();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await client.destroy();
  process.exit(0);
});

console.log("Guinho WhatsApp + motor simbólico + Ollama");
console.log("Comando: !code sua pergunta");
await checkOllama();
client.initialize();
