import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vitePrerender from 'vite-plugin-prerender-k';
import path from 'path';

const Renderer = vitePrerender.PuppeteerRenderer;

export default defineConfig({
  plugins: [
    react(),
    vitePrerender({
      staticDir: path.join(__dirname, 'dist'),
      routes: ['/', '/faq', '/contact'],
      renderer: new Renderer({
        renderAfterDocumentEvent: 'app-rendered',
      }),
      postProcess(renderedRoute) {
        // react-helmet-async adds correct per-page tags with data-rh="true"
        // but the original static tags from index.html remain as duplicates.
        // Remove static duplicates when Helmet versions exist.
        if (renderedRoute.html.includes('data-rh="true"')) {
          // Remove static meta tags that Helmet has replaced
          const tagsToDedup = [
            'name="description"',
            'property="og:title"',
            'property="og:description"',
            'property="og:url"',
          ];
          for (const attr of tagsToDedup) {
            // Match the static tag (without data-rh) and remove it
            // Negative lookahead inside the tag ensures we only remove non-Helmet tags
            const staticRegex = new RegExp(
              `<meta ${attr}(?![^>]*data-rh)[^>]*>`,
              'i'
            );
            renderedRoute.html = renderedRoute.html.replace(staticRegex, '');
          }
        }
        return renderedRoute;
      },
    }),
  ],
  server: {
    port: 3000,
    open: true
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setupTests.js']
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
