import './styles.css';
import { currentRoute, onRouteChange } from './router';
import { renderHome } from './pages/home';
import { renderDemo } from './pages/demo';

const app = document.getElementById('app')!;

let cleanup: (() => void) | null = null;

function render(): void {
  cleanup?.();
  cleanup = null;

  const route = currentRoute();
  if (route.name === 'demo') {
    cleanup = renderDemo(app, route.id);
  } else {
    cleanup = renderHome(app);
  }
}

onRouteChange(render);
render();
