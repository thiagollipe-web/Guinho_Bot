function tokenize(expression) {
  const source = String(expression ?? "").replace(/\s+/g, "");
  const parts = source.replace(/,/g, ".").match(/\d+(?:\.\d+)?|[()+\-*/%]/g);
  if (!parts || parts.join("") !== source.replace(/,/g, ".")) return null;
  return parts;
}

function calculate(expression) {
  const parts = tokenize(expression);
  if (!parts) return null;
  let index = 0;

  function expressionRule() {
    let value = term();
    while (parts[index] === "+" || parts[index] === "-") {
      const op = parts[index++];
      const right = term();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }

  function term() {
    let value = factor();
    while (["*", "/", "%"].includes(parts[index])) {
      const op = parts[index++];
      const right = factor();
      if (op === "/" && right === 0) throw new Error("divisão por zero");
      if (op === "*") value *= right;
      if (op === "/") value /= right;
      if (op === "%") value %= right;
    }
    return value;
  }

  function factor() {
    if (parts[index] === "+") { index++; return factor(); }
    if (parts[index] === "-") { index++; return -factor(); }
    if (parts[index] === "(") {
      index++;
      const value = expressionRule();
      if (parts[index++] !== ")") throw new Error("parênteses inválidos");
      return value;
    }
    const value = Number(parts[index++]);
    if (!Number.isFinite(value)) throw new Error("número inválido");
    return value;
  }

  try {
    const value = expressionRule();
    return index === parts.length && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function extractCalculation(text) {
  const match = String(text).match(/(?:quanto é|quanto e|calcule|calcular|resultado de)\s+([\d\s,().+\-*%/]+)/i);
  return match ? match[1].trim() : null;
}

export { calculate, extractCalculation };