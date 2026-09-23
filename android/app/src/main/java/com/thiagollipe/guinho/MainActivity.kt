package com.thiagollipe.guinho

import android.os.Bundle
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import com.thiagollipe.guinho.nativeai.GuinhoNativeAI
import com.thiagollipe.guinho.nativeai.NativeLlama

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var nativeAI: GuinhoNativeAI

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

    override fun onDestroy() {
        webView.removeJavascriptInterface("GuinhoNativeAI")
        nativeAI.shutdown()
        super.onDestroy()
    }
}
