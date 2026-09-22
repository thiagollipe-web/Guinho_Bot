// Biblioteca de padrões linguísticos.
// Não contém respostas prontas: fornece evidências para dedução de intenção,
// objetivo, domínio, formato esperado e profundidade da resposta.

export const BIBLIOTECA_PROMPTS = [
  {dominio:"conversa",intencao:"saudacao",padroes:["oi","olá","bom dia","boa tarde","boa noite","tudo bem","como você está","e aí","prazer","seja bem vindo"]},
  {dominio:"conversa",intencao:"despedida",padroes:["tchau","até mais","até logo","falou","nos vemos","vou sair","até amanhã"]},
  {dominio:"conversa",intencao:"agradecimento",padroes:["obrigado","obrigada","valeu","agradeço","muito obrigado","foi útil","ajudou muito"]},
  {dominio:"conversa",intencao:"ajuda",padroes:["me ajude","preciso de ajuda","o que você pode fazer","como usar","quais recursos","o que você sabe fazer"]},

  {dominio:"conhecimento",intencao:"definicao",padroes:["o que é","o que significa","defina","qual é o conceito","me dê uma definição","explique o termo"]},
  {dominio:"conhecimento",intencao:"explicacao",padroes:["explique","me explique","como funciona","por que isso acontece","qual a finalidade","para que serve","me ajude a entender"]},
  {dominio:"conhecimento",intencao:"causalidade",padroes:["por que","porque","qual o motivo","qual a causa","o que provoca","o que causa","qual a razão"]},
  {dominio:"conhecimento",intencao:"comparacao",padroes:["qual a diferença","compare","comparar","versus","vs","qual é melhor em","como se diferenciam"]},
  {dominio:"conhecimento",intencao:"lista",padroes:["quais são","liste","me dê exemplos","cite alguns","tipos de","principais tipos","quais opções existem"]},
  {dominio:"conhecimento",intencao:"resumo",padroes:["resuma","resumo","resuma isso","em poucas palavras","síntese","faça um resumo"]},

  {dominio:"programacao",intencao:"criar_codigo",padroes:["crie um código","gere o código","escreva o código","faça um programa","implemente","construa","desenvolva","codifique","monte um projeto"]},
  {dominio:"programacao",intencao:"explicar_codigo",padroes:["explique este código","o que esse código faz","como funciona este código","explique linha por linha"]},
  {dominio:"programacao",intencao:"corrigir_codigo",padroes:["corrija meu código","conserte o erro","por que não funciona","encontre o bug","corrija o bug","resolva o erro"]},
  {dominio:"programacao",intencao:"analisar_codigo",padroes:["analise meu código","revise o código","faça uma revisão","audite o código","verifique meu código","encontre problemas"]},
  {dominio:"programacao",intencao:"melhorar_codigo",padroes:["melhore meu código","otimize","deixe mais rápido","deixe mais limpo","refatore","melhore a arquitetura","reduza a complexidade"]},
  {dominio:"programacao",intencao:"depurar",padroes:["debug","debugue","não está funcionando","está dando erro","erro no console","stack trace","exception","undefined","null"]},
  {dominio:"programacao",intencao:"arquitetura",padroes:["qual arquitetura usar","como estruturar o projeto","organize o projeto","estrutura de pastas","padrão de projeto","design pattern"]},

  {dominio:"web",intencao:"criar_site",padroes:["crie um site","faça uma página","landing page","site responsivo","website","página web","portal","web app"]},
  {dominio:"web",intencao:"html",padroes:["html","html5","semântica html","estrutura da página","tags html","formulário html"]},
  {dominio:"web",intencao:"css",padroes:["css","estilizar","layout","flexbox","grid","responsivo","animação css","media query"]},
  {dominio:"web",intencao:"javascript",padroes:["javascript","js","dom","event listener","async await","promise","fetch","módulo javascript"]},
  {dominio:"web",intencao:"pwa",padroes:["pwa","progressive web app","service worker","offline","instalar no celular","manifest"]},

  {dominio:"jogos",intencao:"criar_jogo",padroes:["crie um jogo","faça um jogo","desenvolva um jogo","gere um game","jogo em html","jogo 2d","jogo mobile","protótipo de jogo"]},
  {dominio:"jogos",intencao:"gameplay",padroes:["mecânica de jogo","gameplay","movimento do personagem","pulo","inimigo","vida","pontuação","fase","nível","checkpoint"]},
  {dominio:"jogos",intencao:"pixel_art",padroes:["pixel art","sprite","spritesheet","tileset","tilemap","animação de sprite","personagem pixelado"]},
  {dominio:"jogos",intencao:"fisica_jogo",padroes:["gravidade","colisão","aabb","velocidade","aceleração","delta time","física do jogo"]},
  {dominio:"jogos",intencao:"performance_jogo",padroes:["otimize o jogo","fps","queda de fps","performance","renderização","game loop","object pooling"]},

  {dominio:"python",intencao:"python_codigo",padroes:["python","pip","venv","virtualenv","django","flask","fastapi","pandas","numpy","pygame"]},
  {dominio:"javascript",intencao:"node",padroes:["node.js","nodejs","npm","npx","package.json","express","vite","typescript"]},
  {dominio:"bancos",intencao:"sql",padroes:["sql","postgresql","mysql","sqlite","query","select","join","índice","database","banco de dados"]},
  {dominio:"git",intencao:"git",padroes:["git","github","commit","branch","merge","pull request","rebase","clone","push","pull"]},
  {dominio:"linux",intencao:"terminal",padroes:["linux","ubuntu","debian","bash","shell","terminal","chmod","systemctl","grep","sed","awk"]},
  {dominio:"android",intencao:"android",padroes:["android","apk","adb","termux","gradle","android studio","permissão android"]},
  {dominio:"ia",intencao:"llm",padroes:["inteligência artificial","ia","llm","modelo de linguagem","transformer","token","embedding","rag","agente"]},
  {dominio:"ia",intencao:"ollama",padroes:["ollama","modelo local","llama.cpp","gguf","rodar modelo local","ia offline"]},

  {dominio:"matematica",intencao:"calculo",padroes:["calcule","quanto é","resolva","resultado","equação","porcentagem","fração","regra de três"]},
  {dominio:"matematica",intencao:"algebra",padroes:["equação do primeiro grau","equação do segundo grau","bhaskara","polinômio","matriz","sistema linear"]},
  {dominio:"matematica",intencao:"geometria",padroes:["área","perímetro","volume","triângulo","círculo","ângulo","pitágoras"]},
  {dominio:"matematica",intencao:"estatistica",padroes:["média","mediana","moda","desvio padrão","variância","probabilidade","distribuição"]},

  {dominio:"ciencias",intencao:"fisica",padroes:["física","força","energia","velocidade","aceleração","movimento","eletricidade","onda","gravidade"]},
  {dominio:"ciencias",intencao:"quimica",padroes:["química","átomo","molécula","reação","tabela periódica","pH","ácido","base","estequiometria"]},
  {dominio:"ciencias",intencao:"biologia",padroes:["biologia","célula","DNA","RNA","genética","evolução","ecologia","fotossíntese"]},
  {dominio:"ciencias",intencao:"astronomia",padroes:["astronomia","planeta","estrela","galáxia","buraco negro","sistema solar","universo"]},

  {dominio:"educacao",intencao:"aula",padroes:["prepare uma aula","plano de aula","objetivo de aprendizagem","atividade","exercício","avaliação","sequência didática"]},
  {dominio:"educacao",intencao:"explicar_didatico",padroes:["explique para uma criança","explique de forma simples","explique para alunos","linguagem fácil","didático","passo a passo"]},
  {dominio:"educacao",intencao:"questoes",padroes:["crie questões","elabore uma prova","faça exercícios","questões de múltipla escolha","gabarito","avaliação"]},

  {dominio:"texto",intencao:"reescrever",padroes:["reescreva","reformule","melhore este texto","deixe mais profissional","deixe mais natural","corrija o texto"]},
  {dominio:"texto",intencao:"traduzir",padroes:["traduza","traduzir","passe para inglês","passe para português","tradução"]},
  {dominio:"texto",intencao:"resumir",padroes:["resuma este texto","resuma","faça uma síntese","extraia os pontos principais"]},

  {dominio:"dados",intencao:"tabela",padroes:["crie uma tabela","organize os dados","compare os dados","faça uma planilha","colunas","linhas"]},
  {dominio:"dados",intencao:"grafico",padroes:["faça um gráfico","visualize os dados","gráfico de barras","gráfico de linha","histograma"]},

  {dominio:"sistema",intencao:"diagnostico",padroes:["por que deu erro","diagnostique","analise o problema","o que está errado","não funciona","falhou"]},
  {dominio:"sistema",intencao:"instalacao",padroes:["como instalar","instale","configurar","configuração","dependência","pacote","requisito"]},
  {dominio:"sistema",intencao:"seguranca",padroes:["é seguro","segurança","vulnerabilidade","senha","autenticação","permissão","criptografia"]},

  {dominio:"financas",intencao:"calculo_financeiro",padroes:["juros","juros compostos","investimento","rendimento","financiamento","parcela","taxa","rentabilidade"]},
  {dominio:"economia",intencao:"cotacao",padroes:["dólar","euro","cotação","câmbio","moeda","quanto vale"]},
  {dominio:"tempo",intencao:"clima",padroes:["tempo hoje","vai chover","temperatura","previsão","clima","vento"]},

  {dominio:"saude",intencao:"informacao_saude",padroes:["sintomas","doença","medicamento","exame","tratamento","saúde","corpo humano"]},
  {dominio:"viagem",intencao:"planejamento",padroes:["viagem","roteiro","hotel","passagem","o que visitar","itinerário","turismo"]},
  {dominio:"culinaria",intencao:"receita",padroes:["receita","como fazer","ingredientes","cozinhar","bolo","molho","massa"]},

  {dominio:"objetivo",intencao:"criar",padroes:["crie","criar","faça","fazer","monte","montar","gere","gerar","desenvolva","desenvolver","implemente","construa"]},
  {dominio:"objetivo",intencao:"aprender",padroes:["como faço","como fazer","me ensine","passo a passo","quero aprender","ensine"]},
  {dominio:"objetivo",intencao:"explicar",padroes:["o que é","explique","como funciona","por que","para que serve"]},
  {dominio:"objetivo",intencao:"melhorar",padroes:["melhore","otimize","refatore","aperfeiçoe","como melhorar","dê dicas"]},
  {dominio:"objetivo",intencao:"analisar",padroes:["analise","avalie","revise","audite","verifique","diagnostique"]},
  {dominio:"objetivo",intencao:"corrigir",padroes:["corrija","conserte","arrume","resolva o erro"]},
  {dominio:"objetivo",intencao:"comparar",padroes:["compare","diferença","versus","vs"]},
  {dominio:"objetivo",intencao:"resumir",padroes:["resuma","resumo","síntese"]},
  {dominio:"objetivo",intencao:"listar",padroes:["liste","quais","exemplos","opções","tipos"]},
  {dominio:"objetivo",intencao:"diagnosticar",padroes:["erro","bug","problema","não funciona","falha"]},

  {dominio:"formato",intencao:"codigo",padroes:["em código","código completo","arquivo único","html completo","javascript completo","script completo"]},
  {dominio:"formato",intencao:"passos",padroes:["passo a passo","etapa por etapa","tutorial","guia"]},
  {dominio:"formato",intencao:"resumo",padroes:["resposta curta","resuma","em poucas palavras"]},
  {dominio:"formato",intencao:"detalhado",padroes:["explique detalhadamente","com detalhes","completo","aprofundado"]},
  {dominio:"formato",intencao:"exemplo",padroes:["dê um exemplo","exemplo prático","mostre na prática"]},
  {dominio:"formato",intencao:"tabela",padroes:["em tabela","tabela comparativa","coloque em tabela"]},
  {dominio:"formato",intencao:"lista",padroes:["em lista","bullet points","tópicos","liste"]},

  {dominio:"continuidade",intencao:"referencia",padroes:["isso","isto","esse","essa","ele","ela","nesse caso","nessa situação","e agora","e depois","e para celular","e no caso","mais detalhes","explique melhor","também"]}
];

export function normalizarPrompt(texto){
  return String(texto??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
}

export function todosPadroes(){
  return BIBLIOTECA_PROMPTS.flatMap(item=>item.padroes.map(padrao=>({...item,padrao})));
}

export function buscarPadroes(texto,limite=12){
  const q=normalizarPrompt(texto);
  return todosPadroes()
    .map(item=>{
      const p=normalizarPrompt(item.padrao);
      if(!p)return {...item,score:0};
      const exato=q.includes(p);
      const palavras=p.split(" ");
      const cobertura=palavras.filter(w=>q.includes(w)).length/Math.max(1,palavras.length);
      return {...item,score:exato?1: cobertura*.72};
    })
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0,limite);
}
