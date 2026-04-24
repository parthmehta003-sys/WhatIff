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
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'react-helmet-async'],
    },
    ssr: {
      noExternal: true,
    },
  build: {
      rollupOptions: {
        output: {
          format: 'esm',
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router', 'react-router-dom', 'react-helmet-async'],
            'vendor-utils': ['clsx', 'tailwind-merge', 'lucide-react', 'motion/react'],
            'vendor-charts': ['recharts'],
            'vendor-ai': ['@google/genai', 'openai', 'groq-sdk'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      cssCodeSplit: true,
      minify: 'esbuild',
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
