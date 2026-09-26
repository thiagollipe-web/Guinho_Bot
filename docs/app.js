const STOPWORDS = new Set(
  "a o as os um uma uns umas de do da dos das e é em no na nos nas por para com sem que se ao aos à às eu tu ele ela nós vocês meu minha seu sua isso isto esse essa aquele aquela".split(" ")
);

const script = {
  default: [
    "me explique um pouco melhor.",
    "não encontrei uma regra específica para isso.",
    "vamos por partes: o que exatamente você quer resolver?"
  ],
  reflections: {
    eu: "você", me: "você", meu: "seu", minha: "sua",
    estou: "está", comigo: "com você"
  },
  groups: {
    programacao: ["programacao", "javascript", "typescript", "python", "node", "html", "css", "codigo", "código"],
    sentimentos: ["ansioso", "preocupado", "confuso", "cansado", "triste", "feliz"]
  },
  intents: [
    {
      name: "saudacao",
      examples: ["oi", "ola", "bom dia", "boa tarde", "boa noite", "quem e voce"],
      responses: ["olá! sou o Guinho. como posso ajudar?", "oi! manda a dúvida."]
    },
    {
      name: "identidade",
      examples: ["quem é você", "o que você é", "quem e o guinho"],
      responses: ["sou o Guinho, um assistente conversacional baseado em regras, memória e NLP."]
    },
    {
      name: "ajuda",
      examples: ["me ajuda", "preciso de ajuda", "pode me ajudar", "quero ajuda"],
      responses: ["claro. me diga o que você precisa resolver."]
    },
    {
      name: "programacao",
      examples: ["quero programar", "problema no codigo", "erro no javascript", "ajuda com python", "programação"],
      responses: ["vamos tratar isso como um problema de programação. qual é o código ou erro?"]
    },
    {
      name: "sentimento",
      examples: ["estou preocupado", "estou confuso", "estou cansado", "estou triste"],
      responses: ["o que exatamente está te preocupando?", "quer separar o problema em partes?"]
    },
    {
      name: "agradecimento",
      examples: ["obrigado", "obrigada", "valeu", "agradeço"],
      responses: ["por nada.", "sempre que puder, eu ajudo."]
    }
  ],
  keywords: [
    {
      keyword: "erro", precedence: 100, intent: "erro",
      patterns: ["* erro *", "* problema *"],
      responses: ["qual erro apareceu? se puder, cole a mensagem exata."]
    },
    {
      keyword: "programacao", precedence: 90, intent: "programacao",
      patterns: ["* programação *", "* codigo *", "* código *"],
      responses: ["vamos por partes. o que você quer construir ou corrigir?"]
    },
    {
      keyword: "lembrar", precedence: 80, intent: "memoria",
      patterns: ["* lembre *", "* lembrar *", "* lembra *"],
      responses: ["posso guardar isso nesta sessão: $1"]
    }
  ]
};

