package com.thiagollipe.guinho.nativeai

object NativeLlama {
    init { System.loadLibrary("guinho_native") }
    external fun init(): Boolean
    external fun loadModel(path: String): Boolean
    external fun generate(prompt: String, maxTokens: Int, threads: Int): String
    external fun unload()
    external fun shutdown()
    external fun modelDescription(): String
    external fun modelSizeBytes(): Long
}
