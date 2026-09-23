    const alvo=limpo.replace(/^(validar|valide|validacao|validação)\b/i,"").trim();
    const r=respostaValidacao(alvo);
    contexto.atualizar({texto:limpo,resposta:r,analise:pnl.detectar(limpo),estrategia:"validacao",assunto:memoria.estado.assuntoAtual});
    return r;
  }
  if(/^melhorar\b|^melhore\b/i.test(limpo)){
    const aplicar=/\b(aplicar|aplique|automatize|automaticamente)\b/i.test(limpo);
    const alvo=limpo.replace(/^(melhorar|melhore)\b/i,"").replace(/\b(aplicar|aplique|automatize|automaticamente)\b/ig,"").trim();
    const r=respostaMelhoria(alvo,aplicar);
    contexto.atualizar({texto:limpo,resposta:r,analise:pnl.detectar(limpo),estrategia:"melhoria",assunto:memoria.estado.assuntoAtual});
    return r;
  }
  if(/^corrigir\b|^corrija\b/i.test(limpo)){
    const alvo=limpo.replace(/^(corrigir|corrija)\b/i,"").trim();
    const r=respostaCorrecao(alvo);
    contexto.atualizar({texto:limpo,resposta:r,analise:pnl.detectar(limpo),estrategia:"correcao",assunto:memoria.estado.assuntoAtual});
    return r;
  }
    if(/^analisar\b/i.test(limpo)){
    const alvo=limpo.replace(/^analisar\b/i,"").trim();
    const r=respostaAnalise(alvo);
    contexto.atualizar({texto:limpo,resposta:r,analise:pnl.detectar(limpo),estrategia:"diagnostico",assunto:memoria.estado.assuntoAtual});
    return r;
  }
    if(/^pnl\b|^diagnostico\b/i.test(limpo)){
    const alvo=limpo.replace(/^(pnl|diagnostico)\b/i,"").trim()||texto;
    const rel=pnl.explicar(alvo);
    const est=pnl.detectar(alvo);
    const estrategia=gerador.estrategia(est);
    const perfil=perfilPergunta(alvo);
    return `Diagnóstico local:
Intenção: ${rel.intencao}
Confiança combinada: ${(rel.confianca*100).toFixed(1)}%
Probabilidade bruta: ${(rel.probabilidadeBruta*100).toFixed(1)}%
Margem: ${(rel.margem*100).toFixed(1)}%
Entropia: ${rel.entropia.toFixed(2)}
Ambiguidade: ${rel.ambigua?"sim":"não"}
Tipo: ${rel.tipo}
Objetivo: ${rel.objetivo}
Estratégia: ${estrategia.estrategia}
Domínios da biblioteca: ${Object.keys(perfil.dominios).slice(0,5).join(", ")||"nenhum"}
Intenções reforçadas: ${Object.keys(perfil.intencoes).slice(0,5).join(", ")||"nenhuma"}
Formatos detectados: ${Object.keys(perfil.formatos).join(", ")||"nenhum"}

Probabilidades:
${rel.probabilidades.slice(0,5).map(x=>`${x.intent}: ${(x.probability*100).toFixed(1)}%`).join("\n")}

Objetivos:
${rel.objetivos.slice(0,4).map(x=>`${x.objetivo}: ${(x.probability*100).toFixed(1)}%`).join("\n")}`;
  }
  const textoContextual=contexto.referencia(limpo,pnl);
  const analise=pnl.detectar(textoContextual,contexto.resumo());
  const perfilProgramador=construirPerfilProgramador(textoContextual,{
    contexto:contexto.resumo(),
    historico:memoria.historico()
  });
  if(!ehConversaProgramacao(limpo,perfilProgramador)){
    const r="Eu sou o Guinho, seu companheiro de programação. Posso ajudar a criar, explicar, corrigir, analisar e melhorar código. Me conte o que você quer construir ou qual problema quer resolver.";
    contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"escopo-programacao",assunto:memoria.estado.assuntoAtual});
    return r;
  }
  if(ehPerguntaGeralParaIA(limpo,analise,perfilProgramador)){

    const online=await consultarIAOnline(limpo);
    if(online){
      ultimaOrigemResposta="openai";
      contexto.atualizar({texto:limpo,resposta:online.content,analise,estrategia:"ia-online",assunto:memoria.estado.assuntoAtual});
      return online.content;
    }
    ultimaOrigemResposta="local-fallback";
  }
  if(analise.confident&&analise.intent==="moeda"){const r=await api.moeda();contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"conversa"});return r;}
  if(analise.confident&&analise.intent==="noticias"){const r=await api.noticias();contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"explicacao"});return r;}
  if(analise.confident&&analise.intent==="tempo"){const r=await api.tempo(limpo);contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"explicacao"});return r;}
  if(analise.confident&&analise.intent==="cep"){const r=await api.cep(limpo);contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"explicacao"});return r;}
  const pedidoEngenharia = ["criar","corrigir","analisar","diagnosticar","melhorar","validar"].includes(analise.objetivo)
    && ["jogos","programacao"].includes(analise.intent);
  const criacaoConcreta = ["criar"].includes(analise.objetivo)
    && (pedidoDeCodigo(limpo) || perfilProgramador.linguagem || perfilProgramador.tecnologia || perfilProgramador.tipoProjeto);

  if(criacaoConcreta && (!perfilProgramador.linguagem || perfilProgramador.linguagem==="JavaScript")){
    const r=respostaEngenharia(limpo);
    contexto.atualizar({
      texto:limpo,
      resposta:r,
      analise:{...analise,entidades:{...(analise.entidades||{}),linguagem:perfilProgramador.linguagem,tecnologia:perfilProgramador.tecnologia,tipoProjeto:perfilProgramador.tipoProjeto}},
      estrategia:"agente-criar-projeto",
      assunto:memoria.estado.assuntoAtual
    });
    return r;
  }

  if(analise.confident&&analise.objetivo==="validar"&&["jogos","programacao"].includes(analise.intent)){
    const r=respostaValidacao(limpo);
    contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"validacao",assunto:memoria.estado.assuntoAtual});
    return r;
  }
  if(analise.confident&&analise.objetivo==="melhorar"&&["jogos","programacao"].includes(analise.intent)){
    const r=respostaMelhoria(limpo,false);
    contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"melhoria",assunto:memoria.estado.assuntoAtual});
    return r;
  }
  if(analise.confident&&(analise.objetivo==="analisar"||analise.objetivo==="diagnosticar")&&["jogos","programacao"].includes(analise.intent)){
    const r=respostaAnalise(limpo);
    contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"diagnostico",assunto:memoria.estado.assuntoAtual});
    return r;
  }
  if(pedidoEngenharia && analise.objetivo!=="criar" && ["corrigir","analisar","diagnosticar","melhorar","validar"].includes(analise.objetivo)){
    const r=respostaEngenharia(limpo);
    contexto.atualizar({
      texto:limpo,
      resposta:r,
      analise,
      estrategia:"agente-engenharia",
      assunto:memoria.estado.assuntoAtual
    });
    return r;
  }

  const falaGuinho=respostaElizaProgramacao(limpo,perfilProgramador);
  if(falaGuinho){
    contexto.atualizar({
      texto:limpo,
      resposta:falaGuinho,
      analise:{...analise,entidades:{...(analise.entidades||{}),linguagem:perfilProgramador.linguagem,tecnologia:perfilProgramador.tecnologia,tipoProjeto:perfilProgramador.tipoProjeto}},
      estrategia:"conversa-programacao",
      assunto:memoria.estado.assuntoAtual
    });
    return falaGuinho;
  }
  if((pedidoDeCodigo(limpo)||(analise.confident&&analise.objetivo==="criar"))&&["jogos","programacao"].includes(analise.intent)
    &&(!perfilProgramador.linguagem||perfilProgramador.linguagem==="JavaScript")){

    const r=respostaEngenharia(limpo);
    contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:"engenharia",assunto:memoria.estado.assuntoAtual});
    return r;
  }
  
  function respostaNaturalFallback(texto,analise){
  ultimaOrigemResposta=ultimaOrigemResposta==="local-fallback"?"local-fallback":"local";
  const resultado=geradorResposta.gerar(texto,analise);
  if(!resultado)return null;
  contexto.atualizar({texto,resposta:resultado.texto,analise,estrategia:gerador.estrategia(analise).estrategia,assunto:resultado.assunto});
  return resultado.texto;
}

