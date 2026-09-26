# Guinho

Guinho é um experimento de agente conversacional leve. A versão web atual funciona no navegador e não depende de IA generativa: combina **NLP determinístico + regras ELIZA + recuperação inspirada no ChatterBot + memória local + ferramentas**.

## Web no GitHub Pages

A aplicação está em `docs/` e é servida como site estático.

O núcleo web inclui:

- normalização e tokenização em português;
- remoção de stopwords;
- similaridade lexical;
- extração básica de entidades;
- classificação de intenções por exemplos;
- regras ELIZA com curingas, grupos, `#N`, alternativas, prioridade e reflexões;
- recuperação de respostas por exemplos, inspirada no ChatterBot;
- memória persistente no navegador;
- ensino de fatos e regras pelo usuário;
- memória exportável/importável;
- calculadora determinística;
- histórico local;
- PWA e cache para uso com conectividade limitada.

## Arquitetura

```
mensagem
   ↓
NLP
   ↓
memória / comando / ferramenta
   ↓
ELIZA
   ↓
ChatterBot por similaridade
   ↓
base de conhecimento
   ↓
entidades
   ↓
fallback
```

As fontes são guardadas apenas quando uma ferramenta/registro fornece uma referência e **não são mostradas automaticamente**. O usuário precisa pedir explicitamente a fonte ou o link.

## Banco de conhecimento

O banco-base fica versionado no GitHub:

- `docs/knowledge/base.json` — conceitos e respostas factuais;
- `docs/knowledge/training.json` — exemplos de intenções e respostas;
- `docs/knowledge/rules.json` — grupos, reflexões e regras ELIZA.

O aprendizado feito durante o uso do site não grava de volta no GitHub. Ele fica no armazenamento local do navegador e pode ser exportado/importado.

## Ensino

Exemplos:

```text
Lembre que meu projeto é um jogo de terror.
```

ou:

```text
Quando eu disser "bom trabalho", responda "obrigado".
```

O primeiro grava um fato. O segundo cria uma regra aprendida localmente.

## Execução Node

O projeto original de WhatsApp/Ollama continua separado do cliente web.

```bash
npm install
npm run check
npm test
```

A SLM não é necessária para a versão web atual.

## Publicação

`.github/workflows/pages.yml` publica automaticamente `docs/` no GitHub Pages.

## Próxima evolução

A próxima camada pode adicionar APIs públicas e ferramentas de pesquisa, sem colocar IA generativa no núcleo. Só depois faz sentido testar uma SLM pequena como camada opcional.
