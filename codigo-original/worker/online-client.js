// One shared online room. Practice remains local and keeps its original rules.
let online=null;
const localPracticeStart=startPractice,localPracticeStop=stopPractice,localPracticeUpdate=updatePractice,localPracticeEnter=enterPractice,localPracticePause=pausePractice,localPracticeHUD=practiceHUD;
const escapeArenaName=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
stopPractice=function(){leaveOnline();localPracticeStop()};
startPractice=function(){leaveOnline();localPracticeStart()};
function leaveOnline(){const o=online;if(!o)return;online=null;clearTimeout(o.timer);if(o.joined)fetch('/api/arena',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'leave',clientId:o.clientId,angle:0,boost:false}),keepalive:true}).catch(()=>{});}
function startOnline(){leaveOnline();localPracticeStart();online={clientId:crypto.randomUUID(),joined:false,version:-1,timer:null,pending:false,failed:0,lastSnapshot:0,previous:new Map(),target:null,transition:1,stats:null,overlay:true,dead:false};
 document.querySelector('.game-top .stat').innerHTML='MULTIJUGADOR ONLINE<b>Sala compartida</b>';
 $('#practice-board').setAttribute('aria-label','Arena multijugador online');
 document.querySelector('.game-top button:last-child').textContent='☰';
 $('#practice-ranking').textContent='Una sala · Todos los jugadores · 8 bots';
 $('#practice-overlay').innerHTML='<div class="modal"><div class="eyebrow">SALA COMPARTIDA · 8 BOTS</div><h2>Entra en la arena.</h2><p>Juega con otros usuarios conectados. Come, crece y protege tu cabeza. Los bots llevan la etiqueta BOT.</p><p>Ratón, flechas o WASD para girar. Espacio para esprintar. Imán, estrella ×3, fantasma y portales.</p><p>La sala sigue en marcha al abrir el menú. Tu serpiente sale al abandonar la sala.</p><button class="primary" onclick="joinOnline()">ENTRAR A LA SALA →</button><button onclick="multiplayerMenu()">Volver</button></div>';
 $('#practice-notice').textContent='Conecta para ver los jugadores de la sala';
}
async function joinOnline(){const o=online;if(!o||o.joined||o.pending)return;audio();o.pending=true;$('#practice-overlay').innerHTML='<div class="modal"><h2>Entrando en la sala…</h2><p>Sincronizando jugadores y mapa.</p><button onclick="multiplayerMenu()">Cancelar</button></div>';
 try{save();await flushProgress();const data=await onlineRequest(o,'join');if(online!==o)return;o.joined=true;o.overlay=false;$('#practice-overlay').hidden=true;practice.state='play';onlineSnapshot(data);$('#practice-board').focus({preventScroll:true});o.timer=setTimeout(()=>onlinePoll(o),16)}catch(e){if(online!==o)return;$('#practice-overlay').innerHTML='<div class="modal"><h2>No se pudo entrar</h2><p>'+escapeArenaName(e.message)+'</p><button onclick="joinOnline()">Reintentar</button><button onclick="multiplayerMenu()">Volver</button></div>'}finally{o.pending=false}}
