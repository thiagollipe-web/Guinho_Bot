const STOPWORDS = new Set(
  "a o as os um uma uns umas de do da dos das e é em no na nos nas por para com sem que se ao aos à às eu tu ele ela nós vocês meu minha seu sua isso isto esse essa aquele aquela".split(" ")
);

const KNOWLEDGE = {
  default: [
    "me explique um pouco melhor.",
    "não encontrei uma regra específica para isso.",
    "vamos por partes: o que exatamente você quer resolver?"
  ],
  reflections: {
    eu: "você",
    me: "você",
    meu: "seu",
    minha: "sua",
    estou: "está",
    comigo: "com você"
  },
  intents: [
    {
      name: "saudacao",
      examples: ["oi", "ola", "bom dia", "boa tarde", "boa noite"],
      responses: ["Olá. Como posso ajudar?", "Oi. O que você precisa resolver?"]
    },
    {
      name: "identidade",
      examples: ["quem é você", "o que você é", "quem é o guinho"],
      responses: ["Sou o Guinho, um assistente conversacional baseado em regras, memória e NLP."]
    },
    {
      name: "ajuda",
      examples: ["me ajuda", "preciso de ajuda", "pode me ajudar", "quero ajuda"],
      responses: ["Claro. Me diga o que você precisa resolver."]
    },
    {
      name: "programacao",
      examples: ["quero programar", "problema no codigo", "erro no javascript", "ajuda com python"],
      responses: ["Vamos tratar isso como um problema de programação. Qual é o código ou erro?"]
    },
    {
      name: "agradecimento",
      examples: ["obrigado", "obrigada", "valeu", "agradeço"],
      responses: ["Por nada.", "Sempre que puder, eu ajudo."]
    }
  ],
  keywords: [
    {
      keyword: "erro",
      precedence: 100,
      intent: "erro",
      patterns: ["* erro *", "* problema *"],
      responses: ["Qual erro apareceu? Se puder, cole a mensagem exata."]
    },
    {
      keyword: "programacao",
      precedence: 90,
      intent: "programacao",
      patterns: ["* programação *", "* codigo *", "* código *"],
      responses: ["Vamos por partes. O que você quer construir ou corrigir?"]
    },
    {
      keyword: "lembrar",
      precedence: 80,
      intent: "memoria",
      patterns: ["* lembre *", "* lembrar *", "* lembra *"],
      responses: ["Posso guardar isso nesta sessão."]
    }
  ]
};

function normalize(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text) {
  const value = normalize(text);
  return value ? value.split(" ") : [];
}

function contentTokens(text) {
  return tokens(text).filter((word) => !STOPWORDS.has(word));
}

function similarity(a, b) {
  const A = new Set(contentTokens(a));
  const B = new Set(contentTokens(b));
  if (!A.size || !B.size) return 0;

  let common = 0;
  for (const word of A) {
    if (B.has(word)) common += 1;
  }

  return common / Math.max(A.size, B.size);
}

function matchPattern(pattern, input) {
  const patternTokens = tokens(pattern);
  const words = tokens(input);
  const captures = [];

  function walk(pi, wi) {
    if (pi >= patternTokens.length) {
      return wi === words.length;
    }

    if (patternTokens[pi] === "*") {
      for (let end = wi; end <= words.length; end += 1) {
        captures.push(words.slice(wi, end).join(" "));
        if (walk(pi + 1, end)) return true;
        captures.pop();
      }
      return false;
    }

    if (words[wi] !== patternTokens[pi]) return false;
    return walk(pi + 1, wi + 1);
  }

  return walk(0, 0) ? [...captures] : null;
}

function reflect(text) {
  return tokens(text)
    .map((word) => KNOWLEDGE.reflections[word] || word)
    .join(" ");
}

function fill(template, captures = []) {
  return String(template)
    .replace(/\$(\d+)/g, (_, n) => captures[Number(n) - 1] || "")
    .replace(/\{reflect:(\d+)\}/g, (_, n) => reflect(captures[Number(n) - 1] || ""))
    .trim();
}

function choose(items) {
  return items[Math.floor(Math.random() * items.length)];
}

class Memory {
  constructor() {
    this.key = "guinho-memory-v2";
    this.data = this.read();
  }

