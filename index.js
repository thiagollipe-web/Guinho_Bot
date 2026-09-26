// Carrega as variáveis definidas no arquivo .env.
import "dotenv/config";

// Importa o cliente oficial do Ollama para Node.js.
import { Ollama } from "ollama";

// Importa o gerador de QR Code para o terminal.
import qrcode from "qrcode-terminal";

// Importa o cliente do WhatsApp Web e a autenticação local.
import pkg from "whatsapp-web.js";

// Extrai as classes usadas pelo bot.
const { Client, LocalAuth } = pkg;

// Define o endereço local do serviço Ollama.
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

// Define o modelo que será usado pelo assistente.
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "codegemma:instruct";

// Define quantas mensagens anteriores serão preservadas por conversa.
const HISTORY_LIMIT = Math.max(2, Number.parseInt(process.env.HISTORY_LIMIT || "10", 10) || 10);

// Cria um cliente Ollama conectado ao servidor local.
const ollama = new Ollama({ host: OLLAMA_HOST });

// Guarda o histórico recente separado por chat do WhatsApp.
const histories = new Map();

// Define o comportamento do CodeGemma.
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

// Cria o cliente do WhatsApp.
const client = new Client({
  // Salva a sessão localmente para reutilizar a autenticação.
  authStrategy: new LocalAuth({
    clientId: "guinho-codegemma"
  }),

  // Configura o Chromium usado pelo whatsapp-web.js.
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ]
  }
});

// Obtém o histórico de uma conversa.
function getHistory(chatId) {
  return histories.has(chatId) ? [...histories.get(chatId)] : [];
}

// Adiciona uma mensagem ao histórico e limita seu tamanho.
function pushHistory(chatId, message) {
  const history = histories.get(chatId) || [];
  history.push(message);

  while (history.length > HISTORY_LIMIT) {
    history.shift();
  }

  histories.set(chatId, history);
}

// Consulta o CodeGemma com histórico e system prompt.
async function askCodeGemma(chatId, prompt) {
  const messages = [
    {
      role: "system",
      content: SYSTEM_PROMPT
    },
    ...getHistory(chatId),
    {
      role: "user",
      content: prompt
    }
  ];

  // stream:false faz a função aguardar a resposta completa.
  const response = await ollama.chat({
    model: OLLAMA_MODEL,
    messages,
    stream: false,
    options: {
      temperature: 0.2,
      num_predict: 768
    }
  });

  const answer = response?.message?.content?.trim();

  if (!answer) {
    throw new Error("O Ollama retornou uma resposta vazia.");
  }

  // Salva somente mensagens que chegaram a uma resposta válida.
  pushHistory(chatId, {
    role: "user",
    content: prompt
  });

  pushHistory(chatId, {
    role: "assistant",
    content: answer
  });

  return answer;
}

// Testa o Ollama na inicialização sem impedir o WhatsApp de iniciar.
async function checkOllama() {
  try {
    const result = await ollama.list();
    const models = Array.isArray(result?.models) ? result.models : [];
    const installed = models.some((model) => model?.name === OLLAMA_MODEL);

    console.log("Ollama:", OLLAMA_HOST);
    console.log("Modelo:", OLLAMA_MODEL);

    if (installed) {
      console.log("CodeGemma encontrado no Ollama.");
    } else {
      console.warn("Modelo não encontrado. Execute: ollama pull " + OLLAMA_MODEL);
    }
  } catch (error) {
    console.warn("Ollama não está acessível agora.");
    console.warn("O bot continuará iniciando e avisará o usuário quando !code for usado.");
    console.warn("Detalhe:", error?.message || error);
  }
}

// Exibe o QR Code no terminal quando uma nova autenticação for necessária.
client.on("qr", (qr) => {
  console.log("\nEscaneie este QR Code no WhatsApp:");
  qrcode.generate(qr, { small: true });
});

// Confirma a autenticação.
client.on("authenticated", () => {
  console.log("WhatsApp autenticado.");
});

// Confirma que o cliente está pronto.
client.on("ready", () => {
  console.log("Bot conectado!");
});

// Registra falhas de autenticação.
client.on("auth_failure", (error) => {
  console.error("Falha na autenticação do WhatsApp:", error);
});

// Registra desconexões.
client.on("disconnected", (reason) => {
  console.warn("WhatsApp desconectado:", reason);
});

const { createGuinho } = require("./src/guinho");
const { engine: localEngine } = createGuinho();

function localResponse(prompt) {
  return localEngine.respond(prompt);
}

function shouldUseLocalResponse(result) {
  return result?.source === "eliza" || result?.source === "memory";
}

// Recebe mensagens e filtra apenas o comando !code.
client.on("message", async (message) => {
  // Evita responder a mensagens enviadas pelo próprio cliente.
  if (message.fromMe) {
    return;
  }

  // Normaliza o texto recebido.
  const body = String(message.body || "").trim();

  // O bot só responde se a mensagem começar com "!code ".
  if (!body.toLowerCase().startsWith("!code ")) {
    return;
  }

  // Remove o comando e mantém somente a pergunta.
  const prompt = body.slice("!code ".length).trim();

  // Rejeita consultas vazias.
  if (!prompt) {
    await message.reply("Use assim: !code sua pergunta de programação");
    return;
  }

  // Usa o identificador do chat para manter histórico separado.
  const chatId = message.from;

  try {
    const local = localResponse(prompt);

    if (shouldUseLocalResponse(local)) {
      await message.reply(local.response);
      return;
    }

    await message.reply("Consultando o modelo local...");
    const answer = await askCodeGemma(chatId, prompt);
    await message.reply(answer);
  } catch (error) {
    // Mantém o erro detalhado no terminal para diagnóstico.
    console.error("Erro ao consultar o Ollama:", error);

    // Normaliza a mensagem para detectar erros conhecidos.
    const detail = String(error?.message || error).toLowerCase();

    // Mensagem padrão para Ollama parado ou indisponível.
    let friendlyMessage =
      "Não consegui consultar o CodeGemma local agora. Verifique se o Ollama está aberto e tente novamente.";

    // Mensagem específica quando o modelo não está instalado.
    if (detail.includes("not found") || (detail.includes("model") && detail.includes("pull"))) {
      friendlyMessage =
        "O modelo " + OLLAMA_MODEL + " não está instalado. Execute no terminal: ollama pull " + OLLAMA_MODEL;
    }

    // Envia o diagnóstico amigável ao WhatsApp.
    await message.reply(friendlyMessage);
  }
});

// Trata encerramento pelo terminal.
process.on("SIGINT", async () => {
  console.log("\nEncerrando o Guinho...");
  await client.destroy();
  process.exit(0);
});

// Trata encerramento pelo sistema operacional.
process.on("SIGTERM", async () => {
  console.log("\nEncerrando o Guinho...");
  await client.destroy();
  process.exit(0);
});

// Mostra a configuração principal.
console.log("========================================");
console.log("Guinho WhatsApp + CodeGemma + Ollama");
console.log("========================================");
console.log("Modelo:", OLLAMA_MODEL);
console.log("Ollama:", OLLAMA_HOST);
console.log("Comando: !code ");

// Verifica o serviço local.
await checkOllama();

// Inicializa o WhatsApp.
client.initialize();
