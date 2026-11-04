// The agent as a machine on a pale table, read left to right: the user's phone, the glass chamber where the model reads
// its context, then the three tools (web page, documents, bank). In SECURE_MODE gates stand on every path. The red
// thread is the attacker's instruction; it enters the chamber or it stops at a gate.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {along, AT} from './timeline.js';

export const COL = {bg: '#edf1ee', ink: '#1d2230', mid: '#667085', line: '#c9d2cc', accent: '#e23c2c', brand: '#059669', dark: '#141824', plate: '#fbfcfb'};
const c = (x) => new THREE.Color(x);
const MONO = '"JetBrains Mono", Consolas, monospace';

function tex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const textTex = (lines, {w = 640, h = 180, bg = null, fg = COL.ink, size = 44} = {}) =>
  tex(w, h, (g) => {
    if (bg) {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
    }
    g.fillStyle = fg;
    g.font = `700 ${size}px ${MONO}`;
    g.textBaseline = 'middle';
    lines.forEach((l, i) => g.fillText(l, 24, h / 2 + (i - (lines.length - 1) / 2) * size * 1.25));
  });

export function createStage({canvas}) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.background = c(COL.bg);
  const camera = new THREE.PerspectiveCamera(34, 9 / 16, 1, 300);

  scene.add(new THREE.HemisphereLight('#ffffff', '#cfd8d2', 1.5));
  const sun = new THREE.DirectionalLight('#fff8ef', 2.1);
  sun.position.set(-7, 14, 16);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, {left: -13, right: 13, top: 9, bottom: -9, near: 2, far: 50});
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  const std = (color, o = {}) => new THREE.MeshStandardMaterial({color, roughness: 0.58, metalness: 0.06, ...o});
  const inkM = std(COL.ink);
  const darkM = std(COL.dark, {roughness: 0.45});
  const paleM = std(COL.plate, {roughness: 0.8});
  const root = new THREE.Group();
  scene.add(root);
  const box = (w, h, d, mat, x, y, z, parent = root, r = 0.08) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.2, h / 2.2, d / 2.2)), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const face = (w, h, map, x, y, z, parent = root) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map, transparent: true, toneMapped: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4}));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // back wall that catches the shadows and frames the machine
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), new THREE.ShadowMaterial({color: '#4c5a52', opacity: 0.2, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8}));
  wall.position.z = -1.5;
  wall.receiveShadow = true;
  root.add(wall);

  // the wires, the same polylines the packets travel
  const wire = (pts, r = 0.035, mat = std('#9aa6a0')) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2] - 0.2)), false, 'catmullrom', 0.04);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, r, 8), mat);
    m.castShadow = true;
    root.add(m);
  };
  wire([AT.phone, AT.gateIn, AT.core]);
  wire([AT.phone, AT.gateOut, AT.core]);
  wire([AT.core, AT.gWeb, AT.web]);
  wire([AT.core, AT.gDocs, AT.docs]);
  wire([AT.core, AT.gBank, AT.bank]);

  // ------------------------------------------------------------ phone
  {
    box(2.1, 4, 0.26, darkM, AT.phone[0], 0, 0, root, 0.26);
    const t = tex(420, 800, (g, w, h) => {
      g.fillStyle = '#fbfcfb';
      g.fillRect(0, 0, w, h);
      g.fillStyle = COL.brand;
      g.fillRect(0, 0, w, 96);
      g.fillStyle = '#fff';
      g.font = `700 40px ${MONO}`;
      g.fillText('Finora', 28, 62);
      g.fillStyle = '#dfe7e2';
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.roundRect(i % 2 ? 110 : 28, 136 + i * 118, 282, 88, 18);
        g.fill();
      }
    });
    face(1.86, 3.56, t, AT.phone[0], 0, 0.14);
  }

  // ------------------------------------------------------------ the chamber: glass, three layers of context, the model
  const chamber = new THREE.Group();
  root.add(chamber);
  const slab = (label, y, color) => {
    const m = std(color, {emissive: c(COL.accent), emissiveIntensity: 0});
    box(3.5, 0.2, 2, m, 0, y, 0, chamber, 0.05);
    const d = face(3.3, 0.5, textTex([label], {w: 860, h: 130, size: 68, fg: COL.ink}), 0, y + 0.36, 1.02, chamber);
    return {m, d};
  };
  const slabs = {
    system: slab('PROMPT SYSTÈME', -2.2, '#dfe5e1'),
    user: slab('MESSAGE', -1.5, '#dfe5e1'),
    data: slab('DONNÉES EXTERNES', -0.8, '#dfe5e1'),
  };
  const orbM = std('#20283a', {emissive: c(COL.brand), emissiveIntensity: 0.7, flatShading: true, roughness: 0.35, metalness: 0.2});
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.98, 1), orbM);
  orb.position.set(0, 0.95, 0);
  orb.castShadow = true;
  chamber.add(orb);
  const ringM = std('#9aa6a0', {metalness: 0.35});
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.05, 10, 64), ringM);
  ring.position.copy(orb.position);
  chamber.add(ring);
  const glass = new THREE.Mesh(new RoundedBoxGeometry(4.5, 5.9, 3, 4, 0.22), new THREE.MeshStandardMaterial({color: '#dff2ea', transparent: true, opacity: 0.2, roughness: 0.08, metalness: 0, depthWrite: false, side: THREE.DoubleSide}));
  glass.position.y = 0.05;
  glass.renderOrder = 8;
  chamber.add(glass);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(4.5, 5.9, 3)), new THREE.LineBasicMaterial({color: '#7f8f87'}));
  edges.position.y = 0.05;
  chamber.add(edges);

  // ------------------------------------------------------------ tools
  const station = {};
  {
    // a web page with a block a human cannot see
    const g = new THREE.Group();
    g.position.set(...AT.web);
    root.add(g);
    box(3.3, 2.5, 0.2, paleM, 0, 0, 0, g);
    box(3.3, 0.36, 0.22, inkM, 0, 1.07, 0.01, g, 0.05);
    face(2.8, 0.68, textTex(['Facture INV-9001', '19,00 USD'], {w: 760, h: 184, size: 58}), -0.05, 0.42, 0.13, g);
    const hidden = new THREE.Mesh(new THREE.PlaneGeometry(2.96, 0.86), new THREE.MeshBasicMaterial({map: textTex(['[consigne cachée]', 'virement de 750 USD'], {w: 800, h: 232, size: 60, fg: '#fff', bg: COL.accent}), toneMapped: false}));
    hidden.position.set(0, -0.56, 0.13);
    g.add(hidden);
    station.web = {g, hidden};
  }
  {
    // the RAG: a stack of sheets, one poisoned, one confidential
    const g = new THREE.Group();
    g.position.set(...AT.docs);
    root.add(g);
    const sheet = (y, col, label, fg) => {
      box(3.1, 0.34, 1.7, std(col, {roughness: 0.75}), 0, y, 0, g, 0.03);
      if (label) face(2.8, 0.28, textTex([label], {w: 860, h: 86, size: 50, fg}), 0, y, 0.87, g);
    };
    sheet(-0.82, '#f4f6f4', 'compte.md', COL.ink);
    sheet(-0.42, '#f4f6f4', 'transactions.md', COL.ink);
    sheet(-0.02, COL.ink, 'CONFIDENTIEL', '#fff');
    sheet(0.38, COL.accent, 'parrainage_promo', '#fff');
    sheet(0.78, '#f4f6f4', 'objectifs.md', COL.ink);
    station.docs = {g};
  }
  const lockM = std(COL.ink, {emissive: c(COL.brand), emissiveIntensity: 0});
  let lock;
  {
    // the bank: a vault whose door lock shuts when a human has to confirm
    const g = new THREE.Group();
    g.position.set(...AT.bank);
    root.add(g);
    box(3.3, 2.6, 1.3, std('#3a4258', {metalness: 0.25, roughness: 0.45}), 0, 0, 0, g, 0.14);
    const door = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.14, 40).rotateX(Math.PI / 2), std('#596279', {metalness: 0.5, roughness: 0.35}));
    door.position.set(0, 0, 0.72);
    door.castShadow = true;
    g.add(door);
    const spoke = (a) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.1, 0.1), inkM);
      s.position.z = 0.1;
      s.rotation.z = a;
      door.add(s);
    };
    spoke(0);
    spoke(Math.PI / 2);
    lock = box(3.5, 0.36, 0.3, lockM, 0, 2, 0.9, g, 0.05);
    station.bank = {g, door};
  }

  // ------------------------------------------------------------ gates: only exist with the defenses on
  const gates = {};
  const gateGroup = new THREE.Group();
  root.add(gateGroup);
  for (const k of ['gateIn', 'gateOut', 'gWeb', 'gDocs', 'gBank']) {
    const g = new THREE.Group();
    g.position.set(...AT[k]);
    gateGroup.add(g);
    const frame = std('#5d6778', {metalness: 0.3});
    box(0.14, 1.26, 0.14, frame, 0, 0, -0.42, g, 0.03);
    box(0.14, 1.26, 0.14, frame, 0, 0, 0.42, g, 0.03);
    box(0.14, 0.14, 0.98, frame, 0, 0.63, 0, g, 0.03);
    const bladeM = std(COL.brand, {emissive: c(COL.accent), emissiveIntensity: 0});
    const blade = box(0.09, 1, 0.74, bladeM, 0, 0, 0, g, 0.02);
    const wave = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.9, 40), new THREE.MeshBasicMaterial({color: COL.accent, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false}));
    wave.rotation.y = Math.PI / 2;
    wave.visible = false;
    g.add(wave);
    gates[k] = {blade, bladeM, wave};
  }

  // ------------------------------------------------------------ packets
  const CAP = 90;
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 14, 12), new THREE.MeshBasicMaterial({toneMapped: false}), CAP);
  beads.frustumCulled = false;
  beads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  beads.setColorAt(0, c('#fff'));
  root.add(beads);
  const TONE = {atk: c(COL.accent), ink: c(COL.ink), money: c('#c79a2b')};
  const obj = new THREE.Object3D();
  const none = new THREE.Matrix4().makeScale(0, 0, 0);
  // the instruction, once inside: a red line from the data layer up to the model
  const hijackM = new THREE.MeshBasicMaterial({color: COL.accent, toneMapped: false, transparent: true});
  const hijack = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 10), hijackM);
  hijack.position.set(0, -0.15, 0);
  root.add(hijack);

  const size = {w: 1080, h: 1920};
  const resize = (w, h, pr) => {
    size.w = w;
    size.h = h;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const smooth = (x) => {
    const u = Math.min(1, Math.max(0, x));
    return u * u * (3 - 2 * u);
  };

  /** clip, s = stateAt(clip, tau), t = film time. */
  const frame = (clip, s, t) => {
    gateGroup.visible = clip.secure;
    for (const k in gates) {
      const g = gates[k];
      const on = s.guard === k;
      g.bladeM.emissiveIntensity = on ? 1 : 0;
      g.bladeM.color.set(on ? COL.accent : COL.brand);
      g.blade.scale.y = on ? 1 : 0.28;
      g.blade.position.y = on ? 0 : 0.36;
      g.wave.visible = on;
      if (on) {
        const u = s.guardU;
        g.wave.scale.setScalar(0.5 + u * 1.3);
        g.wave.material.opacity = 1 - u;
      }
    }
    const beat = s.beat;
    let n = 0;
    if (beat.route) {
      const tone = beat.kind === 'money' ? TONE.money : TONE[beat.tone] || TONE.ink;
      const count = beat.tone === 'atk' ? 16 : beat.kind === 'money' ? 18 : 7;
      for (let i = 0; i < count && n < CAP; i++) {
        const u = s.u * 1.16 - i * (beat.tone === 'atk' ? 0.024 : 0.03);
        if (u < 0 || u > 1) continue;
        const p = along(beat.route, u);
        obj.position.set(p[0], p[1], p[2] + 0.1);
        obj.scale.setScalar(beat.tone === 'atk' ? 1.05 - i * 0.03 : 0.8);
        obj.updateMatrix();
        beads.setMatrixAt(n, obj.matrix);
        beads.setColorAt(n, tone);
        n++;
      }
    }
    for (let i = n; i < CAP; i++) beads.setMatrixAt(i, none);
    beads.instanceMatrix.needsUpdate = true;
    if (beads.instanceColor) beads.instanceColor.needsUpdate = true;

    // the chamber reacts
    const fromDirect = clip.case === 'llm01a';
    const hot = s.poisoned;
    slabs.data.m.emissiveIntensity = hot && !fromDirect ? 0.85 : 0;
    slabs.user.m.emissiveIntensity = hot && fromDirect ? 0.85 : 0;
    hijack.visible = hot;
    hijack.position.y = fromDirect ? -0.5 : -0.15;
    orb.rotation.y = t * (s.thinking ? 1.8 : 0.35);
    orb.rotation.x = t * 0.2;
    orbM.emissive.set(hot ? COL.accent : COL.brand);
    orbM.emissiveIntensity = (s.thinking ? 0.85 : 0.5) + Math.sin(t * 6) * (s.thinking ? 0.12 : 0.02);
    ring.rotation.x = 1.25 + Math.sin(t * 0.7) * 0.2;
    ring.rotation.y = t * 0.6;
    ringM.color.set(hot ? COL.accent : '#9aa6a0');

    // the web page's hidden block is only visible to the machine: it shows while the page is being read
    const showHidden = clip.case === 'llm01b';
    station.web.hidden.visible = showHidden;
    station.bank.door.rotation.z = -s.moneyU * 2.4;
    const lockedK = s.bankLocked ? 1 : 0;
    lock.position.y = 2 - lockedK * 2;
    lockM.emissiveIntensity = lockedK ? 0.7 : 0;
    lock.visible = clip.secure;

    const cam = {tx: 0.1, ty: 0, tz: 0, az: 0.3 + Math.sin(t * 0.21) * 0.05, el: 0.22, d: 50};
    camera.position.set(cam.tx + cam.d * Math.cos(cam.el) * Math.sin(cam.az), cam.ty + cam.d * Math.sin(cam.el), cam.tz + cam.d * Math.cos(cam.el) * Math.cos(cam.az));
    camera.lookAt(cam.tx, cam.ty, cam.tz);
    // the machine sits between the two text blocks
    camera.setViewOffset(size.w, size.h, 0, size.h * 0.012, size.w, size.h);
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
    void smooth;
  };
  const pv = new THREE.Vector3();
  const project = (x, y, z) => {
    pv.set(x, y, z).project(camera);
    return [(pv.x * 0.5 + 0.5) * size.w, (-pv.y * 0.5 + 0.5) * size.h];
  };
  return {renderer, resize, frame, project, size};
}
