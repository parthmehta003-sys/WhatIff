import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toAbs = (p) => path.resolve(__dirname, '..', p);

const routes = [
  '/',
  '/sip-calculator',
  '/emi-calculator',
  '/fd-calculator',
  '/staggered-fd-calculator',
  '/retirement-calculator',
  '/goal-planner',
  '/home-purchase',
  '/loan-affordability',
  '/buy-vs-rent',
  '/prepay-vs-invest',
  '/dashboard'
];

async function prerender() {
  console.log('Initializing Vite server for prerendering...');
  fs.writeFileSync(toAbs('prerender-log.txt'), 'Prerender started\n');
  
  // Enable ssr-un-lazy for the prerender server
  process.env.VITE_SSR = 'true';

  // Create a vite server to load the app in SSR mode
  const vite = await createServer({
    root: toAbs('.'),
    server: { 
      middlewareMode: true,
      hmr: false // Disable HMR to avoid port conflicts
    },
    appType: 'custom'
  });

  const templatePath = toAbs('dist/index.html');
  if (!fs.existsSync(templatePath)) {
    console.error('dist/index.html not found. Did you run vite build?');
    await vite.close();
    process.exit(1);
  }

  const template = fs.readFileSync(templatePath, 'utf-8');

  console.log('Starting prerendering...');

  for (const url of routes) {
    try {
      console.log(`Prerendering ${url}...`);
      const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
      
      const helmetContext = {};
      const appHtml = await render(url, helmetContext);
      fs.appendFileSync(toAbs('prerender-log.txt'), `Rendered ${url}, length: ${appHtml.length}\n`);
      const { helmet } = helmetContext;

      let html = template
        .replace(`<div id="root"></div>`, () => {
          // Strip helmet tags from appHtml if they were rendered there by mistake
          const cleanAppHtml = appHtml.replace(/<(title|meta|link)\s+data-rh="true"[\s\S]*?\/>/g, '')
                                     .replace(/<title\s+data-rh="true"[\s\S]*?<\/title>/g, '');
          return `<div id="root">${cleanAppHtml}</div>`;
        });

      if (helmet) {
        const title = helmet.title.toString();
        const meta = helmet.meta.toString();
        const link = helmet.link.toString();
        
        if (title) {
          // Replace existing title or add new one
          if (html.includes('<title>')) {
            html = html.replace(/<title>[\s\S]*?<\/title>/, title);
          } else {
            html = html.replace('</head>', `${title}</head>`);
          }
        }
        
        // Add meta and link tags before the closing head tag
        html = html.replace('</head>', `${meta}${link}</head>`);
      }

      const routePath = url === '/' ? 'index.html' : `${url.substring(1)}/index.html`;
      const filePath = path.join('dist', routePath);
      const absPath = toAbs(filePath);
      
      const dir = path.dirname(absPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(absPath, html);
      console.log(`✓ Pre-rendered: ${url} -> ${filePath}`);
    } catch (e) {
      console.error(`✗ Failed to pre-render ${url}:`, e);
      fs.appendFileSync(toAbs('prerender-log.txt'), `✗ Failed to pre-render ${url}: ${e.message}\n${e.stack}\n`);
    }
  }

  await vite.close();
  console.log('Prerendering finished.');
}

prerender().catch(err => {
  console.error('Prerendering failed:', err);
  process.exit(1);
});
