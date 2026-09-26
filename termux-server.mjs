import http from "node:http";
import { kaggleHandler } from "./kaggle-mcp.js";
import chatHandler from "./api/chat.js";

const HOST=process.env.GUINHO_HOST||"127.0.0.1";
const PORT=Number(process.env.GUINHO_PORT||8787);

function responseHeaders(response){
  return Object.fromEntries(response.headers.entries());
}

const server=http.createServer(async(req,res)=>{
  try{
    if(req.method==="GET"&&req.url==="/health"){
      res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});
      res.end(JSON.stringify({
        ok:true,
        service:"guinho-gateway",
        platform:"android-termux",
        kaggle:Boolean(process.env.KAGGLE_API_TOKEN),
        groq:Boolean(process.env.GROQ_API_KEY)
      }));
      return;
    }

    if(req.url==="/api/chat"){
      const chunks=[];
      for await(const chunk of req)chunks.push(chunk);
      const body=Buffer.concat(chunks).toString("utf8");
      const request=new Request(`http://${HOST}:${PORT}${req.url}`,{
        method:req.method,
        headers:req.headers,
        body:["GET","HEAD"].includes(req.method)?undefined:body
      });
      const response=await chatHandler(request);
      res.writeHead(response.status,responseHeaders(response));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }

    if(req.url==="/api/kaggle"){
      const chunks=[];
      for await(const chunk of req)chunks.push(chunk);
      const body=Buffer.concat(chunks).toString("utf8");

      const request=new Request(`http://${HOST}:${PORT}${req.url}`,{
        method:req.method,
        headers:req.headers,
        body:["GET","HEAD"].includes(req.method)?undefined:body
      });

      const response=await kaggleHandler(request);
      res.writeHead(response.status,responseHeaders(response));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }

    res.writeHead(404,{"Content-Type":"application/json; charset=utf-8"});
    res.end(JSON.stringify({ok:false,error:"Rota não encontrada"}));
  }catch(error){
    console.error("[GUINHO]",error);
    res.writeHead(500,{"Content-Type":"application/json; charset=utf-8"});
    res.end(JSON.stringify({ok:false,error:"Erro interno do Gateway"}));
  }
});

server.listen(PORT,HOST,()=>{
  console.log("");
  console.log("GUINHO ANDROID SERVER");
  console.log(`Local:  http://${HOST}:${PORT}`);
  console.log(`Health: http://${HOST}:${PORT}/health`);
  console.log(`Chat:   http://${HOST}:${PORT}/api/chat`);
  console.log(`Kaggle: http://${HOST}:${PORT}/api/kaggle`);
  console.log(`Groq:   ${process.env.GROQ_API_KEY?"configurado":"ausente"}`);
  console.log(`Kaggle: ${process.env.KAGGLE_API_TOKEN?"configurado":"ausente"}`);
  console.log("");
});
