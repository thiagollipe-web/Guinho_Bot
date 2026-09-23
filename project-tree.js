const MAX_TREE_DEPTH = 8;

function normalizarNome(path = "") {
  return String(path || "").replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "");
}

function ordenarArquivos(files = {}) {
  return Object.keys(files || {}).map(normalizarNome).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

export function gerarArvoreProjeto(files = {}) {
  const root = { name: "Projeto", path: "", type: "folder", children: [], depth: 0 };
  const index = new Map([["", root]]);
  for (const file of ordenarArquivos(files)) {
    const partes = file.split("/").slice(0, MAX_TREE_DEPTH);
    let parent = root;
    let path = "";
    partes.forEach((part, i) => {
      path = path ? path + "/" + part : part;
      const isFile = i === partes.length - 1;
      let node = index.get(path);
      if (!node) {
        node = { name: part, path, type: isFile ? "file" : "folder", children: [], depth: i + 1 };
        index.set(path, node);
        parent.children.push(node);
      }
      parent = node;
    });
  }
  const sort = node => {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sort);
  };
  sort(root);
  return root;
}

export function achatarArvore(arvore) {
  const out = [];
  function visit(node) {
    if (node.path) out.push({ path: node.path, name: node.name, type: node.type, depth: node.depth });
    (node.children || []).forEach(visit);
  }
  visit(arvore || {});
  return out;
}
