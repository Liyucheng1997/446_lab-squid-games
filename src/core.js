// 通用工具 + 角色与道具模型
import * as THREE from 'three';

export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const FONT = '"KaiTi","STKaiti","楷体","Microsoft YaHei",serif';

export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// 粉笔质感：随机擦掉一些小点
export function chalkify(g, w, h, n = 900) {
  g.save();
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < n; i++) {
    g.globalAlpha = Math.random() * 0.6;
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 2);
  }
  g.restore();
}

// 文字贴片（flat=true 平铺在地上，从 +z 方向看是正的）
export function label(text, o = {}) {
  const { w = 4, h = 1, color = '#fff', flat = true, opacity = 1, bg = null, chalk = true, weight = 'bold' } = o;
  const ch = 256, cw = Math.round((256 * w) / h);
  const tex = canvasTex(cw, ch, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); }
    let px = 190;
    g.font = `${weight} ${px}px ${FONT}`;
    const m = g.measureText(text).width;
    if (m > cw * 0.92) { px = (px * cw * 0.92) / m; g.font = `${weight} ${px}px ${FONT}`; }
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, cw / 2, ch / 2 + px * 0.04);
    if (chalk && !bg) chalkify(g, cw, ch, 500);
  });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: !bg, opacity, depthWrite: !!bg });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  if (flat) m.rotation.x = -Math.PI / 2;
  return m;
}

const matCache = {};
export function std(color, rough = 0.8, metal = 0) {
  const k = color + '_' + rough + '_' + metal;
  return (matCache[k] ||= new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
}

export function mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}
export const box = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);

export function tubeBetween(a, b, r, mat) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const d = vb.clone().sub(va), len = d.length();
  const m = mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  m.position.copy(va).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

