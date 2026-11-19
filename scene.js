/* =========================================================================
   海边骑行 · 3D 场景（体素微缩海岸 / 慢骑 · 阿满）
   基于参考场景改写：
   - 可挂载到任意容器，自适应尺寸（ResizeObserver）
   - 可骑行 / 可暂停（速度缓动，停下后阿满喝茶）
   - 可换装（羽色、帽子、领巾、车架）
   - 暴露 window.createSeaside(container, options)
   ========================================================================= */
window.createSeaside = function (container, options) {
  'use strict';
  const T = window.THREE;
  if (!T || !container) return null;
  const opts = Object.assign({ mode: 'ride', look: null, zoom: 1, quality: 1, shadowSize: 1024 }, options || {});
  const cw = () => Math.max(2, container.clientWidth | 0);
  const ch = () => Math.max(2, container.clientHeight | 0);

function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function h3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
const colorCache = new Map();
function C(hex) { let c = colorCache.get(hex); if (!c) { c = new T.Color(hex); colorCache.set(hex, c); } return c; }

/* 体素模型：只生成暴露在外的面，带顶点色与细微色差（微缩模型质感） */
const FACES = [
  { d: [1, 0, 0],  v: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]], sh: 0.94 },
  { d: [-1, 0, 0], v: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]], sh: 0.94 },
  { d: [0, 1, 0],  v: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], sh: 1.0 },
  { d: [0, -1, 0], v: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], sh: 0.74 },
  { d: [0, 0, 1],  v: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]], sh: 0.89 },
  { d: [0, 0, -1], v: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]], sh: 0.89 },
];
class Vox {
  constructor(s) { this.s = s; this.m = new Map(); }
  key(x, y, z) { return ((x + 1024) * 2048 + (y + 1024)) * 2048 + (z + 1024); }
  set(x, y, z, c) { if (c === null || c === undefined) return; this.m.set(this.key(x, y, z), [x, y, z, c]); }
  del(x, y, z) { this.m.delete(this.key(x, y, z)); }
  has(x, y, z) { return this.m.has(this.key(x, y, z)); }
  box(x0, y0, z0, x1, y1, z1, c) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++)
      this.set(x, y, z, typeof c === 'function' ? c(x, y, z) : c);
  }
  ell(cx, cy, cz, rx, ry, rz, c) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry); y++) {
        const dy = (y + 0.5 - cy) / ry;
        for (let z = Math.floor(cz - rz - 1); z <= Math.ceil(cz + rz); z++) {
          const dz = (z + 0.5 - cz) / rz;
          if (dx * dx + dy * dy + dz * dz <= 1) this.set(x, y, z, typeof c === 'function' ? c(x, y, z) : c);
        }
      }
    }
  }
  geo(jit) {
    if (jit === undefined) jit = 0.06;
    const pos = [], nor = [], col = [], idx = [];
    const s = this.s; let n = 0;
    for (const e of this.m.values()) {
      const x = e[0], y = e[1], z = e[2], base = C(e[3]);
      const j = 1 + (h3(x, y, z) - 0.5) * 2 * jit;
      for (const f of FACES) {
        if (this.has(x + f.d[0], y + f.d[1], z + f.d[2])) continue;
        const k = j * f.sh;
        for (const q of f.v) {
          pos.push((x + q[0]) * s, (y + q[1]) * s, (z + q[2]) * s);
          nor.push(f.d[0], f.d[1], f.d[2]);
          col.push(base.r * k, base.g * k, base.b * k);
        }
        idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4;
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }
}

/* =========================================================================
   渲染器 / 场景 / 灯光
   ========================================================================= */
let renderer;
try {
  renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (e) { return null; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.quality >= 1 ? 1.75 : 1.25));
renderer.setSize(cw(), ch());
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
renderer.domElement.className = 'seaside-canvas';
container.appendChild(renderer.domElement);

const scene = new T.Scene();
scene.background = (function () {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512;
  const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#3aa6ec'); gr.addColorStop(0.5, '#93d4f5'); gr.addColorStop(1, '#eaf8ff');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; return tx;
})();

const camera = new T.PerspectiveCamera(30, cw() / ch(), 0.5, 400);

scene.add(new T.HemisphereLight('#d4efff', '#f3dcae', 1.25));
const sun = new T.DirectionalLight('#fff1d8', 2.9);
sun.position.set(9, 17, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(opts.shadowSize, opts.shadowSize);
Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 2, far: 60 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
scene.add(sun);
const fill = new T.DirectionalLight('#cfe6ff', 0.55);
fill.position.set(-12, 6, 10);
scene.add(fill);

/* =========================================================================
   底座边界：四个竖直裁切平面（x = ±8, z = ±8）
   ========================================================================= */
const HALF = 8;
const clipPlanes = [
  new T.Plane(new T.Vector3(-1, 0, 0), HALF),
  new T.Plane(new T.Vector3(1, 0, 0), HALF),
  new T.Plane(new T.Vector3(0, 0, -1), HALF),
  new T.Plane(new T.Vector3(0, 0, 1), HALF),
];
const M = {
  stat: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.84, metalness: 0 }),
  clip: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.84, metalness: 0,
    clippingPlanes: clipPlanes, clipShadows: true, side: T.DoubleSide }),
  cloud: new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0,
    emissive: '#ffffff', emissiveIntensity: 0.22, clippingPlanes: clipPlanes, clipShadows: true, side: T.DoubleSide }),
};
function vmesh(vox, mat, jit, shadow) {
  const m = new T.Mesh(vox.geo(jit), mat);
  m.castShadow = shadow !== false; m.receiveShadow = true;
  return m;
}

/* =========================================================================
   底座（静态）：地层 + 顶面沙滩 / 草地 + 海床
   ========================================================================= */
(function buildBase() {
  const plinth = new T.Mesh(new T.BoxGeometry(16, 0.3, 16),
    new T.MeshStandardMaterial({ color: '#4a3021', roughness: 0.55 }));
  plinth.position.y = -3.15; plinth.receiveShadow = true; scene.add(plinth);

  // 地层（0.5 体素）
  const body = new Vox(0.5);
  const strata = { '-6': '#5d5753', '-5': '#786d65', '-4': '#8b5b3b', '-3': '#a76f47' };
  for (let x = -16; x < 16; x++) for (let z = -16; z < 16; z++) for (let y = -6; y <= -2; y++) {
    const ocean = z <= -9;
    let c;
    if (y === -2) c = ocean ? '#d4b97f' : '#c4955f';
    else c = strata[y];
    const h = h3(x, y, z);
    if (y >= -5 && y <= -3 && h < 0.07) c = h < 0.035 ? '#9b9187' : '#6a4630';
    body.set(x, y, z, c);
  }
  const bm = vmesh(body, M.stat, 0.07, false); scene.add(bm);

  // 顶层（0.25 体素）：湿沙、沙滩、草地 + 灯塔小岛
  const top = new Vox(0.25);
  for (let x = -32; x < 32; x++) for (let z = -16; z < 32; z++) {
    const h = h3(x, 1, z);
    top.set(x, -2, z, '#d7b073');
    let c;
    if (z <= -15) c = h < 0.5 ? '#d8bb82' : '#d2b47a';
    else if (z >= 17 || (z === 16 && h < 0.25)) {
      if (z === 17 && h < 0.3) c = '#efd79c';
      else c = h < 0.32 ? '#5fb13c' : (h > 0.94 ? '#8fd65c' : '#6fc046');
    } else {
      c = h < 0.1 ? '#e9cf94' : (h > 0.975 ? '#fff4e6' : '#f3dca2');
    }
    top.set(x, -1, z, c);
  }
  // 小岛
  const icx = -22.4, icz = -24.8;
  for (let x = -30; x <= -15; x++) for (let z = -32; z <= -17; z++) {
    const d = Math.hypot(x + 0.5 - icx, z + 0.5 - icz);
    const r = 4.6 + (h3(x, 5, z) - 0.5) * 0.9;
    if (d > r) continue;
    const topY = d < 2.7 ? 0 : (d < 3.8 ? -1 : -2);
    for (let y = -2; y <= topY; y++) {
      const hh = h3(x, y, z);
      let c = ['#8f8b86', '#a3a099', '#7c7873'][Math.floor(hh * 3)];
      if (y === topY && d < 2.7) c = hh < 0.25 ? '#79bf4c' : '#e8d29c';
      top.set(x, y, z, c);
    }
  }
  scene.add(vmesh(top, M.stat, 0.06, false));
})();

/* =========================================================================
   海洋：体素水柱波浪 + 浪花
   ========================================================================= */
