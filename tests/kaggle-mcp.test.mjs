import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeAction,
  normalizeToolArguments,
  parseMcpResponseText
} from "../kaggle-mcp.js";

test("normaliza argumentos Kaggle simples para o envelope request", () => {
  assert.deepEqual(
    normalizeToolArguments({ search: "python" }),
    { request: { search: "python" } }
  );
});

test("preserva argumentos que já usam request", () => {
  const args = { request: { search: "python" } };

  assert.deepEqual(normalizeToolArguments(args), args);
});

test("normaliza uma ação call sem exigir que o cliente conheça o envelope MCP", () => {
  const result = normalizeAction({
    action: "call",
    name: "search_datasets",
    arguments: { search: "python" }
  });

  assert.equal(result.ok, true);
  assert.equal(result.name, "search_datasets");
  assert.deepEqual(result.arguments, {
    request: { search: "python" }
  });
});

test("parseia resposta MCP JSON mesmo quando content-type é SSE", () => {
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    result: {
      tools: [
        { name: "search_datasets" }
      ]
    }
  };

  assert.deepEqual(parseMcpResponseText(JSON.stringify(payload)), payload);
});

test("parseia resposta SSE com evento data", () => {
  const payload = {
    jsonrpc: "2.0",
    id: 2,
    result: {
      content: [
        { type: "text", text: "resultado" }
      ]
    }
  };

  const sse = [
    "event: message",
    `data: ${JSON.stringify(payload)}`,
    ""
  ].join("\n");

  assert.deepEqual(parseMcpResponseText(sse), payload);
});

test("parseia SSE com mais de uma linha data", () => {
  const sse = [
    "event: message",
    "data: {\"jsonrpc\":\"2.0\",",
    "data: \"id\":3,\"result\":{\"tools\":[]}}",
    ""
  ].join("\n");

  assert.deepEqual(parseMcpResponseText(sse), {
    jsonrpc: "2.0",
    id: 3,
    result: { tools: [] }
  });
});

test("retorna null para payload MCP ilegível", () => {
  assert.equal(parseMcpResponseText("data: nao-e-json"), null);
});
