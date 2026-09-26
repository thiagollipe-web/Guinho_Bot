const STORAGE_KEY = "guinho-memory-v5";
const MAX_FACTS = 500;
const MAX_HISTORY = 100;

const STOPWORDS = new Set([
  "a","o","as","os","um","uma","uns","umas","de","do","da","dos","das",
  "e","é","em","no","na","nos","nas","por","para","com","sem","que","se",
  "ao","aos","à","às","eu","tu","ele","ela","nós","vocês","meu","minha",
  "seu","sua","isso","isto","esse","essa","aquele"
]);

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  const text = normalize(value);
  return text ? text.split(" ") : [];
}

function contentTokens(value) {
  return tokens(value).filter(token => !STOPWORDS.has(token));
}

function choose(items) {
  return items[Math.floor(Math.random() * items.length)] || "";
}

function similarity(a, b) {
  const A = new Set(contentTokens(a));
  const B = new Set(contentTokens(b));
  if (!A.size || !B.size) return 0;

  let common = 0;
  for (const word of A) {
    if (B.has(word)) common++;
  }
  return common / Math.max(A.size, B.size);
}

class Memory {
  constructor() {
    this.data = this.load();
  }

  load() {
    const candidates = [STORAGE_KEY, "guinho-memory-v4", "guinho-memory-v3"];

    for (const key of candidates) {
      try {
        const value = JSON.parse(localStorage.getItem(key) || "null");
        if (value && Array.isArray(value.facts) && Array.isArray(value.history)) {
          return {
            facts: value.facts.map(String).filter(Boolean).slice(-MAX_FACTS),
            history: value.history
              .filter(item => item && (item.role === "user" || item.role === "bot"))
              .map(item => ({
                role: item.role,
                text: String(item.text ?? ""),
                at: Number(item.at) || Date.now()
              }))
              .slice(-MAX_HISTORY)
          };
        }
      } catch {
        // Ignora memória corrompida e tenta a próxima versão.
      }
    }

    return { facts: [], history: [] };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // O chat continua funcionando mesmo se o armazenamento estiver indisponível.
    }
  }

  remember(value) {
    const fact = normalize(value);
    if (!fact) return false;

    if (!this.data.facts.includes(fact)) {
      this.data.facts.push(fact);
      this.data.facts = this.data.facts.slice(-MAX_FACTS);
      this.save();
    }

    return true;
  }

  replace(prefix, value) {
    this.data.facts = this.data.facts.filter(item => !item.startsWith(prefix));
    this.remember(value);
  }

  recall() {
    return [...this.data.facts];
  }

  addHistory(role, text) {
    this.data.history.push({
      role,
      text: String(text),
      at: Date.now()
    });
    this.data.history = this.data.history.slice(-MAX_HISTORY);
    this.save();
  }

  clear() {
    this.data = { facts: [], history: [] };
    this.save();
  }

  snapshot() {
    return {
      format: "guinho-memory",
      version: 2,
      exportedAt: new Date().toISOString(),
      facts: [...this.data.facts],
      history: [...this.data.history]
    };
  }

  import(snapshot) {
    if (
      !snapshot ||
      snapshot.format !== "guinho-memory" ||
      !Array.isArray(snapshot.facts) ||
      !Array.isArray(snapshot.history)
    ) {
      throw new Error("Arquivo de memória inválido.");
    }

    this.data = {
      facts: snapshot.facts.map(String).map(normalize).filter(Boolean).slice(-MAX_FACTS),
      history: snapshot.history
        .filter(item => item && (item.role === "user" || item.role === "bot"))
        .map(item => ({
          role: item.role,
          text: String(item.text ?? ""),
          at: Number(item.at) || Date.now()
        }))
        .slice(-MAX_HISTORY)
    };

    this.save();
  }
}

