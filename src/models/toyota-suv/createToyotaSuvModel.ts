import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Toyota 4Runner-style OVERLAND RIG — hard-surface procedural factory.
 *
 * Built to the four-view reference sheet: matte army-green body, black flares
 * and rock sliders, bull bar with winch and round driving lights, snorkel,
 * loaded roof rack (duffel, jerry cans, light bar), rear ladder + swing-out
 * spare, aggressive A/T wheels, presented on a wooden display plinth.
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
const OLIVE = 0x4e5643;
const OLIVE_DEEP = 0x3f4636;
const TRIM = 0x121212;
const TRIM_SOFT = 0x1d1d1d;
const STEEL = 0x8f959c;
const RUBBER = 0x0b0b0b;
const WOOD_DARK = 0x63482c;
const LAMP_WARM = 0xfff0cf;

// --- proportions ------------------------------------------------------------
const BODY_HALF_W = 1.0;
const AXLE_F = 1.42;
const AXLE_R = -1.36;
const ARCH_R = 0.66;
const WHEEL_X = 1.0;
const TIRE_R = 0.6;
const RIDE_H = 0.6;

let paintDetailTex: THREE.CanvasTexture | null = null;

function matBody(color = OLIVE): THREE.MeshPhysicalMaterial {
  // matte military paint — gloss/clearcoat is what made earlier passes toy-like,
  // but a totally flat surface reads as plastic, so break it up with noise.
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
  // brushed / powder-coated steel — mirror-bright chrome blew out to white
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
    color: 0xb49a6b,
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
function makeGrilleMap(): THREE.CanvasTexture {
  const W = 1024;
  const H = 384;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#060606';
  ctx.fillRect(0, 0, W, H);
  // horizontal slat grille (4Runner-style bars)
  for (let i = 0; i < 4; i++) {
    const y = 40 + i * 78;
    ctx.fillStyle = '#181818';
    ctx.fillRect(20, y, W - 40, 46);
    ctx.fillStyle = '#2c2c2c';
    ctx.fillRect(20, y, W - 40, 5);
    ctx.fillStyle = '#000';
    ctx.fillRect(20, y + 46, W - 40, 12);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Fine noise used as a roughness/bump breakup so paint isn't dead-flat plastic. */
function makePaintDetail(): THREE.CanvasTexture {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#b0b0b0';
  ctx.fillRect(0, 0, S, S);
  // broad blotches (panel-to-panel sheen variation)
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
  // micro speckle (orange peel)
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
/** Boxy 4Runner side profile: flat hood, upright glass, straight roof, vertical tailgate. */
function createSideProfile(): THREE.Shape {
  const s = new THREE.Shape();
  const rear = -2.48;
  const front = 2.34;
  const rocker = 0.54;
  const roof = 2.12;
  const beltline = 1.5;

  s.moveTo(rear, rocker);
  s.lineTo(rear, beltline);
  s.lineTo(rear + 0.03, roof - 0.12);
  s.quadraticCurveTo(rear + 0.06, roof, rear + 0.28, roof);
  s.lineTo(0.62, roof); // straight roofline
  s.quadraticCurveTo(0.82, roof, 1.0, roof - 0.12);
  s.lineTo(1.46, beltline + 0.06); // windshield rake
  s.lineTo(1.62, 1.5);
  s.lineTo(2.16, 1.5); // flat hood
  s.quadraticCurveTo(front, 1.48, front, 1.3);
  s.lineTo(front, rocker + 0.2);
  s.lineTo(front - 0.12, rocker);
  s.lineTo(AXLE_F + ARCH_R, rocker);

  for (let i = 0; i <= 34; i++) {
    const a = (i / 34) * Math.PI;
    s.lineTo(AXLE_F + Math.cos(a) * ARCH_R, rocker + Math.sin(a) * ARCH_R);
  }

  s.lineTo(AXLE_R + ARCH_R, rocker);

  for (let i = 0; i <= 34; i++) {
    const a = (i / 34) * Math.PI;
    s.lineTo(AXLE_R + Math.cos(a) * ARCH_R, rocker + Math.sin(a) * ARCH_R);
  }

  s.lineTo(rear, rocker);
  return s;
}

function createBodyShell(mat: THREE.Material, shadows: boolean): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(createSideProfile(), {
    depth: BODY_HALF_W * 2,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.04,
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

// ---------------------------------------------------------------------------
// wheels — aggressive A/T tread + beadlock rim
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

  // Carcass is an OPEN tube: a solid cylinder's end cap hid the whole rim,
  // which is why the wheels read as flat black discs.
  const rubber = matRubber();
  const carcassGeo = new THREE.CylinderGeometry(TIRE_R - 0.02, TIRE_R - 0.02, 0.4, 56, 1, true);
  carcassGeo.rotateZ(Math.PI / 2);
  const carcass = new THREE.Mesh(carcassGeo, rubber);
  carcass.castShadow = shadows;
  carcass.receiveShadow = shadows;
  wheel.add(carcass);

  // rounded shoulders
  for (const sx of [-0.2, 0.2]) {
    const shoulder = new THREE.Mesh(new THREE.TorusGeometry(TIRE_R - 0.09, 0.09, 12, 44), rubber);
    shoulder.rotation.y = Math.PI / 2;
    shoulder.position.x = sx;
    shoulder.castShadow = shadows;
    wheel.add(shoulder);
  }

  // sidewalls as annuli so the rim stays visible through the middle
  const sidewallMat = new THREE.MeshPhysicalMaterial({
    color: 0x0d0d0d,
    roughness: 0.92,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  for (const sx of [-0.2, 0.2]) {
    const wall = new THREE.Mesh(new THREE.RingGeometry(0.355, TIRE_R - 0.05, 44), sidewallMat);
    wall.rotation.y = Math.PI / 2;
    wall.position.x = sx;
    wheel.add(wall);
    const bead = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.022, 8, 36), sidewallMat);
    bead.rotation.y = Math.PI / 2;
    bead.position.x = sx;
    wheel.add(bead);
  }

  // shallow A/T tread blocks
  const treadMat = new THREE.MeshPhysicalMaterial({ color: 0x141414, roughness: 0.96, metalness: 0.02 });
  const treadGeo = new RoundedBoxGeometry(0.4, 0.05, 0.12, 1, 0.015);
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2;
    const block = new THREE.Mesh(treadGeo, treadMat);
    block.position.set(
      i % 2 === 0 ? 0.03 : -0.03,
      Math.sin(a) * (TIRE_R + 0.005),
      Math.cos(a) * (TIRE_R + 0.005),
    );
    block.rotation.x = Math.PI / 2 - a;
    wheel.add(block);
  }

  // beadlock rim ring + bolts — gunmetal so the wheel face actually catches
  // light instead of reading as one black disc
  const rimMat = new THREE.MeshPhysicalMaterial({
    color: 0x9aa1a6,
    metalness: 0.92,
    roughness: 0.32,
    envMapIntensity: 1.3,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 12, 44), rimMat);
  ring.rotation.y = Math.PI / 2;
  ring.position.x = out * 0.15;
  ring.castShadow = shadows;
  wheel.add(ring);

  const boltMat = new THREE.MeshPhysicalMaterial({
    color: 0x777d82,
    metalness: 0.95,
    roughness: 0.3,
  });
  const boltGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.03, 8);
  boltGeo.rotateZ(Math.PI / 2);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.set(out * 0.175, Math.sin(a) * 0.34, Math.cos(a) * 0.34);
    wheel.add(bolt);
  }

  // rim barrel (open tube so the face isn't a solid puck)
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.34, 40, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: 0x24282b,
      metalness: 0.7,
      roughness: 0.42,
      side: THREE.DoubleSide,
    }),
  );
  barrel.rotation.z = Math.PI / 2;
  wheel.add(barrel);

  // brake disc + caliper behind the spokes, and a backing so you cannot see
  // straight through the wheel to the far side
  const disc = xCyl(0.26, 0.26, 0.03, 30, new THREE.MeshPhysicalMaterial({
    color: 0x6e7378,
    metalness: 0.9,
    roughness: 0.55,
  }));
  disc.position.x = out * 0.02;
  wheel.add(disc);
  const hat = xCyl(0.12, 0.12, 0.08, 20, matTrim(0.6, 0x2a2d30));
  hat.position.x = out * 0.06;
  wheel.add(hat);
  const caliper = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.16, 0.1, 1, 0.02), matTrim(0.5, 0x33383c));
  caliper.position.set(out * 0.02, 0.2, -0.14);
  wheel.add(caliper);
  const backing = xCyl(0.33, 0.33, 0.02, 30, new THREE.MeshPhysicalMaterial({
    color: 0x0b0b0b,
    roughness: 1,
  }));
  backing.position.x = -out * 0.14;
  wheel.add(backing);

  // 6 spokes on the outer face
  const spokeMat = new THREE.MeshPhysicalMaterial({
    color: 0x5b6166,
    metalness: 0.88,
    roughness: 0.36,
    envMapIntensity: 1.25,
  });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spoke = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.05, 0.3, 1, 0.012), spokeMat);
    spoke.position.set(out * 0.12, Math.sin(a) * 0.15, Math.cos(a) * 0.15);
    spoke.rotation.x = a;
    spoke.castShadow = shadows;
    wheel.add(spoke);
  }

  const hub = xCyl(0.12, 0.12, 0.1, 24, spokeMat);
  hub.position.x = out * 0.14;
  wheel.add(hub);

  const cap = xCyl(0.075, 0.075, 0.04, 20, matTrim(0.32, 0x14171a));
  cap.position.x = out * 0.185;
  wheel.add(cap);
  const capRing = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 8, 22), rimMat);
  capRing.rotation.y = Math.PI / 2;
  capRing.position.x = out * 0.203;
  wheel.add(capRing);

  parent.add(wheel);
  return wheel;
}

