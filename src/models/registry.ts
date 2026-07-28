import * as THREE from 'three';
import {
  createToyotaSuvModel,
  createToyotaSuvLookDevLights,
} from './toyota-suv/createToyotaSuvModel';

export interface DemoEntry {
  id: string;
  title: string;
  category: 'car' | 'gun';
  blurb: string;
  status: 'live' | 'coming-soon';
  accent: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  cameraFov: number;
  backgroundGradient: { inner: string; outer: string };
  exposure?: number;
  installLights?: (scene: THREE.Scene) => void;
  build?: (scene: THREE.Scene) => THREE.Group;
  thumbLabel: string;
}

export const demos: DemoEntry[] = [
  {
    id: 'toyota-suv',
    title: 'Toyota Trail SUV',
    category: 'car',
    blurb:
      'Lunar-rock off-road SUV rebuilt in code from a three-quarter studio reference — ' +
      'honeycomb grille, black cladding, roof rails, and all-terrain wheels.',
    status: 'live',
    accent: '#c4a574',
    cameraPosition: [5.2, 2.6, 5.8],
    cameraTarget: [0, 1.05, 0.15],
    cameraFov: 30,
    backgroundGradient: { inner: '#3a342c', outer: '#12100e' },
    exposure: 1.05,
    installLights: createToyotaSuvLookDevLights,
    build: (scene) => {
      const model = createToyotaSuvModel({ scale: 1 });
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
    blurb: 'Gun models land here next. Same pipeline: reference image → procedural factory.',
    status: 'coming-soon',
    accent: '#9a8f7a',
    cameraPosition: [1.5, 1, 2],
    cameraTarget: [0, 0.2, 0],
    cameraFov: 34,
    backgroundGradient: { inner: '#2c2a26', outer: '#100f0d' },
    thumbLabel: 'Pistol',
  },
  {
    id: 'assault-rifle',
    title: 'Assault Rifle',
    category: 'gun',
    blurb: 'Coming soon — send a clean side-profile studio shot to unlock this slot.',
    status: 'coming-soon',
    accent: '#7a8570',
    cameraPosition: [2, 1, 2.5],
    cameraTarget: [0, 0.25, 0],
    cameraFov: 34,
    backgroundGradient: { inner: '#262820', outer: '#0e100c' },
    thumbLabel: 'Rifle',
  },
];

export function getDemo(id: string): DemoEntry | undefined {
  return demos.find((d) => d.id === id);
}
