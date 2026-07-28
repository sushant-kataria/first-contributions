import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Lunar-rock / Trailhunter-style Toyota SUV rebuilt as a procedural Three.js Group
 * from a three-quarter studio reference (tan body, black cladding, honeycomb grille).
 *
 * Approximate proportions only — rear / passenger side inferred from bilateral symmetry.
 * Exact badge lettering and fine panel gaps are stylized, not CAD-accurate.
 */

export interface ToyotaSuvOptions {
  scale?: number;
  shadows?: boolean;
}

const PAINT = 0xb8a078; // lunar rock / desert sand
const PAINT_DARK = 0x9a8764;
const BLACK = 0x161616;
const GRILLE = 0x0e0e0e;
const STEEL = 0xb8bec8;
const GLASS = 0x1a2228;
const RUBBER = 0x0c0c0c;
const RED = 0xc41818;
const LED = 0xf4f7ff;

function paintMat(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: PAINT,
    metalness: 0.35,
    roughness: 0.38,
    clearcoat: 0.85,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.1,
  });
}

function blackTrimMat(rough = 0.62): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: BLACK,
    metalness: 0.15,
    roughness: rough,
    envMapIntensity: 0.7,
  });
}

function steelMat(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: STEEL,
    metalness: 0.92,
    roughness: 0.32,
    envMapIntensity: 1.2,
  });
}

function glassMat(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: GLASS,
    metalness: 0.05,
    roughness: 0.08,
    transmission: 0.55,
    thickness: 0.08,
    transparent: true,
    opacity: 0.92,
    envMapIntensity: 1.4,
  });
}

function mesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  name: string,
  shadows = true,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.castShadow = shadows;
  m.receiveShadow = shadows;
  return m;
}

function makeGrilleTexture(): THREE.CanvasTexture {
  const W = 512;
  const H = 256;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  // honeycomb cells
  const cellW = 18;
  const cellH = 14;
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 1.4;
  for (let row = 0; row < 22; row++) {
    const y = 8 + row * cellH;
    const offset = row % 2 === 0 ? 0 : cellW * 0.5;
    for (let col = -1; col < 32; col++) {
      const x = offset + col * cellW;
      ctx.beginPath();
      ctx.moveTo(x + cellW * 0.5, y);
      ctx.lineTo(x + cellW, y + cellH * 0.5);
      ctx.lineTo(x + cellW * 0.5, y + cellH);
      ctx.lineTo(x, y + cellH * 0.5);
      ctx.closePath();
      ctx.stroke();
    }
  }

  // TOYOTA lettering bar
  ctx.fillStyle = '#050505';
  ctx.fillRect(70, 96, 372, 58);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 42px "Arial Black", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '10px';
  ctx.fillText('TOYOTA', W / 2, 126);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeHeadlightTexture(): THREE.CanvasTexture {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#0d1116';
  ctx.fillRect(0, 0, S, S);

  // C / L shaped LED signature
  ctx.strokeStyle = '#f5f8ff';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(40, 48);
  ctx.lineTo(40, 200);
  ctx.lineTo(170, 200);
  ctx.stroke();

  ctx.fillStyle = '#dfe6f2';
  ctx.beginPath();
  ctx.ellipse(150, 90, 46, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9aa8bc';
  ctx.beginPath();
  ctx.ellipse(150, 90, 22, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeTreadNormal(): THREE.CanvasTexture {
  const W = 256;
  const H = 128;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#a0a0ff';
  for (let i = 0; i < 16; i++) {
    const x = (i / 16) * W;
    ctx.fillRect(x + 2, 8, 8, 48);
    ctx.fillRect(x + 8, 72, 8, 48);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function addWheel(
  parent: THREE.Group,
  x: number,
  z: number,
  paint: THREE.Material,
  black: THREE.Material,
  shadows: boolean,
): THREE.Group {
  const wheel = new THREE.Group();
  wheel.name = x < 0 ? (z > 0 ? 'wheelFL' : 'wheelRL') : z > 0 ? 'wheelFR' : 'wheelRR';
  wheel.position.set(x, 0.48, z);

  const tire = mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 0.32, 48),
    new THREE.MeshPhysicalMaterial({
      color: RUBBER,
      metalness: 0.05,
      roughness: 0.92,
      normalMap: makeTreadNormal(),
      normalScale: new THREE.Vector2(0.6, 0.6),
    }),
    `${wheel.name}-tire`,
    shadows,
  );
  tire.rotation.z = Math.PI / 2;
  wheel.add(tire);

  const rim = mesh(
    new THREE.CylinderGeometry(0.3, 0.32, 0.2, 32),
    black,
    `${wheel.name}-rim`,
    shadows,
  );
  rim.rotation.z = Math.PI / 2;
  wheel.add(rim);

  // multi-spoke look via thin boxes
  for (let i = 0; i < 8; i++) {
    const spoke = mesh(
      new THREE.BoxGeometry(0.05, 0.04, 0.28),
      black,
      `${wheel.name}-spoke-${i}`,
      shadows,
    );
    spoke.rotation.z = Math.PI / 2;
    spoke.rotation.x = (i / 8) * Math.PI * 2;
    spoke.position.x = x < 0 ? -0.08 : 0.08;
    wheel.add(spoke);
  }

  const hub = mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.22, 24),
    paint,
    `${wheel.name}-hub`,
    shadows,
  );
  hub.rotation.z = Math.PI / 2;
  hub.position.x = x < 0 ? -0.1 : 0.1;
  wheel.add(hub);

  const redCap = mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.04, 16),
    new THREE.MeshPhysicalMaterial({ color: RED, metalness: 0.4, roughness: 0.35 }),
    `${wheel.name}-cap`,
    shadows,
  );
  redCap.rotation.z = Math.PI / 2;
  redCap.position.x = x < 0 ? -0.12 : 0.12;
  wheel.add(redCap);

  parent.add(wheel);
  return wheel;
}

