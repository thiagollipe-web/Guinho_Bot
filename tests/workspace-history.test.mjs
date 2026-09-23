import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_WORKSPACE_SNAPSHOTS,
  criarSnapshot,
  registrarSnapshot,
  desfazerWorkspace,
  removerUltimoSnapshot,
  salvarHistoricoWorkspace,
  carregarHistoricoWorkspace,
  limparHistoricoWorkspace
} from "../workspace-history.js";

function storageMock(){
  const data=new Map();
  return {
    getItem:k=>data.get(k)??null,
    setItem:(k,v)=>data.set(k,String(v)),
    removeItem:k=>data.delete(k)
  };
}

test("snapshot registra arquivos e respeita limite",()=>{
  const workspace={nome:"Guinho",entry:"index.html",files:{"index.html":"v1"}};
  const s=criarSnapshot(workspace,"antes da correção");
  assert.equal(s.files["index.html"],"v1");
  let h=[];
  for(let i=0;i<MAX_WORKSPACE_SNAPSHOTS+3;i++)h=registrarSnapshot(h,criarSnapshot({...workspace,files:{"index.html":"v"+i}},String(i)));
  assert.equal(h.length,MAX_WORKSPACE_SNAPSHOTS);
  assert.equal(h[0].files["index.html"],"v3");
});

test("undo restaura o último snapshot e invalida runtime",()=>{
  const workspace={nome:"Atual",entry:"index.html",files:{"index.html":"v2"},status:"APROVADO",ok:true,runtime:{estado:"OK"}};
  const s=criarSnapshot({nome:"Atual",entry:"index.html",files:{"index.html":"v1"}},"alteração IA");
  const restored=desfazerWorkspace(workspace,[s]);
  assert.equal(restored.files["index.html"],"v1");
  assert.equal(restored.status,"RESTAURADO");
  assert.equal(restored.ok,false);
  assert.equal(restored.runtime,null);
});

test("histórico de workspace persiste e limpa",()=>{
  const storage=storageMock();
  const s=criarSnapshot({files:{"app.js":"1"}},"teste");
  assert.equal(salvarHistoricoWorkspace([s],storage),true);
  assert.equal(carregarHistoricoWorkspace(storage).length,1);
  assert.equal(removerUltimoSnapshot([s]).length,0);
  assert.equal(limparHistoricoWorkspace(storage),true);
  assert.equal(carregarHistoricoWorkspace(storage).length,0);
});
