const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/home/user/hes/hesabat-backend';
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
http.createServer((req,res)=>{
  let u=decodeURIComponent(req.url.split('?')[0]); if(u==='/')u='/Hesabat.html';
  const f=path.join(ROOT,u);
  if(!f.startsWith(ROOT)){res.writeHead(403);res.end();return;}
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end('nf');return;} res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});res.end(d); });
}).listen(8931,'0.0.0.0',()=>console.log('up 8931'));
