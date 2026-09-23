import "dotenv/config";
import qrcode from "qrcode-terminal";
import pkg from "whatsapp-web.js";
import OpenAI from "openai";

const { Client, LocalAuth } = pkg;

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

if (!process.env.OPENAI_API_KEY) {
  console.error("ERRO: defina OPENAI_API_KEY no arquivo .env antes de iniciar o bot.");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "guinho-programador",
  }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  },
});

const SYSTEM_PROMPT = `
Você é um Programador Sênior Pragmático focado em programação.

Responda de forma curta, objetiva e tecnicamente correta.
Priorize soluções práticas e código que possa ser copiado e executado.
Quando enviar código, use blocos de código compatíveis com WhatsApp.
Evite markdown excessivo, tabelas complexas e respostas longas.
Explique apenas o necessário para o usuário entender a solução.
Se houver mais de uma solução, apresente primeiro a mais simples e confiável.
Nunca invente APIs, bibliotecas ou resultados de execução.
`;

client.on("qr", (qr) => {
  console.log("\nEscaneie o QR Code abaixo com o WhatsApp:\n");
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => {
  console.log("WhatsApp autenticado.");
});

client.on("ready", () => {
  console.log("Bot conectado com sucesso!");
});

client.on("auth_failure", (message) => {
  console.error("Falha na autenticação do WhatsApp:", message);
});

client.on("disconnected", (reason) => {
  console.warn("WhatsApp desconectado:", reason);
});

client.on("message", async (message) => {
  try {
    const body = String(message.body || "").trim();

    if (!body.toLowerCase().startsWith("!code ")) {
      return;
    }

    const prompt = body.slice(6).trim();

    if (!prompt) {
      await message.reply("Use: !code sua pergunta de programação");
      return;
    }

    await message.reply("Analisando seu código...");

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const answer = completion.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      await message.reply("A IA não retornou uma resposta válida. Tente novamente.");
      return;
    }

    await message.reply(answer);
  } catch (error) {
    console.error("Erro ao processar mensagem:", error);

    try {
      await message.reply(
        "Não consegui consultar a IA agora. Verifique a chave da OpenAI e tente novamente em alguns instantes."
      );
    } catch (replyError) {
      console.error("Também não foi possível enviar a mensagem de erro:", replyError);
    }
  }
});

process.on("SIGINT", async () => {
  console.log("\nEncerrando o bot...");
  await client.destroy();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nEncerrando o bot...");
  await client.destroy();
  process.exit(0);
});

console.log("Iniciando Guinho Programador...");
client.initialize();