class Knowledge {
  constructor() {
    this.concepts = [
      {
        id: "nlp",
        aliases: ["nlp", "processamento de linguagem natural", "linguagem natural"],
        keywords: ["texto", "linguagem", "intencao", "palavras"],
        response: "NLP é o processamento de linguagem natural: técnicas para analisar texto, identificar padrões, intenções e informações."
      },
      {
        id: "eliza",
        aliases: ["eliza", "motor eliza"],
        keywords: ["regras", "padroes", "conversacao"],
        response: "ELIZA é uma abordagem clássica de conversação baseada em palavras-chave, padrões de entrada e regras de resposta."
      },
      {
        id: "chatterbot",
        aliases: ["chatterbot"],
        keywords: ["treinamento", "conversas", "respostas"],
        response: "ChatterBot é uma abordagem baseada em exemplos de conversa e seleção de respostas."
      }
    ];

    this.intents = [
      {
        name: "ajuda",
        examples: ["me ajuda", "preciso de ajuda", "pode me ajudar", "quero ajuda"]
      },
      {
        name: "programacao",
        examples: ["quero programar", "problema no codigo", "erro no javascript", "ajuda com python", "programacao"]
      },
      {
        name: "agradecimento",
        examples: ["obrigado", "obrigada", "valeu", "agradeco"]
      }
    ];
  }

  findConcept(query) {
    let best = null;

    for (const concept of this.concepts) {
      for (const term of [...concept.aliases, ...concept.keywords]) {
        const score = similarity(query, term);
        if (!best || score > best.score) {
          best = { concept, score };
        }
      }
    }

    return best && best.score >= 0.45 ? best.concept : null;
  }

  findIntent(query) {
    let best = null;

    for (const intent of this.intents) {
      for (const example of intent.examples) {
        const score = similarity(query, example);
        if (!best || score > best.score) {
          best = { intent, score };
        }
      }
    }

    return best && best.score >= 0.55 ? best.intent : null;
  }
}

class Guinho {
  constructor() {
    this.memory = new Memory();
    this.knowledge = new Knowledge();
    this.context = null;
  }

  getName() {
    const fact = this.memory.recall().find(item => item.startsWith("nome:"));
    return fact ? fact.slice(5) : "";
  }

  learn(input) {
    const clean = normalize(input);

    const explicit = clean.match(/^(lembre|lembrar|guarde|guarda)\s+(que\s+)?(.+)$/);
    if (explicit) {
      this.memory.remember(explicit[3]);
      return "Certo. Vou guardar isso.";
    }

    const name = clean.match(/^(?:meu nome e|eu me chamo|me chamo)\s+(.+)$/);
    if (name) {
      this.memory.replace("nome:", "nome:" + name[1]);
      return "Entendi. Vou lembrar do seu nome.";
    }

    const preference = clean.match(/^(?:eu gosto de|eu adoro|eu prefiro)\s+(.+)$/);
    if (preference) {
      this.memory.remember("preferencia:" + preference[1]);
      return "Entendi. Vou levar isso em conta.";
    }

    const project = clean.match(/^(?:estou trabalhando em|estou fazendo|meu projeto e)\s+(.+)$/);
    if (project) {
      this.memory.remember("projeto:" + project[1]);
      return "Entendi. Vou considerar isso como contexto.";
    }

    return null;
  }

  recall(input) {
    const clean = normalize(input);

    if (
      /^(?:voce lembra|lembra de mim|o que voce sabe sobre mim|o que voce lembra|qual e minha memoria)/.test(clean)
    ) {
      const facts = this.memory.recall();
      if (!facts.length) return "Ainda não tenho nenhuma memória guardada.";

      const readable = facts
        .slice(-12)
        .map(fact => fact.replace(/^nome:/, "nome: ").replace(/^preferencia:/, "preferência: ").replace(/^projeto:/, "projeto: "));

      return "Lembro destas informações: " + readable.join("; ") + ".";
    }

    return null;
  }

