import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Trailhunter-style Toyota SUV — procedural rebuild v3.
 *
 * Main volume = extruded side profile with real wheel-arch scallops + bevel.
 * Fascia / cladding / wheels layered on top for identity details.
 *
 * +Z forward · +Y up · +X right
 */

export interface ToyotaSuvOptions {
  scale?: number;
  shadows?: boolean;
}

const PAINT = 0xb59a72;
const PAINT_DEEP = 0x9a815c;
const TRIM = 0x0f0f0f;
const TRIM_SOFT = 0x1a1a1a;
const STEEL = 0xc5cbd4;
const RUBBER = 0x080808;
const RED = 0xb81414;

const BODY_HALF_W = 0.98;
const AXLE_F = 1.32;
const AXLE_R = -1.22;
const ARCH_R = 0.6;
const WHEEL_X = 1.14;

function matPaint(color = PAINT): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.3,
    roughness: 0.33,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.0,
  });
}

function matTrim(rough = 0.58, color = TRIM): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.18,
    roughness: rough,
    envMapIntensity: 0.55,
  });
}

function matSteel(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: STEEL,
    metalness: 0.95,
    roughness: 0.26,
    envMapIntensity: 1.2,
  });
}

function matRubber(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: RUBBER,
    metalness: 0.02,
    roughness: 0.93,
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
  const rear = -2.55;
  const front = 2.15;
  const rocker = 0.46;

  s.moveTo(rear, rocker);
  s.lineTo(rear, 1.18);
  s.quadraticCurveTo(rear + 0.05, 2.02, rear + 0.55, 2.05);
  s.lineTo(0.75, 2.05);
  s.lineTo(1.55, 1.42);
  s.lineTo(front - 0.15, 1.42);
  s.lineTo(front, 1.2);
  s.lineTo(front, rocker + 0.14);
  s.lineTo(front - 0.1, rocker);
  s.lineTo(AXLE_F + ARCH_R, rocker);

  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI;
    s.lineTo(AXLE_F + Math.cos(a) * ARCH_R, rocker + Math.sin(a) * ARCH_R);
  }

  s.lineTo(AXLE_R + ARCH_R, rocker);

  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI;
    s.lineTo(AXLE_R + Math.cos(a) * ARCH_R, rocker + Math.sin(a) * ARCH_R);
  }

  s.lineTo(rear, rocker);
  return s;
}

