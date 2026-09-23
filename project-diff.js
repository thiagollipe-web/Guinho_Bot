function linhas(texto){return String(texto??"").replace(/\r\n/g,"\n").split("\n");}

function diffArquivo(antes,depois,nome="arquivo"){
  const a=linhas(antes),b=linhas(depois);
  const n=a.length,m=b.length;
  const maxCelulas=250000;
  if(n*m>maxCelulas){
    return ["--- a/"+nome,"+++ b/"+nome,"@@","- conteúdo anterior","+",...b.map(x=>"+"+x)].join("\n");
  }
  const dp=Array.from({length:n+1},()=>new Uint32Array(m+1));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  const out=["--- a/"+nome,"+++ b/"+nome,"@@"];
  let i=0,j=0;
  while(i<n&&j<m){
    if(a[i]===b[j]){out.push(" "+a[i]);i++;j++;}
    else if(dp[i+1][j]>=dp[i][j+1])out.push("-"+a[i++]);
    else out.push("+"+b[j++]);
  }
  while(i<n)out.push("-"+a[i++]);
  while(j<m)out.push("+"+b[j++]);
  return out.join("\n");
}
export function gerarDiffProjeto(antes={},depois={}){
  const nomes=[...new Set([...Object.keys(antes||{}),...Object.keys(depois||{})])].sort();
  const diffs=[];
  for(const nome of nomes){
    const existeAntes=Object.prototype.hasOwnProperty.call(antes,nome);
    const existeDepois=Object.prototype.hasOwnProperty.call(depois,nome);
    if(!existeAntes)diffs.push(["--- /dev/null","+++ b/"+nome,"@@",...(linhas(depois[nome]).map(x=>"+"+x))].join("\n"));
    else if(!existeDepois)diffs.push(["--- a/"+nome,"+++ /dev/null","@@",...(linhas(antes[nome]).map(x=>"-"+x))].join("\n"));
    else if(String(antes[nome]??"")!==String(depois[nome]??""))diffs.push(diffArquivo(antes[nome],depois[nome],nome));
  }
  return diffs.join("\n\n");
}
export function resumoDiff(antes={},depois={}){
  const criados=[],removidos=[],alterados=[];
  const nomes=[...new Set([...Object.keys(antes||{}),...Object.keys(depois||{})])].sort();
  for(const nome of nomes){
    if(!(nome in antes)){criados.push(nome);continue;}
    if(!(nome in depois)){removidos.push(nome);continue;}
    if(String(antes[nome]??"")!==String(depois[nome]??""))alterados.push(nome);
  }
  return {criados,removidos,alterados,total:criados.length+removidos.length+alterados.length};
}
