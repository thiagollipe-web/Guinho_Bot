// Guinho-Bot — motor generativo local 100% WebGPU + GGUF
// Carrega um arquivo .gguf escolhido pelo usuário diretamente no navegador.
// Não usa Groq, OpenAI, Ollama, Node ou servidor local para inferência.



const MODEL_FORMAT = "GGUF";
const MAX_MODEL_BYTES = 1_500_000_000;
const DEFAULT_CONTEXT = 2048;

let wllama = null;
let loaded = false;
let loading = false;
let lastError = null;
let modelName = "";
let modelSize = 0;
let loadPromise = null;

const statusElement = () => document.querySelector("#status-text");
const modelNameElement = () => document.querySelector("#model-name");
const modelInputElement = () => document.querySelector("#model-file-input");
const selectButtonElement = () => document.querySelector("#select-model");

function webgpuDisponivel() {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return (bytes / (1024 ** index)).toFixed(index === 0 ? 0 : 1) + " " + units[index];
}

function atualizarStatus(texto, classe = "") {
  const el = statusElement();
  if (el) {
    el.textContent = texto;
    el.dataset.state = classe;
  }
}

function atualizarModeloUI() {
  const el = modelNameElement();
  if (!el) return;
  el.textContent = modelName
    ? modelName + " • " + formatBytes(modelSize)
    : "Nenhum modelo GGUF selecionado";
}

export function statusWebGPU() {
  return {
    supported: webgpuDisponivel(),
    loaded,
    loading,
    model: modelName || null,
    format: MODEL_FORMAT,
    size: modelSize || 0,
    device: "webgpu",
    error: lastError?.message || null
  };
}

export async function verificarWebGPU() {
  if (!webgpuDisponivel()) {
    throw new Error("WebGPU não está disponível neste navegador. Use Chrome/Chromium ou outro navegador com WebGPU habilitado.");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("WebGPU foi detectado, mas nenhum adaptador GPU compatível foi encontrado.");
  }

  return adapter;
}

function validarArquivo(file) {
  if (!(file instanceof Blob)) {
    throw new Error("Nenhum arquivo GGUF foi selecionado.");
  }

  const name = String(file.name || "").trim();
  if (!/\.gguf$/i.test(name)) {
    throw new Error("Selecione um arquivo com extensão .gguf.");
  }

  if (file.size <= 0) {
    throw new Error("O arquivo GGUF está vazio.");
  }

  if (file.size > MAX_MODEL_BYTES) {
    throw new Error("Esse modelo ultrapassa o limite de segurança de 1,5 GB desta interface.");
  }
}

