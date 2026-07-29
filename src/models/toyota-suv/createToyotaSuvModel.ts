import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Toyota Sequoia TRD Pro — ISSACA-style hard-surface procedural factory.
 *
 * Named parts + distinct PBR materials (matte Lunar Rock paint, hex grille,
 * T-DRL lamps, flared arches, TRD wheels). Not a photo plane / toy box stack.
 *
 * +Z forward · +Y up · +X right
 */

export interface ToyotaSuvOptions {
  scale?: number;
  shadows?: boolean;
}

const PAINT = 0xb59a72; // Lunar Rock
const PAINT_DEEP = 0x9a815c;
const TRIM = 0x101010;
const TRIM_SOFT = 0x1c1c1c;
const STEEL = 0xc8ced6;
const RUBBER = 0x0a0a0a;
const TRD_RED = 0xc4121a;

const BODY_HALF_W = 1.02;
const AXLE_F = 1.38;
const AXLE_R = -1.28;
const ARCH_R = 0.62;
const WHEEL_X = 1.18;

function matPaint(color = PAINT): THREE.MeshPhysicalMaterial {
  // Sequoia TRD Pro Lunar Rock reads matte — clearcoat/toy gloss is the enemy.
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.12,
    roughness: 0.72,
    clearcoat: 0.08,
    clearcoatRoughness: 0.55,
    envMapIntensity: 0.45,
  });
}

function matTrim(rough = 0.62, color = TRIM): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.22,
    roughness: rough,
    envMapIntensity: 0.4,
  });
}

function matSteel(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: STEEL,
    metalness: 0.95,
    roughness: 0.28,
    envMapIntensity: 1.1,
  });
}

function matRubber(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: RUBBER,
    metalness: 0.02,
    roughness: 0.94,
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

/** Side profile: length on Shape.X (rear→front), height on Shape.Y. */
function createSideProfile(): THREE.Shape {
  const s = new THREE.Shape();
  const rear = -2.62;
  const front = 2.22;
  const rocker = 0.48;

  s.moveTo(rear, rocker);
  s.lineTo(rear, 1.22);
  s.quadraticCurveTo(rear + 0.06, 2.08, rear + 0.58, 2.1);
  s.lineTo(0.72, 2.1);
  s.lineTo(1.62, 1.46);
  s.lineTo(front - 0.18, 1.46);
  s.lineTo(front, 1.22);
  s.lineTo(front, rocker + 0.14);
  s.lineTo(front - 0.1, rocker);
  s.lineTo(AXLE_F + ARCH_R, rocker);

  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI;
    s.lineTo(AXLE_F + Math.cos(a) * ARCH_R, rocker + Math.sin(a) * ARCH_R);
  }

  s.lineTo(AXLE_R + ARCH_R, rocker);

  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI;
    s.lineTo(AXLE_R + Math.cos(a) * ARCH_R, rocker + Math.sin(a) * ARCH_R);
  }

  s.lineTo(rear, rocker);
  return s;
}

