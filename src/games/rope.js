// 第四关：跳大绳
import * as THREE from 'three';
import { makeKid, animKid, setFace, makeArrow, label, rand, lerp } from '../core.js';

const TARGET = 20, DEPTH = 1.17, HAND_Y = 1.2, TAU = Math.PI * 2;
// 每跳过几下换一次节奏
const TEMPO = [[0, 4.3, ''], [5, 5.7, '加速！'], [9, 3.7, '慢——下——来——'], [12, 7.0, '快快快！'], [16, 8.5, '最后冲刺！']];

export class JumpRope {
  constructor(ctx) {
    this.ctx = ctx;
    const g = (this.group = new THREE.Group());
    ctx.scene.add(g);

    const mark = label('跳', { w: 1.6, h: 1.6, color: '#ffe98a', opacity: 0.55 }); mark.position.set(-0.6, 0.02, 0.1); g.add(mark);

    // 绳子：固定形状的弧线，整体绕两手连线旋转
    const pts = [];
    for (let i = 0; i <= 24; i++) { const x = -2.85 + (i / 24) * 5.7; pts.push(new THREE.Vector3(x, -DEPTH * (1 - Math.pow(x / 2.85, 2)), 0)); }
    this.rope = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.035, 8),
      new THREE.MeshStandardMaterial({ color: 0xe8d9b0, roughness: 0.9 }),
    );
    this.rope.castShadow = true;
    this.rope.position.y = HAND_Y; g.add(this.rope);

    const nums = ctx.npcNums(8);
    this.turners = [1, -1].map((sx, i) => {
      const k = makeKid(nums[i]); k.position.set(sx * 3.3, 0, 0); k.rotation.y = -sx * Math.PI / 2; g.add(k); return k;
    });
    this.player = makeKid(46, { hero: true, girl: false, accent: 0xc23b30 });
    this.player.add(makeArrow());
    this.player.position.set(-0.6, 0, 0); g.add(this.player);
    this.mate = { k: makeKid(nums[2]), y: 0, vy: 0, out: false };
    this.mate.k.position.set(0.9, 0, 0); g.add(this.mate.k);
    this.fans = nums.slice(3).map((n, i) => {
      const k = makeKid(n); k.position.set(-4.4 + i * 2.2, 0, -3.6 - (i % 2) * 0.7); g.add(k); return k;
    });

    this.theta = Math.PI; this.omega = 0; this.count = 0; this.lives = 3;
    this.y = 0; this.vy = 0; this.pause = 0; this.tempo = 0; this.cheer = 0;
    this.running = false; this.over = false;
    ctx.ui.lives(3); ctx.ui.info(`已跳 0 / ${TARGET}`);
    ctx.cam([2.4, 2.7, 8.4], [0, 1.25, 0], 1);
  }

  begin() { this.running = true; }

  update(dt, t) {
    const { ctx, player: P, mate } = this, { input, ui, sfx } = ctx;
    this.cheer -= dt;

    // 跳
    if (this.running && this.y <= 0 && (input.hit('Space', 'KeyW', 'ArrowUp') || input.pointerPressed)) { this.vy = 5.5; this.y = 0.001; sfx.jump(); }
    if (this.y > 0) { this.vy -= 24 * dt; this.y += this.vy * dt; if (this.y <= 0) { this.y = 0; this.vy = 0; } }
    P.position.y = this.y;

    if (this.running) {
      if (this.pause > 0) { this.pause -= dt; this.omega = 0; this.theta = lerp(this.theta, Math.PI, dt * 6); }
      else {
        const target = TEMPO[this.tempo][1];
        this.omega = lerp(this.omega, target, 1 - Math.exp(-dt * 2.2));
        const prev = this.theta;
        this.theta += this.omega * dt;
        // 同伴在绳子快到脚下时起跳
        const remain = (TAU - (this.theta % TAU)) / Math.max(this.omega, 0.1);
        if (!mate.out && mate.y <= 0 && remain < 0.2 && !(this.count === 13 && !mate.tripped)) { mate.vy = 5.5; mate.y = 0.001; }
        if (Math.floor(this.theta / TAU) > Math.floor(prev / TAU)) this.pass();
      }
    }
    this.rope.rotation.x = this.theta;

    if (mate.y > 0) { mate.vy -= 24 * dt; mate.y += mate.vy * dt; if (mate.y <= 0) mate.y = 0; }
    mate.k.position.y = mate.y;
    if (mate.out) { mate.k.position.z = lerp(mate.k.position.z, -3.2, dt * 2); mate.k.position.x = lerp(mate.k.position.x, 3.6, dt * 2); }

    // 动画
    animKid(P, this.over ? (this.won ? 'cheer' : 'out') : this.y > 0 ? 'tuck' : 'ready', t, dt);
    animKid(mate.k, mate.out ? 'out' : mate.y > 0 ? 'tuck' : 'ready', t, dt);
    this.turners.forEach((k, i) => {
      const sx = i ? -1 : 1;
      animKid(k, 'idle', t, dt, 1, { al: -1.35 + Math.cos(this.theta) * 0.35, ar: -1.35 + Math.cos(this.theta) * 0.35, zl: Math.sin(this.theta) * 0.25 * sx, zr: Math.sin(this.theta) * 0.25 * sx, lean: 0.05 });
    });
    for (const f of this.fans) animKid(f, this.cheer > 0 || this.won ? 'cheer' : 'idle', t, dt);

    ctx.cam([2.4, 2.7, 8.4], [0, 1.25 + this.y * 0.15, 0], 1 - Math.exp(-dt * 4));
  }

  // 绳子扫过地面的一瞬间
  pass() {
    const { ctx, mate } = this, { ui, sfx } = ctx;
    sfx.tick();
    this.theta %= TAU;
    if (!mate.out && mate.y < 0.12) {
      mate.out = true; mate.tripped = true; setFace(mate.k, 'out');
      ctx.fx.puff(mate.k.position, 0xffffff, 14); sfx.pop();
    }
    if (this.y > 0.13) {
      this.count++; this.cheer = 0.5;
      ui.info(`已跳 ${this.count} / ${TARGET}`); ui.progress(this.count / TARGET);
      ui.banner(`<span class="num">${this.count}</span>`, 420);
      if (this.count >= TARGET) return this.end(true);
      if (this.tempo < TEMPO.length - 1 && this.count >= TEMPO[this.tempo + 1][0]) {
        this.tempo++; ui.banner(TEMPO[this.tempo][2], 1000); sfx.ding();
      }
    } else {
      this.lives--; ui.lives(this.lives); sfx.hit(); ui.shake();
      ui.banner('绊住了！', 800);
      ctx.fx.puff(this.player.position, 0xffffff, 8);
      this.pause = 1.0;
      if (this.lives <= 0) this.end(false, `被绳子绊倒三次，只跳了 ${this.count} 下`);
    }
  }

  end(win, msg) {
    if (this.over) return;
    this.over = true; this.running = false; this.won = win;
    this.ctx.ui.progress(null);
    if (win) this.ctx.win(); else { setFace(this.player, 'out'); this.ctx.lose(msg); }
  }

  dispose() { this.ctx.scene.remove(this.group); }
}
