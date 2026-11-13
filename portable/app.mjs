// worker/arena-engine.ts
var palette = ["#b6f560", "#59b8ff", "#fa6474", "#939a9e", "#262b30", "#ffa653", "#bd8aff", "#f4f5e9"];
var prefs = { color: palette[0] };
var sound = () => {
};
var pNotice = () => {
};
var pBurst = () => {
};
var PRACTICE_POWERS = [
  ["magnet", "Im\xE1n", "Atrae comida en un radio amplio durante 9 s.", "#ff9fdc", "magnet", 9],
  ["triple", "Estrella \xD73", "Cada bola aporta el triple de masa durante 12 s.", "#ffe48a", "practiceStar", 12],
  ["phase", "Fantasma", "Atraviesa rivales, cajas, paredes y puertas sin da\xF1o durante 6 s.", "#b69aff", "portal", 6]
];
var P_NAMES = ["\xC1spid", "Nova", "Mamba", "Cometa", "Pixel", "Cobra", "Lima", "Aurora", "V\xEDbora", "Turbo", "\xD3nix", "N\xE9bula", "Kiwi", "Centella", "N\xE1car", "Draco", "Ninja", "Coral", "Plasma", "Bamb\xFA", "Zafiro", "Rayo", "\xC1mbar", "\xD3rbita", "Loto", "Bruma", "V\xF3rtice", "Karma", "Cosmos", "Prisma", "Flash", "Oliva", "F\xE9nix", "Eco", "Titanio", "Sombra", "Cereza", "\xD3palo", "Chispa", "Duna", "Menta", "Siroco", "Dardo", "Lince"];
var ArenaGrid = class {
  constructor(size) {
    this.size = size;
    this.cells = /* @__PURE__ */ new Map();
  }
  clear() {
    this.cells.clear();
  }
  add(x, y, item) {
    const key = Math.floor(x / this.size) + "," + Math.floor(y / this.size);
    if (!this.cells.has(key)) this.cells.set(key, []);
    this.cells.get(key).push(item);
  }
  near(x, y, r) {
    const found = [];
    for (let ix = Math.floor((x - r) / this.size); ix <= Math.floor((x + r) / this.size); ix++) for (let iy = Math.floor((y - r) / this.size); iy <= Math.floor((y + r) / this.size); iy++) {
      const cell = this.cells.get(ix + "," + iy);
      if (cell) found.push(...cell);
    }
    return found;
  }
};
var pDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
var pClamp = (v, a, b) => Math.max(a, Math.min(b, v));
var pAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function pRectDistance(x, y, r) {
  return Math.hypot(x - pClamp(x, r.x, r.x + r.w), y - pClamp(y, r.y, r.y + r.h));
}
function pStaticBlocked(world, x, y, r = 12, ignore = null) {
  if (x < r + 12 || y < r + 12 || x > world.w - r - 12 || y > world.h - r - 12) return true;
  return world.walls.some((v) => pRectDistance(x, y, v) < r) || world.rooms.some((v) => v !== ignore && v.until <= world.time && pRectDistance(x, y, v.gate) < r);
}
function pSafeSpot(world, near = null) {
  for (let i = 0; i < 200; i++) {
    const x = near ? pClamp(near.x + (Math.random() - 0.5) * 900, 100, world.w - 100) : 100 + Math.random() * (world.w - 200), y = near ? pClamp(near.y + (Math.random() - 0.5) * 900, 100, world.h - 100) : 100 + Math.random() * (world.h - 200);
    if (!pStaticBlocked(world, x, y, 60) && !world.blocks.some((b) => pRectDistance(x, y, b) < 60) && !world.snakes.some((s) => s.alive && Math.hypot(s.x - x, s.y - y) < 150)) return { x, y };
  }
  return { x: world.w / 2, y: world.h / 2 };
}
function pCreateSnake(world, id, near = null) {
  let p = id === 0 ? { x: world.w / 2, y: world.h / 2 } : pSafeSpot(world, near), angle = Math.random() * Math.PI * 2, mass = id === 0 ? 55 : 60 + Math.random() * 320;
  return { id, x: p.x, y: p.y, angle, targetAngle: angle, mass, peak: mass, kills: 0, name: id === 0 ? "T\xDA" : P_NAMES[(id - 1) % P_NAMES.length], color: id === 0 ? prefs.color : palette[1 + id % 7], points: Array.from({ length: Math.ceil(24 + Math.sqrt(mass) * 4) }, (_, i) => ({ x: p.x - Math.cos(angle) * i * 8, y: p.y - Math.sin(angle) * i * 8 })), alive: true, buffs: {}, grace: 3, portalCD: 0, think: 0, aiClock: Math.random() * 0.1, target: null, boost: false, drop: 0, lastPad: "", aiType: id % 4, respawn: 0 };
}
function createPracticeWorld() {
  const world = { w: 6200, h: 4600, time: 0, state: "ready", snakes: [], food: [], walls: [], rooms: [], blocks: [], lasers: [], portals: [], pads: [], sparks: [], notice: "", noticeTime: 0, input: { angle: 0, boost: false, mode: "keyboard" }, camera: { x: 3100, y: 2300 }, foodGrid: new ArenaGrid(160), bodyGrid: new ArenaGrid(70), foodClock: 0, hudClock: 0, spawnClock: 0, acc: 0, fullscreenAsked: false, foodId: 0 };
  const codes = [[2, 3, 1], [3, 1, 2], [1, 3, 2], [2, 1, 3], [3, 2, 1]].sort(() => Math.random() - 0.5);
  const centers = [[1e3, 950], [3e3, 900], [5100, 1e3], [1050, 3550], [3100, 3600], [5150, 3500]];
  centers.forEach(([cx, cy], i) => {
    let x = cx - 340, y = cy - 240, w = 680, h = 480, gap = 160;
    world.walls.push({ x, y, w: (w - gap) / 2, h: 24 }, { x: x + (w + gap) / 2, y, w: (w - gap) / 2, h: 24 }, { x, y: y + h - 24, w, h: 24 }, { x, y, w: 24, h }, { x: x + w - 24, y, w: 24, h });
    const room = { id: i, name: ["Jard\xEDn de ne\xF3n", "B\xF3veda del c\xF3digo", "Refugio de carga", "C\xE1mara gemela", "N\xFAcleo secuencial", "Fortaleza m\xF3vil"][i], x, y, w, h, type: i % 3, gate: { x: cx - 80, y, w: 160, h: 24 }, until: 0, seq: 0, code: codes[i % codes.length], nodes: [], release: { x: cx, y: y + 65 }, flash: 0 };
    if (room.type !== 2) {
      const count = room.type === 1 ? 3 : 2;
      room.nodes = Array.from({ length: count }, (_, n) => ({ x: cx - 140 + n * 140, y: y - 95, done: false }));
    } else {
      const block = { x: cx - 160, y: y - 100, w: 72, h: 44, room: i };
      world.blocks.push(block);
      room.plate = { x: cx - 45, y: y - 100, w: 82, h: 54 };
    }
    world.rooms.push(room);
    for (let k = 0; k < 75; k++) world.food.push({ id: world.foodId++, x: x + 65 + Math.random() * (w - 130), y: y + 90 + Math.random() * (h - 155), value: 3, dead: false });
  });
  for (let i = 0; i < 18; i++) {
    let x = 500 + i % 6 * 1e3, y = 1800 + Math.floor(i / 6) * 380;
    world.blocks.push({ x, y, w: 90 + i % 2 * 30, h: 38, room: -1 });
  }
  const ends = [[3400, 2300], [5700, 4e3], [2800, 2150], [700, 3900], [3e3, 350], [3200, 4200]];
  world.portals = ends.map(([x, y], i) => ({ x, y, pair: i ^ 1, label: "P" + (Math.floor(i / 2) + 1), color: ["#ad9aff", "#ad9aff", "#79e7ff", "#79e7ff", "#ff9adf", "#ff9adf"][i] }));
  world.snakes.push(pCreateSnake(world, 0));
  for (let i = 1; i <= 8; i++) world.snakes.push(pCreateSnake(world, i, i < 10 ? world.snakes[0] : null));
  for (let i = 0; i < 1400; i++) pSpawnFood(world);
  for (let i = 0; i < 30; i++) pSpawnFood(world, i % PRACTICE_POWERS.length);
  pRebuildFood(world);
  pRebuildBodies(world);
  return world;
}
function pSpawnFood(world, power = null) {
  let x, y;
  for (let n = 0; n < 100; n++) {
    x = 35 + Math.random() * (world.w - 70);
    y = 35 + Math.random() * (world.h - 70);
    if (!pStaticBlocked(world, x, y, 18) && !world.blocks.some((b) => pRectDistance(x, y, b) < 18)) break;
  }
  world.food.push({ id: world.foodId++, x, y, value: power === null ? Math.random() < 0.12 ? 4 : 1 : 0, power, dead: false });
}
function pRebuildFood(w) {
  w.food = w.food.filter((f) => !f.dead);
  if (w.food.length > 8e3) w.food = w.food.slice(-8e3);
  w.foodGrid.clear();
  for (let f of w.food) w.foodGrid.add(f.x, f.y, f);
}
function pRebuildBodies(w) {
  w.bodyGrid.clear();
  for (let s of w.snakes) if (s.alive) for (let i = 0; i < s.points.length; i += 2) w.bodyGrid.add(s.points[i].x, s.points[i].y, { x: s.points[i].x, y: s.points[i].y, owner: s, index: i });
}
function pRadius(s) {
  return 9 + Math.min(8, Math.sqrt(s.mass) * 0.16);
}
function pApplyPower(w, s, index) {
  const power = PRACTICE_POWERS[index], [key, name, , color, , duration] = power;
  if (duration) s.buffs[key] = duration;
  s.peak = Math.max(s.peak, s.mass);
  pBurst(w, s.x, s.y, color, 20);
  if (s.id === 0) {
    sound("portal");
    pNotice(name + " \xB7 " + power[2]);
  }
}
function pLaserOn(w, l) {
  return l.disabled <= w.time && (w.time + l.phase) % 4.4 < 2.2;
}
function pLaserProtected(w, x, y, laser) {
  return w.blocks.some((b) => Math.abs(b.y + b.h / 2 - (laser.y + laser.h / 2)) < b.h / 2 + 24 && b.x < x && b.x > laser.x && pRectDistance(x, y, { x: b.x, y: laser.y - 12, w: laser.x + laser.w - b.x, h: 36 }) < 15);
}
function pPushBlock(w, s, b, dt) {
  let nx = b.x + Math.cos(s.angle) * 110 * dt, ny = b.y + Math.sin(s.angle) * 110 * dt;
  const valid = nx > 20 && ny > 20 && nx + b.w < w.w - 20 && ny + b.h < w.h - 20 && !w.walls.some((r) => nx < r.x + r.w && nx + b.w > r.x && ny < r.y + r.h && ny + b.h > r.y) && !w.rooms.some((r) => r.until <= w.time && nx < r.gate.x + r.gate.w && nx + b.w > r.gate.x && ny < r.gate.y + r.gate.h && ny + b.h > r.gate.y) && !w.blocks.some((r) => r !== b && nx < r.x + r.w && nx + b.w > r.x && ny < r.y + r.h && ny + b.h > r.y);
  if (valid) {
    b.x = nx;
    b.y = ny;
  }
  return valid;
}
function pPuzzle(w, s) {
  for (let room of w.rooms) {
    room.flash = Math.max(0, room.flash - 1 / 60);
    if (pDistance(s, room.release) < 32) room.until = Math.max(room.until, w.time + 8);
    if (room.type === 2) {
      let block = w.blocks.find((b) => b.room === room.id);
      if (block && pRectDistance(block.x + block.w / 2, block.y + block.h / 2, room.plate) < 8) room.until = Math.max(room.until, w.time + 12);
    } else room.nodes.forEach((node, i) => {
      if (pDistance(s, node) > 28 || node.done || room.until > w.time) return;
      if (room.type === 1 && i + 1 !== room.code[room.seq]) {
        if (s.id === 0) pNotice("C\xF3digo: toca los nodos " + room.code.join(" \u2192 ") + ".");
        return;
      }
      node.done = true;
      room.seq++;
      pBurst(w, node.x, node.y, "#b9f57a", 12);
      if (!s.id) sound("switch");
      if (room.nodes.every((n) => n.done)) {
        room.until = w.time + 24;
        room.flash = 1;
        if (!s.id) {
          sound("door");
          pNotice(room.name + ": puerta abierta durante 24 s.");
        }
      }
    });
  }
}
function pUpdateRooms(w) {
  for (let room of w.rooms) {
    if (room.until > 0 && room.until <= w.time) {
      const occupied = w.snakes.some((s) => s.alive && s.points.some((p, i) => i % 3 === 0 && pRectDistance(p.x, p.y, room.gate) < pRadius(s) + 8));
      if (occupied) {
        room.until = w.time + 0.6;
        continue;
      }
      room.until = 0;
      room.seq = 0;
      room.nodes.forEach((n) => n.done = false);
    }
  }
}
function pAI(w, s, dt) {
  s.think -= dt;
  if (s.think <= 0) {
    s.think = 0.35 + Math.random() * 0.4;
    let candidates = w.foodGrid.near(s.x, s.y, 700).filter((f) => !f.dead && !(f.kind === "dropping" && f.owner === s.id));
    let target = null, best2 = Infinity;
    for (let f of candidates) {
      let score = pDistance(s, f) / (f.power !== null && f.power !== void 0 ? 2.5 : Math.sqrt(f.value));
      if (score < best2) {
        best2 = score;
        target = f;
      }
    }
    s.target = target || { x: 100 + Math.random() * (w.w - 200), y: 100 + Math.random() * (w.h - 200) };
    if (s.aiType === 0) {
      const enemy = w.snakes.filter((e) => e !== s && e.alive && pDistance(s, e) < 400 && e.mass < s.mass * 0.8).sort((a, b) => pDistance(s, a) - pDistance(s, b))[0];
      if (enemy) s.target = { x: enemy.x + Math.cos(enemy.angle) * 120, y: enemy.y + Math.sin(enemy.angle) * 120 };
    }
    if (s.aiType === 1) {
      const room = w.rooms.find((r) => r.until <= w.time && pDistance(s, { x: r.gate.x, y: r.gate.y }) < 650 && r.type !== 2);
      if (room) s.target = (room.type === 1 ? room.nodes[room.code[room.seq] - 1] : room.nodes.find((n) => !n.done)) || s.target;
    }
  }
  let desired = Math.atan2(s.target.y - s.y, s.target.x - s.x), best = -Infinity, angle = s.angle;
  for (let offset of [0, -0.3, 0.3, -0.7, 0.7, -1.1, 1.1]) {
    let a = s.angle + offset, score = Math.cos(pAngle(desired - a)) * 2;
    for (let distance of [45, 90, 150]) {
      let x = s.x + Math.cos(a) * distance, y = s.y + Math.sin(a) * distance;
      if (pStaticBlocked(w, x, y, 22)) score -= 12;
      if (w.blocks.some((b) => pRectDistance(x, y, b) < 25)) score -= 5;
      if (w.lasers.some((l) => pLaserOn(w, l) && pRectDistance(x, y, l) < 20)) score -= 8;
      for (let body of w.bodyGrid.near(x, y, 38)) {
        if (body.owner !== s && body.owner.alive && Math.hypot(body.x - x, body.y - y) < pRadius(body.owner) + 20) {
          score -= 9;
          break;
        }
      }
    }
    if (score > best) {
      best = score;
      angle = a;
    }
  }
  s.targetAngle = angle;
  s.boost = best > 1.5 && s.aiType === 0 && s.mass > 100 && pDistance(s, s.target) > 180;
}
function pMove(w, s, dt) {
  if (!s.alive) return;
  for (let k of Object.keys(s.buffs)) s.buffs[k] = Math.max(0, s.buffs[k] - dt);
  s.grace = Math.max(0, s.grace - dt);
  s.portalCD = Math.max(0, s.portalCD - dt);
  if (s.bot) {
    s.aiClock -= dt;
    if (s.aiClock <= 0) {
      pAI(w, s, 0.1);
      s.aiClock = 0.1;
    }
  } else {
    s.targetAngle = s.input.angle;
    s.boost = s.input.boost;
  }
  let turn = pClamp(pAngle(s.targetAngle - s.angle), -3.2 * dt, 3.2 * dt);
  s.angle += turn;
  const boosted = s.boost && s.mass > 32;
  const speed = 145 * (boosted ? 1.8 : 1);
  if (boosted) {
    s.mass = Math.max(32, s.mass - dt * 9);
    s.drop += dt;
    while (s.drop >= 0.07) {
      s.drop -= 0.07;
      const tail = s.points[s.points.length - 1];
      w.food.push({ id: w.foodId++, x: tail.x, y: tail.y, value: 0.5, power: null, kind: "dropping", owner: s.id, dead: false });
    }
  }
  let nx = s.x + Math.cos(s.angle) * speed * dt, ny = s.y + Math.sin(s.angle) * speed * dt, r = pRadius(s);
  const block = w.blocks.find((b) => pRectDistance(nx, ny, b) < r);
  if (block && !(s.buffs.phase > 0)) {
    pPushBlock(w, s, block, dt);
    if (pRectDistance(nx, ny, block) < r) {
      nx = s.x;
      ny = s.y;
    }
  }
  nx = pClamp(nx, r + 12, w.w - r - 12);
  ny = pClamp(ny, r + 12, w.h - r - 12);
  if (!(s.buffs.phase > 0) && pStaticBlocked(w, nx, ny, r)) {
    nx = s.x;
    ny = s.y;
  }
  s.x = nx;
  s.y = ny;
  s.points[0] = { x: nx, y: ny };
  const length = Math.min(210, Math.ceil(24 + Math.sqrt(s.mass) * 4));
  while (s.points.length < length) s.points.push({ ...s.points[s.points.length - 1] });
  s.points.length = length;
  for (let i = 1; i < s.points.length; i++) {
    let a = s.points[i - 1], b = s.points[i], distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (distance > 8) {
      const f = (distance - 8) / distance;
      b.x += (a.x - b.x) * f;
      b.y += (a.y - b.y) * f;
    }
  }
  if (s.portalCD <= 0) {
    for (let portal of w.portals) if (pDistance(s, portal) < 44) {
      const target = w.portals[portal.pair], x = target.x + Math.cos(s.angle) * 65, y = target.y + Math.sin(s.angle) * 65, dx = x - s.x, dy = y - s.y;
      s.x = x;
      s.y = y;
      for (let p of s.points) {
        p.x += dx;
        p.y += dy;
      }
      s.portalCD = 2;
      s.grace = Math.max(s.grace, 1.5);
      pBurst(w, x, y, portal.color);
      if (!s.id) {
        sound("portal");
        pNotice("Agujero de gusano: has cruzado al otro extremo del mapa.");
      }
      break;
    }
  }
  pPuzzle(w, s);
  const radius = s.buffs.magnet > 0 ? 170 : r + 8;
  for (let food of w.foodGrid.near(s.x, s.y, radius)) {
    if (food.dead || food.kind === "dropping" && food.owner === s.id) continue;
    const distance = pDistance(s, food);
    if (distance > radius) continue;
    if (distance > r + 12 && s.buffs.magnet > 0) {
      const f = Math.min(1, dt * 7);
      food.x += (s.x - food.x) * f;
      food.y += (s.y - food.y) * f;
      continue;
    }
    if (distance > r + 12) continue;
    food.dead = true;
    if (food.power !== null && food.power !== void 0) pApplyPower(w, s, food.power);
    else {
      s.mass += food.value * (s.buffs.triple > 0 ? 3 : 1);
      s.peak = Math.max(s.peak, s.mass);
      if (!s.id) {
        if (w.time >= (w.eatSound || 0)) {
          sound("eat");
          w.eatSound = w.time + 0.08;
        }
      }
    }
  }
}
function pCollisions(w) {
  const hits = [];
  for (let s of w.snakes) {
    if (!s.alive || s.grace > 0) continue;
    const r = pRadius(s);
    if (!(s.buffs.phase > 0)) {
      let laser = w.lasers.find((l) => pLaserOn(w, l) && pRectDistance(s.x, s.y, l) < r && !pLaserProtected(w, s.x, s.y, l));
      if (laser) {
        hits.push([s, "Un l\xE1ser te ha alcanzado.", null]);
        continue;
      }
      for (let body of w.bodyGrid.near(s.x, s.y, r + 22)) {
        if (body.owner === s || !body.owner.alive || body.owner.grace > 0 || body.owner.buffs.phase > 0) continue;
        if (Math.hypot(body.x - s.x, body.y - s.y) < r + pRadius(body.owner) * 0.8) {
          hits.push([s, "Tu cabeza ha tocado otra serpiente.", body.owner]);
          break;
        }
      }
    }
  }
  for (let [s, reason, killer] of hits) pHit(w, s, reason, killer);
}
function pKill(w, s, reason, killer = null) {
  if (!s.alive) return;
  s.alive = false;
  s.death = reason;
  s.respawn = 3;
  s.boost = false;
  for (let i = 0; i < s.points.length; i += 3) {
    const p = s.points[i];
    w.food.push({ id: w.foodId++, x: p.x, y: p.y, value: Math.max(2, Math.min(8, s.mass / s.points.length * 1.5)), power: null, dead: false });
  }
  if (killer && killer !== s) killer.kills++;
}
function pHit(w, s, reason, killer = null) {
  if (s.grace > 0 || s.buffs.phase > 0) return;
  pKill(w, s, reason, killer);
}
function newArena() {
  const w = createPracticeWorld();
  w.snakes = w.snakes.slice(1);
  for (const s of w.snakes) {
    s.bot = true;
    s.name = "BOT \xB7 " + s.name;
    s.mass = 70 + Math.random() * 100;
  }
  sRandomize(w);
  w.state = "play";
  w.nextSnakeId = 9;
  w.spawnClock = 0;
  return w;
}
function sRandomize(w) {
  for (const s of w.snakes) {
    const p = pSafeSpot(w, { x: 3100, y: 2300 });
    s.x = p.x;
    s.y = p.y;
    s.points = s.points.map((_, i) => ({ x: p.x - Math.cos(s.angle) * i * 8, y: p.y - Math.sin(s.angle) * i * 8 }));
  }
}
function encodeArena(w) {
  const { foodGrid, bodyGrid, sparks, ...data } = w;
  return JSON.stringify({ ...data, sparks: [], snakes: w.snakes.map((s) => ({ ...s, target: s.target ? { x: s.target.x, y: s.target.y } : null })) });
}
function decodeArena(data) {
  const w = JSON.parse(data);
  w.foodGrid = new ArenaGrid(160);
  w.bodyGrid = new ArenaGrid(70);
  w.sparks = [];
  pRebuildFood(w);
  pRebuildBodies(w);
  return w;
}
function humanSnake(w, m) {
  const s = pCreateSnake(w, w.nextSnakeId++, { x: w.w / 2, y: w.h / 2 });
  Object.assign(s, { userId: m.user_id, clientId: m.client_id, bot: false, name: m.name, mass: 55, peak: 55, input: { angle: m.angle, boost: !!m.boost }, respawnVersion: m.respawn, color: m.color || palette[0], second: m.second || palette[1], style: m.style || "Degradado", head: m.head || "Nada", tail: m.tail || "Nada" });
  return s;
}
function advanceArena(w, members, seconds) {
  const active = new Map(members.map((m) => [m.user_id, m]));
  w.snakes = w.snakes.filter((s) => s.bot || active.has(s.userId));
  for (const m of members) {
    let s = w.snakes.find((s2) => s2.userId === m.user_id);
    if (!s) {
      s = humanSnake(w, m);
      w.snakes.push(s);
    } else if (s.clientId !== m.client_id || !s.alive && m.respawn > s.respawnVersion) {
      const index = w.snakes.indexOf(s), replacement = humanSnake(w, m);
      replacement.kills = s.kills;
      replacement.peak = Math.max(s.peak, replacement.peak);
      w.snakes[index] = s = replacement;
    }
    s.input = { angle: m.angle, boost: !!m.boost };
    s.respawnVersion = m.respawn;
  }
  pRebuildBodies(w);
  pRebuildFood(w);
  let remaining = Math.min(2, Math.max(0, seconds));
  while (remaining > 0) {
    const dt = Math.min(1 / 30, remaining);
    remaining -= dt;
    w.time += dt;
    pUpdateRooms(w);
    for (const s of w.snakes) {
      if (!s.alive && s.bot) {
        s.respawn -= dt;
        if (s.respawn <= 0) {
          const next = pCreateSnake(w, s.id, { x: 3100, y: 2300 });
          Object.assign(s, next, { bot: true, name: "BOT \xB7 " + next.name });
        }
      }
      pMove(w, s, dt);
    }
    pRebuildBodies(w);
    pCollisions(w);
  }
  w.spawnClock -= Math.min(seconds, 2);
  if (w.spawnClock <= 0) {
    w.spawnClock = 1;
    const normal = w.food.filter((f) => !f.dead && f.power == null).length, powers = w.food.filter((f) => !f.dead && f.power != null).length;
    for (let i = 0; i < Math.min(40, 1400 - normal); i++) pSpawnFood(w);
    for (let i = 0; i < Math.min(6, 30 - powers); i++) pSpawnFood(w, Math.floor(Math.random() * PRACTICE_POWERS.length));
  }
  pRebuildFood(w);
  return w;
}
function arenaView(w, userId, version) {
  const you = w.snakes.find((s) => s.userId === userId);
  const x = you?.x || 3100, y = you?.y || 2300;
  const visible = (p, pad = 100) => Math.abs(p.x - x) < 950 + pad && Math.abs(p.y - y) < 700 + pad;
  return { version, time: w.time, w: w.w, h: w.h, you: you?.id || null, rank: you?.alive ? w.snakes.filter((s) => s.alive).sort((a, b) => b.mass - a.mass).findIndex((s) => s === you) + 1 : null, players: w.snakes.filter((s) => !s.bot).length, bots: w.snakes.filter((s) => s.bot).length, ranking: w.snakes.filter((s) => s.alive).sort((a, b) => b.mass - a.mass).slice(0, 8).map((s) => ({ id: s.id, name: s.name, bot: s.bot, mass: Math.floor(s.mass), kills: s.kills })), snakes: w.snakes.filter((s) => s === you || s.points.some((p) => visible(p))).map((s) => ({ id: s.id, name: s.name, bot: s.bot, x: s.x, y: s.y, angle: s.angle, mass: s.mass, peak: s.peak, kills: s.kills, alive: s.alive, death: s.death, color: s.color, second: s.second, style: s.style, head: s.head, tail: s.tail, buffs: s.buffs, grace: s.grace, portalCD: s.portalCD, points: s.points.map((p) => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 })) })), food: w.food.filter((f) => !f.dead && visible(f, 0)), walls: w.walls, rooms: w.rooms, blocks: w.blocks, portals: w.portals };
}

// worker/arena.ts
var reply = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function arenaFetch(request, db, user) {
  if (request.method !== "POST") return reply({ error: "M\xE9todo no permitido." }, 405);
  const url = new URL(request.url);
  if (request.headers.get("Origin") !== url.origin || !request.headers.get("Content-Type")?.startsWith("application/json")) return reply({ error: "Solicitud no permitida." }, 403);
  const raw = await request.text();
  if (raw.length > 2048) return reply({ error: "Solicitud demasiado grande." }, 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return reply({ error: "Solicitud no v\xE1lida." }, 400);
  }
  if (!body || !["join", "input", "respawn", "leave"].includes(body.action) || typeof body.clientId !== "string" || !/^[a-zA-Z0-9-]{16,64}$/.test(body.clientId) || typeof body.angle !== "number" || !Number.isFinite(body.angle) || Math.abs(body.angle) > Math.PI * 2 || typeof body.boost !== "boolean") return reply({ error: "Controles no v\xE1lidos." }, 400);
  const now = Date.now();
  if (body.action === "leave") {
    await db.prepare("DELETE FROM arena_members WHERE user_id=? AND client_id=?").bind(user.id, body.clientId).run();
    return reply({ ok: true });
  }
  if (body.action === "join") {
    const profile = await db.prepare("SELECT data FROM player_progress WHERE user_id=?").bind(user.id).first();
    const p = profile ? JSON.parse(profile.data) : {};
    const appearance = JSON.stringify({ color: p.color || "#b6f560", second: p.second || "#59b8ff", style: p.style || "Degradado", head: p.head || "Nada", tail: p.tail || "Nada" });
    await db.prepare("INSERT INTO arena_members (user_id,client_id,name,angle,boost,seen_at,respawn,appearance) VALUES (?,?,?,?,?,?,0,?) ON CONFLICT(user_id) DO UPDATE SET client_id=excluded.client_id,name=excluded.name,angle=excluded.angle,boost=0,seen_at=excluded.seen_at,respawn=0,appearance=excluded.appearance").bind(user.id, body.clientId, user.name, body.angle, 0, now, appearance).run();
  } else {
    const result = await db.prepare("UPDATE arena_members SET angle=?,boost=?,seen_at=?,respawn=respawn+? WHERE user_id=? AND client_id=?").bind(body.angle, body.boost ? 1 : 0, now, body.action === "respawn" ? 1 : 0, user.id, body.clientId).run();
    if (!result.meta.changes) return reply({ error: "La conexi\xF3n a la sala ha terminado o se abri\xF3 en otra pesta\xF1a.", rejoin: true }, 409);
  }
  if (body.action === "join") await db.prepare("INSERT INTO arena_room (id,data,updated_at,revision,lease,lease_until) VALUES ('main',?,?,0,'',0) ON CONFLICT(id) DO NOTHING").bind(encodeArena(newArena()), Date.now()).run();
  const tickNow = Date.now(), lease = crypto.randomUUID();
  const batch = await db.batch([
    db.prepare("UPDATE arena_room SET lease=?,lease_until=? WHERE id='main' AND lease_until<=? AND (updated_at<=? OR ?=1)").bind(lease, tickNow + 3e3, tickNow, tickNow - 60, body.action === "join" || body.action === "respawn" ? 1 : 0),
    db.prepare("SELECT * FROM arena_room WHERE id='main'"),
    db.prepare("SELECT * FROM arena_members WHERE seen_at>=?").bind(tickNow - 12e3)
  ]);
  let row = batch[1].results[0], world;
  if (!row) return reply({ error: "Vuelve a entrar en la sala.", rejoin: true }, 409);
  if (batch[0].meta.changes) {
    try {
      const members = batch[2];
      world = decodeArena(row.data);
      advanceArena(world, members.results.map((m) => ({ ...m, ...JSON.parse(m.appearance), boost: tickNow - m.seen_at < 1500 ? m.boost : 0 })), (tickNow - row.updated_at) / 1e3);
      const data = encodeArena(world);
      const committed = await db.prepare("UPDATE arena_room SET data=?,updated_at=?,revision=revision+1,lease='',lease_until=0 WHERE id='main' AND lease=?").bind(data, tickNow, lease).run();
      if (committed.meta.changes) row = { data, updated_at: tickNow, revision: row.revision + 1 };
      else {
        world = null;
        row = await db.prepare("SELECT * FROM arena_room WHERE id='main'").first();
      }
    } catch (error) {
      await db.prepare("UPDATE arena_room SET lease='',lease_until=0 WHERE id='main' AND lease=?").bind(lease).run();
      throw error;
    }
  }
  return reply({ ...arenaView(world || decodeArena(row.data), user.id, row.revision), snapshotAt: row.updated_at, serverNow: Date.now() });
}

// worker/progress.ts
function validateProgress(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Progreso no v\xE1lido.");
  const v = value, out = {};
  for (const key of ["color", "second"]) if (key in v) {
    if (typeof v[key] !== "string" || !/^#[0-9a-f]{6}$/i.test(v[key])) throw Error("Color no v\xE1lido.");
    out[key] = v[key];
  }
  for (const key of ["head", "tail"]) if (key in v) {
    if (typeof v[key] !== "string" || v[key].length > 80) throw Error("Accesorio no v\xE1lido.");
    out[key] = v[key];
  }
  if ("style" in v) {
    if (!["Color fijo", "Degradado", "Multicolor"].includes(v.style)) throw Error("Estilo no v\xE1lido.");
    out.style = v.style;
  }
  for (const key of ["music", "sound"]) if (key in v) {
    if (typeof v[key] !== "boolean") throw Error("Ajuste no v\xE1lido.");
    out[key] = v[key];
  }
  for (const [key, min, max] of [["theme", 0, 7], ["unlocked", 1, 2e3], ["practiceBest", 0, 1e9]]) if (key in v) {
    const n = v[key];
    if (typeof n !== "number" || !Number.isFinite(n) || n < min || n > max || !Number.isInteger(n)) throw Error("Valor no v\xE1lido.");
    out[key] = n;
  }
  if ("records" in v) {
    if (!v.records || typeof v.records !== "object" || Array.isArray(v.records) || Object.keys(v.records).length > 2e3) throw Error("R\xE9cords no v\xE1lidos.");
    out.records = {};
    for (const [key, record] of Object.entries(v.records)) {
      if (!/^\d{1,4}$/.test(key) || Number(key) >= 2e3 || !record || typeof record !== "object") throw Error("R\xE9cord no v\xE1lido.");
      const { time, food } = record;
      if (typeof time !== "number" || typeof food !== "number" || !Number.isFinite(time) || !Number.isFinite(food) || time < 0 || food < 0 || time > 1e9 || food > 1e9) throw Error("R\xE9cord no v\xE1lido.");
      out.records[key] = { time, food };
    }
  }
  return out;
}
function mergeProgress(old, incoming) {
  const records = { ...old.records };
  for (const [key, v] of Object.entries(incoming.records || {})) {
    const prev = records[key];
    records[key] = prev ? { time: Math.min(prev.time, v.time), food: Math.min(prev.food, v.food) } : v;
  }
  return { ...old, ...incoming, unlocked: Math.max(old.unlocked || 1, incoming.unlocked || 1), practiceBest: Math.max(old.practiceBest || 0, incoming.practiceBest || 0), records };
}
async function storeProgress(db, userId, incoming) {
  await db.prepare("INSERT INTO player_progress (user_id,data,revision,updated_at) VALUES (?,'{}',0,?) ON CONFLICT(user_id) DO NOTHING").bind(userId, Date.now()).run();
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await db.prepare("SELECT data,revision FROM player_progress WHERE user_id=?").bind(userId).first();
    if (!row) throw Error("Perfil no disponible.");
    const progress = mergeProgress(JSON.parse(row.data), incoming);
    const r = await db.prepare("UPDATE player_progress SET data=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=?").bind(JSON.stringify(progress), Date.now(), userId, row.revision).run();
    if (r.meta.changes) return progress;
  }
  throw Error("Vuelve a intentar el guardado.");
}

