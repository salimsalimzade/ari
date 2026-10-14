import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { defineConfig } from 'wxt';

// Figtree from @ari/ui-kit. Fonts declared inside a shadow root don't load, so the content script
// reads this copy and adds it to the page's fonts itself (see features/page/fonts.ts).
const figtree = createRequire(import.meta.url).resolve('@ari/ui-kit/fonts/figtree.woff2');

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-solid'],
  // Every import is written out, as in the rest of the repo.
  imports: false,
  manifestVersion: 3,
  // The website's dev server has 3000.
  dev: { server: { port: 3001 } },
  manifest: {
    name: 'Ari',
    description: 'Save highlights and sections of any page, each with its source.',
    // <all_urls>: the content script on every site, and captureVisibleTab for clipping a box.
    // alarms: sending saves to the library again while ari-api can't be reached.
    permissions: ['storage', 'unlimitedStorage', 'alarms'],
    host_permissions: ['<all_urls>'],
    icons: { 48: 'icon.svg', 96: 'icon.svg' },
    commands: {
      // Not ⌥⇧S: Mac screenshot tools often take it. The website's Settings › Shortcuts says ⌥⇧C too.
      'clip-section': {
        suggested_key: { default: 'Alt+Shift+C' },
        description: 'Clip a section',
      },
      // The side panel is Ari's own, drawn on the page, so it can sit on either side.
      'toggle-panel': {
        suggested_key: { default: 'Alt+A' },
        description: 'Open or close the side panel',
      },
    },
    web_accessible_resources: [{ resources: ['fonts/figtree.woff2'], matches: ['<all_urls>'] }],
    browser_specific_settings: {
      gecko: {
        // Permanent once the extension is on addons.mozilla.org.
        id: 'extension@ari',
        // 140 (ESR) is the first with data_collection_permissions.
        strict_min_version: '140.0',
        // Not yet updated for sync: the extension now sends saves (page text and address) to
        // ari-api. Declare that here before submitting to addons.mozilla.org.
        data_collection_permissions: { required: ['none'] },
      },
    },
  },
  hooks: {
    'build:publicAssets': (_wxt, files) => {
      files.push({ absoluteSrc: figtree, relativeDest: 'fonts/figtree.woff2' });
    },
    'prepare:publicPaths': (_wxt, paths) => {
      paths.push('/fonts/figtree.woff2');
    },
    // macOS keeps apps started from an editor's terminal (VS Code's) out of
    // ~/Library/Application Support/Firefox. The Firefox that `pnpm dev` opens then never starts
    // the debugger web-ext connects to, and dev fails with ECONNREFUSED. It already runs on a
    // throwaway profile, so it gets a home folder of its own too, in .wxt/.
    'server:created': (wxt) => {
      if (process.platform !== 'darwin' || process.env.CFFIXED_USER_HOME) return;
      const home = join(wxt.config.wxtDir, 'firefox-home');
      mkdirSync(home, { recursive: true });
      process.env.CFFIXED_USER_HOME = home;
    },
  },
});
