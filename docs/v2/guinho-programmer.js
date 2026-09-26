// Núcleo "ELIZA de programação" do Guinho.
// Conversa, identifica tecnologia e intenção e sugere próximos passos sem substituir a decisão do usuário.

export const LINGUAGENS_PROGRAMACAO = [
  {nome:"JavaScript", aliases:["javascript","js","ecmascript"], extensoes:["js","mjs","cjs"], ecossistema:["Node.js","Vite","React","Express"]},
  {nome:"TypeScript", aliases:["typescript","ts"], extensoes:["ts","tsx"], ecossistema:["Node.js","React","Next.js","Vite"]},
  {nome:"Python", aliases:["python","py"], extensoes:["py","pyw"], ecossistema:["Django","Flask","FastAPI","Pygame","Pandas","NumPy"]},
  {nome:"Java", aliases:["java","jdk","jvm"], extensoes:["java"], ecossistema:["Spring","Android"]},
  {nome:"C", aliases:["linguagem c","c language"], extensoes:["c"], ecossistema:["GCC","Clang"]},
  {nome:"C++", aliases:["c++","cpp","cplusplus"], extensoes:["cpp","cc","cxx","hpp"], ecossistema:["CMake","STL"]},
  {nome:"C#", aliases:["c#","csharp","c sharp"], extensoes:["cs"], ecossistema:[".NET","ASP.NET","Unity","Godot"]},
  {nome:"Go", aliases:["golang","go"], extensoes:["go"], ecossistema:["Go modules"]},
  {nome:"Rust", aliases:["rust","cargo"], extensoes:["rs"], ecossistema:["Cargo","Tokio"]},
  {nome:"PHP", aliases:["php"], extensoes:["php"], ecossistema:["Laravel","Symfony"]},
  {nome:"Ruby", aliases:["ruby"], extensoes:["rb"], ecossistema:["Rails","Sinatra"]},
  {nome:"Kotlin", aliases:["kotlin"], extensoes:["kt","kts"], ecossistema:["Android","Ktor"]},
  {nome:"Swift", aliases:["swift"], extensoes:["swift"], ecossistema:["SwiftUI","iOS"]},
  {nome:"Dart", aliases:["dart"], extensoes:["dart"], ecossistema:["Flutter"]},
  {nome:"Lua", aliases:["lua"], extensoes:["lua"], ecossistema:["LÖVE","Roblox"]},
  {nome:"R", aliases:["linguagem r","r programming"], extensoes:["r"], ecossistema:["RStudio","Shiny"]},
  {nome:"Scala", aliases:["scala"], extensoes:["scala","sc"], ecossistema:["JVM","Akka"]},
  {nome:"Elixir", aliases:["elixir"], extensoes:["ex","exs"], ecossistema:["Phoenix","BEAM"]},
  {nome:"Haskell", aliases:["haskell"], extensoes:["hs"], ecossistema:["GHC","Cabal"]},
  {nome:"Perl", aliases:["perl"], extensoes:["pl","pm"], ecossistema:["CPAN"]},
  {nome:"Objective-C", aliases:["objective-c","objective c"], extensoes:["m","mm"], ecossistema:["Cocoa","iOS"]},
  {nome:"Visual Basic", aliases:["visual basic","vb","vb.net"], extensoes:["vb"], ecossistema:[".NET"]},
  {nome:"SQL", aliases:["sql","postgresql","mysql","sqlite","mariadb"], extensoes:["sql"], ecossistema:["PostgreSQL","MySQL","SQLite"]},
  {nome:"Bash", aliases:["bash","shell script","shell"], extensoes:["sh","bash"], ecossistema:["Linux","GNU"]},
  {nome:"PowerShell", aliases:["powershell","pwsh"], extensoes:["ps1"], ecossistema:["Windows"]},
  {nome:"Assembly", aliases:["assembly","asm","assembler"], extensoes:["asm","s"], ecossistema:["NASM","GAS"]},
  {nome:"GDScript", aliases:["gdscript","godot script"], extensoes:["gd"], ecossistema:["Godot"]},
  {nome:"Solidity", aliases:["solidity"], extensoes:["sol"], ecossistema:["Ethereum","EVM"]}
];

