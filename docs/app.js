import { Memory } from "./core/memory.js";
import { loadKnowledge } from "./core/knowledge.js";
import { route } from "./core/router.js";

const chat = document.querySelector("#chat");
const form = document.querySelector("#composer");
const input = document.querySelector("#input");
const menuButton = document.querySelector("#menuButton");
const menu = document.querySelector("#menu");
const memoryPanel = document.querySelector("#memoryPanel");
const memoryList = document.querySelector("#memoryList");
const status = document.querySelector("#status");

const memory = new Memory();
let knowledge = null;
let rules = null;
const references = [];
let ready = false;

function addMessage(role, text, persist = true) {
  const element = document.createElement("div");
  element.className = "message " + role;
  element.textContent = String(text ?? "");
  chat.appendChild(element);
  chat.scrollTop = chat.scrollHeight;

  if (persist) memory.addHistory(role, text);
}

function showStatus(text, online = true) {
  if (!status) return;
  status.textContent = text;
  status.dataset.online = String(online);
}

function renderMemory() {
  memoryList.replaceChildren();

  const facts = memory.recall();
  const learned = memory.learnedRules();

  if (!facts.length && !learned.length) {
    const empty = document.createElement("div");
    empty.className = "memory-empty";
    empty.textContent = "Nenhuma informação foi guardada ainda.";
    memoryList.appendChild(empty);
    return;
  }

  for (const fact of facts) {
    const item = document.createElement("div");
    item.className = "memory-item";
    item.textContent = fact
      .replace(/^nome:/, "Nome: ")
      .replace(/^preferencia:/, "Preferência: ")
      .replace(/^projeto:/, "Projeto: ");
    memoryList.appendChild(item);
  }

  for (const rule of learned) {
    const item = document.createElement("div");
    item.className = "memory-item learned";
    item.textContent = "Regra: " + rule.pattern + " → " + rule.responses[0];
    memoryList.appendChild(item);
  }
}

function restoreHistory() {
  chat.replaceChildren();
  const history = memory.data.history;

  if (!history.length) {
    addMessage("bot", "Olá. Sou o Guinho. Como posso ajudar?", false);
    return;
  }

  for (const item of history) {
    addMessage(item.role, item.text, false);
  }
}

function exportMemory() {
  const blob = new Blob(
    [JSON.stringify(memory.snapshot(), null, 2)],
    { type: "application/json" }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "guinho-memoria.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importMemory(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      memory.import(JSON.parse(reader.result));
      restoreHistory();
      renderMemory();
    } catch (error) {
      alert(error.message || "Não foi possível importar a memória.");
    }
  };

  reader.onerror = () => alert("Não foi possível ler o arquivo.");
  reader.readAsText(file);
}

function localResponse(text) {
  if (!knowledge) {
    return {
      response: "Ainda estou carregando meu conhecimento. Tente novamente em alguns segundos.",
      source: "system"
    };
  }

  const result = route(text, {
    knowledge,
    memory,
    rules,
    references
  });

  if (result.reference?.url) {
    references.push(result.reference);
  }

  return result;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) return;

  addMessage("user", text);

  const result = localResponse(text);
  addMessage("bot", result.response);

  input.value = "";
  input.style.height = "";
  input.focus();
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 140) + "px";
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

menuButton.addEventListener("click", () => {
  const open = menu.hidden;
  menu.hidden = !open;
  menuButton.setAttribute("aria-expanded", String(open));
});

document.querySelector("#memoryButton").addEventListener("click", () => {
  menu.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
  renderMemory();
  memoryPanel.hidden = false;
});

document.querySelector("#exportMemory").addEventListener("click", exportMemory);

document.querySelector("#importMemory").addEventListener("click", () => {
  document.querySelector("#memoryFile").click();
});

document.querySelector("#memoryFile").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) importMemory(file);
  event.target.value = "";
});

document.querySelector("#closeMemory").addEventListener("click", () => {
  memoryPanel.hidden = true;
});

document.querySelector("#clear").addEventListener("click", () => {
  menu.hidden = true;

  if (!confirm("Apagar todas as memórias e o histórico desta instalação?")) return;

  memory.clear();
  restoreHistory();
  renderMemory();
});

async function boot() {
  showStatus("carregando", false);

  try {
    const loaded = await loadKnowledge();
    knowledge = loaded.store;
    rules = loaded.rules;
    ready = true;
    showStatus("pronto", true);
  } catch (error) {
    console.error(error);
    showStatus("modo básico", false);
    knowledge = {
      training: { intents: [] },
      findConcept() { return null; }
    };
    rules = {
      keywords: [],
      default: [
        "Ainda não consegui carregar minha base de conhecimento.",
        "A base local não está disponível agora."
      ]
    };
  }

  if (ready && memory.data.history.length) restoreHistory();
}

restoreHistory();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

boot();
