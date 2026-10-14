import { bridgeMessage, postBridgeMessage } from '@ari/utils';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { sendToBackground } from '~/messages';
import { websiteOrigin } from '~/website';
import { account, expired, followsWebsite, loggedOut, websiteAccount } from './session';

/**
 * On the website's own pages only: by default the extension uses the account signed in there,
 * follows it to another one and logs out with it. An account signed in with its password in the
 * popup replaces it until the extension logs out. After the extension's own Sign out, or once its
 * session expired, only a password in the popup signs it in again (the messages are in
 * @ari/utils' extension-bridge).
 */
export function followWebsiteSignIn(ctx: ContentScriptContext) {
  if (location.origin !== websiteOrigin) return;
  ctx.addEventListener(window, 'message', async (event) => {
    const message = bridgeMessage(event, 'website');
    if (message?.type === 'signed-in') {
      const { user } = message;
      const [current, follows, ended, out] = await Promise.all([
        account.getValue(),
        followsWebsite.getValue(),
        expired.getValue(),
        loggedOut.getValue(),
      ]);
      // Kept for the popup's Continue as and Use ari.app account, which ask its password.
      await websiteAccount.setValue(user);
      // After a Sign out, or once the session expired, only a password signs the extension in.
      if (out || ended) return;
      if (!current || (follows && current.id !== user.id))
        postBridgeMessage({ ari: 'extension', type: 'want-code' });
    } else if (message?.type === 'code') {
      void sendToBackground({ type: 'connect', code: message.code, websiteUser: message.userId });
    } else if (message?.type === 'signed-out') {
      void websiteAccount.setValue(null);
      void sendToBackground({ type: 'website-signed-out' });
    }
  });
  // A page that loaded first tells again who is signed in.
  postBridgeMessage({ ari: 'extension', type: 'ready' });
}