const water = (function () {
  const geo = new T.BoxGeometry(0.5, 1, 0.5); geo.translate(0, 0.5, 0);
  const mat = new T.MeshStandardMaterial({ roughness: 0.16, metalness: 0.05 });
  const cells = [];
  for (let x = -16; x < 16; x++) for (let z = -16; z <= -9; z++) cells.push([(x + 0.5) * 0.5, (z + 0.5) * 0.5]);
  const im = new T.InstancedMesh(geo, mat, cells.length);
  im.receiveShadow = true; im.frustumCulled = false;
  const deep = C('#1680c8'), shallow = C('#36c9d9'), foam = C('#e9fbff');
  const baseCols = cells.map(([x, z]) => {
    const u = (z + 8) / 4; // 0 远 → 1 近岸
    return deep.clone().lerp(shallow, Math.pow(Math.min(Math.max(u, 0), 1), 1.3));
  });
  const dummy = new T.Object3D(), tmp = new T.Color();
  im.setColorAt(0, baseCols[0]);
  function update(t) {
    for (let i = 0; i < cells.length; i++) {
      const [x, z] = cells[i];
      const w = 0.055 * Math.sin(x * 0.85 + t * 1.6) + 0.04 * Math.sin(z * 1.35 - t * 1.15)
              + 0.028 * Math.sin((x + z) * 0.7 + t * 2.3);
      dummy.position.set(x, -0.5, z); dummy.scale.set(1, 0.33 + w, 1); dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      tmp.copy(baseCols[i]).lerp(foam, Math.max(0, w - 0.04) * 4.2);
      im.setColorAt(i, tmp);
    }
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
  }
  update(0);
  scene.add(im);

  // 浪花：岸边 + 小岛四周
  const fpos = [];
  for (let i = 0; i < 64; i++) fpos.push([-7.875 + i * 0.25, -4.06, i * 0.9]);
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; fpos.push([-5.6 + Math.cos(a) * 1.3, -6.2 + Math.sin(a) * 1.3, i * 1.3]); }
  const fim = new T.InstancedMesh(new T.BoxGeometry(0.2, 0.08, 0.2),
    new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), fpos.length);
  fim.frustumCulled = false;
  scene.add(fim);
  function updateFoam(t) {
    for (let i = 0; i < fpos.length; i++) {
      const [x, z, ph] = fpos[i];
      const k = Math.max(0, Math.sin(t * 1.5 + ph));
      const zz = i < 64 ? z + 0.08 * Math.sin(t * 1.2 + x * 0.5) : z;
      dummy.position.set(Math.min(Math.max(x, -7.9), 7.9), -0.14, zz);
      const s = 0.15 + 0.85 * k; dummy.scale.set(s, 1, s); dummy.updateMatrix();
      fim.setMatrixAt(i, dummy.matrix);
    }
    fim.instanceMatrix.needsUpdate = true;
  }
  return { update(t) { update(t); updateFoam(t); } };
})();

/* =========================================================================
   灯塔（静态）+ 旋转光束（被裁切）
   ========================================================================= */
const lighthouse = (function () {
  const v = new Vox(0.125);
  const rr = (x, z) => Math.hypot(x + 0.5, z + 0.5);
  for (let y = 0; y < 26; y++) {
    const r = 4.7 - y * 0.045;
    for (let x = -6; x <= 5; x++) for (let z = -6; z <= 5; z++) {
      if (rr(x, z) > r) continue;
      let c = (Math.floor(y / 5) % 2 === 0) ? '#f6f3ec' : '#e2443a';
      if (y < 2) c = '#9a948c';
      v.set(x, y, z, c);
    }
    const zf = Math.floor(Math.sqrt(r * r - 0.25) - 0.5);
    if (y >= 2 && y <= 5) { v.set(-1, y, zf, '#5b3a24'); v.set(0, y, zf, '#5b3a24'); }
    if (y === 10 || y === 11 || y === 18 || y === 19) {
      v.set(-1, y, zf, '#2b4a66'); v.set(0, y, zf, '#2b4a66');
      v.set(zf, y, -1, '#2b4a66'); v.set(zf, y, 0, '#2b4a66');
    }
  }
  for (let x = -7; x <= 6; x++) for (let z = -7; z <= 6; z++) {
    const d = rr(x, z);
    if (d <= 5.7) v.set(x, 26, z, '#3b444c');
    if (d > 4.9 && d <= 5.7) { if (((x + z) & 1) === 0) v.set(x, 27, z, '#3b444c'); v.set(x, 28, z, '#3b444c'); }
    if (d > 2.2 && d <= 3.2 && Math.abs(x + 0.5) > 1.4 && Math.abs(z + 0.5) > 1.4) for (let y = 27; y <= 30; y++) v.set(x, y, z, '#2f363d');
    if (d <= 3.8) v.set(x, 31, z, '#d43a2f');
    if (d <= 2.9) v.set(x, 32, z, '#d43a2f');
    if (d <= 2.0) v.set(x, 33, z, '#c9332a');
    if (d <= 1.1) v.set(x, 34, z, '#c9332a');
    if (d <= 0.8) { v.set(x, 35, z, '#e8c547'); v.set(x, 36, z, '#e8c547'); }
  }
  const g = new T.Group();
  g.position.set(-5.6, 0.25, -6.2);
  g.add(vmesh(v, M.stat, 0.04));
  const lamp = new T.Mesh(new T.BoxGeometry(0.42, 0.42, 0.42), new T.MeshBasicMaterial({ color: '#fff3a6', toneMapped: false }));
  lamp.position.y = 29 * 0.125; g.add(lamp);
  // 光束
  const beamGeo = new T.CylinderGeometry(0.55, 0.07, 3.6, 4, 1, true);
  beamGeo.rotateZ(-Math.PI / 2); beamGeo.translate(1.8, 0, 0);
  const beamMat = new T.MeshBasicMaterial({ color: '#fff2b0', transparent: true, opacity: 0.13,
    blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, clippingPlanes: clipPlanes, toneMapped: false });
  const beam = new T.Group(); beam.position.y = 29 * 0.125;
  const b1 = new T.Mesh(beamGeo, beamMat), b2 = new T.Mesh(beamGeo, beamMat); b2.rotation.y = Math.PI;
  beam.add(b1, b2); g.add(beam);
  scene.add(g);
  return { update(t) { beam.rotation.y = t * 0.9; lamp.material.color.setScalar(0.85 + 0.15 * Math.sin(t * 5)); lamp.material.color.multiply(C('#fff3a6')); } };
})();

/* =========================================================================
   海滩静态小品：路牌 SLOW、遮阳伞、浴巾、沙堡、沙滩球、海星、水桶
   ========================================================================= */
(function buildBeach() {
  // ---- 路牌 ----
  const FONT = {
    F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
    u: ['00000', '00000', '10001', '10001', '10001', '10011', '01101'],
    c: ['00000', '00000', '01110', '10000', '10000', '10001', '01110'],
    k: ['10000', '10000', '10010', '10100', '11000', '10100', '10010'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    t: ['01000', '01000', '11100', '01000', '01000', '01001', '00110'],
    d: ['00001', '00001', '01101', '10011', '10001', '10001', '01111'],
    i: ['00100', '00000', '01100', '00100', '00100', '00100', '01110'],
    o: ['00000', '00000', '01110', '10001', '10001', '10001', '01110'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  };
  const text = 'SLOW';
  let cols = 0; const glyphs = [];
  for (const ch of text) { if (ch === ' ') { cols += 3; continue; } glyphs.push([ch, cols]); cols += 6; }
  cols -= 1;
  const W = cols + 10, H = 15;
  const board = new Vox(0.05);
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    const border = x < 2 || x >= W - 2 || y < 2 || y >= H - 2;
    board.set(x, y, 0, border ? '#ffcf3a' : '#159f97');
    board.set(x, y, 1, border ? '#ffcf3a' : '#159f97');
  }
  for (const [ch, c0] of glyphs) {
    const gl = FONT[ch];
    for (let r = 0; r < 7; r++) for (let cc = 0; cc < 5; cc++) if (gl[r][cc] === '1') board.set(5 + c0 + cc, 10 - r, 2, '#fffef7');
  }
  const sign = new T.Group();
  const bmesh = vmesh(board, M.stat, 0.03);
  bmesh.position.set(-W * 0.05 / 2, 1.15, 0);
  sign.add(bmesh);
  const posts = new Vox(0.125);
  const pL = Math.floor(-W * 0.05 / 2 / 0.125) + 1, pR = Math.ceil(W * 0.05 / 2 / 0.125) - 2;
  for (const px of [pL, pR]) for (let y = 0; y < 15; y++) posts.set(px, y, -1, y === 14 ? '#6f4a2a' : '#8b5e34');
  // 牌顶小椰叶装饰
  for (let i = -3; i <= 3; i++) posts.set(i - 1, 15, -1, Math.abs(i) % 2 ? '#4aa634' : '#5cb83c');
  posts.set(-1, 16, -1, '#ff4f6a'); posts.set(0, 16, -1, '#ffd23f');
  sign.add(vmesh(posts, M.stat, 0.06));
  sign.position.set(4.7, 0, -2.5); sign.rotation.y = 0.32;
  scene.add(sign);

  // ---- 遮阳伞 ----
  const um = new Vox(0.125);
  for (let y = 0; y < 16; y++) um.set(0, y, 0, '#f1efe8');
  const rows = { 16: 1.6, 15: 3.9, 14: 6.0, 13: 7.6 };
  for (const yy in rows) {
    const r = rows[yy];
    for (let x = -8; x <= 8; x++) for (let z = -8; z <= 8; z++) {
      const d = Math.hypot(x, z); if (d > r) continue;
      const a = Math.atan2(z, x); const sec = Math.floor((a + Math.PI) / (Math.PI * 2) * 8) % 2;
      um.set(x, +yy, z, sec ? '#ff4b4b' : '#fff7ef');
    }
  }
  um.set(0, 17, 0, '#ff4b4b');
  const umb = vmesh(um, M.stat, 0.04);
  umb.position.set(-2.9, 0, -2.4); umb.rotation.z = 0.1; umb.rotation.x = -0.06;
  scene.add(umb);

  // ---- 浴巾 ----
  const tw = new Vox(0.0625);
  for (let x = -7; x <= 6; x++) for (let z = -12; z <= 11; z++) {
    const band = Math.floor((z + 12) / 3) % 3;
    tw.set(x, 0, z, ['#2f9fe0', '#ffffff', '#ffcf3a'][band]);
  }
  const towel = vmesh(tw, M.stat, 0.03); towel.position.set(-2.2, 0, -1.9); towel.rotation.y = 0.25;
  scene.add(towel);

  // ---- 沙堡 ----
  const sc = new Vox(0.125); const sand = '#e7c47f', sandD = '#d9b26b';
  sc.box(-5, 0, -4, 4, 1, 3, sand);
  for (let x = -5; x <= 4; x++) for (let z = -4; z <= 3; z++) {
    const edge = x === -5 || x === 4 || z === -4 || z === 3;
    if (edge) { sc.set(x, 2, z, sand); if (((x + z) & 1) === 0) sc.set(x, 3, z, sandD); }
  }
  for (const [tx, tz] of [[-5, -4], [3, -4], [-5, 2], [3, 2]]) {
    sc.box(tx, 0, tz, tx + 1, 5, tz + 1, sand);
    sc.set(tx, 6, tz, sandD); sc.set(tx + 1, 6, tz + 1, sandD);
  }
  sc.box(-2, 2, -2, 1, 5, 1, sand);
  for (const [x, z] of [[-2, -2], [1, -2], [-2, 1], [1, 1]]) sc.set(x, 6, z, sandD);
  sc.set(-1, 2, 3, '#8a6a3e'); sc.set(0, 2, 3, '#8a6a3e'); sc.set(-1, 3, 3, '#8a6a3e'); sc.set(0, 3, 3, '#8a6a3e');
  for (let y = 6; y <= 10; y++) sc.set(0, y, 0, '#8b5e34');
  sc.box(1, 9, 0, 2, 10, 0, '#ff4d6d');
  const castle = vmesh(sc, M.stat, 0.08); castle.position.set(1.3, 0, -2.7); castle.rotation.y = -0.2;
  scene.add(castle);

  // ---- 水桶 ----
  const bk = new Vox(0.0625);
  for (let y = 0; y <= 4; y++) for (let x = -3; x <= 2; x++) for (let z = -3; z <= 2; z++) {
    const d = Math.hypot(x + 0.5, z + 0.5);
    if (d > 2.6) continue;
    if (y === 4 && d < 1.6) continue;
    bk.set(x, y, z, y === 4 ? '#ffd23f' : '#ff5a5a');
  }
  const bucket = vmesh(bk, M.stat, 0.03); bucket.position.set(2.5, 0, -2.0); scene.add(bucket);

  // ---- 沙滩球 ----
  const bl = new Vox(0.0625);
  const bcols = ['#ff4d4d', '#ffffff', '#2f8cff', '#ffffff', '#ffd23f', '#ffffff'];
  bl.ell(0, 3.5, 0, 3.6, 3.6, 3.6, (x, y, z) => {
    if (y >= 6) return '#ffffff';
    const a = Math.atan2(z + 0.5, x + 0.5);
    return bcols[Math.floor((a + Math.PI) / (Math.PI * 2) * 6) % 6];
  });
  const ball = vmesh(bl, M.stat, 0.02); ball.position.set(-5.1, 0, -1.2); ball.rotation.set(0.3, 0.6, 0.2);
  ball.position.y = 0.04;
  scene.add(ball);

  // ---- 海星 ----
  const sf = new Vox(0.0625);
  sf.box(-1, 0, -1, 0, 0, 0, '#ff8a3d');
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * Math.PI * 2 - Math.PI / 2;
    for (let i = 1; i <= 4; i++) sf.set(Math.floor(Math.cos(a) * i), 0, Math.floor(Math.sin(a) * i), i === 4 ? '#ffae6b' : '#ff8a3d');
  }
  const star = vmesh(sf, M.stat, 0.05); star.position.set(-0.6, 0.001, -1.1); scene.add(star);
})();

