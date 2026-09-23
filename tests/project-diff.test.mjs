import test from "node:test";
import assert from "node:assert/strict";
import { gerarDiffProjeto, resumoDiff } from "../project-diff.js";

test("diff detecta criação, alteração e remoção por arquivo",()=>{
  const antes={
    "index.html":"<h1>Guinho</h1>",
    "app.js":"const a=1;"
  };
  const depois={
    "index.html":"<h1>Guinho Coder</h1>",
    "style.css":"body{}"
  };
  const resumo=resumoDiff(antes,depois);
  assert.deepEqual(resumo,{criados:["style.css"],removidos:["app.js"],alterados:["index.html"],total:3});
  const diff=gerarDiffProjeto(antes,depois);
  assert.match(diff,/--- a\/index\.html/);
  assert.match(diff,/\+<h1>Guinho Coder<\/h1>/);
  assert.match(diff,/--- a\/app\.js/);
  assert.match(diff,/\+\+\+ b\/style\.css/);
});

test("diff preserva linhas iguais e marca exclusões/inclusões",()=>{
  const diff=gerarDiffProjeto({"app.js":"const a=1;\nconst b=2;"},{"app.js":"const a=1;\nconst b=3;"});
  assert.match(diff,/ const a=1;/);
  assert.match(diff,/-const b=2;/);
  assert.match(diff,/\+const b=3;/);
});

test("diff vazio quando projeto não mudou",()=>{
  assert.equal(gerarDiffProjeto({"app.js":"ok"},{"app.js":"ok"}),"");
  assert.deepEqual(resumoDiff({"app.js":"ok"},{"app.js":"ok"}),{criados:[],removidos:[],alterados:[],total:0});
});
