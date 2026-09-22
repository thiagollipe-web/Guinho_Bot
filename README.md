# Guinho Bot

Chatbot web público baseado em Node.js/Express.

## Recursos

- Chat com histórico da sessão.
- JWT para autenticação de convidado.
- Integração com OpenRouter no backend.
- Busca na API MediaWiki/Wikipedia.
- Interface responsiva.
- Helmet e CORS.
- Configuração por variáveis de ambiente.

## Rodar localmente

```bash
npm install
cp .env.example .env
npm start
```

Configure `OPENROUTER_API_KEY` em `.env`.

## Deploy

Este projeto pode ser publicado em Railway/Render/Vercel (com adaptação do servidor para funções).

Nunca coloque a chave da IA em `public/app.js` ou diretamente no repositório.

## APIs

- MediaWiki Action API
- OpenRouter Chat Completions
- JWT

## Licença

MIT
