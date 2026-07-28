import { demos } from '../models/registry';

export function renderHome(mount: HTMLElement): () => void {
  const live = demos.filter((d) => d.status === 'live');
  const soon = demos.filter((d) => d.status === 'coming-soon');

  mount.innerHTML = `
    <div class="home">
      <div class="home-atmosphere" aria-hidden="true"></div>
      <header class="home-hero">
        <p class="brand">Procedural Showroom</p>
        <h1>Cars &amp; guns,<br />built in code.</h1>
        <p class="lede">
          Orbit Three.js models rebuilt from studio references — no downloaded meshes,
          just procedural geometry ready for the browser.
        </p>
        <div class="hero-cta">
          ${
            live[0]
              ? `<a class="cta primary" href="#/demo/${live[0].id}">View the shotgun</a>`
              : ''
          }
          <a class="cta ghost" href="#catalog">Browse catalog</a>
        </div>
      </header>

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
              const inner = `
                <span class="card-thumb" style="--accent:${demo.accent}">${demo.thumbLabel}</span>
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

  return () => {
    mount.innerHTML = '';
  };
}
