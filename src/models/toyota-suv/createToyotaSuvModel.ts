import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Toyota 4Runner overland rig — hard-surface procedural factory.
 *
 * Dimensions are driven off the real vehicle rather than eyeballed, because the
 * earlier pass was too short, too tall and rode on oversized wheels, which read
 * as a boxy van instead of a 4Runner. Everything below is in "H units" where the
 * roofline sits at 2.0 and 1.88 m of real height maps to those 2.0 units.
 *
 *   length 4.95 m -> 5.27   wheelbase 2.85 m -> 3.03   track 1.68 m -> 1.79
 *   tyre 33 in    -> 0.89   rim 17 in        -> 0.46   width 1.98 m -> 2.10
 *
 * +Z forward · +Y up · +X right
 */

export interface ToyotaSuvOptions {
  scale?: number;
  shadows?: boolean;
  /** wooden display plinth like the reference render (default true) */
  withBase?: boolean;
}

// --- palette (sampled from the reference sheet) -----------------------------
const OLIVE = 0x464d3b;
const OLIVE_DEEP = 0x393f30;
const TRIM = 0x121212;
const TRIM_SOFT = 0x1d1d1d;
const STEEL = 0x8f959c;
const RUBBER = 0x0b0b0b;
const WOOD_DARK = 0x63482c;
const LAMP_WARM = 0xfff0cf;

// --- proportions ------------------------------------------------------------
const H_ROOF = 2.0; // roofline
const Y_BELT = 1.5; // belt line (bottom of the glass)
const Y_SILL = 0.5; // bottom of the body sides
const Y_GLASS_TOP = 1.92;
const Z_FRONT = 2.41;
const Z_REAR = -2.855;
const BODY_HALF_W = 1.05;
const AXLE_F = 1.515;
const AXLE_R = -1.515;
const ARCH_R = 0.55;
const WHEEL_X = 0.89;
const TIRE_R = 0.445;
const TIRE_W = 0.3;
const RIM_R = 0.23;
const RIDE_H = 0.445;

let paintDetailTex: THREE.CanvasTexture | null = null;

function matBody(color = OLIVE): THREE.MeshPhysicalMaterial {
  if (!paintDetailTex) paintDetailTex = makePaintDetail();
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.1,
    roughness: 0.88,
    roughnessMap: paintDetailTex,
    bumpMap: paintDetailTex,
    bumpScale: 0.0025,
    clearcoat: 0.14,
    clearcoatRoughness: 0.62,
    envMapIntensity: 0.5,
  });
}

function matTrim(rough = 0.68, color = TRIM): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.2,
    roughness: rough,
    envMapIntensity: 0.35,
  });
}

function matSteel(rough = 0.45): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: STEEL,
    metalness: 0.88,
    roughness: rough,
    envMapIntensity: 0.9,
  });
}

function matRubber(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color: RUBBER, metalness: 0.02, roughness: 0.95 });
}

function matCanvasTan(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0x9d8a63,
    metalness: 0.0,
    roughness: 0.92,
    sheen: 0.4,
    sheenColor: new THREE.Color(0xd8c49a),
  });
}

function matGlass(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0x0b1116,
    metalness: 0.3,
    roughness: 0.07,
    envMapIntensity: 2.0,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0.9,
  });
}

function matEmissive(color: number, intensity = 1.1): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    roughness: 0.22,
    metalness: 0.05,
  });
}

function addMesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  name: string,
  shadows: boolean,
  pos?: [number, number, number],
  rot?: [number, number, number],
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.castShadow = shadows;
  m.receiveShadow = shadows;
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  parent.add(m);
  return m;
}

/** Cylinder whose axis runs along world X. */
function xCyl(rTop: number, rBot: number, len: number, seg: number, mat: THREE.Material): THREE.Mesh {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, seg);
  g.rotateZ(Math.PI / 2);
  return new THREE.Mesh(g, mat);
}

/** Cylinder whose axis runs along world Z. */
function zCyl(rTop: number, rBot: number, len: number, seg: number, mat: THREE.Material): THREE.Mesh {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, seg);
  g.rotateX(Math.PI / 2);
  return new THREE.Mesh(g, mat);
}

