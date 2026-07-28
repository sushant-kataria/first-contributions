import * as THREE from 'three';

/**
 * Trailhunter / Sequoia-style Toyota SUV — high-detail procedural rebuild.
 *
 * Side silhouette is an extruded profile with real wheel-arch cutouts so the
 * body never reads as a floating box. Front fascia is a 3D assembly (grille depth,
 * headlights, bumper, skid), not a textured plane.
 *
 * Coordinate frame: +Z forward, +Y up, +X right.
 */

export interface ToyotaSuvOptions {
  scale?: number;
  shadows?: boolean;
}

const PAINT = 0xc2aa82;
const PAINT_SHADOW = 0xa8926c;
const TRIM = 0x111111;
const TRIM_SOFT = 0x1c1c1c;
const STEEL = 0xc5cbd4;
const GLASS = 0x141c22;
const RUBBER = 0x0a0a0a;
const RED = 0xb81414;
const LED_EMIT = 0xdde6f5;

function matPaint(color = PAINT): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.28,
    roughness: 0.34,
    clearcoat: 0.95,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.15,
  });
}

function matTrim(rough = 0.58, color = TRIM): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.18,
    roughness: rough,
    envMapIntensity: 0.65,
  });
}

function matSteel(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: STEEL,
    metalness: 0.95,
    roughness: 0.28,
    envMapIntensity: 1.25,
  });
}

function matGlass(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: GLASS,
    metalness: 0.0,
    roughness: 0.05,
    transmission: 0.72,
    thickness: 0.05,
    ior: 1.45,
    transparent: true,
    opacity: 1,
    envMapIntensity: 1.6,
    side: THREE.DoubleSide,
  });
}

function matRubber(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: RUBBER,
    metalness: 0.02,
    roughness: 0.94,
  });
}

function add(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  shadows: boolean,
  pose?: {
    pos?: [number, number, number];
    rot?: [number, number, number];
    scale?: [number, number, number];
  },
): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.name = name;
  m.castShadow = shadows;
  m.receiveShadow = shadows;
  if (pose?.pos) m.position.set(...pose.pos);
  if (pose?.rot) m.rotation.set(...pose.rot);
  if (pose?.scale) m.scale.set(...pose.scale);
  parent.add(m);
  return m;
}