/* =========================================================================
   运动小物：螃蟹、帆船、云、海鸥（全部受裁切平面约束）
   ========================================================================= */
const crab = (function () {
  const v = new Vox(0.0625);
  const red = '#e8473b', redD = '#c8352c';
  v.ell(0, 2, 0, 3.2, 1.5, 2.3, red);
  v.set(-2, 3, 1, red); v.set(-2, 4, 1, red); v.set(-2, 5, 1, '#1a1a1a');
  v.set(1, 3, 1, red); v.set(1, 4, 1, red); v.set(1, 5, 1, '#1a1a1a');
  v.box(-6, 2, 1, -5, 3, 2, redD); v.box(4, 2, 1, 5, 3, 2, redD);
  v.set(-4, 2, 1, red); v.set(3, 2, 1, red);
  for (const z of [-2, 0]) { v.set(-4, 1, z, redD); v.set(-5, 0, z, redD); v.set(3, 1, z, redD); v.set(4, 0, z, redD); }
  const m = vmesh(v, M.clip, 0.04);
  scene.add(m);
  return { update(t) {
    m.position.set(-4.3 + Math.sin(t * 0.45) * 1.3, Math.abs(Math.sin(t * 9)) * 0.015, -3.35);
    m.rotation.y = Math.sin(t * 0.9) * 0.12;
  } };
})();

function makeBoat(accent, jib) {
  const v = new Vox(0.125);
  for (let x = -7; x <= 6; x++) {
    if (x >= -4 && x <= 5) v.box(x, 0, -1, x, 0, 0, '#c8402f');
    if (x >= -6) { if (x <= -5) v.box(x, 1, -1, x, 1, 0, '#1f5aa0'); else v.box(x, 1, -2, x, 1, 1, '#1f5aa0'); }
    if (x <= -6) v.box(x, 2, -1, x, 2, 0, '#f7f7f2'); else v.box(x, 2, -2, x, 2, 1, '#f7f7f2');
  }
  v.box(-4, 2, -1, 5, 2, 0, '#c99a63');
  v.box(1, 3, -1, 4, 4, 0, '#f7f7f2');
  v.box(2, 3, -1, 3, 3, 0, '#3b78b5');
  for (let y = 3; y <= 20; y++) v.set(-1, y, -1, '#8a6a4a');
  for (let y = 5; y <= 19; y++) {
    const w = Math.round((19 - y) * 0.42) + 1;
    for (let x = 0; x <= w; x++) v.set(x, y, -1, (y === 9 || y === 10) ? accent : '#fbfaf3');
  }
  for (let x = 0; x <= 7; x++) v.set(x, 4, -1, '#8a6a4a');
  for (let y = 5; y <= 17; y++) {
    const w = Math.round((17 - y) * 0.36) + 1;
    for (let x = -1 - w; x <= -2; x++) v.set(x, y, -1, jib);
  }
  v.box(0, 20, -1, 2, 21, -1, '#ff4d4d');
  return v;
}
const boats = (function () {
  const list = [
    { v: makeBoat('#2fb5c9', '#ff7f6a'), z: -4.62, speed: 0.42, x0: 3, scale: 1, ph: 0 },
    { v: makeBoat('#ff6b5a', '#ffd23f'), z: -7.55, speed: 0.27, x0: -2, scale: 0.72, ph: 2 },
  ];
  for (const b of list) { b.m = vmesh(b.v, M.clip, 0.04); b.m.scale.setScalar(b.scale); scene.add(b.m); }
  return { update(t) {
    for (const b of list) {
      const span = 16 + 4;
      let x = b.x0 - b.speed * t; x = ((x + 10) % span + span) % span - 10;
      b.m.position.set(x, -0.42 * b.scale - 0.02 + 0.03 * Math.sin(t * 1.7 + b.ph), b.z);
      b.m.rotation.set(0.05 * Math.sin(t * 1.3 + b.ph), 0, 0.03 * Math.sin(t * 1.1 + b.ph));
    }
  } };
})();

const clouds = (function () {
  function makeCloud(seed) {
    const v = new Vox(0.25); const r = rng(seed);
    const n = 4 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const cx = (r() - 0.5) * 8, cy = r() * 1.5, cz = (r() - 0.5) * 2.5;
      v.ell(cx, cy, cz, 1.8 + r() * 1.6, 1.2 + r() * 0.9, 1.4 + r() * 0.9, (x, y) => y < 0 ? null : (y < 1 ? '#e3eef7' : '#ffffff'));
    }
    return v;
  }
  const list = [
    { m: vmesh(makeCloud(11), M.cloud, 0.03, false), y: 7.2, z: -5.6, sp: 0.22, x0: 2 },
    { m: vmesh(makeCloud(23), M.cloud, 0.03, false), y: 8.0, z: -2.2, sp: 0.16, x0: -7 },
    { m: vmesh(makeCloud(37), M.cloud, 0.03, false), y: 6.6, z: -6.6, sp: 0.3, x0: 9 },
  ];
  for (const c of list) scene.add(c.m);
  return { update(t) {
    for (const c of list) {
      const span = 26; let x = c.x0 - c.sp * t; x = ((x + 13) % span + span) % span - 13;
      c.m.position.set(x, c.y + 0.1 * Math.sin(t * 0.3 + c.x0), c.z);
    }
  } };
})();