// ---------------------------------------------------------------------------
// bull bar / winch bumper
// ---------------------------------------------------------------------------
function buildBullBar(parent: THREE.Object3D, shadows: boolean): void {
  const bar = new THREE.Group();
  bar.name = 'bullBar';
  bar.position.set(0, 0, 2.4);
  parent.add(bar);

  const steelBlack = matTrim(0.5, 0x151515);

  // main bumper beam
  addMesh(bar, new RoundedBoxGeometry(2.06, 0.4, 0.3, 3, 0.05), steelBlack, 'bumperBeam', shadows, [
    0, 0.86, 0.06,
  ]);
  // lower valance + skid plate
  addMesh(bar, new RoundedBoxGeometry(1.9, 0.2, 0.26, 2, 0.04), matTrim(0.7, TRIM_SOFT), 'valance', shadows, [
    0, 0.6, 0.06,
  ]);
  addMesh(bar, new RoundedBoxGeometry(1.1, 0.06, 0.34, 2, 0.02), matSteel(0.45), 'skidPlate', shadows, [
    0, 0.5, 0.14,
  ]);

  // wing uprights + centre hoop
  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    const upright = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.62, 14), steelBlack);
    upright.position.set(side * 0.62, 1.16, 0.16);
    upright.rotation.x = -0.08;
    upright.castShadow = shadows;
    upright.name = `hoopUpright${tag}`;
    bar.add(upright);

    const wing = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.46, 12), steelBlack);
    wing.position.set(side * 0.96, 1.04, 0.1);
    wing.rotation.z = side * 0.22;
    wing.castShadow = shadows;
    bar.add(wing);
  }
  const hoopTop = xCyl(0.045, 0.045, 1.3, 14, steelBlack);
  hoopTop.position.set(0, 1.46, 0.13);
  hoopTop.castShadow = shadows;
  hoopTop.name = 'hoopTop';
  bar.add(hoopTop);

  // winch drum in the bumper cradle
  const winch = xCyl(0.13, 0.13, 0.52, 20, matTrim(0.45, 0x202020));
  winch.position.set(0, 0.88, 0.2);
  winch.castShadow = shadows;
  winch.name = 'winchDrum';
  bar.add(winch);
  const spool = xCyl(0.1, 0.1, 0.34, 18, matSteel(0.35));
  spool.position.set(0, 0.88, 0.2);
  bar.add(spool);
  addMesh(bar, new RoundedBoxGeometry(0.3, 0.16, 0.05, 2, 0.02), matSteel(0.4), 'fairlead', shadows, [
    0, 0.78, 0.34,
  ]);

  // four round driving lights on the hoop
  const lensMat = matEmissive(LAMP_WARM, 1.5);
  const housing = matTrim(0.45, 0x101010);
  const lampX = [-0.5, -0.18, 0.18, 0.5];
  for (let i = 0; i < lampX.length; i++) {
    const lamp = new THREE.Group();
    lamp.name = `drivingLight${i}`;
    lamp.position.set(lampX[i]!, 1.62, 0.16);
    const can = zCyl(0.1, 0.1, 0.12, 20, housing);
    can.castShadow = shadows;
    lamp.add(can);
    const lens = zCyl(0.085, 0.085, 0.03, 20, lensMat);
    lens.position.z = 0.08;
    lamp.add(lens);
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), housing);
    stalk.position.y = -0.11;
    lamp.add(stalk);
    bar.add(lamp);
  }

  // recovery shackles
  for (const side of [-1, 1] as const) {
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 8, 20, Math.PI), matSteel(0.4));
    shackle.position.set(side * 0.36, 0.7, 0.2);
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
  rack.position.set(0, 2.16, -0.62);
  parent.add(rack);

  const rackMat = matTrim(0.62, 0x161616);
  const LEN = 2.7;
  const HALF_W = 0.82;

  // side rails
  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    addMesh(rack, new RoundedBoxGeometry(0.06, 0.1, LEN, 1, 0.02), rackMat, `rackRail${tag}`, shadows, [
      side * HALF_W,
      0.1,
      0,
    ]);
    // feet
    for (const z of [1.15, 0.4, -0.4, -1.15]) {
      addMesh(rack, new THREE.BoxGeometry(0.07, 0.11, 0.09), rackMat, `rackFoot${tag}${z}`, shadows, [
        side * HALF_W,
        0.0,
        z,
      ]);
    }
  }
  // end rails
  for (const z of [LEN / 2 - 0.03, -LEN / 2 + 0.03]) {
    addMesh(rack, new RoundedBoxGeometry(HALF_W * 2, 0.1, 0.06, 1, 0.02), rackMat, `rackEnd${z}`, shadows, [
      0,
      0.1,
      z,
    ]);
  }
  // platform slats
  for (let i = 0; i < 13; i++) {
    const z = -LEN / 2 + 0.14 + i * ((LEN - 0.28) / 12);
    addMesh(rack, new THREE.BoxGeometry(HALF_W * 2 - 0.06, 0.025, 0.05), rackMat, `slat${i}`, shadows, [
      0,
      0.07,
      z,
    ]);
  }

  // roof light bar at the leading edge
  const barHousing = matTrim(0.45, 0x101010);
  addMesh(rack, new RoundedBoxGeometry(1.24, 0.09, 0.09, 2, 0.02), barHousing, 'lightBar', shadows, [
    0,
    0.2,
    LEN / 2 - 0.02,
  ]);
  addMesh(
    rack,
    new THREE.BoxGeometry(1.14, 0.05, 0.02),
    matEmissive(0xf2f7ff, 1.6),
    'lightBarLens',
    false,
    [0, 0.2, LEN / 2 + 0.035],
  );
  for (const side of [-1, 1] as const) {
    addMesh(rack, new THREE.BoxGeometry(0.05, 0.12, 0.05), barHousing, `lightBarMount${side}`, shadows, [
      side * 0.5,
      0.13,
      LEN / 2 - 0.04,
    ]);
  }

  // tan cargo duffel (main load)
  const bagTex = makeCanvasBagTexture();
  const bagMat = matCanvasTan();
  bagMat.map = bagTex;
  bagMat.map.repeat.set(2, 1);
  const duffel = addMesh(
    rack,
    new RoundedBoxGeometry(1.42, 0.44, 1.0, 5, 0.16),
    bagMat,
    'cargoDuffel',
    shadows,
    [0, 0.34, -0.55],
  );
  // straps over the duffel
  const strapMat = matTrim(0.8, 0x2b2b2b);
  for (const z of [-0.85, -0.25]) {
    addMesh(rack, new THREE.BoxGeometry(1.46, 0.05, 0.05), strapMat, `strap${z}`, shadows, [
      0,
      0.34 + 0.22,
      z,
    ]);
    for (const side of [-1, 1] as const) {
      addMesh(rack, new THREE.BoxGeometry(0.05, 0.46, 0.05), strapMat, `strapSide${side}${z}`, shadows, [
        side * 0.72,
        0.34,
        z,
      ]);
    }
  }
  void duffel;

  // rolled tent / dry bag
  const roll = xCyl(0.17, 0.17, 1.3, 20, bagMat);
  roll.position.set(0, 0.28, 0.42);
  roll.castShadow = shadows;
  roll.name = 'cargoRoll';
  rack.add(roll);
  for (const sx of [-0.65, 0.65]) {
    const cap = xCyl(0.17, 0.17, 0.03, 20, matTrim(0.85, 0x6f5e40));
    cap.position.set(sx, 0.28, 0.42);
    rack.add(cap);
  }

  // jerry cans
  const canMat = matTrim(0.7, 0x39412f);
  for (let i = 0; i < 2; i++) {
    const can = new THREE.Group();
    can.name = `jerryCan${i}`;
    can.position.set(-0.42 + i * 0.84, 0.28, 1.05);
    const bodyCan = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.4, 0.16, 3, 0.035), canMat);
    bodyCan.castShadow = shadows;
    can.add(bodyCan);
    // X ribs
    for (const r of [-1, 1]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.02), matTrim(0.65, 0x2c3325));
      rib.position.z = 0.085;
      rib.rotation.z = r * 0.85;
      can.add(rib);
    }
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 12), matTrim(0.6, 0x22271d));
    spout.position.set(0.1, 0.22, 0);
    can.add(spout);
    const handleBar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.04), canMat);
    handleBar.position.set(-0.02, 0.22, 0);
    can.add(handleBar);
    rack.add(can);
  }

  // shovel / traction board strapped to the side rail
  const board = addMesh(
    rack,
    new RoundedBoxGeometry(0.1, 0.06, 1.1, 2, 0.02),
    matTrim(0.8, 0x8a5a1e),
    'tractionBoard',
    shadows,
    [-0.87, 0.14, -0.2],
  );
  void board;
}