export function createToyotaSuvModel(options: ToyotaSuvOptions = {}): THREE.Group {
  const scale = options.scale ?? 1;
  const shadows = options.shadows ?? true;

  const root = new THREE.Group();
  root.name = 'toyotaSuv';

  const paint = paintMat();
  const paintDark = new THREE.MeshPhysicalMaterial({
    color: PAINT_DARK,
    metalness: 0.35,
    roughness: 0.42,
    clearcoat: 0.7,
    clearcoatRoughness: 0.22,
  });
  const black = blackTrimMat();
  const blackSoft = blackTrimMat(0.72);
  const steel = steelMat();
  const glass = glassMat();
  const grilleMat = new THREE.MeshPhysicalMaterial({
    color: GRILLE,
    metalness: 0.55,
    roughness: 0.45,
    map: makeGrilleTexture(),
    envMapIntensity: 0.8,
  });
  const lightMat = new THREE.MeshPhysicalMaterial({
    color: LED,
    metalness: 0.2,
    roughness: 0.15,
    map: makeHeadlightTexture(),
    emissive: new THREE.Color(0x8899aa),
    emissiveIntensity: 0.25,
  });

  // ---- body shell ----
  const body = mesh(
    new RoundedBoxGeometry(2.05, 0.95, 4.55, 4, 0.08),
    paint,
    'bodyShell',
    shadows,
  );
  body.position.set(0, 1.05, 0.05);
  root.add(body);

  // hood with slight scoop
  const hood = mesh(
    new RoundedBoxGeometry(1.85, 0.12, 1.35, 3, 0.04),
    paint,
    'hood',
    shadows,
  );
  hood.position.set(0, 1.52, 1.45);
  hood.rotation.x = -0.04;
  root.add(hood);

  const scoop = mesh(
    new RoundedBoxGeometry(0.55, 0.06, 0.45, 2, 0.02),
    blackSoft,
    'hoodScoop',
    shadows,
  );
  scoop.position.set(0, 1.6, 1.55);
  root.add(scoop);

  // cabin / greenhouse
  const cabin = mesh(
    new RoundedBoxGeometry(1.88, 0.78, 2.35, 3, 0.06),
    paintDark,
    'cabin',
    shadows,
  );
  cabin.position.set(0, 1.72, -0.35);
  root.add(cabin);

  // windshield
  const windshield = mesh(new THREE.PlaneGeometry(1.7, 0.72), glass, 'windshield', false);
  windshield.position.set(0, 1.78, 0.82);
  windshield.rotation.x = -0.42;
  root.add(windshield);

  // side glass L/R
  for (const side of [-1, 1] as const) {
    const sideGlass = mesh(
      new THREE.PlaneGeometry(2.0, 0.55),
      glass,
      side < 0 ? 'glassL' : 'glassR',
      false,
    );
    sideGlass.position.set(side * 0.96, 1.78, -0.25);
    sideGlass.rotation.y = (side * Math.PI) / 2;
    root.add(sideGlass);
  }

  // rear glass
  const rearGlass = mesh(new THREE.PlaneGeometry(1.65, 0.6), glass, 'rearGlass', false);
  rearGlass.position.set(0, 1.78, -1.52);
  rearGlass.rotation.x = 0.28;
  rearGlass.rotation.y = Math.PI;
  root.add(rearGlass);

  // ---- front fascia ----
  const grille = mesh(new THREE.PlaneGeometry(1.55, 0.62), grilleMat, 'grille', false);
  grille.position.set(0, 1.05, 2.36);
  root.add(grille);

  const bumper = mesh(
    new RoundedBoxGeometry(2.0, 0.38, 0.42, 3, 0.05),
    black,
    'frontBumper',
    shadows,
  );
  bumper.position.set(0, 0.62, 2.18);
  root.add(bumper);

  const skid = mesh(
    new RoundedBoxGeometry(1.15, 0.06, 0.35, 2, 0.02),
    steel,
    'skidPlate',
    shadows,
  );
  skid.position.set(0, 0.42, 2.28);
  root.add(skid);

  // headlights
  for (const side of [-1, 1] as const) {
    const lamp = mesh(
      new RoundedBoxGeometry(0.38, 0.28, 0.12, 2, 0.04),
      lightMat,
      side < 0 ? 'headlightL' : 'headlightR',
      shadows,
    );
    lamp.position.set(side * 0.78, 1.12, 2.28);
    if (side > 0) lamp.scale.x = -1;
    root.add(lamp);
  }

  // ---- cladding / flares ----
  for (const side of [-1, 1] as const) {
    const rocker = mesh(
      new RoundedBoxGeometry(0.12, 0.22, 3.6, 2, 0.03),
      black,
      side < 0 ? 'rockerL' : 'rockerR',
      shadows,
    );
    rocker.position.set(side * 1.08, 0.62, 0.05);
    root.add(rocker);

    for (const z of [1.35, -1.25] as const) {
      const flare = mesh(
        new THREE.TorusGeometry(0.58, 0.08, 12, 28, Math.PI * 1.35),
        blackSoft,
        `flare-${side}-${z}`,
        shadows,
      );
      flare.rotation.y = Math.PI / 2;
      flare.rotation.z = side < 0 ? 0.2 : -0.2;
      flare.position.set(side * 1.05, 0.48, z);
      root.add(flare);
    }

    const mirror = mesh(
      new RoundedBoxGeometry(0.18, 0.12, 0.28, 2, 0.03),
      black,
      side < 0 ? 'mirrorL' : 'mirrorR',
      shadows,
    );
    mirror.position.set(side * 1.12, 1.55, 0.75);
    root.add(mirror);
  }

  // roof rails
  for (const side of [-1, 1] as const) {
    const rail = mesh(
      new RoundedBoxGeometry(0.06, 0.05, 2.2, 2, 0.02),
      black,
      side < 0 ? 'roofRailL' : 'roofRailR',
      shadows,
    );
    rail.position.set(side * 0.72, 2.2, -0.35);
    root.add(rail);
  }

  // door handles
  for (const side of [-1, 1] as const) {
    for (const z of [0.35, -0.55] as const) {
      const handle = mesh(
        new RoundedBoxGeometry(0.04, 0.05, 0.16, 1, 0.01),
        black,
        `handle-${side}-${z}`,
        shadows,
      );
      handle.position.set(side * 1.05, 1.15, z);
      root.add(handle);
    }
  }

  // rear bumper
  const rearBumper = mesh(
    new RoundedBoxGeometry(1.95, 0.32, 0.35, 3, 0.05),
    black,
    'rearBumper',
    shadows,
  );
  rearBumper.position.set(0, 0.58, -2.2);
  root.add(rearBumper);

  // wheels
  const wheels: THREE.Group[] = [];
  wheels.push(addWheel(root, -1.0, 1.35, paint, black, shadows));
  wheels.push(addWheel(root, 1.0, 1.35, paint, black, shadows));
  wheels.push(addWheel(root, -1.0, -1.25, paint, black, shadows));
  wheels.push(addWheel(root, 1.0, -1.25, paint, black, shadows));

  // subtle idle: slow wheel rotation + soft float
  const baseY = root.position.y;
  root.userData.tick = (_dt: number, elapsed: number) => {
    const spin = elapsed * 0.55;
    for (const w of wheels) {
      w.rotation.x = -spin;
    }
    root.position.y = baseY + Math.sin(elapsed * 0.9) * 0.012;
  };

  root.userData.sculptRuntime = {
    provenance: {
      route: 'hard-surface-object',
      exactnessTier: 'approximate-likeness',
      inferred: ['rear fascia detail', 'passenger-side panel gaps', 'undercarriage'],
    },
    destructionGroups: {
      body: ['bodyShell', 'hood', 'cabin', 'hoodScoop'],
      front: ['grille', 'frontBumper', 'skidPlate', 'headlightL', 'headlightR'],
      glass: ['windshield', 'glassL', 'glassR', 'rearGlass'],
      wheels: ['wheelFL', 'wheelFR', 'wheelRL', 'wheelRR'],
    },
  };

  root.scale.setScalar(scale);
  return root;
}

export function createToyotaSuvLookDevLights(scene: THREE.Scene): void {
  const key = new THREE.DirectionalLight(0xfff2e0, 2.6);
  key.position.set(-3.5, 5.5, 4.0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 28;
  key.shadow.camera.left = -10;
  key.shadow.camera.right = 10;
  key.shadow.camera.top = 10;
  key.shadow.camera.bottom = -10;
  key.shadow.bias = -0.0003;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xc8d4ff, 0.5);
  fill.position.set(4.5, 2.0, 1.5);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffe8c8, 0.7);
  rim.position.set(0.5, 3.2, -5.0);
  scene.add(rim);

  const hemi = new THREE.HemisphereLight(0xf0f4fa, 0x3d342c, 0.45);
  scene.add(hemi);
}
