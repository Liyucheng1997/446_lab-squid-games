// 第五关：跳房子（记住每一行该踩哪一格）
import * as THREE from 'three';
import { makeKid, animKid, setFace, makeArrow, canvasTex, chalkify, label, FONT, rand, clamp, lerp } from '../core.js';

const ROWS = 8, COLS = [-1.55, 0, 1.55], STEP = 1.55, Z0 = 4.6, START_Z = 6.5, TIME = 45;
const CHALK = ['#ffffff', '#ffd0e0', '#fff0a0', '#cfe6ff'];

export class Hopscotch {
  constructor(ctx) {
    this.ctx = ctx;
    const g = (this.group = new THREE.Group());
    ctx.scene.add(g);

    this.path = [];
    for (let i = 0; i < ROWS; i++) {
      let c; do { c = Math.floor(rand(3)); } while (i > 0 && c === this.path[i - 1] && Math.random() < 0.6);
      this.path.push(c);
    }

    const tg = new THREE.PlaneGeometry(1.45, 1.45);
    this.tiles = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < 3; c++) {
        const tex = canvasTex(256, 256, (x, w, h) => {
          x.strokeStyle = CHALK[(r + c) % 4]; x.lineWidth = 12; x.lineJoin = 'round';
          x.strokeRect(14, 14, w - 28, h - 28);
          x.fillStyle = CHALK[(r + c) % 4]; x.globalAlpha = 0.55; x.font = `bold 120px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
          x.fillText(r + 1, w / 2, h / 2 + 8);
          chalkify(x, w, h, 900);
        });
        const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
        m.rotation.x = -Math.PI / 2; m.position.set(COLS[c], 0.02, Z0 - r * STEP); g.add(m);
        const glow = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: 0, depthWrite: false }));
        glow.rotation.x = -Math.PI / 2; glow.position.set(COLS[c], 0.03, Z0 - r * STEP); glow.scale.setScalar(0.9); g.add(glow);
        row.push({ m, glow, a: 0, target: 0 });
      }
      this.tiles.push(row);
    }
    // 顶上的"天"
    const endZ = (this.endZ = Z0 - ROWS * STEP - 0.4);
    const arc = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.32, 40, 1, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
    arc.rotation.x = -Math.PI / 2; arc.position.set(0, 0.02, endZ + 0.75); g.add(arc);
    const sky = label('天', { w: 1.8, h: 1.8, color: '#ffe98a' }); sky.position.set(0, 0.02, endZ - 0.2); g.add(sky);
    const st = label('起 点', { w: 3, h: 1, color: '#ffffff', opacity: 0.8 }); st.position.set(0, 0.02, START_Z + 1.2); g.add(st);

    this.player = makeKid(46, { hero: true, girl: false, accent: 0xc23b30 });
    this.player.add(makeArrow());
    this.player.position.set(0, 0, START_Z); this.player.rotation.y = Math.PI; g.add(this.player);

    this.fans = ctx.npcNums(5).map((n, i) => {
      const k = makeKid(n);
      k.position.set(i % 2 ? 4.6 : -4.6, 0, 3 - i * 2.2); k.rotation.y = i % 2 ? -Math.PI / 2 : Math.PI / 2; g.add(k);
      return k;
    });

    this.state = 'idle'; this.row = 0; this.lives = 3; this.time = TIME; this.cheer = 0;
    this.pos = new THREE.Vector3(0, 0, START_Z);
    this.running = false; this.over = false;
    ctx.ui.lives(3); ctx.ui.info('先看清楚发光的格子……');
    ctx.cam([0, 12.5, 8.5], [0, 0, -1.6], 1);
  }

  begin() { this.state = 'show'; this.si = -1; this.st = 0.4; }

  hopTo(x, z, then) {
    this.hop = { from: this.player.position.clone(), to: new THREE.Vector3(x, 0, z), t: 0, then };
    this.state = 'hop'; this.ctx.sfx.jump();
  }

  choose(c) {
    const r = this.row, ok = c === this.path[r];
    this.hopTo(COLS[c], Z0 - r * STEP, () => {
      const { ctx } = this, tile = this.tiles[r][c];
      if (ok) {
        tile.glow.material.color.set(0x67e37a); tile.target = 0.75;
        ctx.sfx.note(r); this.cheer = 0.6; this.row++;
        this.pos.copy(this.player.position);
        ctx.ui.progress(this.row / ROWS);
        if (this.row >= ROWS) this.hopTo(0, this.endZ, () => this.end(true));
        else this.state = 'play';
      } else {
        tile.glow.material.color.set(0xff4a3d); tile.target = 0.8;
        this.lives--; ctx.ui.lives(this.lives); ctx.sfx.buzz(); ctx.ui.shake();
        ctx.ui.banner('踩错了！', 700);
        ctx.fx.puff(this.player.position, 0xffffff, 10);
        if (this.lives <= 0) return this.end(false, `踩错三次，倒在了第 ${r + 1} 行`);
        // 提示这一行正确的格子，然后跳回去
        const right = this.tiles[r][this.path[r]];
        right.glow.material.color.set(0xffe14a); right.target = 0.6;
        setTimeout(() => { if (!this.over) this.hopTo(this.pos.x, this.pos.z, () => { tile.target = 0.25; this.state = 'play'; }); }, 350);
        this.state = 'wait';
      }
    });
  }

  update(dt, t) {
    const { ctx, player: P } = this, { input, ui, sfx } = ctx;
    this.cheer -= dt;

    if (this.state === 'show') {
      this.st -= dt;
      if (this.st <= 0) {
        if (this.si >= 0) this.tiles[this.si][this.path[this.si]].target = 0;
        this.si++;
        if (this.si >= ROWS) { this.state = 'play'; this.running = true; ui.banner('开始跳！', 800); ui.info('← ↑ →  或  A W D  选择左 / 中 / 右，也可以直接点格子'); }
        else { const tl = this.tiles[this.si][this.path[this.si]]; tl.target = 0.85; tl.a = 0.85; sfx.note(this.si); this.st = 0.58; }
      }
    }

    if (this.running) {
      this.time -= dt; ui.timer(this.time);
      if (this.time <= 0) this.end(false, '时间到了，还没跳到「天」');
    }

    if (this.state === 'play' && this.running) {
      let c = -1;
      if (input.hit('KeyA', 'ArrowLeft')) c = 0;
      else if (input.hit('KeyW', 'ArrowUp', 'Space')) c = 1;
      else if (input.hit('KeyD', 'ArrowRight')) c = 2;
      else if (input.pointerPressed) { const gp = ctx.groundPoint(); if (gp) c = clamp(Math.round(gp.x / 1.55) + 1, 0, 2); }
      if (c >= 0) this.choose(c);
    }

    if (this.state === 'hop') {
      const h = this.hop;
      h.t += dt / 0.3;
      const u = Math.min(1, h.t);
      P.position.lerpVectors(h.from, h.to, u);
      P.position.y = Math.sin(u * Math.PI) * 0.7;
      if (u >= 1) { P.position.y = 0; this.state = 'wait'; sfx.land(); h.then(); }
    }

    for (const row of this.tiles) for (const tl of row) {
      tl.a = lerp(tl.a, tl.target, 1 - Math.exp(-dt * 10));
      tl.glow.material.opacity = tl.a;
    }

    animKid(P, this.over ? (this.won ? 'cheer' : 'out') : this.state === 'hop' ? 'tuck' : this.running ? 'hop' : 'idle', t, dt);
    for (const f of this.fans) animKid(f, this.cheer > 0 || this.won ? 'cheer' : 'idle', t, dt);

    const k = 1 - Math.exp(-dt * 3.5);
    if (this.running || this.over) ctx.cam([0, 7.2, P.position.z + 7], [0, 0, P.position.z - 3.2], k);
    else ctx.cam([0, 12.5, 8.5], [0, 0, -1.6], k);
  }

  end(win, msg) {
    if (this.over) return;
    this.over = true; this.running = false; this.won = win; this.state = 'done';
    this.ctx.ui.progress(null);
    if (win) { this.player.rotation.y = 0; this.ctx.win(); } else { setFace(this.player, 'out'); this.ctx.lose(msg); }
  }

  dispose() { this.ctx.scene.remove(this.group); }
}