// ---------------------------------------------------------------------------
// rear: ladder, swing-out spare, tail lights
// ---------------------------------------------------------------------------
function buildRear(parent: THREE.Object3D, shadows: boolean): void {
  const rear = new THREE.Group();
  rear.name = 'rearKit';
  parent.add(rear);

  const black = matTrim(0.6, 0x141414);

  // rear bumper
  addMesh(rear, new RoundedBoxGeometry(2.0, 0.36, 0.32, 3, 0.05), black, 'rearBumper', shadows, [
    0,
    0.78,
    -2.6,
  ]);
  addMesh(rear, new RoundedBoxGeometry(1.0, 0.06, 0.3, 2, 0.02), matSteel(0.45), 'rearSkid', shadows, [
    0,
    0.58,
    -2.6,
  ]);

  // tail lights
  for (const side of [-1, 1] as const) {
    addMesh(
      rear,
      new RoundedBoxGeometry(0.16, 0.42, 0.12, 2, 0.03),
      new THREE.MeshPhysicalMaterial({
        color: 0x8c1414,
        emissive: new THREE.Color(0x5c0c0c),
        emissiveIntensity: 0.6,
        roughness: 0.3,
      }),
      `tail${side < 0 ? 'L' : 'R'}`,
      shadows,
      [side * 0.9, 1.28, -2.5],
    );
  }

  // swing-out spare tyre carrier
  const carrier = new THREE.Group();
  carrier.name = 'spareCarrier';
  carrier.position.set(0.1, 1.15, -2.56);
  rear.add(carrier);
  addMesh(carrier, new RoundedBoxGeometry(1.1, 0.09, 0.09, 2, 0.02), black, 'carrierArm', shadows, [
    -0.1,
    -0.3,
    0,
  ]);
  addMesh(carrier, new RoundedBoxGeometry(0.09, 0.8, 0.09, 2, 0.02), black, 'carrierPost', shadows, [
    -0.62,
    0.08,
    0,
  ]);

  const spare = new THREE.Group();
  spare.name = 'spareWheel';
  spare.position.set(0.05, 0.06, -0.16);
  spare.rotation.y = Math.PI / 2;
  buildWheel(spare, 'spareTyre', 0, 0, shadows);
  spare.children[0]!.position.set(0, 0, 0);
  spare.scale.setScalar(0.94);
  carrier.add(spare);

  // rear ladder on the driver side of the tailgate
  const ladder = new THREE.Group();
  ladder.name = 'rearLadder';
  ladder.position.set(-0.72, 0, -2.5);
  rear.add(ladder);
  for (const sx of [-0.14, 0.14]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.28, 10), black);
    rail.position.set(sx, 1.5, 0);
    rail.castShadow = shadows;
    ladder.add(rail);
  }
  for (let i = 0; i < 5; i++) {
    const rung = xCyl(0.022, 0.022, 0.28, 8, black);
    rung.position.set(0, 0.98 + i * 0.27, 0);
    rung.castShadow = shadows;
    ladder.add(rung);
  }
  // ladder standoffs
  for (const y of [0.98, 2.05]) {
    addMesh(ladder, new THREE.BoxGeometry(0.05, 0.05, 0.12), black, `standoff${y}`, shadows, [0, y, 0.07]);
  }
}

