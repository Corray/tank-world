/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  // Single-file build: inline all JS/CSS into dist/index.html so the game
  // runs from file:// directly (consensus AC-10).
  plugins: [viteSingleFile()],
  test: {
    globals: true,
    environment: 'node',
  },
});
