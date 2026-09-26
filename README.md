# Guinho

Agente conversacional determinístico para navegador.

Arquitetura inicial: NLP + ELIZA + recuperação de respostas por similaridade inspirada no ChatterBot + memória local + ferramentas determinísticas.

Sem LLM e sem servidor na primeira versão.

## Estado atual

O projeto roda como aplicação estática no GitHub Pages, sem servidor e sem LLM na primeira fase. O motor local combina normalização de texto, similaridade, ELIZA, recuperação por exemplos, regras, calculadora e memória persistida no navegador.

A memória de execução é separada da base oficial do projeto. Fatos, histórico e regras aprendidas ficam no navegador e podem ser exportados/importados pelo usuário.

Fontes e links não são exibidos automaticamente; o roteador só responde a pedidos explícitos de fonte, link ou referência quando existir uma referência registrada.