function createBodyShell(mat: THREE.Material, shadows: boolean): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(createSideProfile(), {
    depth: BODY_HALF_W * 2,
    bevelEnabled: true,
    bevelThickness: 0.055,
    bevelSize: 0.05,
    bevelSegments: 5,
    curveSegments: 32,
  });
  // Shape X (length, rear→front) → world +Z; extrude depth → world width (X).
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
  ctx.fillStyle = '#060606';
  ctx.fillRect(0, 0, W, H);

  const cellW = 24;
  const cellH = 18;
  for (let row = 0; row < 30; row++) {
    const y = 6 + row * cellH;
    const off = row % 2 ? cellW * 0.5 : 0;
    for (let col = -1; col < 46; col++) {
      const x = off + col * cellW;
      ctx.beginPath();
      ctx.moveTo(x + cellW * 0.5, y);
      ctx.lineTo(x + cellW * 0.92, y + cellH * 0.5);
      ctx.lineTo(x + cellW * 0.5, y + cellH);
      ctx.lineTo(x + cellW * 0.08, y + cellH * 0.5);
      ctx.closePath();
      ctx.fillStyle = '#101010';
      ctx.fill();
      ctx.strokeStyle = '#2c2c2c';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  ctx.fillStyle = '#030303';
  ctx.fillRect(100, 175, 824, 140);
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 6;
  ctx.strokeRect(100, 175, 824, 140);
  ctx.fillStyle = '#f2f2f2';
  ctx.font = 'bold 96px Arial Black, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TOYOTA', W / 2, 248);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeHeadlightMap(flip: boolean): THREE.CanvasTexture {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#0a1018';
  ctx.fillRect(0, 0, S, S);
  if (flip) {
    ctx.translate(S, 0);
    ctx.scale(-1, 1);
  }
  const g = ctx.createRadialGradient(300, 170, 10, 300, 170, 130);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, '#c5d2e4');
  g.addColorStop(1, '#1a222c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(300, 170, 118, 96, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#f7f9ff';
  ctx.shadowColor = '#9ec0ff';
  ctx.shadowBlur = 20;
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(75, 55);
  ctx.lineTo(75, 430);
  ctx.lineTo(390, 430);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeTireMap(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 256;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#101010';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#2a2a2a';
  for (let i = 0; i < 24; i++) {
    const x = (i / 24) * 512;
    ctx.fillRect(x + 2, 8, 11, 95);
    ctx.fillRect(x + 10, 145, 11, 95);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildWheel(
  parent: THREE.Group,
  name: string,
  x: number,
  z: number,
  paintMat: THREE.Material,
  trimMat: THREE.Material,
  shadows: boolean,
): THREE.Group {
  const wheel = new THREE.Group();
  wheel.name = name;
  wheel.position.set(x, 0.52, z);

  const tireMat = matRubber();
  tireMat.map = makeTireMap();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.4, 64), tireMat);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = shadows;
  tire.receiveShadow = shadows;
  wheel.add(tire);

  for (const sx of [-0.2, 0.2]) {
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.035, 12, 48), matRubber());
    lip.rotation.y = Math.PI / 2;
    lip.position.x = sx;
    wheel.add(lip);
  }

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.26, 48), trimMat);
  rim.rotation.z = Math.PI / 2;
  rim.castShadow = shadows;
  wheel.add(rim);

  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.3), trimMat);
    spoke.rotation.z = Math.PI / 2;
    spoke.rotation.x = ang;
    spoke.position.x = x < 0 ? -0.08 : 0.08;
    spoke.castShadow = shadows;
    wheel.add(spoke);

    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, 0.12), trimMat);
    tip.rotation.z = Math.PI / 2;
    tip.rotation.x = ang + 0.28;
    tip.position.set(
      x < 0 ? -0.09 : 0.09,
      Math.sin(ang) * 0.14,
      Math.cos(ang) * 0.14,
    );
    wheel.add(tip);
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.24, 32), paintMat);
  hub.rotation.z = Math.PI / 2;
  hub.position.x = x < 0 ? -0.11 : 0.11;
  wheel.add(hub);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.048, 0.05, 24),
    new THREE.MeshPhysicalMaterial({ color: RED, metalness: 0.5, roughness: 0.28 }),
  );
  cap.rotation.z = Math.PI / 2;
  cap.position.x = x < 0 ? -0.14 : 0.14;
  wheel.add(cap);

  parent.add(wheel);
  return wheel;
}

