package com.thiagollipe.guinho.nativeai

import android.content.Context
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class GuinhoNativeAI(private val context: Context, private val filesDir: File) {
    private val modelsDir = File(filesDir, "models").apply { mkdirs() }

    @JavascriptInterface
    fun generate(requestJson: String): String = synchronized(this) {
        runCatching {
            val request = JSONObject(requestJson)
            val modelId = request.optString("modelId")
            val prompt = request.optString("prompt")
            val history = request.optJSONArray("history") ?: JSONArray()
            val maxTokens = request.optInt("maxTokens", 512).coerceIn(16, 2048)
            val threads = request.optInt("threads", 0).coerceIn(0, 16)
            require(prompt.isNotBlank()) { "Prompt vazio." }

            val model = resolveModel(modelId)
            require(model.exists()) { "GGUF não encontrado para $modelId. Coloque o arquivo em ${model.absolutePath}." }
            require(NativeLlama.loadModel(model.absolutePath)) {
                "llama.cpp não conseguiu carregar o GGUF: ${model.absolutePath}"
            }

            val finalPrompt = buildPrompt(history, prompt)
            val answer = NativeLlama.generate(finalPrompt, maxTokens, threads)
            NativeLlama.unload()

            JSONObject().put("content", answer).put("model", modelId).put("path", model.absolutePath).toString()
        }.getOrElse { error ->
            NativeLlama.unload()
            JSONObject().put("error", error.message ?: "Falha no runtime nativo.").toString()
        }
    }

    @JavascriptInterface
    fun listModels(): String {
        val result = JSONArray()
        modelsDir.listFiles { file -> file.isFile && file.extension.equals("gguf", true) }
            ?.sortedBy { it.name.lowercase() }
            ?.forEach { result.put(JSONObject().put("name", it.name).put("path", it.absolutePath).put("size", it.length())) }
        return result.toString()
    }

    @JavascriptInterface
    fun setModelFile(modelId: String, absolutePath: String): String = runCatching {
        val source = File(absolutePath)
        require(source.isFile && source.extension.equals("gguf", true)) { "Arquivo GGUF inválido." }
        val target = File(modelsDir, "$modelId.gguf")
        source.copyTo(target, overwrite = true)
        JSONObject().put("ok", true).put("path", target.absolutePath).toString()
    }.getOrElse {
        JSONObject().put("ok", false).put("error", it.message ?: "Falha ao copiar GGUF.").toString()
    }

    @JavascriptInterface
    fun runtimeInfo(): String = JSONObject()
        .put("engine", "llama.cpp")
        .put("version", "d2e54583c7452353eb35d40431281f6ee984332f")
        .put("abi", "arm64-v8a")
        .put("modelsDir", modelsDir.absolutePath)
        .put("modelDescription", NativeLlama.modelDescription())
        .put("modelSizeBytes", NativeLlama.modelSizeBytes())
        .toString()

    fun shutdown() { NativeLlama.shutdown() }

    private fun buildPrompt(history: JSONArray, prompt: String): String {
        val builder = StringBuilder()
        for (index in 0 until history.length()) {
            val item = history.optJSONObject(index) ?: continue
            val role = item.optString("role", "user")
            val content = item.optString("content").trim()
            if (content.isNotEmpty()) builder.append(role.uppercase()).append(": ").append(content).append("\n\n")
        }
        builder.append("USER: ").append(prompt.trim()).append("\nASSISTANT:")
        return builder.toString()
    }

    private fun resolveModel(modelId: String): File {
        val exact = File(modelsDir, "$modelId.gguf")
        if (exact.exists()) return exact
        val aliases = when (modelId) {
            "qwen-0.5b" -> listOf("qwen", "0.5b")
            "qwen-1.5b" -> listOf("qwen", "1.5b")
            "nemotron-4b" -> listOf("nemotron", "nano", "4b")
            else -> emptyList()
        }
        return modelsDir.listFiles { file -> file.isFile && file.extension.equals("gguf", true) }
            ?.firstOrNull { file -> val name = file.name.lowercase(); aliases.all(name::contains) }
            ?: exact
    }
}
