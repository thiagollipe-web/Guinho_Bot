# Guinho-Bot

Assistente virtual PWA com processamento de linguagem natural local em JavaScript Vanilla.

## Arquitetura

O núcleo não usa API_KEY de IA. A execução acontece no navegador:

- MotorPNL para normalização, intenção e tolerância a erros.
- RecuperadorSemantico usando TF-IDF, similaridade do cosseno, Jaccard, stemming e sinônimos.
- Base local estruturada com conhecimentos de programação, PNL, matemática, física, química, biologia, anatomia, ecologia, astronomia, web e jogos.
- MemoriaSessao usando sessionStorage para contexto da conversa, assunto atual e dados simples informados pelo usuário.
- CompositorRespostas combina os melhores documentos recuperados em uma resposta composta.

## APIs públicas

As APIs externas são utilizadas somente para dados que precisam estar atualizados:

- AwesomeAPI: USD/BRL e EUR/BRL.
- IBGE: notícias.
- Open-Meteo: clima.
- ViaCEP: endereço por CEP.

A biblioteca enviada para o projeto foi usada como referência para os catálogos de APIs públicas e bibliotecas de PLN.

## PWA

- manifest.json
- service-worker.js
- cache dos módulos locais
- interface terminal mobile-first

## Executar

```bash
npm install
npm start
```

Verificação de sintaxe:

```bash
npm run check
```

## Limite consciente do projeto

Este sistema não é um LLM. A geração é determinística e baseada em recuperação, regras e composição local. Isso elimina dependência de API paga, mas também limita a abertura e a criatividade das respostas.

## Estrutura principal

```
public/
  app.js
  knowledge.js
  retrieval.js
  memory.js
  index.html
  styles.css
manifest.json
service-worker.js
server.js
```
