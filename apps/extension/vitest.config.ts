import { defineConfig } from 'vitest/config';

// The tested code is plain DOM code, so jsdom is enough: no Solid plugin, no fake browser.
export default defineConfig({
  test: { environment: 'jsdom' },
});
