import { createExtensionCode } from '@ari/data-access';
import { type BridgeUser, bridgeMessage, postBridgeMessage } from '@ari/utils';
import { createEffect, onCleanup, onMount } from 'solid-js';

/**
 * For the signed-in pages: tells the Ari extension who is signed in and gives it a sign-in code
 * when it asks, so signing in here signs the extension in too (F13), unless it uses another
 * account. Without the extension nobody listens, and nothing happens.
 */
export function useExtensionSignIn(user: () => BridgeUser | undefined) {
  const announce = () => {
    const current = user();
    if (current) postBridgeMessage({ ari: 'website', type: 'signed-in', user: current });
  };
  createEffect(announce);
  onMount(() => {
    const onMessage = (event: MessageEvent) => {
      const message = bridgeMessage(event, 'extension');
      if (!message || !user()) return;
      if (message.type === 'ready') announce();
      else if (message.type === 'want-code')
        createExtensionCode().then(
          ({ code }) => {
            const id = user()?.id;
            if (code && id) postBridgeMessage({ ari: 'website', type: 'code', code, userId: id });
          },
          // The extension asks again on the next page.
          () => undefined,
        );
    };
    window.addEventListener('message', onMessage);
    onCleanup(() => window.removeEventListener('message', onMessage));
  });
}

/** After logging out: an extension that follows the website signs out too. */
export function signOutExtension() {
  postBridgeMessage({ ari: 'website', type: 'signed-out' });
}