// ---------------------------------------------------------------------------
// wooden display plinth (matches the reference presentation)
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

  const plinth = addMesh(
    base,
    new RoundedBoxGeometry(3.15, 0.22, 5.95, 3, 0.05),
    woodMat,
    'plinth',
    shadows,
    [0, -0.18, -0.1],
  );
  plinth.receiveShadow = true;

  const trimMat = new THREE.MeshPhysicalMaterial({ color: WOOD_DARK, roughness: 0.7, metalness: 0.03 });
  addMesh(base, new RoundedBoxGeometry(3.26, 0.05, 6.06, 2, 0.02), trimMat, 'plinthLip', shadows, [
    0,
    -0.3,
    -0.1,
  ]);

  // earth top so the tyres sit on terrain, not a floating slab
  const earthTex = makePaintDetail();
  earthTex.repeat.set(3, 5);
  const earthMat = new THREE.MeshPhysicalMaterial({
    color: 0x5f5748,
    roughness: 1,
    metalness: 0.0,
    roughnessMap: earthTex,
    bumpMap: earthTex,
    bumpScale: 0.02,
  });
  const earth = addMesh(
    base,
    new RoundedBoxGeometry(2.9, 0.1, 5.62, 2, 0.03),
    earthMat,
    'earthBed',
    shadows,
    [0, -0.02, -0.1],
  );
  earth.receiveShadow = true;

  // soft contact-occlusion decal so the rig is planted, not hovering
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
    new THREE.PlaneGeometry(3.0, 5.4),
    new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false }),
  );
  ao.rotation.x = -Math.PI / 2;
  ao.position.set(0, 0.035, -0.1);
  ao.name = 'contactShadow';
  base.add(ao);

  const rockMat = new THREE.MeshPhysicalMaterial({ color: 0x7a7365, roughness: 0.95, metalness: 0.0 });
  const rockSpots: Array<[number, number, number]> = [
    [1.32, 0.02, 1.6],
    [-1.35, 0.03, 0.5],
    [1.18, 0.01, -1.5],
    [-1.2, 0.04, -2.1],
    [0.2, 0.01, 2.5],
    [-0.4, 0.02, -2.75],
  ];
  rockSpots.forEach(([x, y, z], i) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + (i % 3) * 0.05, 0), rockMat);
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
  root.name = 'toyotaOverlandRig';

  if (withBase) buildDisplayBase(root, shadows);

  const rig = new THREE.Group();
  rig.name = 'rig';
  root.add(rig);

  const paint = matBody();
  const paintDeep = matBody(OLIVE_DEEP);
  const black = matTrim();
  const blackSoft = matTrim(0.78, TRIM_SOFT);

  rig.add(createBodyShell(paint, shadows));

  // ---- roof cap: slight tumblehome so the cabin isn't a straight-sided box --
  addMesh(rig, new RoundedBoxGeometry(1.94, 0.1, 3.02, 3, 0.05), paint, 'roofCap', shadows, [
    0,
    2.14,
    -0.92,
  ]);
  addMesh(rig, new RoundedBoxGeometry(1.72, 0.04, 2.7, 2, 0.02), paintDeep, 'roofInset', shadows, [
    0,
    2.19,
    -0.92,
  ]);

  // shoulder character line down each flank
  for (const side of [-1, 1] as const) {
    addMesh(
      rig,
      new RoundedBoxGeometry(0.035, 0.07, 3.9, 1, 0.012),
      paint,
      `shoulderCrease${side < 0 ? 'L' : 'R'}`,
      shadows,
      [side * 1.045, 1.2, -0.1],
    );
  }

  // ---- hood + bonnet detail ------------------------------------------------
  addMesh(rig, new RoundedBoxGeometry(1.5, 0.05, 0.72, 2, 0.02), paintDeep, 'hoodPanel', shadows, [
    0,
    1.53,
    1.86,
  ]);
  addMesh(rig, new RoundedBoxGeometry(0.62, 0.06, 0.4, 2, 0.02), blackSoft, 'hoodScoop', shadows, [
    0,
    1.56,
    1.72,
  ]);
  for (const side of [-1, 1] as const) {
    addMesh(rig, new THREE.BoxGeometry(0.1, 0.05, 0.1), blackSoft, `hoodLatch${side}`, shadows, [
      side * 0.72,
      1.54,
      2.16,
    ]);
  }

  // ---- glass + cabin void --------------------------------------------------
  addMesh(
    rig,
    new THREE.BoxGeometry(1.7, 0.6, 2.5),
    new THREE.MeshPhysicalMaterial({ color: 0x05070a, roughness: 0.9, metalness: 0.05 }),
    'cabinVoid',
    false,
    [0, 1.8, -0.5],
  );
  const glass = matGlass();
  const recessMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0c0e, roughness: 0.75, metalness: 0.1 });

  // windshield sits on the rake between the cowl and the roof
  addMesh(rig, new THREE.PlaneGeometry(1.52, 0.62), glass, 'windshield', false, [0, 1.8, 1.26], [
    -0.76,
    0,
    0,
  ]);
  // thin surround only — a solid frame panel read as a black sticker on the hood
  for (const side of [-1, 1] as const) {
    addMesh(rig, new THREE.BoxGeometry(0.04, 0.64, 0.04), black, `wsPillar${side}`, shadows, [
      side * 0.76,
      1.8,
      1.25,
    ], [-0.76, 0, 0]);
  }
  addMesh(rig, new THREE.BoxGeometry(1.54, 0.05, 0.05), black, 'wsHeader', shadows, [0, 2.02, 1.05]);
  addMesh(rig, new THREE.BoxGeometry(1.54, 0.05, 0.05), black, 'wsCowl', shadows, [0, 1.56, 1.46]);

  // tailgate glass
  addMesh(rig, new THREE.BoxGeometry(1.54, 0.56, 0.03), recessMat, 'rearRecess', false, [0, 1.84, -2.5]);
  addMesh(rig, new THREE.PlaneGeometry(1.44, 0.48), glass, 'rearGlass', false, [0, 1.84, -2.53], [
    0,
    Math.PI,
    0,
  ]);

  // side greenhouse: one recessed dark band, glass over it, body-colour pillars on top
  const BAND_Z0 = -2.4;
  const BAND_Z1 = 0.56;
  const BAND_LEN = BAND_Z1 - BAND_Z0;
  const BAND_CZ = (BAND_Z0 + BAND_Z1) / 2;
  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';

    addMesh(rig, new THREE.BoxGeometry(0.04, 0.58, BAND_LEN), recessMat, `windowBand${tag}`, false, [
      side * 1.035,
      1.81,
      BAND_CZ,
    ]);
    addMesh(rig, new THREE.PlaneGeometry(BAND_LEN - 0.05, 0.5), glass, `sideGlass${tag}`, false, [
      side * 1.058,
      1.81,
      BAND_CZ,
    ], [0, (side * Math.PI) / 2, 0]);

    // pillars break the band into door / quarter windows
    const pillars: Array<[number, number]> = [
      [0.52, 0.14],
      [-0.3, 0.1],
      [-1.36, 0.1],
      [-2.32, 0.14],
    ];
    for (const [pz, pw] of pillars) {
      addMesh(rig, new RoundedBoxGeometry(0.055, 0.64, pw, 1, 0.014), paint, `pillar${tag}${pz}`, shadows, [
        side * 1.055,
        1.81,
        pz,
      ]);
    }

    // A-pillar follows the windscreen rake
    addMesh(rig, new RoundedBoxGeometry(0.09, 0.72, 0.1, 1, 0.02), paint, `aPillar${tag}`, shadows, [
      side * 0.99,
      1.8,
      1.16,
    ], [-0.76, 0, side * 0.03]);

    // belt line + roof drip rail so the greenhouse reads separately from the body
    addMesh(rig, new THREE.BoxGeometry(0.05, 0.05, BAND_LEN + 0.1), black, `beltLine${tag}`, shadows, [
      side * 1.05,
      1.5,
      BAND_CZ,
    ]);
    addMesh(rig, new THREE.BoxGeometry(0.06, 0.05, BAND_LEN + 0.12), black, `dripRail${tag}`, shadows, [
      side * 1.02,
      2.11,
      BAND_CZ,
    ]);
  }

  // ---- front fascia --------------------------------------------------------
  const fascia = new THREE.Group();
  fascia.name = 'frontFascia';
  fascia.position.set(0, 0, 2.3);
  rig.add(fascia);

  addMesh(fascia, new RoundedBoxGeometry(1.72, 0.44, 0.14, 2, 0.03), black, 'grilleHouse', shadows, [
    0,
    1.22,
    0.02,
  ]);
  const grilleMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0a,
    map: makeGrilleMap(),
    metalness: 0.5,
    roughness: 0.45,
    envMapIntensity: 0.6,
  });
  addMesh(fascia, new THREE.PlaneGeometry(1.62, 0.38), grilleMat, 'grille', false, [0, 1.22, 0.1]);

  // headlights
  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    const lampGroup = new THREE.Group();
    lampGroup.name = `headlamp${tag}`;
    lampGroup.position.set(side * 0.72, 1.22, 0.04);
    fascia.add(lampGroup);
    // recessed housing, dark glass cover, small bright projector inside —
    // a flat white block on the nose reads as a decal, not a lamp
    addMesh(lampGroup, new RoundedBoxGeometry(0.36, 0.3, 0.14, 2, 0.03), matTrim(0.4, 0x0b0b0b), `house${tag}`, shadows);
    addMesh(
      lampGroup,
      new RoundedBoxGeometry(0.28, 0.21, 0.03, 2, 0.015),
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
      [0, 0.02, 0.075],
    );
    const projector = zCyl(0.055, 0.055, 0.05, 18, matEmissive(0xeaf1ff, 1.2));
    projector.position.set(side * -0.04, 0.04, 0.055);
    lampGroup.add(projector);
    const bezel = zCyl(0.07, 0.07, 0.03, 18, matSteel(0.4));
    bezel.position.set(side * -0.04, 0.04, 0.045);
    lampGroup.add(bezel);
    addMesh(lampGroup, new THREE.BoxGeometry(0.22, 0.03, 0.02), matEmissive(0xffab3d, 0.7), `marker${tag}`, false, [
      0,
      -0.1,
      0.076,
    ]);
  }

  buildBullBar(rig, shadows);

  // ---- side kit: flares, sliders, mirrors, handles, snorkel ----------------
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

    // wide bolt-on flares that actually cover the tyres (tyres proud of the
    // bodywork is the single biggest "toy" tell)
    for (const z of [AXLE_F, AXLE_R]) {
      const flare = new THREE.Mesh(
        new THREE.TorusGeometry(ARCH_R + 0.03, 0.135, 12, 34, Math.PI * 1.06),
        flareMat,
      );
      flare.name = `flare${tag}${z}`;
      flare.rotation.y = Math.PI / 2;
      flare.rotation.z = side < 0 ? 0.02 : -0.02;
      flare.position.set(side * 1.09, RIDE_H, z);
      flare.castShadow = shadows;
      rig.add(flare);

      // inner fill so the flare doesn't float off the body side
      const fill = new THREE.Mesh(
        new THREE.TorusGeometry(ARCH_R + 0.03, 0.105, 10, 30, Math.PI * 1.06),
        flareMat,
      );
      fill.rotation.y = Math.PI / 2;
      fill.position.set(side * 1.0, RIDE_H, z);
      rig.add(fill);

      // flare bolts
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * 0.1 + (i / 5) * Math.PI * 0.8;
        const boltG = new THREE.CylinderGeometry(0.018, 0.018, 0.03, 8);
        boltG.rotateZ(Math.PI / 2);
        const bolt = new THREE.Mesh(boltG, matTrim(0.5, 0x2e2e2e));
        bolt.position.set(
          side * 1.22,
          RIDE_H + Math.sin(a) * (ARCH_R + 0.03),
          z + Math.cos(a) * (ARCH_R + 0.03),
        );
        rig.add(bolt);
      }
    }

    // rock sliders
    addMesh(rig, new RoundedBoxGeometry(0.14, 0.14, 2.3, 2, 0.05), matTrim(0.55, 0x141414), `slider${tag}`, shadows, [
      side * 1.1,
      0.62,
      0.02,
    ]);
    for (const z of [0.8, 0.0, -0.8]) {
      addMesh(rig, new THREE.BoxGeometry(0.14, 0.1, 0.07), matTrim(0.55, 0x141414), `sliderLeg${tag}${z}`, shadows, [
        side * 1.0,
        0.68,
        z,
      ]);
    }

    // lower body cladding
    addMesh(rig, new RoundedBoxGeometry(0.1, 0.2, 2.5, 2, 0.03), blackSoft, `cladding${tag}`, shadows, [
      side * 1.03,
      0.86,
      0.02,
    ]);

    // mirrors
    const mirror = new THREE.Group();
    mirror.name = `mirror${tag}`;
    mirror.position.set(side * 1.14, 1.72, 1.0);
    addMesh(mirror, new RoundedBoxGeometry(0.22, 0.15, 0.3, 2, 0.03), black, `mirrorBody${tag}`, shadows);
    addMesh(mirror, new THREE.PlaneGeometry(0.16, 0.1), matSteel(0.2), `mirrorGlass${tag}`, false, [
      side * -0.12,
      0,
      0,
    ], [0, (side * Math.PI) / 2, 0]);
    addMesh(mirror, new THREE.BoxGeometry(0.09, 0.05, 0.09), black, `mirrorArm${tag}`, shadows, [
      side * -0.13,
      -0.04,
      -0.06,
    ]);
    rig.add(mirror);

    // door handles
    for (const z of [0.42, -0.62]) {
      addMesh(rig, new RoundedBoxGeometry(0.04, 0.06, 0.18, 1, 0.015), black, `handle${tag}${z}`, shadows, [
        side * 1.04,
        1.36,
        z,
      ]);
    }

    // door seam
    addMesh(rig, new THREE.BoxGeometry(0.016, 0.62, 0.016), blackSoft, `seam${tag}`, shadows, [
      side * 1.045,
      1.2,
      -0.28,
    ]);
  }

  // snorkel up the passenger A-pillar
  const snorkel = new THREE.Group();
  snorkel.name = 'snorkel';
  rig.add(snorkel);
  const snorkMat = matTrim(0.75, 0x171717);
  const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 1.05, 16), snorkMat);
  riser.position.set(1.0, 1.66, 1.16);
  riser.rotation.x = -0.2;
  riser.castShadow = shadows;
  snorkel.add(riser);
  const headBend = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.075, 10, 20, Math.PI / 2), snorkMat);
  headBend.position.set(1.0, 2.18, 1.06);
  headBend.rotation.set(0, Math.PI / 2, Math.PI / 2);
  headBend.castShadow = shadows;
  snorkel.add(headBend);
  const ramHead = zCyl(0.085, 0.11, 0.3, 16, snorkMat);
  ramHead.position.set(1.0, 2.3, 1.22);
  ramHead.castShadow = shadows;
  snorkel.add(ramHead);
  const lowerDuct = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 14), snorkMat);
  lowerDuct.position.set(1.0, 1.16, 1.28);
  lowerDuct.rotation.x = -0.12;
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

  // dark liner filling the arch tunnel so the wells have depth instead of
  // showing daylight straight through the body
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
    liner.position.set(0, RIDE_H, z);
    liner.name = `wheelWell${z}`;
    rig.add(liner);
  }

  // panel gaps — thin recessed lines read as real shut lines under studio light
  const gapMat = new THREE.MeshBasicMaterial({ color: 0x0d0f0c });
  const gaps: Array<{ geo: [number, number, number]; pos: [number, number, number] }> = [
    { geo: [1.66, 0.012, 0.012], pos: [0, 1.545, 2.16] }, // hood front shut
    { geo: [0.012, 0.05, 0.66], pos: [-0.83, 1.535, 1.86] }, // hood side L
    { geo: [0.012, 0.05, 0.66], pos: [0.83, 1.535, 1.86] }, // hood side R
    { geo: [1.7, 0.012, 0.012], pos: [0, 1.545, 1.5] }, // cowl shut
    { geo: [1.72, 0.012, 0.012], pos: [0, 0.86, -2.52] }, // tailgate lower shut
  ];
  for (const [i, g] of gaps.entries()) {
    addMesh(rig, new THREE.BoxGeometry(...g.geo), gapMat, `panelGap${i}`, false, g.pos);
  }
  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    // front/rear door shut lines + fender-to-door gap
    for (const z of [0.86, -0.28, -1.42]) {
      addMesh(rig, new THREE.BoxGeometry(0.014, 0.66, 0.014), gapMat, `doorGap${tag}${z}`, false, [
        side * 1.048,
        1.16,
        z,
      ]);
    }
  }

  // axles + diff so there is no hollow gap under the body
  for (const z of [AXLE_F, AXLE_R]) {
    const axle = xCyl(0.075, 0.075, WHEEL_X * 2, 14, matTrim(0.7, 0x1a1a1a));
    axle.position.set(0, RIDE_H, z);
    axle.castShadow = shadows;
    rig.add(axle);
    const diff = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 14), matTrim(0.7, 0x1a1a1a));
    diff.position.set(0.06, RIDE_H, z);
    diff.castShadow = shadows;
    rig.add(diff);
  }
  addMesh(rig, new THREE.BoxGeometry(1.5, 0.12, 3.1), matTrim(0.85, 0x101010), 'undertray', shadows, [
    0,
    0.5,
    0.02,
  ]);
  // exhaust
  const exhaust = zCyl(0.055, 0.055, 1.2, 12, matSteel(0.5));
  exhaust.position.set(-0.7, 0.56, -1.9);
  rig.add(exhaust);

  // ---- animation -----------------------------------------------------------
  root.userData.tick = (_dt: number, elapsed: number) => {
    for (const w of wheels) w.rotation.x = -elapsed * 0.22;
  };

  root.userData.sculptRuntime = {
    provenance: {
      route: 'hard-surface-object',
      exactnessTier: 'approximate-likeness',
      identity: [
        'matte army-green paint',
        'bull bar + winch + 4 driving lights',
        'snorkel',
        'loaded roof rack (duffel, roll, jerry cans, light bar)',
        'rear ladder + swing-out spare',
        'A/T tread wheels on beadlock rims',
        'wooden display plinth',
      ],
      inferred: ['interior', 'undercarriage detail'],
    },
  };

  root.scale.setScalar(scale);
  return root;
}

// ===========================================================================
// LOOKDEV LIGHTS — soft grey studio like the reference sheet
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

  // low side kickers so wheel faces, sliders and flares read instead of
  // collapsing into one black silhouette
  const kickR = new THREE.DirectionalLight(0xe6eef8, 0.55);
  kickR.position.set(9, 0.9, 0.5);
  scene.add(kickR);

  const kickL = new THREE.DirectionalLight(0xe6eef8, 0.45);
  kickL.position.set(-9, 0.9, -0.5);
  scene.add(kickL);

  const bounce = new THREE.DirectionalLight(0xece7dd, 0.4);
  bounce.position.set(0, -2, 2.5);
  scene.add(bounce);

  const hemi = new THREE.HemisphereLight(0xf4f6f8, 0x3b382f, 0.55);
  scene.add(hemi);
}
