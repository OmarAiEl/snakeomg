export type Progress={color?:string;second?:string;style?:string;head?:string;tail?:string;theme?:number;music?:boolean;sound?:boolean;unlocked?:number;practiceBest?:number;records?:Record<string,{time:number,food:number}>};
export function validateProgress(value:unknown):Progress{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Progreso no válido.');
 const v=value as Record<string,unknown>,out:Progress={};
 for(const key of ['color','second'] as const)if(key in v){if(typeof v[key]!=='string'||!/^#[0-9a-f]{6}$/i.test(v[key] as string))throw Error('Color no válido.');out[key]=v[key] as string}
 for(const key of ['head','tail'] as const)if(key in v){if(typeof v[key]!=='string'||(v[key] as string).length>80)throw Error('Accesorio no válido.');out[key]=v[key] as string}
 if('style' in v){if(!['Color fijo','Degradado','Multicolor'].includes(v.style as string))throw Error('Estilo no válido.');out.style=v.style as string}
 for(const key of ['music','sound'] as const)if(key in v){if(typeof v[key]!=='boolean')throw Error('Ajuste no válido.');out[key]=v[key] as boolean}
 for(const [key,min,max] of [['theme',0,7],['unlocked',1,2000],['practiceBest',0,1000000000]] as const)if(key in v){const n=v[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||!Number.isInteger(n))throw Error('Valor no válido.');out[key]=n}
 if('records' in v){if(!v.records||typeof v.records!=='object'||Array.isArray(v.records)||Object.keys(v.records).length>2000)throw Error('Récords no válidos.');out.records={};for(const [key,record] of Object.entries(v.records)){if(!/^\d{1,4}$/.test(key)||Number(key)>=2000||!record||typeof record!=='object')throw Error('Récord no válido.');const {time,food}=record;if(typeof time!=='number'||typeof food!=='number'||!Number.isFinite(time)||!Number.isFinite(food)||time<0||food<0||time>1e9||food>1e9)throw Error('Récord no válido.');out.records[key]={time,food}}}
 return out;
}
export function mergeProgress(old:Progress,incoming:Progress):Progress{
 const records={...old.records};for(const [key,v] of Object.entries(incoming.records||{})){const prev=records[key];records[key]=prev?{time:Math.min(prev.time,v.time),food:Math.min(prev.food,v.food)}:v}
 return {...old,...incoming,unlocked:Math.max(old.unlocked||1,incoming.unlocked||1),practiceBest:Math.max(old.practiceBest||0,incoming.practiceBest||0),records};
}
export async function storeProgress(db:D1Database,userId:string,incoming:Progress){
 await db.prepare("INSERT INTO player_progress (user_id,data,revision,updated_at) VALUES (?,'{}',0,?) ON CONFLICT(user_id) DO NOTHING").bind(userId,Date.now()).run();
 for(let attempt=0;attempt<5;attempt++){
 const row=await db.prepare('SELECT data,revision FROM player_progress WHERE user_id=?').bind(userId).first<{data:string,revision:number}>();if(!row)throw Error('Perfil no disponible.');
 const progress=mergeProgress(JSON.parse(row.data),incoming);
 const r=await db.prepare('UPDATE player_progress SET data=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=?').bind(JSON.stringify(progress),Date.now(),userId,row.revision).run();if(r.meta.changes)return progress;
 }throw Error('Vuelve a intentar el guardado.');
}
