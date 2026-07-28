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
        <figure class="ref">
          <img src="${import.meta.env.BASE_URL}references/sequoia-studio.png" alt="Studio reference" />
          <figcaption>studio reference</figcaption>
        </figure>
        <ul class="facts">
          <li>Studio cut-out on photo relief (exact front likeness)</li>
          <li>Thin extruded silhouette for orbit depth</li>
          <li>Single photo — rear / far side not captured</li>
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