const gulls = (function () {
  function makeGull() {
    const g = new T.Group();
    const b = new Vox(0.0625);
    b.ell(0, 0, 0, 3.5, 1.5, 1.5, '#ffffff');
    b.ell(3.2, 0.9, 0, 1.6, 1.4, 1.3, '#ffffff');
    b.box(4, 1, -1, 4, 1, 0, '#ffffff');
    b.set(5, 0, -1, '#ffb020'); b.set(5, 0, 0, '#ffb020'); b.set(6, 0, -1, '#ffb020'); b.set(6, 0, 0, '#ffb020');
    b.set(3, 1, 1, '#1a1a1a'); b.set(3, 1, -2, '#1a1a1a');
    b.box(-5, 0, -1, -4, 0, 0, '#cfd6dc');
    const bm = vmesh(b, M.clip, 0.03); g.add(bm);
    const wv = new Vox(0.0625);
    for (let z = 0; z < 8; z++) for (let x = -2; x <= 1; x++) {
      if (z > 5 && x === -2) continue;
      wv.set(x, 0, z, z >= 6 ? '#3a3f45' : '#cfd6dc');
    }
    const wR = new T.Group(), wL = new T.Group();
    const mR = vmesh(wv, M.clip, 0.03); mR.position.z = 0; wR.add(mR); wR.position.set(0, 0.06, 0.06);
    const mL = vmesh(wv, M.clip, 0.03); mL.scale.z = -1; wL.add(mL); wL.position.set(0, 0.06, -0.06);
    g.add(wR, wL);
    const holder = new T.Group(); holder.add(g);
    return { holder, g, wR, wL };
  }
  const list = [
    Object.assign(makeGull(), { r: 1.45, y: 5.3, sp: 0.6, ph: 0 }),
    Object.assign(makeGull(), { r: 1.15, y: 5.9, sp: 0.75, ph: 2.6 }),
  ];
  for (const g of list) scene.add(g.holder);
  return { update(t) {
    for (const g of list) {
      const a = t * g.sp + g.ph;
      g.holder.position.set(-5.6 + Math.cos(a) * g.r, g.y + 0.15 * Math.sin(t * 1.3 + g.ph), -6.2 + Math.sin(a) * g.r);
      g.holder.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
      g.g.rotation.x = -0.35;
      const f = Math.sin(t * 7 + g.ph) * 0.6;
      g.wR.rotation.x = -f; g.wL.rotation.x = f;
    }
  } };
})();

/* =========================================================================
   循环移动的路段：木质栈道、棕榈树、装饰灯串、护栏、花草
   一个 16 单位长的路段（与底座同宽），复制 3 份首尾相接，整体从右向左平移
   ========================================================================= */
const TILE = 16;
const tileData = (function buildTile() {
  const A = new Vox(0.125), B = new Vox(0.0625), bulbs = [];
  const R = rng(20261117);

  // ---- 木质栈道（z 1.25 ~ 4.25）----
  const woods = ['#c9935a', '#b8844c', '#d6a66c', '#bf8a50', '#cf9b5e', '#c28f57'];
  for (let x = -64; x < 64; x++) {
    const p = (x + 64) >> 2, col = (x + 64) & 3;
    const wc = woods[Math.floor(h3(p, 3.3, 7.7) * woods.length)];
    for (let z = 10; z <= 33; z++) {
      if (z === 10 || z === 33) { A.set(x, 0, z, '#76502e'); A.set(x, 1, z, '#8f6139'); continue; }
      A.set(x, 0, z, '#5e3f24');
      if (col !== 3) A.set(x, 1, z, (col === 1 && (z === 12 || z === 31)) ? '#4e3a2a' : wc);
    }
  }

  // ---- 棕榈树 ----
  const PZ = 4;
  const palms = [
    { x: -48, h: 31, lx: 2, lz: -2, seed: 1 },
    { x: -4, h: 35, lx: -3, lz: -2, seed: 2 },
    { x: 40, h: 29, lx: 3, lz: -2, seed: 3 },
  ];
  const off = (p, y) => { const t = y / p.h; return [Math.round(p.lx * t * t), Math.round(p.lz * t * t)]; };
  for (const p of palms) {
    for (let y = 0; y < p.h; y++) {
      const [ox, oz] = off(p, y);
      const c = y % 3 === 0 ? '#7f5428' : (y % 3 === 1 ? '#a06c38' : '#93622f');
      A.box(p.x + ox, y, PZ + oz, p.x + ox + 1, y, PZ + oz + 1, c);
      if (y < 2) for (let dx = -1; dx <= 2; dx++) for (let dz = -1; dz <= 2; dz++) if (y === 0 || (dx >= 0 && dx <= 1) || (dz >= 0 && dz <= 1)) A.set(p.x + dx, y, PZ + dz, '#7a5229');
    }
    const [ox, oz] = off(p, p.h);
    const tx = p.x + ox + 1, ty = p.h, tz = PZ + oz + 1;
    A.box(tx - 1, ty - 1, tz - 1, tx, ty, tz - 0, '#4f8f2e');
    for (const [cx, cz] of [[-2, -1], [1, -1], [-1, 1], [0, -2], [1, 1]]) A.set(tx + cx, ty - 2, tz + cz, R() < 0.5 ? '#5e3b1f' : '#7a4e2a');
    const r = rng(p.seed * 977);
    const n = 7;
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2 + r() * 0.5;
      const L = 11 + Math.floor(r() * 4);
      const ca = Math.cos(a), sa = Math.sin(a), rise = 0.55 + r() * 0.2;
      for (let i = 1; i <= L; i++) {
        const fx = tx + ca * i, fz = tz + sa * i, fy = ty + 0.5 + i * rise - i * i * 0.07;
        A.set(Math.floor(fx), Math.floor(fy), Math.floor(fz), i > L - 2 ? '#86cf52' : '#3d8b2f');
        if (i >= 2 && i < L) {
          const w = i < L * 0.75 ? 2 : 1;
          for (let j = 1; j <= w; j++) for (const sg of [-1, 1]) {
            const lx = fx - sa * j * sg, lz = fz + ca * j * sg, ly = fy - 0.55 * j;
            A.set(Math.floor(lx), Math.floor(ly), Math.floor(lz), i > L * 0.8 ? '#7fcb4c' : ((i + j) % 2 ? '#5cb83c' : '#4aa634'));
          }
        }
      }
    }
  }

  // ---- 装饰灯串（挂在棕榈树之间）----
  const anchors = palms.map(p => {
    const ay = p.h - 8;
    const [ox, oz] = off(p, ay);
    return { x: (p.x + ox + 1) * 0.125, y: ay * 0.125, z: (PZ + oz + 2) * 0.125 + 0.03 };
  });
  anchors.push({ x: anchors[0].x + TILE, y: anchors[0].y, z: anchors[0].z });
  const BULB = ['#ffd54a', '#ff6b8b', '#5ee0ff', '#ff9f43', '#8dff6a', '#c88bff'];
  let bi = 0;
  const bs = 0.0625, bf = v => Math.floor(v / bs);
  function catenary(a, b, sag, col, onBulb, spacing) {
    const L = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.ceil(L / 0.02);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, y = a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t);
      B.set(bf(x), bf(y), bf(z), col);
    }
    if (onBulb) {
      const nb = Math.round(L / spacing);
      for (let j = 0; j < nb; j++) {
        const t = (j + 0.5) / nb;
        const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, y = a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t);
        onBulb(x, y, z);
      }
    }
  }
  for (let i = 0; i < 3; i++) {
    catenary(anchors[i], anchors[i + 1], 0.55, '#4b5258', (x, y, z) => {
      B.set(bf(x), bf(y) - 1, bf(z), '#2f5d3a');
      bulbs.push({ x: Math.floor(x / bs) * bs + bs / 2, y: (bf(y) - 1) * bs - 0.06, z: Math.floor(z / bs) * bs + bs / 2, c: BULB[bi % BULB.length], ph: bi * 1.7 });
      bi++;
    }, 0.42);
  }

  // ---- 前侧护栏（木桩 + 麻绳）----
  for (let k = 0; k < 8; k++) {
    const cx = -56 + 16 * k;
    A.box(cx - 1, 0, 35, cx, 5, 36, '#9b6b3e');
    A.box(cx - 1, 6, 35, cx, 6, 36, '#6f4a2a');
    catenary({ x: cx * 0.125, y: 0.62, z: 4.66 }, { x: (cx + 16) * 0.125, y: 0.62, z: 4.66 }, 0.14, '#e3c993');
  }

  // ---- 草地花草（z 4.9 ~ 7.8）----
  function bush(bx, bz) {
    A.ell(bx, 1.4, bz, 2.4 + R() * 0.8, 2.0 + R() * 0.5, 2.2 + R() * 0.5, (x, y, z) => {
      if (y < 0) return null;
      const h = h3(x, y, z);
      if (y >= 2 && h < 0.12) return h < 0.06 ? '#ff4f6a' : '#ffd23f';
      return h < 0.5 ? '#3f9b39' : '#4fb043';
    });
  }
  for (let i = 0; i < 5; i++) bush(-58 + i * 25 + Math.floor(R() * 6), 44 + Math.floor(R() * 14));
  for (let i = 0; i < 5; i++) {
    const rx = -62 + Math.floor(R() * 124), rz = 41 + Math.floor(R() * 20);
    const g = R() < 0.5 ? '#9a9690' : '#b3aea6';
    A.box(rx, 0, rz, rx + 1, 0, rz + (R() < 0.5 ? 1 : 0), g); A.set(rx, 1, rz, '#c7c2b9');
  }
  const PETALS = ['#ff4d6d', '#ffd23f', '#ffffff', '#b67cff', '#ff8c42', '#ff7eb6'];
  function flower(fx, fz, pc) {
    const h = 3 + Math.floor(R() * 3);
    for (let y = 0; y < h; y++) B.set(fx, y, fz, '#3f9a3a');
    B.set(fx + 1, 1, fz, '#5cb83c'); B.set(fx - 1, 2, fz, '#5cb83c');
    B.set(fx, h, fz, '#ffe066');
    B.set(fx + 1, h, fz, pc); B.set(fx - 1, h, fz, pc); B.set(fx, h, fz + 1, pc); B.set(fx, h, fz - 1, pc);
  }
  function tuft(tx, tz, cols) {
    const n = 3 + Math.floor(R() * 3);
    for (let b = 0; b < n; b++) {
      const bx = tx + Math.floor(R() * 3) - 1, bz = tz + Math.floor(R() * 3) - 1;
      const h = 2 + Math.floor(R() * 4), lean = R() < 0.5 ? -1 : 1;
      for (let y = 0; y < h; y++) B.set(bx + (y === h - 1 && h > 3 ? lean : 0), y, bz, cols[(b + y) % cols.length]);
    }
  }
  for (let i = 0; i < 26; i++) flower(-126 + Math.floor(R() * 252), 80 + Math.floor(R() * 42), PETALS[Math.floor(R() * PETALS.length)]);
  for (let i = 0; i < 44; i++) tuft(-126 + Math.floor(R() * 252), 79 + Math.floor(R() * 44), ['#4ea83a', '#6cc24a', '#3d8f2f']);
  // 栈道后侧沙地：海滨草 + 贝壳
  for (let i = 0; i < 14; i++) {
    let tx = -126 + Math.floor(R() * 252);
    tuft(tx, -4 + Math.floor(R() * 18), ['#9ccc5a', '#b5d86a', '#86b84a']);
  }
  for (let i = 0; i < 12; i++) {
    const sx = -126 + Math.floor(R() * 252), sz = -6 + Math.floor(R() * 24);
    B.set(sx, 0, sz, R() < 0.5 ? '#fff0e6' : '#ffc7c2'); if (R() < 0.5) B.set(sx + 1, 0, sz, '#ffe2d6');
  }
  return { gA: A.geo(0.07), gB: B.geo(0.08), bulbs };
})();