export function createToyotaSuvModel(options: ToyotaSuvOptions = {}): THREE.Group {
  const scale = options.scale ?? 1;
  const shadows = options.shadows ?? true;
  const root = new THREE.Group();
  root.name = 'toyotaSuv';

  const paint = matPaint();
  const paintDeep = matPaint(PAINT_DEEP);
  const black = matTrim();
  const blackSoft = matTrim(0.7, TRIM_SOFT);

  root.add(createBodyShell(paint, shadows));

  // roof inset + rails
  addMesh(root, new RoundedBoxGeometry(1.55, 0.06, 2.15, 2, 0.02), paintDeep, 'roofInset', shadows, [0, 2.2, -0.2]);
  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    addMesh(root, new RoundedBoxGeometry(0.055, 0.045, 2.1, 1, 0.01), black, `rail${tag}`, shadows, [side * 0.68, 2.28, -0.2]);
    addMesh(root, new THREE.BoxGeometry(0.06, 0.07, 0.07), black, `railFootF${tag}`, shadows, [side * 0.68, 2.24, 0.55]);
    addMesh(root, new THREE.BoxGeometry(0.06, 0.07, 0.07), black, `railFootR${tag}`, shadows, [side * 0.68, 2.24, -0.95]);
  }

  // hood scoop
  addMesh(root, new RoundedBoxGeometry(0.5, 0.07, 0.42, 2, 0.02), blackSoft, 'scoop', shadows, [0, 1.58, 1.55]);

  // glass — dark recessed panes so they read even on a solid shell
  const glassDark = new THREE.MeshPhysicalMaterial({
    color: 0x0b1218,
    metalness: 0.15,
    roughness: 0.12,
    envMapIntensity: 1.8,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });
  addMesh(root, new THREE.PlaneGeometry(1.55, 0.7), glassDark, 'windshield', false, [0, 1.72, 1.0], [-0.48, 0, 0]);
  addMesh(root, new THREE.PlaneGeometry(1.45, 0.58), glassDark, 'rearGlass', false, [0, 1.72, -1.95], [0.28, Math.PI, 0]);
  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    addMesh(root, new THREE.PlaneGeometry(1.05, 0.46), glassDark, `glassF${tag}`, false, [side * 1.03, 1.7, 0.0], [0, (side * Math.PI) / 2, 0]);
    addMesh(root, new THREE.PlaneGeometry(0.9, 0.46), glassDark, `glassR${tag}`, false, [side * 1.03, 1.7, -0.95], [0, (side * Math.PI) / 2, 0]);
    addMesh(root, new RoundedBoxGeometry(0.09, 0.8, 0.12, 1, 0.02), black, `aPillar${tag}`, shadows, [side * 0.92, 1.72, 0.78], [-0.42, 0, side * 0.06]);
    addMesh(root, new THREE.BoxGeometry(0.05, 0.52, 0.08), black, `bPillar${tag}`, shadows, [side * 0.97, 1.7, -0.4]);
  }

  // door seams
  for (const side of [-1, 1] as const) {
    addMesh(root, new THREE.BoxGeometry(0.02, 0.7, 0.02), blackSoft, `seam${side}`, shadows, [side * 1.005, 1.15, -0.15]);
  }

  // front fascia
  const front = new THREE.Group();
  front.name = 'frontFascia';
  front.position.set(0, 0, 2.22);
  root.add(front);

  addMesh(front, new RoundedBoxGeometry(2.0, 0.42, 0.38, 3, 0.05), black, 'bumper', shadows, [0, 0.58, 0.08]);
  addMesh(front, new RoundedBoxGeometry(1.7, 0.14, 0.28, 2, 0.03), blackSoft, 'valence', shadows, [0, 0.34, 0.12]);
  addMesh(front, new RoundedBoxGeometry(1.08, 0.07, 0.32, 2, 0.02), matSteel(), 'skid', shadows, [0, 0.3, 0.2]);
  addMesh(front, new RoundedBoxGeometry(1.52, 0.58, 0.16, 2, 0.03), black, 'grilleHouse', shadows, [0, 1.05, 0.02]);

  const grilleMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0a,
    metalness: 0.5,
    roughness: 0.4,
    map: makeGrilleMap(),
    envMapIntensity: 0.85,
  });
  addMesh(front, new THREE.PlaneGeometry(1.44, 0.52), grilleMat, 'grille', false, [0, 1.05, 0.11]);

  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    const lampMat = new THREE.MeshPhysicalMaterial({
      color: 0xf2f5fa,
      metalness: 0.12,
      roughness: 0.15,
      map: makeHeadlightMap(side > 0),
      emissive: new THREE.Color(0xdde6f5),
      emissiveIntensity: 0.38,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
    });
    addMesh(front, new RoundedBoxGeometry(0.42, 0.3, 0.18, 2, 0.04), lampMat, `lamp${tag}`, shadows, [side * 0.8, 1.08, 0.12]);
    addMesh(front, new THREE.CylinderGeometry(0.085, 0.095, 0.08, 24), blackSoft, `fog${tag}`, shadows, [side * 0.72, 0.5, 0.24], [Math.PI / 2, 0, 0]);
  }

  // cladding + flares + mirrors + handles
  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    addMesh(root, new RoundedBoxGeometry(0.14, 0.24, 3.55, 2, 0.03), black, `cladding${tag}`, shadows, [side * 1.02, 0.82, 0.05]);
    addMesh(root, new RoundedBoxGeometry(0.12, 0.09, 2.45, 2, 0.02), matSteel(), `rocker${tag}`, shadows, [side * 1.08, 0.48, 0.05]);

    for (const z of [AXLE_F, AXLE_R]) {
      const flare = new THREE.Mesh(
        new THREE.TorusGeometry(ARCH_R + 0.02, 0.08, 14, 48, Math.PI * 1.25),
        blackSoft,
      );
      flare.name = `flare${tag}-${z}`;
      flare.rotation.y = Math.PI / 2;
      flare.rotation.z = side < 0 ? 0.1 : -0.1;
      flare.position.set(side * 1.03, 0.52, z);
      flare.castShadow = shadows;
      root.add(flare);
    }

    const mirror = new THREE.Group();
    mirror.position.set(side * 1.1, 1.55, 0.78);
    addMesh(mirror, new RoundedBoxGeometry(0.22, 0.14, 0.32, 2, 0.03), black, `mirror${tag}`, shadows);
    addMesh(mirror, new THREE.PlaneGeometry(0.16, 0.1), matSteel(), `mGlass${tag}`, false, [side * -0.12, 0, 0], [0, (side * Math.PI) / 2, 0]);
    root.add(mirror);

    addMesh(root, new RoundedBoxGeometry(0.04, 0.05, 0.16, 1, 0.01), black, `handleF${tag}`, shadows, [side * 1.03, 1.18, 0.28]);
    addMesh(root, new RoundedBoxGeometry(0.04, 0.05, 0.16, 1, 0.01), black, `handleR${tag}`, shadows, [side * 1.03, 1.18, -0.55]);
  }

  // rear
  addMesh(root, new RoundedBoxGeometry(1.95, 0.36, 0.32, 3, 0.05), black, 'rearBumper', shadows, [0, 0.55, -2.32]);
  for (const side of [-1, 1] as const) {
    addMesh(
      root,
      new RoundedBoxGeometry(0.12, 0.36, 0.18, 2, 0.03),
      new THREE.MeshPhysicalMaterial({
        color: 0x8a1010,
        emissive: new THREE.Color(0x4a0808),
        emissiveIntensity: 0.45,
        roughness: 0.25,
      }),
      `tail${side < 0 ? 'L' : 'R'}`,
      shadows,
      [side * 0.9, 1.22, -2.2],
    );
  }

  const wheels = [
    buildWheel(root, 'wheelFL', -WHEEL_X, AXLE_F, paint, black, shadows),
    buildWheel(root, 'wheelFR', WHEEL_X, AXLE_F, paint, black, shadows),
    buildWheel(root, 'wheelRL', -WHEEL_X, AXLE_R, paint, black, shadows),
    buildWheel(root, 'wheelRR', WHEEL_X, AXLE_R, paint, black, shadows),
  ];

  addMesh(root, new THREE.BoxGeometry(1.65, 0.12, 3.4), blackSoft, 'undertray', shadows, [0, 0.36, 0.05]);

  root.userData.tick = (_dt: number, elapsed: number) => {
    for (const w of wheels) w.rotation.x = -elapsed * 0.32;
    root.rotation.y = Math.sin(elapsed * 0.11) * 0.14;
  };

  root.userData.sculptRuntime = {
    provenance: {
      route: 'hard-surface-object',
      exactnessTier: 'approximate-likeness',
      inferred: ['rear fascia detail', 'undercarriage'],
    },
  };

  root.scale.setScalar(scale);
  return root;
}

export function createToyotaSuvLookDevLights(scene: THREE.Scene): void {
  const key = new THREE.DirectionalLight(0xfff1df, 2.35);
  key.position.set(-4.2, 6.2, 4.8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 32;
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  key.shadow.bias = -0.00025;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xc8d6ff, 0.48);
  fill.position.set(5.2, 2.4, 2.2);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffe4b8, 0.7);
  rim.position.set(1, 3.6, -5.8);
  scene.add(rim);

  const hemi = new THREE.HemisphereLight(0xf0f4fa, 0x3a3228, 0.42);
  scene.add(hemi);
}
