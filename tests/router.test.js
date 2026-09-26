import test from "node:test";
import assert from "node:assert/strict";
import { route } from "../docs/core/router.js";

function makeMemory(){
  return {
    facts:["meu nome e thiago"],
    learned:[{pattern:"teste",responses:["funcionando"]}],
    remember(v){this.facts.push(v);},
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
