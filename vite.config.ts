import tailwindcss from '@tailwindcss/vite';
import commonjs from 'vite-plugin-commonjs';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ ssrBuild }) => {
  const isSSR = ssrBuild || process.env.VITE_SSR === 'true';

  return {
    plugins: [
      commonjs({
        include: [/node_modules/],
      }),
      react(), 
      tailwindcss(),
    ],
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-router',
        'react-router-dom',
        'react-helmet-async',
        'motion/react'
      ],
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'react-helmet-async'],
      conditions: ['node', 'import'],
    },
    ssr: {
      noExternal: true,
    },
  build: {
      rollupOptions: {
        output: {
          format: 'esm',
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio to prevent flickering and port conflicts.
      hmr: false,
      watch: {
        usePolling: true,
      },
      // Explicitly disable the WebSocket server
      ws: false,
    },
  };
});
