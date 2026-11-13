import fs from 'node:fs';import assert from 'node:assert/strict';import {transform} from 'lightningcss';import postcss from 'postcss';
const html=JSON.parse(fs.readFileSync('worker/game-html.ts','utf8').replace('export const gameHtml=','').trim().replace(/;$/,''));
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];transform({filename:'game.css',code:Buffer.from(css)});
const root=postcss.parse(css);const tokens={};root.walkRules(':root',rule=>rule.walkDecls(d=>tokens[d.prop]=d.value));
assert.equal(tokens['--bg'],'#10130f');assert.equal(tokens['--panel'],'#191e17');assert.equal(tokens['--muted'],'#8a9384');assert.equal(tokens['--accent'],'#b6f560');
let body;root.walkRules('body',r=>{if(!body)body=r});const props=Object.fromEntries(body.nodes.filter(n=>n.type==='decl').map(d=>[d.prop,d.value]));assert.equal(props.background,'var(--bg)');assert.equal(props.color,'#f0f3e9');
console.log('PASS: valid CSS, original dark background/panel, light text and green accent.');
