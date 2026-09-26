import test from"node:test";import assert from"node:assert/strict";import{normalize,similarity,extractEntities}from"../docs/core/nlp.js";import{matchPattern,reflect}from"../docs/core/eliza.js";import{calculate}from"../docs/core/calculator.js";test("nlp",()=>{assert.equal(normalize("Olá, ÁRVORE!"),"ola arvore");assert.ok(similarity("quero ajuda","preciso de ajuda")>.2);assert.ok(extractEntities("dolar e javascript").length>=2)});test("eliza",()=>{const m=matchPattern("* ajuda *","eu preciso de ajuda agora");assert.equal(m.matched,true);assert.deepEqual(m.captures,["eu preciso de","agora"]);assert.equal(reflect("eu quero meu projeto",{eu:"voce",meu:"seu"}),"voce quero seu projeto")});test("eliza engine",async()=>{const{runEliza}=await import("../docs/core/eliza.js");const r=runEliza("estou preocupado com meu projeto",{keywords:[{keyword:"preocupado",precedence:10,rules:[{decomposition:"* preocupado *",reassembly:["o que está te preocupando?"]}]}]});assert.equal(r.response,"o que está te preocupando?")});test("calculator",()=>{assert.equal(calculate("2+3*4"),14);assert.equal(calculate("2+alert(1)"),null)})
test("memory module loads",async()=>{const{Memory}=await import("../docs/core/memory.js");const m=new Memory();m.clear();assert.equal(m.remember("gosto de xadrez"),true);assert.deepEqual(m.recall(),["gosto de xadrez"]);assert.equal(m.forget("gosto de xadrez"),true);assert.deepEqual(m.recall(),[])});
test("memory imports Gemini profile",async()=>{
 const{Memory}=await import("../docs/core/memory.js");
 const m=new Memory();m.clear();
 m.importSnapshot({
  user:{name:"Thiago Fillipe Soares",nickname:"Thigas",role:"Programador"},
  technical_profile:{preferences:{languages:["JavaScript"],tools:["Ollama (Local)"]}},
  active_projects:{guinho_code:"Engine de terminal"},
  gaming_preferences:{style:"retrô 16-bit"}
 });
 const facts=m.recall();
 assert.ok(facts.includes("meu nome e thiago fillipe soares"));
 assert.ok(facts.includes("meu apelido e thigas"));
 assert.ok(facts.includes("programo em javascript"));
 assert.ok(facts.includes("uso ollama local"));
 assert.ok(facts.some(x=>x.includes("projeto guinho code")));
});
