import express from "express";
import helmet from "helmet";
const app=express();
const port=Number(process.env.PORT||3000);
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.static("public"));
app.get("/api/health",(_req,res)=>res.json({ok:true,mode:"client-side-local-pnl",aiApi:false}));
app.listen(port,"0.0.0.0",()=>console.log(`Guinho-Bot online na porta ${port}`));
