import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import tailwindcss from '@tailwindcss/vite';
import { rename } from 'fs/promises';
import { resolve } from 'path';

const __dirname = import.meta.dirname;

export default defineConfig({
  root: 'src',
  plugins: [
    preact(),
    tailwindcss(),
    viteSingleFile({
      removeViteModuleLoader: true,
    }),
    // Post-build: rename index.html to erasure-kit.html (D-16)
    {
      name: 'rename-html',
      closeBundle: async () => {
        const outDir = resolve(__dirname, 'dist/Erasure-Kit');
        try {
          await rename(
            resolve(outDir, 'index.html'),
            resolve(outDir, 'erasure-kit.html')
          );
        } catch (e) {
          // File may already be renamed or not exist during dev
        }
      },
    },
  ],
  build: {
    outDir: resolve(__dirname, 'dist/Erasure-Kit'),
    emptyOutDir: true,
  },
  publicDir: resolve(__dirname, 'public'),
});
