# Guinho Programador — WhatsApp Bot

Bot de WhatsApp focado em programação usando Node.js, `whatsapp-web.js`, `LocalAuth`, `qrcode-terminal` e a API da OpenAI.

## Requisitos

- Node.js 20 ou superior
- Uma conta do WhatsApp para conectar o bot
- Uma chave da OpenAI

## Instalação

Clone o projeto e entre na pasta:

```bash
git clone https://github.com/thiagollipe-web/Guinho_Bot.git
cd Guinho_Bot
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo `.env`:

Linux/macOS:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edite o `.env` e coloque sua chave:

```env
OPENAI_API_KEY=sua_chave_aqui
OPENAI_MODEL=gpt-4o
```

Inicie:

```bash
npm start
```

Na primeira execução, o terminal exibirá um QR Code. No WhatsApp, abra **Dispositivos conectados → Conectar dispositivo** e escaneie o QR Code.

Depois da autenticação, o terminal exibirá:

```
Bot conectado com sucesso!
```

A sessão fica salva localmente por meio do `LocalAuth`, portanto o QR Code não precisa ser escaneado em toda inicialização.

## Comando

O bot só responde a mensagens que começam com:

```
!code 
```

Exemplo:

```
!code como faço um loop for em Python?
```

## Segurança

Nunca publique o arquivo `.env` nem sua chave da OpenAI no GitHub. O projeto já ignora `.env`, `.wwebjs_auth/` e `.wwebjs_cache/`.

## Estrutura

```
.
├── .env.example
├── .gitignore
├── index.js
├── package.json
└── README.md
```

O projeto foi deliberadamente reduzido a essa estrutura para eliminar o código anterior do Guinho Bot e manter somente o novo bot de WhatsApp.
