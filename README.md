# Guinho WhatsApp + CodeGemma + Ollama

Bot de WhatsApp focado em programação com IA local. O processamento é realizado pelo modelo CodeGemma através do Ollama instalado na própria máquina, sem API da OpenAI.

## Requisitos

- Node.js 20 ou superior.
- Ollama instalado e em execução na mesma máquina do bot.
- WhatsApp no celular para escanear o QR Code na primeira autenticação.

## 1. Instalar o Ollama

Instale o Ollama pela página oficial:

https://ollama.com/download

Confirme a instalação:

~~~bash
ollama --version
~~~

## 2. Baixar o CodeGemma

Execute exatamente:

~~~bash
ollama pull codegemma:instruct
~~~

A página oficial do modelo disponibiliza o modelo codegemma:instruct e também o comando ollama run codegemma:instruct.

Faça um teste:

~~~bash
ollama run codegemma:instruct
~~~

Depois encerre o teste com Ctrl+C.

## 3. Instalar o projeto

Clone o repositório:

~~~bash
git clone https://github.com/thiagollipe-web/Guinho_Bot.git
cd Guinho_Bot
~~~

Instale as dependências:

~~~bash
npm install
~~~

Crie o arquivo .env:

Linux/macOS:

~~~bash
cp .env.example .env
~~~

Windows PowerShell:

~~~powershell
Copy-Item .env.example .env
~~~

Configuração padrão:

~~~env
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=codegemma:instruct
HISTORY_LIMIT=10
~~~

## 4. Iniciar

~~~bash
npm start
~~~

Na primeira execução, o terminal exibirá o QR Code.

No celular:

WhatsApp → Dispositivos conectados → Conectar dispositivo

Escaneie o QR Code.

Depois da autenticação, o terminal exibirá:

~~~text
Bot conectado!
~~~

A autenticação fica salva localmente pelo LocalAuth.

## 5. Comando do bot

O bot só responde a mensagens que começam com:

~~~text
!code 
~~~

Exemplos:

~~~text
!code como fazer um loop for em Python?
~~~

~~~text
!code corrija este JavaScript: const x = ;
~~~

O histórico recente de cada conversa é enviado junto com a nova pergunta.

## 6. Ollama parado

O bot pode iniciar o WhatsApp mesmo que o Ollama esteja temporariamente indisponível. Ao receber !code, ele retorna um aviso amigável.

Ligue o Ollama e tente novamente.

## 7. Estrutura

~~~text
.
├── .env.example
├── .gitignore
├── index.js
└── package.json
~~~

Não coloque .env, a sessão do WhatsApp ou os modelos do Ollama no Git.

## Observação

whatsapp-web.js automatiza o WhatsApp Web por meio de um cliente não oficial. O próprio projeto alerta que o uso pode estar sujeito a bloqueios e não é um cliente oficial do WhatsApp.