  read() {
    try {
      return JSON.parse(
        localStorage.getItem(this.key) || '{"facts":[],"history":[]}'
      );
    } catch {
      return { facts: [], history: [] };
    }
  }

  save() {
    localStorage.setItem(this.key, JSON.stringify(this.data));
  }

  remember(text) {
    const value = normalize(text);
    if (!value) return false;

    if (!this.data.facts.includes(value)) {
      this.data.facts.push(value);
      this.save();
    }

    return true;
  }

  recall() {
    return [...this.data.facts];
  }

  addHistory(role, text) {
    this.data.history.push({ role, text, at: Date.now() });
    this.data.history = this.data.history.slice(-40);
    this.save();
  }

  clearHistory() {
    this.data.history = [];
    this.save();
  }

  clearAll() {
    this.data = { facts: [], history: [] };
    this.save();
  }
}

class Guinho {
  constructor() {
    this.memory = new Memory();
    this.context = null;
  }

  learnFromCommand(input) {
    const clean = normalize(input);
    const match = clean.match(/^(lembre|lembrar|guarde|guarda) (que )?(.+)$/);

    if (!match) return null;

    const fact = match[3].trim();
    this.memory.remember(fact);
    return "Certo. Vou guardar isso.";
  }

  recallCommand(input) {
    const clean = normalize(input);
    if (!/^(o que|qual|quais).*(lembra|lembranca|memoria)/.test(clean)) {
      return null;
    }

    const facts = this.memory.recall();
    return facts.length
      ? "Eu tenho guardado: " + facts.join("; ") + "."
      : "Ainda não tenho nada guardado.";
  }

  respond(input) {
    const clean = normalize(input);

    if (!clean) return "Digite alguma coisa.";

    const learned = this.learnFromCommand(input);
    if (learned) return learned;

    const recalled = this.recallCommand(input);
    if (recalled) return recalled;

    const keywordCandidates = KNOWLEDGE.keywords
      .filter((entry) => tokens(clean).includes(normalize(entry.keyword)))
      .sort((a, b) => b.precedence - a.precedence);

    for (const entry of keywordCandidates) {
      for (const pattern of entry.patterns) {
        const captures = matchPattern(pattern, clean);
        if (!captures) continue;

        this.context = entry.intent;
        return fill(choose(entry.responses), captures);
      }
    }

    let best = null;

    for (const intent of KNOWLEDGE.intents) {
      for (const example of intent.examples) {
        const score = similarity(clean, example);
        if (!best || score > best.score) {
          best = { intent, score };
        }
      }
    }

    if (best && best.score >= 0.45) {
      this.context = best.intent.name;
      return choose(best.intent.responses);
    }

    if (
      this.context === "programacao" &&
      /^(e|entao|como)/.test(clean)
    ) {
      return "Continue a ideia anterior. Qual parte você quer aprofundar?";
    }

    return choose(KNOWLEDGE.default);
  }
}

const guinho = new Guinho();
const chat = document.querySelector("#chat");
const form = document.querySelector("#composer");
const input = document.querySelector("#input");
const menuButton = document.querySelector("#menuButton");
const menu = document.querySelector("#menu");
const memoryPanel = document.querySelector("#memoryPanel");
const memoryList = document.querySelector("#memoryList");

function addMessage(role, text, persist = true) {
  const element = document.createElement("div");
  element.className = "message " + role;
  element.textContent = text;
  chat.appendChild(element);
  chat.scrollTop = chat.scrollHeight;

  if (persist) {
    guinho.memory.addHistory(role, text);
  }
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
    item.textContent = fact;
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
    addMessage(item.role === "user" ? "user" : "bot", item.text, false);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) return;

  addMessage("user", text);

  const answer = guinho.respond(text);
  addMessage("bot", answer);

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
  const willOpen = menu.hidden;
  menu.hidden = !willOpen;
  menuButton.setAttribute("aria-expanded", String(willOpen));
});

document.querySelector("#memoryButton").addEventListener("click", () => {
  menu.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
  renderMemory();
  memoryPanel.hidden = false;
});

document.querySelector("#closeMemory").addEventListener("click", () => {
  memoryPanel.hidden = true;
});

document.querySelector("#clear").addEventListener("click", () => {
  menu.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
  guinho.memory.clearAll();
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
