import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

// Most tested code is plain DOM code, for jsdom. WxtVitest gives tests a fake `browser`
// (wxt/testing/fake-browser) with in-memory storage, for the code that keeps or sends saves.
export default defineConfig({
  plugins: [WxtVitest()],
  test: { environment: 'jsdom' },
});