// ---------------------------------------------------------------------------
// textures
// ---------------------------------------------------------------------------
function makePaintDetail(): THREE.CanvasTexture {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#b0b0b0';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const r = 30 + Math.random() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const v = Math.random() > 0.5 ? 200 : 150;
    g.addColorStop(0, `rgba(${v},${v},${v},0.28)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 22000; i++) {
    const v = 168 + (Math.random() - 0.5) * 34;
    ctx.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 1, 1);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
}

function makeDustDecal(): THREE.CanvasTexture {
  const W = 512;
  const H = 128;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, H, 0, 0);
  grad.addColorStop(0, 'rgba(158,142,112,0.55)');
  grad.addColorStop(0.45, 'rgba(158,142,112,0.2)');
  grad.addColorStop(1, 'rgba(158,142,112,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) {
    const y = H - Math.pow(Math.random(), 1.6) * H;
    const a = 0.05 + Math.random() * 0.22;
    ctx.fillStyle = `rgba(170,154,122,${a})`;
    const r = 1 + Math.random() * 4;
    ctx.beginPath();
    ctx.arc(Math.random() * W, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGrilleMap(): THREE.CanvasTexture {
  const W = 1024;
  const H = 384;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 4; i++) {
    const y = 34 + i * 80;
    ctx.fillStyle = '#2b2e2b';
    ctx.fillRect(18, y, W - 36, 50);
    ctx.fillStyle = '#5b6058';
    ctx.fillRect(18, y, W - 36, 7);
    ctx.fillStyle = '#020202';
    ctx.fillRect(18, y + 50, W - 36, 14);
  }
  ctx.strokeStyle = 'rgba(120,126,118,0.22)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeFlareTexture(): THREE.CanvasTexture {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#141414';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const v = 18 + Math.random() * 26;
    ctx.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 2, 2);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

function makeWoodTexture(): THREE.CanvasTexture {
  const W = 512;
  const H = 512;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#8a6743';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    const y = Math.random() * H;
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(99,72,44,0.55)' : 'rgba(163,127,88,0.45)';
    ctx.lineWidth = 1 + Math.random() * 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(W * 0.3, y + (Math.random() - 0.5) * 22, W * 0.7, y + (Math.random() - 0.5) * 22, W, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeCanvasBagTexture(): THREE.CanvasTexture {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#b49a6b';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(90,72,45,0.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i < S; i += 5) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, S);
    ctx.moveTo(0, i);
    ctx.lineTo(S, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ---------------------------------------------------------------------------
// body shell
// ---------------------------------------------------------------------------
/**
 * 4Runner side profile. The signature cues are a ~45 deg windscreen, a hood that
 * drops toward the nose, a long rear overhang and a near-vertical tailgate.
 */
function createSideProfile(): THREE.Shape {
  const s = new THREE.Shape();
  const F = Z_FRONT;
  const R = Z_REAR;

  s.moveTo(R, Y_SILL);
  // tailgate, leaning very slightly forward
  s.lineTo(R, 1.18);
  s.lineTo(R + 0.05, Y_BELT);
  s.lineTo(R + 0.12, 1.86);
  s.quadraticCurveTo(R + 0.15, H_ROOF, R + 0.34, H_ROOF);
  // roof with a shallow crown
  s.quadraticCurveTo(-1.0, H_ROOF + 0.035, 0.66, H_ROOF);
  // header, then the windscreen rake (~45 deg)
  s.quadraticCurveTo(0.84, H_ROOF - 0.015, 0.93, H_ROOF - 0.11);
  s.lineTo(1.44, 1.47);
  // cowl -> hood, sloping down toward the nose
  s.lineTo(1.64, 1.45);
  s.lineTo(2.18, 1.38);
  // nose rolls over, fascia rakes back at the bottom
  s.quadraticCurveTo(F, 1.36, F, 1.14);
  s.lineTo(F - 0.03, 0.78);
  s.lineTo(F - 0.16, Y_SILL);

  s.lineTo(AXLE_F + ARCH_R, Y_SILL);
  for (let i = 0; i <= 34; i++) {
    const a = (i / 34) * Math.PI;
    s.lineTo(AXLE_F + Math.cos(a) * ARCH_R, Y_SILL + Math.sin(a) * ARCH_R);
  }

  s.lineTo(AXLE_R + ARCH_R, Y_SILL);
  for (let i = 0; i <= 34; i++) {
    const a = (i / 34) * Math.PI;
    s.lineTo(AXLE_R + Math.cos(a) * ARCH_R, Y_SILL + Math.sin(a) * ARCH_R);
  }

  s.lineTo(R, Y_SILL);
  return s;
}

function createBodyShell(mat: THREE.Material, shadows: boolean): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(createSideProfile(), {
    depth: BODY_HALF_W * 2,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.016,
    bevelSegments: 2,
    curveSegments: 36,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate(BODY_HALF_W, 0, 0);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'bodyShell';
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  return mesh;
}

// ---------------------------------------------------------------------------
// wheels — 33in A/T on a 17in beadlock
// ---------------------------------------------------------------------------
function buildWheel(
  parent: THREE.Object3D,
  name: string,
  x: number,
  z: number,
  shadows: boolean,
): THREE.Group {
  const wheel = new THREE.Group();
  wheel.name = name;
  wheel.position.set(x, RIDE_H, z);
  const out = x < 0 ? -1 : 1;
  const hw = TIRE_W / 2;

  // Carcass is an OPEN tube: a solid cylinder's end cap hides the whole rim.
  const rubber = matRubber();
  const carcassGeo = new THREE.CylinderGeometry(TIRE_R - 0.015, TIRE_R - 0.015, TIRE_W, 52, 1, true);
  carcassGeo.rotateZ(Math.PI / 2);
  const carcass = new THREE.Mesh(carcassGeo, rubber);
  carcass.castShadow = shadows;
  carcass.receiveShadow = shadows;
  wheel.add(carcass);

  for (const sx of [-hw + 0.03, hw - 0.03]) {
    const shoulder = new THREE.Mesh(new THREE.TorusGeometry(TIRE_R - 0.065, 0.065, 12, 40), rubber);
    shoulder.rotation.y = Math.PI / 2;
    shoulder.position.x = sx;
    shoulder.castShadow = shadows;
    wheel.add(shoulder);
  }

  const sidewallMat = new THREE.MeshPhysicalMaterial({
    color: 0x0d0d0d,
    roughness: 0.92,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  for (const sx of [-hw, hw]) {
    const wall = new THREE.Mesh(new THREE.RingGeometry(RIM_R + 0.01, TIRE_R - 0.03, 40), sidewallMat);
    wall.rotation.y = Math.PI / 2;
    wall.position.x = sx;
    wheel.add(wall);
    const bead = new THREE.Mesh(new THREE.TorusGeometry(RIM_R + 0.015, 0.016, 8, 32), sidewallMat);
    bead.rotation.y = Math.PI / 2;
    bead.position.x = sx;
    wheel.add(bead);
  }

  const treadMat = new THREE.MeshPhysicalMaterial({ color: 0x141414, roughness: 0.96, metalness: 0.02 });
  const treadGeo = new RoundedBoxGeometry(TIRE_W - 0.03, 0.038, 0.09, 1, 0.012);
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const block = new THREE.Mesh(treadGeo, treadMat);
    block.position.set(
      i % 2 === 0 ? 0.022 : -0.022,
      Math.sin(a) * (TIRE_R + 0.004),
      Math.cos(a) * (TIRE_R + 0.004),
    );
    block.rotation.x = Math.PI / 2 - a;
    wheel.add(block);
  }

  const rimMat = new THREE.MeshPhysicalMaterial({
    color: 0x6b7176,
    metalness: 0.9,
    roughness: 0.44,
    envMapIntensity: 0.95,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RIM_R, 0.024, 12, 40), rimMat);
  ring.rotation.y = Math.PI / 2;
  ring.position.x = out * (hw - 0.04);
  ring.castShadow = shadows;
  wheel.add(ring);

  const boltMat = new THREE.MeshPhysicalMaterial({ color: 0x777d82, metalness: 0.95, roughness: 0.3 });
  const boltGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.022, 8);
  boltGeo.rotateZ(Math.PI / 2);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.set(out * (hw - 0.02), Math.sin(a) * RIM_R, Math.cos(a) * RIM_R);
    wheel.add(bolt);
  }

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(RIM_R, RIM_R, TIRE_W - 0.04, 36, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: 0x24282b,
      metalness: 0.7,
      roughness: 0.42,
      side: THREE.DoubleSide,
    }),
  );
  barrel.rotation.z = Math.PI / 2;
  wheel.add(barrel);

  // brake disc, hat, caliper, and a backing plate so you cannot see through
  const disc = xCyl(0.175, 0.175, 0.022, 28, new THREE.MeshPhysicalMaterial({
    color: 0x6e7378,
    metalness: 0.9,
    roughness: 0.55,
  }));
  disc.position.x = out * 0.015;
  wheel.add(disc);
  const hat = xCyl(0.08, 0.08, 0.06, 20, matTrim(0.6, 0x2a2d30));
  hat.position.x = out * 0.045;
  wheel.add(hat);
  const caliper = new THREE.Mesh(new RoundedBoxGeometry(0.045, 0.11, 0.07, 1, 0.015), matTrim(0.5, 0x33383c));
  caliper.position.set(out * 0.015, 0.135, -0.1);
  wheel.add(caliper);
  const backing = xCyl(RIM_R - 0.01, RIM_R - 0.01, 0.015, 28, new THREE.MeshPhysicalMaterial({
    color: 0x0b0b0b,
    roughness: 1,
  }));
  backing.position.x = -out * (hw - 0.05);
  wheel.add(backing);

  const spokeMat = new THREE.MeshPhysicalMaterial({
    color: 0x40454a,
    metalness: 0.85,
    roughness: 0.46,
    envMapIntensity: 0.9,
  });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spoke = new THREE.Mesh(new RoundedBoxGeometry(0.042, 0.03, 0.2, 1, 0.008), spokeMat);
    spoke.position.set(out * (hw - 0.07), Math.sin(a) * 0.1, Math.cos(a) * 0.1);
    spoke.rotation.x = a;
    spoke.castShadow = shadows;
    wheel.add(spoke);
  }

  const hub = xCyl(0.075, 0.075, 0.06, 20, spokeMat);
  hub.position.x = out * (hw - 0.055);
  wheel.add(hub);
  const cap = xCyl(0.05, 0.05, 0.026, 18, matTrim(0.32, 0x14171a));
  cap.position.x = out * (hw - 0.015);
  wheel.add(cap);

  parent.add(wheel);
  return wheel;
}

// ---------------------------------------------------------------------------
// greenhouse — per-window panes so the belt line can kick up at the C-pillar
// ---------------------------------------------------------------------------
interface WindowSpec {
  name: string;
  z0: number;
  z1: number;
  yBot: number;
}

const SIDE_WINDOWS: WindowSpec[] = [
  { name: 'door1', z0: -0.42, z1: 0.5, yBot: 1.56 },
  { name: 'door2', z0: -1.32, z1: -0.5, yBot: 1.58 },
  { name: 'quarter', z0: -2.24, z1: -1.4, yBot: 1.66 },
];

function buildGreenhouse(
  parent: THREE.Object3D,
  paint: THREE.Material,
  black: THREE.Material,
  shadows: boolean,
): void {
  const glass = matGlass();
  const recessMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0c0e, roughness: 0.75, metalness: 0.1 });

  // windscreen on the 45 deg rake between cowl and header
  const wsMidZ = (0.93 + 1.44) / 2;
  const wsMidY = (H_ROOF - 0.11 + 1.47) / 2;
  const wsLen = Math.hypot(1.44 - 0.93, H_ROOF - 0.11 - 1.47);
  const wsAngle = Math.atan2(1.44 - 0.93, H_ROOF - 0.11 - 1.47);
  addMesh(parent, new THREE.PlaneGeometry(1.6, wsLen), glass, 'windshield', false, [
    0,
    wsMidY,
    wsMidZ + 0.02,
  ], [-wsAngle, 0, 0]);
  for (const side of [-1, 1] as const) {
    addMesh(parent, new THREE.BoxGeometry(0.05, wsLen + 0.02, 0.05), paint, `aPillar${side}`, shadows, [
      side * 0.79,
      wsMidY,
      wsMidZ + 0.01,
    ], [-wsAngle, 0, 0]);
  }
  addMesh(parent, new THREE.BoxGeometry(1.62, 0.05, 0.06), black, 'wsHeader', shadows, [
    0,
    H_ROOF - 0.09,
    0.94,
  ]);
  addMesh(parent, new THREE.BoxGeometry(1.62, 0.05, 0.06), black, 'wsCowl', shadows, [0, 1.49, 1.45]);

  // tailgate glass
  addMesh(parent, new THREE.BoxGeometry(1.56, 0.44, 0.03), recessMat, 'rearRecess', false, [
    0,
    1.72,
    Z_REAR + 0.06,
  ]);
  addMesh(parent, new THREE.PlaneGeometry(1.46, 0.38), glass, 'rearGlass', false, [
    0,
    1.72,
    Z_REAR + 0.03,
  ], [0, Math.PI, 0]);

  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';

    for (const w of SIDE_WINDOWS) {
      const len = w.z1 - w.z0;
      const cz = (w.z0 + w.z1) / 2;
      const h = Y_GLASS_TOP - w.yBot;
      const cy = (w.yBot + Y_GLASS_TOP) / 2;

      addMesh(parent, new THREE.BoxGeometry(0.04, h + 0.03, len), recessMat, `recess_${w.name}${tag}`, false, [
        side * 1.035,
        cy,
        cz,
      ]);
      addMesh(parent, new THREE.PlaneGeometry(len - 0.03, h), glass, `glass_${w.name}${tag}`, false, [
        side * 1.058,
        cy,
        cz,
      ], [0, (side * Math.PI) / 2, 0]);
    }

    // C-pillar kick: body-colour wedge under the leading edge of the quarter
    const kick = new THREE.Shape();
    kick.moveTo(-1.4, 1.58);
    kick.lineTo(-1.4, 1.7);
    kick.lineTo(-1.05, 1.58);
    kick.closePath();
    const kickGeo = new THREE.ShapeGeometry(kick);
    const kickMesh = new THREE.Mesh(kickGeo, paint);
    kickMesh.name = `beltKick${tag}`;
    kickMesh.position.x = side * 1.056;
    kickMesh.rotation.y = (side * Math.PI) / 2;
    // shape X maps to world Z when rotated, so flip for the left side
    kickMesh.scale.z = side;
    parent.add(kickMesh);

    // pillars
    const pillars: Array<[number, number]> = [
      [0.53, 0.1],
      [-0.46, 0.09],
      [-1.36, 0.11],
      [-2.28, 0.12],
    ];
    for (const [pz, pw] of pillars) {
      addMesh(parent, new RoundedBoxGeometry(0.05, 0.42, pw, 1, 0.012), paint, `pillar${tag}${pz}`, shadows, [
        side * 1.055,
        1.74,
        pz,
      ]);
    }

    // belt line + drip rail
    addMesh(parent, new THREE.BoxGeometry(0.05, 0.045, 2.86), black, `beltLine${tag}`, shadows, [
      side * 1.05,
      Y_BELT,
      -0.86,
    ]);
    addMesh(parent, new THREE.BoxGeometry(0.055, 0.045, 3.0), black, `dripRail${tag}`, shadows, [
      side * 1.015,
      H_ROOF - 0.02,
      -0.9,
    ]);
  }
}

// ---------------------------------------------------------------------------
// bull bar / winch bumper
// ---------------------------------------------------------------------------
function buildBullBar(parent: THREE.Object3D, shadows: boolean): void {
  const bar = new THREE.Group();
  bar.name = 'bullBar';
  bar.position.set(0, 0, Z_FRONT);
  parent.add(bar);

  const steelBlack = matTrim(0.5, 0x151515);

  addMesh(bar, new RoundedBoxGeometry(2.08, 0.34, 0.26, 3, 0.045), steelBlack, 'bumperBeam', shadows, [
    0, 0.76, 0.06,
  ]);
  addMesh(bar, new RoundedBoxGeometry(1.9, 0.18, 0.22, 2, 0.035), matTrim(0.7, TRIM_SOFT), 'valance', shadows, [
    0, 0.55, 0.06,
  ]);
  addMesh(bar, new RoundedBoxGeometry(1.1, 0.05, 0.3, 2, 0.018), matSteel(0.5), 'skidPlate', shadows, [
    0, 0.46, 0.14,
  ]);

  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    const upright = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.56, 14), steelBlack);
    upright.position.set(side * 0.6, 1.06, 0.14);
    upright.rotation.x = -0.07;
    upright.castShadow = shadows;
    upright.name = `hoopUpright${tag}`;
    bar.add(upright);

    const wing = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.4, 12), steelBlack);
    wing.position.set(side * 0.95, 0.94, 0.1);
    wing.rotation.z = side * 0.22;
    wing.castShadow = shadows;
    bar.add(wing);
  }
  const hoopTop = xCyl(0.038, 0.038, 1.26, 14, steelBlack);
  hoopTop.position.set(0, 1.32, 0.12);
  hoopTop.castShadow = shadows;
  hoopTop.name = 'hoopTop';
  bar.add(hoopTop);

  const winch = xCyl(0.11, 0.11, 0.46, 20, matTrim(0.45, 0x202020));
  winch.position.set(0, 0.78, 0.18);
  winch.castShadow = shadows;
  winch.name = 'winchDrum';
  bar.add(winch);
  const spool = xCyl(0.085, 0.085, 0.3, 18, matSteel(0.4));
  spool.position.set(0, 0.78, 0.18);
  bar.add(spool);
  addMesh(bar, new RoundedBoxGeometry(0.26, 0.14, 0.04, 2, 0.015), matSteel(0.45), 'fairlead', shadows, [
    0, 0.68, 0.3,
  ]);

  const lensMat = matEmissive(LAMP_WARM, 1.5);
  const housing = matTrim(0.45, 0x101010);
  const lampX = [-0.46, -0.16, 0.16, 0.46];
  for (let i = 0; i < lampX.length; i++) {
    const lamp = new THREE.Group();
    lamp.name = `drivingLight${i}`;
    lamp.position.set(lampX[i]!, 1.45, 0.15);
    const can = zCyl(0.085, 0.085, 0.1, 20, housing);
    can.castShadow = shadows;
    lamp.add(can);
    const lens = zCyl(0.072, 0.072, 0.026, 20, lensMat);
    lens.position.z = 0.066;
    lamp.add(lens);
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.12, 8), housing);
    stalk.position.y = -0.095;
    lamp.add(stalk);
    bar.add(lamp);
  }

  for (const side of [-1, 1] as const) {
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 8, 20, Math.PI), matSteel(0.45));
    shackle.position.set(side * 0.34, 0.62, 0.18);
    shackle.rotation.x = Math.PI / 2;
    bar.add(shackle);
  }
}

// ---------------------------------------------------------------------------
// roof rack + cargo
// ---------------------------------------------------------------------------
function buildRoofRack(parent: THREE.Object3D, shadows: boolean): void {
  const rack = new THREE.Group();
  rack.name = 'roofRack';
  rack.position.set(0, H_ROOF, -0.85);
  parent.add(rack);

  const rackMat = matTrim(0.62, 0x161616);
  const LEN = 2.6;
  const HALF_W = 0.78;

  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    addMesh(rack, new RoundedBoxGeometry(0.05, 0.085, LEN, 1, 0.018), rackMat, `rackRail${tag}`, shadows, [
      side * HALF_W,
      0.09,
      0,
    ]);
    for (const z of [1.1, 0.38, -0.38, -1.1]) {
      addMesh(rack, new THREE.BoxGeometry(0.06, 0.1, 0.08), rackMat, `rackFoot${tag}${z}`, shadows, [
        side * HALF_W,
        0.0,
        z,
      ]);
    }
  }
  for (const z of [LEN / 2 - 0.03, -LEN / 2 + 0.03]) {
    addMesh(rack, new RoundedBoxGeometry(HALF_W * 2, 0.085, 0.05, 1, 0.018), rackMat, `rackEnd${z}`, shadows, [
      0,
      0.09,
      z,
    ]);
  }
  for (let i = 0; i < 13; i++) {
    const z = -LEN / 2 + 0.13 + i * ((LEN - 0.26) / 12);
    addMesh(rack, new THREE.BoxGeometry(HALF_W * 2 - 0.05, 0.022, 0.045), rackMat, `slat${i}`, shadows, [
      0,
      0.065,
      z,
    ]);
  }

  const barHousing = matTrim(0.45, 0x101010);
  addMesh(rack, new RoundedBoxGeometry(1.18, 0.08, 0.08, 2, 0.018), barHousing, 'lightBar', shadows, [
    0,
    0.17,
    LEN / 2 - 0.02,
  ]);
  addMesh(rack, new THREE.BoxGeometry(1.08, 0.045, 0.02), matEmissive(0xf2f7ff, 1.6), 'lightBarLens', false, [
    0,
    0.17,
    LEN / 2 + 0.03,
  ]);
  for (const side of [-1, 1] as const) {
    addMesh(rack, new THREE.BoxGeometry(0.045, 0.1, 0.045), barHousing, `lightBarMount${side}`, shadows, [
      side * 0.48,
      0.11,
      LEN / 2 - 0.04,
    ]);
  }

  const bagTex = makeCanvasBagTexture();
  const bagMat = matCanvasTan();
  bagMat.map = bagTex;
  bagMat.map.repeat.set(2, 1);
  addMesh(rack, new RoundedBoxGeometry(1.34, 0.36, 0.94, 5, 0.13), bagMat, 'cargoDuffel', shadows, [
    0,
    0.28,
    -0.52,
  ]);

  const strapMat = matTrim(0.8, 0x2b2b2b);
  for (const z of [-0.8, -0.24]) {
    addMesh(rack, new THREE.BoxGeometry(1.38, 0.045, 0.045), strapMat, `strap${z}`, shadows, [
      0,
      0.46,
      z,
    ]);
    for (const side of [-1, 1] as const) {
      addMesh(rack, new THREE.BoxGeometry(0.045, 0.38, 0.045), strapMat, `strapSide${side}${z}`, shadows, [
        side * 0.68,
        0.28,
        z,
      ]);
    }
  }

  const roll = xCyl(0.15, 0.15, 1.24, 20, bagMat);
  roll.position.set(0, 0.24, 0.38);
  roll.castShadow = shadows;
  roll.name = 'cargoRoll';
  rack.add(roll);
  for (const sx of [-0.62, 0.62]) {
    const cap = xCyl(0.15, 0.15, 0.03, 20, matTrim(0.85, 0x6f5e40));
    cap.position.set(sx, 0.24, 0.38);
    rack.add(cap);
  }

  const canMat = matTrim(0.7, 0x39412f);
  for (let i = 0; i < 2; i++) {
    const can = new THREE.Group();
    can.name = `jerryCan${i}`;
    can.position.set(-0.38 + i * 0.76, 0.25, 0.98);
    const bodyCan = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.36, 0.14, 3, 0.03), canMat);
    bodyCan.castShadow = shadows;
    can.add(bodyCan);
    for (const r of [-1, 1]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.026, 0.02), matTrim(0.65, 0x2c3325));
      rib.position.z = 0.075;
      rib.rotation.z = r * 0.85;
      can.add(rib);
    }
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12), matTrim(0.6, 0x22271d));
    spout.position.set(0.09, 0.2, 0);
    can.add(spout);
    const handleBar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.035), canMat);
    handleBar.position.set(-0.02, 0.2, 0);
    can.add(handleBar);
    rack.add(can);
  }

  addMesh(rack, new RoundedBoxGeometry(0.09, 0.05, 1.0, 2, 0.018), matTrim(0.8, 0x8a5a1e), 'tractionBoard', shadows, [
    -0.83,
    0.12,
    -0.2,
  ]);
}

// ---------------------------------------------------------------------------
// rear: ladder, swing-out spare, tail lights
// ---------------------------------------------------------------------------
function buildRear(parent: THREE.Object3D, shadows: boolean): void {
  const rear = new THREE.Group();
  rear.name = 'rearKit';
  parent.add(rear);

  const black = matTrim(0.6, 0x141414);
  const Z_TG = Z_REAR + 0.02;

  addMesh(rear, new THREE.BoxGeometry(1.6, 0.045, 0.045), black, 'tailgatePress', shadows, [
    0,
    1.0,
    Z_TG,
  ]);
  addMesh(rear, new RoundedBoxGeometry(0.46, 0.1, 0.045, 1, 0.018), black, 'tailgateHandle', shadows, [
    0,
    1.36,
    Z_TG - 0.01,
  ]);
  addMesh(rear, new RoundedBoxGeometry(0.48, 0.22, 0.035, 1, 0.018), matTrim(0.7, 0x2b2b2b), 'plateRecess', shadows, [
    0.4,
    1.04,
    Z_TG - 0.02,
  ]);

  addMesh(rear, new RoundedBoxGeometry(2.0, 0.32, 0.28, 3, 0.045), black, 'rearBumper', shadows, [
    0,
    0.7,
    Z_REAR - 0.14,
  ]);
  addMesh(rear, new RoundedBoxGeometry(1.0, 0.05, 0.26, 2, 0.018), matSteel(0.5), 'rearSkid', shadows, [
    0,
    0.52,
    Z_REAR - 0.14,
  ]);

  for (const side of [-1, 1] as const) {
    addMesh(
      rear,
      new RoundedBoxGeometry(0.14, 0.38, 0.1, 2, 0.025),
      new THREE.MeshPhysicalMaterial({
        color: 0x8c1414,
        emissive: new THREE.Color(0x5c0c0c),
        emissiveIntensity: 0.6,
        roughness: 0.3,
      }),
      `tail${side < 0 ? 'L' : 'R'}`,
      shadows,
      [side * 0.94, 1.24, Z_TG + 0.01],
    );
  }

  // swing-out spare carrier
  const carrier = new THREE.Group();
  carrier.name = 'spareCarrier';
  carrier.position.set(0.02, 1.06, Z_REAR - 0.2);
  rear.add(carrier);
  addMesh(carrier, new RoundedBoxGeometry(1.1, 0.08, 0.08, 2, 0.018), black, 'carrierArm', shadows, [
    -0.06,
    -0.3,
    0,
  ]);
  addMesh(carrier, new RoundedBoxGeometry(0.08, 0.78, 0.08, 2, 0.018), black, 'carrierPost', shadows, [
    -0.58,
    0.06,
    0,
  ]);

  const spare = new THREE.Group();
  spare.name = 'spareWheel';
  spare.position.set(0, -0.02, -0.14);
  spare.rotation.y = Math.PI / 2;
  buildWheel(spare, 'spareTyre', 0, 0, shadows);
  spare.children[0]!.position.set(0, 0, 0);
  spare.scale.setScalar(0.95);
  carrier.add(spare);

  // rear ladder
  const ladder = new THREE.Group();
  ladder.name = 'rearLadder';
  ladder.position.set(-0.74, 0, Z_TG - 0.02);
  rear.add(ladder);
  for (const sx of [-0.12, 0.12]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.06, 10), black);
    rail.position.set(sx, 1.44, 0);
    rail.castShadow = shadows;
    ladder.add(rail);
  }
  for (let i = 0; i < 5; i++) {
    const rung = xCyl(0.019, 0.019, 0.24, 8, black);
    rung.position.set(0, 1.0 + i * 0.22, 0);
    rung.castShadow = shadows;
    ladder.add(rung);
  }
  for (const y of [1.0, 1.88]) {
    addMesh(ladder, new THREE.BoxGeometry(0.045, 0.045, 0.1), black, `standoff${y}`, shadows, [0, y, 0.06]);
  }
}

// ---------------------------------------------------------------------------
// wooden display plinth
// ---------------------------------------------------------------------------
function buildDisplayBase(parent: THREE.Object3D, shadows: boolean): void {
  const base = new THREE.Group();
  base.name = 'displayBase';
  parent.add(base);

  const woodTex = makeWoodTexture();
  woodTex.repeat.set(2, 2);
  const woodMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: woodTex,
    roughness: 0.6,
    metalness: 0.02,
    clearcoat: 0.25,
    clearcoatRoughness: 0.5,
  });

  const CZ = -0.2;
  const plinth = addMesh(base, new RoundedBoxGeometry(3.2, 0.22, 6.7, 3, 0.05), woodMat, 'plinth', shadows, [
    0,
    -0.18,
    CZ,
  ]);
  plinth.receiveShadow = true;

  const trimMat = new THREE.MeshPhysicalMaterial({ color: WOOD_DARK, roughness: 0.7, metalness: 0.03 });
  addMesh(base, new RoundedBoxGeometry(3.32, 0.05, 6.82, 2, 0.02), trimMat, 'plinthLip', shadows, [
    0,
    -0.3,
    CZ,
  ]);

  const earthTex = makePaintDetail();
  earthTex.repeat.set(3, 5);
  const earthMat = new THREE.MeshPhysicalMaterial({
    color: 0x453f34,
    roughness: 1,
    metalness: 0.0,
    roughnessMap: earthTex,
    bumpMap: earthTex,
    bumpScale: 0.03,
  });
  const earth = addMesh(base, new RoundedBoxGeometry(2.95, 0.1, 6.4, 2, 0.03), earthMat, 'earthBed', shadows, [
    0,
    -0.02,
    CZ,
  ]);
  earth.receiveShadow = true;

  const aoS = 256;
  const aoCv = document.createElement('canvas');
  aoCv.width = aoCv.height = aoS;
  const aoCtx = aoCv.getContext('2d')!;
  const aoGrad = aoCtx.createRadialGradient(aoS / 2, aoS / 2, 8, aoS / 2, aoS / 2, aoS / 2);
  aoGrad.addColorStop(0, 'rgba(0,0,0,0.62)');
  aoGrad.addColorStop(0.55, 'rgba(0,0,0,0.3)');
  aoGrad.addColorStop(1, 'rgba(0,0,0,0)');
  aoCtx.fillStyle = aoGrad;
  aoCtx.fillRect(0, 0, aoS, aoS);
  const aoTex = new THREE.CanvasTexture(aoCv);
  const ao = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0, 6.0),
    new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false }),
  );
  ao.rotation.x = -Math.PI / 2;
  ao.position.set(0, 0.035, CZ);
  ao.name = 'contactShadow';
  base.add(ao);

  const rockMat = new THREE.MeshPhysicalMaterial({ color: 0x56513f, roughness: 0.98, metalness: 0.0 });
  const rockSpots: Array<[number, number, number]> = [
    [1.3, 0.02, 1.8],
    [-1.32, 0.03, 0.6],
    [1.18, 0.01, -1.6],
    [-1.2, 0.04, -2.3],
    [0.2, 0.01, 2.7],
    [-0.4, 0.02, -3.0],
  ];
  rockSpots.forEach(([x, y, z], i) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13 + (i % 3) * 0.04, 0), rockMat);
    rock.position.set(x, y, z);
    rock.rotation.set(i * 0.7, i * 1.3, i * 0.4);
    rock.scale.set(1, 0.55, 1);
    rock.castShadow = shadows;
    rock.receiveShadow = shadows;
    base.add(rock);
  });
}

// ===========================================================================
// MAIN FACTORY
// ===========================================================================
export function createToyotaSuvModel(options: ToyotaSuvOptions = {}): THREE.Group {
  const scale = options.scale ?? 1;
  const shadows = options.shadows ?? true;
  const withBase = options.withBase ?? true;

  const root = new THREE.Group();
  root.name = 'toyota4RunnerOverland';

  if (withBase) buildDisplayBase(root, shadows);

  const rig = new THREE.Group();
  rig.name = 'rig';
  root.add(rig);

  const paint = matBody();
  const paintDeep = matBody(OLIVE_DEEP);
  const black = matTrim();
  const blackSoft = matTrim(0.78, TRIM_SOFT);

  rig.add(createBodyShell(paint, shadows));

  // ---- roof cap with tumblehome so the cabin tapers in at the top ----------
  addMesh(rig, new RoundedBoxGeometry(1.9, 0.08, 3.0, 3, 0.04), paint, 'roofCap', shadows, [
    0,
    H_ROOF + 0.02,
    -0.86,
  ]);
  addMesh(rig, new RoundedBoxGeometry(1.68, 0.035, 2.66, 2, 0.018), paintDeep, 'roofInset', shadows, [
    0,
    H_ROOF + 0.06,
    -0.86,
  ]);

  // ---- hood: centre bulge, plus fender crowns that sit above it ------------
  addMesh(rig, new RoundedBoxGeometry(1.34, 0.045, 0.68, 2, 0.018), paintDeep, 'hoodPanel', shadows, [
    0,
    1.43,
    1.9,
  ]);
  addMesh(rig, new RoundedBoxGeometry(0.56, 0.05, 0.38, 2, 0.018), blackSoft, 'hoodScoop', shadows, [
    0,
    1.45,
    1.76,
  ]);
  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    // fender crown — on a 4Runner the wings ride above the hood centre
    addMesh(rig, new RoundedBoxGeometry(0.2, 0.06, 0.92, 2, 0.02), paint, `fenderCrown${tag}`, shadows, [
      side * 0.92,
      1.46,
      1.84,
    ]);
    addMesh(rig, new THREE.BoxGeometry(0.09, 0.045, 0.09), blackSoft, `hoodLatch${tag}`, shadows, [
      side * 0.66,
      1.42,
      2.2,
    ]);
  }

  // ---- cabin void + greenhouse --------------------------------------------
  addMesh(
    rig,
    new THREE.BoxGeometry(1.72, 0.5, 2.5),
    new THREE.MeshPhysicalMaterial({ color: 0x05070a, roughness: 0.9, metalness: 0.05 }),
    'cabinVoid',
    false,
    [0, 1.72, -0.7],
  );
  buildGreenhouse(rig, paint, black, shadows);

  // ---- front fascia --------------------------------------------------------
  const fascia = new THREE.Group();
  fascia.name = 'frontFascia';
  fascia.position.set(0, 0, Z_FRONT - 0.04);
  rig.add(fascia);

  addMesh(fascia, new RoundedBoxGeometry(1.74, 0.36, 0.12, 2, 0.025), black, 'grilleHouse', shadows, [
    0,
    1.06,
    0.02,
  ]);
  const grilleMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0a,
    map: makeGrilleMap(),
    metalness: 0.5,
    roughness: 0.45,
    envMapIntensity: 0.6,
  });
  addMesh(fascia, new THREE.PlaneGeometry(1.64, 0.3), grilleMat, 'grille', false, [0, 1.06, 0.09]);
  addMesh(fascia, new RoundedBoxGeometry(1.88, 0.08, 0.14, 1, 0.018), paint, 'grilleBrowTop', shadows, [
    0,
    1.26,
    0.0,
  ]);
  addMesh(fascia, new RoundedBoxGeometry(1.88, 0.08, 0.14, 1, 0.018), paint, 'grilleBrowBot', shadows, [
    0,
    0.87,
    0.0,
  ]);
  for (const side of [-1, 1] as const) {
    addMesh(fascia, new RoundedBoxGeometry(0.09, 0.46, 0.14, 1, 0.018), paint, `grilleEdge${side}`, shadows, [
      side * 0.92,
      1.06,
      0.0,
    ]);
  }

  // headlights
  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    const lampGroup = new THREE.Group();
    lampGroup.name = `headlamp${tag}`;
    lampGroup.position.set(side * 0.75, 1.14, 0.02);
    fascia.add(lampGroup);
    addMesh(lampGroup, new RoundedBoxGeometry(0.32, 0.24, 0.12, 2, 0.025), matTrim(0.4, 0x0b0b0b), `house${tag}`, shadows);
    addMesh(
      lampGroup,
      new RoundedBoxGeometry(0.25, 0.17, 0.03, 2, 0.012),
      new THREE.MeshPhysicalMaterial({
        color: 0x1b2229,
        metalness: 0.2,
        roughness: 0.06,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        transparent: true,
        opacity: 0.85,
        envMapIntensity: 2.2,
      }),
      `lens${tag}`,
      false,
      [0, 0.01, 0.065],
    );
    const projector = zCyl(0.045, 0.045, 0.04, 18, matEmissive(0xeaf1ff, 1.2));
    projector.position.set(side * -0.035, 0.03, 0.05);
    lampGroup.add(projector);
    const bezel = zCyl(0.058, 0.058, 0.026, 18, matSteel(0.4));
    bezel.position.set(side * -0.035, 0.03, 0.042);
    lampGroup.add(bezel);
    addMesh(lampGroup, new THREE.BoxGeometry(0.2, 0.026, 0.02), matEmissive(0xffab3d, 0.7), `marker${tag}`, false, [
      0,
      -0.085,
      0.066,
    ]);
  }

  buildBullBar(rig, shadows);

  // ---- side kit ------------------------------------------------------------
  const flareTex = makeFlareTexture();
  const flareMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: flareTex,
    metalness: 0.05,
    roughness: 0.85,
    envMapIntensity: 0.25,
  });

  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';

    for (const z of [AXLE_F, AXLE_R]) {
      const flare = new THREE.Mesh(
        new THREE.TorusGeometry(ARCH_R + 0.02, 0.105, 12, 32, Math.PI * 1.06),
        flareMat,
      );
      flare.name = `flare${tag}${z}`;
      flare.rotation.y = Math.PI / 2;
      flare.rotation.z = side < 0 ? 0.02 : -0.02;
      flare.position.set(side * 1.09, Y_SILL, z);
      flare.castShadow = shadows;
      rig.add(flare);

      const fill = new THREE.Mesh(
        new THREE.TorusGeometry(ARCH_R + 0.02, 0.08, 10, 28, Math.PI * 1.06),
        flareMat,
      );
      fill.rotation.y = Math.PI / 2;
      fill.position.set(side * 1.0, Y_SILL, z);
      rig.add(fill);

      for (let i = 0; i < 6; i++) {
        const a = Math.PI * 0.1 + (i / 5) * Math.PI * 0.8;
        const boltG = new THREE.CylinderGeometry(0.015, 0.015, 0.026, 8);
        boltG.rotateZ(Math.PI / 2);
        const bolt = new THREE.Mesh(boltG, matTrim(0.5, 0x2e2e2e));
        bolt.position.set(
          side * 1.19,
          Y_SILL + Math.sin(a) * (ARCH_R + 0.02),
          z + Math.cos(a) * (ARCH_R + 0.02),
        );
        rig.add(bolt);
      }
    }

    addMesh(rig, new RoundedBoxGeometry(0.12, 0.12, 2.5, 2, 0.045), matTrim(0.55, 0x141414), `slider${tag}`, shadows, [
      side * 1.09,
      0.54,
      0.0,
    ]);
    for (const z of [0.9, 0.0, -0.9]) {
      addMesh(rig, new THREE.BoxGeometry(0.12, 0.09, 0.06), matTrim(0.55, 0x141414), `sliderLeg${tag}${z}`, shadows, [
        side * 1.02,
        0.6,
        z,
      ]);
    }

    addMesh(rig, new RoundedBoxGeometry(0.09, 0.18, 2.7, 2, 0.025), blackSoft, `cladding${tag}`, shadows, [
      side * 1.035,
      0.72,
      0.0,
    ]);

    const mirror = new THREE.Group();
    mirror.name = `mirror${tag}`;
    mirror.position.set(side * 1.14, 1.6, 1.24);
    addMesh(mirror, new RoundedBoxGeometry(0.2, 0.13, 0.26, 2, 0.025), black, `mirrorBody${tag}`, shadows);
    addMesh(mirror, new THREE.PlaneGeometry(0.14, 0.09), matSteel(0.2), `mirrorGlass${tag}`, false, [
      side * -0.11,
      0,
      0,
    ], [0, (side * Math.PI) / 2, 0]);
    addMesh(mirror, new THREE.BoxGeometry(0.08, 0.045, 0.08), black, `mirrorArm${tag}`, shadows, [
      side * -0.11,
      -0.035,
      -0.05,
    ]);
    rig.add(mirror);

    for (const z of [0.28, -0.7]) {
      addMesh(rig, new RoundedBoxGeometry(0.035, 0.05, 0.16, 1, 0.012), black, `handle${tag}${z}`, shadows, [
        side * 1.04,
        1.34,
        z,
      ]);
    }
  }

  // trail dust up the flanks and across the tailgate
  const dustTex = makeDustDecal();
  const dustMat = new THREE.MeshBasicMaterial({
    map: dustTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.5,
  });
  for (const side of [-1, 1] as const) {
    const dust = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 0.46), dustMat);
    dust.position.set(side * 1.055, 0.82, -0.2);
    dust.rotation.y = (side * Math.PI) / 2;
    dust.renderOrder = 2;
    dust.name = `dust${side < 0 ? 'L' : 'R'}`;
    rig.add(dust);
  }
  const dustRear = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.46), dustMat);
  dustRear.position.set(0, 0.86, Z_REAR + 0.015);
  dustRear.rotation.y = Math.PI;
  dustRear.renderOrder = 2;
  rig.add(dustRear);

  // snorkel up the passenger A-pillar
  const snorkel = new THREE.Group();
  snorkel.name = 'snorkel';
  rig.add(snorkel);
  const snorkMat = matTrim(0.75, 0x171717);
  const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.07, 0.9, 16), snorkMat);
  riser.position.set(1.0, 1.62, 1.32);
  riser.rotation.x = -0.34;
  riser.castShadow = shadows;
  snorkel.add(riser);
  const headBend = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.062, 10, 20, Math.PI / 2), snorkMat);
  headBend.position.set(1.0, 2.05, 1.12);
  headBend.rotation.set(0, Math.PI / 2, Math.PI / 2);
  headBend.castShadow = shadows;
  snorkel.add(headBend);
  const ramHead = zCyl(0.07, 0.09, 0.26, 16, snorkMat);
  ramHead.position.set(1.0, 2.15, 1.28);
  ramHead.castShadow = shadows;
  snorkel.add(ramHead);
  const lowerDuct = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.42, 14), snorkMat);
  lowerDuct.position.set(1.0, 1.16, 1.48);
  lowerDuct.rotation.x = -0.2;
  snorkel.add(lowerDuct);

  buildRoofRack(rig, shadows);
  buildRear(rig, shadows);

  // ---- wheels + underbody --------------------------------------------------
  const wheels = [
    buildWheel(rig, 'wheelFL', -WHEEL_X, AXLE_F, shadows),
    buildWheel(rig, 'wheelFR', WHEEL_X, AXLE_F, shadows),
    buildWheel(rig, 'wheelRL', -WHEEL_X, AXLE_R, shadows),
    buildWheel(rig, 'wheelRR', WHEEL_X, AXLE_R, shadows),
  ];

  const linerMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0a,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  for (const z of [AXLE_F, AXLE_R]) {
    const liner = new THREE.Mesh(
      new THREE.CylinderGeometry(ARCH_R - 0.02, ARCH_R - 0.02, BODY_HALF_W * 2 - 0.02, 30, 1, true),
      linerMat,
    );
    liner.rotation.z = Math.PI / 2;
    liner.position.set(0, Y_SILL, z);
    liner.name = `wheelWell${z}`;
    rig.add(liner);
  }

  // panel gaps
  const gapMat = new THREE.MeshBasicMaterial({ color: 0x0d0f0c });
  const gaps: Array<{ geo: [number, number, number]; pos: [number, number, number] }> = [
    { geo: [1.68, 0.012, 0.012], pos: [0, 1.4, 2.22] },
    { geo: [0.012, 0.045, 0.7], pos: [-0.79, 1.42, 1.9] },
    { geo: [0.012, 0.045, 0.7], pos: [0.79, 1.42, 1.9] },
    { geo: [1.7, 0.012, 0.012], pos: [0, 1.47, 1.46] },
  ];
  for (const [i, g] of gaps.entries()) {
    addMesh(rig, new THREE.BoxGeometry(...g.geo), gapMat, `panelGap${i}`, false, g.pos);
  }
  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    for (const z of [0.86, -0.46, -1.36]) {
      addMesh(rig, new THREE.BoxGeometry(0.014, 0.9, 0.014), gapMat, `doorGap${tag}${z}`, false, [
        side * 1.048,
        1.02,
        z,
      ]);
    }
  }

  for (const z of [AXLE_F, AXLE_R]) {
    const axle = xCyl(0.06, 0.06, WHEEL_X * 2, 14, matTrim(0.7, 0x1a1a1a));
    axle.position.set(0, RIDE_H, z);
    axle.castShadow = shadows;
    rig.add(axle);
    const diff = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 14), matTrim(0.7, 0x1a1a1a));
    diff.position.set(0.05, RIDE_H, z);
    diff.castShadow = shadows;
    rig.add(diff);
  }
  addMesh(rig, new THREE.BoxGeometry(1.5, 0.1, 3.2), matTrim(0.85, 0x101010), 'undertray', shadows, [
    0,
    0.52,
    0.0,
  ]);
  const exhaust = zCyl(0.045, 0.045, 1.1, 12, matSteel(0.55));
  exhaust.position.set(-0.66, 0.56, -2.1);
  rig.add(exhaust);

  root.userData.tick = (_dt: number, elapsed: number) => {
    for (const w of wheels) w.rotation.x = -elapsed * 0.22;
  };

  root.userData.sculptRuntime = {
    provenance: {
      route: 'hard-surface-object',
      exactnessTier: 'approximate-likeness',
      dimensions: {
        lengthUnits: Z_FRONT - Z_REAR,
        heightUnits: H_ROOF,
        wheelbaseUnits: AXLE_F - AXLE_R,
        tyreDiameterUnits: TIRE_R * 2,
      },
      identity: [
        '4Runner proportions (length 2.63x height, 33in tyres)',
        '45 deg windscreen, hood dropping to the nose, fender crowns',
        'belt line kick at the C-pillar',
        'bull bar + winch + 4 driving lights',
        'snorkel, roof rack load, rear ladder + swing-out spare',
      ],
      inferred: ['interior', 'undercarriage detail'],
    },
  };

  root.scale.setScalar(scale);
  return root;
}

// ===========================================================================
// LOOKDEV LIGHTS
// ===========================================================================
export function createToyotaSuvLookDevLights(scene: THREE.Scene): void {
  const key = new THREE.DirectionalLight(0xfff6ea, 2.0);
  key.position.set(-4.6, 6.8, 5.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 40;
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  key.shadow.bias = -0.00025;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xd6e2f5, 0.7);
  fill.position.set(5.8, 2.8, 3.0);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffeccc, 0.95);
  rim.position.set(1.4, 4.2, -6.5);
  scene.add(rim);

  const kickR = new THREE.DirectionalLight(0xe6eef8, 0.55);
  kickR.position.set(9, 0.9, 0.5);
  scene.add(kickR);

  const kickL = new THREE.DirectionalLight(0xe6eef8, 0.45);
  kickL.position.set(-9, 0.9, -0.5);
  scene.add(kickL);

  const bounce = new THREE.DirectionalLight(0xece7dd, 0.22);
  bounce.position.set(0, -2, 2.5);
  scene.add(bounce);

  const hemi = new THREE.HemisphereLight(0xdfe6ee, 0x2e2c25, 0.34);
  scene.add(hemi);
}