function normalize(text) {
  return String(text ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ").trim();
}

function tokens(text) {
  return normalize(text).split(" ").filter(Boolean);
}

function contentTokens(text) {
  return tokens(text).filter((word) => !STOPWORDS.has(word));
}

function similarity(a, b) {
  const A = new Set(contentTokens(a));
  const B = new Set(contentTokens(b));
  if (!A.size || !B.size) return 0;
  let common = 0;
  for (const word of A) if (B.has(word)) common++;
  return common / Math.max(A.size, B.size);
}

function matchPattern(pattern, input) {
  const p = tokens(pattern);
  const w = tokens(input);
  const captures = [];

  function walk(pi, wi) {
    if (pi >= p.length) return wi === w.length;
    if (p[pi] === "*") {
      for (let end = wi; end <= w.length; end++) {
        captures.push(w.slice(wi, end).join(" "));
        if (walk(pi + 1, end)) return true;
        captures.pop();
      }
      return false;
    }
    if (w[wi] !== p[pi]) return false;
    return walk(pi + 1, wi + 1);
  }

  return walk(0, 0) ? [...captures] : null;
}

function reflect(text) {
  return tokens(text).map((word) => script.reflections[word] || word).join(" ");
}

function fill(template, captures = []) {
  return template
    .replace(/\$(\d+)/g, (_, n) => captures[Number(n) - 1] || "")
    .replace(/\{reflect:(\d+)\}/g, (_, n) => reflect(captures[Number(n) - 1] || ""))
    .trim();
}

function choose(items) {
  return items[Math.floor(Math.random() * items.length)];
}

class Memory {
  constructor() {
    this.key = "guinho-memory-v1";
    this.data = JSON.parse(localStorage.getItem(this.key) || '{"facts":[],"history":[]}');
  }
  save() { localStorage.setItem(this.key, JSON.stringify(this.data)); }
  remember(text) {
    const value = normalize(text);
    if (value && !this.data.facts.includes(value)) this.data.facts.push(value);
    this.save();
  }
  recall() { return [...this.data.facts]; }
  addHistory(role, text) {
    this.data.history.push({ role, text, at: Date.now() });
    this.data.history = this.data.history.slice(-20);
    this.save();
  }
  clear() {
    this.data = { facts: [], history: [] };
    this.save();
  }
}

class Guinho {
  constructor() {
    this.memory = new Memory();
    this.context = null;
  }

  respond(input) {
    const clean = normalize(input);

    if (!clean) return "digite alguma coisa.";

    if (/^(lembre|lembrar|guarde|guarda) (que )?/.test(clean)) {
      const fact = clean.replace(/^(lembre|lembrar|guarde|guarda) (que )?/, "").trim();
      this.memory.remember(fact);
      return "certo. vou guardar isso nesta sessão.";
    }

    if (/^(o que|qual|quais).*(lembra|lembranca|memoria)/.test(clean)) {
      const facts = this.memory.recall();
      return facts.length
        ? "nesta sessão eu tenho: " + facts.join("; ") + "."
        : "ainda não tenho nada guardado nesta sessão.";
    }

    const keywordCandidates = script.keywords
      .filter((entry) => tokens(clean).includes(normalize(entry.keyword)))
      .sort((a, b) => b.precedence - a.precedence);

    for (const entry of keywordCandidates) {
      for (const pattern of entry.patterns) {
        const captures = matchPattern(pattern, clean);
        if (captures) {
          this.context = entry.intent;
          return fill(choose(entry.responses), captures);
        }
      }
    }

    let best = null;
    for (const intent of script.intents) {
      for (const example of intent.examples) {
        const score = similarity(clean, example);
        if (!best || score > best.score) best = { intent, score };
      }
    }

    if (best && best.score >= 0.45) {
      this.context = best.intent.name;
      return choose(best.intent.responses);
    }

    if (this.context === "programacao" && /^(e|entao|então|como)/.test(clean)) {
      return "continue a ideia anterior. qual parte você quer aprofundar?";
    }

    return choose(script.default);
  }
}

const guinho = new Guinho();
const chat = document.querySelector("#chat");
const form = document.querySelector("#composer");
const input = document.querySelector("#input");

function addMessage(role, text) {
  const el = document.createElement("div");
  el.className = "message " + role;
  el.textContent = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}

const history = guinho.memory.data.history;
if (history.length) {
  history.forEach((item) => addMessage(item.role === "user" ? "user" : "bot", item.text));
} else {
  addMessage("bot", "Olá! Sou o Guinho. Estou rodando sem IA generativa: NLP + regras + memória.");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  addMessage("user", text);
  guinho.memory.addHistory("user", text);

  const answer = guinho.respond(text);
  addMessage("bot", answer);
  guinho.memory.addHistory("bot", answer);

  input.value = "";
  input.focus();
});

document.querySelector("#clear").addEventListener("click", () => {
  guinho.memory.clear();
  chat.innerHTML = "";
  addMessage("bot", "Memória limpa. Podemos começar de novo.");
});
