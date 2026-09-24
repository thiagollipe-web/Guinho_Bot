// Guinho-Bot — motor de IA 100% WebGPU
// Usa Transformers.js diretamente no navegador. Não depende de Node, Termux,
// Ollama ou chaves de API para gerar respostas.
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/+esm";

const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";
const MODEL_DTYPE = "q4";
const MODEL_DEVICE = "webgpu";

// O modelo é baixado uma vez e fica no cache do navegador.
env.allowLocalModels = false;
env.useBrowserCache = true;

let generatorPromise = null;
let loaded = false;
let loading = false;
let lastError = null;

function webgpuDisponivel(){
  return typeof navigator !== "undefined" && !!navigator.gpu;
}

export function statusWebGPU(){
  return {
    supported: webgpuDisponivel(),
    loaded,
    loading,
    model: MODEL_ID,
    dtype: MODEL_DTYPE,
    device: MODEL_DEVICE,
    error: lastError?.message || null
  };
}

export async function verificarWebGPU(){
  if(!webgpuDisponivel()) throw new Error("WebGPU não está disponível neste navegador.");
  const adapter = await navigator.gpu.requestAdapter();
  if(!adapter) throw new Error("Nenhum adaptador GPU compatível foi encontrado.");
  return adapter;
}

export async function carregarWebGPU(onProgress){
  if(generatorPromise) return generatorPromise;
  loading = true;
  lastError = null;
  generatorPromise = (async()=>{
    try{
      await verificarWebGPU();
      const generator = await pipeline("text-generation", MODEL_ID, {
        device: MODEL_DEVICE,
        dtype: MODEL_DTYPE,
        progress_callback: info => {
          if(typeof onProgress === "function") onProgress(info);
        }
      });
      loaded = true;
      return generator;
    }catch(error){
      generatorPromise = null;
      lastError = error;
      throw error;
    }finally{
      loading = false;
    }
  })();
  return generatorPromise;
}

function extrairTexto(output){
  const item = Array.isArray(output) ? output[0] : output;
  if(typeof item === "string") return item;
  if(item?.generated_text) return String(item.generated_text);
  if(Array.isArray(item?.generated_text)) return item.generated_text.map(x=>x?.content||x?.text||"").join("");
  return "";
}

export async function gerarWebGPU({message, history=[], mode="standard", onProgress}={}){
  const generator = await carregarWebGPU(onProgress);
  const messages = [
    {
      role: "system",
      content: "Você é o Guinho-Bot, um companheiro de programação. Responda em português brasileiro. Seja preciso, prático e didático. Ajude a criar, explicar, analisar, corrigir e melhorar código. Quando houver código, use blocos Markdown. Não invente resultados de execução."
    },
    ...history.slice(-8).map(item=>({
      role: item.role === "assistant" ? "assistant" : "user",
      content: String(item.content || "")
    })),
    { role: "user", content: String(message || "") }
  ];

  const prompt = messages.map(m=>m.role.toUpperCase()+": "+m.content).join("\n\n")+"\n\nASSISTANT:";
  const max_new_tokens = mode === "resumido" ? 180 : mode === "detalhado" ? 420 : 300;
  const output = await generator(prompt, {
    max_new_tokens,
    temperature: mode === "criativo" ? 0.8 : 0.35,
    do_sample: true,
    return_full_text: false
  });
  const text = extrairTexto(output).trim();
  if(!text) throw new Error("O modelo WebGPU não produziu texto.");
  return text;
}

export function limparWebGPU(){
  generatorPromise = null;
  loaded = false;
}
