import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ ssrBuild }) => {
  const isSSR = ssrBuild || process.env.VITE_SSR === 'true';

  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'ssr-un-lazy',
        enforce: 'pre',
        transform(code, id, options) {
          // Only transform during SSR build or SSR load
          // options.ssr is true during vite.ssrLoadModule and vite build --ssr
          const isSSR = options?.ssr || ssrBuild || process.env.VITE_SSR === 'true';
          if (!isSSR) return null;

          if (!id.includes('node_modules') && (id.endsWith('.tsx') || id.endsWith('.ts'))) {
            let newCode = code;
            const imports = [];

            // Fix react-router-dom imports for SSR
            newCode = newCode.replace(/import\s+\{\s*([^{}]+?)\s*\}\s*from\s*['"]react-router-dom['"];/g, (match, names) => {
              return `import { ${names.replace(/\s+/g, ' ')} } from 'react-router';`;
            });

            // Fix react-helmet-async imports for SSR (CommonJS compatibility)
            if (newCode.includes('react-helmet-async')) {
              newCode = newCode.replace(/import\s+\{\s*([^{}]+?)\s*\}\s*from\s*['"]react-helmet-async['"];/g, (match, names) => {
                const nameList = names.split(',').map(n => n.trim());
                let replacement = `import * as HelmetAsyncPkg from 'react-helmet-async';\n`;
                nameList.forEach(name => {
                  replacement += `const ${name} = (HelmetAsyncPkg as any).${name} || (HelmetAsyncPkg as any).default?.${name} || (HelmetAsyncPkg as any).${name};\n`;
                });
                return replacement;
              });
            }

            // Replace lazy(() => import('./...')) with direct imports for SSR
            // Handles various whitespace and optional semicolons/exports
            newCode = newCode.replace(/(?:export\s+)?const\s+(\w+)\s*=\s*(?:React\.)?lazy\s*\(\s*\(\s*\)\s*=>\s*import\s*\(\s*['"](.+?)['"]\s*\)\s*\)\s*;?/g, (match, name, path) => {
              const internalName = `_SSR_${name}`;
              imports.push(`import ${internalName} from '${path}';`);
              // Use a simple functional component that renders the imported module's default export
              return `const ${name} = (props: any) => {
                const Component = ${internalName}.default || ${internalName};
                if (!Component) {
                  throw new Error('SSR Lazy Component "${name}" is undefined. Path: "${path}"');
                }
                return <Component {...props} />;
              };`;
            });
            
            // Replace Suspense with a component that ignores fallback for SSR
            // This is much safer than regex-replacing the whole tag which can break JSX
            if (newCode.includes('<Suspense') || newCode.includes('<React.Suspense')) {
              newCode = newCode.replace(/<Suspense/g, '<SSR_Suspense').replace(/<\/Suspense>/g, '</SSR_Suspense>');
              newCode = newCode.replace(/<React\.Suspense/g, '<SSR_Suspense').replace(/<\/React\.Suspense>/g, '</SSR_Suspense>');
              imports.push(`const SSR_Suspense = ({ children }: any) => <React.Fragment>{children}</React.Fragment>;`);
            }

            if (imports.length > 0 || newCode !== code) {
              return {
                code: imports.join('\n') + '\n' + newCode,
                map: null
              };
            }
          }
          return null;
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'react-helmet-async'],
    },
    ssr: {
    noExternal: ['react-helmet-async', 'motion'],
  },
  build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('recharts')) {
              return 'recharts';
            }
            if (id.includes('motion')) {
              return 'motion';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio to prevent flickering and port conflicts.
      hmr: false,
    },
  };
});
