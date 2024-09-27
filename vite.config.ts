import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import { resolve } from 'path';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./vue', import.meta.url))
    }
  },
  build: {
    outDir: 'mapRender',
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
  },
  server: {
    host: '0.0.0.0'
  },
  define: {
    'process.env.VERSION': JSON.stringify(packageJson.version),
  },
})