const bulbGeo = new T.BoxGeometry(0.1, 0.13, 0.1);
const bulbMat = new T.MeshBasicMaterial({ clippingPlanes: clipPlanes, toneMapped: false });
const tiles = [];
for (let k = -1; k <= 1; k++) {
  const g = new T.Group();
  const a = new T.Mesh(tileData.gA, M.clip); a.castShadow = true; a.receiveShadow = true;
  const b = new T.Mesh(tileData.gB, M.clip); b.castShadow = true; b.receiveShadow = true;
  const im = new T.InstancedMesh(bulbGeo, bulbMat, tileData.bulbs.length);
  im.frustumCulled = false;
  const dm = new T.Object3D();
  tileData.bulbs.forEach((bb, i) => { dm.position.set(bb.x, bb.y, bb.z); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); im.setColorAt(i, C(bb.c)); });
  g.add(a, b, im);
  scene.add(g);
  tiles.push({ g, k, im });
}
// 栈道在底座边界处的截面封口（静态，紧贴裁切平面，让切面看起来是实心的）
(function boardwalkCaps() {
  const v = new Vox(0.125);
  for (let z = 10; z <= 33; z++) { v.set(0, 0, z, '#5e3f24'); v.set(0, 1, z, (z === 10 || z === 33) ? '#8f6139' : '#a87443'); }
  for (const sx of [-1, 1]) {
    const m = vmesh(v, M.stat, 0.05, false);
    m.scale.x = 0.08; m.position.x = sx > 0 ? HALF - 0.01 : -HALF;
    scene.add(m);
  }
})();

/* =========================================================================
   青绿色自行车 + 白鹅
   ========================================================================= */