async function onlineRequest(o,action){const sent=performance.now();const angle=practice?.input?.angle||0;const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),7000);try{const response=await fetch('/api/arena',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,clientId:o.clientId,angle:Math.atan2(Math.sin(angle),Math.cos(angle)),boost:!!practice?.input?.boost&&!document.hidden}),signal:controller.signal});const data=await response.json();if(!response.ok){const e=new Error(data.error||'Error de conexión');e.status=response.status;throw e}o.rtt=performance.now()-sent;return data}finally{clearTimeout(timeout)}}
async function onlinePoll(o){if(online!==o||!o.joined||o.pending)return;o.pending=true;try{const action=o.respawnRequested?'respawn':'input';const data=await onlineRequest(o,action);if(action==='respawn')o.respawnRequested=false;if(online!==o)return;o.failed=0;onlineSnapshot(data)}catch(e){if(online!==o)return;o.failed++;practice.input.boost=false;$('#practice-notice').textContent='Conexión interrumpida · reintentando…';if(e.status===401||e.status===409){o.joined=false;$('#practice-overlay').hidden=false;$('#practice-overlay').innerHTML='<div class="modal"><h2>Conexión cerrada</h2><p>'+escapeArenaName(e.message)+'</p><button onclick="multiplayerMenu()">Volver a los modos</button></div>'}}finally{o.pending=false;if(online===o&&o.joined)o.timer=setTimeout(()=>onlinePoll(o),o.failed?1200:16)}}
function onlineSnapshot(data){const o=online;if(!o||data.version<o.version)return;o.lastSnapshot=performance.now();o.stats=data;if(data.version===o.version)return;o.version=data.version;
 if(!data.you){$('#practice-notice').textContent='Preparando tu serpiente…';return}
 const previous=new Map((practice.snakes||[]).map(s=>[s.serverId??s.id,s]));
 const snakes=data.snakes.map(s=>({...s,serverId:s.id,id:s.id===data.you?0:s.id,targetPoints:s.points.map(p=>({...p})),points:s.points.map(p=>({...p}))})).sort((a,b)=>a.id===0?-1:b.id===0?1:0);
 for(const s of snakes){const prev=previous.get(s.serverId);if(prev&&prev.alive&&s.alive&&Math.hypot(prev.x-s.x,prev.y-s.y)<350){s.fromPoints=s.targetPoints.map((p,i)=>prev.points[i]?{...prev.points[i]}:{...p});s.fromAngle=prev.angle;s.targetAngle=s.angle}else{s.fromPoints=s.targetPoints.map(p=>({...p}));s.fromAngle=s.angle;s.targetAngle=s.angle}}
 const first=!o.target,input=practice.input,camera=first?{x:snakes[0].x,y:snakes[0].y}:practice.camera;
 practice={...practice,...data,snakes,input,camera,foodGrid:new ArenaGrid(160),bodyGrid:new ArenaGrid(70),lasers:[],pads:[],sparks:[],noticeTime:0};pRebuildFood(practice);o.target=data;o.transition=0;o.predictedAge=0;const lead=Math.min(.25,(o.rtt||0)/2000+Math.max(0,(data.serverNow-data.snapshotAt)||0)/1000);for(const s of snakes)predictOnlineSnake(s,lead);
 const you=snakes[0];practice.state=you.alive?'play':'dead';
 if(!you.alive&&!o.dead){o.dead=true;practice.input.boost=false;$('#practice-overlay').hidden=false;$('#practice-overlay').innerHTML='<div class="modal"><h2>Una vuelta más.</h2><p>'+escapeArenaName(you.death||'Has sido eliminado.')+'</p><p>Masa máxima: '+Math.floor(you.peak)+' · Bajas: '+you.kills+'</p><button class="primary" onclick="respawnOnline()">VOLVER A LA SALA →</button><button onclick="multiplayerMenu()">Salir</button></div>'}
 if(you.alive&&o.dead){o.dead=false;o.overlay=false;$('#practice-overlay').hidden=true}
 onlineHUD();
}
function respawnOnline(){const o=online;if(!o||!o.joined)return;o.respawnRequested=true;if(!o.pending){clearTimeout(o.timer);onlinePoll(o)}}
function onlineHUD(){const o=online;if(!o?.target)return;const s=practice.snakes[0],d=o.stats;$('#practice-mass').textContent=Math.floor(s.mass);$('#practice-rank').textContent=(d.rank||'—')+' / '+(d.players+d.bots);$('#practice-kills').textContent=s.kills;$('#practice-ranking').innerHTML='<b>'+d.players+' JUGADORES · '+d.bots+' BOTS</b>'+d.ranking.slice(0,5).map((r,i)=>'<div><span>'+ (i+1)+'. '+escapeArenaName(r.name)+'</span><span>'+r.mass+'</span></div>').join('');
 $('#practice-powers').innerHTML='<span class="inventory-title">HABILIDADES</span>'+PRACTICE_POWERS.filter(p=>s.buffs[p[0]]>0).map(p=>'<span class="inventory-chip">'+objectSVG(p[4],p[3])+'<span>'+p[1]+' · '+Math.ceil(s.buffs[p[0]])+' s</span></span>').join('');$('#practice-notice').textContent=d.players+' jugadores conectados · 8 bots · Misma arena para todos';}
