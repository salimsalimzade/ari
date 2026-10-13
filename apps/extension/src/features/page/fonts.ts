import { browser } from 'wxt/browser';

/**
 * Adds Figtree to the page's fonts for Ari's shadow root, where an @font-face of its own doesn't
 * load. It gets a name of its own, so the page's text never changes, and goes in as bytes, so a
 * page's font-src policy can't block it. Without it the UI falls back to the system font.
 */
export async function addFigtree() {
  try {
    const response = await fetch(browser.runtime.getURL('/fonts/figtree.woff2'));
    const face = new FontFace('Ari Figtree', await response.arrayBuffer(), { weight: '300 900' });
    document.fonts.add(await face.load());
  } catch {
    // The system font it is.
  }
}
