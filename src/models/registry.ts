import * as THREE from 'three';
import {
  createToyotaSuvModel,
  createToyotaSuvLookDevLights,
} from './toyota-suv/createToyotaSuvModel';
import {
  createIssacaShotgunModel,
  createIssacaShotgunLookDevLights,
} from './issaca-shotgun/createIssacaShotgunModel';

export interface DemoEntry {
  id: string;
  title: string;
  category: 'car' | 'gun';
  blurb: string;
  status: 'live' | 'coming-soon';
  accent: string;
  referenceImage?: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  cameraFov: number;
  backgroundGradient: { inner: string; outer: string };
  exposure?: number;
  installLights?: (scene: THREE.Scene) => void;
  build?: (scene: THREE.Scene) => THREE.Group;
  thumbLabel: string;
}

const BASE = import.meta.env.BASE_URL;

export const demos: DemoEntry[] = [
  {
    id: 'issaca-shotgun',
    title: 'ISSACA 12 Gauge',
    category: 'gun',
    blurb:
      'Bullpup pistol-shotgun rebuilt in code: slate receiver, amber bakelite handguard, ' +
      'satin barrel, reflex red-dot — with live muzzle flash, recoil, and shell ejection.',
    status: 'live',
    accent: '#d98a2c',
    referenceImage: `${BASE}references/issaca-shotgun.png`,
    cameraPosition: [1.9, 1.35, 3.5],
    cameraTarget: [-0.1, 0.55, 0],
    cameraFov: 32,
    backgroundGradient: { inner: '#2b2f36', outer: '#0c0d10' },
    exposure: 1.0,
    installLights: createIssacaShotgunLookDevLights,
    build: (scene) => {
      const model = createIssacaShotgunModel({ shadows: true, scale: 1 });
      scene.add(model);
      return model;
    },
    thumbLabel: 'Shotgun',
  },
  {
    id: 'toyota-suv',
    title: 'Toyota Sequoia TRD',
    category: 'car',
    blurb:
      'Hard-surface procedural Sequoia: matte Lunar Rock paint, hex grille with TOYOTA letters, ' +
      'T-DRL lamps, hood bulge, TRD wheels — orbit the full volume (not a photo card).',
    status: 'live',
    accent: '#c4a574',
    referenceImage: `${BASE}references/sequoia-studio.png`,
    cameraPosition: [3.9, 1.55, 4.6],
    cameraTarget: [0, 0.95, 0.2],
    cameraFov: 34,
    backgroundGradient: { inner: '#cfcbc4', outer: '#1c1a17' },
    exposure: 1.05,
    installLights: createToyotaSuvLookDevLights,
    build: (scene) => {
      const model = createToyotaSuvModel({ scale: 1, shadows: true });
      scene.add(model);
      return model;
    },
    thumbLabel: 'SUV',
  },
  {
    id: 'sports-coupe',
    title: 'Sports Coupe',
    category: 'car',
    blurb: 'Next up — drop a studio reference and we will rebuild it as procedural Three.js.',
    status: 'coming-soon',
    accent: '#8a9bb0',
    cameraPosition: [4, 2, 5],
    cameraTarget: [0, 0.8, 0],
    cameraFov: 34,
    backgroundGradient: { inner: '#2a3038', outer: '#101214' },
    thumbLabel: 'Coupe',
  },
  {
    id: 'sidearm',
    title: 'Sidearm Pistol',
    category: 'gun',
    blurb: 'Coming soon — same procedural pipeline as the ISSACA shotgun.',
    status: 'coming-soon',
    accent: '#9a8f7a',
    cameraPosition: [1.5, 1, 2],
    cameraTarget: [0, 0.2, 0],
    cameraFov: 34,
    backgroundGradient: { inner: '#2c2a26', outer: '#100f0d' },
    thumbLabel: 'Pistol',
  },
];

export function getDemo(id: string): DemoEntry | undefined {
  return demos.find((d) => d.id === id);
}
