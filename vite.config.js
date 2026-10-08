import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression';
import { generateSeoHtml } from './seo-plugin.js';

const START_PAGE_PATHS = new Set(['/start', '/start/']);

function rewriteStartPage(req, _res, next) {
  const [pathname, query = ''] = req.url.split('?');

  if (START_PAGE_PATHS.has(pathname)) {
    req.url = `/start/index.html${query ? `?${query}` : ''}`;
  }

  next();
}

function serveStaticStartPage() {
  return {
    name: 'serve-static-start-page',
    configureServer(server) {
      server.middlewares.use(rewriteStartPage);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewriteStartPage);
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [serveStaticStartPage(), react(), generateSeoHtml(), viteCompression()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const module = id.replaceAll('\\', '/');
          if (!module.includes('/node_modules/')) return;
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(module)) return 'react-vendor';
          if (module.includes('/node_modules/gsap/')) return 'animation-vendor';
          if (module.includes('/node_modules/three/build/three.module.js')) return 'three-renderer';
          if (module.includes('/node_modules/three/')) return 'three-core';
        },
      },
    },
  },
})
