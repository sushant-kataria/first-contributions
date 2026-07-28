import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface ViewerOptions {
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
  cameraFov?: number;
  background?: number;
  backgroundGradient?: { inner: string; outer: string };
  exposure?: number;
  installLights?: (scene: THREE.Scene) => void;
}

function makeGradientBackground(inner: string, outer: string): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(
    size * 0.5,
    size * 0.4,
    size * 0.04,
    size * 0.5,
    size * 0.55,
    size * 0.72,
  );
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Viewer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;

  private readonly mount: HTMLElement;
  private rafHandle = 0;
  private readonly onResize: () => void;

  constructor(mount: HTMLElement, options: ViewerOptions = {}) {
    this.mount = mount;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = options.exposure ?? 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    if (options.backgroundGradient) {
      this.scene.background = makeGradientBackground(
        options.backgroundGradient.inner,
        options.backgroundGradient.outer,
      );
    } else {
      this.scene.background = new THREE.Color(options.background ?? 0x1c1a16);
    }

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.85;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(options.cameraFov ?? 34, 1, 0.1, 100);
    const [px, py, pz] = options.cameraPosition ?? [4.2, 2.1, 5.2];
    this.camera.position.set(px, py, pz);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 24;
    const [tx, ty, tz] = options.cameraTarget ?? [0, 0.9, 0];
    this.controls.target.set(tx, ty, tz);
    this.controls.update();

    if (options.installLights) {
      options.installLights(this.scene);
    } else {
      installStudioLights(this.scene);
    }

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.22 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.onResize = () => this.handleResize();
    window.addEventListener('resize', this.onResize);
    this.handleResize();
  }

  private handleResize(): void {
    const width = this.mount.clientWidth || window.innerWidth;
    const height = this.mount.clientHeight || window.innerHeight;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  start(): void {
    const clock = new THREE.Clock();
    const tickers: Array<(dt: number, elapsed: number) => void> = [];
    this.scene.traverse((object) => {
      const tick = (object.userData as { tick?: unknown }).tick;
      if (typeof tick === 'function') {
        tickers.push(tick as (dt: number, elapsed: number) => void);
      }
    });

    const loop = (): void => {
      this.rafHandle = requestAnimationFrame(loop);
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      for (const tick of tickers) tick(dt, elapsed);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  dispose(): void {
    cancelAnimationFrame(this.rafHandle);
    window.removeEventListener('resize', this.onResize);
    this.controls.dispose();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (material) {
        const materials = Array.isArray(material) ? material : [material];
        for (const mat of materials) mat.dispose();
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.mount) {
      this.mount.removeChild(this.renderer.domElement);
    }
  }
}

function installStudioLights(scene: THREE.Scene): void {
  const key = new THREE.DirectionalLight(0xfff4e6, 2.4);
  key.position.set(-3.2, 5.2, 3.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 24;
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  key.shadow.bias = -0.0003;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xb8c8ff, 0.45);
  fill.position.set(4.2, 1.4, 2.2);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffe0b8, 0.55);
  rim.position.set(1.2, 2.8, -4.5);
  scene.add(rim);

  const hemi = new THREE.HemisphereLight(0xe8eef8, 0x3a3228, 0.4);
  scene.add(hemi);
}
