import {newArena,encodeArena,decodeArena,advanceArena,arenaView} from './arena-engine';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function arenaFetch(request:Request,db:D1Database,user:{id:string,name:string}){
 if(request.method!=='POST')return reply({error:'Método no permitido.'},405);
 const url=new URL(request.url);if(request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'Solicitud no permitida.'},403);
 const raw=await request.text();if(raw.length>2048)return reply({error:'Solicitud demasiado grande.'},413);
 let body;try{body=JSON.parse(raw)}catch{return reply({error:'Solicitud no válida.'},400)}
 if(!body||!['join','input','respawn','leave'].includes(body.action)||typeof body.clientId!=='string'||!/^[a-zA-Z0-9-]{16,64}$/.test(body.clientId)||typeof body.angle!=='number'||!Number.isFinite(body.angle)||Math.abs(body.angle)>Math.PI*2||typeof body.boost!=='boolean')return reply({error:'Controles no válidos.'},400);
 const now=Date.now();
 if(body.action==='leave'){await db.prepare('DELETE FROM arena_members WHERE user_id=? AND client_id=?').bind(user.id,body.clientId).run();return reply({ok:true})}
 if(body.action==='join'){
 const profile=await db.prepare('SELECT data FROM player_progress WHERE user_id=?').bind(user.id).first<{data:string}>();const p=profile?JSON.parse(profile.data):{};const appearance=JSON.stringify({color:p.color||'#b6f560',second:p.second||'#59b8ff',style:p.style||'Degradado',head:p.head||'Nada',tail:p.tail||'Nada'});
 await db.prepare('INSERT INTO arena_members (user_id,client_id,name,angle,boost,seen_at,respawn,appearance) VALUES (?,?,?,?,?,?,0,?) ON CONFLICT(user_id) DO UPDATE SET client_id=excluded.client_id,name=excluded.name,angle=excluded.angle,boost=0,seen_at=excluded.seen_at,respawn=0,appearance=excluded.appearance').bind(user.id,body.clientId,user.name,body.angle,0,now,appearance).run();
 }else{
 const result=await db.prepare('UPDATE arena_members SET angle=?,boost=?,seen_at=?,respawn=respawn+? WHERE user_id=? AND client_id=?').bind(body.angle,body.boost?1:0,now,body.action==='respawn'?1:0,user.id,body.clientId).run();
 if(!result.meta.changes)return reply({error:'La conexión a la sala ha terminado o se abrió en otra pestaña.',rejoin:true},409);
 }
 if(body.action==='join')await db.prepare("INSERT INTO arena_room (id,data,updated_at,revision,lease,lease_until) VALUES ('main',?,?,0,'',0) ON CONFLICT(id) DO NOTHING").bind(encodeArena(newArena()),Date.now()).run();
 const tickNow=Date.now(),lease=crypto.randomUUID();
 // D1 executes this batch in order in one transaction and one round trip.
 const batch=await db.batch([
 db.prepare("UPDATE arena_room SET lease=?,lease_until=? WHERE id='main' AND lease_until<=? AND (updated_at<=? OR ?=1)").bind(lease,tickNow+3000,tickNow,tickNow-60,body.action==='join'||body.action==='respawn'?1:0),
 db.prepare("SELECT * FROM arena_room WHERE id='main'"),
 db.prepare('SELECT * FROM arena_members WHERE seen_at>=?').bind(tickNow-12000)
 ]);
 let row:any=batch[1].results[0],world:any;
 if(!row)return reply({error:'Vuelve a entrar en la sala.',rejoin:true},409);
 if(batch[0].meta.changes){try{
 const members=batch[2] as D1Result<any>;
 world=decodeArena(row.data);advanceArena(world,members.results.map(m=>({...m,...JSON.parse(m.appearance),boost:tickNow-m.seen_at<1500?m.boost:0})),(tickNow-row.updated_at)/1000);
 const data=encodeArena(world);
 const committed=await db.prepare("UPDATE arena_room SET data=?,updated_at=?,revision=revision+1,lease='',lease_until=0 WHERE id='main' AND lease=?").bind(data,tickNow,lease).run();
 if(committed.meta.changes)row={data,updated_at:tickNow,revision:row.revision+1};else {world=null;row=await db.prepare("SELECT * FROM arena_room WHERE id='main'").first<any>();}
 }catch(error){await db.prepare("UPDATE arena_room SET lease='',lease_until=0 WHERE id='main' AND lease=?").bind(lease).run();throw error}}
 return reply({...arenaView(world||decodeArena(row.data),user.id,row.revision),snapshotAt:row.updated_at,serverNow:Date.now()});
}
