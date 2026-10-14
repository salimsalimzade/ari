import '@ari/ui-kit/tokens.css';
import './shadow.css';
import { delegateEvents, render } from 'solid-js/web';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { followWebsiteSignIn } from '~/features/account/website-bridge';
import { addFigtree } from '~/features/page/fonts';
import { readSource } from '~/features/page/page-source';
import { PageUi } from '~/features/page/page-ui';
import { pageUrl } from '~/features/saves/page-url';
import { pageStore } from '~/features/saves/store';
import { websiteOrigin } from '~/website';

// On every website: Ari's page UI, in a shadow root so the page's styles can't reach it. Ari's own
// website gets none of it (nothing there is saved or clipped): there the extension only signs in
// and out with the website.
export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    if (location.origin === websiteOrigin) return followWebsiteSignIn(ctx);
    void addFigtree();
    // The page's address. It is taken from the change itself on a single-page app, because
    // the Navigation API tells of a change before location has it.
    let url = pageUrl(location.href);
    const ui = await createShadowRootUi(ctx, {
      name: 'ari-page',
      position: 'inline',
      anchor: 'html',
      // Keys typed in Ari's fields stay away from the page's own shortcuts.
      isolateEvents: true,
      onMount(container) {
        const current = url;
        return render(
          () => <PageUi store={pageStore(current)} source={() => readSource(document, current)} />,
          container,
        );
      },
      onRemove(dispose) {
        dispose?.();
      },
    });
    // Solid listens for keys on the document, which the shadow root now keeps them from; it
    // listens on the shadow root too.
    delegateEvents(['keydown', 'keyup'], ui.shadow as unknown as Document);
    ui.mount();

    // A single-page app changes the address without loading a page: start over with its saves.
    ctx.addEventListener(window, 'wxt:locationchange', ({ newUrl }) => {
      if (pageUrl(newUrl.href) === url) return;
      url = pageUrl(newUrl.href);
      ui.remove();
      ui.mount();
    });
  },
});
