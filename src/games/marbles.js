// 第二关：弹玻璃珠
import * as THREE from 'three';
import { makeKid, animKid, makeMarble, makeArrow, canvasTex, rand, clamp } from '../core.js';

const RING = 3.3, SHOTS = 5, NEED = 3;
const HOME = { x: 0, z: 5.1 };

export class Marbles {
  constructor(ctx) {
    this.ctx = ctx;
    const g = (this.group = new THREE.Group());
    ctx.scene.add(g);

    // 泥地
    const dirt = new THREE.Mesh(
      new THREE.CircleGeometry(7.5, 48),
      new THREE.MeshStandardMaterial({
        roughness: 1, transparent: true,
        map: canvasTex(512, 512, (c, w, h) => {
          const gr = c.createRadialGradient(256, 256, 60, 256, 256, 256);
          gr.addColorStop(0, 'rgba(150,112,74,1)'); gr.addColorStop(0.75, 'rgba(150,112,74,.9)'); gr.addColorStop(1, 'rgba(150,112,74,0)');
          c.fillStyle = gr; c.fillRect(0, 0, w, h);
          for (let i = 0; i < 5000; i++) { c.globalAlpha = Math.random() * 0.25; c.fillStyle = i % 2 ? '#6e4d2f' : '#c9a57a'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
        }),
      }),
    );
    dirt.rotation.x = -Math.PI / 2; dirt.position.y = 0.012; dirt.receiveShadow = true; g.add(dirt);
    const ring = new THREE.Mesh(new THREE.RingGeometry(RING - 0.05, RING + 0.05, 72), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring);
    // 小坑（纯装饰）
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), new THREE.MeshBasicMaterial({ color: 0x4a3320, transparent: true, opacity: 0.6 }));
    hole.rotation.x = -Math.PI / 2; hole.position.set(0, 0.022, -4.6); g.add(hole);

    // 弹珠
    this.bodies = [];
    const cols = [0xff4a3d, 0x2f8bff, 0x35c46a, 0xffc21f, 0xb05cff, 0xff7fb8];
    const spots = [];
    for (const c of cols) {
      let x, z, ok, tries = 0;
      do {
        const a = rand(6.28), d = rand(0.2, 2.2);
        x = Math.cos(a) * d; z = Math.sin(a) * d - 0.2;
        ok = spots.every((s) => Math.hypot(s[0] - x, s[1] - z) > 0.95);
      } while (!ok && ++tries < 60);
      spots.push([x, z]);
      this.addBody(x, z, 0.26, c, false);
    }
    this.shooter = this.addBody(HOME.x, HOME.z, 0.31, 0xffffff, true);