function createBodyShell(mat: THREE.Material, shadows: boolean): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(createSideProfile(), {
    depth: BODY_HALF_W * 2,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.045,
    bevelSegments: 4,
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

function makeGrilleMap(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, W, H);

  const cellW = 22;
  const cellH = 16;
  for (let row = 0; row < 34; row++) {
    const y = 4 + row * cellH;
    const off = row % 2 ? cellW * 0.5 : 0;
    for (let col = -1; col < 50; col++) {
      const x = off + col * cellW;
      ctx.beginPath();
      ctx.moveTo(x + cellW * 0.5, y);
      ctx.lineTo(x + cellW * 0.92, y + cellH * 0.5);
      ctx.lineTo(x + cellW * 0.5, y + cellH);
      ctx.lineTo(x + cellW * 0.08, y + cellH * 0.5);
      ctx.closePath();
      ctx.fillStyle = row % 3 === 0 ? '#0e0e0e' : '#121212';
      ctx.fill();
      ctx.strokeStyle = '#2a2a2a';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  }

  // dark letter band (letters are separate meshes; keep band for depth)
  ctx.fillStyle = '#020202';
  ctx.fillRect(90, 185, 844, 120);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 5;
  ctx.strokeRect(90, 185, 844, 120);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeTrdBadge(): THREE.CanvasTexture {
  const W = 256;
  const H = 64;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 28px Arial Black, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TRD', W * 0.32, H * 0.52);
  ctx.fillStyle = '#e01820';
  ctx.fillText('PRO', W * 0.68, H * 0.52);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeTireMap(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 256;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#0c0c0c';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#222';
  for (let i = 0; i < 28; i++) {
    const x = (i / 28) * 512;
    ctx.fillRect(x + 1, 6, 10, 100);
    ctx.fillRect(x + 8, 140, 10, 100);
  }
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 128);
  ctx.lineTo(512, 128);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeHubCapMap(): THREE.CanvasTexture {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e01820';
  ctx.font = 'bold 52px Arial Black, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TRD', S / 2, S / 2 + 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildToyotaLetters(parent: THREE.Object3D, shadows: boolean): void {
  const letters = 'TOYOTA';
  const steel = matSteel();
  const spacing = 0.195;
  const start = -((letters.length - 1) * spacing) / 2;
  for (let i = 0; i < letters.length; i++) {
    const ch = letters[i]!;
    // Block letter as a short extruded slab — reads as chrome badge from camera
    const mesh = addMesh(
      parent,
      new RoundedBoxGeometry(0.14, 0.16, 0.04, 1, 0.008),
      steel,
      `letter_${ch}_${i}`,
      shadows,
      [start + i * spacing, 1.05, 0.14],
    );
    // imprint the glyph on the face via canvas plane
    const cv = document.createElement('canvas');
    cv.width = 64;
    cv.height = 64;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#f4f4f4';
    ctx.font = 'bold 48px Arial Black, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, 32, 34);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.13, 0.15),
      new THREE.MeshBasicMaterial({ map: tex }),
    );
    face.position.set(0, 0, 0.022);
    mesh.add(face);
  }
}

function buildTHeadlamp(
  parent: THREE.Object3D,
  side: 1 | -1,
  shadows: boolean,
): void {
  const tag = side < 0 ? 'L' : 'R';
  const group = new THREE.Group();
  group.name = `headlamp${tag}`;
  group.position.set(side * 0.86, 1.08, 2.28);
  parent.add(group);

  const housing = matTrim(0.45, 0x0a0a0a);
  addMesh(group, new RoundedBoxGeometry(0.38, 0.34, 0.16, 2, 0.03), housing, `house${tag}`, shadows);

  const lens = new THREE.MeshPhysicalMaterial({
    color: 0xe8eef8,
    metalness: 0.05,
    roughness: 0.12,
    emissive: new THREE.Color(0xb8c8e0),
    emissiveIntensity: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });
  addMesh(group, new RoundedBoxGeometry(0.28, 0.2, 0.06, 2, 0.02), lens, `lens${tag}`, shadows, [
    side * -0.02,
    0.02,
    0.06,
  ]);

  // T-DRL: vertical stem + horizontal bar (emissive)
  const drl = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xf2f6ff),
    emissiveIntensity: 1.35,
    roughness: 0.2,
    metalness: 0.05,
  });
  addMesh(group, new RoundedBoxGeometry(0.045, 0.28, 0.03, 1, 0.01), drl, `drlV${tag}`, false, [
    side * -0.12,
    0,
    0.09,
  ]);
  addMesh(group, new RoundedBoxGeometry(0.22, 0.04, 0.03, 1, 0.01), drl, `drlH${tag}`, false, [
    side * 0.02,
    -0.12,
    0.09,
  ]);

  const amber = new THREE.MeshPhysicalMaterial({
    color: 0xff8a1a,
    emissive: new THREE.Color(0xff6a00),
    emissiveIntensity: 0.55,
    roughness: 0.35,
  });
  addMesh(group, new RoundedBoxGeometry(0.06, 0.08, 0.03, 1, 0.01), amber, `marker${tag}`, false, [
    side * 0.14,
    0.1,
    0.09,
  ]);
}

function buildWheel(
  parent: THREE.Group,
  name: string,
  x: number,
  z: number,
  trimMat: THREE.Material,
  shadows: boolean,
): THREE.Group {
  const wheel = new THREE.Group();
  wheel.name = name;
  wheel.position.set(x, 0.54, z);
  const out = x < 0 ? -1 : 1;

  // Tire (axis along X)
  const tireMat = matRubber();
  tireMat.map = makeTireMap();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.38, 64), tireMat);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = shadows;
  tire.receiveShadow = shadows;
  wheel.add(tire);

  // Outer + inner sidewall lips
  for (const sx of [-0.2, 0.2]) {
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.028, 10, 48), matRubber());
    lip.rotation.y = Math.PI / 2;
    lip.position.x = sx;
    wheel.add(lip);
  }

  // Rim barrel as a SHORT tube (not a solid puck — solid filled the face)
  const rimGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.22, 48, 1, true);
  const rim = new THREE.Mesh(
    rimGeo,
    new THREE.MeshPhysicalMaterial({
      color: 0x141414,
      metalness: 0.55,
      roughness: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  rim.rotation.z = Math.PI / 2;
  rim.castShadow = shadows;
  wheel.add(rim);

  // Outer rim ring
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 12, 48), trimMat);
  rimRing.rotation.y = Math.PI / 2;
  rimRing.position.x = out * 0.12;
  rimRing.castShadow = shadows;
  wheel.add(rimRing);

  // Face: open hub — no solid black disc (that read as a toy hockey puck)
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const spokeMat = new THREE.MeshPhysicalMaterial({
      color: 0x2a2a2a,
      metalness: 0.7,
      roughness: 0.32,
    });
    const spoke = new THREE.Mesh(new RoundedBoxGeometry(0.055, 0.03, 0.28, 1, 0.008), spokeMat);
    spoke.position.set(out * 0.14, Math.sin(ang) * 0.12, Math.cos(ang) * 0.12);
    spoke.rotation.x = ang;
    spoke.castShadow = shadows;
    wheel.add(spoke);
  }

  // Inner ring connecting spokes
  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.12, 0.02, 8, 32),
    new THREE.MeshPhysicalMaterial({ color: 0x1c1c1c, metalness: 0.6, roughness: 0.4 }),
  );
  innerRing.rotation.y = Math.PI / 2;
  innerRing.position.x = out * 0.14;
  wheel.add(innerRing);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.06, 32), trimMat);
  hub.rotation.z = Math.PI / 2;
  hub.position.x = out * 0.155;
  wheel.add(hub);

  const capMat = new THREE.MeshPhysicalMaterial({
    color: 0x111111,
    map: makeHubCapMap(),
    metalness: 0.4,
    roughness: 0.35,
  });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 32), capMat);
  cap.rotation.z = Math.PI / 2;
  cap.position.x = out * 0.175;
  wheel.add(cap);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.007, 8, 32),
    new THREE.MeshPhysicalMaterial({ color: TRD_RED, metalness: 0.3, roughness: 0.35 }),
  );
  ring.rotation.y = Math.PI / 2;
  ring.position.x = out * 0.18;
  wheel.add(ring);

  parent.add(wheel);
  return wheel;
}

