import { getDemo } from '../models/registry';
import { Viewer } from '../scene';
import { navigate } from '../router';

export function renderDemo(mount: HTMLElement, id: string): () => void {
  const demo = getDemo(id);
  if (!demo || demo.status !== 'live' || !demo.build) {
    navigate('#/');
    return () => {};
  }

  mount.innerHTML = `
    <div class="demo-page" style="--accent:${demo.accent}">
      <div class="demo-canvas" id="demo-canvas"></div>
      <aside class="demo-panel">
        <a class="back" href="#/">&larr; Showroom</a>
        <p class="kicker">${demo.category} · procedural</p>
        <h1>${demo.title}</h1>
        <p class="blurb">${demo.blurb}</p>
        <ul class="facts">
          <li>Code-only Three.js factory</li>
          <li>Studio three-quarter reference</li>
          <li>Rear / far side inferred</li>
        </ul>
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
  });

  demo.build(viewer.scene);
  viewer.start();

  return () => {
    viewer.dispose();
    mount.innerHTML = '';
  };
}