const especial=analise.confident?intencaoEspecial(analise,limpo):null;
  if(especial){contexto.atualizar({texto:limpo,resposta:especial,analise,estrategia:gerador.estrategia(analise).estrategia,assunto:memoria.estado.assuntoAtual});return especial;}
  const natural=respostaNaturalFallback(textoContextual,analise);
  if(natural)return natural;
  const r=analise.confident
    ? "Eu não encontrei evidência suficiente na base local para responder com segurança. Tente acrescentar o assunto, uma definição ou o contexto da pergunta."
    : "Ainda estou dividido entre algumas interpretações. Se você acrescentar o objetivo ou a tecnologia envolvida, consigo direcionar melhor a resposta.";
  contexto.atualizar({texto:limpo,resposta:r,analise,estrategia:gerador.estrategia(analise).estrategia,assunto:memoria.estado.assuntoAtual});
  return r;
}

function adaptarModo(resposta){
  if(ultimaOrigemResposta==="openai")return resposta;
  if(modoAtual==="standard")return resposta;
  if(modoAtual==="resumido"){
    const partes=resposta.split(/\n\n+/).filter(Boolean);
    const texto=partes[0]||resposta;
    return texto.length>620?texto.slice(0,617).trimEnd()+"...":texto;
  }
  if(modoAtual==="passo"){
    const partes=resposta.replace(/\n+/g," ").split(/(?<=[.!?])\s+/).filter(Boolean);
    if(partes.length<2)return resposta;
    return partes.slice(0,6).map((p,i)=>`${i+1}. ${p}`).join("\n");
  }
  if(modoAtual==="criativo"){
    return "Vamos olhar para isso por outro ângulo.\n\n"+resposta;
  }
  if(modoAtual==="detalhado"){
    return resposta+"\n\nModo detalhado: a resposta acima foi composta a partir das evidências locais recuperadas e da intenção identificada pelo motor probabilístico.";
  }
  return resposta;
}

function showToast(message){