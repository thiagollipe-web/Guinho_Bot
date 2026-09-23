# Guinho-Bot

PWA de assistente virtual em JavaScript Vanilla, com PLN, recuperação semântica, memória de sessão e Workspace de Engenharia.

## Arquitetura atual

O frontend mantém o motor local como fallback. Perguntas gerais tentam a IA online; comandos de engenharia e recursos locais continuam no navegador.

- Frontend: index.html + app.js na raiz.
- Motor local: probabilistic.js, retrieval.js, knowledge.js, memory.js, context.js e módulos de engenharia.
- API serverless: api/chat.js.
- Deploy recomendado: Vercel para frontend + /api/chat no mesmo projeto.
- GitHub Pages: continua disponível como publicação estática/local, mas não executa funções serverless.

## Raiz x public

Há uma cópia legada em public/. A estrutura usada pelo frontend principal é a raiz: index.html importa ./app.js, e a documentação histórica aponta a publicação do GitHub Pages para a raiz. A pasta public/ não é usada pelo frontend raiz e não foi apagada para preservar compatibilidade/histórico.

## IA online com fallback local

1. O usuário envia a pergunta.
2. app.js mantém as últimas mensagens da sessão e, para perguntas gerais, envia no máximo 12 mensagens a /api/chat.
3. api/chat.js valida o payload e chama exclusivamente https://api.openai.com/v1/responses.
4. A chave permanece somente no ambiente do servidor.
5. Timeout, erro HTTP, resposta vazia, indisponibilidade ou configuração ausente fazem o frontend voltar automaticamente ao motor local.
6. A interface identifica IA ONLINE ou MOTOR LOCAL.

Comandos como /pnl, /analisar, /corrigir, /melhorar e /validar permanecem no motor local/Workspace.

## Vercel

Importe o repositório na Vercel usando a raiz do repositório. vercel.json já configura api/chat.js.

Cadastre somente no painel da Vercel, em Environment Variables:

- OPENAI_API_KEY — sua chave da API, nunca no Git.
- OPENAI_MODEL — ID de um modelo disponível na sua conta.
- AI_TIMEOUT_MS=25000
- AI_MAX_TOKENS=1200
- CORS_ORIGIN=https://thiagollipe-web.github.io somente se o frontend continuar no GitHub Pages.

Para o modelo, use o ID efetivamente disponível na sua conta; o código não inventa nem escolhe um modelo por conta própria. Consulte https://platform.openai.com/docs/models antes do cadastro.

Quando frontend e API forem publicados juntos na Vercel, ai-config.js usa /api/chat e não há necessidade de CORS entre eles.

Se o frontend permanecer no GitHub Pages, altere AI_CHAT_URL em ai-config.js para a URL HTTPS exata da função Vercel. Não coloque token, chave ou segredo nesse arquivo.

## Variáveis de ambiente

O arquivo .env.example contém apenas nomes/configurações não secretas:

OPENAI_API_KEY=
OPENAI_MODEL=
AI_TIMEOUT_MS=25000
AI_MAX_TOKENS=1200
CORS_ORIGIN=https://thiagollipe-web.github.io

Não faça commit de .env nem de chaves reais.

## Segurança

api/chat.js:

- aceita somente POST e OPTIONS;
- valida role como user ou assistant;
- limita a 12 mensagens;
- limita cada mensagem a 12.000 caracteres;
- limita o payload a 64 KiB;
- limita o histórico a 48.000 caracteres;
- aplica timeout de servidor;
- limita max_output_tokens;
- não aceita endpoint externo fornecido pelo frontend;
- não registra a chave;
- não retorna detalhes internos do provedor;
- aplica CORS por origem exata;
- não executa código recebido do usuário;
- não usa eval ou new Function.

A chave nunca é colocada em HTML, JavaScript público ou README.

## PWA e offline

O service worker continua armazenando os módulos locais, incluindo ai-config.js. Sem internet, o motor local permanece disponível. A IA online exige conectividade.

## Testes

Execute:

node --check app.js
node --check api/chat.js
npm test
npm run benchmark
git diff --check

Os testes da função serverless cobrem payload ausente/excessivo, segredo ausente, chamada bem-sucedida, resposta vazia, timeout, erro HTTP, método inválido, origem não autorizada e ausência de segredo no bundle público.

## Publicação atual

O repositório contém workflow de CI em .github/workflows/ci.yml. A configuração da publicação do GitHub Pages é uma configuração do repositório e não está representada por um workflow deploy-pages.yml neste checkout. A Vercel ainda precisa ser conectada e configurada para existir um deploy serverless real.

## Limitação importante

A integração foi preparada, mas uma chamada real da OpenAI não pode ser declarada como funcionando em produção até que OPENAI_API_KEY e OPENAI_MODEL sejam cadastrados no ambiente de execução e a rota implantada seja testada.

A chave deve ser cadastrada diretamente na Vercel; nunca cole a chave em uma conversa, commit ou arquivo público.
