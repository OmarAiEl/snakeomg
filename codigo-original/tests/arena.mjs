import {build} from 'esbuild';import {DatabaseSync} from 'node:sqlite';import {readFileSync,readdirSync} from 'node:fs';import assert from 'node:assert/strict';
await build({entryPoints:['worker/arena-engine.ts','worker/arena.ts'],outdir:'.sites-runtime/arena-test',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const {newArena,advanceArena,arenaView,encodeArena,decodeArena}=await import('../.sites-runtime/arena-test/arena-engine.mjs');
const {arenaFetch}=await import('../.sites-runtime/arena-test/arena.mjs');
const member=(id,angle=0)=>({user_id:id,client_id:'connection-'+id+'-123456789',name:id,angle,boost:0,respawn:0,color:'#b6f560'});
let w=newArena();assert.equal(w.snakes.length,8);assert.ok(w.snakes.every(s=>s.bot));const members=[member('Alice'),member('Bob',Math.PI)];advanceArena(w,members,0);assert.equal(w.snakes.filter(s=>!s.bot).length,2);let a=arenaView(w,'Alice',1),b=arenaView(w,'Bob',1);assert.equal(a.players,2);assert.equal(b.players,2);assert.notEqual(a.you,b.you);assert.equal(a.bots,8);assert.deepEqual(a.portals,b.portals);assert.ok(!JSON.stringify(a).includes('user_id'));
for(let i=0;i<100;i++){w=decodeArena(encodeArena(w));advanceArena(w,members,.1)}assert.equal(w.snakes.filter(s=>s.bot).length,8);
// One shared food item can only be consumed once; movement/food are server-owned.
let alice=w.snakes.find(s=>s.userId==='Alice'),bob=w.snakes.find(s=>s.userId==='Bob');alice.alive=bob.alive=true;alice.buffs={};bob.buffs={};alice.mass=bob.mass=55;alice.grace=bob.grace=3;alice.x=bob.x=3100;alice.y=bob.y=2300;alice.points=[{x:3100,y:2300}];bob.points=[{x:3100,y:2300}];w.food=[{id:999999,x:3100,y:2300,value:1,power:null}];w.spawnClock=5;advanceArena(w,members,.01);assert.equal(alice.mass+bob.mass,111);
// Ghost and portals are retained. Contacts with borders do not kill.
alice.buffs.phase=6;alice.x=3100;alice.y=2300;bob.x=3100;bob.y=2300;alice.grace=bob.grace=0;advanceArena(w,members,.01);assert.equal(alice.alive,true);
alice.alive=false;alice.death='test';const oldId=alice.id;members[0].respawn++;advanceArena(w,members,0);alice=w.snakes.find(s=>s.userId==='Alice');assert.equal(alice.alive,true);assert.notEqual(alice.id,oldId);
advanceArena(w,[members[0]],0);assert.equal(w.snakes.some(s=>s.userId==='Bob'),false);
const sql=new DatabaseSync(':memory:');for(const f of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+f,'utf8'));for(const id of ['Alice','Bob'])sql.prepare('INSERT INTO users VALUES (?,?,?,?,?,?)').run(id,id,id,'salt','hash',0);
const db={prepare(query){let p=[];return {bind(...v){p=v;return this},async first(){return sql.prepare(query).get(...p)||null},async all(){return{results:sql.prepare(query).all(...p)}},async run(){const stmt=sql.prepare(query);if(stmt.columns().length)return {results:stmt.all(...p),meta:{changes:0}};return{results:[],meta:{changes:Number(stmt.run(...p).changes)}}}}},async batch(items){return Promise.all(items.map(x=>x.run()))}};
const origin='https://test.example';let now=Date.now();const originalNow=Date.now;Date.now=()=>now;
async function request(id,action='input',extra={}){now+=150;return arenaFetch(new Request(origin+'/api/arena',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action,clientId:'connection-'+id+'-123456789',angle:0,boost:false,...extra})}),db,{id,name:id})}
assert.equal((await request('Alice','join')).status,200);let response=await request('Bob','join');assert.equal(response.status,200);b=await response.json();a=await(await request('Alice')).json();assert.equal(a.players,2);assert.equal(b.players,2);assert.equal(a.bots,8);assert.ok(a.snakes.some(s=>s.name==='Bob'));
response=await request('Alice','input',{x:999999,mass:999999});a=await response.json();assert.ok(a.snakes.find(s=>s.id===a.you).mass<999999);
assert.equal((await request('Alice','input',{angle:NaN})).status,400);
assert.equal((await request('Alice','input',{clientId:'invalid-client-000000000'})).status,409);
await request('Bob','leave');a=await(await request('Alice')).json();assert.equal(a.players,1);
now+=13000;await request('Bob','join');b=await(await request('Bob')).json();assert.equal(b.players,1);
await request('Bob','join',{clientId:'second-connection-123456'});assert.equal((await request('Bob')).status,409);
Date.now=originalNow;sql.close();console.log('PASS: 2 authenticated accounts share one world, 8 bots, state serialization, single food consumption, respawn, leave, expiry, duplicate tabs and server authority.');
