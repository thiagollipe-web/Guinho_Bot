const chat = document.querySelector("#chat");
const form = document.querySelector("#chatForm");
const input = document.querySelector("#message");
const status = document.querySelector("#status");
const wikiForm = document.querySelector("#wikiForm");
const wikiQuery = document.querySelector("#wikiQuery");
const wikiResults = document.querySelector("#wikiResults");

let token = localStorage.getItem("guinho_token");
const messages = [];

function addMessage(role, content) {
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.textContent = content;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}

async function ensureToken() {
  if (token) return token;
  const r = await fetch("/api/auth/guest", { method: "POST" });
  if (!r.ok) throw new Error("Falha na autenticação.");
  token = (await r.json()).token;
  localStorage.setItem("guinho_token", token);
  return token;
}

async function health() {
  try {
    const r = await fetch("/api/health");
    const data = await r.json();
    status.textContent = data.aiConfigured ? "Online" : "Online · IA não configurada";
  } catch {
    status.textContent = "Offline";
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const content = input.value.trim();
  if (!content) return;

  addMessage("user", content);
  messages.push({ role: "user", content });
  input.value = "";

  try {
    const bearer = await ensureToken();
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${bearer}` },
      body: JSON.stringify({ messages })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Erro no chat.");

    addMessage("assistant", data.message.content);
    messages.push(data.message);
  } catch (error) {
    addMessage("assistant", `Erro: ${error.message}`);
  }
});

wikiForm.addEventListener("submit", async event => {
  event.preventDefault();
  const q = wikiQuery.value.trim();
  if (!q) return;
  wikiResults.innerHTML = "Pesquisando...";
  try {
    const r = await fetch(`/api/wiki/search?q=${encodeURIComponent(q)}`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Erro na busca.");
    wikiResults.innerHTML = data.length
      ? data.map(x => `<article class="wiki-card"><strong>${escapeHtml(x.title)}</strong><p>${escapeHtml(x.snippet)}</p></article>`).join("")
      : "Nenhum resultado.";
  } catch (error) {
    wikiResults.textContent = `Erro: ${error.message}`;
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" })[c]);
}

addMessage("assistant", "Olá! Eu sou o Guinho. Pergunte alguma coisa.");
health();