    // 瞄准虚线
    this.dots = [];
    for (let i = 0; i < 9; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff2a8, transparent: true, opacity: 0.9 }));
      g.add(d); this.dots.push(d);
    }

    // 小朋友
    this.player = makeKid(46, { hero: true, girl: false, accent: 0xc23b30 });
    this.player.add(makeArrow());
    this.player.position.set(1.5, 0, 6.1); this.player.rotation.y = Math.PI + 0.5; g.add(this.player);
    this.watchers = [];
    ctx.npcNums(8).forEach((n, i) => {
      const k = makeKid(n);
      const a = Math.PI + 0.35 + (i / 7) * (Math.PI - 0.7);
      k.position.set(Math.cos(a) * 5.6, 0, Math.sin(a) * 5.2);
      k.lookAt(0, 0, 0);
      g.add(k); this.watchers.push({ k, squat: i % 2 === 0 });
    });

    this.angle = Math.PI; this.power = 0; this.ct = 0; this.charging = false;
    this.shots = SHOTS; this.score = 0; this.state = 'aim'; this.cheer = 0;
    this.running = false; this.over = false;
    ctx.cam([0, 7, 9.4], [0, 0, 1.1], 1);
    this.hud();
  }

  addBody(x, z, r, color, isShooter) {
    const m = makeMarble(r, color);
    m.position.set(x, r, z);
    m.rotation.set(rand(3), rand(3), rand(3));
    this.group.add(m);
    const b = { m, x, z, vx: 0, vz: 0, r, mass: r * r * r, out: false, isShooter };
    this.bodies.push(b);
    return b;
  }

  hud() {
    this.ctx.ui.info(`弹出圈外 ${this.score} / ${NEED}　　剩余弹珠 ${'●'.repeat(this.shots)}${'○'.repeat(SHOTS - this.shots)}`);
  }

  begin() { this.running = true; }

  update(dt, t) {
    const { ctx } = this, { input, ui, sfx } = ctx, s = this.shooter;
    this.cheer -= dt;
    animKid(this.player, this.over ? (this.won ? 'cheer' : 'out') : 'squat', t, dt);
    for (const w of this.watchers) animKid(w.k, this.cheer > 0 ? 'cheer' : w.squat ? 'squat' : 'idle', t, dt);

    if (this.running && this.state === 'aim') {
      const gp = ctx.groundPoint();
      if (gp && (input.pointerMoved || input.pointerPressed)) {
        const dx = gp.x - s.x, dz = gp.z - s.z;
        if (dx * dx + dz * dz > 0.1) this.angle = Math.atan2(dx, dz);
      }
      if (input.held('KeyA', 'ArrowLeft')) this.angle += dt * 1.3;
      if (input.held('KeyD', 'ArrowRight')) this.angle -= dt * 1.3;
      const hold = input.held('Space') || input.pointerDown;
      if (hold && !this.charging && (input.hit('Space') || input.pointerPressed)) { this.charging = true; this.ct = 0; }
      if (this.charging) {
        this.ct += dt * 1.5;
        const f = this.ct % 2;
        this.power = f < 1 ? f : 2 - f;
        ui.progress(this.power);
        if (!hold) {
          this.charging = false;
          const sp = 4.5 + this.power * 13;
          s.vx = Math.sin(this.angle) * sp; s.vz = Math.cos(this.angle) * sp;
          this.shots--; this.state = 'roll'; this.settle = 0;
          sfx.flick(); this.hud();
        }
      } else ui.progress(0);
      const len = this.charging ? 0.3 + this.power * 0.55 : 0.4;
      this.dots.forEach((d, i) => {
        d.visible = true;
        const k = 0.5 + i * len;
        d.position.set(s.x + Math.sin(this.angle) * k, 0.12, s.z + Math.cos(this.angle) * k);
        d.scale.setScalar(1 - i * 0.07);
      });
    } else this.dots.forEach((d) => (d.visible = false));

    if (this.state === 'roll') {
      const N = 4, h = dt / N;
      for (let n = 0; n < N; n++) this.step(h);
      let moving = false;
      for (const b of this.bodies) {
        const sp = Math.hypot(b.vx, b.vz);
        if (sp > 0.06) moving = true;
        if (!b.isShooter && !b.out && Math.hypot(b.x, b.z) > RING + b.r * 0.3) {
          b.out = true; this.score++; this.cheer = 1.4;
          sfx.ding(); ui.banner(`出圈！<small>${this.score} / ${NEED}</small>`, 900);
          ctx.fx.puff(b.m.position, 0xffe98a, 8, 0.7);
          this.hud();
        }
      }
      if (!moving) this.settle += dt; else this.settle = 0;
      if (this.settle > 0.35 && this.running) {
        if (this.score >= NEED) this.end(true);
        else if (this.shots <= 0) this.end(false, `弹珠打光了，只弹出了 ${this.score} 颗`);
        else {
          s.x = HOME.x; s.z = HOME.z; s.vx = s.vz = 0; s.m.position.set(s.x, s.r, s.z);
          this.state = 'aim'; ui.progress(0);
        }
      }
    }
    ctx.cam([0, 7, 9.4], [0, 0, 1.1], 1 - Math.exp(-dt * 4));
  }

  step(h) {
    const B = this.bodies, axis = new THREE.Vector3();
    for (const b of B) {
      const sp = Math.hypot(b.vx, b.vz);
      if (sp > 0) {
        const dec = (1.6 + sp * 0.55) * h, ns = Math.max(0, sp - dec);
        b.vx *= ns / sp; b.vz *= ns / sp;
        b.x += b.vx * h; b.z += b.vz * h;
        b.m.position.set(b.x, b.r, b.z);
        axis.set(b.vz, 0, -b.vx).normalize();
        b.m.rotateOnWorldAxis(axis, (ns * h) / b.r);
      }
    }
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
      const a = B[i], b = B[j];
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = a.r + b.r;
      if (d >= min || d === 0) continue;
      const nx = dx / d, nz = dz / d;
      const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
      const push = (min - d) / (a.mass + b.mass);
      a.x -= nx * push * b.mass; a.z -= nz * push * b.mass; b.x += nx * push * a.mass; b.z += nz * push * a.mass;
      if (rel > 0) continue;
      const imp = (-(1 + 0.93) * rel) / (1 / a.mass + 1 / b.mass);
      a.vx -= (imp / a.mass) * nx; a.vz -= (imp / a.mass) * nz;
      b.vx += (imp / b.mass) * nx; b.vz += (imp / b.mass) * nz;
      this.ctx.sfx.clack(clamp(-rel / 8, 0.1, 1));
    }
  }

  end(win, msg) {
    if (this.over) return;
    this.over = true; this.running = false; this.won = win;
    this.ctx.ui.progress(null);
    if (win) { this.cheer = 99; this.ctx.win(); } else this.ctx.lose(msg);
  }

  dispose() { this.ctx.scene.remove(this.group); }
}