const rider = (function () {
  const bike = new T.Group();
  bike.position.set(0, 0.25, 2.75);
  bike.scale.setScalar(1.3);
  scene.add(bike);
  const UNIT = new T.BoxGeometry(1, 1, 1);
  const mat = c => new T.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.05 });
  const mTeal = mat('#12c2ae'), mSilver = mat('#d5dcdf'), mDark = mat('#2a2b30'), mSeat = mat('#5a3a26'),
        mLeg = mat('#ff9620'), mThigh = mat('#f1ede4'), mBell = mat('#ffd23f');
  const mGoose = M.stat.clone(); mGoose.color.set('#ffffff');
  function part(m, parent) { const o = new T.Mesh(UNIT, m); o.castShadow = true; o.receiveShadow = true; (parent || bike).add(o); return o; }
  function seg(o, x1, y1, x2, y2, z, th) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    o.position.set((x1 + x2) / 2, (y1 + y2) / 2, z); o.rotation.set(0, 0, Math.atan2(dy, dx)); o.scale.set(L + th * 0.6, th, th);
    return o;
  }
  function boxAt(m, x, y, z, sx, sy, sz, parent) { const o = part(m, parent); o.position.set(x, y, z); o.scale.set(sx, sy, sz); return o; }

  const R = 0.5;
  const RH = [-0.82, 0.5], FH = [0.82, 0.5], BB = [-0.08, 0.42], ST = [-0.3, 1.05], HTt = [0.56, 1.12], HTb = [0.62, 0.86];

  // 车轮（体素圆环 + 辐条）
  const wv = new Vox(1 / 16);
  for (let x = -9; x <= 8; x++) for (let y = -9; y <= 8; y++) {
    const d = Math.hypot(x + 0.5, y + 0.5); let c = null;
    if (d <= 8.2 && d > 6.7) c = '#26272b';
    else if (d <= 6.7 && d > 5.7) c = '#12c2ae';
    else if (d <= 1.6) c = '#9aa3a8';
    else if (d < 5.7) {
      const a = Math.atan2(y + 0.5, x + 0.5), step = Math.PI / 4;
      const da = a - Math.round(a / step) * step;
      if (Math.abs(Math.sin(da)) * d < 0.55) c = '#cfd6da';
    }
    if (c) { wv.set(x, y, -1, c); wv.set(x, y, 0, c); }
  }
  const wgeo = wv.geo(0.03);
  const wheelR = new T.Mesh(wgeo, M.stat), wheelF = new T.Mesh(wgeo, M.stat);
  for (const [w, p] of [[wheelR, RH], [wheelF, FH]]) { w.position.set(p[0], p[1], 0); w.castShadow = true; w.receiveShadow = true; bike.add(w); }

  // 车架
  seg(part(mTeal), BB[0], BB[1], ST[0], ST[1], 0, 0.085);
  seg(part(mTeal), ST[0], ST[1], HTt[0], HTt[1], 0, 0.08);
  seg(part(mTeal), BB[0], BB[1], HTb[0], HTb[1], 0, 0.09);
  seg(part(mTeal), HTb[0], HTb[1], HTt[0], HTt[1], 0, 0.11);
  for (const z of [-0.075, 0.075]) {
    seg(part(mTeal), BB[0], BB[1], RH[0], RH[1], z, 0.05);
    seg(part(mTeal), ST[0], ST[1], RH[0], RH[1], z, 0.05);
    seg(part(mTeal), HTb[0], HTb[1], FH[0], FH[1], z, 0.055);
  }
  seg(part(mSilver), ST[0], ST[1], -0.32, 1.12, 0, 0.05);
  boxAt(mSeat, -0.34, 1.145, 0, 0.32, 0.07, 0.17);
  seg(part(mSilver), HTt[0], HTt[1], 0.52, 1.3, 0, 0.05);
  boxAt(mSilver, 0.5, 1.3, 0, 0.055, 0.055, 0.62);
  boxAt(mDark, 0.5, 1.3, 0.27, 0.075, 0.075, 0.11); boxAt(mDark, 0.5, 1.3, -0.27, 0.075, 0.075, 0.11);
  boxAt(mBell, 0.5, 1.35, 0.17, 0.06, 0.05, 0.06);
  // 车铃 + 前车筐
  const bv = new Vox(1 / 16);
  for (let x = -2; x <= 2; x++) for (let y = 0; y <= 3; y++) for (let z = -3; z <= 2; z++) {
    if (x === -2 || x === 2 || z === -3 || z === 2 || y === 0) bv.set(x, y, z, ((x + y + z) & 1) ? '#c18a4a' : '#a8733c');
  }
  const basket = new T.Mesh(bv.geo(0.04), M.stat); basket.position.set(0.8, 1.04, 0); basket.castShadow = true; bike.add(basket);

  const basketTop = new T.Group();
  basketTop.position.copy(basket.position);
  bike.add(basketTop);
  function buildBasketContents(kind) {
    clearGroup(basketTop);
    const v = new Vox(0.04);
    if (kind === 'shells') {
      // 海边捡的贝壳与小海星
      for (let x = -2; x <= 1; x++) v.set(x, 4, -1, '#fff2dc');
      for (let x = -1; x <= 0; x++) for (let z = -2; z <= -1; z++) v.set(x, 4, z, '#ffb7a1');
      v.set(-2, 4, 0, '#f7c565'); v.set(2, 4, -2, '#f26b4e'); v.set(1, 4, 0, '#19a99a');
      v.set(0, 5, -1, '#fff7ea'); v.set(0, 5, -2, '#ffd6c2');
    } else if (kind === 'snack') {
      // 法棍 + 苹果 + 小饼干
      for (let x = -2; x <= 2; x++) v.set(x, 4, -1, x % 2 ? '#d9a25f' : '#b97b3f');
      v.set(-1, 5, -1, '#e9b871'); v.set(1, 5, -1, '#e9b871');
      for (let x = 1; x <= 2; x++) for (let z = 0; z <= 1; z++) v.set(x, 4, z, '#f26b4e');
      v.set(2, 5, 0, '#4fae3a');
      v.set(-2, 4, 1, '#f7c565');
    } else {
      // 一把海边野花（默认）
      v.set(0, 4, -1, '#ff6fa5'); v.set(-1, 4, -1, '#ff6fa5');
      v.set(0, 4, 0, '#ffd23f'); v.set(1, 4, 0, '#4fae3a'); v.set(-1, 4, 0, '#4fae3a');
      v.set(0, 5, -1, '#ff6fa5'); v.set(1, 4, -2, '#ff9ec2'); v.set(1, 5, -2, '#ffd23f');
      v.set(-1, 5, 0, '#4fae3a');
    }
    finishVox(v, basketTop);
  }
  buildBasketContents('flowers');
  seg(part(mSilver), HTt[0], HTt[1] - 0.06, 0.76, 1.07, 0, 0.035);
  // 链条 / 后飞轮
  boxAt(mSilver, RH[0], RH[1], 0.1, 0.13, 0.13, 0.03);
  seg(part(mDark), BB[0], BB[1] + 0.18, RH[0], RH[1] + 0.065, 0.1, 0.025);
  seg(part(mDark), BB[0], BB[1] - 0.18, RH[0], RH[1] - 0.065, 0.1, 0.025);
  // 牙盘
  const cv = new Vox(1 / 16);
  for (let x = -4; x <= 3; x++) for (let y = -4; y <= 3; y++) {
    const d = Math.hypot(x + 0.5, y + 0.5); if (d > 3.3) continue;
    const a = Math.atan2(y + 0.5, x + 0.5);
    let c = d > 2.4 ? (((x + y) & 1) ? '#c3cbd0' : '#aab3b8') : (d < 1.1 ? '#7d868b' : (Math.floor((a + Math.PI) / (Math.PI / 3)) % 2 ? '#12c2ae' : null));
    cv.set(x, y, 0, c);
  }
  const ring = new T.Mesh(cv.geo(0.02), M.stat); ring.position.set(BB[0], BB[1], 0.07); ring.castShadow = true; bike.add(ring);

  // 曲柄 / 脚踏
  const sides = [
    { z: 0.19, armZ: 0.13, off: 0, hipZ: 0.17 },
    { z: -0.19, armZ: -0.13, off: Math.PI, hipZ: -0.17 },
  ];
  for (const s of sides) {
    s.arm = part(mSilver); s.pedal = part(mDark); s.pedal.scale.set(0.16, 0.04, 0.11);
    s.thigh = part(mThigh); s.shin = part(mLeg); s.knee = part(mLeg); s.knee.scale.setScalar(0.085);
    s.foot = part(mLeg); s.foot.scale.set(0.21, 0.04, 0.14);
    s.toe = part(mLeg); s.toe.scale.set(0.05, 0.03, 0.17);
  }

  // ---- 白鹅 ----
  const gs = 1 / 16;
  const goose = new T.Group(); bike.add(goose);
  const bodyV = new Vox(gs);
  bodyV.ell(0, 0, 0, 7.5, 5, 4.5, (x, y) => y < -2 ? '#ebe7dd' : '#fbf9f3');
  bodyV.ell(-7.5, 1.5, 0, 3.2, 2.4, 3.2, '#f6f3ec');
  bodyV.box(-11, 2, -2, -10, 4, 1, '#f1eee6');
  bodyV.box(-12, 4, -1, -11, 5, 0, '#e2ddd1');
  const bodyM = new T.Mesh(bodyV.geo(0.03), mGoose); bodyM.castShadow = true; bodyM.receiveShadow = true; goose.add(bodyM);

  const neckPivot = new T.Group(); neckPivot.position.set(5 * gs, 3 * gs, 0); goose.add(neckPivot);
  const nv = new Vox(gs);
  const NP = [[0, 0], [0.6, 2.5], [1.0, 5], [1.2, 7.5], [1.6, 10], [2.4, 12.5], [3.4, 14.2]];
  for (let i = 0; i < NP.length - 1; i++) for (let s = 0; s <= 4; s++) {
    const u = s / 4;
    nv.ell(NP[i][0] + (NP[i + 1][0] - NP[i][0]) * u, NP[i][1] + (NP[i + 1][1] - NP[i][1]) * u, 0, 2.3, 2.3, 2.15, '#fbf9f3');
  }
  nv.ell(4.5, 16, 0, 3.6, 3.1, 2.9, '#fdfcf8');
  nv.box(8, 14, -1, 11, 15, 0, '#ff9a1f');
  nv.box(8, 16, -1, 9, 16, 0, '#ff9a1f');
  nv.set(11, 15, -1, '#f07f12'); nv.set(11, 15, 0, '#f07f12'); nv.set(11, 14, -1, '#e67410'); nv.set(11, 14, 0, '#e67410');
  for (const z of [1, -2]) { nv.set(6, 16, z, '#161616'); nv.set(6, 17, z, '#161616'); }
  const neckM = new T.Mesh(nv.geo(0.025), mGoose); neckM.castShadow = true; neckM.receiveShadow = true; neckPivot.add(neckM);

  const wingV = new Vox(gs);
  wingV.ell(5, 0, 0, 6.2, 2.3, 1.0, (x, y) => x >= 10 ? '#a7a296' : (x >= 8 ? '#d6d1c4' : (y >= 1 ? '#fcfbf7' : '#efebe2')));
  const wingGeo = wingV.geo(0.03);
  const wings = [0.33, -0.33].map(z => {
    const p = new T.Group(); p.position.set(3 * gs, 2 * gs, z); goose.add(p);
    const m = new T.Mesh(wingGeo, mGoose); m.castShadow = true; m.position.z = -gs * 0 ; p.add(m);
    return { p, z };
  });

  // 近侧翅膀末端加一只小小的“手”，喝茶时用它端杯子
  const handV = new Vox(gs);
  handV.ell(0, 0, 0, 2.4, 1.7, 1.5, '#fbf9f3');
  handV.set(2, 0, 1, '#fbf9f3'); handV.set(2, 1, 1, '#f1ede4');
  const hand = new T.Mesh(handV.geo(0.015), mGoose);
  hand.position.set(0.655, 0, 0); hand.castShadow = true;
  wings[0].p.add(hand);

  // 小板凳：下车后出现在近侧
  const stool = new T.Group();
  bike.add(stool);
  {
    const v = new Vox(1 / 26);
    for (let x = -5; x <= 4; x++) for (let z = -5; z <= 4; z++) {
      if (Math.abs(x + 0.5) <= 5 && Math.abs(z + 0.5) <= 5) v.set(x, 0, z, '#d9a068');
      if (Math.abs(x + 0.5) <= 3.8 && Math.abs(z + 0.5) <= 3.8) v.set(x, 1, z, '#f2e4c4');
    }
    for (const [lx, lz] of [[-4, -4], [3, -4], [-4, 3], [3, 3]]) {
      for (let y = -9; y <= -1; y++) v.set(lx, y, lz, '#a8733c');
    }
    for (const [lx, lz] of [[-4, -4], [3, 3], [-4, 3], [3, -4]]) {
      v.set(lx, 2, lz, '#c18a4a');
    }
    const mesh = new T.Mesh(v.geo(0.02), M.stat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    stool.add(mesh);
  }
  stool.visible = false; stool.position.set(-0.02, 0.38, 0.62);

  /* ================= 可换装 / 喝茶道具 ================= */
  const hatGroup = new T.Group();
  hatGroup.position.set(4.5 * gs, 1.185, 0);
  neckPivot.add(hatGroup);

  const scarfGroup = new T.Group();
  scarfGroup.position.set(5 * gs, 3 * gs, 0);
  goose.add(scarfGroup);

  const teaGroup = new T.Group();
  teaGroup.visible = false;
  teaGroup.position.set(0.78, 0.92, 0.30);
  teaGroup.rotation.set(0, -0.12, -0.06);
  goose.add(teaGroup);

  const steam = new T.Group();
  teaGroup.add(steam);
  {
    const cs = 1 / 45, cup = new Vox(cs);
    for (let x = -6; x <= 5; x++) for (let z = -6; z <= 5; z++) {
      if (Math.hypot(x + 0.5, z + 0.5) <= 5.4) cup.set(x, 0, z, '#fff7ea');
    }
    for (let x = -4; x <= 3; x++) for (let z = -4; z <= 3; z++) {
      const d = Math.hypot(x + 0.5, z + 0.5);
      if (d <= 3.4) { for (let y = 1; y <= 4; y++) cup.set(x, y, z, y === 1 ? '#fff7ea' : '#19a99a'); }
      if (d <= 3.0) cup.set(x, 4, z, '#7a4a2c');
    }
    // 杯口
    for (let x = -5; x <= 4; x++) for (let z = -5; z <= 4; z++) {
      const d = Math.hypot(x + 0.5, z + 0.5);
      if (d <= 4.6 && d > 3.4) cup.set(x, 4, z, '#fff7ea');
    }
    // 杯把
    for (const z of [-1, 0]) for (let x = 3; x <= 6; x++) for (let y = 1; y <= 4; y++) {
      if (x === 6 || x === 3 || y === 4 || y === 1) cup.set(x, y, z, '#19a99a');
    }
    // 小茶包吊牌
    cup.set(4, -2, 0, '#f7c565'); cup.set(4, -3, 0, '#19a99a'); cup.set(3, -2, 0, '#f7c565');
    const cupMesh = new T.Mesh(cup.geo(0.02), M.stat);
    cupMesh.castShadow = true; cupMesh.receiveShadow = true;
    teaGroup.add(cupMesh);
    for (let i = 0; i < 3; i++) {
      const puff = new T.Mesh(new T.BoxGeometry(0.045, 0.045, 0.045),
        new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false }));
      puff.position.set(0, 0.2 + i * 0.08, 0);
      steam.add(puff);
    }
  }

  const look = { feather: '#ffffff', hat: null, scarf: null, frame: '#12C2AE' };
  function clearGroup(g) {
    for (let i = g.children.length - 1; i >= 0; i--) {
      const o = g.children[i]; g.remove(o);
      o.traverse(c => { if (c.geometry) c.geometry.dispose(); });
    }
  }
  function finishVox(v, group) {
    const mesh = new T.Mesh(v.geo(0.02), M.stat);
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  }
  function buildHat(kind) {
    clearGroup(hatGroup);
    if (!kind || kind === 'none') return;
    const v = new Vox(1 / 40);
    if (kind === 'straw') {
      for (let x = -13; x <= 12; x++) for (let z = -13; z <= 12; z++) {
        const d = Math.hypot(x + 0.5, z + 0.5);
        if (d <= 12.6 && d > 5.4) v.set(x, 0, z, ((x + z) & 1) ? '#f0cb82' : '#f6d795');
      }
      for (let y = 1; y <= 5; y++) {
        const r = 6.8 - y * 0.55;
        for (let x = -8; x <= 7; x++) for (let z = -8; z <= 7; z++) {
          if (Math.hypot(x + 0.5, z + 0.5) <= r) v.set(x, y, z, '#f8dc9e');
        }
      }
      for (let x = -8; x <= 7; x++) for (let z = -8; z <= 7; z++) {
        const d = Math.hypot(x + 0.5, z + 0.5);
        if (d <= 7.0 && d > 5.8) v.set(x, 1, z, '#f26b4e');
      }
    } else if (kind === 'sailor') {
      v.ell(0, 1, 0, 10, 4, 9.2, (x, y) => y >= 1 ? '#fdfcf8' : '#e9e4d7');
      for (let x = -11; x <= 10; x++) for (let z = -10; z <= 9; z++) {
        const d = Math.hypot(x + 0.5, z + 0.5);
        if (d <= 10.3 && d > 8.7) v.set(x, 0, z, '#1d3f52');
      }
      for (let x = 5; x <= 15; x++) for (let z = -6; z <= 5; z++) {
        if (x >= 14 || Math.abs(z + 0.5) >= 4.2 || x === 5) v.set(x, 0, z, '#1d3f52');
      }
      v.set(0, 5, 0, '#f26b4e');
    } else if (kind === 'beret') {
      for (let x = -12; x <= 11; x++) for (let z = -11; z <= 10; z++) {
        const d = Math.hypot(x + 0.5, z + 0.5);
        if (d <= 11.2) v.set(x, 0, z, '#e8604a');
        if (d <= 9.6 && d > 6.4) v.set(x, 1, z, '#f26b4e');
      }
      v.ell(0, 2, 0, 7.2, 3.4, 6.6, '#f26b4e');
      v.set(2, 5, 0, '#c4482f'); v.set(1, 4, 0, '#c4482f');
    } else if (kind === 'bucket') {
      for (let x = -8; x <= 7; x++) for (let z = -8; z <= 7; z++) {
        const d = Math.hypot(x + 0.5, z + 0.5);
        if (d <= 11.4 && d > 7.2) v.set(x, 0, z, '#f4e6c8');
        if (d <= 11.4 && d > 7.2) v.set(x, 1, z, '#e8d4ad');
        if (d <= 7.6) { for (let y = 1; y <= 4; y++) v.set(x, y, z, '#fff6e4'); }
      }
      for (let x = -8; x <= 7; x++) for (let z = -8; z <= 7; z++) {
        const d = Math.hypot(x + 0.5, z + 0.5);
        if (d <= 8.4 && d > 6.6) v.set(x, 2, z, '#19a99a');
      }
      v.set(0, 5, 0, '#f7c565');
    } else if (kind === 'beanie') {
      for (let x = -8; x <= 7; x++) for (let z = -8; z <= 7; z++) {
        const d = Math.hypot(x + 0.5, z + 0.5);
        if (d <= 7.8) {
          for (let y = 1; y <= 6; y++) {
            const r = 8.2 - y * 0.55;
            if (d <= r) v.set(x, y, z, y % 3 === 0 ? '#0c8c80' : '#12a99a');
          }
        }
        if (d <= 8.6 && d > 6.2) v.set(x, 0, z, '#fff3d2');
      }
      for (let x = -2; x <= 1; x++) for (let z = -2; z <= 1; z++) for (let y = 7; y <= 8; y++) v.set(x, y, z, z % 2 ? '#fff3d2' : '#f7c565');
    } else if (kind === 'crown') {
      for (let x = -9; x <= 8; x++) for (let z = -9; z <= 8; z++) {
        const d = Math.hypot(x + 0.5, z + 0.5);
        if (d <= 9.2 && d > 7.4) { for (let y = 0; y <= 3; y++) v.set(x, y, z, '#f7c565'); }
      }
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        const x = Math.round(Math.cos(a) * 8 - 0.5), z = Math.round(Math.sin(a) * 8 - 0.5);
        for (let h = 0; h <= 3; h++) v.set(x, 4 + h, z, '#f7c565');
        v.set(x, 2, z, i % 2 ? '#f26b4e' : '#19a99a');
      }
    } else if (kind === 'flower') {
      const petals = ['#ff8c42', '#ff7eb6', '#ffd23f', '#ffffff'];
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2;
        const x = Math.round(Math.cos(a) * 8.5 - 0.5), z = Math.round(Math.sin(a) * 8.5 - 0.5);
        v.set(x, 0, z, '#4fae3a');
        v.set(x, 1, z, petals[i % 4]);
        v.set(x + 1, 1, z, petals[(i + 1) % 4]);
        v.set(x, 1, z + 1, '#ffffff');
        v.set(x, 2, z, '#ffe066');
      }
    }
    finishVox(v, hatGroup);
  }
  function buildScarf(color) {
    clearGroup(scarfGroup);
    if (!color || color === 'none') return;
    const v = new Vox(1 / 40);
    for (let y = 0; y <= 3; y++) for (let x = -8; x <= 7; x++) for (let z = -8; z <= 7; z++) {
      const d = Math.hypot(x + 0.5, z + 0.5);
      if (d <= 7.4 && d > 5.2) v.set(x, y, z, y === 3 ? '#ffffff' : color);
    }
    // 结 + 两条飘带
    for (let x = 3; x <= 7; x++) for (let y = 0; y <= 3; y++) {
      if (x === 7 || y === 0 || y === 3) v.set(x, y, 6, color);
    }
    for (let i = 0; i < 5; i++) {
      v.set(3 - i, -i, 7, i % 2 ? color : '#ffffff');
      v.set(3 - i, -i, 8, color);
    }
    finishVox(v, scarfGroup);
  }

  const v3 = new T.Vector3();
  function ik(hx, hy, fx, fy, a, b) {
    const dx = fx - hx, dy = fy - hy;
    let d = Math.hypot(dx, dy); d = Math.min(Math.max(d, Math.abs(a - b) + 1e-3), a + b - 1e-3);
    const phi = Math.atan2(dy, dx), al = Math.acos((a * a + d * d - b * b) / (2 * a * d));
    const ang = phi + al;
    return [hx + a * Math.cos(ang), hy + a * Math.sin(ang)];
  }

  function setLook(next) {
    if (!next) return;
    if (next.feather) { look.feather = next.feather; mGoose.color.set(next.feather); }
    if (next.frame) { look.frame = next.frame; mTeal.color.set(next.frame); }
    if (next.hat !== undefined && next.hat !== look.hat) { look.hat = next.hat; buildHat(next.hat); }
    if (next.scarf !== undefined && next.scarf !== look.scarf) { look.scarf = next.scarf; buildScarf(next.scarf); }
    if (next.basket !== undefined && next.basket !== look.basket) { look.basket = next.basket; buildBasketContents(next.basket); }
  }

  return {
    setLook,
    update(t, dist, ride, tea) {
      ride = ride === undefined ? 1 : ride;
      tea = tea === undefined ? 0 : tea;
      const p = Math.max(0, Math.min(1, tea));
      const mix = (a, b, k) => a + (b - a) * k;
      const sstep = (v, a, b) => {
        const x = Math.max(0, Math.min(1, (v - a) / (b - a)));
        return x * x * (3 - 2 * x);
      };

      const wa = -dist / R;
      wheelR.rotation.z = wa; wheelF.rotation.z = wa;
      const crank = wa * 0.95;
      ring.rotation.z = crank;
      bike.position.y = 0.25 + Math.abs(Math.sin(dist * Math.PI * 2)) * 0.004 * ride;

      /* ---- 下车 → 板凳 → 喝茶 ---- */
      // 0 骑行中；1 坐到板凳上喝茶
      const hop = sstep(p, 0.05, 0.62);
      const seat = sstep(p, 0.34, 0.84);
      const wingUp = sstep(p, 0.58, 0.94);
      const rideW = ride * (1 - seat);

      const bx = mix(-0.25, -0.16, hop);
      const by = mix(1.45, 0.72, hop) + 0.10 * Math.sin(Math.PI * hop);
      const bz = 0.82 * hop;
      goose.position.set(bx, by + 0.008 * Math.sin(t * 1.4) * seat, bz);
      goose.rotation.set(
        0.02 * Math.sin(crank) * rideW,
        0,
        (-0.07 + 0.012 * Math.sin(crank * 2)) * rideW + (0.01 + 0.01 * Math.sin(t * 1.1)) * seat
      );
      goose.updateMatrix();

      // 头：骑行点头看路；坐下后低头凑近杯子小口抿
      const lookCam = Math.pow(Math.max(0, Math.sin(t * 0.33)), 4) * rideW;
      const sip = 0.5 + 0.5 * Math.cos(t * 1.25);
      neckPivot.rotation.set(
        0.04 * Math.sin(crank) * rideW + 0.02 * Math.sin(t * 1.2) * seat,
        -0.55 * lookCam - 0.25 * seat,
        0.04 + 0.06 * Math.sin(crank * 2 + 0.8) * rideW - seat * (0.48 + 0.04 * sip)
      );

      // 翅膀：近侧展开成“端杯子的手”，远侧搭在腿上
      for (const w of wings) {
        const near = w.z > 0;
        v3.set(3 * gs, 2 * gs, w.z).applyMatrix4(goose.matrix);
        const ang = Math.atan2(1.3 - v3.y, 0.5 - v3.x) - goose.rotation.z;
        const hang = -0.22 + 0.05 * Math.sin(t * 1.3 + w.z * 9);
        const teaAng = near ? 0.48 + 0.025 * Math.sin(t * 1.15) : -0.06;
        w.p.rotation.z = ang * rideW + hang * (1 - rideW) * (1 - wingUp) + teaAng * wingUp;
        w.p.rotation.y = near ? 0.18 * wingUp : -0.10 * wingUp;
        w.p.scale.x = near ? 1 + 0.42 * wingUp : 1;
        w.p.updateMatrix();
      }

      // 腿：骑行踩脚踏，坐下后脚落到地面
      for (const s of sides) {
        const a = crank + s.off;
        const px = BB[0] + 0.17 * Math.cos(a), py = BB[1] + 0.17 * Math.sin(a);
        seg(s.arm, BB[0], BB[1], px, py, s.armZ, 0.045);
        s.pedal.position.set(px, py, s.z);
        v3.set(1 * gs, -3 * gs, s.hipZ).applyMatrix4(goose.matrix);
        const footZ = mix(s.z, 0.80 + (s.z > 0 ? 0.10 : -0.10), seat);
        const fx = mix(px + 0.01, 0.20, seat);
        const fy = mix(py + 0.06, 0.03, seat);
        const [kx, ky] = ik(v3.x, v3.y, fx, fy, 0.5, 0.5);
        const kz = mix((v3.z + s.z) / 2, (v3.z + footZ) / 2, seat);
        seg(s.thigh, v3.x, v3.y, kx, ky, kz, 0.1);
        seg(s.shin, kx, ky, fx, fy, kz, 0.06);
        s.knee.position.set(kx, ky, kz);
        s.foot.position.set(fx + 0.04, fy + 0.02, footZ);
        s.toe.position.set(fx + 0.15, fy + 0.015, footZ);
      }

      // 小板凳：坐下前弹出来，起身后收起
      const st = sstep(p, 0.26, 0.72);
      stool.visible = st > 0.01;
      if (stool.visible) {
        stool.scale.setScalar(0.15 + 0.85 * st);
        stool.position.set(-0.16, 0.38, mix(0.22, 0.82, st));
      }

      // 茶杯：在近侧翅膀末端，热气跟着杯口
      const cupOn = p > 0.64;
      teaGroup.visible = cupOn;
      if (cupOn) {
        const tip = new T.Vector3(0.65 * wings[0].p.scale.x, 0, 0).applyMatrix4(wings[0].p.matrix);
        const pop = sstep(p, 0.64, 0.9);
        teaGroup.position.set(tip.x + 0.18, tip.y + 0.01, tip.z + 0.04);
        teaGroup.scale.setScalar(0.55 + 0.42 * pop);
        teaGroup.rotation.set(0, -0.12, -0.03);
        for (let i = 0; i < steam.children.length; i++) {
          const q = steam.children[i], ph = (t * 0.5 + i / steam.children.length) % 1;
          q.position.set(0.012 * Math.sin(t * 2.2 + i * 2), 0.14 + ph * 0.34, 0.012 * Math.cos(t * 2.2 + i * 2));
          q.scale.setScalar(0.55 + ph * 0.9);
          q.material.opacity = 0.5 * (1 - ph) * pop;
        }
      }
    },
  };
})();

