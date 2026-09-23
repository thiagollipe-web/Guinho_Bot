import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/project-intelligence.js";
import { buildProjectIntelligence, selectRelevantContext, validateProjectSnapshot } from "../project-intelligence.js";

function request(body,options={}){
  const method=options.method||"POST";
  const init={method,headers:{"Content-Type":"application/json","Origin":"https://thiagollipe-web.github.io",...(options.headers||{})}};
  if(!["GET","HEAD","OPTIONS"].includes(method))init.body=options.body===undefined?JSON.stringify(body):options.body;
  return new Request("https://guinho-test.vercel.app/api/project-intelligence",init);
}

test("snapshot rejeita traversal e arquivos protegidos",()=>{
  assert.equal(validateProjectSnapshot({files:{"../x.js":"x"}}).ok,false);
  assert.equal(validateProjectSnapshot({files:{".env":"x"}}).ok,false);
  assert.equal(validateProjectSnapshot({files:{"node_modules/a.js":"x"}}).ok,false);
  assert.equal(validateProjectSnapshot({files:{"app.js":"x"}}).ok,true);
});

test("intelligence encontra entry, linguagens e dependências quebradas",()=>{
  const r=buildProjectIntelligence({name:"Teste",entry:"index.html",request:"interface",files:{
    "index.html":"<script type=\"module\" src=\"./app.js\"></script><link href=\"./styles.css\">",
    "app.js":"import \"./missing.js\";",
    "styles.css":"body{}"
  }});
  assert.equal(r.ok,true);
  assert.equal(r.intelligence.project.entry,"index.html");
  assert.deepEqual(r.intelligence.project.languages,["HTML","JavaScript","CSS"]);
  assert.equal(r.intelligence.dependencies.broken,1);
  assert.ok(r.intelligence.hotspots.length>0);
});

test("contexto seleciona entrada e arquivos relacionados",()=>{
  const files={
    "index.html":"<button id=\"x\">x</button><script src=\"./app.js\"></script>",
    "app.js":"export const x=1;",
    "styles.css":"button{display:block}",
    "docs.md":"texto sem relação"
  };
  const r=buildProjectIntelligence({entry:"index.html",request:"botão interface",files});
  const c=selectRelevantContext({files,request:"botão interface"},r.intelligence);
  assert.ok(c.files.some(x=>x.path==="index.html"));
  assert.ok(c.files.some(x=>x.path==="app.js"));
});

test("endpoint aplica CORS, método e JSON",async()=>{
  const r=await handler(request({files:{"app.js":"export const x=1;"}}));
  assert.equal(r.status,200);
  const data=await r.json();
  assert.equal(data.ok,true);
  assert.equal(data.mode,"project-intelligence");
  assert.equal(data.provider,"local-server");
});

test("endpoint rejeita origem não autorizada",async()=>{
  const r=await handler(request({files:{"app.js":"x"}} ,{headers:{Origin:"https://evil.example"}}));
  assert.equal(r.status,403);
});