// worker/auth-page.ts
var authPage = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0b120e"><title>SnakeOMG \xB7 Entra en la arena</title><style>*{box-sizing:border-box}html{color-scheme:dark}body{margin:0;background:#0b120e;color:#edf3e5;font:15px system-ui,-apple-system,sans-serif;min-height:100dvh}button,input{font:inherit}button,a,input{-webkit-tap-highlight-color:transparent}button,a{touch-action:manipulation}button{cursor:pointer}button:focus-visible,a:focus-visible{outline:2px solid #b6f560;outline-offset:5px}#living-arena{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}.veil{position:fixed;inset:0;pointer-events:none;background:linear-gradient(90deg,#09120a24,transparent 45%,#08100b55),linear-gradient(0deg,#08100be6,transparent 25%,transparent 80%,#08100b99)}.topbar{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;max-width:1480px;margin:auto;padding:30px 5%;gap:20px}.brand{font-weight:850;letter-spacing:-1.4px;font-size:27px}.brand span{color:#b6f560}.brand small{display:block;color:#a1ae98;font-size:9px;letter-spacing:3.4px;font-weight:500;margin-top:5px}.controls{display:flex;gap:9px}.controls button{border:1px solid #d9efb824;border-radius:30px;padding:10px 15px;background:#0e1a11b8;color:#becdb6;font-size:12px;backdrop-filter:blur(12px)}.controls button:hover{border-color:#b6f56080;color:#e9ffc9}.layout{position:relative;z-index:1;max-width:1280px;margin:0 auto;min-height:calc(100dvh - 190px);display:grid;grid-template-columns:1.15fr 1fr;align-items:center;gap:90px;padding:38px 5% 60px}.intro{padding-bottom:20px;text-shadow:0 3px 28px #071009}.eyebrow{font:600 10px system-ui;letter-spacing:2.6px;color:#b6f560;display:flex;align-items:center;gap:10px}.dot{width:6px;height:6px;border-radius:50%;background:#b6f560;box-shadow:0 0 16px #b6f560}.intro h1{font-size:clamp(58px,6.3vw,88px);line-height:1;letter-spacing:-5px;font-weight:750;margin:30px 0 25px}.intro h1 span{color:#b6f560}.intro p{font-size:16px;line-height:1.8;color:#bdcbb4;max-width:310px}.arena-caption{margin-top:72px;display:flex;align-items:center;gap:14px;color:#8eaa81;font:10px monospace;letter-spacing:1.6px}.arena-caption:before{content:'';height:1px;width:40px;background:#b6f56080}.card{width:100%;max-width:440px;justify-self:end;padding:34px 34px 24px;border:1px solid #b6d49536;background:linear-gradient(145deg,#1b271beb,#101a12f5);backdrop-filter:blur(22px);border-radius:24px;box-shadow:0 28px 100px #0007,inset 0 1px #e8ffd30c}.card-top{display:flex;align-items:center;justify-content:space-between;color:#8fa182;letter-spacing:2px;font-size:9px}.card-top .symbol{font-size:24px;color:#b6f560;font-weight:300}.card h2{font-size:31px;letter-spacing:-1px;margin:20px 0 8px;font-weight:650}.subtitle{color:#a4b39a;font-size:13px;line-height:1.6;margin:0 0 25px}nav{display:flex;padding:5px;gap:5px;border-radius:12px;background:#08110c88;border:1px solid #ffffff08;margin-bottom:26px}nav button{flex:1;border:0;border-radius:8px;background:transparent;color:#94a48a;padding:11px 4px;font-size:12px;transition:background .2s,color .2s}nav button[aria-selected=true]{background:#30402a;color:#ebf6df;box-shadow:0 2px 7px #0003}label{display:block;font-size:11px;font-weight:600;color:#c7d4bd;margin:20px 0 9px;letter-spacing:.4px}input{width:100%;background:#0c150f;color:#f2f8ec;padding:14px 15px;border:1px solid #50604470;border-radius:10px;outline:none;transition:border-color .2s,box-shadow .2s}input::placeholder{color:#6b7a63}input:focus{border-color:#b6f560;box-shadow:0 0 0 3px #b6f56013}small{display:block;font-size:10px;color:#829478;line-height:1.5;margin-top:7px}[hidden]{display:none!important}#submit{width:100%;border:0;background:#b6f560;color:#17220d;font-size:12px;letter-spacing:.8px;font-weight:800;padding:16px 10px;border-radius:10px;margin-top:26px;box-shadow:0 5px 25px #b6f56014;transition:background .2s,transform .2s}#submit:hover{background:#c5ff78;transform:translateY(-1px)}#submit:disabled{opacity:.5;cursor:wait;transform:none}#error{color:#ffc1b5;font-size:12px;line-height:1.5;margin:12px 0 0}#error:empty{display:none}.card footer{border-top:1px solid #d9e8cc10;margin-top:24px;padding-top:17px;font-size:10px;color:#8d9e82;line-height:1.6;display:flex;gap:8px}.bottom{position:relative;z-index:1;padding:0 5% 25px;display:flex;justify-content:space-between;gap:20px;color:#6d8565;font:9px monospace;letter-spacing:1.8px;max-width:1480px;margin:auto}@media(min-width:1600px){.layout{gap:150px}}@media(max-width:850px){.layout{gap:30px}.intro h1{font-size:62px;letter-spacing:-4px}.card{padding:26px}.controls button{font-size:10px;padding:10px}.intro p{font-size:14px}}@media(max-width:650px){.topbar{padding:20px 6%;align-items:flex-start}.brand{font-size:23px}.brand small{font-size:8px}.controls{flex-direction:column;gap:6px}.controls button{padding:7px 10px}.layout{display:flex;flex-direction:column;gap:25px;padding:14px 6% 35px;min-height:auto}.intro{width:100%;padding:0}.intro .eyebrow{font-size:8px}.intro h1{font-size:43px;letter-spacing:-2px;margin:15px 0 0}.intro h1 br{display:none}.intro p,.arena-caption{display:none}.card{max-width:440px;padding:26px;align-self:center}.card h2{font-size:28px}.bottom{font-size:8px;padding:0 6% 20px}.bottom span:last-child{display:none}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}</style></head><body><canvas id="living-arena" aria-hidden="true"></canvas><div class="veil"></div><header class="topbar"><div class="brand">SNAKE<span>OMG</span><small>ARCADE / SURVIVAL</small></div><div class="controls"><button id="music" type="button" aria-pressed="false">\u266B Activar m\xFAsica</button><button id="motion" type="button" aria-pressed="true">\u2161 Pausar fondo</button></div></header><div class="layout"><section class="intro"><div class="eyebrow"><i class="dot"></i> TU INSTINTO TE TRAJO HASTA AQU\xCD</div><h1>Cada segundo<br> <span>cuenta.</span></h1><p>Come. Resuelve. Escapa.<br>La pr\xF3xima historia empieza contigo.</p><div class="arena-caption">UN MUNDO QUE NUNCA SE DETIENE</div></section><main class="card"><div class="card-top"><span>ACCESO A LA ARENA</span><span class="symbol" aria-hidden="true">\u2197</span></div><h2 id="access-title">Vuelve a la partida.</h2><p class="subtitle">Tu serpiente. Tus r\xE9cords. Tu pr\xF3xima aventura.</p><nav aria-label="Acceso"><button id="login" type="button" aria-selected="true">Iniciar sesi\xF3n</button><button id="register" type="button" aria-selected="false">Crear cuenta</button></nav><form id="form"><label for="name">NOMBRE DE JUGADOR</label><input id="name" name="username" autocomplete="username" placeholder="Tu nombre en la arena" maxlength="40" required><small>Un nombre \xFAnico, hasta 40 caracteres.</small><label for="password">CONTRASE\xD1A</label><input id="password" name="password" type="password" autocomplete="current-password" placeholder="Tu contrase\xF1a" maxlength="128" required><small id="rules" hidden>M\xEDnimo 6 caracteres y una may\xFAscula.</small><button type="submit" id="submit">ENTRAR AL JUEGO \u2192</button><p id="error" role="alert" aria-live="polite"></p><a id="open-game" href="/" target="_blank" rel="noopener" hidden style="color:#b6f560">Abrir el juego en una pesta\xF1a nueva \u2197</a></form><footer><span aria-hidden="true">\u25C7</span><span>Tu progreso, personalizaci\xF3n y r\xE9cords<br>te esperan en tu cuenta.</span></footer></main></div><div class="bottom"><span>100 HABITACIONES \xB7 UNA VIDA A CONTRARRELOJ</span><span>\u25CF SIGUE TU INSTINTO</span></div><script>let mode='login';const $=id=>document.getElementById(id);function tab(m){mode=m;if($('access-title'))$('access-title').textContent=m==='register'?'Tu aventura empieza aqu\xED.':'Vuelve a la partida.';for(const id of ['login','register'])$(id).setAttribute('aria-selected',String(id===m));$('rules').hidden=m!=='register';$('password').autocomplete=m==='register'?'new-password':'current-password';$('submit').textContent=m==='register'?'CREAR CUENTA Y JUGAR \u2192':'ENTRAR AL JUEGO \u2192';$('error').textContent=''}$('login').onclick=()=>tab('login');$('register').onclick=()=>tab('register');$('form').onsubmit=async e=>{e.preventDefault();$('submit').disabled=true;$('error').textContent='';$('open-game').hidden=true;try{const r=await fetch('/api/'+mode,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('name').value,password:$('password').value})});const d=await r.json();if(!r.ok)throw Error(d.error||'No se pudo completar el acceso.');const session=await fetch('/api/session',{credentials:'include',cache:'no-store'});if(!session.ok){$('open-game').hidden=false;if(mode==='register')tab('login');throw Error('El navegador ha bloqueado la sesi\xF3n. Abre el juego en una pesta\xF1a nueva e inicia sesi\xF3n all\xED.')}location.replace('/')}catch(e){$('error').textContent=e.message}finally{$('submit').disabled=false}};</script><script>(()=>{
const canvas=document.getElementById('living-arena'),c=canvas.getContext('2d');if(!c)return;
let W=0,H=0,last=0,time=12,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
const motion=document.getElementById('motion'),music=document.getElementById('music');
const $=selector=>document.querySelector(selector),prefs={music:false,style:'Degradado',color:'#b6f560',second:'#53bdaa',head:'Nada',tail:'Nada'};
let audioCtx=null;const screen='menu',g=null,practice=null;
function drawAccessory(){}
// Shared game renderer and soundtrack are inserted below.
function circle(c,x,y,r,color,glow=0){c.fillStyle=color;c.shadowColor=color;c.shadowBlur=glow;c.beginPath();c.arc(x,y,Math.max(.1,r),0,Math.PI*2);c.fill();c.shadowBlur=0}function mix(a,b,t){return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('')}
function snake(c,pts,r,angle=0,scale=1){if(!pts.length||scale<=0)return;r*=scale;scale=1;c.save();c.globalAlpha=1;for(let i=pts.length-1;i>=0;i--){let [x,y]=pts[i],t=i/Math.max(1,pts.length-1),col=prefs.style==='Color fijo'?prefs.color:prefs.style==='Multicolor'?(i%6<3?prefs.color:prefs.second):mix(prefs.color,prefs.second,t*.8);let rr=r*(.65+.35*(1-t))*scale;circle(c,x+2,y+4,rr,'#0005');let grad=c.createRadialGradient(x-rr*.3,y-rr*.4,0,x,y,rr);grad.addColorStop(0,mix(col,'#ffffff',.3));grad.addColorStop(.6,col);grad.addColorStop(1,mix(col,'#000000',.35));circle(c,x,y,rr,grad);if(i%2===0)circle(c,x-rr*.22,y-rr*.3,rr*.18,'#ffffff15')}
let h=pts[0],tail=pts[pts.length-1];if(h){c.save();c.translate(...h);c.rotate(angle);for(let side of [-1,1]){circle(c,r*.32,r*.43*side,r*.34*scale,'#f6ffe9');circle(c,r*.47,r*.43*side,r*.18*scale,'#142018');circle(c,r*.51,r*.43*side-r*.06,r*.05*scale,'#fff')}c.restore();drawAccessory(c,prefs.head,...h,r,angle,'head');const near=pts[Math.max(0,pts.length-2)];drawAccessory(c,prefs.tail,...tail,r,Math.atan2(near[1]-tail[1],near[0]-tail[0]),'tail')}c.restore()}


'use strict';
// Ten original procedural arrangements: one score per ten-room chapter.
const SCORES=[
 {name:'Brote de luz',bpm:70,root:48,chords:[0,5,9,7],melody:[12,16,19,16,14,17,21,19,16,19,24,21,14,19,17,14]},
 {name:'Jard\xEDn de chispas',bpm:82,root:50,chords:[0,7,5,9],melody:[12,19,16,24,21,19,16,14,17,21,24,19,16,14,12,19]},
 {name:'Marea de ne\xF3n',bpm:94,root:45,chords:[0,8,3,7],melody:[12,15,19,22,19,15,17,19,24,22,19,17,15,19,14,12]},
 {name:'Catedral de cristal',bpm:104,root:47,chords:[0,5,8,7],melody:[24,19,15,12,14,17,20,24,22,19,17,15,14,19,23,26]},
 {name:'Engranajes del destino',bpm:114,root:48,chords:[0,3,8,7],melody:[12,19,12,22,15,24,19,15,20,15,24,20,19,14,23,26]},
 {name:'Forja de titanes',bpm:124,root:43,chords:[0,8,5,7],melody:[12,12,19,15,22,19,24,22,20,15,17,20,19,23,26,19]},
 {name:'Ciudad indomable',bpm:134,root:45,chords:[0,3,10,7],melody:[24,19,15,19,27,24,22,19,22,26,29,26,23,19,14,19]},
 {name:'Legi\xF3n de estrellas',bpm:144,root:46,chords:[0,8,3,7],melody:[12,19,24,27,31,27,24,19,20,24,27,32,26,23,19,14]},
 {name:'Trono de leyendas',bpm:154,root:47,chords:[0,5,8,7],melody:[24,27,31,36,31,27,24,19,29,32,36,32,31,26,23,19]},
 {name:'El \xFAltimo infinito',bpm:166,root:48,chords:[0,8,3,7],melody:[24,31,36,39,36,31,27,24,32,36,39,43,38,35,31,26]}
];
let musicBus=null,musicNoise=null,musicClock=0,musicIndex=0,musicChapter=-1;
const MUSIC_GAIN=3.5;
const midi=n=>440*2**((n-69)/12);
function musicNote(note,time,duration,type,volume){const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type=type;osc.frequency.setValueAtTime(midi(note),time);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.015);gain.gain.exponentialRampToValueAtTime(volume*.72,time+duration*.65);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);osc.connect(gain);gain.connect(musicBus);osc.start(time);osc.stop(time+duration+.02);}
function musicDrum(kind,time,volume){let gain=audioCtx.createGain();gain.connect(musicBus);gain.gain.setValueAtTime(volume,time);gain.gain.exponentialRampToValueAtTime(.0001,time+(kind==='hat'?.045:.17));if(kind==='kick'){let osc=audioCtx.createOscillator();osc.frequency.setValueAtTime(125,time);osc.frequency.exponentialRampToValueAtTime(42,time+.12);osc.connect(gain);osc.start(time);osc.stop(time+.2)}else{let source=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter();source.buffer=musicNoise;filter.type='highpass';filter.frequency.value=kind==='hat'?6500:1500;source.connect(filter);filter.connect(gain);source.start(time);source.stop(time+.18)}}
function scoreStep(chapter,step,time){const score=SCORES[chapter],beat=60/score.bpm,bar=Math.floor(step/16),local=step%16,chord=score.chords[bar%4],root=score.root+chord,minor=chapter>=2;
 if(local===0){for(let offset of [0,minor?(chord===0||chord===5?3:4):(chord===9?3:4),7])musicNote(root+offset,time,beat*3.5,'sine',.008+chapter*.0006)}
 const spacing=chapter<2?4:chapter<5?2:1;
 if(local%spacing===0){let note=score.root+score.melody[(local+Math.floor(bar/4)*4)%16];musicNote(note,time,beat*(chapter<2?.9:.36),chapter<4?'sine':chapter<7?'triangle':'sawtooth',chapter<7?.018:.009);if(chapter>=8&&local%4===0)musicNote(note-12,time,beat*.7,'triangle',.018)}
 if(local%(chapter<3?8:4)===0)musicNote(root-12,time,beat*.7,'triangle',.025);
 if(chapter>=2&&local%4===0)musicDrum('kick',time,.04);
 if(chapter>=4&&local%8===4)musicDrum('snare',time,.018);
 if(chapter>=3&&local%(chapter>=7?1:2)===0)musicDrum('hat',time,local%2?.006:.011);
 if(chapter>=6&&local===14)musicDrum('kick',time,.026);
 if(chapter>=8&&bar%4===3&&local>=12){musicDrum('snare',time,.012+(local-12)*.003);musicNote(root-12,time,beat*.2,'triangle',.018)}
}
function pumpMusic(){if(!audioCtx)return;const chapter=screen==='practice'?5:screen==='game'&&g?Math.floor(g.i/10):0,active=prefs.music&&document.visibilityState==='visible'&&!(screen==='game'&&g?.state==='pause')&&!(screen==='practice'&&practice?.state==='pause');
 if(!musicBus){musicBus=audioCtx.createGain();const limiter=audioCtx.createDynamicsCompressor();limiter.threshold.value=-10;limiter.ratio.value=4;musicBus.connect(limiter);limiter.connect(audioCtx.destination);musicNoise=audioCtx.createBuffer(1,audioCtx.sampleRate*.2,audioCtx.sampleRate);const data=musicNoise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;musicBus.gain.value=0;}
 const now=audioCtx.currentTime;musicBus.gain.setTargetAtTime(active?MUSIC_GAIN:0,now,.06);
 if(!active){musicClock=now;musicChapter=-1;return;}
 if(chapter!==musicChapter){musicChapter=chapter;musicIndex=0;musicClock=now+.08;$('#music').title=SCORES[chapter].name+' \xB7 '+SCORES[chapter].bpm+' BPM';}
 if(musicClock<now-.1)musicClock=now;
 while(musicClock<now+.1){scoreStep(chapter,musicIndex++,musicClock);musicClock+=60/SCORES[chapter].bpm/4;}
}



