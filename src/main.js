// 童年淘汰赛 —— 主流程
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildWorld } from './world.js';
import { FX, makeKid, animKid } from './core.js';
import { initAudio, toggleMute, sfx } from './audio.js';
import { WoodenMan } from './games/wooden.js';
import { Marbles } from './games/marbles.js';
import { Sandbag } from './games/sandbag.js';
import { JumpRope } from './games/rope.js';
import { Hopscotch } from './games/hopscotch.js';

const $ = (id) => document.getElementById(id);
const K = (s) => `<span class="key">${s}</span>`;

/* ---------------- 渲染器 ---------------- */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 900);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.32;
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 1 ? 72 : 52; // 竖屏时拉宽视野
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

const world = buildWorld(scene);
const fx = new FX(scene);

/* ---------------- 输入 ---------------- */
const input = {
  keys: {}, pressed: {}, pointerDown: false, pointerPressed: false, pointerMoved: false, ndc: new THREE.Vector2(),
  held(...c) { return c.some((k) => this.keys[k]); },
  hit(...c) { return c.some((k) => this.pressed[k]); },
};
addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyM') return mute();
  if (e.code === 'Enter' || e.code === 'Space') { const b = document.querySelector('#card.show #card-btns button'); if (b && !e.repeat) { b.click(); return; } }
  if (!e.repeat) input.pressed[e.code] = true;
  input.keys[e.code] = true;
});
addEventListener('keyup', (e) => { input.keys[e.code] = false; });
addEventListener('blur', () => { input.keys = {}; input.pointerDown = false; });
const setNdc = (e) => { input.ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); input.pointerMoved = true; };
canvas.addEventListener('pointerdown', (e) => { setNdc(e); input.pointerDown = true; input.pointerPressed = true; initAudio(); });
addEventListener('pointermove', setNdc);
addEventListener('pointerup', () => { input.pointerDown = false; });
addEventListener('pointercancel', () => { input.pointerDown = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
function mute() { $('mute').textContent = toggleMute() ? '×' : '♪'; }
$('mute').onclick = () => { initAudio(); mute(); };

/* ---------------- 界面 ---------------- */
let bannerTimer = 0;
const ui = {
  banner(html, ms = 900) {
    clearTimeout(bannerTimer);
    $('banner').innerHTML = html ? `<span class="pop">${html}</span>` : '';
    if (html && ms) bannerTimer = setTimeout(() => ($('banner').innerHTML = ''), ms);
  },
  timer(s) { const el = $('timer'); if (s == null) { el.textContent = '--'; el.className = ''; return; } el.textContent = Math.max(0, Math.ceil(s)); el.className = s < 10 ? 'low' : ''; },
  progress(p) { $('bar').firstElementChild.style.width = (p == null ? 0 : Math.max(0, Math.min(1, p)) * 100) + '%'; },
  lives(n) { $('lives').innerHTML = n == null ? '' : '♥'.repeat(Math.max(0, n)) + `<i>${'♥'.repeat(Math.max(0, 3 - n))}</i>`; },
  info(t) { $('info').textContent = t || ''; },
  vignette(on) { $('vignette').classList.toggle('on', on); },
  shake() { canvas.classList.remove('shake'); void canvas.offsetWidth; canvas.classList.add('shake'); },
  alive(n) { $('alive').innerHTML = `还剩 <b>${n}</b> 人`; },
};
function showCard({ tag = '', title, body = '', btns = [] }) {
  $('card-tag').textContent = tag; $('card-title').textContent = title; $('card-body').innerHTML = body;
  const box = $('card-btns'); box.innerHTML = '';
  btns.forEach(([text, fn, ghost]) => {
    const b = document.createElement('button'); b.textContent = text; if (ghost) b.className = 'ghost';
    b.onclick = () => { initAudio(); sfx.click(); fn(); };
    box.appendChild(b);
  });
  $('card').classList.remove('show'); void $('card').offsetWidth; $('card').classList.add('show');
}
const hideCard = () => $('card').classList.remove('show');

/* ---------------- 关卡表 ---------------- */
const TOTAL = 46;
const CN = ['一', '二', '三', '四', '五'];
const ROUNDS = [
  { name: '一二三木头人', cls: WoodenMan, after: 30,
    rules: ['铁皮青蛙背过身念「一二三木头人」时，赶紧往前跑', '它一回头，谁还在动谁出局', '跑得越快越难刹住，要提前松手', '60 秒内冲过终点线'],
    ctrl: `按住 ${K('空格')} 或 鼠标 / 手指 前进，松开刹车`, hint: '按住 空格 / 鼠标 跑，松开停下' },
  { name: '弹玻璃珠', cls: Marbles, after: 20,
    rules: ['用你的白色「头弹」把圈里的弹珠撞出粉笔圈', '一共 5 颗弹珠的机会，撞出去 3 颗就过关', '力度条来回摆动，看准了再松手'],
    ctrl: `移动鼠标瞄准（或 ${K('A')}${K('D')}），按住 ${K('空格')} / 鼠标蓄力，松开弹出`, hint: '鼠标瞄准 · 按住蓄力 · 松开弹出' },
  { name: '丢沙包', cls: Sandbag, after: 12,
    rules: ['两头的同学会朝你扔沙包，在场地里躲开它', '被砸中 3 次就出局，沙包会越来越多、越来越快', '沙包飞到面前时按空格可以接住它，奖励一条命', '坚持 40 秒'],
    ctrl: `${K('W')}${K('A')}${K('S')}${K('D')} / 方向键 移动（或按住鼠标跟随），${K('空格')} 接沙包`, hint: 'WASD 移动 · 空格 接沙包' },
  { name: '跳大绳', cls: JumpRope, after: 6,
    rules: ['绳子扫到脚下的那一刻，你得在空中', '节奏会忽快忽慢，别被带乱了', '绊住 3 次就出局，跳满 20 下过关'],
    ctrl: `${K('空格')} 或 点击 起跳`, hint: '空格 / 点击 起跳' },
  { name: '跳房子', cls: Hopscotch, after: 1,
    rules: ['一共 8 行，每行只有一格是对的', '开始前正确的格子会依次亮一遍，用心记住', '踩错 3 次或 45 秒没跳到「天」，就输了', '这是最后一关，赢的人只有一个'],
    ctrl: `${K('←')}${K('↑')}${K('→')} 或 ${K('A')}${K('W')}${K('D')} 选左 / 中 / 右，也可以直接点格子`, hint: '← ↑ → 选格子' },
];

/* ---------------- 游戏上下文 ---------------- */
const camLook = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
const ray = new THREE.Raycaster(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), gpt = new THREE.Vector3();
let game = null, roundIdx = 0, alive = TOTAL, ended = false, token = 0;

const ctx = {
  scene, camera, input, sfx, ui, fx,
  get alive() { return alive; },
  cam(pos, look, k = 1) {
    camera.position.lerp(tmpA.fromArray(pos), k); camLook.lerp(tmpB.fromArray(look), k); camera.lookAt(camLook);
  },
  groundPoint() { ray.setFromCamera(input.ndc, camera); return ray.ray.intersectPlane(groundPlane, gpt); },
  npcNums(n) {
    const a = Array.from({ length: TOTAL - 1 }, (_, i) => i + 1);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, n);
  },
  win() {
    if (ended) return; ended = true;
    const R = ROUNDS[roundIdx], before = alive, my = token;
    sfx.win(); ui.banner('过关！', 1500);
    fx.confetti(game.player.position, 150);
    setTimeout(() => {
      if (my !== token) return;
      alive = R.after; ui.alive(alive);
      if (roundIdx === ROUNDS.length - 1) return champion();
      showCard({
        tag: `第${CN[roundIdx]}关 · 过关`, title: '你留下来了',
        body: `<div>这一关有 <span class="sub">${before - alive}</span> 个小伙伴出局</div><div class="big">${alive}</div><div>个孩子还站在操场上</div>`,
        btns: [['下一关', () => loadRound(roundIdx + 1)]],
      });
    }, 1900);
  },
  lose(msg) {
    if (ended) return; ended = true;
    const my = token;
    sfx.lose(); ui.shake();
    setTimeout(() => {
      if (my !== token) return;
      showCard({
        tag: '出局', title: '46 号，淘汰',
        body: `<div>${msg}</div><div class="ctrl">放学铃还没响，要不要再来一次？</div>`,
        btns: [['再试一次', () => loadRound(roundIdx)], ['回到开头', showTitle, true]],
      });
    }, 1500);
  },
};

function clearGame() {
  token++;
  if (game) game.dispose();
  game = null; ended = false;
  ui.banner(''); ui.timer(null); ui.progress(null); ui.lives(null); ui.info(''); ui.vignette(false);
  $('hint').textContent = '';
}

function loadRound(i) {
  clearGame();
  roundIdx = i;
  if (i === 0) alive = TOTAL;
  const R = ROUNDS[i];
  $('hud').classList.remove('hide');
  $('round').textContent = `第${CN[i]}关 · ${R.name}`;
  ui.alive(alive);
  game = new R.cls(ctx);
  showCard({
    tag: `第 ${CN[i]} 关`, title: R.name,
    body: `<ul>${R.rules.map((r) => `<li>${r}</li>`).join('')}</ul><div class="ctrl">${R.ctrl}</div>`,
    btns: [['开始', () => countdown(R)]],
  });
}

function countdown(R) {
  hideCard();
  $('hint').textContent = R.hint;
  const my = token;
  let n = 3;
  const step = () => {
    if (my !== token) return;
    if (n > 0) { ui.banner(`<span class="num">${n}</span>`, 650); sfx.count(); n--; setTimeout(step, 700); }
    else { ui.banner('开始！', 700); sfx.go(); game.begin(); }
  };
  step();
}

function champion() {
  $('hint').textContent = '';
  const loop = setInterval(() => { if (!game || !game.won) return clearInterval(loop); fx.confetti(game.player.position, 60); }, 900);
  showCard({
    tag: '最后一个站着的孩子', title: '操场冠军',
    body: `<div>46 个孩子，5 个老游戏，只剩下你。</div>
      <div class="sub">奖品：一整罐玻璃弹珠、一瓶橘子汽水，<br/>还有小卖部老板亲手写的奖状。</div>
      <div class="ctrl">放学铃响了，夕阳正好。明天课间，还来吗？</div>`,
    btns: [['再玩一遍', () => loadRound(0)], ['回到开头', showTitle, true]],
  });
}

/* ---------------- 开场：操场上集合 ---------------- */
class Lobby {
  constructor() {
    this.group = new THREE.Group(); scene.add(this.group);
    this.kids = [];
    const nums = ctx.npcNums(23);
    for (let i = 0; i < 24; i++) {
      const hero = i === 9;
      const k = hero ? makeKid(46, { hero: true, girl: false, accent: 0xc23b30 }) : makeKid(nums[i]);
      k.position.set(-6.25 + (i % 6) * 2.5, 0, -3 + Math.floor(i / 6) * 2.2);
      this.group.add(k); this.kids.push({ k, mode: hero ? 'wave' : i % 5 === 0 ? 'cheer' : 'idle' });
    }
    this.player = this.kids[9].k;
  }
  begin() {}
  update(dt, t) {
    for (const { k, mode } of this.kids) animKid(k, mode, t, dt);
    const a = t * 0.12 + 0.5;
    ctx.cam([Math.sin(a) * 19, 6.5 + Math.sin(t * 0.2) * 1.5, 4 + Math.cos(a) * 19], [0, 1.6, 0], 1 - Math.exp(-dt * 2));
  }
  dispose() { scene.remove(this.group); }
}

function showTitle() {
  clearGame();
  alive = TOTAL;
  $('hud').classList.add('hide');
  game = new Lobby();
  showCard({
    tag: '向阳小学 · 课间十分钟', title: '童年淘汰赛',
    body: `<div>46 个孩子，5 个老游戏，</div><div>每一关都有人出局，<span class="sub">只有一个人能赢走那罐玻璃弹珠。</span></div>
      <div class="ctrl">木头人 · 弹玻璃珠 · 丢沙包 · 跳大绳 · 跳房子<br/>你是戴小黄帽的 <span class="sub">46 号</span></div>`,
    btns: [['上课铃响了，开始！', () => loadRound(0)]],
  });
}

/* ---------------- 主循环 ---------------- */
const clock = new THREE.Clock();
let T = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  T += dt;
  world.update(T, dt);
  if (game) game.update(dt, T);
  fx.update(dt);
  input.pressed = {}; input.pointerPressed = false; input.pointerMoved = false;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

const jump = new URLSearchParams(location.search).get('r');
camera.position.set(0, 10, 26); camLook.set(0, 1.6, 0);
if (jump) { loadRound(Math.max(0, Math.min(4, +jump - 1))); alive = [46, 30, 20, 12, 6][roundIdx]; ui.alive(alive); } else showTitle();
frame();
window.__game = { get game() { return game; }, ctx, loadRound };