practiceHUD=function(){if(online)return onlineHUD();return localPracticeHUD()};
// Visual prediction only: food, damage, scores and portals remain server-owned.
function predictOnlineSnake(s,dt){if(!s.alive||!dt)return;let left=dt;while(left>0){const step=Math.min(1/60,left);left-=step;
 const local=s.id===0,angle=local?practice.input.angle:s.targetAngle;
 s.targetAngle+=pClamp(pAngle(angle-s.targetAngle),-3.2*step,3.2*step);
 const speed=145*((local?practice.input.boost:s.boost)&&s.mass>32?1.8:1),head=s.targetPoints[0],r=pRadius(s);
 let x=pClamp(head.x+Math.cos(s.targetAngle)*speed*step,r+12,practice.w-r-12),y=pClamp(head.y+Math.sin(s.targetAngle)*speed*step,r+12,practice.h-r-12);
 if(!(s.buffs.phase>0)&&(pStaticBlocked(practice,x,y,r)||practice.blocks.some(b=>pRectDistance(x,y,b)<r))){x=head.x;y=head.y}
 head.x=x;head.y=y;for(let i=1;i<s.targetPoints.length;i++){const a=s.targetPoints[i-1],b=s.targetPoints[i],d=Math.hypot(a.x-b.x,a.y-b.y);if(d>8){b.x+=(a.x-b.x)*(d-8)/d;b.y+=(a.y-b.y)*(d-8)/d}}
}}
updatePractice=function(dt){if(!online)return localPracticeUpdate(dt);const o=online;if(!o.target)return;
 o.transition=Math.min(1,o.transition+dt/.12);const t=o.transition;
 const predictionStep=Math.min(dt,Math.max(0,.75-o.predictedAge));o.predictedAge+=dt;
 for(const s of practice.snakes){predictOnlineSnake(s,predictionStep);for(let i=0;i<s.points.length;i++){const a=s.fromPoints[i],b=s.targetPoints[i];s.points[i].x=a.x+(b.x-a.x)*t;s.points[i].y=a.y+(b.y-a.y)*t}s.x=s.points[0].x;s.y=s.points[0].y;s.angle=s.fromAngle+pAngle(s.targetAngle-s.fromAngle)*t}
 const player=practice.snakes[0];practice.camera.x+=(player.x-practice.camera.x)*Math.min(1,dt*12);practice.camera.y+=(player.y-practice.camera.y)*Math.min(1,dt*12);drawOnlineWorld();if(performance.now()-o.lastSnapshot>1500)$('#practice-notice').textContent='Conexión lenta · esperando al servidor';};

pausePractice=function(){if(!online)return localPracticePause(...arguments);const o=online;if(!o.joined||o.dead)return;practice.input.boost=false;o.overlay=!o.overlay;$('#practice-overlay').hidden=!o.overlay;if(o.overlay)$('#practice-overlay').innerHTML='<div class="modal"><h2>La sala sigue activa.</h2><p>Otros jugadores y bots continúan moviéndose. Vuelve a jugar o sal para retirar tu serpiente.</p><p>Ratón / WASD · Espacio para esprintar</p><button class="primary" onclick="enterPractice()">SEGUIR JUGANDO</button><button onclick="multiplayerMenu()">Salir de la sala</button></div>'};
enterPractice=function(){if(!online)return localPracticeEnter();online.overlay=false;$('#practice-overlay').hidden=true;$('#practice-board').focus({preventScroll:true})};
window.addEventListener('pagehide',leaveOnline);
