import { analisarProjeto } from "./analyzer.js";

const ORDEM={critica:4,alta:3,media:2,baixa:1,info:0};

function adicionar(lista,severidade,categoria,mensagem,evidencia,acao){
  lista.push({severidade,categoria,mensagem,evidencia,acao});
}

function uniq(lista){
  return [...new Set(lista.filter(Boolean))];
}

function sugerirHTML(codigo,arquivo,lista){
  const texto=String(codigo);
  const temControles=/<(?:button|a|input|select|textarea)\b/i.test(texto);
  if(temControles&&!/:focus-visible|:focus\s*\{|outline\s*:/i.test(texto)){
    adicionar(lista,"baixa","Acessibilidade","Há controles interativos sem regra de foco visível detectável.",arquivo,"Adicionar :focus-visible com contraste adequado.");
  }
  if(/<img\b/i.test(texto)&&/<img\b[^>]*\bsrc=/i.test(texto)&&!/<img\b[^>]*\bloading=["']lazy["']/i.test(texto)){
    adicionar(lista,"baixa","Performance","Imagens não críticas não mostram lazy loading detectável.","<img>","Considerar loading=\"lazy\" para imagens fora da área inicial.");
  }
  if(/<script\b[^>]*src=/i.test(texto)&&!/<script\b[^>]*(?:defer|async)\b/i.test(texto)){
    adicionar(lista,"baixa","Performance","Scripts externos não usam defer/async de forma detectável.","<script src>","Usar defer quando o script não precisa bloquear a análise do HTML.");
  }
  if(/<canvas\b/i.test(texto)&&!/<canvas\b[^>]*(?:aria-label|role)=/i.test(texto)){
    adicionar(lista,"baixa","Acessibilidade","Canvas sem alternativa textual detectável.","<canvas>","Adicionar aria-label, role apropriado ou conteúdo alternativo.");
  }
  if(/<button\b(?![^>]*\btype=)/i.test(texto)){
    adicionar(lista,"baixa","Qualidade","Botão sem atributo type explícito detectado.","<button>","Definir type explicitamente para evitar comportamento acidental dentro de formulários.");
  }
  if(/<meta[^>]+name=["']viewport["'][^>]+content=["'][^"']*user-scalable=no/i.test(texto)){
    adicionar(lista,"media","Mobile","Viewport restringe zoom do usuário.","meta viewport","Permitir zoom quando não houver requisito explícito que impeça acessibilidade.");
  }
}

function sugerirJS(codigo,arquivo,lista){
  const texto=String(codigo);
  if(/for\s*\([^)]*\)\s*\{[\s\S]{0,300}\bquerySelector(?:All)?\s*\(/.test(texto)){
    adicionar(lista,"media","Performance","Busca no DOM dentro de loop pode repetir trabalho desnecessariamente.",arquivo,"Cachear referências DOM estáveis antes do loop.");
  }
  if(/addEventListener\(\s*["'](?:resize|scroll|pointermove|mousemove|touchmove)["']/i.test(texto)&&!/requestAnimationFrame\s*\(|requestIdleCallback\s*\(/.test(texto)){
    adicionar(lista,"media","Performance","Evento de alta frequência não mostra agendamento para limitar trabalho.",arquivo,"Considerar throttling ou requestAnimationFrame conforme a finalidade.");
  }
  if(/document\.querySelector\(/.test(texto)&&!/(?:DOMContentLoaded|defer|type=["']module["'])/i.test(texto)){
    adicionar(lista,"baixa","Robustez","Há consultas ao DOM sem evidência de execução após a árvore estar disponível.",arquivo,"Usar defer, module ou DOMContentLoaded conforme a estrutura do documento.");
  }
  if(/\bfetch\s*\(/.test(texto)&&!/AbortController|signal\s*:/.test(texto)){
    adicionar(lista,"baixa","Robustez","Há fetch() sem cancelamento detectável.",arquivo,"Considerar AbortController para requisições que podem ficar obsoletas.");
  }
  if(/localStorage|sessionStorage/.test(texto)&&!/try\s*\{[\s\S]{0,300}(?:localStorage|sessionStorage)/.test(texto)){
    adicionar(lista,"baixa","Robustez","Armazenamento web sem tratamento de exceção detectável.",arquivo,"Envolver acesso a storage em try/catch para ambientes com armazenamento indisponível.");
  }
}

function sugerirCSS(codigo,arquivo,lista){
  const texto=String(codigo);
  if(/font-size\s*:\s*(?:[0-9]|1[0-5])px/i.test(texto)){
    adicionar(lista,"baixa","Acessibilidade","Há texto pequeno detectável por pixels.","font-size","Revisar tamanhos de texto e favorecer unidades relativas quando apropriado.");
  }
  const cssCompacto=texto.toLowerCase().replace(/\s+/g,"");
  const movimentoDetectado=cssCompacto.includes("transition:")||cssCompacto.includes("animation:");
  if(movimentoDetectado&&!/@media\s*\(prefers-reduced-motion\s*:\s*reduce\)/i.test(texto)){
    adicionar(lista,"baixa","Acessibilidade","Animações/transições existem sem suporte a prefers-reduced-motion detectável.","transition","Adicionar uma regra prefers-reduced-motion para reduzir movimento quando solicitado pelo sistema.");
  }
  if(/display\s*:\s*grid/i.test(texto)&&!/@media/i.test(texto)){
    adicionar(lista,"baixa","Responsividade","Grid sem breakpoint detectável pode precisar de revisão em telas estreitas.","display:grid","Validar o layout em larguras móveis e adicionar breakpoint somente se necessário.");
  }
}

function sugerirPWA(arquivos,lista){
  const nomes=new Set(Object.keys(arquivos));
  const html=String(arquivos["index.html"]||"");
  const tudo=Object.values(arquivos).join("\n");
  if(nomes.has("manifest.json")&&!/rel=["']manifest["']/i.test(html)){
    adicionar(lista,"media","PWA","manifest.json existe, mas seu link não foi detectado no HTML.","manifest.json","Adicionar link para o manifest no HTML.");
  }
  if(nomes.has("service-worker.js")&&!/serviceWorker\.register\s*\(/i.test(tudo)){
    adicionar(lista,"media","PWA","Service Worker existe, mas não há registro detectável.","service-worker.js","Registrar o Service Worker em escopo apropriado.");
  }
}

function sugerirJogos(arquivos,lista){
  const tudo=Object.values(arquivos).join("\n");
  const temCanvas=/<canvas\b/i.test(tudo);
  const temAnimacao=/requestAnimationFrame\s*\(/.test(tudo);
  if(temCanvas&&!temAnimacao){
    adicionar(lista,"media","Games","Projeto com Canvas sem loop de animação detectável.","Canvas","Adicionar um loop de renderização adequado ao tipo de jogo.");
  }
  if(temCanvas&&temAnimacao&&!/\b(?:dt|deltaTime|delta_time)\b/i.test(tudo)){
    adicionar(lista,"baixa","Games","Loop de jogo sem delta time explícito detectável.","requestAnimationFrame","Separar atualização da lógica da taxa de quadros usando delta time.");
  }
  if(/keydown|keyup|pointerdown|touchstart/i.test(tudo)&&!/touch-action\s*:\s*none/i.test(tudo)){
    adicionar(lista,"baixa","Games","Controles detectados sem estratégia explícita para gestos móveis.","pointer/touch","Definir touch-action na superfície interativa e validar gestos.");
  }
}

export function sugerirMelhorias(projeto={}){
  const arquivos=projeto.files&&typeof projeto.files==="object"?projeto.files:projeto;
  const melhorias=[];
  for(const [nome,codigo] of Object.entries(arquivos||{})){
    if(/\.html?$/i.test(nome))sugerirHTML(codigo,nome,melhorias);
    else if(/\.m?js$/i.test(nome))sugerirJS(codigo,nome,melhorias);
    else if(/\.css$/i.test(nome))sugerirCSS(codigo,nome,melhorias);
  }
  sugerirPWA(arquivos||{},melhorias);
  sugerirJogos(arquivos||{},melhorias);
  const ordenadas=melhorias.sort((a,b)=>(ORDEM[b.severidade]??0)-(ORDEM[a.severidade]??0)||a.categoria.localeCompare(b.categoria));
  const contagem={critica:0,alta:0,media:0,baixa:0,info:0};
  for(const m of ordenadas)contagem[m.severidade]=(contagem[m.severidade]||0)+1;
  const categorias=uniq(ordenadas.map(x=>x.categoria));
  return {
    melhorias:ordenadas,
    total:ordenadas.length,
    contagem,
    categorias,
    resumo:ordenadas.length+" melhoria(s) potencial(is) em "+Object.keys(arquivos||{}).length+" arquivo(s)."
  };
}

function aplicarHTML(codigo,melhorias){
  let texto=String(codigo),alteracoes=[];
  if(melhorias.some(m=>m.categoria==="Acessibilidade"&&m.mensagem.includes("foco visível"))&&!/:focus-visible/i.test(texto)){
    const bloco='\n<style>:focus-visible{outline:3px solid currentColor;outline-offset:3px;}</style>\n';
    texto=/<\/head>/i.test(texto)?texto.replace(/<\/head>/i,bloco+"</head>"):texto+bloco;
    alteracoes.push("adicionou estilo de foco visível");
  }
  if(melhorias.some(m=>m.categoria==="Mobile"&&m.mensagem.includes("zoom"))){
    const antes=texto;
    texto=texto.replace(/(\bcontent=["'][^"']*)\s*user-scalable=no/ig,"$1");
    if(texto!==antes)alteracoes.push("removeu restrição detectada de zoom");
  }
  return {texto,alteracoes};
}

function aplicarCSS(codigo,melhorias){
  let texto=String(codigo),alteracoes=[];
  if(melhorias.some(m=>m.categoria==="Acessibilidade"&&m.mensagem.includes("prefers-reduced-motion"))&&!/@media\s*\(prefers-reduced-motion\s*:\s*reduce\)/i.test(texto)){
    texto+='\n\n@media (prefers-reduced-motion: reduce){*{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important;}}\n';
    alteracoes.push("adicionou suporte a prefers-reduced-motion");
  }
  return {texto,alteracoes};
}

export function aplicarMelhoriasSeguras(projeto={},opcoes={}){
  const original=projeto.files&&typeof projeto.files==="object"?projeto.files:projeto;
  const antes={...original};
  const plano=sugerirMelhorias(antes);
  const arquivos={...antes};
  const alteracoes=[];
  for(const [nome,codigo] of Object.entries(arquivos)){
    const relacionadas=plano.melhorias.filter(m=>m.evidencia===nome);
    let r={texto:String(codigo),alteracoes:[]};
    if(/\.html?$/i.test(nome))r=aplicarHTML(codigo,relacionadas);
    else if(/\.css$/i.test(nome))r=aplicarCSS(codigo,relacionadas);
    arquivos[nome]=r.texto;
    for(const acao of r.alteracoes)alteracoes.push({arquivo:nome,acao});
  }
  const validacao=analisarProjeto(arquivos);
  const originalAnalise=analisarProjeto(antes);
  const houve=alteracoes.length>0;
  const naoPiorou=validacao.score>=originalAnalise.score;
  if(houve&&!naoPiorou&&!opcoes.permitirPiorar)return {aplicado:false,files:antes,alteracoes:[],plano,antes:originalAnalise,depois:originalAnalise,motivo:"As melhorias automáticas não preservaram o score estático; versão original mantida."};
  return {
    aplicado:houve,
    files:arquivos,
    alteracoes,
    plano,
    antes:originalAnalise,
    depois:validacao,
    motivo:houve?"Melhorias seguras aplicadas e reanalisadas.":"Nenhuma melhoria automática segura foi identificada."
  };
}

export function relatorioMelhorias(resultado){
  const r=resultado||{total:0,melhorias:[],contagem:{}};
  const melhorias=r.melhorias||r.plano?.melhorias||[];
  const c=r.contagem||r.plano?.contagem||{};
  const linhas=[
    "MELHORIAS SUGERIDAS",
    "Total: "+(r.total??melhorias.length)+" • Médias: "+(c.media||0)+" • Baixas: "+(c.baixa||0),
    "Categorias: "+((r.categorias||r.plano?.categorias||[]).join(", ")||"nenhuma")
  ];
  for(const m of melhorias.slice(0,10)){
    linhas.push("["+String(m.severidade||"info").toUpperCase()+"] "+m.categoria+": "+m.mensagem);
    if(m.evidencia)linhas.push("Evidência: "+m.evidencia);
    if(m.acao)linhas.push("Ação sugerida: "+m.acao);
  }
  if(r.aplicado!==undefined){
    linhas.push("Automação: "+(r.aplicado?"aplicada":"não aplicada"));
    linhas.push("Score: "+(r.antes?.score??0)+" → "+(r.depois?.score??0));
    for(const a of r.alteracoes||[])linhas.push("- "+a.arquivo+": "+a.acao);
  }
  return linhas.join("\n");
}
