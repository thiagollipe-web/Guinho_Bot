const CODE_TERMS=/\b(?:code|código|codigo|script|programa|programação|programacao|função|funcao|classe|algoritmo|html|css|javascript|typescript|python|java|rust|php|sql|json|canvas|node(?:\.js)?|react|vite)\b/i;
const CPP_TERM=/(?:^|\W)c\+\+(?:$|\W)/i;
const CSHARP_TERM=/(?:^|\W)c#(?:$|\W)/i;

export function pedidoDeCodigo(texto=""){
  const value=String(texto??"").trim();
  if(!value)return false;
  return CODE_TERMS.test(value)||CPP_TERM.test(value)||CSHARP_TERM.test(value)||/```[\s\S]*```/.test(value)||/<(?:!doctype|html|head|body|script|canvas|style)\b/i.test(value);
}
