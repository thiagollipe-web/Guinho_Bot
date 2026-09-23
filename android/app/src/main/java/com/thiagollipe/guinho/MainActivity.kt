package com.thiagollipe.guinho

import android.net.Uri
import android.os.Bundle
import android.webkit.WebView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.thiagollipe.guinho.nativeai.GuinhoNativeAI
import com.thiagollipe.guinho.nativeai.NativeLlama
import java.io.File

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var nativeAI: GuinhoNativeAI
    private var selectedModel = "qwen-0.5b"

    private val openModel = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri ?: return@registerForActivityResult
        importGguf(uri)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        NativeLlama.init()
        nativeAI = GuinhoNativeAI(this, filesDir)
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            addJavascriptInterface(nativeAI, "GuinhoNativeAI")
            loadUrl("file:///android_asset/index.html")
        }
        setContentView(webView)
    }

    fun openGgufPicker(modelId: String) {
        selectedModel = modelId
        openModel.launch(arrayOf("application/octet-stream", "application/x-gguf", "*/*"))
    }

    private fun importGguf(uri: Uri) {
        try {
            val target = File(filesDir, "models/$selectedModel.gguf").apply { parentFile?.mkdirs() }
            contentResolver.openInputStream(uri)?.use { input ->
                target.outputStream().use { output -> input.copyTo(output, 1024 * 1024) }
            } ?: error("Não foi possível abrir o arquivo selecionado.")
            val modelJson = org.json.JSONObject.quote(selectedModel)
            webView.evaluateJavascript("window.onGgufImported && window.onGgufImported(" + modelJson + "," + target.length() + ");", null)
        } catch (error: Exception) {
            val errorJson = org.json.JSONObject.quote(error.message ?: "Falha ao importar GGUF")
            webView.evaluateJavascript("window.onGgufImportError && window.onGgufImportError(" + errorJson + ");", null)
        }
    }

    override fun onDestroy() {
        webView.removeJavascriptInterface("GuinhoNativeAI")
        nativeAI.shutdown()
        super.onDestroy()
    }
}
