import assert from 'node:assert/strict';import {createApp} from './server.mjs';
const origin='http://localhost:3000',app=createApp({databasePath:':memory:',origin});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;let cookie='';
const post=(path,data)=>fetch(base+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(data)});
try{
 let r=await post('/api/register',{name:'Prueba',password:'Abcdef'});assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];assert.ok(cookie.startsWith('snake-local='));
 r=await fetch(base+'/',{headers:{Cookie:cookie}});assert.match(await r.text(),/let practice=null/);
 r=await post('/api/progress',{unlocked:3,practiceBest:77});assert.equal(r.status,200);
 r=await fetch(base+'/api/progress',{headers:{Cookie:cookie}});assert.equal((await r.json()).progress.unlocked,3);
 r=await post('/api/arena',{action:'join',clientId:'portable-test-123456789',angle:0,boost:false});assert.equal(r.status,200);const arena=await r.json();assert.equal(arena.bots,8);assert.ok(arena.you);
 r=await post('/api/logout',{});assert.equal(r.status,200);
 r=await post('/api/login',{name:'Prueba',password:'Abcdef'});assert.equal(r.status,200);
 console.log('OK: registro, acceso al juego, progreso, sala con 8 bots, logout y login. Base de prueba en memoria.');
}finally{await app.close()}
