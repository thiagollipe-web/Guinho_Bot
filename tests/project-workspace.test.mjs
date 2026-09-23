import test from "node:test";
import assert from "node:assert/strict";
import {
  criarWorkspace,
  atualizarWorkspace,
  gerarProximasTarefas,
  salvarWorkspace,
  carregarWorkspace,
  limparWorkspace
} from "../project-workspace.js";

function storageMock(){
  const data=new Map();
  return {
    getItem:k=>data.get(k)??null,
    setItem:(k,v)=>data.set(k,String(v)),
    removeItem:k=>data.delete(k)
  };
}

test("workspace cria manifesto persistente e sugere próximas tarefas",()=>{
  const projeto=criarWorkspace({
    files:{
      "index.html":"<!doctype html><html></html>",
      "app.js":"console.log('guinho')"
    },
    entry:"index.html",
    plano:{tipo:"Jogo 2D",estrategia:"Canvas"},
    status:"APROVADO",
    ok:true
  });
  assert.equal(projeto.linguagem,"JavaScript");
  assert.equal(projeto.runtime,null);
  assert.equal(Object.keys(projeto.files).length,2);
  assert.equal(projeto.status,"APROVADO");
  assert.ok(projeto.proximasTarefas.includes("Separar e organizar o estilo em styles.css"));
  assert.ok(projeto.proximasTarefas.some(x=>/PWA|offline/.test(x)));
});

test("workspace preserva estado do runtime",()=>{
  const projeto=criarWorkspace({files:{"index.html":"ok"},runtime:{estado:"OK",mensagem:"executado"}});
  const atualizado=atualizarWorkspace(projeto,{runtime:{estado:"ERRO",mensagem:"boom"}});
  assert.equal(atualizado.runtime.estado,"ERRO");
});

test("workspace preserva arquivos editados e recalcula tarefas",()=>{
  const base=criarWorkspace({files:{"index.html":"ok"},entry:"index.html"});
  const atualizado=atualizarWorkspace(base,{files:{"styles.css":"body{}"},status:"EDITANDO"});
  assert.equal(atualizado.files["styles.css"],"body{}");
  assert.equal(atualizado.status,"EDITANDO");
});

test("workspace persiste e recupera sem depender de window",()=>{
  const storage=storageMock();
  const projeto=criarWorkspace({files:{"index.html":"ok"},entry:"index.html"});
  assert.equal(salvarWorkspace(projeto,storage),true);
  const recuperado=carregarWorkspace(storage);
  assert.equal(recuperado.entry,"index.html");
  assert.equal(recuperado.files["index.html"],"ok");
  assert.equal(limparWorkspace(storage),true);
  assert.equal(carregarWorkspace(storage),null);
});

test("gerador de próximas tarefas prioriza bloqueadores",()=>{
  const tarefas=gerarProximasTarefas({
    files:{"index.html":"ok"},
    validacao:{valido:false},
    plano:{tipo:"jogo"}
  });
  assert.match(tarefas[0],/bloqueadores/i);
});
