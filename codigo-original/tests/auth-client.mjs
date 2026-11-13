import {build} from 'esbuild';import vm from 'node:vm';import assert from 'node:assert/strict';
await build({entryPoints:['worker/auth-page.ts'],outfile:'.sites-runtime/auth-page-test.mjs',bundle:true,platform:'node',format:'esm'});
const {authPage}=await import('../.sites-runtime/auth-page-test.mjs');const script=authPage.match(/<script>([\s\S]*?)<\/script>/)[1];
for(const sessionOk of [false,true]){
 const elements=new Map();for(const key of ['login','register','name','password','rules','submit','error','form','open-game'])elements.set(key,{value:key==='name'?'Player':'Password',textContent:'',hidden:true,setAttribute(){}});
 let navigation=null;const requests=[];const context=vm.createContext({document:{getElementById:key=>elements.get(key)},location:{replace:url=>navigation=url},fetch:async(url,options)=>{requests.push({url,options});return {ok:url==='/api/session'?sessionOk:true,json:async()=>({ok:true})}}});vm.runInContext(script,context);await elements.get('form').onsubmit({preventDefault(){}});
 assert.equal(requests.length,2);assert.equal(requests[0].options.credentials,'include');assert.equal(requests[1].options.credentials,'include');assert.equal(navigation,sessionOk?'/':null);
 if(!sessionOk){assert.equal(elements.get('name').value,'Player');assert.equal(elements.get('password').value,'Password');assert.equal(elements.get('open-game').hidden,false);assert.match(elements.get('error').textContent,/bloqueado la sesión/)}
}
console.log('PASS: confirms session before navigation, retains inputs on blocked cookies, shows recovery link.');
