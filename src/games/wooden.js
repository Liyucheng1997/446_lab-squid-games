// 第一关：一二三木头人
import * as THREE from 'three';
import { makeKid, animKid, setFace, makeFrog, makeArrow, label, box, std, rand, clamp } from '../core.js';

const START = 20, END = -15;
const WORDS = '一二三木头人';

export class WoodenMan {
  constructor(ctx) {
    this.ctx = ctx;
    const g = (this.group = new THREE.Group());
    ctx.scene.add(g);

    const lineM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (const z of [START - 1.2, END]) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(27, 0.22), lineM);
      l.rotation.x = -Math.PI / 2; l.position.set(0, 0.02, z); g.add(l);
    }
    const fin = label('终 点', { w: 5, h: 1.6, color: '#ffe98a', opacity: 0.9 }); fin.position.set(0, 0.02, END - 1.4); g.add(fin);

    // 青蛙和课桌垒的台子
    g.add(box(8, 1.5, 6.4, std(0x9a6a3a, 0.7), 0, 0.75, -24));
    g.add(box(8.4, 0.16, 6.8, std(0xb9854a, 0.6), 0, 1.55, -24));
    for (const x of [-3.7, 3.7]) for (const z of [-26.9, -21.1]) g.add(box(0.3, 1.5, 0.3, std(0x4f8f76, 0.6), x, 0.75, z));
    this.frog = makeFrog();
    this.frog.scale.setScalar(3.2);
    this.frog.position.set(0, 1.63, -24);
    this.frog.rotation.y = Math.PI;
    g.add(this.frog);
    this.eyeLight = new THREE.PointLight(0xff2a10, 0, 40, 1.5);
    this.eyeLight.position.set(0, 6.5, -20); g.add(this.eyeLight);

    // 玩家
    this.player = makeKid(46, { hero: true, girl: false, accent: 0xc23b30 });
    this.player.add(makeArrow());
    this.player.position.set(0, 0, START);
    this.player.rotation.y = Math.PI;
    g.add(this.player);
    this.v = 0; this.runT = 0;

    // 其他小朋友
    this.npcs = [];
    const nums = ctx.npcNums(Math.min(29, ctx.alive - 1));
    nums.forEach((n, i) => {
      const k = makeKid(n);
      let x = -12.5 + (i / (nums.length - 1)) * 25;
      if (Math.abs(x) < 1.1) x += x < 0 ? -1.1 : 1.1;
      k.position.set(x + rand(-0.25, 0.25), 0, START + rand(-0.3, 2.6));
      k.rotation.y = Math.PI;
      g.add(k);
      this.npcs.push({ k, sp: rand(2.8, 4.4), state: 'idle', t: rand(10), delay: 0, stopAt: 1, fail: false, endZ: END - rand(1.5, 5) });
    });

    this.time = 60; this.phase = 'wait'; this.running = false; this.over = false;
    ctx.cam([0, 6, START + 10], [0, 3, -10], 1);
  }

  begin() { this.running = true; this.startChant(); }

  startChant() {
    this.phase = 'chant'; this.pt = 0; this.syl = -1;
    const quick = Math.random() < 0.28;
    this.dur = quick ? rand(1.1, 1.6) : rand(2.2, 4.2);
    const e = [1, 0.55, 1.9][Math.floor(rand(3))];
    this.marks = [0, 1, 2, 3, 4, 5].map((i) => Math.pow(i / 6, e));
    for (const n of this.npcs) {
      if (n.state === 'out' || n.state === 'done') continue;
      n.delay = rand(0.05, 0.45); n.stopAt = this.dur * rand(0.7, 0.97); n.fail = Math.random() < 0.075;
    }
  }

  catchKid(k) {
    setFace(k, 'out');
    this.ctx.fx.puff(k.position, 0xffffff, 16);
    this.ctx.sfx.pop();
  }

  update(dt, t) {
    const { ctx, player: P } = this, { input, ui, sfx } = ctx;
    const frog = this.frog;
    frog.userData.key.rotation.x += dt * (this.phase === 'chant' ? 6 : 0.5);

    if (this.running) {
      this.time -= dt;
      ui.timer(this.time);
      if (this.time <= 0) { this.end(false, '时间到了，你还没跑到终点'); }
    }

    /* ---- 青蛙的状态机 ---- */
    if (this.running || this.phase === 'watch') {
      if (this.phase === 'chant') {
        this.pt += dt;
        while (this.syl < 5 && this.pt >= this.marks[this.syl + 1] * this.dur) {
          this.syl++;
          sfx.chant(this.syl);
          ui.banner(`<span class="chant">${WORDS.slice(0, this.syl + 1)}<i>${WORDS.slice(this.syl + 1)}</i></span>`, 0);
        }
        frog.position.y = 1.63 + Math.abs(Math.sin(this.pt * 9)) * 0.12;
        if (this.pt >= this.dur) { this.phase = 'turn'; this.tt = 0; sfx.whoosh(); }
      } else if (this.phase === 'turn') {
        this.tt += dt / 0.3;
        frog.rotation.y = Math.PI * (1 - easeOut(clamp(this.tt, 0, 1)));
        if (this.tt >= 1) {
          this.phase = 'watch'; this.wt = rand(1.7, 3.1); this.we = 0;
          ui.banner('<span class="stare">不许动！</span>', 0); ui.vignette(true); sfx.stare();
        }
      } else if (this.phase === 'watch') {
        this.we += dt;
        frog.userData.pupilMat.emissiveIntensity = 3; this.eyeLight.intensity = 60;
        if (this.running && this.v > 0.35) {
          this.catchKid(P);
          this.end(false, '你动了！被铁皮青蛙逮了个正着');
        }
        if (this.running && this.we >= this.wt) { this.phase = 'back'; this.tt = 0; ui.vignette(false); ui.banner('', 0); }
      } else if (this.phase === 'back') {
        this.tt += dt / 0.4;
        frog.userData.pupilMat.emissiveIntensity = 0; this.eyeLight.intensity = 0;
        frog.rotation.y = Math.PI * easeOut(clamp(this.tt, 0, 1));
        if (this.tt >= 1) this.startChant();
      }
    }

    /* ---- 玩家 ---- */
    const go = this.running && (input.held('Space', 'KeyW', 'ArrowUp') || input.pointerDown);
    if (go) this.v = Math.min(5.2, this.v + 16 * dt);
    else this.v = Math.max(0, this.v - 17 * dt);
    if (this.running) {
      P.position.z -= this.v * dt;
      ui.progress((START - P.position.z) / (START - END));
      if (P.position.z <= END) { this.end(true); }
    }
    if (this.over) animKid(P, this.won ? 'cheer' : 'out', t, dt);
    else if (this.v > 0.2) { this.runT += dt * (this.v / 5.2); animKid(P, 'run', this.runT, dt); }
    else if (!this.running) animKid(P, 'idle', t, dt);
    // 停下时保持跑步的定格姿势

    /* ---- NPC ---- */
    for (const n of this.npcs) {
      const k = n.k;
      if (n.state === 'out') { animKid(k, 'out', t, dt); continue; }
      if (n.state === 'done') { animKid(k, 'cheer', t, dt); continue; }
      if (!this.running && !this.over) { animKid(k, 'idle', t, dt); continue; }
      if (this.over) continue;
      let move = false;
      if (this.phase === 'chant') move = this.pt > n.delay && (this.pt < n.stopAt || n.fail);
      else if (this.phase === 'turn') move = n.fail;
      else if (this.phase === 'watch' && n.fail) {
        if (this.we < rand(0.2, 0.5)) move = true;
        else { n.state = 'out'; this.catchKid(k); continue; }
      }
      if (move) {
        n.t += dt; k.position.z -= n.sp * dt; animKid(k, 'run', n.t, dt, n.sp / 4.4);
        if (k.position.z <= n.endZ) { n.state = 'done'; k.rotation.y = 0; }
      }
    }

    // 镜头
    const pz = P.position.z;
    ctx.cam([P.position.x * 0.4 + 1.2, 5, pz + 8.5], [0, 2.4, pz - 14], 1 - Math.exp(-dt * 5));
  }

  end(win, msg) {
    if (this.over) return;
    this.over = true; this.running = false; this.won = win; this.v = 0;
    this.ctx.ui.vignette(false);
    if (win) { this.ctx.ui.banner('', 0); this.player.rotation.y = 0; this.ctx.win(); }
    else { this.phase = 'watch'; this.we = 0; this.wt = 99; this.ctx.lose(msg); }
  }

  dispose() { this.ctx.scene.remove(this.group); }
}
const easeOut = (x) => 1 - (1 - x) * (1 - x);