export async function selecionarModeloArquivo(file) {
  validarArquivo(file);

  await verificarWebGPU();

  // Um novo modelo invalida a instância anterior.
  if (wllama) {
    try { await wllama.exit(); } catch {}
  }

  wllama = null;
  loaded = false;
  loading = true;
  lastError = null;
  modelName = file.name;
  modelSize = file.size;
  atualizarModeloUI();
  atualizarStatus("CARREGANDO " + modelName, "loading");

  loadPromise = (async () => {
    try {
      // A biblioteca remota só é necessária ao selecionar um modelo GGUF.
      // Sem conexão/CDN, o módulo principal continua carregando e a base local responde.
      const [{ Wllama }, { default: WasmFromCDN }] = await Promise.all([
        import("https://cdn.jsdelivr.net/npm/@wllama/wllama@3.6.1/esm/index.min.js"),
        import("https://cdn.jsdelivr.net/npm/@wllama/wllama@3.6.1/esm/wasm-from-cdn.js")
      ]);
      const config = { ...WasmFromCDN };
      const instance = new Wllama(config);

      // O Guinho é WebGPU-only. Não aceitamos execução CPU como substituta.
      if (typeof instance.isSupportWebGPU === "function" && !instance.isSupportWebGPU()) {
        throw new Error("O runtime Wllama não confirmou suporte a WebGPU.");
      }

      const halfCores = Math.max(1, Math.floor((navigator.hardwareConcurrency || 2) / 2));

      await instance.loadModel([file], {
        n_ctx: DEFAULT_CONTEXT,
        n_threads: halfCores,
        n_gpu_layers: 99999,
        jinja: true,
        reasoning: false,
        progressCallback: info => {
          const loadedBytes = Number(info?.loaded || 0);
          const totalBytes = Number(info?.total || file.size || 0);
          const pct = totalBytes > 0 ? Math.max(0, Math.min(100, Math.round((loadedBytes / totalBytes) * 100))) : 0;
          atualizarStatus("CARREGANDO " + pct + "%", "loading");
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("guinho:webgpu-progress", {
              detail: { percent: pct, loaded: loadedBytes, total: totalBytes }
            }));
          }
        }
      });

      wllama = instance;
      loaded = true;
      atualizarStatus("GEMMA • WEBGPU READY", "ready");
      atualizarModeloUI();

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("guinho:webgpu-ready", {
          detail: { name: file.name, size: file.size }
        }));
      }

      return wllama;
    } catch (error) {
      lastError = error;
      loaded = false;
      if (wllama) {
        try { await wllama.exit(); } catch {}
      }
      wllama = null;
      atualizarStatus("ERRO AO CARREGAR MODELO", "error");
      throw error;
    } finally {
      loading = false;
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export async function abrirSeletorModelo() {
  const input = modelInputElement();
  if (!input) throw new Error("Seletor de modelo não encontrado na interface.");
  input.click();
}

async function garantirModelo() {
  if (loaded && wllama) return wllama;
  throw new Error("Selecione primeiro o arquivo Gemma .gguf em “Selecionar modelo”.");
}

export async function gerarWebGPU({ message, history = [], mode = "standard" } = {}) {
  const engine = await garantirModelo();

  const system = [
    "Você é o Guinho-Bot, um companheiro de programação.",
    "Responda sempre em português brasileiro.",
    "Seja preciso, prático, didático e objetivo.",
    "Ajude a criar, explicar, analisar, corrigir e melhorar código.",
    "Quando houver código, use blocos Markdown.",
    "Não invente resultados de execução.",
    "Considere o contexto recente da conversa, sem repetir informações desnecessariamente."
  ].join(" ");

  const recentHistory = history
    .slice(-8)
    .map(item => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: String(item.content || "")
    }))
    .filter(item => item.content.trim());

  const maxTokens =
    mode === "resumido" ? 180 :
    mode === "detalhado" ? 420 :
    mode === "passo" ? 360 :
    mode === "criativo" ? 340 : 300;

  const temperature = mode === "criativo" ? 0.75 : 0.35;

  atualizarStatus("GERANDO • WEBGPU", "generating");

  const response = await engine.createChatCompletion({
    messages: [
      { role: "system", content: system },
      ...recentHistory,
      { role: "user", content: String(message || "") }
    ],
    max_tokens: maxTokens,
    temperature,
    top_p: 0.9,
    top_k: 40,
    stream: false,
    reasoning: false
  });

  const text = String(response?.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new Error("O Gemma não produziu texto.");

  atualizarStatus("GEMMA • WEBGPU READY", "ready");
  return text;
}

export async function limparWebGPU() {
  if (wllama) {
    try { await wllama.exit(); } catch {}
  }
  wllama = null;
  loaded = false;
  loading = false;
  modelName = "";
  modelSize = 0;
  lastError = null;
  loadPromise = null;
  atualizarModeloUI();
  atualizarStatus(webgpuDisponivel() ? "WEBGPU DISPONÍVEL" : "WEBGPU INDISPONÍVEL");
}

function inicializarSeletorModelo() {
  const input = modelInputElement();
  const button = selectButtonElement();

  button?.addEventListener("click", abrirSeletorModelo);
  input?.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (button) button.disabled = true;

    try {
      await selecionarModeloArquivo(file);
    } catch (error) {
      lastError = error;
      atualizarStatus("WEBGPU • ERRO", "error");
      console.error("[GUINHO] Falha ao carregar GGUF:", error);
    } finally {
      if (button) button.disabled = false;
      event.target.value = "";
    }
  });

  atualizarModeloUI();
  atualizarStatus(webgpuDisponivel() ? "WEBGPU DISPONÍVEL" : "WEBGPU INDISPONÍVEL");
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarSeletorModelo, { once: true });
  } else {
    inicializarSeletorModelo();
  }
}
