import { getDemo } from '../models/registry';
import { Viewer } from '../scene';
import { navigate } from '../router';

function factsFor(id: string): string[] {
  if (id === 'issaca-shotgun') {
    return [
      'Full procedural factory (receiver, barrel, optic, grip)',
      'Live fire VFX: flash, recoil, shell eject',
      'Action-ready pivots + sculptRuntime sockets',
    ];
  }
  if (id === 'toyota-suv') {
    return [
      'Hard-surface factory: body shell, fascia, wheels',
      'Matte Lunar Rock + hex grille + T-DRL lamps',
      'TRD hood badges, roof rack, red hub caps',
    ];
  }
  return ['Procedural Three.js model'];
}

export function renderDemo(mount: HTMLElement, id: string): () => void {
  const demo = getDemo(id);
  if (!demo || demo.status !== 'live' || !demo.build) {
    navigate('#/');
    return () => {};
  }

  const facts = factsFor(id)
    .map((f) => `<li>${f}</li>`)
    .join('');

  const refBlock = demo.referenceImage
    ? `<figure class="ref">
          <img src="${demo.referenceImage}" alt="${demo.title} reference" />
          <figcaption>studio reference</figcaption>
        </figure>`
    : '';

  mount.innerHTML = `
    <div class="demo-page" style="--accent:${demo.accent}">
      <div class="demo-canvas" id="demo-canvas"></div>
      <aside class="demo-panel">
        <a class="back" href="#/">&larr; Showroom</a>
        <p class="kicker">${demo.category} · procedural</p>
        <h1>${demo.title}</h1>
        <p class="blurb">${demo.blurb}</p>
        ${refBlock}
        <ul class="facts">${facts}</ul>
        <p class="hint">Drag to orbit · scroll to zoom</p>
      </aside>
    </div>
  `;

  const canvas = mount.querySelector<HTMLDivElement>('#demo-canvas')!;
  const viewer = new Viewer(canvas, {
    cameraPosition: demo.cameraPosition,
    cameraTarget: demo.cameraTarget,
    cameraFov: demo.cameraFov,
    backgroundGradient: demo.backgroundGradient,
    exposure: demo.exposure,
    installLights: demo.installLights,
    minDistance: demo.category === 'gun' ? 1.1 : 3.2,
    maxDistance: demo.category === 'gun' ? 12 : 28,
  });

  demo.build(viewer.scene);
  viewer.start();

  return () => {
    viewer.dispose();
    mount.innerHTML = '';
  };
}
