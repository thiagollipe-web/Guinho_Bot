import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";

const app = express();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || "development-secret";
const aiBaseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const aiModel = process.env.OPENROUTER_MODEL || "openrouter/free";
const wikiApiUrl = process.env.WIKI_API_URL || "https://en.wikipedia.org/w/api.php";

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

function authToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: "7d" });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "Guinho Bot", aiConfigured: Boolean(process.env.OPENROUTER_API_KEY) });
});

app.post("/api/auth/guest", (_req, res) => {
  res.json({ token: authToken({ role: "guest" }) });
});

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Token ausente." });
  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

app.get("/api/wiki/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Informe um termo de busca." });

  const url = new URL(wikiApiUrl);
  url.search = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: q,
    srlimit: "5",
    format: "json",
    origin: "*"
  }).toString();

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Wikipedia HTTP ${response.status}`);
    const data = await response.json();
    res.json((data.query?.search || []).map(item => ({
      title: item.title,
      snippet: item.snippet.replace(/<[^>]*>/g, ""),
      pageid: item.pageid
    })));
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.post("/api/chat", requireAuth, async (req, res) => {
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(503).json({ error: "OPENROUTER_API_KEY não configurada no servidor." });
  }

  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const cleanMessages = messages
    .filter(m => m && (m.role === "user" || m.role === "assistant" || m.role === "system"))
    .slice(-20)
    .map(m => ({ role: m.role, content: String(m.content || "").slice(0, 12000) }));

  if (!cleanMessages.length || cleanMessages.at(-1).role !== "user") {
    return res.status(400).json({ error: "Envie uma mensagem do usuário." });
  }

  try {
    const response = await fetch(`${aiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Guinho Bot"
      },
      body: JSON.stringify({
        model: aiModel,
        messages: cleanMessages,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || "Falha no provedor de IA." });
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: "O provedor não retornou conteúdo." });

    res.json({ message: { role: "assistant", content }, model: data.model || aiModel });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Guinho Bot rodando na porta ${port}`);
});