/* =========================================================================
   柔和的底部投影
   ========================================================================= */
(function groundShadow() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64);
  gr.addColorStop(0, 'rgba(20,60,90,0.55)'); gr.addColorStop(0.55, 'rgba(20,60,90,0.25)'); gr.addColorStop(1, 'rgba(20,60,90,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const tx = new T.CanvasTexture(c);
  const m = new T.Mesh(new T.PlaneGeometry(27, 27), new T.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = -3.6; scene.add(m);
})();

/* =========================================================================
   视角 / 状态 / 交互
   ========================================================================= */
const homeTarget = opts.target ? new T.Vector3(opts.target[0], opts.target[1], opts.target[2]) : new T.Vector3(0, 0.9, 0.2);
const homeTheta = opts.theta === undefined ? 0.42 : opts.theta;
const homePhi = opts.phi === undefined ? 0.585 : opts.phi;
const homeZoom = opts.zoom || 1;
const view = {
  theta: homeTheta, phi: homePhi, zoom: homeZoom,
  target: homeTarget,
  cur: { theta: homeTheta, phi: homePhi, zoom: homeZoom },
  home: { theta: homeTheta, phi: homePhi, zoom: homeZoom },
};
const fitDistance = () => {
  const tanH = Math.tan(camera.fov * Math.PI / 360);
  return Math.max(16.5 / (2 * tanH), 19.5 / (2 * tanH * camera.aspect));
};
function applyCamera() {
  const c = view.cur, r = fitDistance() * c.zoom;
  camera.position.set(
    view.target.x + r * Math.cos(c.phi) * Math.sin(c.theta),
    view.target.y + r * Math.sin(c.phi),
    view.target.z + r * Math.cos(c.phi) * Math.cos(c.theta));
  camera.lookAt(view.target);
}

