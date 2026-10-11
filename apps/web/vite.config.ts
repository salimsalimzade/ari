import { solidStart } from '@solidjs/start/config';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [solidStart({ middleware: './src/middleware.ts' }), nitro()],
  server: { port: 3000 },
  // SolidStart's dev error viewer imports trace-mapping in the browser, whose resolve-uri points
  // browsers at a UMD file; pre-bundling turns it into ESM. Without it no page hydrates in dev.
  optimizeDeps: { include: ['@solidjs/start > @jridgewell/trace-mapping'] },
});
