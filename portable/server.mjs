import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {authFetch} from './app.mjs';
const root=dirname(fileURLToPath(import.meta.url));
export function createApp({databasePath=resolve(root,'data/snakeomg.sqlite'),origin='http://localhost:3000'}={}){
 const url=new URL(origin);if(url.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('Usa HTTPS para un dominio público.');
 const local=url.protocol==='http:';if(databasePath!==':memory:')mkdirSync(dirname(databasePath),{recursive:true});
 const sql=new DatabaseSync(databasePath);sql.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS portable_migrations (name TEXT PRIMARY KEY);');
 for(const name of readdirSync(resolve(root,'migrations')).filter(n=>n.endsWith('.sql')).sort()){
  if(sql.prepare('SELECT name FROM portable_migrations WHERE name=?').get(name))continue;
  sql.exec('BEGIN');try{sql.exec(readFileSync(resolve(root,'migrations',name),'utf8'));sql.prepare('INSERT INTO portable_migrations VALUES (?)').run(name);sql.exec('COMMIT')}catch(e){sql.exec('ROLLBACK');throw e}
 }
 const db={prepare(query){let values=[];return{bind(...v){values=v;return this},async first(){return sql.prepare(query).get(...values)||null},async all(){return{results:sql.prepare(query).all(...values)}},execute(){const stmt=sql.prepare(query);if(stmt.columns().length)return{results:stmt.all(...values),meta:{changes:0}};return{results:[],meta:{changes:Number(stmt.run(...values).changes)}}} ,async run(){return this.execute()}}},async batch(items){sql.exec('BEGIN');try{const result=items.map(s=>s.execute());sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}}};
 const server=http.createServer(async(req,res)=>{try{
  if(req.url==='/healthz'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok');return}
  const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>140000){res.writeHead(413);res.end('Solicitud demasiado grande');return}chunks.push(c)}
  const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v!==undefined)headers.set(k,Array.isArray(v)?v.join(', '):v);
  headers.set('CF-Connecting-IP',req.socket.remoteAddress||'unknown');
  if(local)headers.set('Cookie',(headers.get('Cookie')||'').replace(/(^|;\s*)snake-local=/g,'$1__Host-snake-session-v2='));
  const request=new Request(new URL(req.url,origin),{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
  const response=await authFetch(request,{DB:db})||new Response('No encontrado',{status:404});
  res.statusCode=response.status;for(const [key,value]of response.headers){let v=value;if(local&&key==='set-cookie')v=v.replace('__Host-snake-session-v2=','snake-local=').replace('; Secure','').replace('; SameSite=None','; SameSite=Lax').replace('; Partitioned','');res.setHeader(key,v)}
  res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500,{'Content-Type':'text/plain'});res.end('Error interno');}});
 return{server,close:()=>new Promise(r=>server.close(()=>{sql.close();r()}))};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
 const app=createApp({databasePath:process.env.DATABASE_PATH,origin:process.env.PUBLIC_ORIGIN||`http://localhost:${port}`});
 app.server.listen(port,host,()=>console.log(`SnakeOMG listo en ${process.env.PUBLIC_ORIGIN||`http://localhost:${port}`}`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit(0)));
}
