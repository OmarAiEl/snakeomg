const progressKey='snakeomg-v1:'+window.PLAYER_ID,dirtyKey=progressKey+':pending';
let syncTimer=null,syncRunning=null,syncDirty=false,syncGeneration=0;
function mergeSavedProgress(a,b){const records={...(a.records||{})};for(const [k,v] of Object.entries(b.records||{})){const old=records[k];records[k]=old?{time:Math.min(old.time,v.time),food:Math.min(old.food,v.food)}:v}return {...a,...b,unlocked:Math.max(a.unlocked||1,b.unlocked||1),practiceBest:Math.max(a.practiceBest||0,b.practiceBest||0),records}}
let localSaved={};try{localSaved=JSON.parse(localStorage.getItem(progressKey)||'{}')}catch{}
const cloudSaved=window.PLAYER_PROGRESS;
let hasPending=false;try{hasPending=localStorage.getItem(dirtyKey)==='1'}catch{}
let saved=cloudSaved===null?localSaved:hasPending?mergeSavedProgress(cloudSaved,localSaved):cloudSaved;
let prefs={...defaults,...saved},screen='menu',g=null,ctx,cv,particles=[],frame=0,last=0,audioCtx;
function syncStatus(text){const el=document.getElementById('save-status');if(el){el.textContent=text;el.hidden=!text}}
function cacheProgress(){try{localStorage.setItem(progressKey,JSON.stringify(prefs));localStorage.setItem(dirtyKey,syncDirty?'1':'0')}catch{}}
function save(){syncDirty=true;syncGeneration++;cacheProgress();syncStatus('Guardando…');clearTimeout(syncTimer);syncTimer=setTimeout(()=>flushProgress(),300)}
async function flushProgress(){
 clearTimeout(syncTimer);if(syncRunning){await syncRunning;if(syncDirty)return flushProgress();return true}if(!syncDirty)return true;
 const generation=syncGeneration,payload=JSON.stringify(prefs);
 syncRunning=(async()=>{try{const r=await fetch('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:payload,keepalive:true});const result=await r.json();if(!r.ok)throw Error(result.error||'No se pudo guardar.');
 // Preserve edits made while this save was in flight and never lose progress.
 const merged=mergeSavedProgress(result.progress,prefs);prefs.unlocked=merged.unlocked;prefs.practiceBest=merged.practiceBest;prefs.records=merged.records;
 if(syncGeneration===generation)syncDirty=false;cacheProgress();syncStatus(syncDirty?'Guardando…':'');return true;
 }catch(e){syncStatus(e.message.includes('sesión')?'Sesión caducada · vuelve a entrar':'Sin sincronizar · reintentando');return false}finally{syncRunning=null}})();
 const ok=await syncRunning;if(ok&&syncDirty)return flushProgress();return ok;
}
window.flushGameProgress=flushProgress;
window.addEventListener('online',()=>flushProgress());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&syncDirty)flushProgress()});
window.addEventListener('pagehide',()=>{if(syncDirty)flushProgress()});
setInterval(()=>{if(syncDirty&&!syncRunning)flushProgress()},5000);
