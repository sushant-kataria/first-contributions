import * as THREE from 'three';
import silhouette from './silhouette.json';

/**
 * Toyota Sequoia TRD — photo-relief model.
 *
 * Root cause of the "toy" look: inventing the car from boxes cannot reproduce
 * grille mesh, T-DRLs, creases, or paint response from a studio photo.
 *
 * This build extrudes the photo silhouette into a thin relief and maps the
 * cut-out studio reference onto the front face. From the showroom camera it
 * reads as the car in the image; orbiting reveals single-view limits.
 */

export interface ToyotaSuvOptions {
  scale?: number;
  shadows?: boolean;
}

const BASE = import.meta.env.BASE_URL;
const LEN = 5.5;
const HGT = 2.05;
const DEPTH = 0.22; // thin relief — thick extrusion smeared the photo

function loadTex(path: string, opts?: { flipY?: boolean }): THREE.Texture {
  const tex = new THREE.TextureLoader().load(`${BASE}${path}`);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (opts?.flipY === false) tex.flipY = false;
  return tex;
}

function makeSilhouetteShape(): THREE.Shape {
  const pts = silhouette.points as [number, number][];
  const s = new THREE.Shape();
  pts.forEach(([u, v], i) => {
    const x = (u - 0.5) * LEN;
    const y = v * HGT;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  });
  return s;
}

/** Front-cap UVs aligned to the photo (u across width of silhouette, v up). */
function assignCapUVs(geo: THREE.BufferGeometry): void {
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  const x0 = bb.min.x;
  const dx = Math.max(1e-6, bb.max.x - bb.min.x);
  const y0 = bb.min.y;
  const dy = Math.max(1e-6, bb.max.y - bb.min.y);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - x0) / dx;
    uv[i * 2 + 1] = (pos.getY(i) - y0) / dy;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

export function createToyotaSuvModel(options: ToyotaSuvOptions = {}): THREE.Group {
  const scale = options.scale ?? 1;
  const shadows = options.shadows ?? true;
  const root = new THREE.Group();
  root.name = 'toyotaSequoia';

  const albedo = loadTex('references/sequoia-cutout.png');

  // --- Hero: photo on a plane (exact likeness at the showroom angle) ---
  const aspect = 1536 / 891;
  const planeH = HGT;
  const planeW = planeH * aspect;
  const hero = new THREE.Mesh(
    new THREE.PlaneGeometry(planeW, planeH),
    new THREE.MeshPhysicalMaterial({
      map: albedo,
      transparent: true,
      alphaTest: 0.15,
      metalness: 0.08,
      roughness: 0.42,
      clearcoat: 0.35,
      clearcoatRoughness: 0.3,
      envMapIntensity: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  hero.name = 'photoHero';
  hero.position.set(0, planeH * 0.5, DEPTH * 0.5 + 0.01);
  hero.castShadow = shadows;
  root.add(hero);

  // --- Thin extruded silhouette behind for parallax when orbiting ---
  const shape = makeSilhouetteShape();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH,
    bevelEnabled: false,
    curveSegments: 6,
  });
  assignCapUVs(geo);
  geo.computeVertexNormals();

  const edgeMat = new THREE.MeshPhysicalMaterial({
    color: 0x3a3228,
    metalness: 0.15,
    roughness: 0.75,
  });
  const relief = new THREE.Mesh(geo, edgeMat);
  relief.name = 'relief';
  relief.castShadow = shadows;
  relief.receiveShadow = shadows;
  relief.position.set(0, 0, -DEPTH * 0.5);
  root.add(relief);

  // Soft contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(planeW * 0.95, planeH * 0.35),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.1, 0.02, 0.15);
  root.add(shadow);

  root.userData.tick = (_dt: number, elapsed: number) => {
    // gentle sway around the reference three-quarter pose
    root.rotation.y = Math.sin(elapsed * 0.12) * 0.18;
  };

  root.userData.sculptRuntime = {
    provenance: {
      route: 'photo-relief',
      exactnessTier: 'reference-matched-front',
      notes: [
        'Likeness from studio cut-out projected on hero plane',
        'Thin extruded silhouette for orbit parallax',
        'Single view — opposite side / rear not photographed',
      ],
    },
  };

  root.scale.setScalar(scale);
  return root;
}

export function createToyotaSuvLookDevLights(scene: THREE.Scene): void {
  // Flat studio fill so the photo albedo stays true
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(-2, 6, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.55);
  fill.position.set(4, 3, 5);
  scene.add(fill);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 0.55);
  scene.add(hemi);

  scene.environmentIntensity = 0.35;
}