export const TECNOLOGIAS_PROGRAMACAO = [
  {nome:"HTML", aliases:["html","html5"]},
  {nome:"CSS", aliases:["css","css3","flexbox","grid css"]},
  {nome:"Canvas", aliases:["canvas","html canvas","2d canvas"]},
  {nome:"Node.js", aliases:["node.js","nodejs","node"]},
  {nome:"React", aliases:["react","react.js","reactjs"]},
  {nome:"Next.js", aliases:["next.js","nextjs","next"]},
  {nome:"Vue", aliases:["vue","vue.js","vuejs"]},
  {nome:"Angular", aliases:["angular"]},
  {nome:"Vite", aliases:["vite"]},
  {nome:"Express", aliases:["express","express.js"]},
  {nome:"Django", aliases:["django"]},
  {nome:"Flask", aliases:["flask"]},
  {nome:"FastAPI", aliases:["fastapi","fast api"]},
  {nome:"Unity", aliases:["unity","unity engine"]},
  {nome:"Godot", aliases:["godot"]},
  {nome:"Flutter", aliases:["flutter"]},
  {nome:".NET", aliases:[".net","dotnet","asp.net"]},
  {nome:"Docker", aliases:["docker","dockerfile"]},
  {nome:"Git", aliases:["git","github","gitlab","bitbucket"]},
  {nome:"Ollama", aliases:["ollama"]},
  {nome:"Llama.cpp", aliases:["llama.cpp","llama cpp"]},
  {nome:"PWA", aliases:["pwa","progressive web app","progressive web application"]}
];

const INTENCOES = [
  ["criar",["criar","crie","fazer","faça","montar","monte","gerar","gere","desenvolver","desenvolva","implementar","implemente","construir","construa","escrever","escreva","programar","programe"]],
  ["corrigir",["corrigir","corrija","consertar","conserte","arrumar","arrume","resolver erro","resolva o erro","bug","não funciona","nao funciona","exception","stack trace"]],
  ["analisar",["analisar","analise","revisar","revise","auditar","audite","verificar","verifique","diagnosticar","diagnostique","encontrar erro","encontre bugs"]],
  ["melhorar",["melhorar","melhore","otimizar","otimize","refatorar","refatore","aperfeiçoar","aperfeiçoe","deixar mais rápido","deixar mais limpo"]],
  ["explicar",["explicar","explique","como funciona","o que é","o que faz","para que serve","por que"]],
  ["aprender",["aprender","me ensine","ensine","quero aprender","passo a passo","tutorial","estudar"]],
  ["continuar",["continue","continua","e agora","próximo passo","proximo passo","vamos continuar","continue o código","continue o codigo"]],
  ["sugerir",["sugira","sugestão","sugestoes","sugestões","alguma ideia","ideias","o que posso adicionar","o que adicionar","como melhorar o projeto"]]
];

const TIPOS_PROJETO = [
  ["jogo",["jogo","game","gameplay","personagem","inimigo","fase","checkpoint","sprite","spritesheet","tilemap","game loop"]],
  ["site",["site","website","página web","pagina web","landing page","portal","blog"]],
  ["app",["aplicativo","app","aplicação","aplicacao","mobile","android","ios"]],
  ["api",["api","endpoint","rest api","graphql","webhook","backend","back-end"]],
  ["automacao",["automação","automacao","script","robô","robo","crawler","scraping","rotina"]],
  ["ia",["ia","inteligência artificial","inteligencia artificial","llm","agente","rag","modelo de linguagem","chatbot"]],
  ["dados",["dados","data science","dataset","análise de dados","analise de dados","machine learning","ml"]]
];

