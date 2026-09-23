import test from "node:test";
import assert from "node:assert/strict";
import { analisarDependencias, arquivosRelacionados, validarDependencias, normalizarArquivosImportados } from "../project-dependencies.js";

test("resolve dependências JS entre múltiplos arquivos",()=>{
  const files={
    "index.html":'<script type="module" src="./app.js"></script>',
    "app.js":'import { player } from "./player.js";',
    "player.js":"export const player={};"
  };
  const d=analisarDependencias(files);
  assert.equal(d.comProblemas,false);
  assert.equal(d.graph["app.js"][0].resolvido,"player.js");
  assert.deepEqual(arquivosRelacionados(files,"player.js").sort(),["app.js","player.js"]);
});

test("detecta dependência quebrada",()=>{
  const d=validarDependencias({"app.js":'import "./missing.js";'});
  assert.equal(d.ok,false);
  assert.equal(d.problemas[0].alvo,"./missing.js");
});

test("importação normaliza caminhos e bloqueia artefatos perigosos",()=>{
  const r=normalizarArquivosImportados([
    {path:"src/../app.js",content:"ok"},
    {path:"node_modules/x.js",content:"x"},
    {path:"../segredo.js",content:"x"}
  ]);
  assert.equal(r.files["app.js"],"ok");
  assert.equal(r.rejeitados.length,2);
});
