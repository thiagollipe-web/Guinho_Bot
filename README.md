# Guinho-Bot

PWA de assistente híbrido em JavaScript Vanilla. O navegador mantém o motor local como fallback e, quando a conversa é geral e a aplicação está publicada com a função serverless, o frontend consulta a OpenAI através de `/api/chat`.

## Arquitetura

```
Usuário
  ↓
app.js
  ├── comandos de engenharia → motor local
  ├── APIs públicas → motor local
  └── perguntas gerais → /api/chat
                         ↓
                    OpenAI API
                         ↓
                  resposta no chat

Falha/timeout/limite/ausência de configuração
  └────────────────────────────→ motor local
```

A chave da OpenAI existe somente no ambiente do servidor/Vercel. Ela não é enviada ao navegador.

## Estrutura ativa

A publicação atual usa a versão da raiz do repositório:

- `index.html`
- `app.js`
- `styles.css`
- módulos locais e Workspace de Engenharia

A pasta `public/` contém uma cópia/versão legada menor do aplicativo. Ela não deve ser usada para aplicar correções da aplicação atual enquanto o Pages estiver configurado para a raiz.

O frontend atual importa `./app.js` diretamente no `index.html` da raiz.

## Motor local preservado

A integração não remove:

- PLN probabilístico;
- recuperação semântica;
- memória de sessão;
- base `knowledge.js`;
- biblioteca de jogos;
- comandos `/pnl`, `/analisar`, `/corrigir`, `/melhorar` e `/validar`;
- CREATE/ANALYZE/FIX/IMPROVE/VALIDATE;
- Workspace de Engenharia;
- PWA e cache offline;
- APIs públicas de moeda, notícias, clima e CEP.

Perguntas gerais tentam a IA online primeiro. Operações de engenharia continuam locais para preservar o pipeline determinístico e a validação do projeto.

## OpenAI

O backend usa a API oficial da OpenAI pelo endpoint de Responses API.

Variáveis necessárias no servidor:

```env
OPENAI_API_KEY=
OPENAI_MODEL=
AI_TIMEOUT_MS=25000
AI_MAX_TOKENS=1200
CORS_ORIGIN=https://thiagollipe-web.github.io
```

`OPENAI_MODEL` não possui um valor padrão propositalmente. Preencha com um ID de modelo que esteja disponível e habilitado no seu projeto OpenAI. Não coloque a chave no Git, HTML, JavaScript público ou README.

Na Vercel, cadastre a chave diretamente em **Settings → Environment Variables**, de preferência como variável sensível de Production. Depois faça um novo deploy para que a alteração tenha efeito. Não cole a chave no chat nem em arquivos públicos.

## Vercel

O projeto está preparado para ser importado com a raiz do repositório. A função é:

```
/api/chat.js
```

O `vercel.json` configura a função Node.js e o timeout máximo da função.

Para a arquitetura mais simples, publique frontend e backend no mesmo projeto Vercel. Nesse cenário o frontend usa:

```
/api/chat
```

e não precisa de CORS entre páginas e API.

Se o frontend continuar no GitHub Pages, `ai-config.js` contém o único ponto público de configuração do endpoint. Substitua `/api/chat` pela URL HTTPS exata da função Vercel. Não coloque nenhum segredo nesse arquivo. O backend deve manter `CORS_ORIGIN` exatamente igual à origem do GitHub Pages; não use `*`.

Observação de segurança: CORS limita chamadas feitas por navegadores de outras origens, mas não é autenticação para clientes arbitrários. Para uma API pública com uso relevante, adicione autenticação/rate limiting no backend.

A Vercel suporta funções Node.js no diretório `api/` e também permite configurar cancelamento de requisições e duração por função.

## Fallback

O frontend considera falha da IA:

- HTTP não-2xx;
- timeout;
- erro de rede;
- resposta vazia;
- API sem configuração;
- limite/rate limit;
- indisponibilidade do provedor.

Em qualquer desses casos a execução volta ao motor local e o usuário recebe uma indicação de **MOTOR LOCAL**.

A resposta online é marcada como **IA ONLINE**.

## Testes

Execute:

```bash
node --check app.js
node --check api/chat.js
npm test
npm run benchmark
git diff --check
```

Os testes do backend cobrem validação de payload, ausência da chave, chamada bem-sucedida, resposta vazia, timeout, erro HTTP, payload excessivo, método inválido e origem não autorizada.

Há também um teste de segurança que verifica que a chave não aparece no bundle público e que a função não usa `eval`/execução dinâmica.

## GitHub Pages

O GitHub Pages continua sendo útil para a versão offline/local. A URL histórica da aplicação é:

`https://thiagollipe-web.github.io/Guinho_Bot/`

A integração com IA generativa exige a função serverless. Por isso, a recomendação operacional é publicar o mesmo repositório na Vercel e usar a Vercel como origem principal do frontend + backend.

## Desenvolvimento local

Sem API:

```bash
python3 -m http.server 8080
```

Com Vercel local, use a CLI da Vercel e configure as variáveis no ambiente local. Nunca comite `.env`.

## Status da integração

A branch `ai-integration` prepara o backend, frontend, testes e configuração de Vercel. O deploy real e uma chamada real à OpenAI somente podem ser declarados como produção depois que as variáveis forem cadastradas na Vercel e a rota `/api/chat` for testada no navegador.


## Kaggle MCP

O Guinho pode consultar a Kaggle por meio do servidor MCP oficial, sem expor o token no navegador. A Kaggle disponibiliza o endpoint remoto `https://www.kaggle.com/mcp`, com ferramentas para datasets, competições, modelos e notebooks.

### Configuração

Na Vercel, adicione uma variável de ambiente de Production:

```env
KAGGLE_API_TOKEN=KGAT_...
```

Gere o token em **Kaggle → Settings → Generate New Token**. Nunca coloque esse token em `app.js`, `kaggle-client.js`, HTML, GitHub ou GitHub Pages.

O fluxo fica:

```
Usuário
  ↓
Guinho
  ├── tarefa de engenharia → pipeline local
  ├── pergunta geral → OpenAI → fallback local
  └── pedido sobre Kaggle → /api/kaggle → Kaggle MCP
                                      ↓
                         datasets / competições / modelos
```

O endpoint do Guinho usa uma lista de ferramentas permitidas para evitar que o navegador consiga solicitar arbitrariamente qualquer operação MCP. O token permanece exclusivamente no servidor.

Exemplos de pedidos reconhecidos:

- `procure datasets de imagens de gatos na Kaggle`
- `quais competições de Python existem na Kaggle?`
- `procure modelos de classificação de texto na Kaggle`

A integração inicial é de descoberta/pesquisa. Operações destrutivas ou publicação/submissão não são expostas ao frontend nesta etapa.

### Próxima etapa

Depois de validar a autenticação, a evolução natural é permitir que o Guinho crie e execute Notebooks Kaggle para experimentos, acompanhe a execução, recupere outputs e entregue os artefatos ao Workspace de Engenharia. Isso deve ser habilitado gradualmente porque execução remota e submissão de competições são ações com efeitos externos.
