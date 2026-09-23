import { buildProjectIntelligence, selectRelevantContext } from "../project-intelligence.js";

const MAX_BODY_BYTES=128*1024;
const DEFAULT_ORIGIN="https://thiagollipe-web.github.io";

function json(data,status,headers={}){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...headers}});}
function corsHeaders(request){
  const configured=String(process.env.CORS_ORIGIN||DEFAULT_ORIGIN).trim();
  const origin=request.headers.get("origin");
  const vercelOrigin=process.env.VERCEL_URL?`https://${String(process.env.VERCEL_URL).trim()}`:"";
  const allowed=new Set([configured,vercelOrigin].filter(Boolean));
  if(origin&&allowed.size&&!allowed.has(origin))return null;
  return origin&&allowed.has(origin)?{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Vary":"Origin"}:{};
}
function error(message,status,retryable=false,headers={}){return json({ok:false,error:message,retryable},status,headers);}

export default async function handler(request){
  const headers=corsHeaders(request);
  if(headers===null)return error("Origem não autorizada.",403,false);
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Max-Age":"600",...headers}});
  if(request.method!=="POST")return error("Método não permitido. Use POST.",405,false,{Allow:"POST, OPTIONS",...headers});
  const contentType=String(request.headers.get("content-type")||"").toLowerCase();
  if(!contentType.includes("application/json"))return error("Content-Type deve ser application/json.",415,false,headers);
  const length=Number.parseInt(request.headers.get("content-length")||"",10);
  if(Number.isFinite(length)&&length>MAX_BODY_BYTES)return error("Payload excede o limite permitido.",413,false,headers);
  let raw;
  try{raw=await request.text();}catch{return error("Não foi possível ler a requisição.",400,false,headers);}
  if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return error("Payload excede o limite permitido.",413,false,headers);
  let body;
  try{body=JSON.parse(raw);}catch{return error("JSON inválido.",400,false,headers);}
  const result=buildProjectIntelligence(body);
  if(!result.ok)return error(result.error,result.status,false,headers);
  const context=selectRelevantContext(body,result.intelligence);
  return json({ok:true,mode:"project-intelligence",intelligence:result.intelligence,context,provider:"local-server"},200,headers);
}