/** Side profile with wheel-arch scallops. Shape XY → extruded to width, then aligned to +Z forward. */
function createBodyExtrusion(mat: THREE.Material, shadows: boolean): THREE.Mesh {
  const s = new THREE.Shape();
  const rear = -2.35;
  const front = 2.45;
  const rocker = 0.42;
  const belt = 1.28;
  const roof = 2.08;
  const hoodY = 1.48;
  const fAxle = 1.28;
  const rAxle = -1.18;
  const archR = 0.58;

  s.moveTo(rear, rocker);
  s.lineTo(rear, belt);
  s.lineTo(rear + 0.12, roof - 0.05);
  s.lineTo(rear + 0.55, roof);
  s.lineTo(0.95, roof);
  s.lineTo(1.55, hoodY);
  s.lineTo(front - 0.35, hoodY);
  s.lineTo(front - 0.08, hoodY - 0.08);
  s.lineTo(front, 1.05);
  s.lineTo(front, rocker + 0.18);
  s.lineTo(front - 0.15, rocker);
  s.lineTo(fAxle + archR, rocker);

  for (let i = 0; i <= 20; i++) {
    const a = Math.PI - (i / 20) * Math.PI;
    s.lineTo(fAxle + Math.cos(a) * archR, rocker + Math.max(0, Math.sin(a) * archR));
  }

  s.lineTo(rAxle + archR, rocker);

  for (let i = 0; i <= 20; i++) {
    const a = Math.PI - (i / 20) * Math.PI;
    s.lineTo(rAxle + Math.cos(a) * archR, rocker + Math.max(0, Math.sin(a) * archR));
  }

  s.lineTo(rear, rocker);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 1.92,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.045,
    bevelSegments: 4,
    curveSegments: 28,
  });
  // Shape X (length) → world Z, extrude Z (width) → world -X, then center on X.
  geo.rotateY(Math.PI / 2);
  geo.translate(0.96, 0, 0);

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
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, W, H);

  const cellW = 28;
  const cellH = 22;
  for (let row = 0; row < 26; row++) {
    const y = 10 + row * cellH;
    const off = row % 2 ? cellW * 0.5 : 0;
    for (let col = -1; col < 40; col++) {
      const x = off + col * cellW;
      ctx.beginPath();
      ctx.moveTo(x + cellW * 0.5, y);
      ctx.lineTo(x + cellW * 0.95, y + cellH * 0.5);
      ctx.lineTo(x + cellW * 0.5, y + cellH);
      ctx.lineTo(x + cellW * 0.05, y + cellH * 0.5);
      ctx.closePath();
      ctx.fillStyle = row % 3 === 0 ? '#141414' : '#101010';
      ctx.fill();
      ctx.strokeStyle = '#2e2e2e';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  ctx.fillStyle = '#050505';
  ctx.fillRect(120, 190, 784, 120);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 4;
  ctx.strokeRect(120, 190, 784, 120);
  ctx.fillStyle = '#efefef';
  ctx.font = 'bold 88px Arial Black, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TOYOTA', W / 2, 252);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeHeadlightMap(side: 'L' | 'R'): THREE.CanvasTexture {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#0b1016';
  ctx.fillRect(0, 0, S, S);

  if (side === 'R') {
    ctx.translate(S, 0);
    ctx.scale(-1, 1);
  }

  const g = ctx.createRadialGradient(300, 180, 10, 300, 180, 120);
  g.addColorStop(0, '#f4f7ff');
  g.addColorStop(0.35, '#c5d0e0');
  g.addColorStop(1, '#2a3340');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(300, 180, 110, 90, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#f8fbff';
  ctx.shadowColor = '#aaccff';
  ctx.shadowBlur = 18;
  ctx.lineWidth = 22;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(90, 70);
  ctx.lineTo(90, 400);
  ctx.lineTo(360, 400);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeTireTread(): THREE.CanvasTexture {
  const W = 512;
  const H = 256;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#151515';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2a2a2a';
  for (let i = 0; i < 24; i++) {
    const x = (i / 24) * W;
    ctx.fillRect(x + 2, 10, 10, 90);
    ctx.fillRect(x + 10, 140, 10, 90);
  }
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 118, W, 20);
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
  paint: THREE.Material,
  trim: THREE.Material,
  shadows: boolean,
): THREE.Group {
  const wheel = new THREE.Group();
  wheel.name = name;
  wheel.position.set(x, 0.52, z);

  const tireMat = matRubber();
  tireMat.map = makeTireTread();

  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.36, 48), tireMat);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = shadows;
  tire.receiveShadow = shadows;
  tire.name = `${name}-tire`;
  wheel.add(tire);

  for (const sx of [-0.18, 0.18]) {
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.04, 10, 40), matRubber());
    lip.rotation.y = Math.PI / 2;
    lip.position.x = sx;
    lip.castShadow = shadows;
    wheel.add(lip);
  }

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.22, 32), trim);
  rim.rotation.z = Math.PI / 2;
  rim.castShadow = shadows;
  rim.name = `${name}-rim`;
  wheel.add(rim);

  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 0.3), trim);
    spoke.rotation.z = Math.PI / 2;
    spoke.rotation.x = ang;
    spoke.position.x = x < 0 ? -0.06 : 0.06;
    spoke.castShadow = shadows;
    wheel.add(spoke);
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.2, 24), paint);
  hub.rotation.z = Math.PI / 2;
  hub.position.x = x < 0 ? -0.09 : 0.09;
  hub.castShadow = shadows;
  wheel.add(hub);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.05, 20),
    new THREE.MeshPhysicalMaterial({ color: RED, metalness: 0.45, roughness: 0.32 }),
  );
  cap.rotation.z = Math.PI / 2;
  cap.position.x = x < 0 ? -0.12 : 0.12;
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
  const paintDark = matPaint(PAINT_SHADOW);
  const trim = matTrim();
  const trimSoft = matTrim(0.7, TRIM_SOFT);
  const steel = matSteel();
  const glass = matGlass();

  root.add(createBodyExtrusion(paint, shadows));

  add(root, new THREE.BoxGeometry(1.98, 0.08, 3.6), trimSoft, 'beltCladding', shadows, {
    pos: [0, 1.22, 0.05],
  });
  add(root, new THREE.BoxGeometry(1.55, 0.06, 2.15), paintDark, 'roofPanel', shadows, {
    pos: [0, 2.1, -0.15],
  });

  add(root, new THREE.PlaneGeometry(1.55, 0.78), glass, 'windshield', false, {
    pos: [0, 1.78, 1.12],
    rot: [-0.48, 0, 0],
  });
  add(root, new THREE.PlaneGeometry(1.5, 0.7), glass, 'rearGlass', false, {
    pos: [0, 1.78, -1.95],
    rot: [0.35, Math.PI, 0],
  });

  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    add(root, new THREE.PlaneGeometry(1.05, 0.52), glass, `glassFront${tag}`, false, {
      pos: [side * 0.98, 1.72, 0.15],
      rot: [0, (side * Math.PI) / 2, 0],
    });
    add(root, new THREE.PlaneGeometry(0.95, 0.52), glass, `glassRear${tag}`, false, {
      pos: [side * 0.98, 1.72, -0.95],
      rot: [0, (side * Math.PI) / 2, 0],
    });
    add(root, new THREE.BoxGeometry(0.04, 0.6, 2.15), trim, `windowFrame${tag}`, shadows, {
      pos: [side * 0.96, 1.72, -0.35],
    });
    add(root, new THREE.BoxGeometry(0.1, 0.85, 0.14), trim, `aPillar${tag}`, shadows, {
      pos: [side * 0.9, 1.75, 0.85],
      rot: [-0.45, 0, side * 0.08],
    });
  }

  const front = new THREE.Group();
  front.name = 'frontFascia';
  front.position.set(0, 0, 2.28);
  root.add(front);

  add(front, new THREE.BoxGeometry(1.95, 0.42, 0.38), trim, 'frontBumper', shadows, {
    pos: [0, 0.62, 0.05],
  });
  add(front, new THREE.BoxGeometry(1.7, 0.16, 0.28), trimSoft, 'valence', shadows, {
    pos: [0, 0.38, 0.08],
  });
  add(front, new THREE.BoxGeometry(1.05, 0.07, 0.32), steel, 'skidPlate', shadows, {
    pos: [0, 0.34, 0.18],
  });
  add(front, new THREE.BoxGeometry(1.5, 0.58, 0.16), trim, 'grilleHousing', shadows, {
    pos: [0, 1.08, 0.02],
  });
  add(front, new THREE.BoxGeometry(1.38, 0.48, 0.08), matTrim(0.5, 0x0a0a0a), 'grilleDepth', shadows, {
    pos: [0, 1.08, 0.04],
  });

  const grilleMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0a,
    metalness: 0.55,
    roughness: 0.42,
    map: makeGrilleMap(),
    envMapIntensity: 0.85,
  });
  add(front, new THREE.PlaneGeometry(1.42, 0.52), grilleMat, 'grilleFace', false, {
    pos: [0, 1.08, 0.105],
  });

  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    const lampMat = new THREE.MeshPhysicalMaterial({
      color: 0xf2f5fa,
      metalness: 0.15,
      roughness: 0.18,
      map: makeHeadlightMap(tag),
      emissive: new THREE.Color(LED_EMIT),
      emissiveIntensity: 0.35,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    });
    add(front, new THREE.BoxGeometry(0.42, 0.3, 0.18), lampMat, `headlight${tag}`, shadows, {
      pos: [side * 0.78, 1.1, 0.12],
    });
    add(front, new THREE.CylinderGeometry(0.08, 0.09, 0.08, 20), trimSoft, `fog${tag}`, shadows, {
      pos: [side * 0.72, 0.55, 0.22],
      rot: [Math.PI / 2, 0, 0],
    });
  }

  add(root, new THREE.BoxGeometry(1.72, 0.08, 1.25), paint, 'hood', shadows, {
    pos: [0, 1.5, 1.55],
    rot: [-0.03, 0, 0],
  });
  add(root, new THREE.BoxGeometry(0.5, 0.07, 0.42), trimSoft, 'hoodScoop', shadows, {
    pos: [0, 1.58, 1.55],
  });

  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    for (const [z, label] of [
      [1.28, 'F'],
      [-1.18, 'R'],
    ] as const) {
      const flare = new THREE.Mesh(
        new THREE.TorusGeometry(0.6, 0.085, 12, 36, Math.PI * 1.15),
        trimSoft,
      );
      flare.name = `flare${label}${tag}`;
      flare.rotation.y = Math.PI / 2;
      flare.rotation.z = side < 0 ? 0.15 : -0.15;
      flare.position.set(side * 1.02, 0.52, z);
      flare.castShadow = shadows;
      root.add(flare);
    }

    add(root, new THREE.BoxGeometry(0.12, 0.1, 2.55), steel, `rocker${tag}`, shadows, {
      pos: [side * 1.05, 0.48, 0.05],
    });
    add(root, new THREE.BoxGeometry(0.14, 0.22, 3.5), trim, `cladding${tag}`, shadows, {
      pos: [side * 1.0, 0.7, 0.05],
    });

    const mirror = new THREE.Group();
    mirror.name = `mirror${tag}`;
    mirror.position.set(side * 1.08, 1.52, 0.82);
    add(mirror, new THREE.BoxGeometry(0.22, 0.14, 0.32), trim, 'mirrorBody', shadows);
    add(mirror, new THREE.PlaneGeometry(0.16, 0.1), matSteel(), 'mirrorGlass', false, {
      pos: [side * -0.12, 0, 0],
      rot: [0, (side * Math.PI) / 2, 0],
    });
    root.add(mirror);

    for (const z of [0.25, -0.55] as const) {
      add(root, new THREE.BoxGeometry(0.05, 0.06, 0.18), trim, `handle${tag}-${z}`, shadows, {
        pos: [side * 1.02, 1.18, z],
      });
    }

    add(root, new THREE.BoxGeometry(0.055, 0.05, 2.15), trim, `roofRail${tag}`, shadows, {
      pos: [side * 0.68, 2.18, -0.2],
    });
    for (const z of [0.55, -0.95] as const) {
      add(root, new THREE.BoxGeometry(0.06, 0.08, 0.08), trim, `railFoot-${tag}-${z}`, shadows, {
        pos: [side * 0.68, 2.13, z],
      });
    }
  }

  add(root, new THREE.BoxGeometry(1.9, 0.36, 0.32), trim, 'rearBumper', shadows, {
    pos: [0, 0.58, -2.28],
  });
  add(root, new THREE.BoxGeometry(1.7, 0.08, 0.12), trimSoft, 'tailgateLip', shadows, {
    pos: [0, 1.35, -2.32],
  });

  for (const side of [-1, 1] as const) {
    const tag = side < 0 ? 'L' : 'R';
    add(
      root,
      new THREE.BoxGeometry(0.12, 0.35, 0.18),
      new THREE.MeshPhysicalMaterial({
        color: 0x8a1010,
        emissive: new THREE.Color(0x550808),
        emissiveIntensity: 0.4,
        roughness: 0.25,
        metalness: 0.1,
      }),
      `taillight${tag}`,
      shadows,
      { pos: [side * 0.88, 1.2, -2.3] },
    );
  }

  const wheels = [
    buildWheel(root, 'wheelFL', -1.02, 1.28, paint, trim, shadows),
    buildWheel(root, 'wheelFR', 1.02, 1.28, paint, trim, shadows),
    buildWheel(root, 'wheelRL', -1.02, -1.18, paint, trim, shadows),
    buildWheel(root, 'wheelRR', 1.02, -1.18, paint, trim, shadows),
  ];

  add(root, new THREE.BoxGeometry(1.6, 0.12, 3.4), trimSoft, 'undertray', shadows, {
    pos: [0, 0.38, 0.05],
  });

  root.userData.tick = (_dt: number, elapsed: number) => {
    const spin = elapsed * 0.35;
    for (const w of wheels) w.rotation.x = -spin;
    root.rotation.y = Math.sin(elapsed * 0.12) * 0.12;
  };

  root.userData.sculptRuntime = {
    provenance: {
      route: 'hard-surface-object',
      exactnessTier: 'approximate-likeness',
      inferred: ['rear fascia detail', 'undercarriage', 'passenger-side gaps'],
    },
  };

  root.scale.setScalar(scale);
  return root;
}

export function createToyotaSuvLookDevLights(scene: THREE.Scene): void {
  const key = new THREE.DirectionalLight(0xfff2e0, 2.8);
  key.position.set(-4.0, 6.0, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  key.shadow.bias = -0.00025;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xc5d4ff, 0.55);
  fill.position.set(5.0, 2.2, 2.0);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffe6c0, 0.85);
  rim.position.set(0.8, 3.5, -5.5);
  scene.add(rim);

  const softL = new THREE.DirectionalLight(0xffffff, 0.35);
  softL.position.set(-6, 4, 1);
  scene.add(softL);
  const softR = new THREE.DirectionalLight(0xffffff, 0.35);
  softR.position.set(6, 4, 1);
  scene.add(softR);

  const hemi = new THREE.HemisphereLight(0xf2f5fa, 0x3a3228, 0.5);
  scene.add(hemi);
}
