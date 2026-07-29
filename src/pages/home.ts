import { demos } from '../models/registry';
import { Viewer } from '../scene';
import {
  createIssacaShotgunModel,
  createIssacaShotgunLookDevLights,
} from '../models/issaca-shotgun/createIssacaShotgunModel';

export function renderHome(mount: HTMLElement): () => void {
  const soon = demos.filter((d) => d.status === 'coming-soon');
  const shotgun = demos.find((d) => d.id === 'issaca-shotgun');

  mount.innerHTML = `
    <div class="home">
      <section class="home-hero-stage">
        <div class="hero-canvas" id="hero-canvas" aria-hidden="true"></div>
        <div class="home-atmosphere" aria-hidden="true"></div>
        <header class="home-hero">
          <p class="brand">Procedural Showroom</p>
          <h1>ISSACA 12 Gauge — live in the browser.</h1>
          <p class="lede">
            Full procedural factory: slate receiver, amber bakelite, satin barrel,
            red-dot, muzzle flash, and shell eject. Drag to orbit.
          </p>
          <div class="hero-cta">
            ${
              shotgun
                ? `<a class="cta primary" href="#/demo/${shotgun.id}">Open shotgun demo</a>`
                : ''
            }
            <a class="cta ghost" href="#catalog">Browse catalog</a>
          </div>
        </header>
      </section>

      <section class="catalog" id="catalog">
        <div class="section-head">
          <h2>Catalog</h2>
          <p>Live reconstructions and upcoming slots.</p>
        </div>
        <div class="grid">
          ${demos
            .map((demo) => {
              const href = demo.status === 'live' ? `#/demo/${demo.id}` : undefined;
              const tag = demo.status === 'live' ? 'Live' : 'Soon';
              const thumb = demo.referenceImage
                ? `<span class="card-thumb has-img" style="--accent:${demo.accent}"><img src="${demo.referenceImage}" alt="" /></span>`
                : `<span class="card-thumb" style="--accent:${demo.accent}">${demo.thumbLabel}</span>`;
              const inner = `
                ${thumb}
                <span class="card-meta">
                  <span class="card-cat">${demo.category}</span>
                  <span class="card-status status-${demo.status}">${tag}</span>
                </span>
                <strong class="card-title">${demo.title}</strong>
                <span class="card-blurb">${demo.blurb}</span>
              `;
              return href
                ? `<a class="card live" href="${href}">${inner}</a>`
                : `<div class="card soon" aria-disabled="true">${inner}</div>`;
            })
            .join('')}
        </div>
        ${
          soon.length
            ? `<p class="footnote">Coming-soon slots unlock when you send the next reference images.</p>`
            : ''
        }
      </section>

      <footer class="home-foot">
        <span>Powered by procedural Three.js · Host on Vercel</span>
      </footer>
    </div>
  `;

  const canvas = mount.querySelector<HTMLDivElement>('#hero-canvas');
  let viewer: Viewer | null = null;
  if (canvas) {
    viewer = new Viewer(canvas, {
      cameraPosition: [1.65, 1.15, 3.1],
      cameraTarget: [-0.05, 0.55, 0],
      cameraFov: 34,
      backgroundGradient: { inner: '#2b2f36', outer: '#0c0d10' },
      exposure: 1.0,
      installLights: createIssacaShotgunLookDevLights,
      minDistance: 1.2,
      maxDistance: 10,
      autoRotate: true,
    });
    const model = createIssacaShotgunModel({ shadows: true, scale: 1 });
    viewer.scene.add(model);
    viewer.start();
  }

  return () => {
    viewer?.dispose();
    mount.innerHTML = '';
  };
}
