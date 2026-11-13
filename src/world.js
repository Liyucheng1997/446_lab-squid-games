// 九十年代小学操场（黄昏）
import * as THREE from 'three';
import { canvasTex, label, std, mesh, box, tubeBetween, seeded, chalkify, FONT } from './core.js';

export function buildWorld(scene) {
  const updates = [];
  const R = seeded(2024);
  const rr = (a, b) => a + R() * (b - a);

  /* ---------- 天空 ---------- */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(400, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec3 vP;
        void main(){
          vec3 d=normalize(vP); float h=d.y;
          vec3 bot=vec3(1.,.62,.30), mid=vec3(.95,.45,.33), top=vec3(.16,.26,.50);
          vec3 c=mix(bot,mid,smoothstep(-.02,.16,h));
          c=mix(c,top,smoothstep(.12,.62,h));
          vec3 sd=normalize(vec3(-.62,.2,-.55));
          float s=max(dot(d,sd),0.);
          c+=vec3(1.,.72,.38)*(pow(s,10.)*.45+pow(s,600.)*3.);
          gl_FragColor=vec4(c,1.);
          #include <colorspace_fragment>
        }`,
    }),
  );
  scene.add(sky);
  scene.fog = new THREE.Fog(0xf0a878, 70, 230);

  // 云
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffd0b0, fog: false, transparent: true, opacity: 0.92 });
  const cg = new THREE.SphereGeometry(1, 14, 10);
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group();
    const a = rr(0, 6.28), d = rr(150, 240);
    c.position.set(Math.cos(a) * d, rr(45, 90), Math.sin(a) * d);
    for (let j = 0; j < 6; j++) {
      const s = new THREE.Mesh(cg, cloudMat);
      s.position.set(rr(-16, 16), rr(-2, 2), rr(-5, 5));
      s.scale.set(rr(8, 15), rr(4, 6), rr(6, 9));
      c.add(s);
    }
    scene.add(c);
    updates.push((t, dt) => { c.position.x += dt * 0.6; if (c.position.x > 260) c.position.x = -260; });
  }

  /* ---------- 灯光 ---------- */
  scene.add(new THREE.HemisphereLight(0xffe0c4, 0x6a5444, 0.8));
  const sun = new THREE.DirectionalLight(0xffc48a, 2.7);
  sun.position.set(-34, 30, -6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -44, right: 44, top: 40, bottom: -40, near: 1, far: 120 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x9db8ff, 0.45);
  fill.position.set(20, 15, 30);
  scene.add(fill);

  /* ---------- 地面 ---------- */
  const groundTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#ab8f6a'; g.fillRect(0, 0, w, h);
    const cols = ['#b39872', '#d9c4a0', '#a58a66', '#e3d2b4', '#bfa580'];
    for (let i = 0; i < 9000; i++) {
      g.globalAlpha = Math.random() * 0.35;
      g.fillStyle = cols[i % cols.length];
      const s = 1 + Math.random() * 3;
      g.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 60;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, i % 2 ? 'rgba(120,95,65,.16)' : 'rgba(240,225,195,.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, [26, 26]);
  const ground = mesh(new THREE.PlaneGeometry(320, 320), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.96, color: 0xd6c6b2 }), 0, 0, 0, false);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // 地上的粉笔涂鸦
  const doodle = (draw, x, z, s, rot = 0) => {
    const t = canvasTex(512, 512, (g, w, h) => {
      g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
      draw(g); chalkify(g, w, h, 2500);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.7, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, 0.015, z);
    scene.add(m);
  };
  doodle((g) => { // 太阳和花
    g.strokeStyle = '#ffe98a';
    g.beginPath(); g.arc(130, 130, 55, 0, 7); g.stroke();
    for (let i = 0; i < 10; i++) { const a = i * 0.628; g.beginPath(); g.moveTo(130 + Math.cos(a) * 70, 130 + Math.sin(a) * 70); g.lineTo(130 + Math.cos(a) * 100, 130 + Math.sin(a) * 100); g.stroke(); }
    g.strokeStyle = '#ffb3cf';
    for (let i = 0; i < 6; i++) { const a = i * 1.047; g.beginPath(); g.arc(360 + Math.cos(a) * 42, 300 + Math.sin(a) * 42, 26, 0, 7); g.stroke(); }
    g.strokeStyle = '#b8f0b0'; g.beginPath(); g.moveTo(360, 345); g.quadraticCurveTo(340, 420, 365, 490); g.stroke();
  }, -22, 20, 6, 0.3);
  doodle((g) => { // 火柴人和字
    for (const [x, c] of [[150, '#fff'], [330, '#ffd0e0']]) {
      g.strokeStyle = c;
      g.beginPath(); g.arc(x, 150, 38, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(x, 188); g.lineTo(x, 320); g.moveTo(x - 55, 240); g.lineTo(x + 55, 240);
      g.moveTo(x, 320); g.lineTo(x - 40, 400); g.moveTo(x, 320); g.lineTo(x + 40, 400); g.stroke();
    }
    g.fillStyle = '#fff'; g.font = `bold 58px ${FONT}`; g.textAlign = 'center';
    g.fillText('我们是好朋友', 256, 480);
  }, 22, -4, 5.5, -0.5);
  doodle((g) => { // 井字棋
    g.strokeStyle = '#cfe6ff';
    for (const p of [180, 330]) { g.beginPath(); g.moveTo(p, 40); g.lineTo(p, 470); g.moveTo(40, p); g.lineTo(470, p); g.stroke(); }
    g.beginPath(); g.arc(105, 105, 45, 0, 7); g.stroke(); g.beginPath(); g.arc(400, 255, 45, 0, 7); g.stroke();
    g.strokeStyle = '#fff';
    for (const [x, y] of [[255, 255], [105, 400], [400, 105]]) { g.beginPath(); g.moveTo(x - 40, y - 40); g.lineTo(x + 40, y + 40); g.moveTo(x + 40, y - 40); g.lineTo(x - 40, y + 40); g.stroke(); }
  }, -24, -2, 4, 0.2);

  /* ---------- 红砖围墙 ---------- */
  const brickDraw = (g, w, h) => {
    g.fillStyle = '#b9a58c'; g.fillRect(0, 0, w, h);
    const bw = 64, bh = 32;
    for (let y = 0; y < h / bh; y++) for (let x = -1; x < w / bw; x++) {
      const tone = 150 + Math.random() * 50;
      g.fillStyle = `rgb(${tone},${tone * 0.42},${tone * 0.3})`;
      g.fillRect(x * bw + (y % 2 ? bw / 2 : 0) + 2, y * bh + 2, bw - 4, bh - 4);
    }
    for (let i = 0; i < 1500; i++) { g.globalAlpha = Math.random() * 0.2; g.fillStyle = i % 2 ? '#000' : '#fff'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  };
  const brickMat = (rx, ry) => new THREE.MeshStandardMaterial({ map: canvasTex(512, 256, brickDraw, [rx, ry]), roughness: 0.92 });
  const capMat = std(0x9a958c, 0.9);
  const wall = (len, x, z, ry) => {
    const g = new THREE.Group();
    g.add(box(len, 3, 0.5, brickMat(len / 4, 1.5), 0, 1.5, 0));
    g.add(box(len + 0.2, 0.18, 0.7, capMat, 0, 3.09, 0));
    for (let i = -len / 2; i <= len / 2 + 0.1; i += 9) { g.add(box(0.8, 3.4, 0.8, brickMat(0.2, 1.7), i, 1.7, 0)); g.add(box(1, 0.2, 1, capMat, i, 3.5, 0)); }
    g.position.set(x, 0, z); g.rotation.y = ry;
    scene.add(g);
  };
  wall(72, 36, 0, Math.PI / 2); wall(72, -36, 0, Math.PI / 2); wall(72, 0, 36, 0);

  // 东墙标语：好好学习 天天向上
  '好好学习天天向上'.split('').forEach((ch, i) => {
    const m = label(ch, { w: 2.1, h: 2.1, color: '#c8281e', bg: '#f4eedf', flat: false, chalk: false });
    m.position.set(35.7, 1.55, -11.5 + i * 3 + (i > 3 ? 1.5 : 0));
    m.rotation.y = -Math.PI / 2;
    scene.add(m);
  });

  // 西墙黑板报
  {
    const t = canvasTex(1024, 512, (g, w, h) => {
      g.fillStyle = '#243b30'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffe98a'; g.font = `bold 110px ${FONT}`; g.textAlign = 'center';
      g.fillText('课间十分钟', w / 2, 130);
      g.fillStyle = '#fff'; g.font = `52px ${FONT}`; g.textAlign = 'left';
      ['· 木头人不许动', '· 弹珠赢了不许哭', '· 沙包不许砸脸', '· 跳绳排队不插队'].forEach((s, i) => g.fillText(s, 70, 230 + i * 68));
      g.strokeStyle = '#ffb3cf'; g.lineWidth = 8;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(800 + Math.cos(i * 1.256) * 50, 300 + Math.sin(i * 1.256) * 50, 34, 0, 7); g.stroke(); }
      g.strokeStyle = '#b8f0b0'; g.beginPath(); g.moveTo(800, 350); g.lineTo(800, 470); g.stroke();
      g.strokeStyle = '#fff'; g.setLineDash([24, 14]); g.strokeRect(24, 24, w - 48, h - 48);
      chalkify(g, w, h, 5000);
    });
    const bb = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
    bb.position.set(-35.7, 1.75, -6); bb.rotation.y = Math.PI / 2;
    scene.add(bb);
    const fr = box(0.16, 4.8, 9.3, std(0x8a5a2e, 0.7), -35.78, 1.75, -6); scene.add(fr);
  }

  /* ---------- 教学楼 ---------- */
  {
    const B = new THREE.Group(); B.position.set(0, 0, -41);
    const wallM = std(0xf1e8d6, 0.9), greenM = std(0x4f8f76, 0.75), roofM = std(0xa8452f, 0.8);
    B.add(box(60, 8.2, 10, wallM, 0, 4.1, 0));
    B.add(box(60.1, 1.3, 10.1, greenM, 0, 0.65, 0));
    B.add(box(60.3, 0.25, 10.4, std(0xd9cfba, 0.9), 0, 4.2, 0));
    B.add(box(62, 0.4, 12, std(0x8f8a82, 0.9), 0, 8.4, 0));
    const tri = new THREE.Shape(); tri.moveTo(-6.3, 0); tri.lineTo(6.3, 0); tri.lineTo(0, 2.6); tri.closePath();
    const roof = mesh(new THREE.ExtrudeGeometry(tri, { depth: 62, bevelEnabled: false }), roofM, -31, 8.6, 0);
    roof.rotation.y = Math.PI / 2; B.add(roof);
    const winTex = canvasTex(256, 300, (g, w, h) => {
      g.fillStyle = '#3d7a66'; g.fillRect(0, 0, w, h);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
        const x = 14 + c * 120, y = 14 + r * 94;
        const gr = g.createLinearGradient(0, y, 0, y + 84);
        gr.addColorStop(0, '#ffeaa8'); gr.addColorStop(1, '#ffc56b');
        g.fillStyle = gr; g.fillRect(x, y, 108, 82);
        g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(x, y + 82); g.lineTo(x + 50, y); g.lineTo(x + 70, y); g.lineTo(x + 20, y + 82); g.fill();
      }
      g.fillStyle = 'rgba(190,80,60,.55)'; g.fillRect(14, 14, 40, 270); g.fillRect(202, 14, 40, 270);
    });
    const winM = new THREE.MeshStandardMaterial({ map: winTex, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.7, roughness: 0.4 });
    const wg = new THREE.PlaneGeometry(2.4, 2.6);
    for (let f = 0; f < 2; f++) for (let i = 0; i < 10; i++) {
      const x = -24.3 + i * 5.4;
      const w = new THREE.Mesh(wg, winM); w.position.set(x, 2.75 + f * 3.75, 5.06); B.add(w);
      B.add(box(2.7, 0.14, 0.4, std(0xd9cfba, 0.9), x, 1.38 + f * 3.75, 5.15));
    }
    // 大门
    B.add(box(2.3, 3.1, 0.3, std(0x7a4a26, 0.6), 0, 1.55, 5.05));
    B.add(box(1, 2.7, 0.34, std(0x8e5a30, 0.6), -0.55, 1.45, 5.06)); B.add(box(1, 2.7, 0.34, std(0x8e5a30, 0.6), 0.55, 1.45, 5.06));
    B.add(box(3.6, 0.2, 1.6, capMat, 0, 0.1, 5.8)); B.add(box(4.4, 0.1, 2.2, capMat, 0, 0.05, 6));
    B.add(box(3.4, 0.2, 1.5, greenM, 0, 3.4, 5.6));
    const sign = label('向阳小学', { w: 0.7, h: 2.8, color: '#111', bg: '#fbf8ef', flat: false, chalk: false });
    // 竖排校牌
    sign.material.map = canvasTex(128, 512, (g, w, h) => {
      g.fillStyle = '#fbf8ef'; g.fillRect(0, 0, w, h); g.fillStyle = '#151515'; g.font = `bold 96px ${FONT}`; g.textAlign = 'center';
      '向阳小学'.split('').forEach((c, i) => g.fillText(c, w / 2, 110 + i * 120));
    });
    sign.position.set(1.75, 1.9, 5.22); B.add(sign);
    scene.add(B);
  }

  // 旗杆和小红旗
  {
    const silver = std(0xd8d8d8, 0.3, 0.9);
    scene.add(mesh(new THREE.CylinderGeometry(0.09, 0.12, 13, 12), silver, -17, 6.5, -30));
    scene.add(mesh(new THREE.SphereGeometry(0.2, 12, 10), std(0xe0b040, 0.3, 0.9), -17, 13.1, -30));
    scene.add(mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.5, 20), capMat, -17, 0.25, -30));
    const fg = new THREE.PlaneGeometry(3.4, 2.1, 18, 8); fg.translate(1.7, 0, 0);
    const flag = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ color: 0xd9281f, side: THREE.DoubleSide, roughness: 0.8 }));
    flag.position.set(-16.9, 11.7, -30); flag.castShadow = true;
    scene.add(flag);
    const base = fg.attributes.position.array.slice();
    updates.push((t) => {
      const p = fg.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3];
        p.setZ(i, Math.sin(x * 2.2 - t * 5) * 0.16 * x * 0.5);
        p.setY(i, base[i * 3 + 1] + Math.sin(x * 1.7 - t * 4) * 0.04 * x);
      }
      p.needsUpdate = true; fg.computeVertexNormals();
    });
  }

  /* ---------- 老槐树 ---------- */
  const leafGeo = new THREE.SphereGeometry(1, 18, 14);
  {
    const p = leafGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 1 + (Math.sin(p.getX(i) * 7) + Math.cos(p.getY(i) * 8) + Math.sin(p.getZ(i) * 6)) * 0.05;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
    }
    leafGeo.computeVertexNormals();
  }
  const leafMats = [0x4f8f3a, 0x5fa043, 0x3f7a33, 0x77ad4a].map((c) => std(c, 0.9));
  const tree = (x, z, s = 1) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
    const bark = std(0x5d4330, 0.95);
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.85, 4.6, 12), bark, 0, 2.3, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.9, 1.15, 0.5, 12), bark, 0, 0.2, 0));
    g.add(tubeBetween([0, 3.8, 0], [2.2, 6.2, 0.6], 0.25, bark));
    g.add(tubeBetween([0, 4, 0], [-2, 6.4, -0.8], 0.28, bark));
    g.add(tubeBetween([0, 4.2, 0], [0.3, 6.8, 1.6], 0.22, bark));
    const blobs = [];
    for (let i = 0; i < 16; i++) {
      const a = rr(0, 6.28), d = rr(0, 3.4), y = rr(5.6, 9);
      const l = mesh(leafGeo, leafMats[i % 4], Math.cos(a) * d, y, Math.sin(a) * d);
      l.scale.setScalar(rr(1.5, 2.5) * (1 - (y - 5.6) * 0.09));
      l.rotation.set(rr(0, 3), rr(0, 3), 0);
      g.add(l); blobs.push(l);
    }
    updates.push((t) => blobs.forEach((b, i) => { b.rotation.z = Math.sin(t * 0.8 + i) * 0.04; }));
    scene.add(g);
    return g;
  };
  const t1 = tree(-26, -17, 1.15);
  tree(27, 14, 1);
  tree(-48, 20, 1.3); tree(50, -10, 1.4); tree(20, 50, 1.3);
  // 树下的石凳和上课铃
  scene.add(box(2.6, 0.18, 0.8, capMat, -23, 0.62, -13.6)); scene.add(box(0.3, 0.55, 0.7, capMat, -24, 0.27, -13.6)); scene.add(box(0.3, 0.55, 0.7, capMat, -22, 0.27, -13.6));
  {
    const iron = std(0x4a4038, 0.5, 0.8);
    const bell = new THREE.Group(); bell.position.set(-23.4, 6.9, -16.2);
    bell.add(tubeBetween([0, 0, 0], [0, -1.6, 0], 0.02, iron));
    bell.add(mesh(new THREE.CylinderGeometry(0.16, 0.36, 0.55, 16, 1, true), iron, 0, -1.85, 0));
    bell.add(mesh(new THREE.SphereGeometry(0.17, 12, 8, 0, 6.3, 0, 1.6), iron, 0, -1.6, 0));
    scene.add(bell);
    updates.push((t) => { bell.rotation.z = Math.sin(t * 1.3) * 0.05; });
  }

  /* ---------- 水泥乒乓球台 ---------- */
  {
    const g = new THREE.Group(); g.position.set(25, 0, -17); g.rotation.y = 0.25;
    const con = std(0xa9a59c, 0.95);
    g.add(box(3.6, 0.16, 2, con, 0, 1, 0));
    g.add(box(0.5, 0.92, 1.5, con, -1.2, 0.46, 0)); g.add(box(0.5, 0.92, 1.5, con, 1.2, 0.46, 0));
    for (let i = 0; i < 8; i++) g.add(box(0.12, 0.2, 0.24, std(0xa8492f, 0.9), 0, 1.18, -0.9 + i * 0.257));
    const ball = mesh(new THREE.SphereGeometry(0.05, 10, 8), std(0xffa52a, 0.4), 0.9, 1.13, 0.3); g.add(ball);
    scene.add(g);
  }

  /* ---------- 单杠 ---------- */
  {
    const steel = std(0x5f7fa8, 0.35, 0.7);
    [[1.5, -29], [1.9, -26.6], [2.3, -24.2]].forEach(([h, x], i, arr) => {
      scene.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, h + 0.1, 10), steel, x, h / 2, 12));
      if (i === arr.length - 1) scene.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, h + 0.1, 10), steel, x + 2.4, h / 2, 12));
      scene.add(tubeBetween([x, h, 12], [x + 2.4, h, 12], 0.035, std(0xcfd4da, 0.25, 0.9)));
    });
  }

  /* ---------- 彩色轮胎 ---------- */
  [0xd8402f, 0xf2c230, 0x2f62b5, 0x2e9a5b, 0xe77fa3, 0xf5efe0].forEach((c, i) => {
    const t = mesh(new THREE.TorusGeometry(0.62, 0.22, 12, 28), std(c, 0.7), -14 + i * 1.5, 0.2, 31);
    t.rotation.y = Math.PI / 2; scene.add(t);
  });

  /* ---------- 二八自行车 ---------- */
  const bike = (x, z, ry) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.set(0, ry, 0.16);
    const blk = std(0x1c1c1f, 0.35, 0.6), chrome = std(0xd0d0d0, 0.2, 0.95);
    for (const wx of [-0.62, 0.62]) {
      const w = mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 32), blk, wx, 0.45, 0); g.add(w);
      const rim = mesh(new THREE.TorusGeometry(0.385, 0.012, 6, 32), chrome, wx, 0.45, 0); g.add(rim);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI; g.add(tubeBetween([wx + Math.cos(a) * 0.38, 0.45 + Math.sin(a) * 0.38, 0], [wx - Math.cos(a) * 0.38, 0.45 - Math.sin(a) * 0.38, 0], 0.004, chrome)); }
      const fender = mesh(new THREE.TorusGeometry(0.46, 0.035, 6, 20, Math.PI * 0.9), blk, wx, 0.45, 0); fender.rotation.z = 0.2; fender.scale.z = 1.8; g.add(fender);
    }
    const T = (a, b, r = 0.022) => g.add(tubeBetween(a, b, r, blk));
    T([-0.62, 0.45, 0], [-0.15, 0.42, 0]); T([-0.15, 0.42, 0], [-0.3, 1.0, 0]); T([-0.62, 0.45, 0], [-0.3, 1.0, 0], 0.016);
    T([-0.3, 1.0, 0], [0.42, 1.02, 0]); T([-0.15, 0.42, 0], [0.42, 0.92, 0]); T([0.42, 1.12, 0], [0.62, 0.45, 0]);
    T([0.42, 1.12, 0], [0.4, 1.22, 0]); g.add(tubeBetween([0.38, 1.22, -0.3], [0.38, 1.22, 0.3], 0.016, chrome));
    const seat = mesh(new THREE.SphereGeometry(0.14, 12, 8), std(0x3a2418, 0.6), -0.34, 1.08, 0); seat.scale.set(1.4, 0.45, 0.9); g.add(seat);
    g.add(box(0.46, 0.02, 0.2, chrome, -0.78, 0.92, 0)); T([-0.62, 0.45, 0], [-0.95, 0.92, 0], 0.012);
    const bell = mesh(new THREE.SphereGeometry(0.045, 10, 8), chrome, 0.4, 1.26, 0.18); g.add(bell);
    scene.add(g);
  };
  bike(33.6, 22, Math.PI / 2 + 0.1); bike(33.7, 24.2, Math.PI / 2 - 0.05);

  /* ---------- 小卖部 ---------- */
  {
    const g = new THREE.Group(); g.position.set(-29, 0, 30); g.rotation.y = Math.PI * 0.82;
    g.add(box(6, 3.2, 3.4, std(0xe9dcc0, 0.9), 0, 1.6, 0));
    g.add(box(6.5, 0.2, 4, std(0x7c7a76, 0.9), 0, 3.3, 0));
    g.add(box(3.4, 1.5, 0.2, std(0x2a221c, 0.9), -0.6, 1.95, 1.65));
    g.add(box(3.8, 0.14, 0.9, std(0x8a5a2e, 0.7), -0.6, 1.15, 1.95));
    g.add(box(1.1, 2.3, 0.12, std(0x4f8f76, 0.7), 2.1, 1.15, 1.72));
    const awT = canvasTex(256, 64, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f6f1e4' : '#d8402f'; c.fillRect(i * 32, 0, 32, h); } });
    const aw = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.5), new THREE.MeshStandardMaterial({ map: awT, side: THREE.DoubleSide, roughness: 0.9 }));
    aw.position.set(-0.6, 2.95, 2.3); aw.rotation.x = -1.15; aw.castShadow = true; g.add(aw);
    const sg = label('小卖部', { w: 2.6, h: 0.8, color: '#fff', bg: '#c8281e', flat: false, chalk: false }); sg.position.set(-0.6, 3.85, 1.2); g.add(sg);
    g.add(box(2.8, 1, 0.1, std(0x8a5a2e, 0.7), -0.6, 3.85, 1.14));
    // 柜台上的糖果罐
    const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, roughness: 0.05, clearcoat: 1 });
    [0xff5a4f, 0xffd21f, 0x4fb6ff].forEach((c, i) => {
      const x = -1.8 + i * 0.7;
      g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16), glassM, x, 1.47, 1.95, false));
      g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 16), std(0xc23b30, 0.5), x, 1.75, 1.95));
      for (let j = 0; j < 12; j++) g.add(mesh(new THREE.SphereGeometry(0.055, 8, 6), std(j % 3 ? c : 0xffffff, 0.3), x + rr(-0.11, 0.11), 1.28 + rr(0, 0.3), 1.95 + rr(-0.11, 0.11), false));
    });
    // 汽水箱
    g.add(box(0.9, 0.5, 0.6, std(0x2f62b5, 0.7), 2.2, 0.25, 2.6));
    for (let i = 0; i < 6; i++) {
      const bx = 1.92 + (i % 3) * 0.28, bz = 2.45 + Math.floor(i / 3) * 0.3;
      g.add(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.34, 10), std(0xe8842a, 0.2), bx, 0.62, bz));
      g.add(mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.16, 10), std(0xe8842a, 0.2), bx, 0.86, bz));
    }
    const lamp = new THREE.PointLight(0xffc878, 30, 14, 1.8); lamp.position.set(-0.6, 2.6, 2.4); g.add(lamp);
    g.add(mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff0c0 }), -0.6, 2.75, 2.2, false));
    scene.add(g);
  }

  /* ---------- 彩灯串 ---------- */
  {
    const cols = [0xffd27a, 0xff7a6a, 0x8ad4ff, 0xa6f08a, 0xffa6d6];
    const pts = [];
    const string = (a, b, sag) => {
      const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), line = [];
      for (let i = 0; i <= 24; i++) {
        const u = i / 24, p = va.clone().lerp(vb, u); p.y -= Math.sin(u * Math.PI) * sag;
        line.push(p); if (i % 2 === 1) pts.push(p);
      }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(line), new THREE.LineBasicMaterial({ color: 0x2a2420 })));
    };
    const pole = (x, z, h) => scene.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, h, 8), std(0x5a4632, 0.8), x, h / 2, z));
    pole(-20, 33, 6.5); pole(20, 33, 6.5); pole(-20, 0, 6.5); pole(20, 0, 6.5);
    string([-20, 8.3, -35.5], [-20, 6.5, 0], 1.3); string([-20, 6.5, 0], [-20, 6.5, 33], 1.3);
    string([20, 8.3, -35.5], [20, 6.5, 0], 1.3); string([20, 6.5, 0], [20, 6.5, 33], 1.3);
    string([-20, 6.5, 33], [20, 6.5, 33], 1.6);
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial(), pts.length);
    const d = new THREE.Object3D(), col = new THREE.Color();
    pts.forEach((p, i) => { d.position.copy(p); d.position.y -= 0.14; d.updateMatrix(); im.setMatrixAt(i, d.matrix); im.setColorAt(i, col.setHex(cols[i % cols.length])); });
    scene.add(im);
    updates.push((t) => {
      pts.forEach((p, i) => im.setColorAt(i, col.setHex(cols[i % cols.length]).multiplyScalar(0.75 + 0.45 * Math.sin(t * 2.5 + i * 1.7))));
      im.instanceColor.needsUpdate = true;
    });
  }

  /* ---------- 墙外的筒子楼剪影 ---------- */
  {
    const t = canvasTex(128, 256, (g, w, h) => {
      g.fillStyle = '#8c6f66'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < 10; y++) for (let x = 0; x < 5; x++) {
        g.fillStyle = Math.random() < 0.4 ? '#ffd88a' : '#5d4a4a';
        g.fillRect(8 + x * 24, 10 + y * 24, 14, 14);
      }
    });
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 1, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.25 });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * 6.28 + rr(-0.1, 0.1), d = rr(70, 105);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (z < -40 && Math.abs(x) < 45) continue;
      const h = rr(12, 24), w = rr(14, 24);
      const b = box(w, h, rr(10, 14), m, x, h / 2, z); b.rotation.y = -a + Math.PI / 2; b.castShadow = false;
      scene.add(b);
    }
    // 水塔
    scene.add(mesh(new THREE.CylinderGeometry(1.2, 1.6, 20, 12), std(0x9a8a80, 0.9), 62, 10, -52, false));
    scene.add(mesh(new THREE.CylinderGeometry(4, 3, 5, 16), std(0xa5958a, 0.9), 62, 22, -52, false));
  }

  /* ---------- 空气里的金色浮尘 ---------- */
  {
    const n = 260, pos = new Float32Array(n * 3), seed = [];
    for (let i = 0; i < n; i++) { pos[i * 3] = rr(-34, 34); pos[i * 3 + 1] = rr(0.3, 9); pos[i * 3 + 2] = rr(-30, 34); seed.push(rr(0, 6.28)); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pm = new THREE.PointsMaterial({ color: 0xffe2a0, size: 0.11, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    scene.add(new THREE.Points(g, pm));
    updates.push((t, dt) => {
      for (let i = 0; i < n; i++) {
        pos[i * 3] += Math.sin(t * 0.5 + seed[i]) * dt * 0.3;
        pos[i * 3 + 1] += Math.cos(t * 0.4 + seed[i] * 2) * dt * 0.15;
      }
      g.attributes.position.needsUpdate = true;
    });
  }

  return { update: (t, dt) => updates.forEach((f) => f(t, dt)) };
}
