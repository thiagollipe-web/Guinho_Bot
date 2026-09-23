import test from "node:test";
import assert from "node:assert/strict";
import { detectarIntencaoKaggle } from "../kaggle-client.js";

test("detecta dataset na Kaggle",()=>{
  assert.deepEqual(detectarIntencaoKaggle("Procure datasets de Python na Kaggle"),{
    type:"dataset",
    query:"procure datasets de python na kaggle"
  });
});

test("detecta competição",()=>{
  assert.equal(detectarIntencaoKaggle("Quais competições de ML existem na Kaggle?").type,"competition");
});

test("detecta notebook",()=>{
  assert.equal(detectarIntencaoKaggle("Encontre notebooks de visão computacional").type,"notebook");
});

test("ignora pergunta fora da Kaggle",()=>{
  assert.equal(detectarIntencaoKaggle("Como criar um canvas em JavaScript?"),null);
});