  respond(input) {
    const clean = normalize(input);
    if (!clean) return "Digite alguma coisa.";

    const learned = this.learn(input);
    if (learned) return learned;

    const recalled = this.recall(input);
    if (recalled) return recalled;

    const name = this.getName();

    if (/^(oi|ola|oie|bom dia|boa tarde|boa noite)(\s|$)/.test(clean)) {
      return name
        ? `Olá, ${name}. O que vamos resolver hoje?`
        : choose([
            "Olá. O que vamos resolver?",
            "Oi. Estou aqui. Me diga o que você precisa.",
            "Olá. Pode falar."
          ]);
    }

    if (/^(quem e voce|o que voce e|quem e o guinho|quem e guinho)(\s|$)/.test(clean)) {
      return "Sou o Guinho, um assistente conversacional com NLP, regras e memória. Posso acompanhar o contexto da conversa e guardar informações que você me pedir para lembrar.";
    }

    if (/^(como voce esta|tudo bem|como vai)(\s|$)/.test(clean)) {
      return "Estou por aqui e pronto para continuar. E você, como está?";
    }

    if (/^(obrigado|obrigada|valeu|agradeco)(\s|$)/.test(clean)) {
      return choose(["Por nada.", "De nada. Vamos em frente.", "Disponha."]);
    }

    if (/^(tchau|ate mais|ate logo|falou)(\s|$)/.test(clean)) {
      return "Até mais. Quando voltar, podemos continuar de onde paramos.";
    }

    if (/\b(erro|bug|falha|nao funciona|problema)\b/.test(clean)) {
      this.context = "erro";
      return "Vamos descobrir a causa. Me mostre o erro exato ou o trecho que não está funcionando.";
    }

    if (/\b(codigo|programacao|javascript|python|html|css|node|pwa|github)\b/.test(clean)) {
      this.context = "programacao";
      return "Vamos tratar isso como um problema de programação. Me diga o que você quer construir ou mostre o código.";
    }

    if (/^(sim|nao|talvez)(\s|$)/.test(clean) && this.context === "erro") {
      return "Entendi. Então me passe o erro exato ou o que aconteceu antes dele aparecer.";
    }

    if (/^(sim|nao|talvez)(\s|$)/.test(clean) && this.context === "programacao") {
      return "Certo. Continue me passando os detalhes do código ou do comportamento esperado.";
    }

    if (/^(o que|quem|qual|explique|explicar|como funciona|me fale)\b/.test(clean)) {
      const concept = this.knowledge.findConcept(clean);
      if (concept) {
        this.context = "knowledge";
        return concept.response;
      }
    }

    const intent = this.knowledge.findIntent(clean);
    if (intent) {
      this.context = intent.name;

      if (intent.name === "ajuda") {
        return "Claro. Me diga o que você precisa resolver e eu vou por partes com você.";
      }

      if (intent.name === "programacao") {
        return "Claro. Mande o código, o erro ou explique o que você quer construir.";
      }

      if (intent.name === "agradecimento") {
        return choose(["Por nada.", "Disponha.", "De nada."]);
      }
    }

    if (this.context === "programacao") {
      return "Entendi. Vamos continuar por aí. Qual parte do projeto está travando?";
    }

    if (this.context === "erro") {
      return "Vamos por partes. O que aconteceu e o que você esperava que acontecesse?";
    }

    return choose([
      "Entendi. Me explique um pouco mais para eu acompanhar.",
      "Certo. Vamos por partes. O que você quer resolver?",
      "Pode continuar. Quero entender melhor o que você está tentando fazer."
    ]);
  }
}

const chat = document.querySelector("#chat");
const form = document.querySelector("#composer");
const input = document.querySelector("#input");
const menuButton = document.querySelector("#menuButton");
const menu = document.querySelector("#menu");
const memoryPanel = document.querySelector("#memoryPanel");
const memoryList = document.querySelector("#memoryList");
const guinho = new Guinho();

function addMessage(role, text, persist = true) {
  const element = document.createElement("div");
  element.className = "message " + role;
  element.textContent = text;
  chat.appendChild(element);
  chat.scrollTop = chat.scrollHeight;

  if (persist) guinho.memory.addHistory(role, text);
}

function renderMemory() {
  memoryList.replaceChildren();

  const facts = guinho.memory.recall();

  if (!facts.length) {
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
}

function restoreHistory() {
  const history = guinho.memory.data.history;

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
    [JSON.stringify(guinho.memory.snapshot(), null, 2)],
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
      guinho.memory.import(JSON.parse(reader.result));
      guinho.context = null;
      chat.replaceChildren();
      restoreHistory();
      renderMemory();
    } catch (error) {
      alert(error.message || "Não foi possível importar a memória.");
    }
  };

  reader.onerror = () => alert("Não foi possível ler o arquivo.");
  reader.readAsText(file);
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) return;

  addMessage("user", text);
  addMessage("bot", guinho.respond(text));

  input.value = "";
  input.style.height = "";
  input.focus();
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 140) + "px";
});

input.addEventListener("keydown", event => {
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

document.querySelector("#memoryFile").addEventListener("change", event => {
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

  guinho.memory.clear();
  guinho.context = null;
  chat.replaceChildren();
  addMessage("bot", "Tudo limpo. Podemos começar de novo.", false);
});

restoreHistory();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