export function createToyotaSuvModel(options: ToyotaSuvOptions = {}): THREE.Group {
  const scale = options.scale ?? 1;
  const shadows = options.shadows ?? true;
  const root = new THREE.Group();
  root.name = 'toyotaSequoiaTrd';

  const paint = matPaint();
  const paintDeep = matPaint(PAINT_DEEP);
  const black = matTrim();
  const blackSoft = matTrim(0.72, TRIM_SOFT);

  root.add(createBodyShell(paint, shadows));

  // Hood center bulge (Sequoia identity)
  addMesh(
    root,
    new RoundedBoxGeometry(0.72, 0.08, 1.05, 2, 0.03),
    paintDeep,
    'hoodBulge',
    shadows,
    [0, 1.48, 1.55],
  );
  addMesh(
    root,
    new RoundedBoxGeometry(0.55, 0.05, 0.55, 2, 0.02),
    blackSoft,
    'hoodScoop',
    shadows,
    [0, 1.54, 1.55],
  );

  // TRD PRO hood badges
  const badgeTex = makeTrdBadge();
  for (const side of [-1, 1] as const) {
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.07),
      new THREE.MeshPhysicalMaterial({
        map: badgeTex,
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.45,
      }),
    );
    badge.name = `trdBadge${side < 0 ? 'L' : 'R'}`;
    badge.position.set(side * 0.55, 1.52, 1.15);
    badge.rotation.x = -0.55;
    root.add(badge);
  }

  // Roof inset + rack with crossbars
  addMesh(root, new RoundedBoxGeometry(1.6, 0.05, 2.2, 2, 0.015), paintDeep, 'roofInset', shadows, [
    0,
    2.14,
    -0.18,
  ]);
  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    addMesh(
      root,
      new RoundedBoxGeometry(0.05, 0.05, 2.15, 1, 0.01),
      black,
      `rail${tag}`,
      shadows,
      [side * 0.7, 2.24, -0.18],
    );
    for (const z of [0.7, 0.15, -0.4, -0.95] as const) {
      addMesh(
        root,
        new THREE.BoxGeometry(0.06, 0.06, 0.06),
        black,
        `railFoot${tag}_${z}`,
        shadows,
        [side * 0.7, 2.2, z],
      );
    }
  }
  for (const z of [0.55, 0.0, -0.55, -1.05] as const) {
    addMesh(
      root,
      new RoundedBoxGeometry(1.35, 0.035, 0.04, 1, 0.01),
      black,
      `crossbar_${z}`,
      shadows,
      [0, 2.27, z],
    );
  }

  // Glass — dark planes + deep cabin void so the upper body isn't a solid brick
  addMesh(
    root,
    new THREE.BoxGeometry(1.7, 0.55, 2.35),
    new THREE.MeshPhysicalMaterial({ color: 0x050608, metalness: 0.1, roughness: 0.85 }),
    'cabinVoid',
    false,
    [0, 1.72, -0.25],
  );
  const glassDeep = new THREE.MeshPhysicalMaterial({
    color: 0x0a1018,
    metalness: 0.3,
    roughness: 0.08,
    envMapIntensity: 2.0,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0.88,
  });
  addMesh(root, new THREE.PlaneGeometry(1.55, 0.7), glassDeep, 'windshield', false, [0, 1.74, 1.05], [
    -0.48,
    0,
    0,
  ]);
  addMesh(root, new THREE.PlaneGeometry(1.45, 0.58), glassDeep, 'rearGlass', false, [0, 1.74, -2.02], [
    0.28,
    Math.PI,
    0,
  ]);
  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    addMesh(
      root,
      new THREE.PlaneGeometry(1.05, 0.48),
      glassDeep,
      `glassF${tag}`,
      false,
      [side * 1.045, 1.72, 0.02],
      [0, (side * Math.PI) / 2, 0],
    );
    addMesh(
      root,
      new THREE.PlaneGeometry(0.9, 0.48),
      glassDeep,
      `glassR${tag}`,
      false,
      [side * 1.045, 1.72, -0.98],
      [0, (side * Math.PI) / 2, 0],
    );
    addMesh(
      root,
      new RoundedBoxGeometry(0.1, 0.85, 0.12, 1, 0.02),
      black,
      `aPillar${tag}`,
      shadows,
      [side * 0.94, 1.74, 0.8],
      [-0.42, 0, side * 0.05],
    );
    addMesh(
      root,
      new THREE.BoxGeometry(0.05, 0.55, 0.08),
      black,
      `bPillar${tag}`,
      shadows,
      [side * 0.99, 1.72, -0.42],
    );
  }

  // Door seams
  for (const side of [-1, 1] as const) {
    addMesh(
      root,
      new THREE.BoxGeometry(0.018, 0.72, 0.018),
      blackSoft,
      `seam${side}`,
      shadows,
      [side * 1.04, 1.18, -0.18],
    );
  }

  // Front fascia
  const front = new THREE.Group();
  front.name = 'frontFascia';
  front.position.set(0, 0, 2.26);
  root.add(front);

  addMesh(front, new RoundedBoxGeometry(2.05, 0.44, 0.4, 3, 0.05), black, 'bumper', shadows, [
    0,
    0.56,
    0.08,
  ]);
  addMesh(front, new RoundedBoxGeometry(1.75, 0.14, 0.3, 2, 0.03), blackSoft, 'valence', shadows, [
    0,
    0.32,
    0.12,
  ]);
  addMesh(front, new RoundedBoxGeometry(1.1, 0.07, 0.34, 2, 0.02), matSteel(), 'skid', shadows, [
    0,
    0.28,
    0.22,
  ]);
  addMesh(front, new RoundedBoxGeometry(1.58, 0.62, 0.18, 2, 0.03), black, 'grilleHouse', shadows, [
    0,
    1.05,
    0.02,
  ]);

  const grilleMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0a,
    metalness: 0.55,
    roughness: 0.38,
    map: makeGrilleMap(),
    envMapIntensity: 0.7,
  });
  addMesh(front, new THREE.PlaneGeometry(1.48, 0.56), grilleMat, 'grille', false, [0, 1.05, 0.12]);
  buildToyotaLetters(front, shadows);

  // Lower LED bars in bumper corners
  const ledBar = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xe8f0ff),
    emissiveIntensity: 0.9,
    roughness: 0.25,
  });
  for (const side of [-1, 1] as const) {
    addMesh(
      front,
      new RoundedBoxGeometry(0.28, 0.035, 0.04, 1, 0.01),
      ledBar,
      `bumperLed${side < 0 ? 'L' : 'R'}`,
      false,
      [side * 0.78, 0.52, 0.28],
    );
  }

  buildTHeadlamp(root, -1, shadows);
  buildTHeadlamp(root, 1, shadows);

  // Cladding, flares, mirrors, handles, steps
  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    addMesh(
      root,
      new RoundedBoxGeometry(0.15, 0.26, 3.65, 2, 0.03),
      black,
      `cladding${tag}`,
      shadows,
      [side * 1.05, 0.84, 0.05],
    );
    addMesh(
      root,
      new RoundedBoxGeometry(0.12, 0.08, 2.55, 2, 0.02),
      blackSoft,
      `rocker${tag}`,
      shadows,
      [side * 1.12, 0.48, 0.05],
    );

    for (const z of [AXLE_F, AXLE_R]) {
      // Slim arch lip — thick torus read as cartoon fenders
      const flare = new THREE.Mesh(
        new THREE.TorusGeometry(ARCH_R + 0.01, 0.045, 10, 40, Math.PI * 1.15),
        blackSoft,
      );
      flare.name = `flare${tag}_${z}`;
      flare.rotation.y = Math.PI / 2;
      flare.rotation.z = side < 0 ? 0.05 : -0.05;
      flare.position.set(side * 1.08, 0.54, z);
      flare.castShadow = shadows;
      root.add(flare);
    }

    const mirror = new THREE.Group();
    mirror.position.set(side * 1.14, 1.58, 0.82);
    addMesh(mirror, new RoundedBoxGeometry(0.24, 0.15, 0.34, 2, 0.03), black, `mirror${tag}`, shadows);
    addMesh(
      mirror,
      new THREE.PlaneGeometry(0.17, 0.1),
      matSteel(),
      `mGlass${tag}`,
      false,
      [side * -0.13, 0, 0],
      [0, (side * Math.PI) / 2, 0],
    );
    const signal = new THREE.MeshPhysicalMaterial({
      color: 0xffaa33,
      emissive: new THREE.Color(0xff8800),
      emissiveIntensity: 0.4,
      roughness: 0.3,
    });
    addMesh(mirror, new RoundedBoxGeometry(0.06, 0.04, 0.12, 1, 0.01), signal, `mSignal${tag}`, false, [
      0,
      0.06,
      0.05,
    ]);
    root.add(mirror);

    addMesh(
      root,
      new RoundedBoxGeometry(0.04, 0.05, 0.16, 1, 0.01),
      black,
      `handleF${tag}`,
      shadows,
      [side * 1.06, 1.2, 0.3],
    );
    addMesh(
      root,
      new RoundedBoxGeometry(0.04, 0.05, 0.16, 1, 0.01),
      black,
      `handleR${tag}`,
      shadows,
      [side * 1.06, 1.2, -0.58],
    );
  }

  // Rear
  addMesh(root, new RoundedBoxGeometry(2.0, 0.38, 0.34, 3, 0.05), black, 'rearBumper', shadows, [
    0,
    0.55,
    -2.38,
  ]);
  for (const side of [-1, 1] as const) {
    addMesh(
      root,
      new RoundedBoxGeometry(0.14, 0.4, 0.16, 2, 0.03),
      new THREE.MeshPhysicalMaterial({
        color: 0x8a1010,
        emissive: new THREE.Color(0x4a0808),
        emissiveIntensity: 0.5,
        roughness: 0.28,
      }),
      `tail${side < 0 ? 'L' : 'R'}`,
      shadows,
      [side * 0.92, 1.24, -2.26],
    );
  }

  const wheels = [
    buildWheel(root, 'wheelFL', -WHEEL_X, AXLE_F, black, shadows),
    buildWheel(root, 'wheelFR', WHEEL_X, AXLE_F, black, shadows),
    buildWheel(root, 'wheelRL', -WHEEL_X, AXLE_R, black, shadows),
    buildWheel(root, 'wheelRR', WHEEL_X, AXLE_R, black, shadows),
  ];

  addMesh(root, new THREE.BoxGeometry(1.7, 0.12, 3.5), blackSoft, 'undertray', shadows, [
    0,
    0.36,
    0.05,
  ]);

  root.userData.tick = (_dt: number, elapsed: number) => {
    for (const w of wheels) w.rotation.x = -elapsed * 0.28;
  };

  root.userData.sculptRuntime = {
    provenance: {
      route: 'hard-surface-object',
      exactnessTier: 'approximate-likeness',
      identity: [
        'matte Lunar Rock paint',
        'hex grille + TOYOTA letters',
        'T-DRL headlamps',
        'hood bulge + TRD PRO badges',
        'roof rack',
        'TRD hub caps',
      ],
      inferred: ['rear fascia fine detail', 'undercarriage'],
    },
  };

  root.scale.setScalar(scale);
  return root;
}

export function createToyotaSuvLookDevLights(scene: THREE.Scene): void {
  const key = new THREE.DirectionalLight(0xfff4e8, 2.15);
  key.position.set(-4.5, 6.5, 5.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 36;
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  key.shadow.bias = -0.00025;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xc8d6ff, 0.55);
  fill.position.set(5.5, 2.6, 2.4);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffe4b8, 0.85);
  rim.position.set(1.2, 3.8, -6.2);
  scene.add(rim);

  const bounce = new THREE.DirectionalLight(0xf0ebe3, 0.35);
  bounce.position.set(0, -1.5, 2);
  scene.add(bounce);

  const hemi = new THREE.HemisphereLight(0xf2f5fa, 0x3a3228, 0.48);
  scene.add(hemi);
}