const state = {
  ride: opts.mode === 'ride' ? 1 : 0,
  want: opts.mode === 'ride',
  dist: 0,
  tea: opts.mode === 'ride' ? 0 : 1,
  t: 0,
};

(function controls() {
  const el = renderer.domElement, pts = new Map();
  let pinch0 = 0, zoom0 = 1;
  el.addEventListener('pointerdown', e => {
    el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    el.classList.add('drag');
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = view.zoom; }
  });
  el.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 1) {
      view.theta -= dx * 0.0062;
      view.phi = Math.min(1.2, Math.max(0.12, view.phi + dy * 0.005));
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0 > 0) view.zoom = Math.min(1.55, Math.max(0.6, zoom0 * pinch0 / d));
    }
  });
  const up = e => { pts.delete(e.pointerId); if (!pts.size) el.classList.remove('drag'); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('dblclick', () => {
    view.theta = view.home.theta; view.phi = view.home.phi; view.zoom = view.home.zoom;
  });
})();

const ro = new ResizeObserver(() => {
  const w = cw(), h = ch();
  if (!w || !h) return;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});
ro.observe(container);

const tmpC = new T.Color();
const clock = new T.Clock();
let raf = 0;

function step(dt) {
  const t = state.t;
  // 速度缓动：开骑时慢慢加速，暂停时缓缓滑行停下
  const target = state.want ? 1 : 0;
  const rate = state.want ? 1.7 : 2.6;
  state.ride += (target - state.ride) * Math.min(1, dt * rate);
  if (!state.want && state.ride < 0.012) state.ride = 0;
  if (state.want && state.ride > 0.988) state.ride = 1;
  state.dist += dt * 1.85 * state.ride;

  // 停稳后喝茶
  const teaTarget = (!state.want && state.ride < 0.06) ? 1 : 0;
  state.tea += (teaTarget - state.tea) * Math.min(1, dt * (teaTarget ? 1.35 : 3.2));
  if (state.tea < 0.002) state.tea = 0;

  const shift = state.dist % TILE;
  for (const tl of tiles) tl.g.position.x = tl.k * TILE - shift;
  for (const tl of tiles) {
    tileData.bulbs.forEach((b, i) => {
      const k = (state.want || state.ride > 0.1) ? 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(t * 2.2 + b.ph)) : 0.72;
      tmpC.copy(C(b.c)).multiplyScalar(k * 1.25); tl.im.setColorAt(i, tmpC);
    });
    tl.im.instanceColor.needsUpdate = true;
  }

  water.update(t);
  lighthouse.update(t);
  boats.update(t);
  clouds.update(t);
  gulls.update(t);
  crab.update(t);
  rider.update(t, state.dist, state.ride, state.tea);

  const k = 1 - Math.exp(-dt * 7);
  view.cur.theta += (view.theta - view.cur.theta) * k;
  view.cur.phi += (view.phi - view.cur.phi) * k;
  view.cur.zoom += (view.zoom - view.cur.zoom) * k;
  applyCamera();
  renderer.render(scene, camera);
}

function frame() {
  raf = requestAnimationFrame(frame);
  const dtRaw = clock.getDelta();
  const dt = Math.min(Math.max(dtRaw, 0), 0.08);
  state.t += dt;
  step(dt);
}

/* =========================================================================
   对外接口
   ========================================================================= */
rider.setLook(Object.assign({ feather: '#ffffff', hat: 'straw', scarf: '#F26B4E', frame: '#12C2AE', basket: 'flowers' }, opts.look || {}));

function setMode(mode) {
  state.want = mode === 'ride';
  return api;
}

const api = {
  setMode,
  setRiding(on) { state.want = !!on; return api; },
  setLook(look) { rider.setLook(look || {}); return api; },
  step(seconds) {
    let left = Math.max(0, seconds || 0);
    while (left > 0) { const d = Math.min(0.05, left); left -= d; state.t += d; step(d); }
    return api;
  },
  setView(o) {
    o = o || {};
    if (o.zoom != null) { view.zoom = o.zoom; view.home.zoom = o.zoom; }
    if (o.theta != null) { view.theta = o.theta; view.home.theta = o.theta; }
    if (o.phi != null) { view.phi = o.phi; view.home.phi = o.phi; }
    if (o.target) { view.target.set(o.target[0], o.target[1], o.target[2]); }
    return api;
  },
  resetView() { view.theta = view.home.theta; view.phi = view.home.phi; view.zoom = view.home.zoom; return api; },
  resize() {
    const w = cw(), h = ch();
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    return api;
  },
  dispose() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  },
  get state() { return { riding: state.want, speed: state.ride, tea: state.tea }; },
  renderer, scene, camera,
};



rider.update(0, 0, state.ride, state.tea);
applyCamera();
renderer.render(scene, camera);
raf = requestAnimationFrame(frame);
return api;
};

