import {arenaFetch} from './arena';
import {validateProgress,storeProgress} from './progress';
import {authPage} from './auth-page';
import {gameHtml} from './game-html';
const enc=new TextEncoder();
const hex=(v:ArrayBuffer)=>Array.from(new Uint8Array(v),b=>b.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
const digest=async(s:string)=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
export async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(salt),iterations:100000},key,256))}
const eq=(a:string,b:string)=>{let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0};
const cookie=(token:string,age=2592000)=>'__Host-snake-session-v2='+token+'; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age='+age;
const response=(body:string,status=200,type='text/html; charset=utf-8',extra:Record<string,string>={})=>new Response(body,{status,headers:{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin',...extra}});
const json=(data:unknown,status=200,extra:Record<string,string>={})=>response(JSON.stringify(data),status,'application/json',extra);
const tokenOf=(r:Request)=>(r.headers.get('Cookie')||'').match(/(?:^|;\s*)__Host-snake-session-v2=([a-f0-9]{64})(?:;|$)/)?.[1];
const safeJSON=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c');
export async function authFetch(request:Request,env:Cloudflare.Env):Promise<Response|null>{
 const url=new URL(request.url),path=url.pathname;if(path!=='/'&&!path.startsWith('/api/'))return null;
 const db=env.DB;if(!db)return json({error:'La base de datos no está disponible.'},503);
 try{
 if(request.method==='GET'&&path==='/'){
 const token=tokenOf(request);const user=token?await db.prepare('SELECT users.id, users.name FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?').bind(await digest(token),Date.now()).first<{id:string,name:string}>():null;
 const profile=user?await db.prepare('SELECT data FROM player_progress WHERE user_id=?').bind(user.id).first<{data:string}>():null;
 return response(user?gameHtml.replace(/__PLAYER_(ID|NAME|PROGRESS)_JSON__/g,(_,key)=>safeJSON(key==='ID'?user.id:key==='NAME'?user.name:profile?JSON.parse(profile.data):null)):authPage);
 }
 if(path==='/api/arena'){
 const token=tokenOf(request);const user=token?await db.prepare('SELECT users.id,users.name FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?').bind(await digest(token),Date.now()).first<{id:string,name:string}>():null;
 if(!user)return json({error:'Inicia sesión para entrar en la sala.'},401);
 return await arenaFetch(request,db,user);
 }
 if(path==='/api/session'){
 if(request.method!=='GET')return json({error:'Método no permitido.'},405);
 const token=tokenOf(request);const user=token?await db.prepare('SELECT users.id,users.name FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?').bind(await digest(token),Date.now()).first<{id:string,name:string}>():null;
 return user?json({authenticated:true,name:user.name}):json({authenticated:false,error:'El navegador no ha conservado la sesión.'},401);
 }
 if(path==='/api/progress'){
 const token=tokenOf(request);const session=token?await db.prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?').bind(await digest(token),Date.now()).first<{user_id:string}>():null;
 if(!session)return json({error:'Tu sesión ha caducado. Vuelve a iniciar sesión.'},401);
 if(request.method==='GET'){const profile=await db.prepare('SELECT data FROM player_progress WHERE user_id=?').bind(session.user_id).first<{data:string}>();return json({progress:profile?JSON.parse(profile.data):null})}
 if(request.method!=='POST')return json({error:'Método no permitido.'},405);
 if(request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Solicitud no permitida.'},403);
 const raw=await request.text();if(raw.length>131072)return json({error:'Progreso demasiado grande.'},413);
 let data;try{data=validateProgress(JSON.parse(raw))}catch{return json({error:'Progreso no válido.'},400)}
 return json({progress:await storeProgress(db,session.user_id,data)});
 }
 if(!['/api/login','/api/register','/api/logout'].includes(path))return json({error:'Ruta no encontrada.'},404);
 if(request.method!=='POST')return json({error:'Método no permitido.'},405);
 if(request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Solicitud no permitida.'},403);
 if(path==='/api/logout'){const token=tokenOf(request);if(token)await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();return json({ok:true},200,{'Set-Cookie':cookie('',0)})}
 const raw=await request.text();if(raw.length>4096)return json({error:'Solicitud demasiado grande.'},413);
 let body;try{body=JSON.parse(raw)}catch{return json({error:'Solicitud no válida.'},400)}
 if(typeof body.name!=='string'||typeof body.password!=='string')return json({error:'Introduce un nombre y una contraseña.'},400);
 const name=body.name.normalize('NFKC').trim(),nameKey=name.toLowerCase(),password=body.password;
 if(!name||Array.from(name).length>40||/[\p{Cc}\p{Cf}]/u.test(name)||password.length>128)return json({error:'Nombre o contraseña no válidos. El nombre admite hasta 40 caracteres.'},400);
 const now=Date.now();
 for(const key of ['ip:'+await digest(request.headers.get('CF-Connecting-IP')||'unknown'),'name:'+await digest(nameKey)]){
 const row=await db.prepare('INSERT INTO auth_limits (key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END, reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END RETURNING count').bind(key,now+600000,now,now,now+600000).first<{count:number}>();
 if(row&&row.count>(key.startsWith('ip:')?100:15))return json({error:'Demasiados intentos. Espera 10 minutos.'},429,{'Retry-After':'600'});
 }
 let id:string;
 if(path==='/api/register'){
 if(Array.from(password).length<6||!(/\p{Lu}/u.test(password)))return json({error:'La contraseña necesita al menos 6 caracteres y una mayúscula.'},400);
 id=crypto.randomUUID();const salt=random(),hash=await passwordHash(password,salt);
 const result=await db.prepare('INSERT INTO users (id,name,name_key,salt,password_hash,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(name_key) DO NOTHING').bind(id,name,nameKey,salt,hash,now).run();
 if(!result.meta.changes)return json({error:'Ese nombre ya está registrado. Elige otro.'},409);
 }else{
 const user=await db.prepare('SELECT id,salt,password_hash FROM users WHERE name_key=?').bind(nameKey).first<{id:string,salt:string,password_hash:string}>();
 const hash=await passwordHash(password,user?.salt||'00000000000000000000000000000000');
 if(!user)return json({error:'Esta cuenta no existe'},401);
 if(!eq(hash,user.password_hash))return json({error:'La contraseña es incorrecta.'},401);id=user.id;
 }
 const token=random();await db.batch([db.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(now),db.prepare('DELETE FROM auth_limits WHERE reset_at<=?').bind(now),db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').bind(await digest(token),id,now+2592000000)]);
 return json({ok:true},200,{'Set-Cookie':cookie(token)});
 }catch{return json({error:'No se pudo completar la solicitud. Inténtalo de nuevo.'},503)}
}
