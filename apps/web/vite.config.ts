import { cpSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { solidStart } from '@solidjs/start/config';
import { nitro } from 'nitro/vite';
import { defineConfig, type Plugin } from 'vite';

const require = createRequire(import.meta.url);
const packageDir = (name: string) => dirname(require.resolve(`${name}/package.json`));

/**
 * Photo import reads photos in the browser with tesseract.js (F12). Its worker, its WebAssembly
 * core (the LSTM builds: plain, SIMD and relaxed SIMD, one picked per browser) and the English,
 * Azerbaijani, Turkish and Russian language data are copied from node_modules into `public/ocr/`
 * (gitignored), so Ari serves them itself instead of tesseract.js's CDN.
 */
function ocrFiles(): Plugin {
  return {
    name: 'ari-ocr-files',
    buildStart() {
      const out = join(import.meta.dirname, 'public/ocr');
      mkdirSync(join(out, 'core'), { recursive: true });
      mkdirSync(join(out, 'lang'), { recursive: true });
      cpSync(join(packageDir('tesseract.js'), 'dist/worker.min.js'), join(out, 'worker.min.js'));
      for (const core of ['', 'simd-', 'relaxedsimd-']) {
        const file = `tesseract-core-${core}lstm.wasm.js`;
        cpSync(join(packageDir('tesseract.js-core'), file), join(out, 'core', file));
      }
      for (const lang of ['eng', 'aze', 'tur', 'rus']) {
        const file = `${lang}.traineddata.gz`;
        cpSync(
          join(packageDir(`@tesseract.js-data/${lang}`), '4.0.0_best_int', file),
          join(out, 'lang', file),
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [ocrFiles(), solidStart({ middleware: './src/middleware.ts' }), nitro()],
  server: { port: 3000 },
  // SolidStart's dev error viewer imports trace-mapping in the browser, whose resolve-uri points
  // browsers at a UMD file; pre-bundling turns it into ESM. Without it no page hydrates in dev.
  optimizeDeps: { include: ['@solidjs/start > @jridgewell/trace-mapping'] },
});