/* ------------------------------------------------------------------ */
/* 小朋友                                                               */
/* ------------------------------------------------------------------ */
let KG = null;
function kidGeo() {
  if (KG) return KG;
  KG = {
    limb: new THREE.CapsuleGeometry(0.1, 0.2, 4, 12),
    shoe: new THREE.SphereGeometry(0.12, 14, 10),
    torso: new THREE.CapsuleGeometry(0.25, 0.26, 6, 20),
    yoke: new THREE.SphereGeometry(0.257, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    arm: new THREE.CapsuleGeometry(0.075, 0.26, 4, 10),
    hand: new THREE.SphereGeometry(0.085, 12, 10),
    head: new THREE.SphereGeometry(0.34, 32, 24),
    hair: new THREE.SphereGeometry(0.357, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.56),
    cap: new THREE.SphereGeometry(0.372, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.42),
    brim: new THREE.CylinderGeometry(0.2, 0.2, 0.03, 20),
    bang: new THREE.SphereGeometry(0.09, 10, 8),
    eye: new THREE.SphereGeometry(0.05, 12, 10),
    glint: new THREE.SphereGeometry(0.016, 6, 6),
    ear: new THREE.SphereGeometry(0.07, 10, 8),
    mouth: new THREE.TorusGeometry(0.06, 0.013, 6, 14, Math.PI),
    blush: new THREE.CircleGeometry(0.062, 16),
    scarf: new THREE.TorusGeometry(0.175, 0.045, 8, 20),
    knot: new THREE.ConeGeometry(0.075, 0.2, 4),
    bib: new THREE.PlaneGeometry(0.3, 0.2),
    ball: new THREE.SphereGeometry(1, 12, 10),
    stripe: new THREE.BoxGeometry(0.02, 0.5, 0.06),
  };
  return KG;
}
const bibCache = {};
function bibTex(n, hero) {
  const k = n + (hero ? 'h' : '');
  return (bibCache[k] ||= canvasTex(192, 128, (g, w, h) => {
    g.fillStyle = hero ? '#ffe45c' : '#fffdf5';
    g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 18); g.fill();
    g.strokeStyle = hero ? '#c23b30' : '#2f62b5'; g.lineWidth = 7; g.stroke();
    g.fillStyle = hero ? '#c23b30' : '#1d3f80';
    g.font = `bold 92px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(n).padStart(2, '0'), w / 2, h / 2 + 6);
  }));
}
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.25 });
const whiteBasic = new THREE.MeshBasicMaterial({ color: 0xffffff });
const blushMat = new THREE.MeshBasicMaterial({ color: 0xff8f8f, transparent: true, opacity: 0.55, depthWrite: false });
const mouthMat = new THREE.MeshStandardMaterial({ color: 0x9c3b32, roughness: 0.6 });

export function makeKid(num, opt = {}) {
  const G = kidGeo();
  const r = seeded(num * 7919 + 31);
  const hero = !!opt.hero;
  const girl = opt.girl ?? r() < 0.5;
  const accentHex = opt.accent ?? [0x2f62b5, 0x2f62b5, 0xc23b30, 0x23805a][Math.floor(r() * 4)];
  const skin = std([0xffd9b8, 0xf7c9a2, 0xedbb90, 0xffe0c4][Math.floor(r() * 4)], 0.75);
  const hairM = std([0x1d1512, 0x2a1d16, 0x33241b][Math.floor(r() * 3)], 0.6);
  const accent = std(accentHex, 0.85), white = std(0xfbf8ef, 0.9), red = std(0xd92b22, 0.8);
  const shoeM = std(r() < 0.5 ? 0xfafafa : 0x2b2b30, 0.6);

  const k = new THREE.Group(), rig = new THREE.Group();
  k.add(rig);
  const add = (p, geo, mat, x, y, z) => { const m = mesh(geo, mat, x, y, z); p.add(m); return m; };

  const leg = (sx) => {
    const hip = new THREE.Group(); hip.position.set(sx * 0.13, 0.66, 0);
    add(hip, G.limb, accent, 0, -0.15, 0);
    add(hip, G.stripe, white, sx * 0.1, -0.2, 0).castShadow = false;
    const knee = new THREE.Group(); knee.position.y = -0.3; hip.add(knee);
    add(knee, G.limb, accent, 0, -0.14, 0);
    const s = add(knee, G.shoe, shoeM, 0, -0.31, 0.05); s.scale.set(0.85, 0.6, 1.4);
    rig.add(hip);
    return { hip, knee };
  };
  const legL = leg(1), legR = leg(-1);

  const torso = add(rig, G.torso, white, 0, 0.98, 0); torso.scale.z = 0.88;
  const yoke = add(rig, G.yoke, accent, 0, 1.11, 0); yoke.scale.z = 0.88;
  const sc = add(rig, G.scarf, red, 0, 1.3, 0.01); sc.rotation.x = Math.PI / 2; sc.scale.set(1, 0.9, 1);
  const kn = add(rig, G.knot, red, 0, 1.19, 0.215); kn.rotation.set(Math.PI + 0.25, Math.PI / 4, 0);
  const bibM = new THREE.MeshStandardMaterial({ map: bibTex(num, hero), roughness: 0.9 });
  const b1 = add(rig, G.bib, bibM, 0, 0.93, 0.234); b1.castShadow = false;
  const b2 = add(rig, G.bib, bibM, 0, 0.98, -0.234); b2.rotation.y = Math.PI; b2.castShadow = false;

  const arm = (sx) => {
    const sh = new THREE.Group(); sh.position.set(sx * 0.3, 1.22, 0);
    add(sh, G.arm, accent, 0, -0.17, 0);
    add(sh, G.hand, skin, 0, -0.41, 0);
    rig.add(sh);
    return sh;
  };
  const armL = arm(1), armR = arm(-1);

  const head = new THREE.Group(); head.position.y = 1.62; rig.add(head);
  add(head, G.head, skin, 0, 0, 0);
  add(head, G.ear, skin, 0.33, -0.02, 0); add(head, G.ear, skin, -0.33, -0.02, 0);
  const hair = add(head, G.hair, hairM, 0, 0.005, 0); hair.rotation.x = -0.45;
  const nb = girl ? 6 : 5;
  for (let i = 0; i < nb; i++) {
    const a = (i / (nb - 1) - 0.5) * 1.5;
    const bg = add(head, G.bang, hairM, Math.sin(a) * 0.29, 0.2 - Math.abs(a) * 0.05, Math.cos(a) * 0.27);
    bg.scale.set(1, girl ? 1.05 : 0.7, 0.6); bg.castShadow = false;
  }
  if (girl) {
    if (r() < 0.55) {
      for (const sx of [1, -1]) {
        add(head, G.ball, hairM, sx * 0.35, -0.12, -0.08).scale.setScalar(0.12);
        add(head, G.ball, red, sx * 0.36, -0.22, -0.08).scale.setScalar(0.05);
        add(head, G.ball, hairM, sx * 0.37, -0.33, -0.08).scale.set(0.085, 0.13, 0.085);
      }
    } else {
      add(head, G.ball, red, 0, 0.16, -0.36).scale.setScalar(0.06);
      add(head, G.ball, hairM, 0, 0.1, -0.44).scale.set(0.12, 0.14, 0.12);
      add(head, G.ball, hairM, 0, -0.1, -0.47).scale.set(0.09, 0.2, 0.09);
    }
  } else if (r() < 0.5) {
    const t = add(head, G.knot, hairM, 0.03, 0.36, -0.05); t.rotation.z = -0.4; t.scale.setScalar(0.8);
  }
  if (hero) {
    const cap = add(head, G.cap, std(0xffd21f, 0.7), 0, 0.02, 0); cap.rotation.x = -0.28;
    const br = add(head, G.brim, std(0xffd21f, 0.7), 0, 0.2, 0.3); br.rotation.x = 0.25; br.scale.set(1.15, 1, 0.9);
    add(head, G.ball, std(0xffd21f, 0.7), 0, 0.39, -0.1).scale.setScalar(0.04);
  }
  const eyes = [];
  for (const sx of [1, -1]) {
    const e = add(head, G.eye, eyeMat, sx * 0.125, 0.02, 0.305); e.scale.set(1, 1.35, 0.6); e.castShadow = false;
    const gl = add(head, G.glint, whiteBasic, sx * 0.125 + 0.018, 0.045, 0.337); gl.castShadow = false;
    eyes.push(e, gl);
    const bl = add(head, G.blush, blushMat, sx * 0.205, -0.09, 0.27); bl.rotation.y = sx * 0.62; bl.castShadow = false;
  }
  const mouth = add(head, G.mouth, mouthMat, 0, -0.105, 0.322); mouth.rotation.z = Math.PI; mouth.castShadow = false;

  k.userData = {
    num, rig, head, armL, armR, legL, legR, eyes, mouth, ph: r() * 6.28,
    pose: { hl: 0, hr: 0, kl: 0, kr: 0, al: 0, ar: 0, zl: 0.1, zr: -0.1, y: 0, lean: 0, hx: 0, hz: 0 },
  };
  return k;
}

export function setFace(k, face) {
  const u = k.userData;
  const closed = face === 'out';
  u.eyes[0].scale.y = u.eyes[2].scale.y = closed ? 0.18 : 1.35;
  u.eyes[1].visible = u.eyes[3].visible = !closed;
  u.mouth.rotation.z = closed ? 0 : Math.PI;
  u.mouth.position.y = closed ? -0.16 : -0.105;
}

const POSE0 = { hl: 0, hr: 0, kl: 0, kr: 0, al: 0, ar: 0, zl: 0.1, zr: -0.1, y: 0, lean: 0, hx: 0, hz: 0 };
export function animKid(k, mode, t, dt = 0.016, sp = 1, extra) {
  const u = k.userData, ph = u.ph, p = { ...POSE0 };
  let stiff = 12;
  switch (mode) {
    case 'run': {
      const a = t * 11 * sp + ph, s = Math.sin(a), c = Math.cos(a);
      p.hl = s * 0.9; p.hr = -s * 0.9;
      p.kl = Math.max(0, -c) * 1.3 + 0.15; p.kr = Math.max(0, c) * 1.3 + 0.15;
      p.al = -s * 1.1; p.ar = s * 1.1; p.y = Math.abs(c) * 0.06; p.lean = 0.18; stiff = 30; break;
    }
    case 'idle':
      p.y = Math.sin(t * 2 + ph) * 0.01; p.hz = Math.sin(t * 1.1 + ph) * 0.06;
      p.al = Math.sin(t * 1.5 + ph) * 0.05; p.ar = -p.al; break;
    case 'cheer': {
      const w = Math.sin(t * 13 + ph) * 0.3;
      p.zl = 2.6 + w; p.zr = -2.6 + w; p.y = Math.abs(Math.sin(t * 6 + ph)) * 0.25; p.kl = p.kr = 0.2; stiff = 20; break;
    }
    case 'wave': p.zl = 2.5 + Math.sin(t * 9 + ph) * 0.35; p.hz = 0.08; break;
    case 'out': p.y = -0.5; p.hl = p.hr = -1.45; p.kl = p.kr = 0.25; p.zl = 0.6; p.zr = -0.6; p.hx = 0.4; p.lean = -0.15; break;
    case 'squat': p.y = -0.37; p.hl = p.hr = -1.25; p.kl = p.kr = 2.25; p.lean = 0.3; p.al = p.ar = -0.75; break;
    case 'tuck': p.hl = p.hr = -1.0; p.kl = p.kr = 1.6; p.zl = 0.9; p.zr = -0.9; stiff = 28; break;
    case 'hop': p.kl = 1.7; p.hl = 0.2; p.zl = 1.1; p.zr = -1.1; p.y = Math.abs(Math.sin(t * 5 + ph)) * 0.03; break;
    case 'throw': p.ar = -2.8; p.al = 0.5; p.lean = 0.2; stiff = 25; break;
    case 'ready': p.al = p.ar = -1.1; p.kl = p.kr = 0.3; p.hl = p.hr = -0.2; p.y = -0.03; break;
    case 'catch': p.al = p.ar = -2.5; p.zl = 0.3; p.zr = -0.3; stiff = 30; break;
  }
  if (extra) Object.assign(p, extra);
  const c = u.pose, f = Math.min(1, dt * stiff);
  for (const key in p) c[key] += (p[key] - c[key]) * f;
  u.legL.hip.rotation.x = c.hl; u.legR.hip.rotation.x = c.hr;
  u.legL.knee.rotation.x = c.kl; u.legR.knee.rotation.x = c.kr;
  u.armL.rotation.set(c.al, 0, c.zl); u.armR.rotation.set(c.ar, 0, c.zr);
  u.rig.position.y = c.y; u.rig.rotation.x = c.lean;
  u.head.rotation.set(c.hx, 0, c.hz);
}

// 头顶的小箭头，标出玩家
export function makeArrow() {
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 4), new THREE.MeshBasicMaterial({ color: 0xffd21f }));
  m.rotation.x = Math.PI;
  m.position.y = 2.45;
  return m;
}

/* ------------------------------------------------------------------ */
/* 铁皮青蛙（木头人的"鬼"）                                              */
/* ------------------------------------------------------------------ */
export function makeFrog() {
  const g = new THREE.Group();
  const green = new THREE.MeshStandardMaterial({ color: 0x58c044, roughness: 0.3, metalness: 0.45 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2f8a34, roughness: 0.35, metalness: 0.45 });
  const belly = new THREE.MeshStandardMaterial({ color: 0xf2e3a0, roughness: 0.4, metalness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b040, roughness: 0.25, metalness: 0.95 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf4c81e, roughness: 0.35, metalness: 0.7 });
  const S = (r, a = 36, b = 26) => new THREE.SphereGeometry(r, a, b);
  const body = mesh(S(1), green, 0, 0.95, 0); body.scale.set(1.25, 0.85, 1.5); g.add(body);
  const bl = mesh(S(1), belly, 0, 0.82, 0.12); bl.scale.set(1.12, 0.74, 1.42); g.add(bl);
  const seam = mesh(new THREE.TorusGeometry(1, 0.028, 8, 64), gold, 0, 0.95, 0);
  seam.rotation.x = Math.PI / 2; seam.scale.set(1.262, 1.512, 1); g.add(seam);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.add(mesh(S(0.045, 8, 6), gold, Math.cos(a) * 1.27, 0.95, Math.sin(a) * 1.52));
  }
  // 斑点
  const sr = seeded(5);
  for (let i = 0; i < 12; i++) {
    const a = sr() * 6.28, e = 0.35 + sr() * 0.9;
    const n = new THREE.Vector3(Math.cos(a) * Math.sin(e), Math.cos(e), Math.sin(a) * Math.sin(e));
    if (n.z > 0.55) continue;
    const sp = mesh(S(0.14 + sr() * 0.1, 12, 8), i % 3 ? dark : yellow, n.x * 1.25, 0.95 + n.y * 0.85, n.z * 1.5);
    sp.scale.y = 0.25; sp.lookAt(sp.position.clone().add(n)); sp.rotateX(Math.PI / 2);
    g.add(sp);
  }
  // 眼睛
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, emissive: 0xff2200, emissiveIntensity: 0 });
  for (const sx of [1, -1]) {
    g.add(mesh(S(0.36), green, sx * 0.56, 1.62, 0.8));
    const w = mesh(S(0.27), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 }), sx * 0.57, 1.66, 0.95); g.add(w);
    const p = mesh(S(0.14, 16, 12), pupilMat, sx * 0.57, 1.67, 1.17); p.scale.z = 0.5; g.add(p);
    // 后腿
    const th = mesh(S(1), dark, sx * 1.2, 0.5, -0.55); th.scale.set(0.42, 0.5, 0.95); th.rotation.x = -0.3; g.add(th);
    const ft = mesh(S(1), yellow, sx * 1.4, 0.1, 0.1); ft.scale.set(0.3, 0.1, 0.8); g.add(ft);
    // 前腿
    const fl = mesh(new THREE.CapsuleGeometry(0.14, 0.5, 4, 10), dark, sx * 0.85, 0.36, 1.0); fl.rotation.z = sx * 0.25; g.add(fl);
    const ff = mesh(S(1), yellow, sx * 0.95, 0.07, 1.2); ff.scale.set(0.26, 0.07, 0.36); g.add(ff);
  }
  // 嘴
  const mouth = mesh(new THREE.TorusGeometry(1, 0.035, 8, 48, Math.PI), new THREE.MeshStandardMaterial({ color: 0x8a1c14, roughness: 0.5 }), 0, 0.92, 0.42);
  mouth.rotation.x = Math.PI / 2; mouth.scale.set(1.08, 1.12, 1); g.add(mouth);
  // 发条钥匙
  const key = new THREE.Group(); key.position.set(1.22, 1.05, -0.35);
  const shaft = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 10), gold, 0.3, 0, 0); shaft.rotation.z = Math.PI / 2; key.add(shaft);
  for (const sy of [1, -1]) {
    const loop = mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 20), gold, 0.62, sy * 0.2, 0); loop.rotation.y = Math.PI / 2; key.add(loop);
  }
  g.add(key);
  g.userData = { pupilMat, key };
  return g;
}

/* ------------------------------------------------------------------ */
/* 玻璃弹珠 / 沙包                                                       */
/* ------------------------------------------------------------------ */
export function makeMarble(r, color) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(r, 28, 20),
    new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.45), roughness: 0.02, transparent: true, opacity: 0.6, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.2 }),
  );
  glass.castShadow = true;
  g.add(glass);
  const vm = new THREE.MeshStandardMaterial({ color, roughness: 0.3, emissive: color, emissiveIntensity: 0.25 });
  for (let i = 0; i < 3; i++) {
    const v = new THREE.Mesh(new THREE.SphereGeometry(r * 0.8, 14, 10), vm);
    v.scale.set(1, 0.14, 0.5);
    v.rotation.set(0.5, 0, (i * Math.PI) / 3);
    g.add(v);
  }
  return g;
}

export function makeSandbag(s = 0.34) {
  const cols = [0xd8402f, 0x2f62b5, 0xf2c230, 0x2e9a5b, 0xe77fa3, 0xf5efe0];
  const mats = cols.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }));
  const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s, 3, 3, 3), mats);
  // 把方块鼓成布包
  const p = m.geometry.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize().multiplyScalar(s * 0.72);
    v.lerp(n, 0.55);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  m.geometry.computeVertexNormals();
  m.castShadow = true;
  return m;
}

/* ------------------------------------------------------------------ */
/* 粒子特效                                                             */
/* ------------------------------------------------------------------ */
export class FX {
  constructor(scene) {
    this.scene = scene; this.items = [];
    this.sg = new THREE.SphereGeometry(1, 8, 6);
    this.pg = new THREE.PlaneGeometry(0.2, 0.11);
  }
  puff(pos, color = 0xffffff, n = 14, size = 1) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.sg, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
      m.position.copy(pos); m.position.y += 0.3;
      const s = rand(0.08, 0.2) * size; m.scale.setScalar(s);
      this.scene.add(m);
      this.items.push({ m, v: new THREE.Vector3(rand(-1.6, 1.6), rand(0.6, 2.6), rand(-1.6, 1.6)).multiplyScalar(size), life: rand(0.5, 0.9), t: 0, g: -1.5, grow: 1.6, s });
    }
  }
  confetti(pos, n = 140) {
    const cols = [0xff5a4f, 0xffd21f, 0x4fb6ff, 0x67d36e, 0xff8fc6, 0xffffff];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.pg, new THREE.MeshBasicMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide, transparent: true }));
      m.position.copy(pos).add(new THREE.Vector3(rand(-1, 1), rand(1.5, 3), rand(-1, 1)));
      this.scene.add(m);
      this.items.push({ m, v: new THREE.Vector3(rand(-4, 4), rand(4, 10), rand(-4, 4)), life: rand(2.2, 3.6), t: 0, g: -9, spin: new THREE.Vector3(rand(-9, 9), rand(-9, 9), rand(-9, 9)), drag: 1.6 });
    }
  }
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.t += dt;
      p.v.y += p.g * dt;
      if (p.drag) { p.v.multiplyScalar(1 - p.drag * dt); if (p.v.y < -2) p.v.y = -2; }
      p.m.position.addScaledVector(p.v, dt);
      if (p.spin) { p.m.rotation.x += p.spin.x * dt; p.m.rotation.y += p.spin.y * dt; }
      if (p.grow) p.m.scale.setScalar(p.s * (1 + p.t * p.grow * 2));
      const k = 1 - p.t / p.life;
      p.m.material.opacity = Math.min(1, k * 1.6) * (p.spin ? 1 : 0.85);
      if (k <= 0 || p.m.position.y < -0.2) {
        this.scene.remove(p.m); p.m.material.dispose(); this.items.splice(i, 1);
      }
    }
  }
}
