# Guinho

Guinho é um experimento de agente conversacional local e leve. A primeira fase não usa IA generativa: combina ideias de **ELIZA + ChatterBot + NLP**, com memória de sessão e regras determinísticas.

## Versão web

A aplicação está em `docs/` e pode ser publicada diretamente pelo GitHub Pages.

O núcleo web implementa:

- normalização e tokenização em português;
- remoção de stopwords;
- similaridade lexical para seleção de intenção;
- intenções com exemplos e respostas;
- regras estilo ELIZA com curingas;
- captura e reflexão de frases;
- prioridade de palavras-chave;
- contexto conversacional simples;
- memória persistente no `localStorage`;
- histórico da conversa;
- funcionamento sem API, servidor ou modelo de IA.

## Arquitetura

```
mensagem
   ↓
NLP
   ↓
palavras-chave + intenção + similaridade
   ↓
ELIZA / respostas estilo ChatterBot
   ↓
contexto + memória
   ↓
resposta
```

A SLM fica fora desta fase. Depois podemos adicionar um modelo local como camada opcional, sem tornar o núcleo dependente dele.

## Núcleo Node

O diretório `src/` contém a implementação reutilizável do motor simbólico para Node.js. O bot de WhatsApp continua disponível, mas a interface web é independente dele.

## Testes

```bash
npm install
npm run check
npm test
```

## GitHub Pages

O workflow `.github/workflows/pages.yml` publica automaticamente o conteúdo de `docs/` quando há push na branch `main`. No primeiro uso, o repositório precisa estar configurado para GitHub Pages usando **GitHub Actions** como fonte.

## Próximas camadas

1. memória estruturada;
2. entidades e intenção mais robustas;
3. integração das ferramentas locais;
4. busca em documentos;
5. APIs públicas;
6. somente depois, SLM opcional.
