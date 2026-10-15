import { fileURLToPath } from 'node:url';
import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

// Tests run the app's plain code (the export's files) without SolidStart's server.
export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
    conditions: ['development', 'browser'],
  },
  // Kobalte (through @ari/ui-kit) and its helpers ship .jsx, which Node can't load: Vite
  // compiles them like the app's own code.
  test: { server: { deps: { inline: [/\.jsx$/] } } },
});
