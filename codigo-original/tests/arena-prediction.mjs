import vm from 'node:vm';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync('worker/online-client.js','utf8');const code=source.slice(source.indexOf('function predictOnlineSnake'),source.indexOf('updatePractice=function(dt)'));
const context={practice:{input:{angle:Math.PI/2,boost:false},w:6200,h:4600,blocks:[]},pClamp:(x,a,b)=>Math.max(a,Math.min(b,x)),pAngle:a=>Math.atan2(Math.sin(a),Math.cos(a)),pRadius:()=>15,pStaticBlocked:()=>false,pRectDistance:()=>999};vm.createContext(context);vm.runInContext(code,context);
const s={id:0,alive:true,mass:55,buffs:{},targetAngle:0,targetPoints:Array.from({length:30},(_,i)=>({x:3100-i*8,y:2300}))};context.s=s;
vm.runInContext('predictOnlineSnake(s,.1)',context);assert.ok(s.targetAngle>.3&&s.targetAngle<.33);assert.ok(s.targetPoints[0].y>2300);assert.equal(s.mass,55);
const x=s.targetPoints[0].x;context.pStaticBlocked=()=>true;vm.runInContext('predictOnlineSnake(s,.1)',context);assert.equal(s.targetPoints[0].x,x);
const html=JSON.parse(readFileSync('worker/game-html.ts','utf8').replace(/^export const gameHtml=/,'').trim().replace(/;$/,''));assert.ok(html.includes(source));
console.log('PASS: controls predict turns immediately, walls block visual movement, mass remains server-owned, embedded client matches source.');
