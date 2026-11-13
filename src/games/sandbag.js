// 第三关：丢沙包
import * as THREE from 'three';
import { makeKid, animKid, setFace, makeSandbag, makeArrow, rand, clamp, lerp } from '../core.js';

const HX = 4.8, HZ = 2.9, TX = 8.4, DURATION = 40;

export class Sandbag {
  constructor(ctx) {
    this.ctx = ctx;
    const g = (this.group = new THREE.Group());
    ctx.scene.add(g);

    const lm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    const line = (w, d, x, z) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lm); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.02, z); g.add(l); };
    line(HX * 2 + 0.6, 0.14, 0, -HZ - 0.3); line(HX * 2 + 0.6, 0.14, 0, HZ + 0.3);
    line(0.14, HZ * 2 + 0.6, -HX - 0.3, 0); line(0.14, HZ * 2 + 0.6, HX + 0.3, 0);

    this.player = makeKid(46, { hero: true, girl: false, accent: 0xc23b30 });
    this.player.add(makeArrow());
    g.add(this.player);
    this.pv = new THREE.Vector2();

    const nums = ctx.npcNums(11);
    this.throwers = [1, -1].map((sx, i) => {
      const k = makeKid(nums[i]); k.position.set(sx * TX, 0, 0); k.rotation.y = -sx * Math.PI / 2; g.add(k);
      return { k, sx, throwT: 0, tz: 0 };
    });
    this.dodgers = [0, 1, 2].map((i) => {
      const k = makeKid(nums[2 + i]); k.position.set(-3 + i * 3, 0, i === 1 ? -1.8 : 1.6); g.add(k);
      return { k, out: false, tx: k.position.x, tz: k.position.z, t: rand(1), skill: rand(0.55, 0.9), rt: rand(10) };
    });
    this.fans = nums.slice(5).map((n, i) => {
      const k = makeKid(n); k.position.set(-6.5 + i * 2.6, 0, -6 - (i % 2) * 0.8); g.add(k);
      return k;
    });

    this.bags = [];
    this.time = DURATION; this.lives = 3; this.inv = 0; this.catchT = 0; this.catchCd = 0; this.cheer = 0;
    this.running = false; this.over = false; this.runT = 0;
    ctx.ui.lives(3);
    ctx.cam([0, 10.5, 10.5], [0, 0.4, 0], 1);
  }

  begin() { this.running = true; this.addBag(0, 0.6); }

  addBag(holder, wait) {
    const m = makeSandbag();
    this.group.add(m);
    this.bags.push({ m, state: 'held', holder, wait, from: new THREE.Vector3(), to: new THREE.Vector3(), u: 0, len: 1, vy: 0 });
  }

  throwBag(b) {
    const th = this.throwers[b.holder], P = this.player.position;
    const prog = 1 - this.time / DURATION;
    const speed = 7.5 + prog * 5;
    let tx, tz;
    const alive = this.dodgers.filter((d) => !d.out);
    if (alive.length && Math.random() < 0.3) { const d = alive[Math.floor(rand(alive.length))]; tx = d.k.position.x; tz = d.k.position.z; }
    else {
      const lead = (Math.abs(th.k.position.x - P.x) / speed) * rand(0.3, 1);
      tx = clamp(P.x + this.pv.x * lead, -HX, HX) + rand(-0.4, 0.4);
      tz = clamp(P.z + this.pv.y * lead, -HZ, HZ) + rand(-0.4, 0.4);
    }
    b.from.set(th.sx * (TX - 0.5), 1.3, th.k.position.z);
    const dx = tx - b.from.x, dz = tz - b.from.z;
    const k = (TX * 2 - 1) / Math.abs(dx);
    b.to.set(b.from.x + dx * k, 1.2, clamp(b.from.z + dz * k, -6, 6));
    b.len = b.from.distanceTo(b.to); b.speed = speed; b.u = 0; b.state = 'fly';
    th.throwT = 0.35;
    this.throwers[1 - b.holder].tz = b.to.z;
    this.ctx.sfx.whoosh();
  }

  update(dt, t) {
    const { ctx, player: P } = this, { input, ui, sfx } = ctx;
    this.inv -= dt; this.catchT -= dt; this.catchCd -= dt; this.cheer -= dt;

    if (this.running) {
      this.time -= dt; ui.timer(this.time); ui.progress(1 - this.time / DURATION);
      const el = DURATION - this.time;
      if (this.bags.length < 2 && el > 10) { this.addBag(1, 0.5); ui.banner('两个沙包！', 900); }
      if (this.bags.length < 3 && el > 24) { this.addBag(0, 0.5); ui.banner('三个沙包！！', 900); }
      if (this.time <= 0) return this.end(true);

      // 玩家移动
      let mx = 0, mz = 0;
      if (input.held('KeyA', 'ArrowLeft')) mx -= 1;
      if (input.held('KeyD', 'ArrowRight')) mx += 1;
      if (input.held('KeyW', 'ArrowUp')) mz -= 1;
      if (input.held('KeyS', 'ArrowDown')) mz += 1;
      if (!mx && !mz && input.pointerDown) {
        const gp = ctx.groundPoint();
        if (gp) { const dx = gp.x - P.position.x, dz = gp.z - P.position.z; if (dx * dx + dz * dz > 0.09) { mx = dx; mz = dz; } }
      }
      const l = Math.hypot(mx, mz);
      if (l > 0) { mx /= l; mz /= l; }
      this.pv.set(mx * 5.6, mz * 5.6);
      P.position.x = clamp(P.position.x + this.pv.x * dt, -HX, HX);
      P.position.z = clamp(P.position.z + this.pv.y * dt, -HZ, HZ);
      if (l > 0) P.rotation.y = Math.atan2(mx, mz);
      if (input.hit('Space') && this.catchCd <= 0) { this.catchT = 0.3; this.catchCd = 0.75; }
      P.visible = this.inv <= 0 || Math.floor(t * 14) % 2 === 0;
    } else { this.pv.set(0, 0); P.visible = true; }

    // 玩家动画
    if (this.over) animKid(P, this.won ? 'cheer' : 'out', t, dt);
    else if (this.catchT > 0) animKid(P, 'catch', t, dt);
    else if (this.pv.lengthSq() > 0.1) { this.runT += dt; animKid(P, 'run', this.runT, dt); }
    else animKid(P, 'ready', t, dt);

    // 扔沙包的人
    for (const th of this.throwers) {
      th.throwT -= dt;
      th.k.position.z = lerp(th.k.position.z, th.tz, 1 - Math.exp(-dt * 6));
      animKid(th.k, th.throwT > 0 ? 'throw' : 'ready', t, dt);
    }

    // 沙包
    for (const b of this.bags) {
      if (b.state === 'held') {
        const th = this.throwers[b.holder];
        b.m.position.set(th.k.position.x - th.sx * 0.45, 1.05, th.k.position.z);
        if (this.running) { b.wait -= dt; if (b.wait <= 0) this.throwBag(b); else th.tz = lerp(th.tz, P.position.z * 0.7, dt * 3); }
      } else if (b.state === 'fly') {
        b.u += (b.speed * dt) / b.len;
        b.m.position.lerpVectors(b.from, b.to, b.u);
        b.m.position.y = 1.2 + Math.sin(b.u * Math.PI) * 0.6;
        b.m.rotation.x += dt * 9; b.m.rotation.z += dt * 6;
        const hitR = (k, r) => Math.hypot(k.position.x - b.m.position.x, k.position.z - b.m.position.z) < r;
        if (this.running && hitR(P, this.catchT > 0 ? 1.15 : 0.5)) {
          if (this.catchT > 0) {
            this.lives = Math.min(3, this.lives + 1); ui.lives(this.lives);
            ui.banner('接住了！<small>+1 条命</small>', 900); sfx.ding(); this.cheer = 1.2;
            ctx.fx.puff(b.m.position, 0xffe98a, 10, 0.8);
            b.state = 'held'; b.holder = Math.random() < 0.5 ? 0 : 1; b.wait = 1.3;
            continue;
          } else if (this.inv <= 0) {
            this.lives--; ui.lives(this.lives); this.inv = 1.3; sfx.hit(); ui.shake();
            ctx.fx.puff(b.m.position, 0xffffff, 10);
            b.state = 'drop'; b.vy = 2.5; b.t = 0;
            if (this.lives <= 0) { setFace(P, 'out'); return this.end(false, '被沙包砸中三次，出局！'); }
            continue;
          }
        }
        for (const d of this.dodgers) {
          if (!d.out && hitR(d.k, 0.48)) {
            d.out = true; setFace(d.k, 'out'); sfx.pop(); ctx.fx.puff(d.k.position, 0xffffff, 14);
            b.state = 'drop'; b.vy = 2.5; b.t = 0; break;
          }
        }
        if (b.state === 'fly' && b.u >= 1) { b.state = 'held'; b.holder = 1 - b.holder; b.wait = lerp(1.15, 0.35, 1 - this.time / DURATION) + rand(0.25); }
      } else if (b.state === 'drop') {
        b.t += dt; b.vy -= 14 * dt;
        b.m.position.y = Math.max(0.17, b.m.position.y + b.vy * dt);
        if (b.t > 1.1) { b.state = 'held'; b.holder = b.m.position.x > 0 ? 0 : 1; b.wait = 0.5; }
      }
    }

    // 场内的其他小朋友
    for (const d of this.dodgers) {
      const k = d.k;
      if (d.out) { animKid(k, 'out', t, dt); continue; }
      if (!this.running) { animKid(k, this.over ? 'idle' : 'ready', t, dt); continue; }
      d.t -= dt;
      let sp = 2.6;
      for (const b of this.bags) {
        if (b.state !== 'fly') continue;
        const bx = b.m.position.x, bz = b.m.position.z;
        const dirx = (b.to.x - b.from.x) / b.len, dirz = (b.to.z - b.from.z) / b.len;
        const rx = k.position.x - bx, rz = k.position.z - bz;
        const along = rx * dirx + rz * dirz, side = rx * -dirz + rz * dirx;
        if (along > 0 && along < 5 && Math.abs(side) < 0.9 && !d.dodging) {
          d.dodging = true;
          if (Math.random() < d.skill) { d.tz = clamp(k.position.z + (side >= 0 ? 1 : -1) * dirx * 1.8, -HZ, HZ); d.tx = k.position.x; d.t = 0.6; }
        }
        if (d.dodging) sp = 5.5;
      }
      if (d.t <= 0) { d.tx = rand(-HX, HX); d.tz = rand(-HZ, HZ); d.t = rand(1, 2.4); d.dodging = false; }
      const dx = d.tx - k.position.x, dz = d.tz - k.position.z, dl = Math.hypot(dx, dz);
      if (dl > 0.15) {
        k.position.x += (dx / dl) * sp * dt; k.position.z += (dz / dl) * sp * dt;
        k.rotation.y = Math.atan2(dx, dz); d.rt += dt; animKid(k, 'run', d.rt, dt, sp / 5);
      } else { animKid(k, 'ready', t, dt); d.dodging = false; }
    }
    for (const f of this.fans) animKid(f, this.cheer > 0 || this.won ? 'cheer' : 'idle', t, dt);

    ctx.cam([P.position.x * 0.15, 10.5, 10.5], [P.position.x * 0.15, 0.4, 0], 1 - Math.exp(-dt * 4));
  }

  end(win, msg) {
    if (this.over) return;
    this.over = true; this.running = false; this.won = win; this.player.visible = true;
    this.ctx.ui.progress(null);
    for (const b of this.bags) if (b.state === 'fly') { b.state = 'drop'; b.vy = 0; b.t = -99; }
    if (win) { this.player.rotation.y = 0; this.ctx.win(); } else this.ctx.lose(msg);
  }

  dispose() { this.ctx.scene.remove(this.group); }
}
