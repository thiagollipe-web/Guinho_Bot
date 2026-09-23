#include <jni.h>
#include <android/log.h>
#include <unistd.h>
#include <algorithm>
#include <string>
#include <vector>
#include "llama.h"

#define LOG_TAG "GuinhoNative"
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

static llama_model *g_model = nullptr;

static int auto_threads() {
    const long cores = sysconf(_SC_NPROCESSORS_ONLN);
    return static_cast<int>(std::max(2L, std::min(6L, cores > 2 ? cores - 2 : cores)));
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_thiagollipe_guinho_nativeai_NativeLlama_init(JNIEnv *, jobject) {
    llama_log_set([](ggml_log_level level, const char *text, void *) {
        if (level >= GGML_LOG_LEVEL_ERROR) LOGE("%s", text);
    }, nullptr);
    ggml_backend_load_all();
    llama_backend_init();
    return JNI_TRUE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_thiagollipe_guinho_nativeai_NativeLlama_loadModel(JNIEnv *env, jobject, jstring path) {
    if (g_model) {
        llama_model_free(g_model);
        g_model = nullptr;
    }

    const char *raw = env->GetStringUTFChars(path, nullptr);
    llama_model_params params = llama_model_default_params();
    params.n_gpu_layers = 0;
    g_model = llama_model_load_from_file(raw, params);
    env->ReleaseStringUTFChars(path, raw);

    if (!g_model) {
        LOGE("Falha ao carregar GGUF");
        return JNI_FALSE;
    }
    return JNI_TRUE;
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_thiagollipe_guinho_nativeai_NativeLlama_generate(
    JNIEnv *env, jobject, jstring prompt, jint maxTokens, jint requestedThreads) {

    if (!g_model) return env->NewStringUTF("ERRO: nenhum GGUF carregado.");

    const char *rawPrompt = env->GetStringUTFChars(prompt, nullptr);
    const std::string text(rawPrompt);
    env->ReleaseStringUTFChars(prompt, rawPrompt);

    const llama_vocab *vocab = llama_model_get_vocab(g_model);
    const int nPrompt = -llama_tokenize(vocab, text.c_str(), text.size(), nullptr, 0, true, true);
    if (nPrompt <= 0) return env->NewStringUTF("");

    std::vector<llama_token> tokens(nPrompt);
    if (llama_tokenize(vocab, text.c_str(), text.size(), tokens.data(), tokens.size(), true, true) < 0)
        return env->NewStringUTF("ERRO: falha ao tokenizar prompt.");

    const int nPredict = std::clamp(static_cast<int>(maxTokens), 16, 2048);
    const int nCtx = std::min(std::max(nPrompt + nPredict + 8, 512), 8192);

    llama_context_params ctxParams = llama_context_default_params();
    ctxParams.n_ctx = nCtx;
    ctxParams.n_batch = std::min(nPrompt, 512);
    ctxParams.n_threads = requestedThreads > 0 ? requestedThreads : auto_threads();
    ctxParams.n_threads_batch = ctxParams.n_threads;

    llama_context *ctx = llama_init_from_model(g_model, ctxParams);
    if (!ctx) return env->NewStringUTF("ERRO: falha ao criar contexto.");

    auto samplerParams = llama_sampler_chain_default_params();
    llama_sampler *sampler = llama_sampler_chain_init(samplerParams);
    llama_sampler_chain_add(sampler, llama_sampler_init_temp(0.2f));
    llama_sampler_chain_add(sampler, llama_sampler_init_top_p(0.95f, 1));
    llama_sampler_chain_add(sampler, llama_sampler_init_dist(LLAMA_DEFAULT_SEED));

    llama_batch batch = llama_batch_get_one(tokens.data(), tokens.size());
    std::string output;

    for (int nPos = 0; nPos + batch.n_tokens < nPrompt + nPredict;) {
        if (llama_decode(ctx, batch) != 0) {
            LOGE("llama_decode falhou");
            output += "\n[erro: llama_decode falhou]";
            break;
        }

        nPos += batch.n_tokens;
        const llama_token token = llama_sampler_sample(sampler, ctx, -1);
        if (llama_vocab_is_eog(vocab, token)) break;

        char piece[512];
        const int n = llama_token_to_piece(vocab, token, piece, sizeof(piece), 0, true);
        if (n > 0) output.append(piece, n);

        batch = llama_batch_get_one(const_cast<llama_token *>(&token), 1);
    }

    llama_sampler_free(sampler);
    llama_free(ctx);
    return env->NewStringUTF(output.c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_com_thiagollipe_guinho_nativeai_NativeLlama_unload(JNIEnv *, jobject) {
    if (g_model) {
        llama_model_free(g_model);
        g_model = nullptr;
    }
}

extern "C" JNIEXPORT void JNICALL
Java_com_thiagollipe_guinho_nativeai_NativeLlama_shutdown(JNIEnv *, jobject) {
    if (g_model) {
        llama_model_free(g_model);
        g_model = nullptr;
    }
    llama_backend_free();
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_thiagollipe_guinho_nativeai_NativeLlama_modelDescription(JNIEnv *env, jobject) {
    char desc[256] = {};
    if (!g_model) return env->NewStringUTF("none");
    llama_model_desc(g_model, desc, sizeof(desc));
    return env->NewStringUTF(desc);
}

extern "C" JNIEXPORT jlong JNICALL
Java_com_thiagollipe_guinho_nativeai_NativeLlama_modelSizeBytes(JNIEnv *, jobject) {
    return g_model ? static_cast<jlong>(llama_model_size(g_model)) : 0;
}
