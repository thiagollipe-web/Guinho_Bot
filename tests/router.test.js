import test from "node:test";
import assert from "node:assert/strict";
import { route } from "../docs/core/router.js";

function makeMemory(){
  return {
    facts:["meu nome e thiago"],
    learned:[{pattern:"teste",responses:["funcionando"]}],
    remember(v){this.facts.push(v);},
    forget(v){const i=this.facts.indexOf(v);if(i<0)return false;this.facts.splice(i,1);return true;},
    learn(p,r){this.learned.push({pattern:p,responses:[r]});},
    findLearned(){return null;},
    recall(){return [...this.facts];}
  };
}

const agent={
  memory:null,
  knowledge:{
    training:{intents:[]},
    findConcept(){return null;}
  },
  rules:{keywords:[],default:["fallback"]},
  references:[]
};

test("router recalls a stored fact",()=>{
  const memory=makeMemory();
  const r=route("Você lembra de mim?",{...agent,memory});
  assert.equal(r.source,"memory");
  assert.match(r.response,/thiago/);
});

test("router stores explicit facts",()=>{
  const memory=makeMemory();
  const r=route("lembre que gosto de xadrez",{...agent,memory});
  assert.equal(r.source,"memory");
  assert.equal(memory.facts.at(-1),"gosto de xadrez");
});

test("router recognizes a learned response rule",()=>{
  const memory=makeMemory();
  memory.findLearned=()=>({item:{responses:["funcionando"]},score:1});
  const r=route("teste",{...agent,memory});
  assert.equal(r.source,"learned");
  assert.equal(r.response,"funcionando");
});

test("router does not expose a source unless requested",()=>{
  const memory=makeMemory();
  const r=route("o que é javascript?",{
    memory,
    knowledge:{training:{intents:[]},findConcept(){return{concept:{response:"JavaScript é uma linguagem."},score:1};}},
    rules:{keywords:[],default:["fallback"]},
    references:[]
  });
  assert.equal(r.response,"JavaScript é uma linguagem.");
  assert.equal(r.source,"knowledge");
});


test("router answers the stored name",()=>{
  const memory=makeMemory();
  const r=route("qual é meu nome?",{...agent,memory});
  assert.equal(r.source,"memory");
  assert.match(r.response,/Meu nome é thiago/i);
});

test("router accepts the unaccented name question",()=>{
  const memory=makeMemory();
  const r=route("qual e meu nome?",{...agent,memory});
  assert.equal(r.source,"memory");
  assert.match(r.response,/Meu nome é thiago/i);
});

test("router keeps the assistant identity as Guinho",()=>{
  const memory=makeMemory();
  const r=route("quem é você?",{...agent,memory});
  assert.equal(r.source,"identity");
  assert.match(r.response,/Guinho/);
  assert.doesNotMatch(r.response,/Thiago/);
});

test("router removes an exact stored fact",()=>{
  const memory=makeMemory();
  const r=route("esqueça meu nome e thiago",{...agent,memory});
  assert.equal(r.source,"memory");
  assert.equal(memory.facts.includes("meu nome e thiago"),false);
});

test("router recalls facts by topic",()=>{
  const memory=makeMemory();
  memory.facts=["gosto de xadrez","estou criando um jogo","tenho uma filha"];
  memory.recall=(query)=>query==="programacao"?["estou criando um jogo"]:["meu nome e thiago"];
  const r=route("o que você lembra sobre programação?",{...agent,memory});
  assert.equal(r.source,"memory");
  assert.match(r.response,/estou criando um jogo/);
});

test("router learns the user name from a natural declaration",()=>{
  const memory=makeMemory();
  memory.facts=[];
  const r=route("meu nome é Thiago",{...agent,memory});
  assert.equal(r.source,"memory");
  assert.equal(memory.facts.at(-1),"meu nome e thiago");
});
