const uniq = valores => [...new Set(valores.filter(Boolean))];

function normalizar(texto){
  return String(texto ?? "").replace(/\r\n/g,"\n").replace(/\r/g,"\n");
}

function adicionar(lista,severidade,categoria,mensagem,evidencia="",correcao=""){
  lista.push({severidade,categoria,mensagem,evidencia,correcao});
}

function detectarLinguagem(nome,codigo){
  const ext=String(nome||"").split(".").pop()?.toLowerCase();
  if(ext==="html"||/(?:<!doctype|<html|<body|<canvas)\b/i.test(codigo))return "html";
  if(ext==="css"||/[.#][\w-]+\s*\{/.test(codigo))return "css";
  if(ext==="json")return "json";
  return "javascript";
}

function extrairIds(html){
  return uniq([...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(m=>m[1]));
}

function extrairSeletoresJS(js){
  const out=[];
  for(const m of js.matchAll(/querySelector(?:All)?\(\s*["']([^"']+)["']\s*\)/g))out.push(m[1]);
  for(const m of js.matchAll(/getElementById\(\s*["']([^"']+)["']\s*\)/g))out.push("#"+m[1]);
  return uniq(out);
}

function severidadePeso(sev){
  return {critica:4,alta:3,media:2,baixa:1,info:0}[sev] ?? 0;
}

function ordenarAchados(lista){
  return [...lista].sort((a,b)=>severidadePeso(b.severidade)-severidadePeso(a.severidade));
}

export function extrairBlocosCodigo(texto){
  const bruto=String(texto||"");
  const blocos=[];
  for(const marcador of ["```","~~~"]){
    let pos=0;
    while((pos=bruto.indexOf(marcador,pos))>=0){
      const fim=bruto.indexOf(marcador,pos+marcador.length);
      if(fim<0)break;
      let bloco=bruto.slice(pos+marcador.length,fim);
      const primeira=bloco.indexOf("\n");
      if(primeira>=0){
        const cabecalho=bloco.slice(0,primeira).trim().toLowerCase();
        if(["html","javascript","js","css","typescript","ts"].includes(cabecalho))bloco=bloco.slice(primeira+1);
      }
      if(bloco.trim())blocos.push(bloco.trim());
      pos=fim+marcador.length;
    }
  }
  if(blocos.length)return uniq(blocos);
  const codigo=bruto;
  const linhas=codigo.split("\n");
  const sinais=linhas.filter(l=>/<(?:!doctype|html|body|canvas)\b/i.test(l)||/\b(function|const|let|var|class)\s+[A-Za-z_$]/.test(l)||/addEventListener\s*\(/.test(l));
  return sinais.length>=2?[codigo.trim()]:[];
}

function analisarHTML(html,achados){
  if(!/^\s*<!doctype html>/i.test(html))adicionar(achados,"media","HTML","DOCTYPE HTML ausente.","Início do arquivo","Adicionar <!doctype html> como primeira instrução.");
  if(!/<html\b/i.test(html)||!/<\/html>/i.test(html))adicionar(achados,"alta","HTML","Estrutura <html> incompleta.","Tags html","Criar a estrutura HTML raiz corretamente.");
  if(!/<head\b/i.test(html)||!/<\/head>/i.test(html))adicionar(achados,"media","HTML","Elemento <head> ausente ou incompleto.","Tags head","Adicionar <head> com metadados e recursos.");
  if(!/<body\b/i.test(html)||!/<\/body>/i.test(html))adicionar(achados,"media","HTML","Elemento <body> ausente ou incompleto.","Tags body","Adicionar <body> para o conteúdo da aplicação.");
  if(!/<meta[^>]+name=["']viewport["']/i.test(html))adicionar(achados,"alta","Mobile","Viewport mobile ausente.","Meta tags","Adicionar meta viewport com width=device-width e initial-scale=1.");

  const ids=extrairIds(html);
  const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean).join("\n");
  const jsSeletores=extrairSeletoresJS(scripts);

  for(const seletor of jsSeletores){
    if(seletor.startsWith("#")&&!ids.includes(seletor.slice(1))){
      adicionar(achados,"alta","DOM","JavaScript referencia um ID inexistente.",seletor,"Criar o elemento correspondente ou corrigir o seletor.");
    }
  }

  for(const b of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)){
    const attrs=b[1]||"",texto=b[2].replace(/<[^>]*>/g,"").trim();
    if(!texto&&!/aria-label=/i.test(attrs)&&!/\btitle=/i.test(attrs))adicionar(achados,"media","Acessibilidade","Botão sem nome acessível.",b[0].slice(0,160),"Adicionar texto visível, aria-label ou title apropriado.");
  }

  for(const img of html.matchAll(/<img\b([^>]*)>/gi)){
    if(!/\balt=/i.test(img[1]||""))adicionar(achados,"media","Acessibilidade","Imagem sem atributo alt.",img[0].slice(0,160),"Adicionar alt descritivo; usar alt vazio apenas para imagens decorativas.");
  }

  if(/<canvas\b/i.test(html)){
    if(/pointerdown|touchstart/i.test(scripts)&&!/touch-action\s*:\s*none/i.test(html))adicionar(achados,"baixa","Mobile","Canvas com controles de toque pode sofrer interferência de gestos do navegador.","Canvas + touch","Definir touch-action:none no canvas ou na área de controle.");
    if(!/requestAnimationFrame\s*\(/.test(scripts))adicionar(achados,"media","Canvas","Canvas não possui loop requestAnimationFrame detectável.","Canvas","Usar requestAnimationFrame para o loop de renderização.");
    if(!/devicePixelRatio/.test(scripts))adicionar(achados,"media","Canvas","devicePixelRatio não é tratado.","Canvas","Ajustar a resolução interna do Canvas para o DPR e escalar o contexto corretamente.");
    if(/requestAnimationFrame/.test(scripts)&&!/\b(?:dt|deltaTime|delta_time)\b/i.test(scripts))adicionar(achados,"baixa","Performance","Loop de animação não mostra uso claro de delta time.","requestAnimationFrame","Usar delta time para desacoplar a física da taxa de quadros.");
  }

  if(/<button\b|<a\b/i.test(html)&&!/:focus-visible|:focus\s*\{|outline\s*:/i.test(html))adicionar(achados,"baixa","Acessibilidade","Não foi detectado estilo de foco visível para controles.","CSS inline/arquivos associados","Adicionar :focus-visible com contraste suficiente.");
  if(/\b(?:console\.(?:log|debug|warn)|debugger)\b/.test(html))adicionar(achados,"baixa","Qualidade","Instrumentação de depuração detectada no HTML.","console/debugger","Revisar ou remover logs antes da publicação.");
}

function analisarJavaScript(js,achados,nome="app.js"){
  const texto=normalizar(js);
  if(/\beval\s*\(/.test(texto))adicionar(achados,"alta","Segurança","Uso de eval() detectado.","eval() em "+nome,"Evitar eval; usar estruturas e funções explícitas.");
  if(/\bnew\s+Function\s*\(/.test(texto))adicionar(achados,"alta","Segurança","Execução dinâmica com new Function() detectada.","new Function() em "+nome,"Evitar executar código dinâmico recebido como texto.");
  if(/\b(?:innerHTML|outerHTML)\s*=/.test(texto))adicionar(achados,"media","Segurança","Atribuição direta a HTML foi detectada e merece revisão de origem dos dados.","innerHTML/outerHTML","Preferir textContent ou sanitizar dados quando o conteúdo vier de entrada externa.");
  if(/\bconsole\.(?:log|debug|warn)\s*\(/.test(texto))adicionar(achados,"baixa","Qualidade","Logs de depuração detectados.","console.* em "+nome,"Revisar ou remover logs desnecessários em produção.");
  if(/setInterval\s*\([^,]+,\s*(?:1|10|16|17|20|30|60)\s*\)/.test(texto)&&/canvas|animation|requestAnimationFrame/i.test(texto))adicionar(achados,"media","Performance","setInterval de alta frequência usado em código com animação.","setInterval","Preferir requestAnimationFrame para renderização e atualizar a física com dt.");
  if(/requestAnimationFrame\s*\(/.test(texto)&&!/\b(?:dt|deltaTime|delta_time)\b/i.test(texto))adicionar(achados,"baixa","Performance","requestAnimationFrame detectado sem variável de tempo delta explícita.","requestAnimationFrame","Usar delta time para desacoplar a física da taxa de quadros.");
  if(/addEventListener\(\s*["'](?:touchstart|touchmove|touchend|pointermove)["']/i.test(texto)&&!/touch-action\s*:\s*none/i.test(texto))adicionar(achados,"baixa","Mobile","Eventos de toque/apontamento detectados sem evidência de controle de gestos.","pointer/touch events","Revisar touch-action e prevenção de gestos apenas onde necessário.");
}

function analisarCSS(css,achados,nome="styles.css"){
  const texto=normalizar(css);
  if(/overflow\s*:\s*hidden/i.test(texto)&&/body|html/i.test(texto)&&/mobile|touch|canvas/i.test(texto))adicionar(achados,"baixa","Mobile","overflow:hidden pode impedir rolagem ou interação em telas pequenas.","overflow:hidden em "+nome,"Aplicar apenas onde a interface realmente precisa bloquear rolagem.");
  if(/position\s*:\s*fixed/i.test(texto)&&/100vh/i.test(texto)&&!/(100dvh|safe-area-inset)/i.test(texto))adicionar(achados,"baixa","Mobile","Uso de 100vh com elementos fixos pode produzir problemas em navegadores móveis.","100vh + position:fixed","Considerar 100dvh e safe-area-inset em interfaces de tela inteira.");
}

function analisarPWA(arquivos,achados){
  const nomes=new Set(Object.keys(arquivos||{}));
  const html=arquivos["index.html"]||"";
  const tudo=Object.values(arquivos||{}).join("\n");
  const temManifest=nomes.has("manifest.json")||/rel=["']manifest["']/i.test(html);
  const temSW=nomes.has("service-worker.js")||/serviceWorker\.register/i.test(tudo);
  if(temManifest&&!nomes.has("manifest.json"))adicionar(achados,"media","PWA","A aplicação referencia um manifest, mas manifest.json não foi encontrado.","index.html","Adicionar manifest.json ou corrigir o caminho.");
  if(temSW&&!nomes.has("service-worker.js"))adicionar(achados,"media","PWA","Há registro de Service Worker, mas o arquivo não foi encontrado.","serviceWorker.register","Adicionar service-worker.js ou corrigir o caminho.");
  if(nomes.has("service-worker.js")&&!/addEventListener\s*\(/.test(String(arquivos["service-worker.js"]||"")))adicionar(achados,"alta","PWA","service-worker.js não contém listeners detectáveis.","service-worker.js","Implementar os eventos install, activate e fetch conforme a estratégia offline.");
}

export function analisarProjeto(projeto={}){
  const arquivos=projeto.files&&typeof projeto.files==="object"?projeto.files:projeto;
  const achados=[];
  const resumo={arquivos:Object.keys(arquivos||{}).length,linguagens:[],linhas:0};
  const htmlNomes=Object.keys(arquivos||{}).filter(n=>/\.html?$/i.test(n));
  const jsNomes=Object.keys(arquivos||{}).filter(n=>/\.m?js$/i.test(n));
  for(const [nome,codigo] of Object.entries(arquivos||{})){
    const texto=normalizar(codigo);
    resumo.linhas+=texto.split("\n").length;
    const linguagem=detectarLinguagem(nome,texto);
    resumo.linguagens.push(linguagem);
    if(linguagem==="html")analisarHTML(texto,achados);
    else if(linguagem==="javascript")analisarJavaScript(texto,achados,nome);
    else if(linguagem==="css")analisarCSS(texto,achados,nome);
    else if(linguagem==="json"){
      try{JSON.parse(texto);}catch(err){adicionar(achados,"alta","JSON","JSON inválido em "+nome+".",err.message,"Corrigir a sintaxe JSON antes de consumir o arquivo.");}
    }
  }

  if(htmlNomes.length){
    const html=String(arquivos[htmlNomes[0]]||"");
    const ids=extrairIds(html);
    for(const nome of jsNomes){
      for(const seletor of extrairSeletoresJS(String(arquivos[nome]||""))){
        if(seletor.startsWith("#")&&!ids.includes(seletor.slice(1)))adicionar(achados,"alta","Integração","Seletor "+seletor+" não possui elemento correspondente no HTML.",nome+": "+seletor,"Criar o elemento ou corrigir o seletor.");
      }
    }
  }

  analisarPWA(arquivos,achados);
  const ordenados=ordenarAchados(achados);
  const contagem={critica:0,alta:0,media:0,baixa:0,info:0};
  for(const a of ordenados)contagem[a.severidade]=(contagem[a.severidade]||0)+1;
  const score=Math.max(0,100-(contagem.critica*35+contagem.alta*18+contagem.media*8+contagem.baixa*2));
  const valido=!ordenados.some(x=>x.severidade==="critica"||x.severidade==="alta");
  return {
    valido,
    score,
    resumo:{...resumo,linguagens:uniq(resumo.linguagens),contagem},
    achados:ordenados,
    recomendacoes:uniq(ordenados.slice(0,6).map(x=>x.correcao))
  };
}

export function analisarCodigo(codigo,nome="codigo.js"){
  return analisarProjeto({[nome]:String(codigo||"")});
}

export function relatorioAnalise(resultado){
  const r=resultado||{resumo:{contagem:{},arquivos:0,linhas:0,linguagens:[]},achados:[]};
  const c=r.resumo?.contagem||{};
  const linhas=[
    "Análise estática: "+(r.valido?"SEM BLOQUEADORES":"COM PONTOS A CORRIGIR"),
    "Arquivos: "+(r.resumo?.arquivos??0)+" • Linhas: "+(r.resumo?.linhas??0)+" • Linguagens: "+((r.resumo?.linguagens||[]).join(", ")||"não identificada"),
    "Achados: "+(r.achados?.length||0)+" • Críticos: "+(c.critica||0)+" • Altos: "+(c.alta||0)+" • Médios: "+(c.media||0)+" • Baixos: "+(c.baixa||0)
  ];
  for(const a of (r.achados||[]).slice(0,8)){
    linhas.push("["+String(a.severidade||"info").toUpperCase()+"] "+a.categoria+": "+a.mensagem);
    if(a.evidencia)linhas.push("Evidência: "+a.evidencia);
    if(a.correcao)linhas.push("Correção sugerida: "+a.correcao);
  }
  if(r.recomendacoes?.length)linhas.push("Prioridade: "+r.recomendacoes.slice(0,4).join(" • "));
  return linhas.join("\n");
}