function resize(){W=innerWidth;H=innerHeight;const d=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(W*d);canvas.height=Math.round(H*d);c.setTransform(d,0,0,d,0,0);draw()}
const actors=[{a:.21,b:.33,r:19,s:.23,phase:0,col:'#b6f560',second:'#388c68'},{a:.56,b:.71,r:16,s:.19,phase:2,col:'#59b8ff',second:'#735bc6'},{a:.78,b:.22,r:13,s:.16,phase:4,col:'#bd8aff',second:'#656bc1'},{a:.32,b:.85,r:12,s:.2,phase:1.3,col:'#ffa653',second:'#b75862'},{a:.85,b:.68,r:18,s:.13,phase:5.8,col:'#79dfb0',second:'#398b91'}];
function position(actor,t){return [W*(actor.a+.23*Math.sin(t*actor.s+actor.phase)),H*(actor.b+.25*Math.sin(t*actor.s*.81+actor.phase*1.8))]}
function draw(){c.clearRect(0,0,W,H);c.fillStyle='#0b120e';c.fillRect(0,0,W,H);c.strokeStyle='#b6f56008';c.lineWidth=1;const spacing=64;for(let x=0;x<W;x+=spacing){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke()}for(let y=0;y<H;y+=spacing){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}
for(let i=0;i<(W<600?40:100);i++){const x=((i*127.37+49)%997)/997*W,y=((i*219.83+17)%991)/991*H;const pulse=.5+.5*Math.sin(time*.8+i);circle(c,x,y,1.5+pulse*.8,['#b6f56050','#59b8ff50','#bd8aff50'][i%3],pulse*3)}
for(const actor of actors.slice(0,W<600?3:5)){const pts=[];const count=W<600?52:74;for(let i=0;i<count;i++)pts.push(position(actor,time-i*.055));const h=pts[0],p=pts[1],angle=Math.atan2(h[1]-p[1],h[0]-p[0]);prefs.color=actor.col;prefs.second=actor.second;snake(c,pts,actor.r*(W<600?.75:1),angle)}
}
function frame(ts){requestAnimationFrame(frame);if(document.hidden||ts-last<33)return;const dt=Math.min((ts-last)/1000,.05);last=ts;if(!paused){time+=dt;draw()}}
function motionLabel(){motion.textContent=paused?'\u25B7 Animar fondo':'\u2161 Pausar fondo';motion.setAttribute('aria-pressed',String(!paused))}motion.onclick=()=>{paused=!paused;motionLabel();draw()};motionLabel();
music.onclick=async()=>{try{if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();await audioCtx.resume();prefs.music=!prefs.music;pumpMusic();music.textContent=prefs.music?'\u266B M\xFAsica activada':'\u266B Activar m\xFAsica';music.setAttribute('aria-pressed',String(prefs.music))}catch{music.textContent='\u266B Reintentar m\xFAsica'}};
document.addEventListener('visibilitychange',()=>{if(audioCtx){if(document.hidden){audioCtx.suspend()}else if(prefs.music){audioCtx.resume().catch(()=>{})}}});
window.addEventListener('pagehide',()=>{if(audioCtx)audioCtx.suspend()});window.addEventListener('resize',resize);setInterval(pumpMusic,40);resize();requestAnimationFrame(frame);
})();
</script></body></html>`;

// worker/game-html.ts
var gameHtml = `<!DOCTYPE html>
<!-- saved from url=(0055)https://snakeomg-arcade-rooms.sunnyferry2.chatgpt.site/ -->
<html lang="es" style="--accent: #b6f560;"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>SnakeOMG \u2014 Cada segundo cuenta</title><style>
:root{--accent:#b6f560;--bg:#10130f;--panel:#191e17;--muted:#8a9384}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:#f0f3e9;font-family:'Space Grotesk',system-ui,sans-serif;min-height:100vh}button,a,input,select{-webkit-tap-highlight-color:transparent}button{font:inherit;cursor:pointer;transition:transform .16s,background .16s;border:1px solid #ffffff20;background:#ffffff06;color:inherit;border-radius:10px;padding:14px 20px}button:hover{transform:translateY(-2px);background:#ffffff10;border-color:var(--accent)}button:active{transform:scale(.97)}button:disabled{opacity:.35;cursor:not-allowed}button:focus-visible,a:focus-visible{outline:2px solid var(--accent);outline-offset:4px}.primary{background:var(--accent);color:#17200e;border:0;font-weight:700}.primary:hover{background:var(--accent);filter:brightness(1.1)}header{height:100px;max-width:1440px;margin:auto;padding:28px 5%;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff0e}#brand{font-weight:700;font-size:26px;letter-spacing:-1px;color:#f0f3e9;text-decoration:none}#brand span{color:var(--accent)}#brand small{display:block;font-size:9px;letter-spacing:3px;color:var(--muted);margin-top:4px}.audio{display:flex;gap:8px}.audio button{font-size:12px;padding:10px 13px;color:var(--muted)}main{max-width:1340px;margin:auto;padding:40px 4%}.hero{display:grid;grid-template-columns:1fr 1.05fr;align-items:center;min-height:570px;gap:40px}.eyebrow{font-size:11px;letter-spacing:3px;color:var(--accent);display:flex;align-items:center;gap:10px}.eyebrow:before{content:'';width:7px;height:7px;background:var(--accent);border-radius:50%;box-shadow:0 0 14px var(--accent)}h1{font-size:clamp(60px,7.4vw,104px);letter-spacing:-7px;line-height:.95;margin:27px 0}h1 span{color:var(--accent)}.intro{font-size:16px;line-height:1.8;color:#a4ad9c;max-width:390px}.menu{display:grid;gap:10px;max-width:350px;margin-top:30px}.menu button{display:flex;justify-content:space-between;text-align:left;font-size:12px;letter-spacing:1px;padding:18px 22px}.hero-art{position:relative;border:1px solid #ffffff10;border-radius:28px;background:radial-gradient(ellipse at center,#3f552328,transparent 70%);overflow:hidden;aspect-ratio:1}.hero-art canvas{width:100%;height:100%}.tag{position:absolute;font-size:10px;letter-spacing:2px;color:#a3af94;top:25px;left:26px}.tag.bottom{top:auto;bottom:25px;display:flex;justify-content:space-between;width:calc(100% - 52px)}.features{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #ffffff13;margin-top:30px;padding-top:28px;gap:30px}.features b{color:var(--accent);font-size:24px}.features h3{font-size:13px;margin:10px 0}.features p{font-size:12px;line-height:1.7;color:var(--muted);margin:0}footer{max-width:1340px;margin:25px auto 0;padding:24px 4%;display:flex;justify-content:space-between;color:#606b59;font-size:9px;letter-spacing:2px;border-top:1px solid #ffffff0d}.page-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:30px}h2{font-size:34px;letter-spacing:-1px;margin:10px 0}.sub{color:var(--muted);font-size:13px}.level-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}.level{min-height:180px;text-align:left;background:linear-gradient(135deg,#28351f55,#171c15);position:relative}.level strong{display:block;font-size:36px;color:var(--accent);margin-bottom:25px}.level span{display:block;font-size:12px}.level small{display:block;color:var(--muted);margin-top:9px;font-size:10px}.game-top{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:18px}.stat{font-size:10px;letter-spacing:1px;color:var(--muted)}.stat b{display:block;color:#eff5e7;font-size:22px;margin-top:6px;font-variant-numeric:tabular-nums}.life{width:200px}.bar{height:5px;background:#ffffff15;margin-top:8px;border-radius:5px;overflow:hidden}.bar i{display:block;height:100%;background:var(--accent);transition:width .1s}.arena{position:relative;border:1px solid #425139;border-radius:18px;overflow:hidden;background:#11190f;box-shadow:0 20px 90px #0005}.arena canvas{display:block;width:100%;aspect-ratio:1.8;touch-action:none}.objective{display:flex;justify-content:space-between;gap:15px;margin:17px 0;font-size:12px;color:#a7b69c}.legend{display:flex;flex-wrap:wrap;gap:20px;font-size:10px;color:var(--muted);margin-top:16px}.legend em{font-style:normal;color:var(--accent)}.overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#080e0cce;backdrop-filter:blur(7px);z-index:2}.modal{text-align:center;max-width:460px;padding:30px}.modal h2{font-size:42px}.modal p{line-height:1.7;color:#a8b39f}.modal button{margin:6px}.badge{color:var(--accent);font-size:48px}.custom{display:grid;grid-template-columns:1fr 1fr;gap:35px}.preview{background:radial-gradient(ellipse,#34432555,transparent);border:1px solid #ffffff15;border-radius:22px;align-self:start}.preview canvas{width:100%;display:block}.settings{display:grid;gap:20px}.settings label{display:block;font-size:12px;color:#a5af9b;margin-bottom:9px}.settings select{width:100%;background:#20281c;color:white;border:1px solid #ffffff22;padding:12px;border-radius:8px}.colors{display:flex;gap:9px;flex-wrap:wrap}.swatch{width:30px;height:30px;border-radius:50%;padding:0;border:2px solid #ffffff30}.swatch.active{outline:2px solid white;outline-offset:3px}input[type=color]{width:36px;height:32px;padding:0;border:0;background:none}.row{display:grid;grid-template-columns:1fr 1fr;gap:15px}.tabs{display:flex;gap:8px;flex-wrap:wrap}.tabs button.active{background:var(--accent);color:#111}.records{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:30px}.record{padding:40px;border:1px solid #ffffff18;background:var(--panel);border-radius:15px}.record strong{display:block;font-size:50px;color:var(--accent);margin-top:20px}.touch{display:none;justify-content:center;gap:10px;margin-top:15px}.touch button{font-size:22px;width:58px;padding:12px}#flash{position:fixed;inset:0;pointer-events:none;z-index:10}#flash.eat{animation:eat .35s}#flash.danger{box-shadow:inset 0 0 130px #ff183a90;animation:danger .75s infinite alternate}@keyframes eat{from{background:#72ff5b35}to{background:transparent}}@keyframes danger{to{box-shadow:inset 0 0 45px #ff183a20}}@media(max-width:760px){header{height:80px}main{padding:25px 5%}.hero{grid-template-columns:1fr;gap:30px}.hero-art{grid-row:2;max-height:400px}h1{letter-spacing:-4px;font-size:72px}.hero .intro{font-size:14px}.menu{max-width:none}.features{gap:15px}.level-grid{grid-template-columns:repeat(2,1fr)}.custom{grid-template-columns:1fr}.game-top{gap:10px;flex-wrap:wrap}.life{width:130px}.stat b{font-size:18px}.objective{flex-direction:column}.touch{display:flex}.records{grid-template-columns:1fr}.record{padding:25px}footer span:last-child{display:none}.arena canvas{min-height:290px;object-fit:contain}.page-head{gap:10px}.page-head h2{font-size:28px}}#flash.contact{animation:contact-pulse .8s ease-in-out infinite;box-shadow:inset 0 0 85px #ff294f75;border:3px solid #ff486e90}@keyframes contact-pulse{0%,100%{box-shadow:inset 0 0 45px #ff294f25;border-color:#ff486e45}50%{box-shadow:inset 0 0 105px #ff294f90;border-color:#ff486ecc}}.contact-warning{position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:1;max-width:calc(100% - 24px);width:max-content;background:#641e2df5;border:1px solid #ff7894;color:#fff1f4;box-shadow:0 4px 20px #0006;border-radius:10px;padding:10px 18px;text-align:center;font-size:12px;font-weight:700;letter-spacing:.5px;pointer-events:none}.contact-warning[hidden]{display:none}.contact-warning span{display:block;font-size:11px;font-weight:400;letter-spacing:0;margin-top:4px}@media(prefers-reduced-motion:reduce){#flash.contact{animation:none;box-shadow:inset 0 0 60px #ff294f60}}
.chapters{display:grid;grid-template-columns:repeat(5,1fr);margin-bottom:25px}.chapters button{font-size:13px;padding:12px 7px}.chapters small{display:block;font-size:9px;margin-top:5px;opacity:.75}.chapters+.tabs{margin-top:20px}@media(max-width:760px){.chapters{grid-template-columns:repeat(2,1fr)}.objective{line-height:1.6}.legend{line-height:1.8}}
.speed-effect{position:absolute;left:14px;bottom:14px;z-index:1;border:1px solid currentColor;padding:9px 15px;border-radius:9px;font-size:13px;font-weight:700;letter-spacing:1px;pointer-events:none;box-shadow:0 3px 18px #0008}.speed-effect[hidden]{display:none}.speed-effect.turbo{color:#8affef;background:#123e3bf0}.speed-effect.slow{color:#d3baff;background:#352253f0}
.map-view{position:relative}.inventory{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:10px 13px;background:#141d13;border-bottom:1px solid #ffffff1a;min-height:59px}.inventory-title{font-size:9px;letter-spacing:2px;color:#a1b59a;margin-right:6px}.inventory-chip{display:flex;align-items:center;gap:8px;border:1px solid #ffffff17;background:#ffffff06;border-radius:8px;padding:5px 10px 5px 5px;animation:inventory-pop .22s ease-out}.inventory-chip>.guide-icon{width:30px;height:30px;min-width:30px;font-size:14px}.inventory-chip>span:last-child{font-size:10px;color:#acb8a8}.inventory-chip b{display:block;color:#f1f9eb;font-size:14px;margin-top:2px}.inventory-empty{font-size:12px;color:#8d9d84}@keyframes inventory-pop{from{transform:translateY(3px);border-color:var(--item)}to{transform:translateY(0)}}
.guide-icon{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;min-width:48px;min-height:48px;padding:4px 7px;border-radius:11px;background:color-mix(in srgb,var(--item) 14%,#142018);border:1px solid var(--item);color:var(--item);font-size:21px;font-weight:700;white-space:nowrap}.overlay.guide-overlay{position:fixed;inset:0;z-index:30;padding:18px;background:#070e0bde;backdrop-filter:blur(12px)}.level-guide{padding:0;text-align:left;width:min(940px,100%);max-width:940px;max-height:90vh;max-height:90dvh;overflow:auto;background:#141c12;border:1px solid #7c95624d;border-radius:22px;box-shadow:0 25px 100px #0008}.guide-head{padding:25px 28px 15px}.level-guide h2{font-size:32px;margin:12px 0}.level-guide p{font-size:13px;line-height:1.55;margin:0}.guide-flow{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:5px 28px 22px}.guide-step{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:9px;background:linear-gradient(125deg,#b6f56012,#ffffff03);border:1px solid #b6f56024;border-radius:13px;padding:16px}.step-no{position:absolute;right:13px;top:13px;font-size:10px;letter-spacing:2px;color:#8ea579}.guide-step b{font-size:16px}.guide-step>span:last-child{font-size:12px;color:#a7b69d;line-height:1.4}.guide-content{padding:0 28px 22px}.guide-content h3{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#b6f560;margin:20px 0 13px}.guide-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}.guide-grid article{display:flex;gap:13px;align-items:flex-start;padding:14px;border:1px solid #ffffff0e;border-radius:11px;background:#ffffff03}.guide-grid h4{font-size:13px;margin:0 0 5px}.guide-grid p{font-size:12px;color:#aab7a3}.guide-basics{display:flex;gap:12px 20px;flex-wrap:wrap;padding-top:24px;font-size:11px;color:#a9b79f;line-height:1.6}.guide-actions{position:sticky;bottom:0;padding:13px 24px;background:#192215f5;border-top:1px solid #ffffff16;display:flex;gap:12px;align-items:center;justify-content:space-between;backdrop-filter:blur(10px)}.guide-actions>span{font-size:11px;color:#a8b79a}.guide-actions button{font-size:12px;margin:3px}.guide-actions .primary{padding:15px 20px}@media(max-width:650px){.overlay.guide-overlay{padding:10px}.level-guide{max-height:95dvh;border-radius:15px}.guide-head{padding:20px 16px 12px}.level-guide h2{font-size:26px}.guide-flow{padding:5px 16px 15px;gap:7px}.guide-step{padding:11px 8px}.guide-step .guide-icon{min-width:34px;min-height:36px;font-size:16px}.guide-step b{font-size:13px}.guide-step>span:last-child{font-size:10px}.step-no{display:none}.guide-content{padding:0 16px 16px}.guide-grid{grid-template-columns:1fr}.guide-actions{padding:10px;flex-direction:column;gap:4px}.guide-actions>div{display:flex;width:100%;justify-content:center}.guide-actions button{padding:10px;font-size:11px}.inventory{padding:8px;gap:6px}.inventory-title{width:100%;font-size:8px}.inventory-chip{padding:4px 7px 4px 4px}.inventory-chip b{font-size:12px}}@media(prefers-reduced-motion:reduce){.inventory-chip{animation:none}}
.object-illustration{position:relative;display:inline-flex;width:44px;height:44px;flex-shrink:0;vertical-align:middle}.object-illustration svg{width:100%;height:100%;filter:drop-shadow(0 2px 2px #0005)}.object-illustration small{position:absolute;bottom:0;right:0;border-radius:50%;background:#25352e;color:white;font-size:10px;width:15px;height:15px;display:grid;place-items:center}.guide-icon:has(.object-illustration){background:transparent;border-color:#ffffff16;padding:3px;gap:3px}.inventory-chip .object-illustration{width:29px;height:29px}.guide-flow .guide-icon:has(.object-illustration){min-width:48px}.guide-grid .guide-icon:has(.object-illustration){max-width:130px;flex-wrap:wrap}@media(max-width:650px){.guide-flow .object-illustration{width:28px;height:28px}.guide-step .guide-icon{flex-wrap:wrap}}
/* Viewport-fitted play surface. The canvas scales proportionally inside the available space. */
body.playing{height:100vh;height:100dvh;min-height:0;overflow:hidden;display:grid;grid-template-rows:48px minmax(0,1fr);padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}body.playing>header{height:48px;min-height:0;width:100%;max-width:1600px;padding:6px 16px;margin:0 auto}body.playing #brand{font-size:20px}body.playing #brand small{display:none}body.playing .audio{gap:5px}body.playing .audio button{padding:7px 10px;font-size:11px}body.playing>footer{display:none}body.playing main{width:100%;max-width:1600px;height:100%;min-height:0;padding:8px 14px;margin:0 auto;display:grid;grid-template-rows:auto minmax(0,1fr) auto auto;gap:7px;align-content:center}body.playing .game-top{margin:0;gap:10px;min-width:0;flex-wrap:nowrap}body.playing .game-top .stat:first-child{flex:1;min-width:0}body.playing .game-top .stat:first-child b{font-size:clamp(13px,1.5vw,20px);line-height:1.15}body.playing .game-top .stat{font-size:9px}body.playing .game-top .stat b{font-size:19px;margin-top:3px}body.playing .game-top button{padding:9px 12px;white-space:nowrap}body.playing .life{width:clamp(110px,15vw,200px)}body.playing .arena{height:100%;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);border-radius:13px;box-shadow:0 8px 30px #0004}body.playing .map-view{min-width:0;min-height:0;width:100%;height:100%;overflow:hidden;display:grid;place-items:center}body.playing .arena canvas{display:block;width:100%;height:100%;min-height:0;min-width:0;aspect-ratio:auto;object-fit:contain;outline-offset:-2px}body.playing .inventory{min-height:0;padding:5px 9px;gap:6px}body.playing .inventory-title{width:auto}body.playing .inventory-chip{padding:3px 7px 3px 3px}body.playing .inventory-chip b{font-size:12px}body.playing .inventory-chip>.guide-icon{min-height:25px;height:25px;min-width:25px;width:25px}body.playing .inventory-chip .object-illustration{width:25px;height:25px}body.playing .objective{margin:0;gap:8px;line-height:1.35;font-size:11px;min-width:0}body.playing .objective>span:first-child{flex:1}body.playing .objective>span:last-child{font-size:9px;color:#8e9b84;flex-shrink:0}body.playing .legend{display:none}body.playing .touch{margin:0;gap:8px}body.playing .touch button{font-size:20px;width:52px;padding:7px 10px;min-height:38px}body.playing .overlay:not(.guide-overlay){overflow:auto;padding:12px}body.playing .modal:not(.level-guide){max-height:100%;overflow:auto;padding:18px}body.playing .contact-warning{top:6px;padding:7px 12px;font-size:11px}body.playing .speed-effect{bottom:7px;left:8px;padding:6px 10px;font-size:11px}
@media(max-width:700px){body.playing{grid-template-rows:42px minmax(0,1fr)}body.playing>header{height:42px;padding:5px 8px}body.playing #brand{font-size:18px}body.playing .audio button{font-size:10px;padding:6px}body.playing main{padding:6px;gap:6px}body.playing .game-top{display:grid;grid-template-columns:minmax(0,1fr) minmax(90px,1fr) auto auto;gap:5px 9px}body.playing .game-top .stat:first-child{grid-column:1 / 3}body.playing .game-top .life{grid-column:1;width:100%}body.playing .game-top .stat:nth-child(3){grid-column:2}body.playing .game-top .stat:nth-child(4){grid-column:3 / 5}body.playing .game-top button{grid-row:1;padding:6px 9px;font-size:11px}body.playing .game-top button:first-of-type{grid-column:3}body.playing .game-top button:last-of-type{grid-column:4}body.playing .game-top .stat b{font-size:15px}body.playing .game-top .stat:first-child b{font-size:14px}body.playing .objective{display:block;font-size:10px}body.playing .objective>span:last-child{display:none}body.playing .inventory{gap:5px;padding:5px}body.playing .inventory-title{font-size:8px;letter-spacing:1px}body.playing .inventory-chip>span:last-child{font-size:9px}}
@media(pointer:coarse){body.playing .touch{display:flex}}
@media(max-height:500px) and (min-width:480px){body.playing{grid-template-rows:34px minmax(0,1fr)}body.playing>header{height:34px;padding:3px 10px}body.playing #brand{font-size:16px}body.playing .audio button{padding:4px 8px}body.playing main{padding:4px 8px;gap:4px}body.playing .game-top{display:flex;gap:8px}body.playing .game-top .stat:first-child b{font-size:13px}body.playing .game-top .stat b{font-size:14px}body.playing .game-top button{padding:5px 8px}body.playing .inventory{padding:3px 7px;gap:5px}body.playing .inventory-chip{padding:2px 5px}body.playing .inventory-chip>.guide-icon{min-width:20px;width:20px;min-height:20px;height:20px}body.playing .inventory-chip .object-illustration{width:20px;height:20px}body.playing .inventory-chip b{font-size:10px}body.playing .objective{font-size:9px}body.playing .touch button{min-height:28px;padding:3px 10px;font-size:16px}.guide-head{padding-top:12px}.guide-actions{padding:7px 16px}}
@media(min-width:900px) and (min-height:600px){body:not(.playing)>header{height:76px;padding-top:15px;padding-bottom:15px}body:not(.playing) main:has(.hero){padding-top:20px;padding-bottom:10px}.hero{min-height:0;gap:28px}.hero h1{font-size:clamp(48px,5.3vw,76px);letter-spacing:-4px;margin:20px 0}.hero-art{max-height:52vh;max-height:52dvh;justify-self:center}.hero .intro{font-size:14px;line-height:1.6}.hero .menu{margin-top:20px;gap:8px}.hero .menu button{padding:14px 20px}.features{margin-top:20px;padding-top:18px}.features p{font-size:11px}footer{margin-top:10px;padding-top:16px;padding-bottom:16px}}
body.playing>.grain{display:none}body.playing>header{grid-row:1}body.playing>main{grid-row:2}

@media(max-height:500px) and (min-width:480px){body.playing .game-top .life{width:110px;flex-shrink:0}}
@media(max-width:600px){body:not(.playing)>header{height:auto;min-height:64px;gap:8px;flex-wrap:wrap;padding:12px 5%}}
.mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px;max-width:1050px;margin:40px auto}.mode-card{text-align:left;min-height:300px;padding:32px;background:radial-gradient(ellipse at top right,#b6f56018,transparent 65%),#182217;display:flex;flex-direction:column;gap:20px}.mode-tag{font-size:10px;letter-spacing:2px;color:var(--accent)}.mode-card strong{font-size:30px;letter-spacing:-1px}.mode-card p{color:#a6b89d;line-height:1.7;font-size:14px;margin:0}.mode-action{margin-top:auto;color:var(--accent);font-size:12px;letter-spacing:1px}.mode-card.future{opacity:.5;background:#171e18}.practice-mode .arena canvas#practice-board{width:100%;height:100%;object-fit:contain;touch-action:none}.practice-mode .arena canvas#practice-mini{position:absolute;width:180px;height:134px;min-height:0;right:10px;bottom:10px;border:1px solid #99bc8c55;border-radius:9px;pointer-events:none}.practice-ranking{position:absolute;right:10px;top:10px;width:180px;padding:10px;background:#0d1815dc;border:1px solid #99bc8c33;border-radius:9px;pointer-events:none;font-size:10px;color:#bccfb6}.practice-ranking>b{display:block;font-size:9px;letter-spacing:2px;margin-bottom:7px}.practice-ranking>div{display:flex;justify-content:space-between;gap:10px;margin-top:5px}.practice-mode .overlay[hidden]{display:none}.practice-mode .practice-touch{display:flex}.practice-mode .practice-touch button{width:auto;min-width:90px}.practice-mode #practice-boost{color:#b6f560;border-color:#8cac5f;background:#263b20;touch-action:none}.practice-mode .guide-grid .guide-icon svg{width:42px;height:42px}.practice-mode #practice-notice{color:#b9dba8}.practice-mode .inventory{max-height:92px;overflow:auto}@media(max-width:700px){.mode-grid{grid-template-columns:1fr;margin:20px auto;gap:14px}.mode-card{min-height:240px;padding:24px}.practice-mode .arena canvas#practice-mini{width:120px;height:89px;right:6px;bottom:6px}.practice-ranking{width:125px;right:6px;top:6px;padding:7px;font-size:9px}.practice-ranking>div:nth-child(n+5){display:none}.practice-mode .inventory{max-height:82px}.practice-mode .practice-touch button{font-size:13px}.practice-mode .game-top .stat:nth-child(2){grid-column:1}.practice-mode .game-top .stat:nth-child(3){grid-column:2}}

.audio{align-items:center}
#account-name{display:block;flex:0 1 auto;min-width:48px;max-width:160px;padding:9px 13px;border:1px solid #b6f56028;border-radius:10px;background:#b6f5600b;color:#d8edbd;font-size:12px;font-weight:600;line-height:18px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body.playing #account-name{max-width:130px;padding:4px 10px;font-size:11px;line-height:16px}
@media(max-width:600px){#account-name{max-width:110px;padding:7px 10px}body.playing #account-name{min-width:32px;max-width:80px;padding:3px 7px;font-size:10px;line-height:16px}}
</style></head><body><div class="grain"></div><header><a id="brand" href="#">SNAKE<span>OMG</span><small>ARCADE / SURVIVAL</small></a><div class="audio"><span id="account-name"></span><small id="save-status" role="status" aria-live="polite" hidden></small><button id="logout">Salir de la cuenta</button><button id="fullscreen" onclick="toggleFullscreen()" aria-label="Alternar pantalla completa" aria-pressed="false">\u26F6 Pantalla completa</button><button id="music" aria-label="Activar m\xFAsica">\u266B OFF</button><button id="sound" aria-label="Activar efectos">\u25D6 ON</button></div></header><main id="app"><section class="hero"><div><div class="eyebrow">SUPERVIVENCIA EN ESTADO PURO</div><h1>Snake<span>OMG</span><br>Cada segundo<br>cuenta.</h1><p class="intro">No basta con sobrevivir. Come, resuelve los mecanismos y encuentra la salida antes de desaparecer.</p><div class="menu"><button class="primary" onclick="levels()">INICIAR PARTIDA <span>\u2197</span></button><button onclick="multiplayerMenu()">MULTIJUGADOR <span>\u25CE</span></button><button onclick="customize()">PERSONALIZAR <span>\u25C7</span></button><button onclick="records(0)">CLASIFICACI\xD3N <span>\u2197</span></button></div></div><div class="hero-art"><span class="tag">ESP\xC9CIMEN 001 / LISTO PARA ESCAPAR</span><canvas id="show" width="620" height="620"></canvas><span class="tag bottom"><span>\u25CF SISTEMA ACTIVO</span><span>\u221E INSTINTO</span></span></div></section><div class="features"><div><b>01 /</b><h3>El tiempo es tu vida</h3><p>Cada bocado te da una oportunidad.<br>Cada segundo cambia las reglas.</p></div><div><b>100 /</b><h3>Habitaciones por descubrir</h3><p>Interruptores, portales y puzles.<br>Encuentra tu propia ruta de escape.</p></div><div><b>\u221E /</b><h3>Tu serpiente. Tu estilo.</h3><p>Colores, accesorios y combinaciones.<br>Deja tu marca en cada r\xE9cord.</p></div></div></main><div id="flash" class=""></div><footer><span>COME. RESUELVE. ESCAPA.</span><span>100 HABITACIONES \xB7 UNA VIDA A CONTRARRELOJ</span></footer><script>window.PLAYER_ID=__PLAYER_ID_JSON__;window.PLAYER_PROGRESS=__PLAYER_PROGRESS_JSON__;</script><script>
'use strict';
const HEAD_ITEMS=['Nada','Corona','Tiara','Peluca','Cresta','Sombrero','Gorro','Gorra','Casco','Pirata','Bruja','Auriculares','Gafas','Antenas','Halo','Flores','Cuernos'];
const TAIL_ITEMS=['Nada','Espada','Lazo','Diamante','Estrella','Bandera','Tridente','Martillo','Cohete','Llama','Coraz\xF3n','Campana','Pluma','Cristal','Luna','Abanico','Ancla'];
function shape(c,points,fill,stroke='#18251e',width=.07){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.stroke()}}
function ellipse(c,x,y,rx,ry,fill){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();c.lineWidth=.05;c.strokeStyle='#18251e';c.stroke()}
function star(c,x,y,r,color,n=5){shape(c,Array.from({length:n*2},(_,i)=>{let a=i*Math.PI/n-Math.PI/2,d=i%2?r*.44:r;return[x+Math.cos(a)*d,y+Math.sin(a)*d]}),color)}
function line(c,pts,color,w=.1){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.stroke()}
function drawAccessory(c,name,x,y,r,angle,slot){if(name==='Nada'||r<=0)return;c.save();c.globalAlpha=1;c.globalCompositeOperation='source-over';c.translate(x,y);c.rotate(angle);c.scale(r*1.18,r*1.18);c.translate(slot==='tail'?-1.05:0,slot==='head'?-1:0);c.shadowColor='#000';c.shadowBlur=2;c.shadowOffsetY=1;
const gold='#ffd969',white='#f8fcff',pink='#ff70b4',blue='#77dfff',red='#fa697a',dark='#293546';
switch(name){
case 'Corona':shape(c,[[-.85,.2],[-1,-.65],[-.4,-.3],[0,-1],[.4,-.3],[1,-.65],[.85,.2]],gold);ellipse(c,0,-.25,.16,.16,red);break;
case 'Tiara':shape(c,[[-1,.15],[0,-.85],[1,.15]],'#cbd8ed');star(c,0,-.38,.3,pink);break;
case 'Peluca':for(let i=0;i<9;i++)ellipse(c,-.9+i*.22,-.3-Math.sin(i/8*Math.PI)*.4,.32,.4,['#ff75b9','#d071e9','#a975ef'][i%3]);break;
case 'Cresta':shape(c,[[-.9,.2],[-.8,-.6],[-.4,-.3],[0,-1.2],[.3,-.4],[.8,-.9],[.9,.2]],red);break;
case 'Sombrero':ellipse(c,0,.1,1.1,.23,dark);shape(c,[[-.6,0],[-.55,-1.1],[.55,-1.1],[.6,0]],dark);line(c,[[-.57,-.25],[.57,-.25]],red,.2);break;
case 'Gorro':shape(c,[[-.85,.1],[-.5,-.8],[.45,-1],[.8,.1]],red);line(c,[[-.85,.1],[.85,.1]],white,.3);ellipse(c,.45,-1,.25,.25,white);break;
case 'Gorra':ellipse(c,0,-.2,.8,.6,blue);shape(c,[[-.8,.1],[1.2,.1],[1.4,.3],[-.7,.3]],blue);break;
case 'Casco':ellipse(c,0,-.2,.9,.65,gold);line(c,[[0,-.8],[0,.2]],'#fff1b5',.18);line(c,[[-1,.2],[1,.2]],gold,.2);break;
case 'Pirata':shape(c,[[-1,.2],[-.8,-.7],[0,-.35],[.8,-.7],[1,.2]],dark);ellipse(c,0,-.12,.21,.21,white);line(c,[[-.3,.12],[.3,-.3]],white,.07);break;
case 'Bruja':shape(c,[[-1,.2],[1,.2],[.4,-.1],[.25,-1.4],[-.4,-.2]],'#9d6bda');star(c,0,-.45,.2,gold);break;
case 'Auriculares':line(c,[[-.9,.4],[-.9,-.55],[0,-.9],[.9,-.55],[.9,.4]],blue,.22);ellipse(c,-.9,.2,.24,.42,dark);ellipse(c,.9,.2,.24,.42,dark);break;
case 'Gafas':for(let a of [-.55,.55])ellipse(c,a,.5,.45,.33,'#284773');line(c,[[-.15,.5],[.15,.5]],gold,.12);line(c,[[-.8,.35],[-.5,.5]],white,.06);break;
case 'Antenas':for(let a of [-1,1]){line(c,[[a*.4,0],[a*.8,-1]],blue,.09);ellipse(c,a*.8,-1,.23,.23,pink)}break;
case 'Halo':ellipse(c,0,-.65,1,.25,gold);ellipse(c,0,-.65,.7,.1,'#fcffcd');break;
case 'Flores':for(let a of [-.7,0,.7]){star(c,a,-.3,.45,pink,6);ellipse(c,a,-.3,.12,.12,gold)}break;
case 'Cuernos':for(let a of [-1,1])shape(c,[[a*.35,.15],[a*.9,-1.2],[a*.95,-.1]],'#fff1d7');break;
case 'Espada':shape(c,[[-1.7,0],[-1.15,-.3],[.2,-.15],[.2,.15],[-1.15,.3]],white);line(c,[[.15,-.5],[.15,.5]],gold,.2);line(c,[[.2,0],[.7,0]],'#925a47',.22);break;
case 'Lazo':shape(c,[[0,0],[-.9,-.65],[-1,.65]],pink);shape(c,[[0,0],[.9,-.65],[1,.65]],pink);ellipse(c,0,0,.23,.23,gold);break;
case 'Diamante':case 'Cristal':shape(c,[[-.9,0],[-.4,-.65],[.4,-.65],[.9,0],[0,.95]],name==='Cristal'?'#ce8aff':blue);line(c,[[-.9,0],[.9,0],[0,.95],[-.35,0],[0,-.65],[.35,0],[0,.95]],white,.05);break;
case 'Estrella':star(c,0,0,1,gold);break;
case 'Bandera':line(c,[[.25,.8],[.25,-1]],white,.13);shape(c,[[.25,-1],[-1.1,-.9],[-.9,-.1],[.25,-.2]],red);break;
case 'Tridente':line(c,[[.8,0],[-1.2,0]],gold,.18);line(c,[[-1.2,-.6],[-.7,-.6],[-.7,.6],[-1.2,.6]],gold,.15);for(let y of [-.6,0,.6])shape(c,[[-1.6,y],[-1.1,y-.18],[-1.1,y+.18]],gold);break;
case 'Martillo':line(c,[[.7,0],[-.8,0]],'#b88755',.25);shape(c,[[-1.1,-.65],[-.5,-.65],[-.5,.65],[-1.1,.65]],'#d5deeb');break;
case 'Cohete':shape(c,[[-1.25,0],[-.55,-.5],[.65,-.4],[.65,.4],[-.55,.5]],white);ellipse(c,-.25,0,.22,.22,blue);shape(c,[[.65,-.25],[1.3,0],[.65,.25]],'#ffab4f');break;
case 'Llama':shape(c,[[.7,.5],[-.7,.7],[-1.2,-.1],[-.7,.1],[-1.05,-1],[-.2,-.5],[.3,-.9]],'#ff9254');shape(c,[[.3,.3],[-.55,.3],[-.5,-.45]],gold);break;
case 'Coraz\xF3n':ellipse(c,-.3,-.25,.45,.45,pink);ellipse(c,.3,-.25,.45,.45,pink);shape(c,[[-.7,-.1],[.7,-.1],[0,.85]],pink,null);break;
case 'Campana':shape(c,[[-.75,.5],[-.45,-.6],[.45,-.6],[.75,.5]],gold);ellipse(c,0,.6,.18,.18,white);break;
case 'Pluma':ellipse(c,-.3,-.2,.5,.95,'#88e9da');line(c,[[.2,.9],[-.4,-.9]],white,.08);break;
case 'Luna':ellipse(c,0,0,.8,.8,gold);shape(c,[[.1,-.7],[-.25,-.3],[-.25,.3],[.1,.7],[.5,.4],[.7,0],[.5,-.4]],'#fff1b4',null);break;
case 'Abanico':shape(c,[[.5,0],[-.4,-1],[-1,-.6],[-1,.6],[-.4,1]],pink);for(let y of [-.8,-.4,0,.4,.8])line(c,[[.5,0],[-.8,y]],gold,.06);break;
case 'Ancla':line(c,[[.4,0],[-.8,0]],white,.17);line(c,[[-.5,-.6],[-1,-.3],[-1,.3],[-.5,.6]],white,.17);ellipse(c,.6,0,.23,.23,gold);break;
}c.restore()}

</script><script>
'use strict';
const CHAPTERS=['El despertar','Jardines el\xE9ctricos','F\xE1brica de mareas','Criptas de cristal','Relojer\xEDa imposible','Minas del eco','Ciudad fracturada','Tormenta orbital','Palacio del vac\xEDo','Coraz\xF3n del infinito'];
const NEW_NAMES=[
'Rosal de voltaje|P\xE9talos de cobre|Jard\xEDn dentado|Polen de plasma|Ra\xEDces inquietas|La flor del rel\xE9|Invernadero partido|Espinas a destiempo|Fotos\xEDntesis inversa|La cosecha el\xE9ctrica',
'El primer remolino|Cinta de retorno|Muelle de mercurio|La esclusa doble|Corriente cruzada|Puerto de agujas|Canal de resonancia|Marea en espiral|Astillero de sombras|El gran drenaje',
'Ecos de amatista|Tres sellos perdidos|Galer\xEDa refractada|La llave del prisma|Tumba de luci\xE9rnagas|Roset\xF3n quebrado|Cristales gemelos|La b\xF3veda azul|Catedral de ecos|El guardi\xE1n de cuarzo',
'El p\xE9ndulo ciego|Segundos prestados|Engranaje partido|Agujas encontradas|La hora torcida|Reloj de bolsillo|Minutero sin retorno|Cuatro campanadas|El reloj que muerde|Medianoche exacta',
'La mecha dormida|Galer\xEDa de dinamita|Excavaci\xF3n oblicua|El canario de ne\xF3n|Veta de obsidiana|La explosi\xF3n diferida|Pilares de ceniza|El t\xFAnel del eco|La \xFAltima vagoneta|Colapso controlado',
'Asfalto quebradizo|Puente de papel|Cruce de hologramas|Avenida reversible|El barrio sumergido|Azoteas de vidrio|La plaza del rel\xE9|Autopista de ceniza|El distrito perdido|La ciudad se derrumba',
'La \xF3rbita del cazador|Anillos de Saturno|Cometa de bolsillo|La estaci\xF3n inclinada|Lluvia de protones|Agujero de gusano|El pulso del sat\xE9lite|Constelaci\xF3n rota|Perihelio|Ojo de la tormenta',
'Vest\xEDbulo sin tiempo|Espejos hambrientos|El sal\xF3n de los sellos|Escalera del silencio|Biblioteca de sombras|La corona fractal|Pasillo de recuerdos|Trono de agujas|La c\xE1mara imposible|Banquete del vac\xEDo',
'El latido oculto|Nervios de luz|V\xE1lvula de emergencia|Memoria del laberinto|La arteria de cristal|S\xEDstole de fuego|Di\xE1stole del caos|Noventa y ocho suspiros|Antes del \xFAltimo pulso|El coraz\xF3n de SnakeOMG'
].flatMap(s=>s.split('|'));
// Fixed, reproducible layouts. Each room has its own geometry and mechanism placement.
function buildExpedition(){const result=[];for(let n=11;n<=100;n++){
 const chapter=Math.floor((n-1)/10),k=(n-1)%10,d=(n-11)/89,w=30+2*Math.floor(chapter/3),h=20+Math.floor(chapter/4),mid=Math.floor(h/2);
 let seed=n*7919;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const l={name:NEW_NAMES[n-11],kind:CHAPTERS[chapter].toUpperCase(),chapter,w,h,time:18-6*d,food:0,bonus:6-1.5*d,tip:'',walls:[],sw:[],seq:true,spikes:[],currents:[],runes:[],mines:[],crumbles:[],sweeps:[],gates:[],shields:[],speed:1+d*.22,period:3.8-d*1.2,difficulty:n};
 const reserved=new Set();const reserve=(x,y,r=0)=>{for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++)reserved.add([x+dx,y+dy].join(','))};reserve(3,mid,2);reserve(w-2,h-2,1);
 // Different ordered routes through alternating quadrants, with increasingly many tasks.
 const points=[[7,3],[w-7,h-5],[w-5,4],[9,h-4],[Math.floor(w/2),3],[Math.floor(w/2),h-4]];
 const count=2+Math.floor((n-11)/23);for(let j=0;j<count;j++){let p=points[(j+k)%points.length].slice();p[0]+=Math.floor(rand()*3)-1;p[1]+=Math.floor(rand()*3)-1;l.sw.push(p);reserve(...p,1)}
 if(chapter>=3||k>=5){l.key=[w-4,mid];reserve(...l.key,1)}
 if(k%3===2||k===9){l.boxes=[[8,mid]];l.plates=[[11,mid]];for(let x=6;x<=13;x++)reserve(x,mid,1)}
 if(chapter>=3){let total=1+Math.floor(chapter/3);for(let j=0;j<total;j++){let p=[5+j*7,h-3];l.runes.push(p);reserve(...p,1)}}
 // Ten architectural patterns, varied dimensions, breaks and staggered islands.
 for(let x=5;x<w-3;x++)for(let y=2;y<h-2;y++){
 let a=false;switch(k){case 0:a=x%7===0&&y%6!==2&&y%6!==3;break;case 1:a=y%6===0&&x%8>2;break;case 2:a=(x%8===0&&y%7<4)||(y%8===0&&x%9<3);break;case 3:a=Math.abs(x-w/2)+Math.abs(y-h/2)<5&&x%3===0;break;case 4:a=(x+y+n)%11===0&&y%3!==0;break;case 5:a=(x+chapter)%9<2&&(y+Math.floor(chapter/2))%7<2;break;case 6:a=y%5===0&&((Math.floor(y/5)%2)?x<w/2-2:x>w/2+2);break;case 7:a=(x%7===0&&y%7>2)||(y%7===0&&x%7>2);break;case 8:a=Math.abs(x-w/2)<7&&Math.abs(y-h/2)<5&&(x+y)%4===0;break;case 9:a=(x%6===0&&y%5<3)||(y%7===0&&x%9<3);break;}
 if(a&&rand()>.08&&!reserved.has([x,y].join(',')))l.walls.push([x,y,1,1]);}
 // Carve disconnected cells into the main region before placing mechanisms.
 const blocked=(x,y)=>l.walls.some(r=>r[0]===x&&r[1]===y);let seen=new Set(['3,'+mid]),q=[[3,mid]];for(let j=0;j<q.length;j++)for(let [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){let x=q[j][0]+dx,y=q[j][1]+dy;if(x>0&&y>0&&x<w-1&&y<h-1&&!blocked(x,y)&&!seen.has([x,y].join(','))){seen.add([x,y].join(','));q.push([x,y])}}
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)if(!blocked(x,y)&&!seen.has([x,y].join(','))){let xx=x;while(xx>1&&!seen.has([xx,y].join(','))){l.walls=l.walls.filter(r=>r[0]!==xx||r[1]!==y);xx--}}
 const used=new Set(reserved);const spot=()=>{for(let t=0;t<1000;t++){let p=[4+Math.floor(rand()*(w-6)),2+Math.floor(rand()*(h-4))],id=p.join(',');if(!blocked(...p)&&!used.has(id)){used.add(id);return p}}return [2,2]};
 for(let j=0;j<2+Math.floor(n/8);j++){let p=spot();l.spikes.push([...p,1,1,j*.63])}
 if(chapter>=2)for(let j=0;j<2+Math.floor(chapter/3);j++)l.currents.push([...spot(),1,1,j%2?1.55:.62]);
 if(chapter>=4){l.relay=24-chapter*.6-k*.25;l.gates[0]=[Math.floor(w/2),mid,1,1,0];l.walls=l.walls.filter(r=>r[0]!==Math.floor(w/2)||r[1]!==mid);}
 if(chapter>=5)for(let j=0;j<2+Math.floor((n-51)/12);j++)l.mines.push(spot());
 if(chapter>=6)for(let j=0;j<4+chapter;j++)l.crumbles.push(spot());
 if(chapter>=7)for(let j=0;j<1+Math.floor((n-71)/10);j++)l.sweeps.push([5+j*7,3,w-8-j*4,h-6,j*.9]);
 if(chapter>=8){l.drones=[[w-8,3,w-8,h-4],[6,h-5,w-5,h-5]];l.shields=[spot(),spot()]}
 if(chapter===9){l.lasers=[[w-6,2,1,h-4]];l.shields.push(spot())}
 l.tip='Activa los nodos en orden'+(l.relay?' antes de que termine el rel\xE9':'')+'. '+(l.runes.length?'Recoge los cristales numerados en orden. ':'')+(l.boxes?'Encaja el cubo. ':'')+(l.key?'Encuentra la llave. ':'')+['Trampas viajeras: verde con comida, naranja sin comida y rojo peligroso. Despu\xE9s cambian de lugar.','Las cintas turquesa aceleran; las violetas ralentizan.','Los cristales deben recogerse en el orden indicado.','El rel\xE9 reinicia los nodos si te retrasas.','Las minas se arman al acercarte: sal de su radio.','Las baldosas se agrietan y despu\xE9s queman al volver.','Los haces recorren la sala: anticipa su barrido.','Los escudos dorados anulan el da\xF1o de trampas durante 4 s.','Combina todo lo aprendido; los escudos no detienen el reloj.'][chapter-1];
 result.push(l);
 }return result;}
function initMechanisms(){for(const r of g.l.spikes||[]){r[5]=Math.floor((r[4]||0)/(g.l.period||3.5));r[6]=true;}g.rune=0;g.relayLeft=0;g.mineState=(g.l.mines||[]).map(()=>-1);g.cracked={};g.shield=0;g.shieldItems=(g.l.shields||[]).map(p=>[...p]);}
function gateClosed(r){return !g.sw[r[4]]}
function spikePhase(r){return ((g.elapsed+(r[4]||0))%(g.l.period||3.5))/(g.l.period||3.5)}
function sweepPosition(r){return r[0]+(Math.sin(g.elapsed*(.65+g.i*.004)+r[4])+1)*.5*r[2]}
function extraContact(){if(g.shield>0||g.challenge?.silence>0)return false;return (g.l.spikes||[]).some(r=>spikePhase(r)>=.62&&inRect(g.x,g.y,r))||(g.l.sweeps||[]).some(r=>Math.abs(g.x-sweepPosition(r))<.5&&g.y>=r[1]&&g.y<=r[1]+r[3])||(g.l.mines||[]).some((p,i)=>g.mineState[i]>=.8&&g.mineState[i]<1.65&&Math.hypot(g.x-p[0],g.y-p[1])<2.1)||Object.entries(g.cracked).some(([id,t])=>t>.7&&id===g.x+','+g.y);}
function mechanismStep(){let l=g.l;const current=(l.currents||[]).find(r=>inRect(g.x,g.y,r));if(current){g.currentEffect=current[4]<1?1/3:3;g.currentTime=2;}for(const r of l.spikes||[]){if(r[6]&&spikePhase(r)<.42&&inRect(g.x,g.y,r)){r[6]=false;feed();}}
 const ri=(l.runes||[]).findIndex(p=>eq(p,g.x,g.y));if(ri===g.rune){g.rune++;sound('switch');burst(g.x,g.y,'#71e4ff',18)}
 const si=g.shieldItems.findIndex(p=>eq(p,g.x,g.y));if(si>=0){g.shieldItems.splice(si,1);g.shield=4;visualEffect('pickup',g.x,g.y,'#fff4a6','Escudo \xB7 4 s');sound('portal');burst(g.x,g.y,'#ffe8a1')}
 if((l.crumbles||[]).some(p=>eq(p,g.x,g.y))&&g.cracked[g.x+','+g.y]===undefined)g.cracked[g.x+','+g.y]=0;
 if(l.relay&&g.seq>0&&g.seq<g.sw.length&&g.relayLeft===0)g.relayLeft=l.relay;
}
function relocateSpike(r,index,cycle){
 const l=g.l,old=r.slice(0,2),candidates=[];
 const occupied=(x,y)=>special(x,y)||g.foods.some(p=>eq(p,x,y))||g.trail.some(p=>Math.hypot(p[0]-x,p[1]-y)<1.1)||(l.spikes||[]).some(p=>p!==r&&eq(p,x,y))||(l.runes||[]).some(p=>eq(p,x,y))||g.shieldItems.some(p=>eq(p,x,y))||(l.currents||[]).some(p=>inRect(x,y,p))||(l.gates||[]).some(p=>inRect(x,y,p))||(l.crumbles||[]).some(p=>eq(p,x,y))||(l.mines||[]).some(p=>Math.hypot(p[0]-x,p[1]-y)<2.6)||(l.lasers||[]).some(p=>inRect(x,y,p))||(l.sweeps||[]).some(p=>x>=p[0]-1&&x<=p[0]+p[2]+1&&y>=p[1]-1&&y<=p[1]+p[3]+1)||(l.drones||[]).some(p=>x>=Math.min(p[0],p[2])-1&&x<=Math.max(p[0],p[2])+1&&y>=Math.min(p[1],p[3])-1&&y<=Math.max(p[1],p[3])+1)||(l.boxes||[]).some((p,i)=>{const target=l.plates[i];return x>=Math.min(p[0],target[0])-1&&x<=Math.max(p[0],target[0])+1&&y>=Math.min(p[1],target[1])-1&&y<=Math.max(p[1],target[1])+1});
 // Search only cells reachable from the head; do not spawn on objectives or the body.
 const q=[[g.x,g.y]],seen=new Set([g.x+','+g.y]);for(let i=0;i<q.length;i++){let [x,y]=q[i];if(!eq(old,x,y)&&Math.hypot(x-g.x,y-g.y)>2&&!occupied(x,y))candidates.push([x,y]);for(let [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){let nx=x+dx,ny=y+dy,id=nx+','+ny;if(!seen.has(id)&&!wall(nx,ny)&&!g.boxes.some(p=>eq(p,nx,ny))){seen.add(id);q.push([nx,ny])}}}
 if(candidates.length){const seed=((g.i+1)*73856093+(index+1)*19349663+cycle*83492791)>>>0;const p=candidates[seed%candidates.length];r[0]=p[0];r[1]=p[1];burst(...old,'#7ee98a',5);burst(...p,'#7ee98a',7);}r[6]=true;
}
function updateSpikes(){for(let i=0;i<(g.l.spikes||[]).length;i++){const r=g.l.spikes[i],cycle=Math.floor((g.elapsed+(r[4]||0))/(g.l.period||3.5));if(cycle>r[5]){relocateSpike(r,i,cycle);r[5]=cycle;}}}
function updateMechanisms(dt){updateSpikes();g.shield=Math.max(0,g.shield-dt);if(g.relayLeft>0&&g.seq<g.sw.length){g.relayLeft-=dt;if(g.relayLeft<=0){g.relayLeft=0;g.sw.fill(false);g.seq=0;g.open=false;sound('critical')}}
 for(let i=0;i<g.mineState.length;i++){let m=g.mineState[i];if(m<0&&Math.hypot(g.x-g.l.mines[i][0],g.y-g.l.mines[i][1])<2.6)g.mineState[i]=0;else if(m>=0&&m<2){g.mineState[i]+=dt;if(m<.8&&g.mineState[i]>=.8){explosionEffect(...g.l.mines[i],'#ff985c','');sound('boom');}}}
 for(let id of Object.keys(g.cracked))g.cracked[id]+=dt;
}
function mechanismHUD(){return \`\${g.l.runes?.length?' \xB7 Cristales '+g.rune+'/'+g.l.runes.length:''}\${g.relayLeft>0&&g.seq<g.sw.length?' \xB7 Rel\xE9 '+g.relayLeft.toFixed(1)+' s':''}\${g.shield>0?' \xB7 Escudo '+g.shield.toFixed(1)+' s':''}\`;}
function drawMechanisms(c,s){let l=g.l;if(g.currentTime>0){c.save();c.strokeStyle=g.currentEffect<1?'#75fff1':'#bb9aff';c.shadowColor=c.strokeStyle;c.shadowBlur=12;c.lineWidth=3;c.beginPath();c.arc((g.x+.5)*s,(g.y+.5)*s,s*(.68+.06*Math.sin(g.elapsed*12)),0,Math.PI*2);c.stroke();c.restore();}const tile=(p,color)=>{c.fillStyle=color;c.fillRect(p[0]*s+2,p[1]*s+2,s-4,s-4)},text=(p,label,color)=>{c.fillStyle=color;c.font=\`bold \${s*.45}px sans-serif\`;c.textAlign='center';c.textBaseline='middle';c.fillText(label,(p[0]+.5)*s,(p[1]+.5)*s)};
 for(let r of l.spikes||[]){let f=spikePhase(r),green=f<.42,red=f>=.62;c.save();c.shadowColor=red?'#ff4564':green?'#75ef79':'#ffb34f';c.shadowBlur=4+3*Math.sin(g.elapsed*7);tile(r,red?'#b92f4c':green?'#286438':'#a56520');text(r,red?'\u25B2':'\u25B3',green?'#a5ffae':'#ffe6c6');c.shadowBlur=0;if(green&&r[6]){circle(c,(r[0]+.5)*s,(r[1]+.66)*s,s*.16,'#dfff8b',9);circle(c,(r[0]+.46)*s,(r[1]+.61)*s,s*.04,'#fff')}c.restore()}

 for(let r of l.currents||[]){tile(r,r[4]<1?'#16595a':'#303d65');text(r,r[4]<1?'\u226B':'\u2248',r[4]<1?'#8ffff3':'#bca7ff')}
 for(let r of l.gates||[]){tile(r,gateClosed(r)?'#7956a7':'#36522e');text(r,gateClosed(r)?'\u229F':'\u2713','#e8d6ff')}
 (l.runes||[]).forEach((p,i)=>{if(i>=g.rune){tile(p,i===g.rune?'#235364':'#23333d');text(p,String(i+1),'#a6efff')}});
 (l.mines||[]).forEach((p,i)=>{let m=g.mineState[i];if(m>=2)return;tile(p,m<0?'#554738':m<.8?'#b98135':'#af3046');text(p,m<0?'\u2739':m<.8?'!':'\u2733','#ffe6c2');if(m>=.8&&m<1.65){c.strokeStyle='#ff657d';c.lineWidth=2;c.beginPath();c.arc((p[0]+.5)*s,(p[1]+.5)*s,2.1*s,0,Math.PI*2);c.stroke()}});
 for(let p of l.crumbles||[]){let t=g.cracked[p.join(',')];tile(p,t===undefined?'#525459':t<.7?'#a28357':'#85343c');text(p,'\u22C8','#e1c8b1')}
 for(let r of l.sweeps||[]){c.fillStyle='#ff7d8c65';c.fillRect((sweepPosition(r)+.35)*s,r[1]*s,s*.3,r[3]*s);}
 for(let p of g.shieldItems)drawObject(c,'shield',(p[0]+.5)*s,(p[1]+.5)*s,s*.9,'#fff4a6');
 if(g.shield>0){c.strokeStyle='#ffe8a1';c.lineWidth=3;c.beginPath();c.arc((g.x+.5)*s,(g.y+.5)*s,s*.7,0,Math.PI*2);c.stroke()}
}

</script><script>
// Deterministic food and relay budgets verified by complete gameplay replays.
const CAMPAIGN_DATA = {"10":{"foodPoints":[[15,3],[22,13]],"food":2},"11":{"foodPoints":[[19,13],[24,6],[28,14]],"food":3},"12":{"foodPoints":[[18,6],[21,13],[11,17]],"food":3},"13":{"foodPoints":[[16,14],[23,3],[28,16]],"food":3},"14":{"foodPoints":[[15,3],[17,17]],"food":2},"15":{"foodPoints":[[21,11],[21,17],[6,14],[14,4],[28,8]],"food":5},"16":{"foodPoints":[[21,11],[15,9],[10,2],[19,11]],"food":4},"17":{"foodPoints":[[21,9],[23,11],[28,8]],"food":3},"18":{"foodPoints":[[18,8],[25,7],[21,15],[16,16]],"food":4},"19":{"foodPoints":[[21,9],[17,13],[14,18],[16,3],[28,8]],"food":5},"20":{"foodPoints":[[14,2],[22,12]],"food":2},"21":{"foodPoints":[[22,10],[24,6],[28,16]],"food":3},"22":{"foodPoints":[[18,6],[25,13],[11,17],[24,18]],"food":4},"23":{"foodPoints":[[16,14],[24,4]],"food":2},"24":{"foodPoints":[[16,4],[17,17]],"food":2},"25":{"foodPoints":[[21,11],[20,16],[6,12],[14,2],[28,6]],"food":5},"26":{"foodPoints":[[21,11],[15,9],[10,4],[20,11]],"food":4},"27":{"foodPoints":[[21,9],[23,11],[28,10]],"food":3},"28":{"foodPoints":[[19,7],[24,5],[18,16],[19,17]],"food":4},"29":{"foodPoints":[[21,9],[17,13],[12,18],[16,4],[28,8]],"food":5},"30":{"foodPoints":[[21,9],[19,9],[7,3],[24,2],[22,18],[5,17],[20,18]],"food":7},"31":{"foodPoints":[[22,10],[26,12],[26,14],[11,17],[15,17]],"food":5},"32":{"foodPoints":[[21,11],[26,4],[19,15],[6,18],[22,18]],"food":5},"33":{"foodPoints":[[20,8],[26,16],[10,17],[17,7],[17,13],[6,18],[23,17]],"food":7},"34":{"foodPoints":[[21,9],[19,9],[17,9],[8,12],[6,12],[16,18]],"food":6},"35":{"foodPoints":[[21,11],[25,16],[8,14],[11,3],[24,8],[15,17],[12,18],[29,17]],"food":8},"36":{"foodPoints":[[21,11],[19,9],[10,4],[25,7],[28,8],[27,15],[11,17],[15,17]],"food":8},"37":{"foodPoints":[[21,9],[27,11],[23,11],[10,16],[14,18]],"food":5},"38":{"foodPoints":[[20,10],[28,4],[25,17],[12,16],[15,3],[11,17],[15,17]],"food":7},"39":{"foodPoints":[[21,9],[21,13],[13,17],[16,6],[9,17],[17,17]],"food":6},"40":{"foodPoints":[[21,9],[19,9],[6,5],[20,8],[27,11],[27,13],[11,15],[12,18]],"food":8,"relay":19.927196652719665},"41":{"foodPoints":[[21,11],[24,14],[26,6],[19,17],[7,19],[23,19]],"food":6,"relay":20.842621582133162},"42":{"foodPoints":[[21,11],[25,5],[15,13],[15,15],[15,9],[6,18],[20,18]],"food":7,"relay":21.753852561432737},"43":{"foodPoints":[[18,6],[28,14],[14,18],[17,15],[16,8],[9,18],[18,18]],"food":7,"relay":18.259921047163935},"44":{"foodPoints":[[21,9],[19,9],[15,9],[9,13],[7,7],[9,19],[26,18]],"food":7,"relay":17.91832504145937},"45":{"foodPoints":[[21,11],[24,16],[7,15],[12,4],[26,8],[18,18],[9,19],[26,18]],"food":8,"relay":22.58510858324716},"46":{"foodPoints":[[21,11],[19,9],[7,4],[18,10],[27,15],[25,9],[16,18],[11,19],[28,18]],"food":9,"relay":20.67416425918283},"47":{"foodPoints":[[21,9],[25,16],[27,4],[22,16],[6,18],[19,19]],"food":6,"relay":21.886967263743053},"48":{"foodPoints":[[19,7],[27,9],[26,13],[11,16],[17,5],[12,14],[11,19],[28,18]],"food":8,"relay":21.54026294165982},"49":{"foodPoints":[[21,9],[23,15],[12,16],[16,2],[16,18],[11,19],[28,18]],"food":7,"relay":17.78397212543554},"50":{"foodPoints":[[21,9],[19,9],[10,4],[24,8],[27,9],[23,15],[6,16],[17,19]],"food":8,"relay":18.99509202453988},"51":{"foodPoints":[[21,11],[26,14],[26,10],[15,17],[11,19],[27,19]],"food":6,"relay":20.509487859620485},"52":{"foodPoints":[[21,11],[27,3],[24,18],[13,17],[17,3],[15,17],[11,19],[28,18]],"food":8,"relay":23.249185667752442},"53":{"foodPoints":[[19,7],[28,16],[11,17],[17,7],[17,17],[9,19],[26,18]],"food":7,"relay":16.44931952061751},"54":{"foodPoints":[[21,9],[19,9],[16,12],[7,15],[5,7],[12,18]],"food":6,"relay":17.959262261856505},"55":{"foodPoints":[[21,11],[23,15],[6,16],[10,2],[24,6],[18,18],[9,19],[26,18]],"food":8,"relay":22.828109201213348},"56":{"foodPoints":[[21,11],[19,9],[6,4],[19,7],[28,14],[27,11],[15,17],[11,19],[28,18]],"food":9,"relay":29.812348668280872},"57":{"foodPoints":[[21,9],[25,17],[27,5],[23,15],[11,17],[16,4],[12,16],[12,18]],"food":8,"relay":27.93195087578015},"58":{"foodPoints":[[17,5],[26,10],[24,16],[12,16],[15,5],[16,16],[7,19],[24,18]],"food":8,"relay":26.971675371635193},"59":{"foodPoints":[[21,9],[21,13],[10,14],[16,4],[12,18],[7,5],[5,17],[22,18]],"food":8,"relay":24.19603126879134},"60":{"foodPoints":[[20,9],[23,9],[8,6],[21,3],[26,16],[30,4],[25,15],[10,17],[13,19],[29,19]],"food":10,"relay":32.023599999999995},"61":{"foodPoints":[[21,11],[29,17],[28,6],[20,16],[15,15],[13,5],[8,18],[17,19]],"food":8,"relay":25.62582318898424},"62":{"foodPoints":[[21,11],[29,4],[23,15],[13,15],[18,2],[16,18],[11,19],[28,18]],"food":8,"relay":27.08920748705695},"63":{"foodPoints":[[18,8],[30,14],[15,17],[17,13],[17,7],[10,17],[7,5],[7,19],[24,18]],"food":9,"relay":24.93880389429764},"64":{"foodPoints":[[21,9],[23,9],[17,11],[8,12],[17,3],[26,12],[14,18],[12,18],[30,18]],"food":9,"relay":25.797383029341795},"65":{"foodPoints":[[20,10],[28,16],[12,18],[7,5],[23,3],[27,16],[28,6],[21,17],[5,19],[21,19]],"food":10,"relay":28.44807121661721},"66":{"foodPoints":[[21,11],[23,9],[10,4],[22,2],[27,15],[28,8],[19,17],[7,19],[24,18]],"food":9,"relay":28.996644295302012},"67":{"foodPoints":[[21,9],[29,16],[29,9],[18,16],[13,17],[16,4],[12,18],[13,19],[29,19]],"food":9,"relay":27.15875517037621},"68":{"foodPoints":[[20,10],[29,7],[21,17],[12,14],[18,3],[16,16],[5,19],[22,18]],"food":8,"relay":29.491941823899374},"69":{"foodPoints":[[21,9],[25,13],[8,14],[16,10],[17,15],[7,9],[5,15],[20,18]],"food":8,"relay":23.210041184545993},"70":{"foodPoints":[[21,9],[22,10],[6,8],[19,3],[27,13],[28,4],[21,15],[6,18],[19,19]],"food":9,"relay":30.27906066536204},"71":{"foodPoints":[[21,11],[26,14],[29,5],[26,15],[9,17],[18,10],[17,15],[7,19],[21,19]],"food":9,"relay":28.45420816246827},"72":{"foodPoints":[[21,11],[27,5],[21,17],[15,15],[17,5],[12,18],[14,18]],"food":7,"relay":26.34236165237724},"73":{"foodPoints":[[18,6],[30,12],[16,16],[17,13],[17,9],[8,18],[6,6],[9,19],[26,18]],"food":9,"relay":24.239548901419404},"74":{"foodPoints":[[21,9],[23,9],[18,8],[9,17],[9,5],[26,6],[20,18],[7,19],[24,18]],"food":9,"relay":26.842646488164537},"75":{"foodPoints":[[20,10],[28,16],[12,18],[7,5],[22,6],[28,17],[28,10],[18,18],[9,19],[25,19]],"food":10,"relay":26.798257502420135},"76":{"foodPoints":[[21,11],[23,9],[10,4],[20,2],[27,13],[30,6],[29,17],[12,18],[14,18]],"food":9,"relay":31.431027820710977},"77":{"foodPoints":[[21,9],[28,16],[29,3],[24,16],[11,15],[15,5],[8,16],[15,19]],"food":8,"relay":26.126662810873338},"78":{"foodPoints":[[17,5],[30,9],[29,13],[14,16],[15,7],[14,10],[14,18],[12,18],[30,18]],"food":9,"relay":28.99480569449788},"79":{"foodPoints":[[21,9],[26,14],[12,18],[16,8],[17,13],[8,12],[18,4],[26,13],[16,18],[11,19],[28,18]],"food":11,"relay":32.72221155692072},"80":{"foodPoints":[[20,9],[26,9],[8,9],[18,3],[27,12],[30,7],[26,15],[12,19],[16,13],[15,8],[9,19],[17,20]],"food":12,"relay":38.46283524904214},"81":{"foodPoints":[[20,11],[29,17],[29,5],[23,16],[10,17],[18,7],[18,16],[7,20],[24,19]],"food":9,"relay":32.0313515580195},"82":{"foodPoints":[[21,12],[29,6],[23,18],[13,18],[17,4],[14,19],[6,9],[5,12],[15,19]],"food":9,"relay":34.57439908431896},"83":{"foodPoints":[[19,14],[29,14],[14,17],[16,13],[17,12],[7,18],[11,4],[28,5],[24,19],[6,19],[20,19]],"food":11,"relay":33.362459546925564},"84":{"foodPoints":[[17,12],[30,12],[18,9],[17,8],[14,19],[8,11],[12,3],[26,3],[28,15],[27,8],[27,10],[22,19],[8,19],[13,19],[28,19]],"food":15,"relay":33.59270516717326},"85":{"foodPoints":[[21,12],[28,17],[11,18],[7,4],[23,2],[27,15],[27,8],[20,19],[7,20],[24,19]],"food":10,"relay":36.11658767772512},"86":{"foodPoints":[[21,12],[22,11],[6,9],[18,5],[27,14],[28,4],[21,14],[9,18],[16,7],[15,18],[11,20],[28,19]],"food":12,"relay":36.34014377601211},"87":{"foodPoints":[[20,9],[30,16],[30,5],[25,16],[9,18],[16,9],[17,12],[9,20],[17,20]],"food":9,"relay":33.135170851425336},"88":{"foodPoints":[[17,16],[30,12],[28,13],[15,18],[16,15],[19,5],[14,17],[7,6],[6,19],[20,19]],"food":10,"relay":35.074227581009794},"89":{"foodPoints":[[20,13],[27,14],[14,19],[16,13],[17,10],[8,17],[11,2],[26,5],[26,19],[8,19],[18,19]],"food":11,"relay":34.445196465501034},"90":{"foodPoints":[[20,13],[29,10],[12,9],[13,2],[29,4],[30,15],[29,12],[14,15],[16,15],[17,6],[11,18],[13,20],[28,19]],"food":13,"relay":37.22514071294559},"91":{"foodPoints":[[21,10],[31,16],[30,7],[24,19],[9,18],[18,9],[18,11],[10,19],[16,19]],"food":9,"relay":33.19490732072646},"92":{"foodPoints":[[21,12],[31,6],[30,19],[12,19],[17,10],[21,8],[16,13],[7,4],[6,19],[20,19]],"food":10,"relay":36.24869207772795},"93":{"foodPoints":[[19,14],[31,12],[20,19],[17,18],[19,2],[16,17],[6,9],[16,2],[30,7],[24,19],[6,19],[19,19]],"food":12,"relay":36.468767480887564},"94":{"foodPoints":[[21,12],[28,9],[18,3],[14,17],[6,7],[17,3],[29,10],[31,6],[28,17],[11,18],[14,19],[31,20]],"food":12,"relay":32.46483066617045},"95":{"foodPoints":[[21,12],[31,16],[15,18],[7,8],[18,5],[28,13],[30,6],[29,17],[11,17],[14,19],[32,19]],"food":11,"relay":37.46815227483751},"96":{"foodPoints":[[20,12],[26,11],[9,10],[18,4],[30,11],[32,7],[31,17],[12,17],[18,11],[17,10],[8,19],[18,19]],"food":12,"relay":36.84321719792439},"97":{"foodPoints":[[20,9],[30,13],[31,6],[29,16],[13,18],[16,11],[22,5],[19,20],[7,20],[21,20]],"food":10,"relay":33.982245237654894},"98":{"foodPoints":[[17,16],[32,13],[29,8],[22,19],[11,18],[17,6],[19,12],[7,16],[6,5],[7,20],[24,19]],"food":11,"relay":36.71797711332596},"99":{"foodPoints":[[20,13],[31,14],[17,18],[12,13],[17,6],[12,19],[7,6],[20,3],[28,13],[16,19],[11,20],[28,19]],"food":12,"relay":34.42622950819673}};

</script><script>
// Mission routes verified with actual game rules.
const CHALLENGE_DATA={"10":{"foodPoints":[[15,5],[21,13],[22,8]],"food":3},"11":{"foodPoints":[[16,6],[16,16],[19,13]],"food":3},"12":{"foodPoints":[[17,13],[22,14],[7,13],[7,7],[19,11]],"food":5},"13":{"foodPoints":[[18,12],[14,12],[12,4],[24,4],[28,16]],"food":5},"14":{"foodPoints":[[18,12],[12,15],[24,12],[18,6],[28,8]],"food":5},"15":{"foodPoints":[[13,3],[14,16]],"food":2},"16":{"foodPoints":[[19,11],[18,10],[21,13],[13,5],[10,6],[26,6]],"food":6},"17":{"foodPoints":[[16,15],[20,17]],"food":2},"18":{"foodPoints":[[18,8],[22,4],[7,5],[13,13],[11,5],[27,5]],"food":6},"19":{"foodPoints":[[19,9],[25,9],[16,10],[28,12]],"food":4},"20":{"foodPoints":[[16,14],[23,7],[15,15],[20,14],[23,11],[24,10],[28,16]],"food":7},"21":{"foodPoints":[[17,13],[13,8],[28,8]],"food":3,"missionDeadline":20.8505797418508},"22":{"foodPoints":[[20,10],[25,7],[13,11],[20,6],[19,9],[26,10]],"food":6},"23":{"foodPoints":[[18,8],[20,8],[7,11],[13,9],[23,3],[28,14]],"food":6},"24":{"foodPoints":[[13,13],[21,5],[26,12],[16,12],[13,4],[14,18]],"food":6},"25":{"foodPoints":[[20,10],[15,9],[12,16],[28,16]],"food":4},"26":{"foodPoints":[[14,4],[22,12],[13,14],[28,14]],"food":4},"27":{"foodPoints":[[19,11],[14,16],[13,15],[19,6],[28,6]],"food":5},"28":{"foodPoints":[[8,6],[14,12],[24,16]],"food":3},"29":{"foodPoints":[[16,14],[23,5],[9,3],[19,5],[25,15],[17,9],[6,4],[18,4],[28,10]],"food":9},"30":{"foodPoints":[[12,4],[18,14]],"food":2},"31":{"foodPoints":[[18,8],[25,13],[19,11],[8,10],[24,10]],"food":5},"32":{"foodPoints":[[28,5]],"food":1},"33":{"foodPoints":[[16,14],[20,16],[20,6],[30,6]],"food":4},"34":{"foodPoints":[[19,9],[25,15],[15,15],[9,9],[7,11],[18,6],[30,10]],"food":7},"35":{"foodPoints":[[20,10],[15,15],[14,4],[14,11],[28,12]],"food":5},"36":{"foodPoints":[[19,9],[24,6],[17,13],[30,16]],"food":4,"missionDeadline":25.664695945945944},"37":{"foodPoints":[[14,4],[19,13],[16,4],[9,13],[21,9],[30,16]],"food":6},"38":{"foodPoints":[[19,11],[23,9],[14,12],[8,3],[25,3],[30,14]],"food":6},"39":{"foodPoints":[[19,9],[15,11],[22,8],[14,14],[14,4],[17,15]],"food":6},"40":{"foodPoints":[[19,9],[17,9],[16,9],[25,5],[30,16]],"food":5},"41":{"foodPoints":[[14,16],[19,15],[13,5],[7,12],[21,13]],"food":5},"42":{"foodPoints":[[9,9],[14,8],[11,3],[26,4],[30,16]],"food":5},"43":{"foodPoints":[[12,6],[27,7],[17,9],[14,7],[24,14]],"food":5},"44":{"foodPoints":[[13,16],[19,9],[7,7],[19,5],[15,13],[23,17],[12,12],[26,12]],"food":8},"45":{"foodPoints":[[13,5],[18,16]],"food":2},"46":{"foodPoints":[[14,4],[27,7],[17,9],[11,7],[20,5],[24,16],[21,15],[30,14]],"food":8},"47":{"foodPoints":[[16,6],[19,15]],"food":2},"48":{"foodPoints":[[14,15],[13,15],[22,9],[30,16]],"food":4},"49":{"foodPoints":[[6,6],[14,12],[9,7],[22,8],[30,16]],"food":5},"50":{"foodPoints":[[19,9],[21,9],[11,4],[24,6],[25,11]],"food":5},"51":{"foodPoints":[[11,3],[18,10],[21,17]],"food":3,"missionDeadline":25.069985717200574},"52":{"foodPoints":[[20,10],[29,17],[29,3],[26,12],[24,6],[23,11]],"food":6},"53":{"foodPoints":[[13,16],[14,8],[24,14]],"food":3},"54":{"foodPoints":[[19,9],[27,13],[15,15],[9,5],[14,10],[14,14],[27,16]],"food":7},"55":{"foodPoints":[[18,8],[26,10],[16,15],[19,5],[30,6]],"food":5},"56":{"foodPoints":[[19,11],[18,11],[24,15],[21,7],[27,11],[28,7]],"food":6},"57":{"foodPoints":[[16,7],[15,13],[10,14],[16,8],[30,10]],"food":5},"58":{"foodPoints":[[11,5],[10,8],[19,15],[20,14]],"food":4},"59":{"foodPoints":[[14,16],[22,10],[15,12],[22,5],[25,13],[13,17],[9,11],[25,11]],"food":8},"60":{"foodPoints":[[15,5],[16,15],[27,19]],"food":3},"61":{"foodPoints":[[11,13],[27,13],[29,13],[17,17],[17,15],[27,9],[26,14]],"food":7},"62":{"foodPoints":[[19,11],[21,9],[30,13],[25,6],[32,15]],"food":5},"63":{"foodPoints":[[14,4],[24,10],[24,14],[32,14]],"food":4},"64":{"foodPoints":[[18,12],[22,12],[24,10],[9,9],[20,6],[24,4],[13,5],[29,5]],"food":8},"65":{"foodPoints":[[14,16],[27,15],[11,15],[11,13],[27,13],[15,15],[6,8],[21,7],[29,15],[28,12]],"food":10},"66":{"foodPoints":[[19,11],[29,16],[15,15],[24,12]],"food":4,"missionDeadline":26.973549151204107},"67":{"foodPoints":[[20,10],[27,17],[12,16],[11,9],[26,10],[19,13],[12,8],[28,8]],"food":8},"68":{"foodPoints":[[14,10],[24,16],[12,18],[6,12],[17,13],[30,16]],"food":6},"69":{"foodPoints":[[17,13],[29,13],[14,13],[26,14],[15,9],[16,12],[24,18]],"food":7},"70":{"foodPoints":[[15,14],[13,11],[24,6],[13,5],[17,7],[26,14]],"food":6},"71":{"foodPoints":[[19,11],[18,12],[18,16],[32,16]],"food":4},"72":{"foodPoints":[[17,8],[28,12],[17,13],[18,10],[18,11],[6,6],[20,4],[32,8]],"food":8},"73":{"foodPoints":[[9,9],[12,8],[19,15],[23,9],[32,4]],"food":5},"74":{"foodPoints":[[19,9],[24,10],[20,15],[20,12],[7,9],[11,11],[22,16],[26,6],[26,14],[10,14],[23,15]],"food":11},"75":{"foodPoints":[[13,5],[15,17],[31,17]],"food":3},"76":{"foodPoints":[[18,8],[28,14],[14,16],[9,7],[18,13],[11,13],[25,11],[25,9],[16,15],[27,13],[32,4]],"food":11},"77":{"foodPoints":[[6,2],[6,3],[16,7],[18,6],[32,8]],"food":5},"78":{"foodPoints":[[14,16],[19,17],[5,15],[12,10],[21,3],[23,7],[32,14]],"food":7},"79":{"foodPoints":[[19,9],[15,7],[15,17],[11,13],[12,16],[23,11],[14,12],[10,13],[23,13]],"food":9},"80":{"foodPoints":[[15,13],[17,14],[28,15],[18,15],[13,16],[27,14]],"food":6},"81":{"foodPoints":[[12,4],[16,11],[26,5],[26,15],[23,16]],"food":5,"missionDeadline":33.180653794685526},"82":{"foodPoints":[[20,11],[28,4],[14,5],[19,12],[12,13],[28,13],[15,12],[9,10],[23,12],[32,5]],"food":10},"83":{"foodPoints":[[17,8],[28,9],[18,8],[30,7]],"food":4},"84":{"foodPoints":[[13,4],[24,9],[29,16],[18,13],[18,17]],"food":5},"85":{"foodPoints":[[19,12],[7,12],[18,9],[14,11],[11,14],[23,10],[32,17]],"food":7},"86":{"foodPoints":[[15,6],[20,5],[6,5],[18,7],[24,17],[14,19],[30,19]],"food":7},"87":{"foodPoints":[[15,16],[20,15],[24,15],[13,16],[9,4],[13,12],[26,15]],"food":7},"88":{"foodPoints":[[14,9],[17,12],[15,8],[17,10],[6,13],[19,16]],"food":6},"89":{"foodPoints":[[19,12],[14,5],[25,10],[11,12],[8,5],[19,10],[17,4],[18,10],[32,13]],"food":9},"90":{"foodPoints":[[12,5],[17,16],[33,16]],"food":3},"91":{"foodPoints":[[20,11],[32,8],[24,9],[8,9],[17,8],[16,7],[31,7],[23,14],[25,16],[24,13],[31,4],[34,15]],"food":12},"92":{"foodPoints":[[27,7],[30,19]],"food":2},"93":{"foodPoints":[[17,14],[5,18],[12,9],[23,4],[34,7]],"food":5},"94":{"foodPoints":[[20,11],[22,9],[14,5],[29,6],[28,15],[12,15],[14,13],[14,7],[28,9],[27,18],[11,18],[17,20]],"food":12},"95":{"foodPoints":[[19,12],[26,17],[25,8],[26,9],[25,17],[34,9]],"food":6},"96":{"foodPoints":[[19,10],[26,11],[30,17],[15,18],[17,18],[33,18]],"food":6,"missionDeadline":31.75092661230541},"97":{"foodPoints":[[13,4],[25,8],[27,16],[13,18],[17,16],[16,12],[30,9],[28,9],[15,11],[31,12]],"food":10},"98":{"foodPoints":[[16,7],[26,11],[15,16],[12,15],[27,16]],"food":5},"99":{"foodPoints":[[8,17],[15,9],[27,12],[26,13],[13,10],[14,15],[25,18]],"food":7}};

</script><script>
'use strict';
const MISSION_NAMES=['Caza del tesoro','Servicio de mensajer\xEDa','Circuito de balizas','Entradas de precisi\xF3n','Cerraduras crom\xE1ticas','Laberinto de espejos','Demolici\xF3n controlada','Red de teletransporte','Suelo de luces','Central de energ\xEDa','Rescate de nidos','Contrarreloj de sellos','Llaves encadenadas','Guardianes del n\xFAcleo','Prueba de los tres sellos'];
const MISSION_TIPS=[
 'Recoge todos los tesoros dorados. Puedes decidir el orden de tu ruta.',
 'Recoge cada paquete y ll\xE9valo a su buz\xF3n del mismo n\xFAmero. Solo puedes llevar uno.',
 'Cruza las balizas numeradas en orden. Las siguientes se iluminan al completar la anterior.',
 'Entra en cada flecha desde la direcci\xF3n indicada: importa c\xF3mo llegas, no solo pasar por encima.',
 'Pasa por un tinte y despu\xE9s por la cerradura de su color. Cambia de color para abrir las dem\xE1s.',
 'Cada paso sobre un espejo lo gira. Orienta los dos espejos para llevar el rayo azul al receptor.',
 'Recoge los haces de dinamita y embiste las barricadas agrietadas. Cada barricada consume una carga; demoler no causa da\xF1o.',
 'Utiliza todos los pares de portales. Cada color enlaza dos extremos y registra tu viaje.',
 'Enciende todas las baldosas. Cada vez que vuelvas a pisar una, se apaga: planifica tambi\xE9n la salida.',
 'Recoge las bater\xEDas verdes y ll\xE9valas a los generadores. Cada generador necesita dos unidades de energ\xEDa.',
 'Encuentra los huevos y ll\xE9valos al nido central, de uno en uno.',
 'Activa los sellos antes de que termine la cuenta del circuito. Si caduca, todos se apagan.',
 'Encuentra cada llave para abrir su puerta numerada. Detr\xE1s de cada puerta hay otra parte del recorrido.',
 'Recoge un escudo y embiste los anclajes rojos mientras est\xE9 activo. Sin escudo no podr\xE1s desactivarlos.',
 'Combina una entrega, las balizas en orden y el rayo de espejos. La salida exige los tres sellos.'
];
const MISSION_COLORS=['#ffd46e','#ffa8cc','#88e5ff','#a8ffc0','#c9a4ff','#8af1ef','#ffb277','#b6a1ff','#fff49a','#9df1b3','#ffcde2','#b1bbff','#e7cf8e','#ff919e','#eaffae'];
function configureChallenges(levels){for(let i=10;i<levels.length;i++){
 const l=levels[i],mode=(i-10)%15,tier=Math.floor((i-10)/15),w=l.w,h=l.h;
 l.mission=mode;l.missionName=MISSION_NAMES[mode];l.challenge={mode,tier};l.sw=[];l.runes=[];l.gates=[];delete l.key;delete l.relay;delete l.portals;
 if(mode!==9){l.boxes=[];l.plates=[];}l.boxes||=[];l.plates||=[];l.foodPoints=[];l.food=0;
 // The missions use different combinations instead of accumulating the same hazards everywhere.
 if([0,4,5,8,10].includes(mode)){l.sweeps=[];l.lasers=[];l.drones=[];}
 if([1,3,6,7,9,12].includes(mode))l.crumbles=[];
 if([2,5,8,11].includes(mode))l.mines=[];
 l.spikes=l.spikes.slice(0,2+Math.floor(tier/2));
 const used=new Set(['3,'+Math.floor(h/2),(w-2)+','+(h-2)]);
 for(let p of [...l.boxes,...l.plates])for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)used.add([p[0]+dx,p[1]+dy].join(','));
 const cells=[];for(let y=3;y<h-3;y++)for(let x=5;x<w-3;x++)if(!l.walls.some(r=>x>=r[0]&&y>=r[1]&&x<r[0]+r[2]&&y<r[1]+r[3]))cells.push([x,y]);
 let seed=(i+1)*1777;const pick=()=>{for(let t=0;t<cells.length;t++){seed=(seed*1664525+1013904223)>>>0;const p=cells[seed%cells.length];if(!used.has(p.join(','))){used.add(p.join(','));return p.slice()}}throw Error('No mission cell '+i)};
 const near=(p)=>{l.walls=l.walls.filter(r=>!(r[0]>=p[0]-1&&r[0]<=p[0]+1&&r[1]>=p[1]-1&&r[1]<=p[1]+1));};
 const many=n=>Array.from({length:n},()=>{let p=pick();near(p);return p});let c=l.challenge;
 if(mode===0)c.treasures=many(4+Math.floor(tier/2));
 if(mode===1||mode===14){c.packages=many(mode===14?1:2+Math.floor(tier/3));c.mailboxes=many(c.packages.length)}
 if(mode===2||mode===14)c.checkpoints=many(mode===14?3:4+Math.floor(tier/2));
 if(mode===3)c.arrows=many(3+Math.floor(tier/2)).map((p,j)=>[...p,(j+tier)%4]);
 if(mode===4){c.paints=many(3);c.locks=many(3+Math.floor(tier/2)).map((p,j)=>[...p,j%3]);}
 if(mode===5||mode===14){const y=3+(tier%3),x=12+(tier%4),y2=h-5-(tier%2);c.source=[5,y];c.mirrors=[[x,y,0],[x,y2,0]];c.receiver=[w-4,y2];for(let p of [c.source,...c.mirrors,c.receiver])used.add(p.slice(0,2).join(','));l.walls=l.walls.filter(r=>!(r[1]===y&&r[0]>=5&&r[0]<=x||r[0]===x&&r[1]>=y&&r[1]<=y2||r[1]===y2&&r[0]>=x&&r[0]<=w-4));}
 if(mode===6){c.ammo=many(3+Math.floor(tier/2));c.barriers=many(c.ammo.length)}
 if(mode===7)c.tunnels=many(4+2*Math.floor(tier/3));
 if(mode===8)c.lights=many(4+Math.floor(tier/2));
 if(mode===9){c.batteries=many(4+2*Math.floor(tier/3));c.generators=many(c.batteries.length/2);}
 if(mode===10){c.eggs=many(3+Math.floor(tier/3));c.nest=pick();near(c.nest)}
 if(mode===11){c.seals=many(3+Math.floor(tier/2));c.deadline=35-tier*2;}
 if(mode===12){c.keys=many(3+Math.floor(tier/3));c.doors=many(c.keys.length);}
 if(mode===13){c.anchors=many(3+Math.floor(tier/3));l.shields=[];for(let p of c.anchors){let q=[p[0]-1,p[1]];used.add(q.join(','));l.shields.push(q);near(q)}l.drones=[[w-7,3,w-7,h-4]];}
 // Optional tactical tools and control obstacles, varied by room.
 c.hourglasses=(mode%3===0||tier>=3)?many(1):[];c.magnets=(mode%4===0)?many(1):[];
 c.springs=(mode===2||mode===7||mode===14)?many(1).map(p=>[...p,0]):[];
 c.ice=(mode===3||mode===11)?many(2):[];
 c.arrowsForce=(mode===1||mode===9)?many(2).map((p,j)=>[...p,j%2?1:0]):[];
 c.silencers=(mode===6||mode===13)?many(1):[];
 // Remove conflicting hazards around essential targets and pickup cells.
 const specials=challengePoints(l);const close=p=>specials.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<1.5);
 for(let field of ['spikes','mines','crumbles','currents'])l[field]=(l[field]||[]).filter(p=>!close(p));
 // Keep at least one clear example of each speed pad in every new room.
 if(l.currents.length<2){l.currents=[...many(2).map((p,j)=>[...p,1,1,j?3:1/3])]}else l.currents=l.currents.map(p=>[...p.slice(0,4),p[4]<1?1/3:3]);
 l.tip=MISSION_TIPS[mode]+' '+(c.hourglasses.length?'El reloj de arena congela el consumo normal durante 3 s. ':'')+(c.magnets.length?'El im\xE1n atrae comida cercana. ':'')+(c.ice.length?'El hielo obliga a seguir recto. ':'')+(c.arrowsForce.length?'Las cintas con flecha fuerzan el giro. ':'')+(c.springs.length?'El trampol\xEDn salta dos casillas si el destino est\xE1 libre. ':'')+(c.silencers.length?'El inhibidor desactiva las trampas durante 5 s. ':'')+'Acelerador \xD73 y freno \xF73 durante 2 s.';
 if(typeof CHALLENGE_DATA!=='undefined'&&CHALLENGE_DATA[i]){Object.assign(l,CHALLENGE_DATA[i]);if(l.missionDeadline)l.challenge.deadline=l.missionDeadline;}
 }}
function challengePoints(l){const c=l.challenge;if(!c)return[];return Object.entries(c).flatMap(([k,v])=>Array.isArray(v)?(typeof v[0]==='number'?[v]:v):[]).filter(p=>Array.isArray(p)&&p.length>=2)}
function initChallenge(){const c=g.l.challenge||{};g.challenge={taken:{},done:{},cargo:-1,egg:-1,checkpoint:0,color:-1,ammo:0,battery:0,generators:(c.generators||[]).map(()=>0),lights:(c.lights||[]).map(()=>false),mirrors:(c.mirrors||[]).map(p=>p[2]),seals:(c.seals||[]).map(()=>false),sealTime:0,keys:[],portals:[],freeze:0,magnet:0,silence:0,tunnelCD:0};g.currentEffect=0;g.currentTime=0;}
function challengeSpecial(x,y){return challengePoints(g.l).some(p=>eq(p,x,y))}
function challengeBlocked(x,y){const c=g.l.challenge,s=g.challenge;if(!c||!s)return false;return (c.barriers||[]).some((p,i)=>eq(p,x,y)&&!s.done['barrier'+i])||(c.doors||[]).some((p,i)=>eq(p,x,y)&&!s.keys[i]);}
function canBreak(x,y){let c=g.l.challenge,s=g.challenge;return !!c&&s.ammo>0&&(c.barriers||[]).some((p,i)=>eq(p,x,y)&&!s.done['barrier'+i]);}
function breakBarrier(x,y){if(!canBreak(x,y))return;let i=g.l.challenge.barriers.findIndex(p=>eq(p,x,y));g.challenge.ammo--;g.challenge.done['barrier'+i]=true;sound('boom');explosionEffect(x,y,'#ffba68','Barricada \u22121 \xB7 Carga \u22121')}
function beamTrace(){let c=g.l.challenge,s=g.challenge;if(!c?.source)return{lit:true,lines:[]};let [x,y]=c.source,dx=1,dy=0,lines=[],seen=new Set();for(let n=0;n<200;n++){let nx=x+dx,ny=y+dy;lines.push([x,y,nx,ny]);if(eq(c.receiver,nx,ny))return{lit:true,lines};if(wall(nx,ny))break;let id=[nx,ny,dx,dy].join(',');if(seen.has(id))break;seen.add(id);let mi=c.mirrors.findIndex(p=>eq(p,nx,ny));if(mi>=0){[dx,dy]=s.mirrors[mi]?[dy,dx]:[-dy,-dx];}x=nx;y=ny;}return{lit:false,lines}}
function challengeComplete(){const c=g.l.challenge,s=g.challenge;if(!c)return true;const all=(field,prefix)=>!(c[field]||[]).some((p,i)=>!s.done[prefix+i]);return all('treasures','treasure')&&all('packages','mail')&&s.checkpoint===(c.checkpoints||[]).length&&all('arrows','arrow')&&all('locks','lock')&&all('barriers','barrier')&&(!c.tunnels||s.portals.filter(Boolean).length===c.tunnels.length/2)&&s.lights.every(Boolean)&&s.generators.every(v=>v===2)&&all('eggs','egg')&&s.seals.every(Boolean)&&all('doors','door')&&all('anchors','anchor')&&beamTrace().lit;}
function challengeStep(){const c=g.l.challenge,s=g.challenge;if(!c)return;const at=p=>eq(p,g.x,g.y),event=()=>{sound('switch');burst(g.x,g.y,'#b6f560',12)};
 const collect=(field,prefix,fn)=>{(c[field]||[]).forEach((p,i)=>{if(at(p)&&!s.taken[prefix+i]){s.taken[prefix+i]=true;fn(i);event();pickupEffect(field,i)}})};
 collect('treasures','treasure',i=>s.done['treasure'+i]=true);
 (c.packages||[]).forEach((p,i)=>{if(at(p)&&s.cargo<0&&!s.done['mail'+i]){s.cargo=i;event();visualEffect('pickup',g.x,g.y,'#ffa8d1','Paquete '+(i+1)+' \u2192 buz\xF3n '+(i+1))}});if(s.cargo>=0&&at(c.mailboxes[s.cargo])){s.done['mail'+s.cargo]=true;s.cargo=-1;event();visualEffect('pulse',g.x,g.y,'#b6f560','\xA1Paquete entregado!')}
 if(c.checkpoints&&s.checkpoint<c.checkpoints.length&&at(c.checkpoints[s.checkpoint])){s.checkpoint++;event()}
 (c.arrows||[]).forEach((p,i)=>{if(at(p)&&eq([[1,0],[0,1],[-1,0],[0,-1]][p[2]],...g.dir)&&!s.done['arrow'+i]){s.done['arrow'+i]=true;event()}});
 (c.paints||[]).forEach((p,i)=>{if(at(p)){s.color=i;event();visualEffect('pulse',g.x,g.y,['#ff8aa2','#82d9ff','#f4d96c'][i],'Tinte '+['rosa','azul','dorado'][i])}});(c.locks||[]).forEach((p,i)=>{if(at(p)&&s.color===p[2]&&!s.done['lock'+i]){s.done['lock'+i]=true;event()}});
 (c.mirrors||[]).forEach((p,i)=>{if(at(p)){s.mirrors[i]=1-s.mirrors[i];event()}});
 collect('ammo','ammo',()=>s.ammo++);
 if(s.tunnelLock!==g.x+','+g.y)s.tunnelLock=null;
 (c.tunnels||[]).forEach((p,i)=>{if(at(p)&&s.tunnelLock!==p.slice(0,2).join(',')){s.portals[Math.floor(i/2)]=true;let q=c.tunnels[i^1];g.x=q[0];g.y=q[1];g.trail=Array.from({length:30},()=>[g.x,g.y]);s.tunnelLock=q.slice(0,2).join(',');sound('portal')}});
 (c.lights||[]).forEach((p,i)=>{if(at(p)){s.lights[i]=!s.lights[i];event()}});
 collect('batteries','battery',()=>s.battery++);(c.generators||[]).forEach((p,i)=>{if(at(p)&&s.battery>0&&s.generators[i]<2){let used=Math.min(s.battery,2-s.generators[i]);s.generators[i]+=used;s.battery-=used;event();visualEffect('pulse',g.x,g.y,'#a6efae','Energ\xEDa +'+used+' \xB7 Bater\xEDas \u2212'+used)}});
 (c.eggs||[]).forEach((p,i)=>{if(at(p)&&s.egg<0&&!s.done['egg'+i]){s.egg=i;event();visualEffect('pickup',g.x,g.y,'#ffd4e3','Huevo recogido \u2192 Nido')}});if(c.nest&&at(c.nest)&&s.egg>=0){s.done['egg'+s.egg]=true;s.egg=-1;event();visualEffect('pulse',g.x,g.y,'#ffd4e3','\xA1Huevo rescatado!')}
 (c.seals||[]).forEach((p,i)=>{if(at(p)&&!s.seals[i]){s.seals[i]=true;if(s.sealTime<=0)s.sealTime=c.deadline;event()}});
 collect('keys','key',i=>s.keys[i]=true);(c.doors||[]).forEach((p,i)=>{if(at(p)&&s.keys[i]&&!s.done['door'+i]){s.done['door'+i]=true;event()}});
 (c.anchors||[]).forEach((p,i)=>{if(at(p)&&g.shield>0&&!s.done['anchor'+i]){s.done['anchor'+i]=true;event();explosionEffect(g.x,g.y,'#ff919e','\xA1Anclaje desactivado!')}});
 collect('hourglasses','hourglass',()=>s.freeze=3);collect('magnets','magnet',()=>s.magnet=5);collect('silencers','silencer',()=>s.silence=5);
 const forced=(c.arrowsForce||[]).find(at);if(forced){g.next=[[1,0],[0,1],[-1,0],[0,-1]][forced[2]].slice();g.dir=g.next.slice()}
 const spring=(c.springs||[]).find(at);if(spring){let x=g.x+g.dir[0]*2,y=g.y+g.dir[1]*2;if(!wall(x,y)&&!special(x,y)&&!g.boxes.some(p=>eq(p,x,y))){g.x=x;g.y=y;sound('portal')}}
}
function updateChallenge(dt){const s=g.challenge,c=g.l.challenge;g.currentTime=Math.max(0,g.currentTime-dt);if(!s)return;for(let k of ['freeze','magnet','silence','tunnelCD'])s[k]=Math.max(0,s[k]-dt);if(c&&s.sealTime>0&&!s.seals.every(Boolean)){s.sealTime-=dt;if(s.sealTime<=0){s.seals.fill(false);s.sealTime=0;g.open=false;sound('critical')}}if(s.magnet>0){for(let i=g.foods.length-1;i>=0;i--)if(Math.hypot(g.foods[i][0]-g.x,g.foods[i][1]-g.y)<2.6){g.foods.splice(i,1);feed()}}}
function challengeHUD(){const c=g.l.challenge,s=g.challenge;let speed=g.currentTime>0?(g.currentEffect<1?' \xB7 TURBO \xD73 ':' \xB7 FRENO \xF73 ')+g.currentTime.toFixed(1)+' s':'';if(!c)return speed;const done=prefix=>Object.keys(s.done).filter(k=>k.startsWith(prefix)).length;let info=[MISSION_NAMES[c.mode]];
 if(c.treasures)info.push('Tesoros '+done('treasure')+'/'+c.treasures.length);if(c.packages)info.push('Entregas '+done('mail')+'/'+c.packages.length+(s.cargo>=0?' \xB7 Llevas paquete '+(s.cargo+1):''));if(c.checkpoints)info.push('Balizas '+s.checkpoint+'/'+c.checkpoints.length);if(c.arrows)info.push('Flechas '+done('arrow')+'/'+c.arrows.length);if(c.locks)info.push('Cerraduras '+done('lock')+'/'+c.locks.length+' \xB7 Tinte '+(['rosa','azul','dorado'][s.color]||'sin elegir'));if(c.mirrors)info.push('Rayo '+(beamTrace().lit?'conectado':'sin conectar'));if(c.barriers)info.push('Barricadas '+done('barrier')+'/'+c.barriers.length+' \xB7 Cargas '+s.ammo);if(c.tunnels)info.push('Viajes '+s.portals.filter(Boolean).length+'/'+c.tunnels.length/2);if(c.lights)info.push('Luces '+s.lights.filter(Boolean).length+'/'+c.lights.length);if(c.generators)info.push('Energ\xEDa '+s.generators.reduce((a,b)=>a+b,0)+'/'+c.generators.length*2+' \xB7 Bater\xEDas '+s.battery);if(c.eggs)info.push('Rescates '+done('egg')+'/'+c.eggs.length+(s.egg>=0?' \xB7 Huevo a bordo':''));if(c.seals)info.push('Sellos '+s.seals.filter(Boolean).length+'/'+c.seals.length+' \xB7 '+s.sealTime.toFixed(1)+' s');if(c.doors)info.push('Puertas '+done('door')+'/'+c.doors.length);if(c.anchors)info.push('Anclajes '+done('anchor')+'/'+c.anchors.length);if(s.freeze>0)info.push('Tiempo congelado '+s.freeze.toFixed(1)+' s');if(s.magnet>0)info.push('Im\xE1n '+s.magnet.toFixed(1)+' s');if(s.silence>0)info.push('Trampas anuladas '+s.silence.toFixed(1)+' s');return info.join(' \xB7 ')+speed;}
function drawChallenges(c,s){const m=g.l.challenge,q=g.challenge;if(!m)return;const colors=['#ff8aa2','#82d9ff','#f4d96c'];function tile(p,label,color,done=false,kind=null){let x=(p[0]+.5)*s,y=(p[1]+.5)*s;const type=kind||objectType(label);if(type){if(type==='mirror'&&label==='\\\\'){c.save();c.translate(x,y);c.scale(-1,1);drawObject(c,type,0,0,s*.96,color);c.restore()}else drawObject(c,type,x,y,s*.96,color);let badge=done?'\u2713':(/^([PDKG]\\d+|\\d\\/2)$/.test(label)?label.replace(/^[PDKG]/,''):'');if(badge){circle(c,x+s*.3,y+s*.28,s*.2,done?'#397c41':'#23322d');c.fillStyle='#fff';c.font='bold '+s*.28+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(badge,x+s*.3,y+s*.28)}return;}c.fillStyle=done?'#244c30':color+'35';c.strokeStyle=done?'#9bdf9f':color;c.lineWidth=1.5;c.beginPath();c.roundRect(x-s*.42,y-s*.42,s*.84,s*.84,5);c.fill();c.stroke();c.fillStyle=done?'#b2ffb4':color;c.textAlign='center';c.textBaseline='middle';c.font='bold '+s*.43+'px sans-serif';c.fillText(done?'\u2713':label,x,y)}
 const each=(field,fn)=>(m[field]||[]).forEach(fn);
 each('treasures',(p,i)=>{if(!q.done['treasure'+i])tile(p,'\u25C6','#ffdc7d')});each('packages',(p,i)=>{if(!q.done['mail'+i]&&q.cargo!==i)tile(p,'P'+(i+1),'#ffa8d1')});each('mailboxes',(p,i)=>tile(p,'D'+(i+1),'#ffcce4',q.done['mail'+i]));each('checkpoints',(p,i)=>tile(p,''+(i+1),i===q.checkpoint?'#9ffff1':'#5d9696',i<q.checkpoint));each('arrows',(p,i)=>tile(p,['\u2192','\u2193','\u2190','\u2191'][p[2]],'#b2f5c2',q.done['arrow'+i]));each('paints',(p,i)=>tile(p,'T',colors[i]));each('locks',(p,i)=>tile(p,'\u2299',colors[p[2]],q.done['lock'+i]));each('ammo',(p,i)=>{if(!q.taken['ammo'+i])tile(p,'B','#ffce8b')});each('barriers',(p,i)=>{if(!q.done['barrier'+i])tile(p,'\u25A7','#ff985c')});each('tunnels',(p,i)=>tile(p,String.fromCharCode(65+Math.floor(i/2)),['#ac9fff','#70dff3','#ffa6ed'][Math.floor(i/2)],q.portals[Math.floor(i/2)],'portal'));each('lights',(p,i)=>tile(p,q.lights[i]?'\u2600':'\u25CB',q.lights[i]?'#fff5aa':'#71766c'));each('batteries',(p,i)=>{if(!q.taken['battery'+i])tile(p,'+','#a6efae')});each('generators',(p,i)=>tile(p,q.generators[i]+'/2','#c1ffd1',q.generators[i]===2));each('eggs',(p,i)=>{if(!q.done['egg'+i]&&q.egg!==i)tile(p,'\u25CF','#ffd4e3')});if(m.nest)tile(m.nest,'N','#fcb6d0');each('seals',(p,i)=>tile(p,'\u25F7','#b9bdff',q.seals[i]));each('keys',(p,i)=>{if(!q.keys[i])tile(p,'K'+(i+1),'#ffe2a6')});each('doors',(p,i)=>tile(p,'G'+(i+1),'#e2bd6b',q.done['door'+i]));each('anchors',(p,i)=>tile(p,'\u2725','#ff9eab',q.done['anchor'+i]));
 each('hourglasses',(p,i)=>{if(!q.taken['hourglass'+i])tile(p,'\u231B','#b9f1ff')});each('magnets',(p,i)=>{if(!q.taken['magnet'+i])tile(p,'M','#ffb1ee')});each('silencers',(p,i)=>{if(!q.taken['silencer'+i])tile(p,'S','#c5ffad')});each('ice',p=>tile(p,'\u2744','#b4edff'));each('arrowsForce',p=>tile(p,['\u21D2','\u21D3','\u21D0','\u21D1'][p[2]],'#f7caff'));each('springs',p=>tile(p,'J','#fce7af'));
 if(m.source){let beam=beamTrace();c.strokeStyle=beam.lit?'#aeffa4':'#7cdeff';c.lineWidth=3;c.shadowColor=c.strokeStyle;c.shadowBlur=8;c.beginPath();for(let line of beam.lines){c.moveTo((line[0]+.5)*s,(line[1]+.5)*s);c.lineTo((line[2]+.5)*s,(line[3]+.5)*s)}c.stroke();c.shadowBlur=0;tile(m.source,'Emisor','#a0eaff');tile(m.receiver,'\u25CE','#b0ffd3',beam.lit);each('mirrors',(p,i)=>tile(p,q.mirrors[i]?'\\\\':'/','#d5f4ff'))}
 if(q.cargo>=0||q.egg>=0)drawObject(c,q.cargo>=0?'package':'egg',(g.x+.5)*s,(g.y-.2)*s,s*.6);
}

</script><script>
'use strict';
// Shared illustrations: the map, inventory and guide use the same geometry.
const objectShapes={};
const R=(x,y,w,h,f)=>['rect',[x,y,w,h],f],E=(x,y,rx,ry,f)=>['ellipse',[x,y,rx,ry],f],P=(points,f)=>['polygon',points,f],Q=(points,f,w=2)=>['line',points,f,w];
objectShapes.egg=[E(32,55,20,5,'#0005'),E(32,33,19,25,'#fff0d3'),E(27,27,9,15,'#fff9ea'),E(37,42,3,2,'#c69d77'),E(24,37,2,3,'#c69d77'),E(38,24,2,2,'#d3b99a')];
objectShapes.nest=[E(32,49,28,10,'#0005'),E(32,38,28,18,'#8c5d32'),E(32,31,24,11,'#553b28'),E(32,32,16,7,'#32291e'),Q([[7,36],[24,46],[51,40]],'#e5b66e',3),Q([[11,46],[33,51],[58,35]],'#bb8646',3),Q([[6,30],[18,39],[43,43],[57,27]],'#efc588',2),Q([[16,24],[5,32],[14,43]],'#d09b55',2),Q([[47,22],[58,31],[51,46]],'#e6b276',2)];
objectShapes.wall=[R(5,13,54,42,'#6a5146'),R(6,14,24,12,'#ca8862'),R(33,14,25,12,'#ad6e50'),R(6,29,13,11,'#b27553'),R(22,29,24,11,'#d2956c'),R(49,29,9,11,'#ae6f4e'),R(6,43,25,11,'#c18660'),R(34,43,24,11,'#ba7754'),Q([[38,14],[34,24],[40,31],[34,40],[37,54]],'#4c3931',2)];
objectShapes.charge=[Q([[38,17],[45,8],[53,9]],'#e2be74',3),R(12,19,12,36,'#b73e43'),R(26,15,12,40,'#e76350'),R(40,21,12,34,'#c54a41'),R(10,27,44,6,'#513c36'),R(10,43,44,6,'#513c36'),E(53,8,4,4,'#ffdf73'),Q([[12,22],[12,51]],'#ff9a7e',2)];
objectShapes.package=[P([[8,19],[32,8],[56,19],[32,31]],'#eac28a'),P([[8,19],[32,31],[32,58],[8,45]],'#b67c49'),P([[32,31],[56,19],[56,45],[32,58]],'#dba46b'),P([[21,13],[44,25],[44,37],[37,41],[37,28],[15,17]],'#f9deac'),R(14,30,12,9,'#fff2cb')];
objectShapes.mailbox=[R(29,39,7,22,'#886242'),R(9,17,44,28,'#64899b'),E(17,28,10,13,'#8fb2be'),R(7,28,20,17,'#8fb2be'),R(9,29,16,3,'#233b43'),Q([[47,30],[47,8],[58,8],[58,19],[47,19]],'#ff8d8b',4)];
objectShapes.key=[E(20,22,13,13,'#f4c95e'),E(20,22,6,6,'#3c3527'),Q([[29,30],[52,53]],'#f7d875',8),Q([[41,41],[48,34]],'#f7d875',5),Q([[47,47],[55,40]],'#f7d875',5)];
objectShapes.door=[R(10,6,44,54,'#99734b'),R(15,11,34,48,'#543b2a'),R(19,15,26,40,'#b27b4b'),Q([[32,16],[32,54]],'#795132',2),E(39,37,3,3,'#ffdc79')];
objectShapes.battery=[R(25,5,14,7,'#cfddcd'),R(17,11,30,48,'#526c5b'),R(21,15,22,40,'#8ce2a2'),P([[34,20],[24,35],[32,35],[28,50],[41,31],[33,31]],'#fff3b1')];
objectShapes.generator=[R(7,18,50,36,'#687e79'),R(13,24,25,23,'#233e39'),E(25,35,8,8,'#9aefb5'),R(41,25,9,5,'#f1ce68'),R(41,35,9,5,'#98c5b1'),R(11,53,9,7,'#34433d'),R(44,53,9,7,'#34433d'),Q([[15,18],[15,10],[44,10],[44,18]],'#a1b3a1',4)];
objectShapes.paint=[E(32,47,20,10,'#48606a'),R(12,22,40,25,'#b6c7cb'),E(32,22,20,8,'#dfe9e6'),E(32,22,15,5,'@'),R(13,32,38,10,'@'),Q([[12,25],[6,15],[12,7],[47,7],[58,15],[52,25]],'#839498',3)];
objectShapes.lock=[Q([[19,29],[19,16],[25,8],[39,8],[45,16],[45,29]],'#dde6e7',7),R(12,27,40,31,'@'),E(32,39,5,5,'#32404b'),R(30,41,4,9,'#32404b')];
objectShapes.magnet=[P([[10,10],[23,10],[23,39],[27,45],[37,45],[41,39],[41,10],[54,10],[54,40],[49,53],[40,59],[24,59],[15,53],[10,40]],'#de697f'),R(10,9,13,12,'#cfe8ed'),R(41,9,13,12,'#cfe8ed')];
objectShapes.hourglass=[R(12,6,40,6,'#ba985e'),R(12,52,40,6,'#ba985e'),P([[18,13],[46,13],[41,25],[35,32],[41,39],[46,51],[18,51],[23,39],[29,32],[23,25]],'#b3e4ec'),P([[23,17],[41,17],[32,28]],'#f5d789'),P([[21,49],[32,38],[43,49]],'#f5d789'),Q([[32,28],[32,40]],'#f5d789',2)];
objectShapes.silencer=[R(17,20,30,37,'#556b77'),Q([[24,20],[20,6]],'#cad9dd',3),R(22,26,20,12,'#a5e9ad'),E(32,47,5,5,'#d4dfcf'),Q([[51,17],[57,23],[59,32]],'#b8efaa',3)];
objectShapes.spring=[R(8,50,48,8,'#687f82'),Q([[18,50],[45,42],[19,34],[45,26],[19,18]],'#e2d4b7',4),R(8,9,48,10,'#e29c62')];
objectShapes.gem=[P([[8,24],[20,9],[45,9],[57,24],[32,58]],'#ffc858'),Q([[8,24],[57,24],[32,58],[20,24],[20,9],[32,24],[45,9],[45,24],[32,58]],'#fff3a8',2)];
objectShapes.mirror=[P([[13,10],[45,5],[53,50],[21,57]],'#9faebc'),P([[17,14],[41,10],[48,46],[24,51]],'#a4e9f7'),Q([[23,38],[37,18]],'#edffff',4),Q([[29,42],[42,26]],'#e1ffff',2)];
objectShapes.portal=[E(32,34,23,28,'#7658b0'),E(32,34,17,23,'@'),E(32,34,11,18,'#192536'),Q([[23,21],[32,14],[42,20]],'#e2faff',3)];
objectShapes.emitter=[R(10,43,44,12,'#687e8b'),P([[20,43],[16,23],[30,15],[47,22],[42,43]],'#a5bcc6'),E(32,27,11,11,'#93e9ff'),E(32,27,5,5,'#eaffff')];
objectShapes.receiver=[R(16,46,32,10,'#627974'),E(32,28,21,21,'#859f95'),E(32,28,15,15,'#355c4c'),E(32,28,8,8,'#c7ffe5')];
objectShapes.anchor=[R(20,8,24,46,'#856778'),P([[10,17],[20,8],[20,54],[9,45]],'#5f465d'),P([[44,8],[55,17],[55,45],[44,54]],'#b1798d'),E(32,31,9,12,'#ff9aaa')];
objectShapes.clock=[E(32,33,25,25,'#8296be'),E(32,33,19,19,'#e2ebff'),Q([[32,20],[32,33],[43,38]],'#465775',3),R(25,3,14,5,'#b6c4dc')];
objectShapes.shield=[P([[9,13],[32,5],[55,13],[51,41],[42,53],[32,60],[22,53],[13,41]],'#d8bf74'),P([[15,18],[32,12],[49,18],[45,39],[32,52],[19,39]],'#809a9b'),Q([[32,17],[32,45]],'#fff3bc',4)];
function objectType(label){if(/^P\\d*$/.test(label))return'package';if(/^D\\d+$/.test(label))return'mailbox';if(/^K\\d*$/.test(label)||label==='\u26BF')return'key';if(/^G\\d+$/.test(label))return'door';if(/^\\d\\/2$/.test(label))return'generator';return {'B':'charge','\u25A7':'wall','N':'nest','\u25CF':'egg','+':'battery','M':'magnet','S':'silencer','T':'paint','\u2299':'lock','J':'spring','\u231B':'hourglass','\u25C6':'gem','/':'mirror','\\\\':'mirror','\u25CE':'receiver','\u2725':'anchor','\u25F7':'clock','\u25C7':'shield','Emisor':'emitter','A':'portal'}[label]||null}
function drawObject(c,type,x,y,size,tint='#9bdcdb'){c.save();c.translate(x-size/2,y-size/2);c.scale(size/64,size/64);c.lineJoin='round';c.lineCap='round';c.shadowColor='#0007';c.shadowBlur=3;for(const [kind,a,fill,width]of objectShapes[type]||[]){c.beginPath();if(kind==='rect')c.roundRect(...a,2);else if(kind==='ellipse')c.ellipse(...a,0,0,Math.PI*2);else {a.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));if(kind==='polygon')c.closePath();}if(kind==='line'){c.strokeStyle=fill==='@'?tint:fill;c.lineWidth=width;c.stroke()}else{c.fillStyle=fill==='@'?tint:fill;c.fill();c.strokeStyle='#1d292c';c.lineWidth=.8;c.stroke()}c.shadowBlur=0;}c.restore()}
function objectSVG(type,tint='#9bdcdb'){const shapes=(objectShapes[type]||[]).map(([kind,a,fill,width])=>{const color=fill==='@'?tint:fill,attrs=\`fill="\${kind==='line'?'none':color}" stroke="\${kind==='line'?color:'#1d292c'}" stroke-width="\${width||.8}" stroke-linecap="round" stroke-linejoin="round"\`;if(kind==='rect')return \`<rect x="\${a[0]}" y="\${a[1]}" width="\${a[2]}" height="\${a[3]}" rx="2" \${attrs}/>\`;if(kind==='ellipse')return \`<ellipse cx="\${a[0]}" cy="\${a[1]}" rx="\${a[2]}" ry="\${a[3]}" \${attrs}/>\`;return \`<\${kind==='line'?'polyline':'polygon'} points="\${a.map(p=>p.join(',')).join(' ')}" \${attrs}/>\`;}).join('');return \`<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">\${shapes}</svg>\`}

</script><script>
'use strict';
let effects=[],inventorySignature='';
const GUIDE_COLORS={gold:'#ffdc7d',pink:'#ffa8d1',blue:'#88e5ff',green:'#a6efae',purple:'#c9a4ff',red:'#ff919e'};
function guideBadge(symbol,color){let pieces=symbol.split(/\\s+/).map(token=>{let type=objectType(token);return type?\`<span class="object-illustration">\${objectSVG(type,color)}\${/^[PDKG]\\d+$/.test(token)?\`<small>\${token.slice(1)}</small>\`:''}</span>\`:token}).join(' ');return \`<span class="guide-icon" style="--item:\${color}">\${pieces}</span>\`}
function roomGuideItems(l){const c=l.challenge||{},items=[];const add=(exists,symbol,name,description,color='#b6f560',group='Objetivos')=>{if(exists)items.push({symbol,name,description,color,group})};
 add(c.treasures?.length,'\u25C6','Tesoros','Recoge todos. T\xFA eliges el orden.','#ffdc7d');
 add(c.packages?.length,'P1 \u2192 D1','Paquete y buz\xF3n','Lleva cada paquete al buz\xF3n con el mismo n\xFAmero. Solo llevas un paquete a la vez.','#ffa8d1');
 add(c.checkpoints?.length,'1 \u2192 2','Balizas','Cruza las balizas en orden. La siguiente brilla en turquesa.','#88e5ff');
 add(c.arrows?.length,'\u2192','Entrada de precisi\xF3n','La flecha marca tu movimiento al entrar. Para \u2192, llega desde la izquierda.','#b2f5c2');
 add(c.locks?.length,'T \u2192 \u2299','Tintes y cerraduras','Pisa un bote de pintura para elegir su color. Despu\xE9s cruza la cerradura del mismo color.','#c9a4ff');
 add(c.mirrors?.length,'/  \\\\','Espejos y receptor','Pisar un espejo lo gira. Conecta el rayo del emisor luminoso con el receptor \u25CE.','#a0eaff');
 add(c.ammo?.length,'B','Cargas de demolici\xF3n','Recoge un haz de dinamita: ganas una carga. El inventario indica cu\xE1ntas conservas.','#ffce8b');
 add(c.barriers?.length,'\u25A7','Barricadas','Con una carga, embiste una barricada: explota y consume 1 carga. No causa da\xF1o adicional.','#ff985c');
 add(c.tunnels?.length,'A \u2194 A','Portales enlazados','Cada letra conecta dos extremos. Viaja por todos los pares.','#ac9fff');
 add(c.lights?.length,'\u25CB \u2192 \u2600','Baldosas de luz','Cada paso alterna encendido y apagado. D\xE9jalas todas encendidas y sal sin apagarlas.','#fff5aa');
 add(c.batteries?.length,'+ \u2192 0/2','Bater\xEDas y generadores','Recoge las bater\xEDas verdes. Cada generador consume 2; se depositan al pasar.','#a6efae');
 add(c.eggs?.length,'\u25CF \u2192 N','Rescate de huevos','Lleva cada huevo rosa al nido de ramas. Solo puedes transportar uno.','#ffd4e3');
 add(c.seals?.length,'\u25F7','Sellos contrarreloj','El primer sello inicia la cuenta. Activa todos antes de cero o tendr\xE1s que repetirlos.','#b9bdff');
 add(c.keys?.length,'K1 \u2192 G1','Llave y puerta','Recoge la llave y atraviesa la puerta con el mismo n\xFAmero. Los n\xFAmeros deben coincidir; las llaves no se consumen.','#ffe2a6');
 add(c.anchors?.length,'\u25C7 \u2192 \u2725','Anclajes protegidos','Recoge un escudo \u25C7 y toca los anclajes \u2725 antes de que termine su efecto.','#ff9eab');
 add(l.sw?.length,l.seq?'1 \u2192 2':'\u25C9','Interruptores',l.seq?'Act\xEDvalos en orden. Un n\xFAmero incorrecto reinicia la secuencia.':'Pasa por todos los nodos para activarlos.','#c395ff');
 add(l.boxes?.length,'\u25A3 \u2192 \u25A1','Cubo y placa','Empuja el cubo hasta la placa. Al encajar, queda bloqueado. Empujarlo no causa da\xF1o adicional.','#ffc467');
 add(l.key,'\u26BF','Llave de salida','Rec\xF3gela para desbloquear la salida junto con los dem\xE1s objetivos.','#ffd36e');
 add(l.runes?.length,'1 \xB7 2','Cristales','Rec\xF3gelos en el orden de sus n\xFAmeros.','#a6efff');
 add(l.portals?.length,'\u25CE','Portales','Pisar un portal te lleva a su pareja.','#67dfff');
 add(l.relay,'\u25F7','Rel\xE9','Completa los interruptores antes de que termine su cuenta.','#b9bdff');
 add(l.gates?.length,'\u229F','Compuerta','El interruptor asociado abre este paso.','#c395ff');
 add(l.shields?.length,'\u25C7','Escudo \xB7 4 s','Protege de trampas, pero el tiempo normal sigue bajando y los muros siguen haciendo da\xF1o.','#fff4a6','Herramientas');
 add(c.hourglasses?.length,'\u231B','Reloj \xB7 3 s','Congela el consumo normal. Chocar todav\xEDa causa da\xF1o.','#b9f1ff','Herramientas');
 add(c.magnets?.length,'M','Im\xE1n \xB7 5 s','Recoge autom\xE1ticamente la comida cercana.','#ffb1ee','Herramientas');
 add(c.silencers?.length,'S','Anulador \xB7 5 s','Desactiva el da\xF1o de las trampas. No protege de paredes ni bloqueos.','#c5ffad','Herramientas');
 add(l.currents?.length,'\u226B / \u2248','Turbo y freno','Turquesa: velocidad \xD73. Violeta: velocidad \xF73. Duran 2 s despu\xE9s de pisarlos.','#8ffff3','Movimiento');
 add(c.ice?.length,'\u2744','Hielo','Mientras est\xE1s encima debes seguir recto; gira despu\xE9s de salir.','#b4edff','Movimiento');
 add(c.arrowsForce?.length,'\u21D2','Cinta direccional','La flecha cambia tu rumbo autom\xE1ticamente al pisarla.','#f7caff','Movimiento');
 add(c.springs?.length,'J','Trampol\xEDn','Salta dos casillas en tu direcci\xF3n si el destino est\xE1 libre.','#fce7af','Movimiento');
 add(l.spikes?.length,'\u25B3','Trampa viajera','Verde: segura y con comida. Naranja: segura, sin comida. Roja: da\xF1o. Despu\xE9s se traslada.','#ffa36c','Peligros');
 add(l.mines?.length,'\u2739','Mina de proximidad','Se arma cuando te acercas. Al\xE9jate del c\xEDrculo antes de la explosi\xF3n.','#ffb76c','Peligros');
 add(l.crumbles?.length,'\u22C8','Suelo fr\xE1gil','Empieza a agrietarse al pisarlo; despu\xE9s hace da\xF1o si vuelves.','#e1c8b1','Peligros');
 add(l.lasers?.length,'\u2502','L\xE1ser intermitente','Cruza cuando el haz rojo est\xE9 apagado.','#ff798b','Peligros');
 add(l.sweeps?.length,'\u2194','Haz m\xF3vil','Observa su barrido y cruza cuando se haya alejado.','#ff798b','Peligros');
 add(l.drones?.length,'\u25C9','Drones','Patrullan por la sala. Evita su contacto.','#ff6072','Peligros');
 return items;}
function guideFlow(l){const c=l.challenge;const flows=[
 [['\u25C6','Busca','Localiza los tesoros'],['\u25C6 \u2713','Recoge','Consigue todos'],['\u2197','Escapa','Cruza la salida']],
 [['P1','Recoge','Toma un paquete'],['D1','Entrega','Ll\xE9valo al buz\xF3n igual'],['\u2197','Escapa','Completa los env\xEDos']],
 [['1','Empieza','Cruza la primera baliza'],['2 \u2192 3','Contin\xFAa','Sigue el orden'],['\u2197','Escapa','Alcanza la puerta']],
 [['\u2192','Observa','Lee la direcci\xF3n'],['\u2192 \u2713','Entra','Llega desde el lado correcto'],['\u2197','Escapa','Completa las flechas']],
 [['T','Elige','Pisa un tinte'],['\u2299','Abre','Busca su mismo color'],['\u2197','Escapa','Abre todas las cerraduras']],
 [['Emisor','Sigue','Observa el rayo'],['/ \u2192 \\\\','Gira','Pisa los espejos'],['\u25CE','Conecta','Ilumina el receptor y sal']],
 [['B','Recoge','Carga +1 en tu inventario'],['\u25A7 \u2733','Embiste','Gasta 1 carga por barricada'],['\u2197','Escapa','Despeja todas las barricadas']],
 [['A','Entra','Pisa un portal'],['A \u2194 A','Viaja','Apareces en su pareja'],['\u2197','Escapa','Usa todos los pares']],
 [['\u25CB','Enciende','Pisa cada baldosa'],['\u2600','Conserva','Evita apagarlas al volver'],['\u2197','Escapa','Deja todas encendidas']],
 [['+','Recoge','Acumula bater\xEDas'],['2/2','Carga','Entrega 2 por generador'],['\u2197','Escapa','Alimenta la central']],
 [['\u25CF','Encuentra','Recoge un huevo rosa'],['N','Rescata','Ll\xE9valo al nido'],['\u2197','Escapa','Salva todos los huevos']],
 [['\u25F7','Inicia','Activa el primer sello'],['\u25F7 \u2713','Corre','Activa el resto a tiempo'],['\u2197','Escapa','Cruza la salida']],
 [['K1','Encuentra','Recoge la llave'],['G1','Atraviesa','Cruza la puerta igual'],['\u2197','Escapa','Completa todas las puertas']],
 [['\u25C7','Prot\xE9gete','Activa un escudo'],['\u2725','Embiste','Desactiva los anclajes'],['\u2197','Escapa','Elimina todos los anclajes']],
 [['P \u2192 D','Entrega','Lleva el paquete'],['1 \u2192 2','Recorre','Completa las balizas'],['/ \u2192 \u25CE','Conecta','Resuelve el rayo y sal']]
 ];if(c)return flows[c.mode];return [[l.boxes?.length?'\u25A3':'\u25C9','Resuelve',l.boxes?.length?'Encaja los cubos':'Activa los mecanismos'],[l.key?'\u26BF':'\u2713','Completa',l.key?'Busca la llave':'Revisa tus objetivos'],['\u2197','Escapa','Cruza la puerta iluminada']];}
function guideHTML(l,resume=false){let items=roomGuideItems(l);return \`<div class="modal level-guide"><div class="guide-head"><div class="eyebrow">HABITACI\xD3N \${g.i+1} \xB7 GU\xCDA VISUAL</div><h2>\${l.name}</h2><p>\${l.challenge?MISSION_TIPS[l.challenge.mode]:l.tip}</p></div><div class="guide-flow">\${guideFlow(l).map((step,i)=>\`<div class="guide-step"><span class="step-no">0\${i+1}</span>\${guideBadge(step[0],'#b6f560')}<b>\${step[1]}</b><span>\${step[2]}</span></div>\`).join('')}</div><div class="guide-content">\${['Objetivos','Herramientas','Movimiento','Peligros'].map(group=>{let list=items.filter(x=>x.group===group);return list.length?\`<section><h3>\${group} de esta sala</h3><div class="guide-grid">\${list.map(x=>\`<article>\${guideBadge(x.symbol,x.color)}<div><h4>\${x.name}</h4><p>\${x.description}</p></div></article>\`).join('')}</div></section>\`:''}).join('')}<div class="guide-basics"><span>\u25CF Comer recupera vida y tama\xF1o.</span><span>\u26A0 Chocar consume vida \xD73.</span><span>\u25A3 Empujar un cubo no a\xF1ade da\xF1o.</span><span>\u2328 Flechas / WASD \xB7 P pausa \xB7 H gu\xEDa.</span></div></div><div class="guide-actions"><span>El reloj est\xE1 detenido mientras lees.</span><div><button onclick="levels()">Habitaciones</button><button class="primary" onclick="begin()">\${resume?'VOLVER AL JUEGO':'\xA1ENTENDIDO, A JUGAR!'} \u2192</button></div></div></div>\`}
function showGuide(){if(!g||!['play','pause','ready'].includes(g.state))return;g.state='guide';clearContact();$('#overlay')?.remove();$('.arena').insertAdjacentHTML('beforeend',\`<div class="overlay guide-overlay" id="overlay" role="dialog" aria-modal="true" aria-label="Gu\xEDa visual del nivel">\${guideHTML(g.l,true)}</div>\`);$('#overlay .primary')?.focus?.({preventScroll:true})}
function inventoryItems(){if(!g)return[];const c=g.l.challenge||{},q=g.challenge,items=[];const add=(symbol,label,value,color)=>items.push({symbol,label,value,color});
 if(c.ammo)add('B','Cargas',q.ammo,'#ffce8b');if(c.batteries)add('+','Bater\xEDas',q.battery,'#a6efae');
 if(c.packages)add(q.cargo>=0?'P'+(q.cargo+1):'P','Paquete',q.cargo>=0?'\u2192 Buz\xF3n '+(q.cargo+1):'Vac\xEDo','#ffa8d1');
 if(c.eggs)add('\u25CF','Huevo',q.egg>=0?'\u2192 Nido':'Vac\xEDo','#ffd4e3');
 if(c.keys){let keys=q.keys.map((v,i)=>v?'K'+(i+1):null).filter(Boolean);add('K','Llaves',keys.length?keys.join(' \xB7 '):'Ninguna','#ffe2a6')}
 if(g.l.key)add('\u26BF','Llave',g.key?'S\xED':'No','#ffd36e');if(c.paints)add('T','Tinte',['Rosa','Azul','Dorado'][q.color]||'Sin elegir','#c9a4ff');
 if(g.shield>0)add('\u25C7','Escudo',Math.ceil(g.shield)+' s','#fff4a6');if(q.freeze>0)add('\u231B','Tiempo',Math.ceil(q.freeze)+' s','#b9f1ff');if(q.magnet>0)add('M','Im\xE1n',Math.ceil(q.magnet)+' s','#ffb1ee');if(q.silence>0)add('S','Anulador',Math.ceil(q.silence)+' s','#c5ffad');return items;}
function updateInventory(){const el=$('#inventory');if(!el||!g)return;const items=inventoryItems(),signature=JSON.stringify(items);if(signature===inventorySignature)return;inventorySignature=signature;el.innerHTML=\`<span class="inventory-title">TU EQUIPO</span>\${items.length?items.map(x=>\`<span class="inventory-chip" style="--item:\${x.color}">\${guideBadge(x.symbol,x.color)}<span>\${x.label}<b>\${x.value}</b></span></span>\`).join(''):'<span class="inventory-empty">Sin objetos transportados</span>'}\`;}
function visualEffect(type,x,y,color='#b6f560',label=''){effects.push({type,x,y,color,label,t:0,duration:type==='blast'?1:.95});if(effects.length>48)effects.splice(0,effects.length-48);}
function pickupEffect(field,i){const labels={treasures:'Tesoro +1',ammo:'Carga +1',batteries:'Bater\xEDa +1',keys:'Llave K'+(i+1),hourglasses:'Tiempo congelado',magnets:'Im\xE1n activado',silencers:'Trampas anuladas'};visualEffect('pickup',g.x,g.y,field==='ammo'?'#ffce8b':'#b6f560',labels[field]||'Recogido');}
function explosionEffect(x,y,color='#ffba68',label='\xA1Barricada destruida!'){visualEffect('blast',x,y,color,label);burst(x,y,color,32);for(let i=0;i<12;i++)particles.push({x,y,vx:(Math.random()-.5)*9,vy:-Math.random()*7,t:1,color:i%2?'#ffb95b':'#846247',kind:'debris',angle:Math.random()*6,spin:(Math.random()-.5)*14});}
function updateEffects(dt){if(g&&['pause','guide','ready'].includes(g.state))return;for(let e of effects)e.t+=dt;effects=effects.filter(e=>e.t<e.duration);}
function drawEffects(c,s){for(let e of effects){const p=e.t/e.duration,x=(e.x+.5)*s,y=(e.y+.5)*s;c.save();c.globalAlpha=Math.max(0,1-p);if(e.type==='blast'){if(p<.2)circle(c,x,y,s*(.3+p*3),'#fff2ce',25);c.strokeStyle=e.color;c.lineWidth=Math.max(1,s*.12*(1-p));c.beginPath();c.arc(x,y,s*(.2+p*2.6),0,Math.PI*2);c.stroke();c.globalAlpha=(1-p)*.28;for(let j=0;j<5;j++){let a=j*Math.PI*.4;circle(c,x+Math.cos(a)*p*s,y+Math.sin(a)*p*s-s*p*.5,s*(.18+p*.4),'#a29384')}c.globalAlpha=1-p;}else{c.strokeStyle=e.color;c.lineWidth=2;c.beginPath();c.arc(x,y,s*(.35+p*.65),0,Math.PI*2);c.stroke();}
 if(e.label){const scale=Math.min((cv?.clientWidth||cv?.width||1152)/(cv?.width||1152),(cv?.clientHeight||cv?.height||640)/(cv?.height||640)),fontSize=Math.max(13/scale,s*.48),height=fontSize+8/scale,pad=7/scale;c.font='bold '+fontSize+'px sans-serif';c.textAlign='center';c.textBaseline='middle';const width=c.measureText(e.label).width,lx=Math.max(width/2+pad,Math.min(g.l.w*s-width/2-pad,x)),ly=Math.max(height/2+2,y-s*(.9+p)-fontSize*.3);c.fillStyle='#102016e8';c.beginPath();c.roundRect(lx-width/2-pad,ly-height/2,width+pad*2,height,5/scale);c.fill();c.fillStyle=e.color;c.fillText(e.label,lx,ly)}c.restore();}}

</script><script>
'use strict';
// Ten original procedural arrangements: one score per ten-room chapter.
const SCORES=[
 {name:'Brote de luz',bpm:70,root:48,chords:[0,5,9,7],melody:[12,16,19,16,14,17,21,19,16,19,24,21,14,19,17,14]},
 {name:'Jard\xEDn de chispas',bpm:82,root:50,chords:[0,7,5,9],melody:[12,19,16,24,21,19,16,14,17,21,24,19,16,14,12,19]},
 {name:'Marea de ne\xF3n',bpm:94,root:45,chords:[0,8,3,7],melody:[12,15,19,22,19,15,17,19,24,22,19,17,15,19,14,12]},
 {name:'Catedral de cristal',bpm:104,root:47,chords:[0,5,8,7],melody:[24,19,15,12,14,17,20,24,22,19,17,15,14,19,23,26]},
 {name:'Engranajes del destino',bpm:114,root:48,chords:[0,3,8,7],melody:[12,19,12,22,15,24,19,15,20,15,24,20,19,14,23,26]},
 {name:'Forja de titanes',bpm:124,root:43,chords:[0,8,5,7],melody:[12,12,19,15,22,19,24,22,20,15,17,20,19,23,26,19]},
 {name:'Ciudad indomable',bpm:134,root:45,chords:[0,3,10,7],melody:[24,19,15,19,27,24,22,19,22,26,29,26,23,19,14,19]},
 {name:'Legi\xF3n de estrellas',bpm:144,root:46,chords:[0,8,3,7],melody:[12,19,24,27,31,27,24,19,20,24,27,32,26,23,19,14]},
 {name:'Trono de leyendas',bpm:154,root:47,chords:[0,5,8,7],melody:[24,27,31,36,31,27,24,19,29,32,36,32,31,26,23,19]},
 {name:'El \xFAltimo infinito',bpm:166,root:48,chords:[0,8,3,7],melody:[24,31,36,39,36,31,27,24,32,36,39,43,38,35,31,26]}
];
let musicBus=null,musicNoise=null,musicClock=0,musicIndex=0,musicChapter=-1;
const MUSIC_GAIN=3.5;
const midi=n=>440*2**((n-69)/12);
function musicNote(note,time,duration,type,volume){const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type=type;osc.frequency.setValueAtTime(midi(note),time);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.015);gain.gain.exponentialRampToValueAtTime(volume*.72,time+duration*.65);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);osc.connect(gain);gain.connect(musicBus);osc.start(time);osc.stop(time+duration+.02);}
function musicDrum(kind,time,volume){let gain=audioCtx.createGain();gain.connect(musicBus);gain.gain.setValueAtTime(volume,time);gain.gain.exponentialRampToValueAtTime(.0001,time+(kind==='hat'?.045:.17));if(kind==='kick'){let osc=audioCtx.createOscillator();osc.frequency.setValueAtTime(125,time);osc.frequency.exponentialRampToValueAtTime(42,time+.12);osc.connect(gain);osc.start(time);osc.stop(time+.2)}else{let source=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter();source.buffer=musicNoise;filter.type='highpass';filter.frequency.value=kind==='hat'?6500:1500;source.connect(filter);filter.connect(gain);source.start(time);source.stop(time+.18)}}
function scoreStep(chapter,step,time){const score=SCORES[chapter],beat=60/score.bpm,bar=Math.floor(step/16),local=step%16,chord=score.chords[bar%4],root=score.root+chord,minor=chapter>=2;
 if(local===0){for(let offset of [0,minor?(chord===0||chord===5?3:4):(chord===9?3:4),7])musicNote(root+offset,time,beat*3.5,'sine',.008+chapter*.0006)}
 const spacing=chapter<2?4:chapter<5?2:1;
 if(local%spacing===0){let note=score.root+score.melody[(local+Math.floor(bar/4)*4)%16];musicNote(note,time,beat*(chapter<2?.9:.36),chapter<4?'sine':chapter<7?'triangle':'sawtooth',chapter<7?.018:.009);if(chapter>=8&&local%4===0)musicNote(note-12,time,beat*.7,'triangle',.018)}
 if(local%(chapter<3?8:4)===0)musicNote(root-12,time,beat*.7,'triangle',.025);
 if(chapter>=2&&local%4===0)musicDrum('kick',time,.04);
 if(chapter>=4&&local%8===4)musicDrum('snare',time,.018);
 if(chapter>=3&&local%(chapter>=7?1:2)===0)musicDrum('hat',time,local%2?.006:.011);
 if(chapter>=6&&local===14)musicDrum('kick',time,.026);
 if(chapter>=8&&bar%4===3&&local>=12){musicDrum('snare',time,.012+(local-12)*.003);musicNote(root-12,time,beat*.2,'triangle',.018)}
}
function pumpMusic(){if(!audioCtx)return;const chapter=screen==='practice'?5:screen==='game'&&g?Math.floor(g.i/10):0,active=prefs.music&&document.visibilityState==='visible'&&!(screen==='game'&&g?.state==='pause')&&!(screen==='practice'&&practice?.state==='pause');
 if(!musicBus){musicBus=audioCtx.createGain();const limiter=audioCtx.createDynamicsCompressor();limiter.threshold.value=-10;limiter.ratio.value=4;musicBus.connect(limiter);limiter.connect(audioCtx.destination);musicNoise=audioCtx.createBuffer(1,audioCtx.sampleRate*.2,audioCtx.sampleRate);const data=musicNoise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;musicBus.gain.value=0;}
 const now=audioCtx.currentTime;musicBus.gain.setTargetAtTime(active?MUSIC_GAIN:0,now,.06);
 if(!active){musicClock=now;musicChapter=-1;return;}
 if(chapter!==musicChapter){musicChapter=chapter;musicIndex=0;musicClock=now+.08;$('#music').title=SCORES[chapter].name+' \xB7 '+SCORES[chapter].bpm+' BPM';}
 if(musicClock<now-.1)musicClock=now;
 while(musicClock<now+.1){scoreStep(chapter,musicIndex++,musicClock);musicClock+=60/SCORES[chapter].bpm/4;}
}


</script><script>
'use strict';
function setGameLayout(active){document.body?.classList.toggle('playing',active);if(active)window.scrollTo?.(0,0);}
function fullscreenElement(){return document.fullscreenElement||document.webkitFullscreenElement;}
function fullscreenLabel(){const button=document.querySelector('#fullscreen');if(button){button.textContent=fullscreenElement()?'\u26F6 Salir':'\u26F6 Pantalla completa';button.title=fullscreenElement()?'Salir de pantalla completa (Esc)':'Ampliar el juego a pantalla completa';button.setAttribute?.('aria-pressed',fullscreenElement()?'true':'false')}}
async function enterFullscreen(){if(fullscreenElement())return true;const root=document.documentElement,request=root.requestFullscreen||root.webkitRequestFullscreen;if(!request){const button=document.querySelector('#fullscreen');if(button)button.title='El juego se ajusta a la ventana. Este navegador no admite pantalla completa.';return false;}try{await request.call(root);fullscreenLabel();return true}catch{const button=document.querySelector('#fullscreen');if(button)button.title='El navegador no permiti\xF3 pantalla completa. Pulsa aqu\xED para volver a intentarlo.';return false}}
async function toggleFullscreen(){if(fullscreenElement()){try{const exit=document.exitFullscreen||document.webkitExitFullscreen;await exit?.call(document);fullscreenLabel()}catch{}}else await enterFullscreen();}
document.addEventListener('fullscreenchange',fullscreenLabel);document.addEventListener('webkitfullscreenchange',fullscreenLabel);

</script><script>
'use strict';
let practice=null;
const PRACTICE_POWERS=[
 ['magnet','Im\xE1n','Atrae comida en un radio amplio durante 9 s.','#ff9fdc','magnet',9],
 ['triple','Estrella \xD73','Cada bola aporta el triple de masa durante 12 s.','#ffe48a','practiceStar',12],
 ['phase','Fantasma','Atraviesa rivales, cajas, paredes y puertas sin da\xF1o durante 6 s.','#b69aff','portal',6]
];
objectShapes.practiceStar=[P([[32,3],[40,23],[62,24],[45,38],[51,60],[32,48],[13,60],[19,38],[2,24],[24,23]],'#ffe48a')];
const P_NAMES=['\xC1spid','Nova','Mamba','Cometa','Pixel','Cobra','Lima','Aurora','V\xEDbora','Turbo','\xD3nix','N\xE9bula','Kiwi','Centella','N\xE1car','Draco','Ninja','Coral','Plasma','Bamb\xFA','Zafiro','Rayo','\xC1mbar','\xD3rbita','Loto','Bruma','V\xF3rtice','Karma','Cosmos','Prisma','Flash','Oliva','F\xE9nix','Eco','Titanio','Sombra','Cereza','\xD3palo','Chispa','Duna','Menta','Siroco','Dardo','Lince'];
class ArenaGrid{constructor(size){this.size=size;this.cells=new Map()}clear(){this.cells.clear()}add(x,y,item){const key=Math.floor(x/this.size)+','+Math.floor(y/this.size);if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(item)}near(x,y,r){const found=[];for(let ix=Math.floor((x-r)/this.size);ix<=Math.floor((x+r)/this.size);ix++)for(let iy=Math.floor((y-r)/this.size);iy<=Math.floor((y+r)/this.size);iy++){const cell=this.cells.get(ix+','+iy);if(cell)found.push(...cell)}return found}}
const pDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),pClamp=(v,a,b)=>Math.max(a,Math.min(b,v)),pAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
function pRectDistance(x,y,r){return Math.hypot(x-pClamp(x,r.x,r.x+r.w),y-pClamp(y,r.y,r.y+r.h))}
function pNotice(text){if(!practice)return;practice.notice=text;practice.noticeTime=4;const el=$('#practice-notice');if(el){el.textContent=text;el.hidden=!text}}
function stopPractice(){practice=null;document.body?.classList.remove?.('practice-mode')}
function multiplayerMenu(){stopPractice();g=null;screen='multiplayer';setGameLayout(false);$('#flash').className='';app.innerHTML=head('Multijugador','ELIGE TU ARENA')+\`<div class="mode-grid"><button class="mode-card" onclick="startPractice()"><span class="mode-tag">DISPONIBLE \xB7 CONTRA BOTS</span><strong>Juego de pr\xE1ctica</strong><p>Un mundo abierto, 44 rivales, im\xE1n, estrella \xD73, fantasma y agujeros de gusano. Crece, domina los puzles y encuentra tu pr\xF3xima escapatoria.</p><span class="mode-action">ENTRAR EN LA ARENA \u2197</span></button><button class="mode-card" onclick="startOnline()"><span class="mode-tag">ONLINE \xB7 SALA COMPARTIDA</span><strong>Jugar con otros jugadores</strong><p>Una sala para todos los usuarios conectados. Compite con otros jugadores y 8 bots.</p><span class="mode-action">ENTRAR A LA SALA \u2197</span></button></div>\`}
function pStaticBlocked(world,x,y,r=12,ignore=null){if(x<r+12||y<r+12||x>world.w-r-12||y>world.h-r-12)return true;return world.walls.some(v=>pRectDistance(x,y,v)<r)||world.rooms.some(v=>v!==ignore&&v.until<=world.time&&pRectDistance(x,y,v.gate)<r)}
function pSafeSpot(world,near=null){for(let i=0;i<200;i++){const x=near?pClamp(near.x+(Math.random()-.5)*900,100,world.w-100):100+Math.random()*(world.w-200),y=near?pClamp(near.y+(Math.random()-.5)*900,100,world.h-100):100+Math.random()*(world.h-200);if(!pStaticBlocked(world,x,y,60)&&!world.blocks.some(b=>pRectDistance(x,y,b)<60)&&!world.snakes.some(s=>s.alive&&Math.hypot(s.x-x,s.y-y)<150))return{x,y}}return{x:world.w/2,y:world.h/2}}
function pCreateSnake(world,id,near=null){let p=id===0?{x:world.w/2,y:world.h/2}:pSafeSpot(world,near),angle=Math.random()*Math.PI*2,mass=id===0?55:60+Math.random()*320;return{id,x:p.x,y:p.y,angle,targetAngle:angle,mass,peak:mass,kills:0,name:id===0?'T\xDA':P_NAMES[(id-1)%P_NAMES.length],color:id===0?prefs.color:palette[1+(id%7)],points:Array.from({length:Math.ceil(24+Math.sqrt(mass)*4)},(_,i)=>({x:p.x-Math.cos(angle)*i*8,y:p.y-Math.sin(angle)*i*8})),alive:true,buffs:{},grace:3,portalCD:0,think:0,aiClock:Math.random()*.1,target:null,boost:false,drop:0,lastPad:'',aiType:id%4,respawn:0};}
function createPracticeWorld(){const world={w:6200,h:4600,time:0,state:'ready',snakes:[],food:[],walls:[],rooms:[],blocks:[],lasers:[],portals:[],pads:[],sparks:[],notice:'',noticeTime:0,input:{angle:0,boost:false,mode:'keyboard'},camera:{x:3100,y:2300},foodGrid:new ArenaGrid(160),bodyGrid:new ArenaGrid(70),foodClock:0,hudClock:0,spawnClock:0,acc:0,fullscreenAsked:false,foodId:0};
 const codes=[[2,3,1],[3,1,2],[1,3,2],[2,1,3],[3,2,1]].sort(()=>Math.random()-.5);
 const centers=[[1000,950],[3000,900],[5100,1000],[1050,3550],[3100,3600],[5150,3500]];
 centers.forEach(([cx,cy],i)=>{let x=cx-340,y=cy-240,w=680,h=480,gap=160;world.walls.push({x,y,w:(w-gap)/2,h:24},{x:x+(w+gap)/2,y,w:(w-gap)/2,h:24},{x,y:y+h-24,w,h:24},{x,y,w:24,h},{x:x+w-24,y,w:24,h});const room={id:i,name:['Jard\xEDn de ne\xF3n','B\xF3veda del c\xF3digo','Refugio de carga','C\xE1mara gemela','N\xFAcleo secuencial','Fortaleza m\xF3vil'][i],x,y,w,h,type:i%3,gate:{x:cx-80,y,w:160,h:24},until:0,seq:0,code:codes[i%codes.length],nodes:[],release:{x:cx,y:y+65},flash:0};if(room.type!==2){const count=room.type===1?3:2;room.nodes=Array.from({length:count},(_,n)=>({x:cx-140+n*140,y:y-95,done:false}));}else{const block={x:cx-160,y:y-100,w:72,h:44,room:i};world.blocks.push(block);room.plate={x:cx-45,y:y-100,w:82,h:54};}
 world.rooms.push(room);for(let k=0;k<75;k++)world.food.push({id:world.foodId++,x:x+65+Math.random()*(w-130),y:y+90+Math.random()*(h-155),value:3,dead:false});});
 for(let i=0;i<18;i++){let x=500+(i%6)*1000,y=1800+Math.floor(i/6)*380;world.blocks.push({x,y,w:90+(i%2)*30,h:38,room:-1});}
 const ends=[[3400,2300],[5700,4000],[2800,2150],[700,3900],[3000,350],[3200,4200]];world.portals=ends.map(([x,y],i)=>({x,y,pair:i^1,label:'P'+(Math.floor(i/2)+1),color:['#ad9aff','#ad9aff','#79e7ff','#79e7ff','#ff9adf','#ff9adf'][i]}));
 world.snakes.push(pCreateSnake(world,0));for(let i=1;i<=44;i++)world.snakes.push(pCreateSnake(world,i,i<10?world.snakes[0]:null));
 for(let i=0;i<3300;i++)pSpawnFood(world);for(let i=0;i<72;i++)pSpawnFood(world,i%PRACTICE_POWERS.length);pRebuildFood(world);pRebuildBodies(world);return world;}
function pSpawnFood(world,power=null){let x,y;for(let n=0;n<100;n++){x=35+Math.random()*(world.w-70);y=35+Math.random()*(world.h-70);if(!pStaticBlocked(world,x,y,18)&&!world.blocks.some(b=>pRectDistance(x,y,b)<18))break;}world.food.push({id:world.foodId++,x,y,value:power===null?(Math.random()<.12?4:1):0,power,dead:false})}
function pRebuildFood(w){w.food=w.food.filter(f=>!f.dead);if(w.food.length>8000)w.food=w.food.slice(-8000);w.foodGrid.clear();for(let f of w.food)w.foodGrid.add(f.x,f.y,f)}
function pRebuildBodies(w){w.bodyGrid.clear();for(let s of w.snakes)if(s.alive)for(let i=0;i<s.points.length;i+=2)w.bodyGrid.add(s.points[i].x,s.points[i].y,{x:s.points[i].x,y:s.points[i].y,owner:s,index:i})}
function pRadius(s){return 9+Math.min(8,Math.sqrt(s.mass)*.16)}
function pBurst(w,x,y,color,count=22){for(let i=0;i<count;i++)w.sparks.push({x,y,vx:(Math.random()-.5)*220,vy:(Math.random()-.5)*220,life:1,color});if(w.sparks.length>500)w.sparks.splice(0,w.sparks.length-500)}
function pApplyPower(w,s,index){const power=PRACTICE_POWERS[index],[key,name,,color,,duration]=power;if(duration)s.buffs[key]=duration;
 s.peak=Math.max(s.peak,s.mass);pBurst(w,s.x,s.y,color,20);if(s.id===0){sound('portal');pNotice(name+' \xB7 '+power[2]);}}
function pKill(w,s,reason,killer=null){if(!s.alive)return;s.alive=false;s.respawn=2+Math.random()*2;for(let i=0;i<s.points.length;i+=2){let p=s.points[i];w.food.push({id:w.foodId++,x:p.x+(Math.random()-.5)*16,y:p.y+(Math.random()-.5)*16,value:Math.max(2,Math.min(8,s.mass/s.points.length*1.5)),power:null,dead:false});}if(killer&&killer!==s)killer.kills++;pBurst(w,s.x,s.y,s.color,40);
 if(s.id===0){w.state='dead';w.input.boost=false;prefs.practiceBest=Math.max(prefs.practiceBest||0,Math.floor(s.peak));save();sound('boom');$('#practice-overlay').hidden=false;$('#practice-overlay').innerHTML=\`<div class="modal"><div class="badge">\u2733</div><h2>Una vuelta m\xE1s.</h2><p>\${reason}<br>M\xE1xima masa: \${Math.floor(s.peak)} \xB7 Eliminaciones: \${s.kills}<br>Tiempo: \${Math.floor(w.time)} s \xB7 R\xE9cord: \${prefs.practiceBest}</p><button class="primary" onclick="startPractice();enterPractice()">VOLVER A LA ARENA</button><button onclick="multiplayerMenu()">Modos</button></div>\`;}}
function pHit(w,s,reason,killer=null){if(s.grace>0||s.buffs.phase>0)return;pKill(w,s,reason,killer)}
function pLaserOn(w,l){return l.disabled<=w.time&&((w.time+l.phase)%4.4)<2.2}
function pLaserProtected(w,x,y,laser){return w.blocks.some(b=>Math.abs((b.y+b.h/2)-(laser.y+laser.h/2))<b.h/2+24&&b.x<x&&b.x>laser.x&&pRectDistance(x,y,{x:b.x,y:laser.y-12,w:laser.x+laser.w-b.x,h:36})<15)}
function pPushBlock(w,s,b,dt){let nx=b.x+Math.cos(s.angle)*110*dt,ny=b.y+Math.sin(s.angle)*110*dt;const valid=nx>20&&ny>20&&nx+b.w<w.w-20&&ny+b.h<w.h-20&&!w.walls.some(r=>nx<r.x+r.w&&nx+b.w>r.x&&ny<r.y+r.h&&ny+b.h>r.y)&&!w.rooms.some(r=>r.until<=w.time&&nx<r.gate.x+r.gate.w&&nx+b.w>r.gate.x&&ny<r.gate.y+r.gate.h&&ny+b.h>r.gate.y)&&!w.blocks.some(r=>r!==b&&nx<r.x+r.w&&nx+b.w>r.x&&ny<r.y+r.h&&ny+b.h>r.y);if(valid){b.x=nx;b.y=ny;}return valid;}
function pPuzzle(w,s){for(let room of w.rooms){room.flash=Math.max(0,room.flash-1/60);if(pDistance(s,room.release)<32)room.until=Math.max(room.until,w.time+8);
 if(room.type===2){let block=w.blocks.find(b=>b.room===room.id);if(block&&pRectDistance(block.x+block.w/2,block.y+block.h/2,room.plate)<8)room.until=Math.max(room.until,w.time+12);}
 else room.nodes.forEach((node,i)=>{if(pDistance(s,node)>28||node.done||room.until>w.time)return;if(room.type===1&&i+1!==room.code[room.seq]){if(s.id===0)pNotice('C\xF3digo: toca los nodos '+room.code.join(' \u2192 ')+'.');return;}node.done=true;room.seq++;pBurst(w,node.x,node.y,'#b9f57a',12);if(!s.id)sound('switch');if(room.nodes.every(n=>n.done)){room.until=w.time+24;room.flash=1;if(!s.id){sound('door');pNotice(room.name+': puerta abierta durante 24 s.');}}});}}
function pUpdateRooms(w){for(let room of w.rooms){if(room.until>0&&room.until<=w.time){const occupied=w.snakes.some(s=>s.alive&&s.points.some((p,i)=>i%3===0&&pRectDistance(p.x,p.y,room.gate)<pRadius(s)+8));if(occupied){room.until=w.time+.6;continue;}room.until=0;room.seq=0;room.nodes.forEach(n=>n.done=false);}}}
function pAI(w,s,dt){s.think-=dt;if(s.think<=0){s.think=.35+Math.random()*.4;let candidates=w.foodGrid.near(s.x,s.y,700).filter(f=>!f.dead&&!(f.kind==='dropping'&&f.owner===s.id));let target=null,best=Infinity;for(let f of candidates){let score=pDistance(s,f)/(f.power!==null&&f.power!==undefined?2.5:Math.sqrt(f.value));if(score<best){best=score;target=f}}s.target=target||{x:100+Math.random()*(w.w-200),y:100+Math.random()*(w.h-200)};
 if(s.aiType===0){const enemy=w.snakes.filter(e=>e!==s&&e.alive&&pDistance(s,e)<400&&e.mass<s.mass*.8).sort((a,b)=>pDistance(s,a)-pDistance(s,b))[0];if(enemy)s.target={x:enemy.x+Math.cos(enemy.angle)*120,y:enemy.y+Math.sin(enemy.angle)*120};}
 if(s.aiType===1){const room=w.rooms.find(r=>r.until<=w.time&&pDistance(s,{x:r.gate.x,y:r.gate.y})<650&&r.type!==2);if(room)s.target=(room.type===1?room.nodes[room.code[room.seq]-1]:room.nodes.find(n=>!n.done))||s.target;}}
 let desired=Math.atan2(s.target.y-s.y,s.target.x-s.x),best=-Infinity,angle=s.angle;
 for(let offset of [0,-.3,.3,-.7,.7,-1.1,1.1]){let a=s.angle+offset,score=Math.cos(pAngle(desired-a))*2;for(let distance of [45,90,150]){let x=s.x+Math.cos(a)*distance,y=s.y+Math.sin(a)*distance;if(pStaticBlocked(w,x,y,22))score-=12;if(w.blocks.some(b=>pRectDistance(x,y,b)<25))score-=5;if(w.lasers.some(l=>pLaserOn(w,l)&&pRectDistance(x,y,l)<20))score-=8;for(let body of w.bodyGrid.near(x,y,38)){if(body.owner!==s&&body.owner.alive&&Math.hypot(body.x-x,body.y-y)<pRadius(body.owner)+20){score-=9;break}}}if(score>best){best=score;angle=a;}}
 s.targetAngle=angle;s.boost=best>1.5&&s.aiType===0&&s.mass>100&&pDistance(s,s.target)>180;}
function pMove(w,s,dt){if(!s.alive)return;for(let k of Object.keys(s.buffs))s.buffs[k]=Math.max(0,s.buffs[k]-dt);s.grace=Math.max(0,s.grace-dt);s.portalCD=Math.max(0,s.portalCD-dt);if(s.id){s.aiClock-=dt;if(s.aiClock<=0){pAI(w,s,.1);s.aiClock=.1;}}else{s.targetAngle=w.input.angle;s.boost=w.input.boost;}
 let turn=pClamp(pAngle(s.targetAngle-s.angle),-3.2*dt,3.2*dt);s.angle+=turn;
 const boosted=s.boost&&s.mass>32;const speed=145*(boosted?1.8:1);
 if(boosted){s.mass=Math.max(32,s.mass-dt*9);s.drop+=dt;while(s.drop>=.07){s.drop-=.07;const tail=s.points[s.points.length-1];w.food.push({id:w.foodId++,x:tail.x,y:tail.y,value:.5,power:null,kind:'dropping',owner:s.id,dead:false})}}
 let nx=s.x+Math.cos(s.angle)*speed*dt,ny=s.y+Math.sin(s.angle)*speed*dt,r=pRadius(s);
 const block=w.blocks.find(b=>pRectDistance(nx,ny,b)<r);if(block&&!(s.buffs.phase>0)){pPushBlock(w,s,block,dt);if(pRectDistance(nx,ny,block)<r){nx=s.x;ny=s.y;}}
 // Los l\xEDmites del mapa son s\xF3lidos y nunca causan da\xF1o.
 nx=pClamp(nx,r+12,w.w-r-12);ny=pClamp(ny,r+12,w.h-r-12);
 if(!(s.buffs.phase>0)&&pStaticBlocked(w,nx,ny,r)){nx=s.x;ny=s.y;}
 s.x=nx;s.y=ny;s.points[0]={x:nx,y:ny};const length=Math.min(210,Math.ceil(24+Math.sqrt(s.mass)*4));while(s.points.length<length)s.points.push({...s.points[s.points.length-1]});s.points.length=length;for(let i=1;i<s.points.length;i++){let a=s.points[i-1],b=s.points[i],distance=Math.hypot(a.x-b.x,a.y-b.y);if(distance>8){const f=(distance-8)/distance;b.x+=(a.x-b.x)*f;b.y+=(a.y-b.y)*f;}}
 if(s.portalCD<=0)for(let portal of w.portals)if(pDistance(s,portal)<44){const target=w.portals[portal.pair],x=target.x+Math.cos(s.angle)*65,y=target.y+Math.sin(s.angle)*65,dx=x-s.x,dy=y-s.y;s.x=x;s.y=y;for(let p of s.points){p.x+=dx;p.y+=dy;}s.portalCD=2;s.grace=Math.max(s.grace,1.5);pBurst(w,x,y,portal.color);if(!s.id){sound('portal');pNotice('Agujero de gusano: has cruzado al otro extremo del mapa.')}break;}
 pPuzzle(w,s);
 const radius=s.buffs.magnet>0?170:r+8;for(let food of w.foodGrid.near(s.x,s.y,radius)){if(food.dead||(food.kind==='dropping'&&food.owner===s.id))continue;const distance=pDistance(s,food);if(distance>radius)continue;if(distance>r+12&&s.buffs.magnet>0){const f=Math.min(1,dt*7);food.x+=(s.x-food.x)*f;food.y+=(s.y-food.y)*f;continue;}if(distance>r+12)continue;food.dead=true;if(food.power!==null&&food.power!==undefined)pApplyPower(w,s,food.power);else{s.mass+=food.value*(s.buffs.triple>0?3:1);s.peak=Math.max(s.peak,s.mass);if(!s.id){if(w.time>=(w.eatSound||0)){sound('eat');w.eatSound=w.time+.08}}}}
}
function pCollisions(w){const hits=[];for(let s of w.snakes){if(!s.alive||s.grace>0)continue;const r=pRadius(s);if(!(s.buffs.phase>0)){let laser=w.lasers.find(l=>pLaserOn(w,l)&&pRectDistance(s.x,s.y,l)<r&&!pLaserProtected(w,s.x,s.y,l));if(laser){hits.push([s,'Un l\xE1ser te ha alcanzado.',null]);continue;}for(let body of w.bodyGrid.near(s.x,s.y,r+22)){if(body.owner===s||!body.owner.alive||body.owner.grace>0||body.owner.buffs.phase>0)continue;if(Math.hypot(body.x-s.x,body.y-s.y)<r+pRadius(body.owner)*.8){hits.push([s,'Tu cabeza ha tocado otra serpiente.',body.owner]);break;}}}}for(let [s,reason,killer]of hits)pHit(w,s,reason,killer);}
function practiceStep(w,dt){if(w.state!=='play')return;w.time+=dt;w.noticeTime=Math.max(0,w.noticeTime-dt);pUpdateRooms(w);for(let s of w.snakes){if(!s.alive&&s.id){s.respawn-=dt;if(s.respawn<=0)Object.assign(s,pCreateSnake(w,s.id));}pMove(w,s,dt);}pRebuildBodies(w);pCollisions(w);w.foodClock-=dt;if(w.foodClock<=0){pRebuildFood(w);w.foodClock=.2;}w.spawnClock-=dt;if(w.spawnClock<=0){w.spawnClock=.6;let normal=w.food.filter(f=>!f.dead&&(f.power===null||f.power===undefined)).length,powers=w.food.filter(f=>!f.dead&&f.power!==null&&f.power!==undefined).length;for(let i=0;i<Math.min(80,3300-normal);i++)pSpawnFood(w);for(let i=0;i<Math.min(12,72-powers);i++)pSpawnFood(w,Math.floor(Math.random()*PRACTICE_POWERS.length));}
 for(let p of w.sparks){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}w.sparks=w.sparks.filter(p=>p.life>0);const player=w.snakes[0];w.camera.x+=(player.x-w.camera.x)*Math.min(1,dt*8);w.camera.y+=(player.y-w.camera.y)*Math.min(1,dt*8);w.hudClock-=dt;if(w.hudClock<=0){w.hudClock=.2;practiceHUD();}}
function practiceHelp(){return \`<div class="modal level-guide"><div class="guide-head"><div class="eyebrow">PR\xC1CTICA \xB7 44 BOTS \xB7 MUNDO ABIERTO</div><h2>Crece. Enga\xF1a. Escapa.</h2><p>Come para crecer. Si tu cabeza toca otra serpiente, pierdes. Haz que los rivales choquen con tu cuerpo y recoge su comida. Aqu\xED no hay contador de vida.</p></div><div class="guide-flow"><div class="guide-step"><b>01 \xB7 Domina el movimiento</b><span>Rat\xF3n, flechas o WASD. En m\xF3vil, arrastra el dedo hacia donde quieras ir.</span></div><div class="guide-step"><b>02 \xB7 Usa el impulso</b><span>Mant\xE9n clic, Espacio o Shift. Aceleras y gastas masa. Dejas bolas marrones que otros pueden comer: valen 0,5 puntos, la mitad de una bola normal. Con poca masa el esprint deja de funcionar.</span></div><div class="guide-step"><b>03 \xB7 Explora los refugios</b><span>Abre puertas con nodos o empujando bloques hasta su placa. Los botones interiores permiten salir.</span></div></div><div class="guide-content"><div class="guide-grid"><article><div><h4>Puertas y c\xF3digos</h4><p>Dos nodos libres, un c\xF3digo distinto en cada sala o un bloque sobre placa. Sigue el orden indicado sobre cada puerta. Las paredes, las puertas y los bordes del mapa te frenan sin quitar masa ni matarte.</p></div></article><article><div><h4>Cobertura y viajes</h4><p>Empuja las barreras con la cabeza sin penalizaci\xF3n. \xDAsalas para bloquear a rivales. Los agujeros de gusano del mismo color y n\xFAmero est\xE1n conectados. Entra en su centro para teletransportarte. Hay dos cerca de la zona inicial y todos aparecen en el minimapa.</p></div></article></div><h3>Im\xE1n, estrella \xD73 y fantasma \xB7 Activaci\xF3n al recogerlos</h3><div class="guide-grid">\${PRACTICE_POWERS.map(p=>\`<article><span class="guide-icon">\${objectSVG(p[4],p[3])}</span><div><h4>\${p[1]}</h4><p>\${p[2]}</p></div></article>\`).join('')}</div></div><div class="guide-actions"><span>Es una pr\xE1ctica local: todos los rivales son bots.</span><div><button onclick="multiplayerMenu()">Modos</button><button class="primary" onclick="enterPractice()">ENTRAR EN LA ARENA \u2192</button></div></div></div>\`}
function startPractice(){g=null;screen='practice';$('#flash').className='';setGameLayout(true);document.body?.classList.add('practice-mode');practice=createPracticeWorld();app.innerHTML=\`<div class="game-top"><div class="stat">PR\xC1CTICA \xB7 CONTRA BOTS<b>La gran arena</b></div><div class="stat">MASA<b id="practice-mass">55</b></div><div class="stat">POSICI\xD3N<b id="practice-rank">\u2014 / 45</b></div><div class="stat">BAJAS<b id="practice-kills">0</b></div><button onclick="pausePractice(true)">? Gu\xEDa</button><button onclick="pausePractice()">\u2161</button></div><div class="arena"><div id="practice-powers" class="inventory"></div><div class="map-view"><canvas id="practice-board" width="1152" height="640" tabindex="0" aria-label="Arena de pr\xE1ctica"></canvas><div class="practice-ranking" id="practice-ranking"></div><canvas id="practice-mini" width="180" height="134" aria-label="Minimapa"></canvas><div id="practice-overlay" class="overlay guide-overlay">\${practiceHelp()}</div></div></div><div class="objective"><span id="practice-notice">Come para crecer \xB7 Protege tu cabeza \xB7 Usa los refugios</span><span>RAT\xD3N / WASD \xB7 ESPACIO IMPULSO \xB7 P PAUSA</span></div><div class="touch practice-touch"><button id="practice-boost">\u26A1 Impulso</button><button onclick="multiplayerMenu()">Salir</button></div>\`;
 const board=$('#practice-board');board.addEventListener('pointermove',practicePointer);board.addEventListener('pointerdown',e=>{board.setPointerCapture?.(e.pointerId);practicePointer(e);if(e.pointerType!=='touch')practice.input.boost=true;});board.addEventListener('pointerup',()=>practice&&(practice.input.boost=false));board.addEventListener('pointercancel',()=>practice&&(practice.input.boost=false));const boost=$('#practice-boost');boost.addEventListener('pointerdown',e=>{e.preventDefault();boost.setPointerCapture?.(e.pointerId);if(practice)practice.input.boost=true});for(let type of ['pointerup','pointercancel','lostpointercapture'])boost.addEventListener(type,()=>practice&&(practice.input.boost=false));practiceHUD();}
function enterPractice(){if(!practice)return;audio();if(!practice.fullscreenAsked){practice.fullscreenAsked=true;void enterFullscreen();}practice.state='play';practice.input.boost=false;$('#practice-overlay').hidden=true;$('#practice-overlay').className='overlay';$('#practice-board').focus?.({preventScroll:true});}
function pausePractice(help=false){if(!practice||practice.state==='dead')return;if(practice.state==='pause'&&!help){enterPractice();return;}practice.state='pause';practice.input.boost=false;const overlay=$('#practice-overlay');overlay.hidden=false;overlay.className=help?'overlay guide-overlay':'overlay';overlay.innerHTML=help?practiceHelp():\`<div class="modal"><h2>Arena en pausa</h2><p>Todos los bots y mecanismos est\xE1n detenidos.</p><button class="primary" onclick="enterPractice()">CONTINUAR</button><button onclick="pausePractice(true)">Gu\xEDa</button><button onclick="multiplayerMenu()">Modos</button></div>\`;}
function practicePointer(e){if(!practice||practice.state!=='play')return;const box=$('#practice-board').getBoundingClientRect(),scale=Math.min(box.width/1152,box.height/640),px=(e.clientX-box.left-box.width/2)/scale,py=(e.clientY-box.top-box.height/2)/scale,player=practice.snakes[0];const dx=px-(player.x-practice.camera.x),dy=py-(player.y-practice.camera.y);if(Math.hypot(dx,dy)>10){practice.input.angle=Math.atan2(dy,dx);practice.input.mode='pointer';}}
document.addEventListener('keydown',e=>{if(screen!=='practice'||!practice)return;const key=e.key.toLowerCase(),dir={arrowup:-Math.PI/2,w:-Math.PI/2,arrowdown:Math.PI/2,s:Math.PI/2,arrowleft:Math.PI,a:Math.PI,arrowright:0,d:0};if(key in dir){e.preventDefault();practice.input.angle=dir[key];practice.input.mode='keyboard'}if(key===' '||key==='shift'){e.preventDefault();if(practice.state==='play')practice.input.boost=true}if((key==='p'||key==='escape')&&!e.repeat)pausePractice();if(key==='h'&&!e.repeat)pausePractice(true)});
document.addEventListener('keyup',e=>{if(practice&&(e.key===' '||e.key==='Shift'))practice.input.boost=false});document.addEventListener('visibilitychange',()=>{if(document.hidden&&practice?.state==='play')pausePractice()});window.addEventListener?.('blur',()=>{if(practice?.state==='play')pausePractice()});
function practiceHUD(){if(!practice||screen!=='practice')return;const w=practice,s=w.snakes[0],ranking=w.snakes.filter(s=>s.alive).sort((a,b)=>b.mass-a.mass);$('#practice-mass').textContent=Math.floor(s.mass);$('#practice-rank').textContent=(ranking.indexOf(s)+1||'\u2014')+' / '+ranking.length;$('#practice-kills').textContent=s.kills;$('#practice-ranking').innerHTML='<b>TOP 5 \xB7 BOTS</b>'+ranking.slice(0,5).map((s,i)=>\`<div><span style="color:\${s.color}">\${i+1}. \${s.name}</span><span>\${Math.floor(s.mass)}</span></div>\`).join('');const buffs=PRACTICE_POWERS.filter(p=>s.buffs[p[0]]>0);$('#practice-powers').innerHTML='<span class="inventory-title">HABILIDADES</span>'+(buffs.length?buffs.map(p=>\`<span class="inventory-chip"><span class="object-illustration">\${objectSVG(p[4],p[3])}</span><span>\${p[1]}<b>\${Math.ceil(s.buffs[p[0]])} s</b></span>\`).join(''):'<span class="inventory-empty">Busca alimentos especiales \xB7 R\xE9cord '+(prefs.practiceBest||0)+'</span>');if(w.noticeTime<=0)$('#practice-notice').textContent='44 bots \xB7 6 refugios con puzles \xB7 3 habilidades \xB7 3 pares de agujeros de gusano';}
function drawPractice(){if(!practice||screen!=='practice')return;const w=practice,canvas=$('#practice-board'),c=canvas.getContext('2d'),W=canvas.width,H=canvas.height,cx=w.camera.x,cy=w.camera.y,player=w.snakes[0];const visible=(x,y,pad=100)=>Math.abs(x-cx)<W/2+pad&&Math.abs(y-cy)<H/2+pad;c.clearRect(0,0,W,H);c.fillStyle='#101a18';c.fillRect(0,0,W,H);c.save();c.translate(W/2-cx,H/2-cy);
 const left=cx-W/2,top=cy-H/2;c.strokeStyle='#a1dcbd0b';c.lineWidth=1;for(let x=Math.floor(left/80)*80;x<left+W;x+=80){c.beginPath();c.moveTo(x,top);c.lineTo(x,top+H);c.stroke()}for(let y=Math.floor(top/80)*80;y<top+H;y+=80){c.beginPath();c.moveTo(left,y);c.lineTo(left+W,y);c.stroke()}
 c.strokeStyle='#718e71';c.lineWidth=12;c.strokeRect(6,6,w.w-12,w.h-12);
 for(let room of w.rooms){if(!visible(room.x+room.w/2,room.y+room.h/2,500))continue;c.fillStyle=['#163329','#25243c','#332b1c'][room.type];c.fillRect(room.x,room.y,room.w,room.h);c.font='bold 20px sans-serif';c.fillStyle='#c3d8bb66';c.textAlign='center';c.fillText(room.name,room.x+room.w/2,room.y+room.h-65);}
 for(let wall of w.walls){if(!visible(wall.x+wall.w/2,wall.y+wall.h/2,400))continue;c.fillStyle='#344a42';c.beginPath();c.roundRect(wall.x,wall.y,wall.w,wall.h,5);c.fill();c.strokeStyle='#718e7155';c.lineWidth=2;c.stroke();}
 for(let pad of w.pads){if(!visible(pad.x,pad.y))continue;circle(c,pad.x,pad.y,pad.r,pad.fast?'#2c947935':'#8066b035');c.strokeStyle=pad.fast?'#6ef3d4':'#b9a4ff';c.lineWidth=2;c.beginPath();c.arc(pad.x,pad.y,pad.r,0,Math.PI*2);c.stroke();c.fillStyle=c.strokeStyle;c.font='bold 24px sans-serif';c.textAlign='center';c.fillText(pad.fast?'\u226B':'\u2248',pad.x,pad.y+8);}
 for(let l of w.lasers){if(!visible(l.x+l.w/2,l.y,350))continue;const active=pLaserOn(w,l);c.fillStyle=active?'#ff466f88':'#67424a';c.shadowColor='#ff466f';c.shadowBlur=active?12:0;c.fillRect(l.x,l.y,l.w,l.h);c.shadowBlur=0;for(let block of w.blocks)if(Math.abs(block.y+block.h/2-l.y)<block.h/2+24&&block.x>l.x&&block.x<l.x+l.w){c.fillStyle='#13251e';c.fillRect(block.x+block.w,l.y-2,Math.max(0,l.x+l.w-block.x-block.w),l.h+4)}}
 for(let room of w.rooms){if(!visible(room.gate.x,room.gate.y,500))continue;const open=room.until>w.time;c.fillStyle=open?'#88ef9b25':'#a57db9';c.fillRect(room.gate.x,room.gate.y,room.gate.w,room.gate.h);c.strokeStyle=open?'#9df4b0':'#e7c7ff';c.lineWidth=2;c.strokeRect(room.gate.x,room.gate.y,room.gate.w,room.gate.h);c.fillStyle=open?'#b6ffc2':'#f6ddff';c.textAlign='center';c.font='bold 13px sans-serif';c.fillText(open?'ABIERTA \xB7 '+Math.ceil(room.until-w.time)+' s':room.type===0?'ACTIVA LOS 2 NODOS':room.type===1?'C\xD3DIGO '+room.code.join(' \u2192 '):'EMPUJA HASTA LA PLACA',room.gate.x+80,room.gate.y-12);
 room.nodes.forEach((n,i)=>{circle(c,n.x,n.y,24,n.done?'#b6f560':'#9d80d0',6);c.fillStyle='#17261f';c.font='bold 20px sans-serif';c.fillText(n.done?'\u2713':room.type===1?i+1:'\u25CF',n.x,n.y+7)});circle(c,room.release.x,room.release.y,18,'#79dca1');c.fillStyle='#15382c';c.font='bold 18px sans-serif';c.fillText('\u2197',room.release.x,room.release.y+6);if(room.plate){c.strokeStyle='#ffc96b';c.setLineDash([8,5]);c.lineWidth=3;c.strokeRect(room.plate.x,room.plate.y,room.plate.w,room.plate.h);c.setLineDash([]);}}
 for(let b of w.blocks){if(!visible(b.x,b.y))continue;c.fillStyle='#9c7849';c.beginPath();c.roundRect(b.x,b.y,b.w,b.h,8);c.fill();c.strokeStyle='#e9c885';c.lineWidth=3;c.stroke();c.strokeStyle='#6f5234';c.lineWidth=2;for(let k=15;k<b.w;k+=20){c.beginPath();c.moveTo(b.x+k,b.y+6);c.lineTo(b.x+k,b.y+b.h-6);c.stroke()}c.fillStyle='#ffedbf';c.font='bold 18px sans-serif';c.textAlign='center';c.fillText('\u2194',b.x+b.w/2,b.y+b.h/2+6);}
 for(let portal of w.portals){if(!visible(portal.x,portal.y))continue;c.save();c.translate(portal.x,portal.y);c.rotate(w.time*.8);for(let i=0;i<3;i++){c.strokeStyle=portal.color;c.lineWidth=3;c.globalAlpha=1-i*.25;c.beginPath();c.ellipse(0,0,32+i*9,22+i*8,i*.8,0,Math.PI*1.7);c.stroke()}c.restore();circle(c,portal.x,portal.y,24,'#12151f');c.fillStyle=portal.color;c.textAlign='center';c.font='bold 13px sans-serif';c.fillText(portal.label+' \xB7 AGUJERO DE GUSANO',portal.x,portal.y-62);c.font='bold 24px sans-serif';c.fillText('\u25CE',portal.x,portal.y+8);}
 for(let food of w.foodGrid.near(cx,cy,Math.max(W,H)*.7)){if(food.dead||!visible(food.x,food.y,20))continue;if(food.power!==null&&food.power!==undefined){const p=PRACTICE_POWERS[food.power];circle(c,food.x,food.y,23,p[3]+'33',7);drawObject(c,p[4],food.x,food.y,35,p[3]);}else{const col=food.kind==='dropping'?'#a66b3e':palette[food.id%palette.length];circle(c,food.x,food.y,food.kind==='dropping'?5:food.value>2?4.7:3.2,col,food.kind==='dropping'?2:food.value>2?5:0);}}
 const snakes=w.snakes.filter(s=>s.alive).sort((a,b)=>a.mass-b.mass);for(let s of snakes){if(!s.points.some(p=>visible(p.x,p.y,35)))continue;const r=pRadius(s);c.save();c.globalAlpha=s.buffs.phase>0?.62:1;if(s.grace>0)c.globalAlpha*=.6+.2*Math.sin(w.time*12);
 if(s.id===0){snake(c,s.points.map(p=>[p.x,p.y]),r,s.angle);}else{c.lineCap='round';c.lineJoin='round';c.strokeStyle='#0005';c.lineWidth=r*2+4;c.beginPath();s.points.forEach((p,i)=>i?c.lineTo(p.x,p.y+3):c.moveTo(p.x,p.y+3));c.stroke();c.strokeStyle=s.color;c.lineWidth=r*2;c.beginPath();s.points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.strokeStyle='#ffffff26';c.lineWidth=r*.5;c.stroke();circle(c,s.x,s.y,r,s.color);for(let side of [-1,1]){const ex=s.x+Math.cos(s.angle+side*.65)*r*.65,ey=s.y+Math.sin(s.angle+side*.65)*r*.65;circle(c,ex,ey,r*.32,'#faffef');circle(c,ex+Math.cos(s.angle)*2,ey+Math.sin(s.angle)*2,r*.16,'#173027')}}
 if(s.buffs.shield>0||s.buffs.frost>0){c.strokeStyle=s.buffs.shield>0?'#ffe48a':'#a6e5ff';c.lineWidth=2;c.beginPath();c.arc(s.x,s.y,r+8,0,Math.PI*2);c.stroke();}c.globalAlpha=1;c.font=(s.id===0?'bold ':'')+'12px sans-serif';c.textAlign='center';c.fillStyle=s.id===0?'#e8ffcd':'#c4d1c5';c.fillText(s.name,s.x,s.y-r-12);c.restore();}
 for(let p of w.sparks){if(!visible(p.x,p.y,15))continue;c.globalAlpha=p.life;circle(c,p.x,p.y,3,p.color)}c.globalAlpha=1;c.restore();drawPracticeMinimap(w);}
function drawPracticeMinimap(w){const c=$('#practice-mini').getContext('2d'),W=180,H=134,sx=W/w.w,sy=H/w.h;c.clearRect(0,0,W,H);c.fillStyle='#0b1715df';c.fillRect(0,0,W,H);for(let room of w.rooms){c.strokeStyle=room.until>w.time?'#b6f560':'#886898';c.lineWidth=1;c.strokeRect(room.x*sx,room.y*sy,room.w*sx,room.h*sy)}for(let p of w.portals){circle(c,p.x*sx,p.y*sy,4,p.color);c.fillStyle=p.color;c.font='bold 9px sans-serif';c.textAlign='center';c.fillText(p.label,p.x*sx,p.y*sy-6);}const player=w.snakes[0];if(player.buffs.radar>0){for(let s of w.snakes)if(s.alive)circle(c,s.x*sx,s.y*sy,1.7,s.color);for(let f of w.food)if(f.power!==null&&f.power!==undefined&&!f.dead)circle(c,f.x*sx,f.y*sy,1,'#ffe498')}circle(c,player.x*sx,player.y*sy,3,'#efffbb');c.strokeStyle='#b6f56044';c.strokeRect((w.camera.x-576)*sx,(w.camera.y-320)*sy,1152*sx,640*sy)}
function updatePractice(dt){if(!practice||screen!=='practice')return;if(practice.state==='play'){practice.acc+=Math.min(dt,.06);let steps=0;while(practice.acc>=1/60&&steps++<4){practiceStep(practice,1/60);practice.acc-=1/60;if(practice.state!=='play')break;}}drawPractice();}

</script><script>
'use strict';
const $=s=>document.querySelector(s),app=$('#app'),palette=['#b6f560','#59b8ff','#fa6474','#939a9e','#262b30','#ffa653','#bd8aff','#f4f5e9'];
const defaults={color:palette[0],second:palette[1],style:'Degradado',head:'Nada',tail:'Nada',theme:0,music:false,sound:true,unlocked:1,records:{}};const progressKey='snakeomg-v1:'+window.PLAYER_ID,dirtyKey=progressKey+':pending';
let syncTimer=null,syncRunning=null,syncDirty=false,syncGeneration=0;
function mergeSavedProgress(a,b){const records={...(a.records||{})};for(const [k,v] of Object.entries(b.records||{})){const old=records[k];records[k]=old?{time:Math.min(old.time,v.time),food:Math.min(old.food,v.food)}:v}return {...a,...b,unlocked:Math.max(a.unlocked||1,b.unlocked||1),practiceBest:Math.max(a.practiceBest||0,b.practiceBest||0),records}}
let localSaved={};try{localSaved=JSON.parse(localStorage.getItem(progressKey)||'{}')}catch{}
const cloudSaved=window.PLAYER_PROGRESS;
let hasPending=false;try{hasPending=localStorage.getItem(dirtyKey)==='1'}catch{}
let saved=cloudSaved===null?localSaved:hasPending?mergeSavedProgress(cloudSaved,localSaved):cloudSaved;
let prefs={...defaults,...saved},screen='menu',g=null,ctx,cv,particles=[],frame=0,last=0,audioCtx;
function syncStatus(text){const el=document.getElementById('save-status');if(el){el.textContent=text;el.hidden=!text}}
function cacheProgress(){try{localStorage.setItem(progressKey,JSON.stringify(prefs));localStorage.setItem(dirtyKey,syncDirty?'1':'0')}catch{}}
function save(){syncDirty=true;syncGeneration++;cacheProgress();syncStatus('Guardando\u2026');clearTimeout(syncTimer);syncTimer=setTimeout(()=>flushProgress(),300)}
async function flushProgress(){
 clearTimeout(syncTimer);if(syncRunning){await syncRunning;if(syncDirty)return flushProgress();return true}if(!syncDirty)return true;
 const generation=syncGeneration,payload=JSON.stringify(prefs);
 syncRunning=(async()=>{try{const r=await fetch('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:payload,keepalive:true});const result=await r.json();if(!r.ok)throw Error(result.error||'No se pudo guardar.');
 // Preserve edits made while this save was in flight and never lose progress.
 const merged=mergeSavedProgress(result.progress,prefs);prefs.unlocked=merged.unlocked;prefs.practiceBest=merged.practiceBest;prefs.records=merged.records;
 if(syncGeneration===generation)syncDirty=false;cacheProgress();syncStatus(syncDirty?'Guardando\u2026':'');return true;
 }catch(e){syncStatus(e.message.includes('sesi\xF3n')?'Sesi\xF3n caducada \xB7 vuelve a entrar':'Sin sincronizar \xB7 reintentando');return false}finally{syncRunning=null}})();
 const ok=await syncRunning;if(ok&&syncDirty)return flushProgress();return ok;
}
window.flushGameProgress=flushProgress;
window.addEventListener('online',()=>flushProgress());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&syncDirty)flushProgress()});
window.addEventListener('pagehide',()=>{if(syncDirty)flushProgress()});
setInterval(()=>{if(syncDirty&&!syncRunning)flushProgress()},5000);

delete prefs.character;if(!HEAD_ITEMS.includes(prefs.head))prefs.head='Nada';if(!TAIL_ITEMS.includes(prefs.tail))prefs.tail='Nada';
function theme(){document.documentElement.style.setProperty('--accent',palette[prefs.theme]===palette[4]?'#b4bcb0':palette[prefs.theme]);$('#music').textContent='\u266B '+(prefs.music?'ON':'OFF');$('#sound').textContent='\u25D6 '+(prefs.sound?'ON':'OFF')}theme();
let damageNoise=null;
function damageSound(){
 if(!audioCtx||audioCtx.state==='suspended')return;
 const now=audioCtx.currentTime,osc=audioCtx.createOscillator(),impact=audioCtx.createGain();
 osc.type='sawtooth';osc.frequency.setValueAtTime(360,now);osc.frequency.exponentialRampToValueAtTime(110,now+.18);
 impact.gain.setValueAtTime(.0001,now);impact.gain.exponentialRampToValueAtTime(.14,now+.008);impact.gain.exponentialRampToValueAtTime(.0001,now+.23);
 const lowpass=audioCtx.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=1600;osc.connect(lowpass);lowpass.connect(impact);impact.connect(audioCtx.destination);osc.start(now);osc.stop(now+.24);
 if(!damageNoise){damageNoise=audioCtx.createBuffer(1,Math.ceil(audioCtx.sampleRate*.16),audioCtx.sampleRate);let samples=damageNoise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;}
 const noise=audioCtx.createBufferSource(),crunch=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();noise.buffer=damageNoise;filter.type='bandpass';filter.frequency.value=1100;
 crunch.gain.setValueAtTime(.0001,now);crunch.gain.exponentialRampToValueAtTime(.2,now+.006);crunch.gain.exponentialRampToValueAtTime(.0001,now+.14);noise.connect(filter);filter.connect(crunch);crunch.connect(audioCtx.destination);noise.start(now);noise.stop(now+.16);
}
function tone(freq=440,dur=.12,type='sine',vol=.035){if(!audioCtx)return;const o=audioCtx.createOscillator(),v=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,audioCtx.currentTime);v.gain.setValueAtTime(vol,audioCtx.currentTime);v.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(v);v.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur)}function sound(kind){if(!prefs.sound)return;if(kind==='damage'){damageSound();return;}const notes={eat:[620,930],switch:[330,500],door:[400,600,800],win:[440,554,659,880],lose:[180,110,55],boom:[70,35],damage:[160,95],critical:[140],push:[230],portal:[600,300]}[kind]||[400];notes.forEach((n,i)=>setTimeout(()=>tone(n,.15,kind==='boom'?'sawtooth':kind==='damage'?'triangle':'sine'),i*65))}function audio(){if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)()}if(audioCtx.state==='suspended')audioCtx.resume()}document.addEventListener('pointerdown',audio);document.addEventListener('keydown',audio);$('#music').onclick=()=>{audio();prefs.music=!prefs.music;save();theme();pumpMusic()};$('#sound').onclick=()=>{audio();prefs.sound=!prefs.sound;save();theme()};$('#brand').onclick=e=>{e.preventDefault();menu()};
const L=[
{name:'Primer aliento',kind:'INVERNADERO',w:22,h:14,time:30,food:10,bonus:7,tip:'Pasa por el interruptor y alcanza la salida.',sw:[[11,6]],walls:[]},
{name:'Circuito gemelo',kind:'CENTRAL EL\xC9CTRICA',w:24,h:15,time:27,food:9,bonus:7,tip:'Activa los dos interruptores a ambos lados del muro.',sw:[[8,3],[17,11]],walls:[[12,2,1,9]]},
{name:'Peso exacto',kind:'ALMAC\xC9N',w:24,h:16,time:25,food:8,bonus:7,tip:'Empuja el cubo dorado sobre la placa marcada. Al encajar queda bloqueado.',boxes:[[10,8]],plates:[[14,8]],walls:[[5,3,3,2],[17,11,3,2]]},
{name:'C\xF3digo de luz',kind:'SALA DE SECUENCIA',w:26,h:16,time:24,food:8,bonus:7,tip:'Activa los interruptores en orden: 1 \u2192 2 \u2192 3.',seq:true,sw:[[8,4],[18,11],[19,3]],walls:[[12,5,2,6]]},
{name:'Pulso rojo',kind:'REACTOR',w:26,h:17,time:23,food:7,bonus:6,tip:'El l\xE1ser alterna cada 2 segundos. Cruza cuando est\xE9 apagado.',sw:[[20,4],[20,13]],lasers:[[13,1,1,15]],walls:[[7,6,3,4]]},
{name:'Salto cu\xE1ntico',kind:'C\xC1MARA DE PORTALES',w:28,h:17,time:22,food:7,bonus:6,tip:'Los portales azules conectan las dos mitades. Recoge la llave.',key:[21,4],portals:[[8,12],[19,12]],walls:[[13,1,1,15]]},
{name:'Doble carga',kind:'FUNDICI\xD3N',w:28,h:18,time:21,food:6,bonus:6,tip:'Coloca ambos cubos en sus placas. R reinicia si te bloqueas.',boxes:[[9,5],[18,12]],plates:[[12,5],[21,12]],sw:[[23,4]],walls:[[13,8,4,2],[4,12,2,3]]},
{name:'\xD3rbita hostil',kind:'OBSERVATORIO',w:30,h:18,time:20,food:6,bonus:6,tip:'Esquiva los drones y activa los tres nodos.',sw:[[9,4],[16,13],[26,4]],drones:[[12,3,12,14],[23,14,23,3]],walls:[[6,8,5,2],[19,8,5,2]]},
{name:'El laberinto',kind:'ARCHIVO OLVIDADO',w:30,h:19,time:19,food:5,bonus:7,tip:'Busca la llave y activa 1 \u2192 2 \u2192 3 entre los pasillos.',seq:true,key:[26,15],sw:[[8,14],[17,4],[25,4]],walls:[[6,2,1,10],[12,7,1,10],[20,2,1,10]],portals:[[3,15],[16,14]]},
{name:'\xDAltimo segundo',kind:'N\xDACLEO OMG',w:32,h:20,time:18,food:5,bonus:7,tip:'Cubo, c\xF3digo y llave: completa todos los mecanismos para escapar.',seq:true,sw:[[12,4],[24,15]],key:[27,4],boxes:[[8,10]],plates:[[11,10]],lasers:[[17,2,1,15]],drones:[[22,6,28,6]],walls:[[5,4,3,2],[21,10,5,2]],portals:[[13,16],[24,4]]}
] ;
L.push(...buildExpedition());
for(const [i,data] of Object.entries(CAMPAIGN_DATA))Object.assign(L[i],data);
configureChallenges(L);
if(prefs.records[9]&&prefs.unlocked===10)prefs.unlocked=11;
function head(title,sub){return \`<div class="page-head"><div><div class="eyebrow">SNAKEOMG / \${sub}</div><h2>\${title}</h2></div><button onclick="menu()">\u2190 Men\xFA</button></div>\`}
function menu(){stopPractice();setGameLayout(false);screen='menu';g=null;$('#flash').className='';app.innerHTML=\`<section class="hero"><div><div class="eyebrow">SUPERVIVENCIA EN ESTADO PURO</div><h1>Snake<span>OMG</span><br>Cada segundo<br>cuenta.</h1><p class="intro">No basta con sobrevivir. Come, resuelve los mecanismos y encuentra la salida antes de desaparecer.</p><div class="menu"><button class="primary" onclick="levels()">INICIAR PARTIDA <span>\u2197</span></button><button onclick="multiplayerMenu()">MULTIJUGADOR <span>\u25CE</span></button><button onclick="customize()">PERSONALIZAR <span>\u25C7</span></button><button onclick="records(0)">CLASIFICACI\xD3N <span>\u2197</span></button></div></div><div class="hero-art"><span class="tag">ESP\xC9CIMEN 001 / LISTO PARA ESCAPAR</span><canvas id="show" width="620" height="620"></canvas><span class="tag bottom"><span>\u25CF SISTEMA ACTIVO</span><span>\u221E INSTINTO</span></span></div></section><div class="features"><div><b>01 /</b><h3>El tiempo es tu vida</h3><p>Cada bocado te da una oportunidad.<br>Cada segundo cambia las reglas.</p></div><div><b>100 /</b><h3>Habitaciones por descubrir</h3><p>Interruptores, portales y puzles.<br>Encuentra tu propia ruta de escape.</p></div><div><b>\u221E /</b><h3>Tu serpiente. Tu estilo.</h3><p>Colores, accesorios y combinaciones.<br>Deja tu marca en cada r\xE9cord.</p></div></div>\`}
function chapterTabs(selected,action){return \`<div class="tabs chapters">\${CHAPTERS.map((n,i)=>\`<button class="\${selected===i?'active':''}" onclick="\${action}(\${i})">\${i*10+1}\u2013\${(i+1)*10}<small>\${n}</small></button>\`).join('')}</div>\`}
function levels(chapter=Math.floor((Math.min(prefs.unlocked,L.length)-1)/10)){setGameLayout(false);clearContact();screen='levels';g=null;app.innerHTML=head('Elige tu pr\xF3xima salida','EXPEDICI\xD3N \xB7 100 NIVELES')+chapterTabs(chapter,'levels')+\`<h2>\${CHAPTERS[chapter]}</h2><p class="sub">\${Math.min(prefs.unlocked,L.length)} / 100 disponibles \xB7 Cada sala conserva sus propios r\xE9cords.</p><div class="level-grid">\${L.slice(chapter*10,chapter*10+10).map((l,j)=>{let i=chapter*10+j;return \`<button class="level" \${i>=prefs.unlocked?'disabled':''} onclick="start(\${i})"><strong>\${String(i+1).padStart(2,'0')} \${i>=prefs.unlocked?'\u2311':''}</strong><span>\${l.name}</span><small>\${l.missionName||l.kind} \${prefs.records[i]?' \xB7 \u2713':''}</small></button>\`}).join('')}</div>\`}
function customize(){setGameLayout(false);screen='custom';g=null;app.innerHTML=head('Hecha a tu manera','PERSONALIZACI\xD3N')+\`<div class="custom"><div class="preview"><canvas id="show" width="620" height="540"></canvas></div><div class="settings"><div><label>COLOR PRINCIPAL</label><div class="colors">\${palette.map(c=>\`<button aria-label="Color \${c}" class="swatch \${prefs.color===c?'active':''}" style="background:\${c}" onclick="prefs.color='\${c}';customize()"></button>\`).join('')}<input aria-label="Color libre" type="color" value="\${prefs.color}" oninput="prefs.color=this.value"></div></div><div class="row"><div><label>ESTILO DEL CUERPO</label><select onchange="prefs.style=this.value">\${['Color fijo','Degradado','Multicolor'].map(x=>\`<option \${prefs.style===x?'selected':''}>\${x}</option>\`).join('')}</select></div><div><label>COLOR SECUNDARIO</label><input aria-label="Color secundario" type="color" value="\${prefs.second}" oninput="prefs.second=this.value"></div></div><div class="row">\${['head','tail'].map((p,i)=>\`<div><label>ACCESORIO \xB7 \${i?'COLA':'CABEZA'}</label><select onchange="prefs.\${p}=this.value">\${(p==='head'?HEAD_ITEMS:TAIL_ITEMS).map(x=>\`<option \${prefs[p]===x?'selected':''}>\${x}</option>\`).join('')}</select></div>\`).join('')}</div><div><label>TEMA DE LA INTERFAZ</label><div class="colors">\${palette.slice(0,7).map((c,i)=>\`<button aria-label="Tema \${i+1}" class="swatch \${prefs.theme===i?'active':''}" style="background:\${c}" onclick="prefs.theme=\${i};theme();customize()"></button>\`).join('')}</div></div><button class="primary" onclick="save();menu()">GUARDAR PERSONALIZACI\xD3N \u2713</button></div></div>\`}
function recordChapter(i){records(i*10)}
function records(i){setGameLayout(false);screen='records';g=null;let r=prefs.records[i];app.innerHTML=head('Tu mejor versi\xF3n','CLASIFICACI\xD3N')+chapterTabs(Math.floor(i/10),'recordChapter')+\`<div class="tabs">\${L.slice(Math.floor(i/10)*10,Math.floor(i/10)*10+10).map((l,j)=>{let k=Math.floor(i/10)*10+j;return \`<button class="\${k===i?'active':''}" onclick="records(\${k})">\${String(k+1).padStart(2,'0')}</button>\`}).join('')}</div><h2 style="margin-top:35px">\${L[i].name}</h2><div class="records"><div class="record"><span class="sub">MEJOR TIEMPO</span><strong>\${r?r.time.toFixed(2)+' s':'\u2014'}</strong><p class="sub">El menor tiempo de finalizaci\xF3n</p></div><div class="record"><span class="sub">MENOS COMIDA</span><strong>\${r?r.food+' bolas':'\u2014'}</strong><p class="sub">La ruta m\xE1s eficiente</p></div></div><p class="sub">\${r?'R\xE9cords independientes \xB7 Guardados en este dispositivo.':'Completa esta habitaci\xF3n para registrar tu primer resultado.'}</p>\`}
function start(i){if(!Number.isInteger(i)||i<0||i>=L.length||i>=prefs.unlocked)return;setGameLayout(true);clearContact();screen='game';let l=structuredClone(L[i]);g={i,l,x:3,y:Math.floor(l.h/2),dir:[1,0],next:[1,0],trail:[],life:l.time,elapsed:0,eaten:0,steps:0,acc:0,step:.16,length:14,seq:0,sw:(l.sw||[]).map(()=>false),boxes:(l.boxes||[]).map(p=>[...p]),key:!l.key,foods:[],open:false,state:'ready',death:0,portalCD:0,hurt:0};for(let j=0;j<20;j++)g.trail.push([g.x-j*.45,g.y]);initMechanisms();initChallenge();spawnFood();particles=[];effects=[];inventorySignature='';app.innerHTML=\`<div class="game-top"><div class="stat">HABITACI\xD3N \${String(i+1).padStart(2,'0')} / \${L.length}<b>\${l.name}</b></div><div class="stat life">SUPERVIVENCIA<b id="life">\${l.time.toFixed(1)} s</b><div class="bar"><i id="bar"></i></div></div><div class="stat">TIEMPO<b id="elapsed">0.0 s</b></div><div class="stat">COMIDA<b id="eaten">00</b></div><button onclick="showGuide()" aria-label="Ver gu\xEDa del nivel">? Gu\xEDa</button><button onclick="pause()" aria-label="Pausar partida">\u2161</button></div><div class="arena"><div id="inventory" class="inventory" role="region" aria-label="Objetos que llevas"></div><div class="map-view"><div id="speed-effect" class="speed-effect" hidden></div><div id="contact-warning" class="contact-warning" role="status" aria-live="polite" hidden>\u26A0 DA\xD1O POR CHOQUE \xB7 VIDA \xD73<span>Ap\xE1rtate del obst\xE1culo: pierdes 3 s de vida por segundo.</span></div><canvas id="board" width="1152" height="640"></canvas><div class="overlay guide-overlay" id="overlay" role="dialog" aria-modal="true" aria-label="Gu\xEDa visual del nivel">\${guideHTML(l)}</div></div></div><div class="objective"><span id="objectives"></span><span>FLECHAS / WASD \xB7 P PAUSA \xB7 R REINICIAR</span></div><div class="legend"><span><em>\u25CF</em> Comida +\${l.bonus} s</span><span style="color:#c395ff">\u25C9 Interruptor</span><span style="color:#ffc467">\u25A3 Cubo / placa</span><span style="color:#67dfff">\u25CE Portal</span><span>\u25A5 Salida</span>\${i>=10?'<span>\u25B3 Verde: comida \xB7 Naranja: sin comida \xB7 Rojo: da\xF1o \xB7 \u226B Turbo \xD73 \xB7 \u2248 Freno \xF73 \xB7 \u2739 Mina \xB7 \u22C8 Suelo fr\xE1gil \xB7 \u25C7 Escudo</span>':''}</div><div class="touch">\${[['\u2190',-1,0],['\u2191',0,-1],['\u2193',0,1],['\u2192',1,0]].map(v=>\`<button aria-label="Mover \${v[0]}" onpointerdown="turn(\${v[1]},\${v[2]})">\${v[0]}</button>\`).join('')}</div>\`;cv=$('#board');cv.tabIndex=0;ctx=cv.getContext('2d');cv.addEventListener('pointerdown',touchStart);cv.addEventListener('pointerup',touchEnd);updateHUD();$('#overlay .primary')?.focus?.({preventScroll:true})}
function begin(){if(!g)return;if(!g.fullscreenAsked){g.fullscreenAsked=true;void enterFullscreen();}audio();g.state='play';$('#overlay')?.remove();cv?.focus?.({preventScroll:true})}
function overlay(html){$('.arena').insertAdjacentHTML('beforeend',\`<div class="overlay" id="overlay"><div class="modal">\${html}</div></div>\`)}function pause(){if(!g)return;if(g.state==='play'){g.state='pause';clearContact();overlay(\`<div class="badge">\u2161</div><h2>Un respiro.</h2><p>Tu tiempo est\xE1 a salvo.</p><button class="primary" onclick="begin()">CONTINUAR</button><button onclick="start(\${g.i})">Reiniciar</button><button onclick="levels()">Habitaciones</button>\`)}else if(g.state==='pause')begin()}
function turn(x,y){if(!g||g.state!=='play')return;if((g.l.challenge?.ice||[]).some(p=>eq(p,g.x,g.y)))return;if(x===-g.dir[0]&&y===-g.dir[1])return;g.next=[x,y]}
let touch;function touchStart(e){touch=[e.clientX,e.clientY];e.preventDefault()}function touchEnd(e){if(!touch)return;let dx=e.clientX-touch[0],dy=e.clientY-touch[1];if(Math.hypot(dx,dy)>10)turn(...(Math.abs(dx)>Math.abs(dy)?[Math.sign(dx),0]:[0,Math.sign(dy)]));touch=null}
document.addEventListener('keydown',e=>{if(screen!=='game')return;if(e.key.toLowerCase()==='h'){e.preventDefault();if(g.state==='guide')begin();else showGuide();return;}if(e.key==='Escape'&&g.state==='guide'){begin();return;}const dirs={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]};if(dirs[e.key]){e.preventDefault();turn(...dirs[e.key])}if(e.key.toLowerCase()==='p'||e.key==='Escape')pause();if(e.key.toLowerCase()==='r'&&g)start(g.i)});document.addEventListener('visibilitychange',()=>{if(document.hidden&&g?.state==='play')pause()});
function inRect(x,y,r){return x>=r[0]&&y>=r[1]&&x<r[0]+r[2]&&y<r[1]+r[3]}function wall(x,y){let l=g.l;return x<1||y<1||x>=l.w-1||y>=l.h-1||challengeBlocked(x,y)||l.walls.some(r=>inRect(x,y,r))||(l.gates||[]).some(r=>gateClosed(r)&&inRect(x,y,r))}const eq=(p,x,y)=>p[0]===x&&p[1]===y;function special(x,y){let l=g.l;return challengeSpecial(x,y)||[...(l.sw||[]),...(l.plates||[]),...(l.portals||[]),...(l.key?[l.key]:[]),...g.boxes,[l.w-2,l.h-2]].some(p=>eq(p,x,y))}function spawnFood(){let l=g.l;if(l.foodPoints){g.foods=l.foodPoints.map(p=>[...p]);return;}let seed=911+g.i*43;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};for(let tries=0;g.foods.length<l.food&&tries<2000;tries++){let x=2+Math.floor(rand()*(l.w-4)),y=2+Math.floor(rand()*(l.h-4));if(!wall(x,y)&&!special(x,y)&&!g.foods.some(p=>eq(p,x,y))&&Math.hypot(x-g.x,y-g.y)>2)g.foods.push([x,y])}}
function burst(x,y,color,n=16){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*7,vy:(Math.random()-.5)*7,t:1,color})}
function hit(){if(g.hurt<=0){g.hurt=.65;sound('damage');burst(g.x,g.y,'#ff6072',8)}}
function canPushBox(i,dx,dy){const b=g.boxes[i];if((g.l.plates||[]).some(p=>eq(p,...b)))return false;const x=b[0]+dx,y=b[1]+dy;return !wall(x,y)&&!g.boxes.some(p=>eq(p,x,y))&&!eq([g.l.w-2,g.l.h-2],x,y)}
function feed(){g.life=Math.min(g.l.time,g.life+g.l.bonus);syncSize();g.eaten++;burst(g.x,g.y,prefs.color,22);sound('eat');$('#flash').className='';void $('#flash').offsetWidth;$('#flash').className='eat'}
function tick(){let [dx,dy]=g.next;g.dir=[dx,dy];let nx=g.x+dx,ny=g.y+dy;const bi=g.boxes.findIndex(p=>eq(p,nx,ny));breakBarrier(nx,ny);if(wall(nx,ny)){hit();return}if(bi>=0){if(!canPushBox(bi,dx,dy)){hit();return;}let bx=nx+dx,by=ny+dy;g.boxes[bi]=[bx,by];sound((g.l.plates||[]).some(p=>eq(p,bx,by))?'switch':'push');burst(bx,by,'#ffc467',6);if((g.l.plates||[]).some(p=>eq(p,bx,by)))visualEffect('pulse',bx,by,'#b6f560','\xA1Cubo encajado!')}g.trail.unshift([g.x,g.y]);g.trail=g.trail.slice(0,30);g.x=nx;g.y=ny;g.steps++;
let fi=g.foods.findIndex(p=>eq(p,nx,ny));if(fi>=0){g.foods.splice(fi,1);feed()}

const si=(g.l.sw||[]).findIndex(p=>eq(p,nx,ny));if(si>=0&&!g.sw[si]){if(g.l.seq&&si!==g.seq){g.sw.fill(false);g.seq=0;g.relayLeft=0;sound('critical')}else{g.sw[si]=true;g.seq++;sound('switch');burst(nx,ny,'#c395ff',18)}}if(g.l.key&&!g.key&&eq(g.l.key,nx,ny)){g.key=true;sound('switch');burst(nx,ny,'#ffd36e');visualEffect('pickup',nx,ny,'#ffd36e','Llave recogida')}
if(g.portalCD<=0&&g.l.portals){let pi=g.l.portals.findIndex(p=>eq(p,nx,ny));if(pi>=0){let p=g.l.portals[1-pi];g.x=p[0];g.y=p[1];g.trail=Array.from({length:30},()=>[g.x,g.y]);g.portalCD=.7;sound('portal')}}
mechanismStep();challengeStep();let ready=challengeComplete()&&g.rune===(g.l.runes||[]).length&&g.sw.every(Boolean)&&g.key&&(g.l.plates||[]).every(p=>g.boxes.some(b=>eq(b,...p)));if(!ready)g.open=false;if(ready&&!g.open){g.open=true;sound('door');burst(g.l.w-2,g.l.h-2,prefs.color,30);visualEffect('pulse',g.l.w-2,g.l.h-2,prefs.color,'\xA1Salida abierta!')}if(g.life>0&&g.open&&g.x===g.l.w-2&&g.y===g.l.h-2)win()}
function win(){g.state='win';clearContact();const old=prefs.records[g.i];prefs.records[g.i]={time:Math.min(old?.time??Infinity,g.elapsed),food:Math.min(old?.food??Infinity,g.eaten)};prefs.unlocked=Math.min(L.length,Math.max(prefs.unlocked,g.i+2));save();sound('win');$('#flash').className='';overlay(\`<div class="badge">\u2726</div><div class="eyebrow">\${g.i===L.length-1?'EXPEDICI\xD3N COMPLETADA':'HABITACI\xD3N COMPLETADA'}</div><h2>\${g.i===L.length-1?'Lo imposible, superado.':'Una salida m\xE1s.'}</h2><p>\${g.elapsed.toFixed(2)} segundos \xB7 \${g.eaten} bolas de comida<br>\${!old||g.elapsed<old.time?'\xA1Nuevo r\xE9cord de tiempo!':'Tu r\xE9cord sigue esperando.'}</p>\${g.i<L.length-1?\`<button class="primary" onclick="start(\${g.i+1})">SIGUIENTE HABITACI\xD3N \u2192</button>\`:''}<button onclick="start(\${g.i})">Reintentar</button><button onclick="levels()">Habitaciones</button>\`)}
function syncSize(){g.life=Math.max(0,Math.min(g.l.time,g.life));g.length=14*g.life/g.l.time;g.step=(.09+.11*(g.length/14))/(g.l.speed||1);const current=(g.l.currents||[]).find(r=>inRect(g.x,g.y,r));if(current)g.step*=current[4]<1?1/3:3;else if(g.currentTime>0)g.step*=g.currentEffect;g.step=Math.max(.025,g.step)}
function die(){clearContact();g.life=0;syncSize();g.state='dying';g.death=0;burst(g.x,g.y,'#ffbc64',90);sound('boom');sound('lose');$('#flash').className=''}function updateHUD(){if(!g||!$('#life'))return;updateInventory();const speed=$('#speed-effect');if(speed){speed.hidden=g.currentTime<=0;speed.className='speed-effect '+(g.currentEffect<1?'turbo':'slow');speed.textContent=(g.currentEffect<1?'\u226B TURBO \xD73':'\u2248 FRENO \xF73')+' \xB7 '+g.currentTime.toFixed(1)+' s';}$('#life').textContent=Math.max(0,g.life).toFixed(1)+' s';$('#bar').style.width=Math.max(0,g.life/g.l.time*100)+'%';$('#bar').style.background=(g.life<=5||g.contact)?'#ff6072':'var(--accent)';$('#elapsed').textContent=g.elapsed.toFixed(1)+' s';$('#eaten').textContent=String(g.eaten).padStart(2,'0');$('#objectives').textContent=g.open?'\u2713 SALIDA ABIERTA \xB7 Dir\xEDgete a la puerta luminosa':\`\${g.l.sw?'Nodos '+g.sw.filter(Boolean).length+'/'+g.sw.length+' \xB7 ':''}\${g.l.plates?'Placas '+g.l.plates.filter(p=>g.boxes.some(b=>eq(b,...p))).length+'/'+g.l.plates.length+' \xB7 ':''}\${g.l.key?(g.key?'Llave \u2713':'Busca la llave')+' \xB7 ':''}Salida bloqueada\`;$('#objectives').textContent=g.l.challenge?((g.open?'\u2713 SALIDA ABIERTA \xB7 ':'')+challengeHUD()+mechanismHUD()):$('#objectives').textContent+mechanismHUD()+challengeHUD()}
// One contact multiplier, regardless of how many obstacles touch the head.
function touchingObstacle(){
 const nx=g.x+g.next[0],ny=g.y+g.next[1];
 if(wall(nx,ny)&&!canBreak(nx,ny))return true;
 const bi=g.boxes.findIndex(p=>eq(p,nx,ny));if(bi>=0&&!canPushBox(bi,...g.next))return true;
 if(extraContact())return true;
 if(g.shield>0||g.challenge?.silence>0)return false;
 if(Math.floor(g.elapsed/2)%2===0&&(g.l.lasers||[]).some(r=>inRect(g.x,g.y,r)))return true;
 return (g.l.drones||[]).some(d=>{let f=(Math.sin(g.elapsed*1.2)+1)/2;return Math.hypot(g.x-(d[0]+(d[2]-d[0])*f),g.y-(d[1]+(d[3]-d[1])*f))<.8});
}
function clearContact(){if(g)g.contact=false;const warning=$('#contact-warning');if(warning)warning.hidden=true;$('#flash').className='';}
function contactFeedback(active){g.contact=active;const warning=$('#contact-warning');if(warning)warning.hidden=!active;if(active){$('#flash').className='contact';}else if($('#flash').className==='contact'){$('#flash').className='';}}
function update(dt){if(!g||['pause','guide','ready'].includes(g.state))return;if(g.state==='play'){g.hurt-=dt;g.elapsed+=dt;updateChallenge(dt);updateMechanisms(dt);const contact=touchingObstacle();g.life-=dt*(contact?3:(g.challenge.freeze>0?0:1));if(contact)hit();g.portalCD-=dt;syncSize();if(g.life<=0){die();updateHUD();return;}g.acc+=dt;if(g.acc>=g.step){g.acc-=g.step;tick()}if(g.state!=='play')return;syncSize();if(g.life<=0)die();else {contactFeedback(touchingObstacle());if(g.contact){}else if(g.life<=5){if($('#flash').className!=='danger'){$('#flash').className='danger';sound('critical')}}else if($('#flash').className==='danger')$('#flash').className='';}updateHUD()}else if(g.state==='dying'){g.death+=dt;if(g.death>1.2){g.state='dead';overlay(\`<div class="badge">\u2733</div><h2>Se acab\xF3 el tiempo.</h2><p>La pr\xF3xima ruta puede ser la buena.<br>\${g.elapsed.toFixed(1)} s sobrevividos \xB7 \${g.eaten} bolas recogidas</p><button class="primary" onclick="start(\${g.i})">VOLVER A INTENTAR</button><button onclick="levels()">Habitaciones</button>\`)}}for(let p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.kind==='debris'){p.vy+=9*dt;p.angle+=p.spin*dt;}p.t-=dt*1.5}particles=particles.filter(p=>p.t>0)}
function circle(c,x,y,r,color,glow=0){c.fillStyle=color;c.shadowColor=color;c.shadowBlur=glow;c.beginPath();c.arc(x,y,Math.max(.1,r),0,Math.PI*2);c.fill();c.shadowBlur=0}function mix(a,b,t){return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('')}
function snake(c,pts,r,angle=0,scale=1){if(!pts.length||scale<=0)return;r*=scale;scale=1;c.save();c.globalAlpha=1;for(let i=pts.length-1;i>=0;i--){let [x,y]=pts[i],t=i/Math.max(1,pts.length-1),col=prefs.style==='Color fijo'?prefs.color:prefs.style==='Multicolor'?(i%6<3?prefs.color:prefs.second):mix(prefs.color,prefs.second,t*.8);let rr=r*(.65+.35*(1-t))*scale;circle(c,x+2,y+4,rr,'#0005');let grad=c.createRadialGradient(x-rr*.3,y-rr*.4,0,x,y,rr);grad.addColorStop(0,mix(col,'#ffffff',.3));grad.addColorStop(.6,col);grad.addColorStop(1,mix(col,'#000000',.35));circle(c,x,y,rr,grad);if(i%2===0)circle(c,x-rr*.22,y-rr*.3,rr*.18,'#ffffff15')}
let h=pts[0],tail=pts[pts.length-1];if(h){c.save();c.translate(...h);c.rotate(angle);for(let side of [-1,1]){circle(c,r*.32,r*.43*side,r*.34*scale,'#f6ffe9');circle(c,r*.47,r*.43*side,r*.18*scale,'#142018');circle(c,r*.51,r*.43*side-r*.06,r*.05*scale,'#fff')}c.restore();drawAccessory(c,prefs.head,...h,r,angle,'head');const near=pts[Math.max(0,pts.length-2)];drawAccessory(c,prefs.tail,...tail,r,Math.atan2(near[1]-tail[1],near[0]-tail[0]),'tail')}c.restore()}
function drawGame(t){if(!g||!ctx)return;let c=ctx,l=g.l,W=cv.width,H=cv.height,s=Math.min(W/l.w,H/l.h),ox=(W-l.w*s)/2,oy=(H-l.h*s)/2;c.clearRect(0,0,W,H);c.fillStyle='#10170f';c.fillRect(0,0,W,H);c.save();c.translate(ox,oy);c.fillStyle=g.l.challenge?mix('#10170f',MISSION_COLORS[g.l.mission],.1):['#162014','#151d23','#221e17','#1e1728','#23181a','#142026','#201e16','#171c27','#1e211a','#241b24'][g.i<10?g.i:Math.floor(g.i/10)%10];c.fillRect(0,0,l.w*s,l.h*s);c.strokeStyle='#ffffff05';c.lineWidth=1;for(let x=0;x<=l.w;x++){c.beginPath();c.moveTo(x*s,0);c.lineTo(x*s,l.h*s);c.stroke()}for(let y=0;y<=l.h;y++){c.beginPath();c.moveTo(0,y*s);c.lineTo(l.w*s,y*s);c.stroke()}
function block(x,y,w,h){c.fillStyle='#0005';c.fillRect(x*s+3,y*s+5,w*s-2,h*s-2);let grad=c.createLinearGradient(0,y*s,0,(y+h)*s);grad.addColorStop(0,'#3c4836');grad.addColorStop(1,'#252e22');c.fillStyle=grad;c.beginPath();c.roundRect(x*s+2,y*s+2,w*s-4,h*s-4,5);c.fill();c.strokeStyle='#65735966';c.stroke();c.fillStyle='#a1b59122';c.fillRect(x*s+6,y*s+4,w*s-12,2)}block(0,0,l.w,1);block(0,l.h-1,l.w,1);block(0,1,1,l.h-2);block(l.w-1,1,1,l.h-2);l.walls.forEach(r=>block(...r));const pos=p=>[(p[0]+.5)*s,(p[1]+.5)*s];
drawMechanisms(c,s);drawChallenges(c,s);
for(let p of l.plates||[]){let [x,y]=pos(p),done=g.boxes.some(b=>eq(b,...p));c.strokeStyle=done?'#b6f560':'#ffc467';c.lineWidth=2;c.strokeRect(x-s*.36,y-s*.36,s*.72,s*.72);c.setLineDash([3,3]);c.strokeRect(x-s*.22,y-s*.22,s*.44,s*.44);c.setLineDash([])}
(l.sw||[]).forEach((p,i)=>{let [x,y]=pos(p),col=g.sw[i]?'#b6f560':'#b78bea';circle(c,x,y,s*.36,col+'22');circle(c,x,y,s*.23,col,10);c.fillStyle='#171422';c.font=\`bold \${s*.3}px sans-serif\`;c.textAlign='center';c.textBaseline='middle';c.fillText(g.sw[i]?'\u2713':l.seq?i+1:'\u25CF',x,y)});
for(let p of g.foods){let [x,y]=pos(p);circle(c,x,y,s*.34,'#b6f56009',16);circle(c,x,y,s*(.16+.025*Math.sin(t*3+p[0])),prefs.color,14);circle(c,x-s*.045,y-s*.05,s*.04,'#fff')}
for(let p of g.boxes){let [x,y]=pos(p);let locked=(l.plates||[]).some(v=>eq(v,...p));c.fillStyle=locked?'#639442':'#ad7839';c.shadowColor='#ffb34a';c.shadowBlur=8;c.beginPath();c.roundRect(x-s*.33,y-s*.33,s*.66,s*.66,4);c.fill();c.shadowBlur=0;c.strokeStyle='#ffca7c';c.stroke();c.strokeRect(x-s*.17,y-s*.17,s*.34,s*.34);if(locked){c.fillStyle='#f1ffd9';c.font=\`bold \${s*.45}px sans-serif\`;c.textAlign='center';c.textBaseline='middle';c.fillText('\u2713',x,y)}}
for(let p of l.portals||[]){let [x,y]=pos(p);c.strokeStyle='#67dfff';c.lineWidth=3;c.shadowBlur=12;c.shadowColor='#67dfff';c.beginPath();c.ellipse(x,y,s*.34,s*(.24+.05*Math.sin(t*4)),t,0,Math.PI*2);c.stroke();c.shadowBlur=0;circle(c,x,y,s*.15,'#67dfff33')}
if(l.key&&!g.key){let [x,y]=pos(l.key);drawObject(c,'key',x,y,s*.9,'#ffd36e')}
for(let r of l.lasers||[]){let active=Math.floor(g.elapsed/2)%2===0;c.fillStyle=active?'#ff4b6660':'#ff4b660a';c.fillRect(r[0]*s,r[1]*s,r[2]*s,r[3]*s);c.fillStyle=active?'#ff6c80':'#57343c';c.shadowBlur=active?16:0;c.shadowColor='#ff4b66';c.fillRect((r[0]+.47)*s,r[1]*s,s*.06,r[3]*s);c.shadowBlur=0}
for(let d of l.drones||[]){let f=(Math.sin(g.elapsed*1.2)+1)/2,[x,y]=pos([d[0]+(d[2]-d[0])*f,d[1]+(d[3]-d[1])*f]);circle(c,x,y,s*.35,'#ff6072',15);circle(c,x,y,s*.16,'#351620');c.strokeStyle='#ff6072';c.beginPath();c.arc(x,y,s*.5,t*3,t*3+4.5);c.stroke()}
let [ex,ey]=pos([l.w-2,l.h-2]);c.strokeStyle=g.open?'#b6f560':'#69775e';c.fillStyle=g.open?'#b6f56022':'#0005';c.lineWidth=3;c.shadowColor='#b6f560';c.shadowBlur=g.open?20:0;c.beginPath();c.roundRect(ex-s*.4,ey-s*.45,s*.8,s*.9,5);c.fill();c.stroke();c.shadowBlur=0;c.font=\`bold \${s*.5}px sans-serif\`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=g.open?'#b6f560':'#79876e';c.fillText(g.open?'\u2197':'\u2261',ex,ey);
if(!['dead','dying'].includes(g.state)&&g.length>0){let f=Math.min(1,g.acc/g.step),path=[[g.x,g.y],...g.trail],pts=[],ratio=g.length/14;for(let i=0;i<29;i++){let v=i*.45*ratio+1-f,ix=Math.floor(v),a=path[Math.min(ix,path.length-1)],b=path[Math.min(ix+1,path.length-1)],m=v-ix;pts.push(pos([a[0]+(b[0]-a[0])*m,a[1]+(b[1]-a[1])*m]))}snake(c,pts,s*.4,Math.atan2(g.dir[1],g.dir[0]),Math.min(1,g.life))}
for(let p of particles){let [x,y]=pos([p.x,p.y]);c.globalAlpha=Math.max(0,p.t);if(p.kind==='debris'){c.save();c.translate(x,y);c.rotate(p.angle);c.fillStyle=p.color;c.fillRect(-s*.09,-s*.07,s*.18,s*.14);c.restore()}else circle(c,x,y,s*.09,p.color,6)}c.globalAlpha=1;drawEffects(c,s);c.restore()}
function drawShow(t){let el=$('#show');if(!el)return;let c=el.getContext('2d'),w=el.width,h=el.height;c.clearRect(0,0,w,h);c.strokeStyle='#a2c57809';for(let x=0;x<w;x+=38){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}for(let y=0;y<h;y+=38){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}for(let i=0;i<18;i++){let x=(i*137+40)%w,y=(i*193+50)%h;circle(c,x,y,3+Math.sin(t+i),i%3===0?'#c395ff':'#b6f560',12)}let pts=[];for(let i=0;i<80;i++){let k=i/79;let x=w*.52+Math.sin(k*7.2-.8)*w*.25,y=h*.24+k*h*.53+Math.sin(t*1.2+k*4)*7;pts.push([x,y])}snake(c,pts,30,-.6);c.fillStyle='#b6f56012';c.font='bold 100px sans-serif';c.textAlign='center';c.fillText('OMG',w*.5,h*.91)}
function loop(ts){let dt=Math.min(.05,(ts-last)/1000||.016);last=ts;if(screen==='practice'){updatePractice(dt);requestAnimationFrame(loop);return;}update(dt);updateEffects(dt);if(screen==='game')drawGame(ts/1000);else drawShow(ts/1000);requestAnimationFrame(loop)}menu();requestAnimationFrame(loop);if(cloudSaved===null||hasPending)save();else syncStatus('');

setInterval(pumpMusic,40);

</script><script>document.querySelector('#account-name').textContent=__PLAYER_NAME_JSON__;document.querySelector('#logout').onclick=async()=>{const button=document.querySelector('#logout');button.disabled=true;try{save();if(!await flushProgress()){syncStatus('No se ha podido guardar. Reintenta antes de salir.');return}const r=await fetch('/api/logout',{method:'POST',headers:{'Content-Type':'application/json'}});if(!r.ok)throw Error();location.href='/';}catch{syncStatus('No se pudo cerrar sesi\xF3n. Int\xE9ntalo de nuevo.')}finally{button.disabled=false}};</script><script>
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
 document.querySelector('.game-top button:last-child').textContent='\u2630';
 $('#practice-ranking').textContent='Una sala \xB7 Todos los jugadores \xB7 8 bots';
 $('#practice-overlay').innerHTML='<div class="modal"><div class="eyebrow">SALA COMPARTIDA \xB7 8 BOTS</div><h2>Entra en la arena.</h2><p>Juega con otros usuarios conectados. Come, crece y protege tu cabeza. Los bots llevan la etiqueta BOT.</p><p>Rat\xF3n, flechas o WASD para girar. Espacio para esprintar. Im\xE1n, estrella \xD73, fantasma y portales.</p><p>La sala sigue en marcha al abrir el men\xFA. Tu serpiente sale al abandonar la sala.</p><button class="primary" onclick="joinOnline()">ENTRAR A LA SALA \u2192</button><button onclick="multiplayerMenu()">Volver</button></div>';
 $('#practice-notice').textContent='Conecta para ver los jugadores de la sala';
}
async function joinOnline(){const o=online;if(!o||o.joined||o.pending)return;audio();o.pending=true;$('#practice-overlay').innerHTML='<div class="modal"><h2>Entrando en la sala\u2026</h2><p>Sincronizando jugadores y mapa.</p><button onclick="multiplayerMenu()">Cancelar</button></div>';
 try{save();await flushProgress();const data=await onlineRequest(o,'join');if(online!==o)return;o.joined=true;o.overlay=false;$('#practice-overlay').hidden=true;practice.state='play';onlineSnapshot(data);$('#practice-board').focus({preventScroll:true});o.timer=setTimeout(()=>onlinePoll(o),16)}catch(e){if(online!==o)return;$('#practice-overlay').innerHTML='<div class="modal"><h2>No se pudo entrar</h2><p>'+escapeArenaName(e.message)+'</p><button onclick="joinOnline()">Reintentar</button><button onclick="multiplayerMenu()">Volver</button></div>'}finally{o.pending=false}}
async function onlineRequest(o,action){const sent=performance.now();const angle=practice?.input?.angle||0;const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),7000);try{const response=await fetch('/api/arena',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,clientId:o.clientId,angle:Math.atan2(Math.sin(angle),Math.cos(angle)),boost:!!practice?.input?.boost&&!document.hidden}),signal:controller.signal});const data=await response.json();if(!response.ok){const e=new Error(data.error||'Error de conexi\xF3n');e.status=response.status;throw e}o.rtt=performance.now()-sent;return data}finally{clearTimeout(timeout)}}
async function onlinePoll(o){if(online!==o||!o.joined||o.pending)return;o.pending=true;try{const action=o.respawnRequested?'respawn':'input';const data=await onlineRequest(o,action);if(action==='respawn')o.respawnRequested=false;if(online!==o)return;o.failed=0;onlineSnapshot(data)}catch(e){if(online!==o)return;o.failed++;practice.input.boost=false;$('#practice-notice').textContent='Conexi\xF3n interrumpida \xB7 reintentando\u2026';if(e.status===401||e.status===409){o.joined=false;$('#practice-overlay').hidden=false;$('#practice-overlay').innerHTML='<div class="modal"><h2>Conexi\xF3n cerrada</h2><p>'+escapeArenaName(e.message)+'</p><button onclick="multiplayerMenu()">Volver a los modos</button></div>'}}finally{o.pending=false;if(online===o&&o.joined)o.timer=setTimeout(()=>onlinePoll(o),o.failed?1200:16)}}
function onlineSnapshot(data){const o=online;if(!o||data.version<o.version)return;o.lastSnapshot=performance.now();o.stats=data;if(data.version===o.version)return;o.version=data.version;
 if(!data.you){$('#practice-notice').textContent='Preparando tu serpiente\u2026';return}
 const previous=new Map((practice.snakes||[]).map(s=>[s.serverId??s.id,s]));
 const snakes=data.snakes.map(s=>({...s,serverId:s.id,id:s.id===data.you?0:s.id,targetPoints:s.points.map(p=>({...p})),points:s.points.map(p=>({...p}))})).sort((a,b)=>a.id===0?-1:b.id===0?1:0);
 for(const s of snakes){const prev=previous.get(s.serverId);if(prev&&prev.alive&&s.alive&&Math.hypot(prev.x-s.x,prev.y-s.y)<350){s.fromPoints=s.targetPoints.map((p,i)=>prev.points[i]?{...prev.points[i]}:{...p});s.fromAngle=prev.angle;s.targetAngle=s.angle}else{s.fromPoints=s.targetPoints.map(p=>({...p}));s.fromAngle=s.angle;s.targetAngle=s.angle}}
 const first=!o.target,input=practice.input,camera=first?{x:snakes[0].x,y:snakes[0].y}:practice.camera;
 practice={...practice,...data,snakes,input,camera,foodGrid:new ArenaGrid(160),bodyGrid:new ArenaGrid(70),lasers:[],pads:[],sparks:[],noticeTime:0};pRebuildFood(practice);o.target=data;o.transition=0;o.predictedAge=0;const lead=Math.min(.25,(o.rtt||0)/2000+Math.max(0,(data.serverNow-data.snapshotAt)||0)/1000);for(const s of snakes)predictOnlineSnake(s,lead);
 const you=snakes[0];practice.state=you.alive?'play':'dead';
 if(!you.alive&&!o.dead){o.dead=true;practice.input.boost=false;$('#practice-overlay').hidden=false;$('#practice-overlay').innerHTML='<div class="modal"><h2>Una vuelta m\xE1s.</h2><p>'+escapeArenaName(you.death||'Has sido eliminado.')+'</p><p>Masa m\xE1xima: '+Math.floor(you.peak)+' \xB7 Bajas: '+you.kills+'</p><button class="primary" onclick="respawnOnline()">VOLVER A LA SALA \u2192</button><button onclick="multiplayerMenu()">Salir</button></div>'}
 if(you.alive&&o.dead){o.dead=false;o.overlay=false;$('#practice-overlay').hidden=true}
 onlineHUD();
}
function respawnOnline(){const o=online;if(!o||!o.joined)return;o.respawnRequested=true;if(!o.pending){clearTimeout(o.timer);onlinePoll(o)}}
function onlineHUD(){const o=online;if(!o?.target)return;const s=practice.snakes[0],d=o.stats;$('#practice-mass').textContent=Math.floor(s.mass);$('#practice-rank').textContent=(d.rank||'\u2014')+' / '+(d.players+d.bots);$('#practice-kills').textContent=s.kills;$('#practice-ranking').innerHTML='<b>'+d.players+' JUGADORES \xB7 '+d.bots+' BOTS</b>'+d.ranking.slice(0,5).map((r,i)=>'<div><span>'+ (i+1)+'. '+escapeArenaName(r.name)+'</span><span>'+r.mass+'</span></div>').join('');
 $('#practice-powers').innerHTML='<span class="inventory-title">HABILIDADES</span>'+PRACTICE_POWERS.filter(p=>s.buffs[p[0]]>0).map(p=>'<span class="inventory-chip">'+objectSVG(p[4],p[3])+'<span>'+p[1]+' \xB7 '+Math.ceil(s.buffs[p[0]])+' s</span></span>').join('');$('#practice-notice').textContent=d.players+' jugadores conectados \xB7 8 bots \xB7 Misma arena para todos';}
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
 const player=practice.snakes[0];practice.camera.x+=(player.x-practice.camera.x)*Math.min(1,dt*12);practice.camera.y+=(player.y-practice.camera.y)*Math.min(1,dt*12);drawOnlineWorld();if(performance.now()-o.lastSnapshot>1500)$('#practice-notice').textContent='Conexi\xF3n lenta \xB7 esperando al servidor';};

pausePractice=function(){if(!online)return localPracticePause(...arguments);const o=online;if(!o.joined||o.dead)return;practice.input.boost=false;o.overlay=!o.overlay;$('#practice-overlay').hidden=!o.overlay;if(o.overlay)$('#practice-overlay').innerHTML='<div class="modal"><h2>La sala sigue activa.</h2><p>Otros jugadores y bots contin\xFAan movi\xE9ndose. Vuelve a jugar o sal para retirar tu serpiente.</p><p>Rat\xF3n / WASD \xB7 Espacio para esprintar</p><button class="primary" onclick="enterPractice()">SEGUIR JUGANDO</button><button onclick="multiplayerMenu()">Salir de la sala</button></div>'};
enterPractice=function(){if(!online)return localPracticeEnter();online.overlay=false;$('#practice-overlay').hidden=true;$('#practice-board').focus({preventScroll:true})};
window.addEventListener('pagehide',leaveOnline);

function drawOnlineWorld(){if(!practice||screen!=='practice')return;const w=practice,canvas=$('#practice-board'),c=canvas.getContext('2d'),W=canvas.width,H=canvas.height,cx=w.camera.x,cy=w.camera.y,player=w.snakes[0];const visible=(x,y,pad=100)=>Math.abs(x-cx)<W/2+pad&&Math.abs(y-cy)<H/2+pad;c.clearRect(0,0,W,H);c.fillStyle='#101a18';c.fillRect(0,0,W,H);c.save();c.translate(W/2-cx,H/2-cy);
 const left=cx-W/2,top=cy-H/2;c.strokeStyle='#a1dcbd0b';c.lineWidth=1;for(let x=Math.floor(left/80)*80;x<left+W;x+=80){c.beginPath();c.moveTo(x,top);c.lineTo(x,top+H);c.stroke()}for(let y=Math.floor(top/80)*80;y<top+H;y+=80){c.beginPath();c.moveTo(left,y);c.lineTo(left+W,y);c.stroke()}
 c.strokeStyle='#718e71';c.lineWidth=12;c.strokeRect(6,6,w.w-12,w.h-12);
 for(let room of w.rooms){if(!visible(room.x+room.w/2,room.y+room.h/2,500))continue;c.fillStyle=['#163329','#25243c','#332b1c'][room.type];c.fillRect(room.x,room.y,room.w,room.h);c.font='bold 20px sans-serif';c.fillStyle='#c3d8bb66';c.textAlign='center';c.fillText(room.name,room.x+room.w/2,room.y+room.h-65);}
 for(let wall of w.walls){if(!visible(wall.x+wall.w/2,wall.y+wall.h/2,400))continue;c.fillStyle='#344a42';c.beginPath();c.roundRect(wall.x,wall.y,wall.w,wall.h,5);c.fill();c.strokeStyle='#718e7155';c.lineWidth=2;c.stroke();}
 for(let pad of w.pads){if(!visible(pad.x,pad.y))continue;circle(c,pad.x,pad.y,pad.r,pad.fast?'#2c947935':'#8066b035');c.strokeStyle=pad.fast?'#6ef3d4':'#b9a4ff';c.lineWidth=2;c.beginPath();c.arc(pad.x,pad.y,pad.r,0,Math.PI*2);c.stroke();c.fillStyle=c.strokeStyle;c.font='bold 24px sans-serif';c.textAlign='center';c.fillText(pad.fast?'\u226B':'\u2248',pad.x,pad.y+8);}
 for(let l of w.lasers){if(!visible(l.x+l.w/2,l.y,350))continue;const active=pLaserOn(w,l);c.fillStyle=active?'#ff466f88':'#67424a';c.shadowColor='#ff466f';c.shadowBlur=active?12:0;c.fillRect(l.x,l.y,l.w,l.h);c.shadowBlur=0;for(let block of w.blocks)if(Math.abs(block.y+block.h/2-l.y)<block.h/2+24&&block.x>l.x&&block.x<l.x+l.w){c.fillStyle='#13251e';c.fillRect(block.x+block.w,l.y-2,Math.max(0,l.x+l.w-block.x-block.w),l.h+4)}}
 for(let room of w.rooms){if(!visible(room.gate.x,room.gate.y,500))continue;const open=room.until>w.time;c.fillStyle=open?'#88ef9b25':'#a57db9';c.fillRect(room.gate.x,room.gate.y,room.gate.w,room.gate.h);c.strokeStyle=open?'#9df4b0':'#e7c7ff';c.lineWidth=2;c.strokeRect(room.gate.x,room.gate.y,room.gate.w,room.gate.h);c.fillStyle=open?'#b6ffc2':'#f6ddff';c.textAlign='center';c.font='bold 13px sans-serif';c.fillText(open?'ABIERTA \xB7 '+Math.ceil(room.until-w.time)+' s':room.type===0?'ACTIVA LOS 2 NODOS':room.type===1?'C\xD3DIGO '+room.code.join(' \u2192 '):'EMPUJA HASTA LA PLACA',room.gate.x+80,room.gate.y-12);
 room.nodes.forEach((n,i)=>{circle(c,n.x,n.y,24,n.done?'#b6f560':'#9d80d0',6);c.fillStyle='#17261f';c.font='bold 20px sans-serif';c.fillText(n.done?'\u2713':room.type===1?i+1:'\u25CF',n.x,n.y+7)});circle(c,room.release.x,room.release.y,18,'#79dca1');c.fillStyle='#15382c';c.font='bold 18px sans-serif';c.fillText('\u2197',room.release.x,room.release.y+6);if(room.plate){c.strokeStyle='#ffc96b';c.setLineDash([8,5]);c.lineWidth=3;c.strokeRect(room.plate.x,room.plate.y,room.plate.w,room.plate.h);c.setLineDash([]);}}
 for(let b of w.blocks){if(!visible(b.x,b.y))continue;c.fillStyle='#9c7849';c.beginPath();c.roundRect(b.x,b.y,b.w,b.h,8);c.fill();c.strokeStyle='#e9c885';c.lineWidth=3;c.stroke();c.strokeStyle='#6f5234';c.lineWidth=2;for(let k=15;k<b.w;k+=20){c.beginPath();c.moveTo(b.x+k,b.y+6);c.lineTo(b.x+k,b.y+b.h-6);c.stroke()}c.fillStyle='#ffedbf';c.font='bold 18px sans-serif';c.textAlign='center';c.fillText('\u2194',b.x+b.w/2,b.y+b.h/2+6);}
 for(let portal of w.portals){if(!visible(portal.x,portal.y))continue;c.save();c.translate(portal.x,portal.y);c.rotate(w.time*.8);for(let i=0;i<3;i++){c.strokeStyle=portal.color;c.lineWidth=3;c.globalAlpha=1-i*.25;c.beginPath();c.ellipse(0,0,32+i*9,22+i*8,i*.8,0,Math.PI*1.7);c.stroke()}c.restore();circle(c,portal.x,portal.y,24,'#12151f');c.fillStyle=portal.color;c.textAlign='center';c.font='bold 13px sans-serif';c.fillText(portal.label+' \xB7 AGUJERO DE GUSANO',portal.x,portal.y-62);c.font='bold 24px sans-serif';c.fillText('\u25CE',portal.x,portal.y+8);}
 for(let food of w.foodGrid.near(cx,cy,Math.max(W,H)*.7)){if(food.dead||!visible(food.x,food.y,20))continue;if(food.power!==null&&food.power!==undefined){const p=PRACTICE_POWERS[food.power];circle(c,food.x,food.y,23,p[3]+'33',7);drawObject(c,p[4],food.x,food.y,35,p[3]);}else{const col=food.kind==='dropping'?'#a66b3e':palette[food.id%palette.length];circle(c,food.x,food.y,food.kind==='dropping'?5:food.value>2?4.7:3.2,col,food.kind==='dropping'?2:food.value>2?5:0);}}
 const snakes=w.snakes.filter(s=>s.alive).sort((a,b)=>a.mass-b.mass);for(let s of snakes){if(!s.points.some(p=>visible(p.x,p.y,35)))continue;const r=pRadius(s);c.save();c.globalAlpha=s.buffs.phase>0?.62:1;if(s.grace>0)c.globalAlpha*=.6+.2*Math.sin(w.time*12);
 const previousPrefs=prefs;if(s.id!==0)prefs={...prefs,color:s.color,second:s.second||s.color,style:s.style||'Degradado',head:s.head||'Nada',tail:s.tail||'Nada'};snake(c,s.points.map(p=>[p.x,p.y]),r,s.angle);prefs=previousPrefs;
 if(s.buffs.shield>0||s.buffs.frost>0){c.strokeStyle=s.buffs.shield>0?'#ffe48a':'#a6e5ff';c.lineWidth=2;c.beginPath();c.arc(s.x,s.y,r+8,0,Math.PI*2);c.stroke();}c.globalAlpha=1;c.font=(s.id===0?'bold ':'')+'12px sans-serif';c.textAlign='center';c.fillStyle=s.id===0?'#e8ffcd':'#c4d1c5';c.fillText(s.name,s.x,s.y-r-12);c.restore();}
 for(let p of w.sparks){if(!visible(p.x,p.y,15))continue;c.globalAlpha=p.life;circle(c,p.x,p.y,3,p.color)}c.globalAlpha=1;c.restore();drawPracticeMinimap(w);}

</script></body></html>`;

// worker/auth.ts
var enc = new TextEncoder();
var hex = (v) => Array.from(new Uint8Array(v), (b) => b.toString(16).padStart(2, "0")).join("");
var random = () => hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
var digest = async (s) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 1e5 }, key, 256));
}
var eq = (a, b) => {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
};
var cookie = (token, age = 2592e3) => "__Host-snake-session-v2=" + token + "; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=" + age;
var response = (body, status = 200, type = "text/html; charset=utf-8", extra = {}) => new Response(body, { status, headers: { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", ...extra } });
var json = (data, status = 200, extra = {}) => response(JSON.stringify(data), status, "application/json", extra);
var tokenOf = (r) => (r.headers.get("Cookie") || "").match(/(?:^|;\s*)__Host-snake-session-v2=([a-f0-9]{64})(?:;|$)/)?.[1];
var safeJSON = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
async function authFetch(request, env) {
  const url = new URL(request.url), path = url.pathname;
  if (path !== "/" && !path.startsWith("/api/")) return null;
  const db = env.DB;
  if (!db) return json({ error: "La base de datos no est\xE1 disponible." }, 503);
  try {
    if (request.method === "GET" && path === "/") {
      const token2 = tokenOf(request);
      const user = token2 ? await db.prepare("SELECT users.id, users.name FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?").bind(await digest(token2), Date.now()).first() : null;
      const profile = user ? await db.prepare("SELECT data FROM player_progress WHERE user_id=?").bind(user.id).first() : null;
      return response(user ? gameHtml.replace(/__PLAYER_(ID|NAME|PROGRESS)_JSON__/g, (_, key) => safeJSON(key === "ID" ? user.id : key === "NAME" ? user.name : profile ? JSON.parse(profile.data) : null)) : authPage);
    }
    if (path === "/api/arena") {
      const token2 = tokenOf(request);
      const user = token2 ? await db.prepare("SELECT users.id,users.name FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?").bind(await digest(token2), Date.now()).first() : null;
      if (!user) return json({ error: "Inicia sesi\xF3n para entrar en la sala." }, 401);
      return await arenaFetch(request, db, user);
    }
    if (path === "/api/session") {
      if (request.method !== "GET") return json({ error: "M\xE9todo no permitido." }, 405);
      const token2 = tokenOf(request);
      const user = token2 ? await db.prepare("SELECT users.id,users.name FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?").bind(await digest(token2), Date.now()).first() : null;
      return user ? json({ authenticated: true, name: user.name }) : json({ authenticated: false, error: "El navegador no ha conservado la sesi\xF3n." }, 401);
    }
    if (path === "/api/progress") {
      const token2 = tokenOf(request);
      const session = token2 ? await db.prepare("SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?").bind(await digest(token2), Date.now()).first() : null;
      if (!session) return json({ error: "Tu sesi\xF3n ha caducado. Vuelve a iniciar sesi\xF3n." }, 401);
      if (request.method === "GET") {
        const profile = await db.prepare("SELECT data FROM player_progress WHERE user_id=?").bind(session.user_id).first();
        return json({ progress: profile ? JSON.parse(profile.data) : null });
      }
      if (request.method !== "POST") return json({ error: "M\xE9todo no permitido." }, 405);
      if (request.headers.get("Origin") !== url.origin || !request.headers.get("Content-Type")?.startsWith("application/json")) return json({ error: "Solicitud no permitida." }, 403);
      const raw2 = await request.text();
      if (raw2.length > 131072) return json({ error: "Progreso demasiado grande." }, 413);
      let data;
      try {
        data = validateProgress(JSON.parse(raw2));
      } catch {
        return json({ error: "Progreso no v\xE1lido." }, 400);
      }
      return json({ progress: await storeProgress(db, session.user_id, data) });
    }
    if (!["/api/login", "/api/register", "/api/logout"].includes(path)) return json({ error: "Ruta no encontrada." }, 404);
    if (request.method !== "POST") return json({ error: "M\xE9todo no permitido." }, 405);
    if (request.headers.get("Origin") !== url.origin || !request.headers.get("Content-Type")?.startsWith("application/json")) return json({ error: "Solicitud no permitida." }, 403);
    if (path === "/api/logout") {
      const token2 = tokenOf(request);
      if (token2) await db.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await digest(token2)).run();
      return json({ ok: true }, 200, { "Set-Cookie": cookie("", 0) });
    }
    const raw = await request.text();
    if (raw.length > 4096) return json({ error: "Solicitud demasiado grande." }, 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: "Solicitud no v\xE1lida." }, 400);
    }
    if (typeof body.name !== "string" || typeof body.password !== "string") return json({ error: "Introduce un nombre y una contrase\xF1a." }, 400);
    const name = body.name.normalize("NFKC").trim(), nameKey = name.toLowerCase(), password = body.password;
    if (!name || Array.from(name).length > 40 || /[\p{Cc}\p{Cf}]/u.test(name) || password.length > 128) return json({ error: "Nombre o contrase\xF1a no v\xE1lidos. El nombre admite hasta 40 caracteres." }, 400);
    const now = Date.now();
    for (const key of ["ip:" + await digest(request.headers.get("CF-Connecting-IP") || "unknown"), "name:" + await digest(nameKey)]) {
      const row = await db.prepare("INSERT INTO auth_limits (key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END, reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END RETURNING count").bind(key, now + 6e5, now, now, now + 6e5).first();
      if (row && row.count > (key.startsWith("ip:") ? 100 : 15)) return json({ error: "Demasiados intentos. Espera 10 minutos." }, 429, { "Retry-After": "600" });
    }
    let id;
    if (path === "/api/register") {
      if (Array.from(password).length < 6 || !/\p{Lu}/u.test(password)) return json({ error: "La contrase\xF1a necesita al menos 6 caracteres y una may\xFAscula." }, 400);
      id = crypto.randomUUID();
      const salt = random(), hash = await passwordHash(password, salt);
      const result = await db.prepare("INSERT INTO users (id,name,name_key,salt,password_hash,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(name_key) DO NOTHING").bind(id, name, nameKey, salt, hash, now).run();
      if (!result.meta.changes) return json({ error: "Ese nombre ya est\xE1 registrado. Elige otro." }, 409);
    } else {
      const user = await db.prepare("SELECT id,salt,password_hash FROM users WHERE name_key=?").bind(nameKey).first();
      const hash = await passwordHash(password, user?.salt || "00000000000000000000000000000000");
      if (!user) return json({ error: "Esta cuenta no existe" }, 401);
      if (!eq(hash, user.password_hash)) return json({ error: "La contrase\xF1a es incorrecta." }, 401);
      id = user.id;
    }
    const token = random();
    await db.batch([db.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(now), db.prepare("DELETE FROM auth_limits WHERE reset_at<=?").bind(now), db.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(await digest(token), id, now + 2592e6)]);
    return json({ ok: true }, 200, { "Set-Cookie": cookie(token) });
  } catch {
    return json({ error: "No se pudo completar la solicitud. Int\xE9ntalo de nuevo." }, 503);
  }
}
export {
  authFetch,
  passwordHash
};
