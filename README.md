# Guinho-Bot

PWA de assistente virtual com processamento de linguagem natural local em JavaScript Vanilla.

## Publicação

O projeto é estático e foi preparado para GitHub Pages. Não depende de servidor Node em produção e não usa API_KEY de IA.

URL esperada:

https://thiagollipe-web.github.io/Guinho_Bot/

O deploy é automático pelo workflow `.github/workflows/deploy-pages.yml`.

## Núcleo local

- `MotorPNL`: normalização, tokens, distância de edição e detecção de intenção.
- `knowledge.js`: base local com 116 documentos.
- `retrieval.js`: TF-IDF, cosseno, Jaccard, stemming e sinônimos.
- `memory.js`: memória de sessão via sessionStorage.
- `CompositorRespostas`: combina documentos recuperados em respostas compostas.

## Dados online

Somente consultas públicas em tempo real:

- AwesomeAPI — USD/BRL e EUR/BRL.
- IBGE — últimas notícias.
- Open-Meteo — clima.
- ViaCEP — endereços por CEP.

## PWA

`manifest.json` e `service-worker.js` estão configurados com caminhos relativos para funcionar em `/Guinho_Bot/`.

O service worker mantém o núcleo local disponível offline. APIs externas continuam exigindo internet.

## Execução local

Sirva a pasta por HTTP para que o ES Modules e o service worker funcionem:

```bash
python3 -m http.server 8080
```

Depois abra `http://127.0.0.1:8080/`.

## Limite técnico

O Guinho-Bot não é um LLM. Ele usa recuperação semântica, regras e composição determinística. Isso elimina APIs pagas de IA, mas não fornece geração aberta de texto como um modelo generativo.
