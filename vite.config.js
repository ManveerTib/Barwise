import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds one self-contained dist/index.html (scripts and styles inlined).
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { target: 'es2020', cssCodeSplit: false, assetsInlineLimit: 100000000 },
});