function normalizar(texto){
  return String(texto??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9+.#_-]+/g," ").replace(/\s+/g," ").trim();
}

function contem(q, termo){
  const t=normalizar(termo);
  if(!t)return false;
  if(t.length<=2)return (" "+q+" ").includes(" "+t+" ");
  return q.includes(t);
}

function limiteTexto(texto,tamanho=280){
  const s=String(texto??"").trim();
  return s.length>tamanho?s.slice(0,tamanho-3)+"...":s;
}

export function detectarLinguagens(texto){
  const original=String(texto??"");
  const q=normalizar(original);
  const resultados=[];
  for(const lang of LINGUAGENS_PROGRAMACAO){
    let score=0;
    for(const alias of lang.aliases){
      if(contem(q,alias))score=Math.max(score,alias.length<=2?.78:1);
      if(q.includes("cod:"+normalizar(alias)))score=Math.max(score,1.1);
    }
    if(score>0)resultados.push({...lang,score});
  }
  const nomes=original.match(/\b[\w-]+\.(jsx?|tsx?|py|java|cs|cpp|cc|cxx|rs|go|php|rb|kt|swift|dart|lua|sql|sh|ps1|gd|sol)\b/gi)||[];
  for(const nome of nomes){
    const ext=nome.split(".").pop().toLowerCase();
    const lang=LINGUAGENS_PROGRAMACAO.find(x=>x.extensoes.includes(ext));
    if(lang){
      const existente=resultados.find(x=>x.nome===lang.nome);
      if(existente)existente.score=Math.max(existente.score,1.15);
      else resultados.push({...lang,score:1.15});
    }
  }
  return resultados.sort((a,b)=>b.score-a.score);
}

export function detectarTecnologias(texto){
  const q=normalizar(texto);
  return TECNOLOGIAS_PROGRAMACAO.map(tecnologia=>{
    const score=Math.max(0,...tecnologia.aliases.filter(alias=>contem(q,alias)).map(alias=>alias.length<=2?.75:1));
    return score?{...tecnologia,score}:null;
  }).filter(Boolean).sort((a,b)=>b.score-a.score);
}

export function detectarIntencaoProgramacao(texto){
  const q=normalizar(texto);
  const encontrados=INTENCOES.map(([nome,padroes])=>{
    let score=0;
    for(const p of padroes)if(q.includes(normalizar(p)))score+=p.length<=3?.7:1;
    return {intencao:nome,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  return encontrados[0]||{intencao:"conversar",score:0};
}

export function detectarTipoProjeto(texto){
  const q=normalizar(texto);
  const encontrados=TIPOS_PROJETO.map(([tipo,padroes])=>({
    tipo,score:padroes.reduce((total,p)=>total+(contem(q,p)?1:0),0)
  })).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  return encontrados[0]?.tipo||null;
}

export function construirPerfilProgramador(texto,{contexto={},historico=[]}={}){
  const atual=String(texto??"");
  const linguagens=detectarLinguagens(atual);
  const tecnologias=detectarTecnologias(atual);
  const intencao=detectarIntencaoProgramacao(atual);
  const tipoProjeto=detectarTipoProjeto(atual);
  const contextoTexto=JSON.stringify(contexto||{});
  const historicoTexto=(historico||[]).slice(-6).map(x=>x?.content||"").join(" ");
  const combinadas=detectarLinguagens(contextoTexto+" "+historicoTexto);
  const tecnologiasContexto=detectarTecnologias(contextoTexto+" "+historicoTexto);
  const linguagem=linguagens[0]?.nome||combinadas[0]?.nome||null;
  const tecnologia=tecnologias[0]?.nome||tecnologiasContexto[0]?.nome||null;
  const projeto=tipoProjeto||detectarTipoProjeto(contextoTexto+" "+historicoTexto);
  return {
    intencao:intencao.intencao,
    intencaoScore:intencao.score,
    linguagens,
    tecnologias,
    linguagem,
    tecnologia,
    tipoProjeto:projeto,
    precisaPerguntar:intencao.intencao==="criar"&&!linguagem&&!tecnologia&&!projeto
  };
}

const SUGESTOES={
  jogo:["separar o jogo em estados (menu, jogo, pausa e game over)","adicionar checkpoints","criar inimigos com estados de patrulha, perseguição e ataque","medir FPS e delta time antes de otimizar"],
  site:["usar uma estrutura mobile-first","separar estrutura, estilo e comportamento","adicionar acessibilidade básica","criar estratégia de cache para o modo offline quando fizer sentido"],
  app:["definir primeiro o fluxo principal do usuário","separar estado, interface e serviços","criar estados de carregamento, erro e sucesso","planejar persistência local"],
  api:["validar entradas na borda da API","padronizar erros e códigos HTTP","adicionar testes de sucesso e falha","registrar somente dados que não contenham segredos"],
  automacao:["tornar a tarefa idempotente quando possível","adicionar logs úteis e tratamento de erros","separar configuração da lógica","criar uma simulação antes da execução real"],
  ia:["separar contexto do projeto do histórico bruto","validar a saída antes de aplicá-la ao código","usar fallback local para operações determinísticas","registrar o que foi gerado e validado"],
  dados:["validar o formato antes do processamento","separar limpeza, transformação e análise","medir desempenho antes de otimizar","criar dados de teste pequenos e reproduzíveis"],
  padrao:["criar testes para o caminho principal","separar responsabilidades em módulos menores","validar entradas antes de alterar estado","documentar a decisão técnica mais importante do projeto"]
};

export function sugerirIdeiasProgramacao(perfil){
  const pool=SUGESTOES[perfil?.tipoProjeto]||SUGESTOES.padrao;
  return pool.slice(0,3);
}

export function ehConversaProgramacao(texto,perfil={}){
  const q=normalizar(texto);
  const primeiro=q.split(" ")[0]||"";
  const saudacoes=["oi","ola","bom","boa","eai","ajuda"];
  const marcadores=["codigo","programacao","software","projeto","programa","aplicativo","app","site","jogo","game","api","script","algoritmo","bot","chatbot","bug","erro","classe","funcao","variavel","database","banco de dados","github","git","docker","linux","terminal","ide","ideia","ideias"];
  if(saudacoes.includes(primeiro))return true;
  if(perfil.linguagem||perfil.tecnologia||perfil.tipoProjeto)return true;
  if(marcadores.some(p=>contem(q,p)))return true;
  return String(texto||"").includes("```");
}

export function respostaElizaProgramacao(texto,perfil){
  const original=limiteTexto(texto,220);
  const q=normalizar(original);
  const {intencao,linguagem,tecnologia,tipoProjeto,precisaPerguntar}=perfil;
  if(/^(oi|ola|bom dia|boa tarde|boa noite|e ai)\b/.test(q)){
    return "Olá. Vamos programar? Me conte o que você quer construir, corrigir ou entender.";
  }
  if(precisaPerguntar){
    return "Vamos construir isso juntos. Qual linguagem ou tecnologia você quer usar? Se ainda não escolheu, me diga o que pretende criar e eu te ajudo a escolher.";
  }
  if(intencao==="criar"&&linguagem&&!tipoProjeto){
    return "Entendi. Vamos construir em "+linguagem+". O que você quer criar com essa linguagem?";
  }
  if(intencao==="criar"&&linguagem&&tipoProjeto&&linguagem!=="JavaScript"){
    return "Entendi: "+tipoProjeto+" em "+linguagem+". A estrutura está definida. No modo local, vou orientar e analisar o projeto; com a IA online disponível, também posso gerar a implementação completa.";
  }
  if(intencao==="criar"&&!linguagem&&!tecnologia&&tipoProjeto){
    return "Entendi: você quer trabalhar em um projeto de "+tipoProjeto+". Algumas ideias: "+sugerirIdeiasProgramacao(perfil).join("; ")+". Qual linguagem ou stack você quer usar?";
  }
  if(intencao==="sugerir"){
    return "Claro. Para o projeto atual, eu começaria com: "+sugerirIdeiasProgramacao(perfil).join("; ")+". Posso transformar qualquer uma dessas ideias em código.";
  }
  if(intencao==="aprender"&&!linguagem&&!tecnologia){
    return "Posso te ensinar programação passo a passo. Diga a linguagem que quer estudar e o que pretende construir com ela.";
  }
  if(intencao==="continuar"){
    return linguagem||tecnologia
      ? "Vamos continuar de onde paramos. Estou usando "+(linguagem||tecnologia)+" como contexto. Diga qual parte vem agora."
      : "Vamos continuar. Diga qual era a última parte do código ou projeto para eu recuperar o contexto.";
  }
  if(["corrigir","analisar","melhorar"].includes(intencao)){
    const foco=linguagem||tecnologia;
    return foco
      ? "Certo. Vamos trabalhar nisso em "+foco+". Cole o código, erro ou estrutura do projeto. Eu analiso primeiro e depois proponho a correção ou melhoria."
      : "Certo. Cole o código, erro ou estrutura do projeto. Primeiro vou entender o problema e depois proponho a correção ou melhoria.";
  }
  if(intencao==="explicar"&&(linguagem||tecnologia)){
    return "Posso explicar isso no contexto de "+(linguagem||tecnologia)+". Cole o trecho de código ou diga qual conceito você quer entender.";
  }
  if((linguagem||tecnologia)&&intencao==="conversar"){
    return "Certo. Podemos trabalhar com "+(linguagem||tecnologia)+". Me diga o que você quer construir ou qual problema está tentando resolver.";
  }
  return null;
}
