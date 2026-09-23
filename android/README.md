# Guinho Android — runtime GGUF

Esta camada Android carrega GGUF diretamente no dispositivo com llama.cpp e expõe o contrato JavaScript `GuinhoNativeAI`.

O código não embute nenhum modelo no Git. O APK procura os arquivos em:

`/data/data/com.thiagollipe.guinho/files/models/`

Os IDs usados pelo router são:

- `qwen-0.5b`
- `qwen-1.5b`
- `nemotron-4b`

O arquivo pode ter outro nome; o resolver procura aliases compatíveis. Para teste via ADB, depois de instalar o APK:

```bash
adb shell mkdir -p /data/data/com.thiagollipe.guinho/files/models
adb push modelo.gguf /data/data/com.thiagollipe.guinho/files/models/qwen-0.5b.gguf
```

Para uso normal no APK, selecione o modelo no campo de modelo e toque em `Adicionar GGUF`. O Android abre o seletor nativo, valida a extensão `.gguf`, copia o arquivo para o armazenamento privado do aplicativo e informa o progresso da importação. O arquivo não é enviado para Vercel/Ollama.

## Build

O projeto fixa o commit do llama.cpp no `.gitmodules`. Inicialize:

```bash
git submodule update --init --recursive
```

Depois:

```gradle
gradle -p android assembleDebug
```

Arquitetura atual:

`WebView → GuinhoNativeAI → JNI → llama.cpp → GGUF`

O runtime usa CPU `arm64-v8a` e não envia o prompt para Vercel/Ollama. O código do llama.cpp é referenciado como submodule; os pesos GGUF permanecem fora do repositório.

A implementação segue a API C atual de llama.cpp: `llama_model_load_from_file`, `llama_init_from_model`, tokenização, `llama_decode` e sampler chain. O commit fixado é `d2e54583c7452353eb35d40431281f6ee984332f`.
