package com.thiagollipe.guinho

import android.net.Uri
import android.os.Bundle
import android.webkit.WebView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.thiagollipe.guinho.nativeai.GuinhoNativeAI
import com.thiagollipe.guinho.nativeai.NativeLlama
import org.json.JSONObject
import java.io.File
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var nativeAI: GuinhoNativeAI
    private val ioExecutor = Executors.newSingleThreadExecutor()
    private var pendingModelId = "qwen-0.5b"

    private val openModel = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri ?: return@registerForActivityResult
        importGguf(uri)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        NativeLlama.init()
        nativeAI = GuinhoNativeAI(this, filesDir) { modelId -> selectedModel = modelId; openModel.launch(arrayOf("application/octet-stream", "application/x-gguf", "*/*")) } { modelId ->
            pendingModelId = modelId
            openModel.launch(arrayOf("application/octet-stream", "application/x-gguf", "*/*"))
        }
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

    private fun importGguf(uri: Uri) {
        val modelId = pendingModelId
        webView.evaluateJavascript("window.onGgufImportProgress && window.onGgufImportProgress(0);", null)
        ioExecutor.execute {
            try {
                val name = contentResolver.query(uri, arrayOf(android.provider.OpenableColumns.DISPLAY_NAME), null, null, null)?.use { if (it.moveToFirst()) it.getString(0) else null }
                require(name?.lowercase()?.endsWith(".gguf") == true) { "Selecione um arquivo .gguf." }
                val target = File(filesDir, "models/" + modelId + ".gguf").apply { parentFile?.mkdirs() }
                contentResolver.openInputStream(uri)?.use { input ->
                    target.outputStream().use { output ->
                        val buffer = ByteArray(1024 * 1024)
                        var copied = 0L
                        val total = contentResolver.openAssetFileDescriptor(uri, "r")?.use { it.length } ?: -1L
                        var read: Int
                        while (input.read(buffer).also { read = it } != -1) {
                            output.write(buffer, 0, read)
                            copied += read
                            if (total > 0) {
                                val progress = ((copied * 100) / total).toInt().coerceIn(0, 100)
                                runOnUiThread { webView.evaluateJavascript("window.onGgufImportProgress && window.onGgufImportProgress(" + progress + ");", null) }
                            }
                        }
                    }
                } ?: error("Não foi possível abrir o arquivo selecionado.")
                require(target.length() > 0) { "O arquivo GGUF está vazio." }
                runOnUiThread {
                    val id = JSONObject.quote(modelId)
                    webView.evaluateJavascript("window.onGgufImported && window.onGgufImported(" + id + "," + target.length() + ");", null)
                }
            } catch (error: Exception) {
                runOnUiThread {
                    val message = JSONObject.quote(error.message ?: "Falha ao importar GGUF")
                    webView.evaluateJavascript("window.onGgufImportError && window.onGgufImportError(" + message + ");", null)
                }
            }
        }
    }

    override fun onDestroy() {
        webView.removeJavascriptInterface("GuinhoNativeAI")
        ioExecutor.shutdownNow()
        nativeAI.shutdown()
        super.onDestroy()
    }
}
