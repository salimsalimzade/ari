/**
 * What the website and the Ari extension's content script tell each other on the website's pages
 * (F13), with `window.postMessage` to the website's own origin. The extension takes codes only on
 * the website's origin, so no other site can sign it in as somebody else.
 *
 * By default the extension follows the website's account:
 * - `ready`: the content script has loaded; a signed-in page answers `signed-in`.
 * - `signed-in`: a signed-in page has loaded, as this user; the extension's popup shows who it is.
 * - `want-code`: the extension follows the website but isn't signed in as that user; the page
 *   answers `code`.
 * - `code`: a one-time code for the website's user, valid for 60 seconds.
 * - `signed-out`: the website logged out; an extension that follows it signs out too.
 *
 * Another account signs in inside the extension's popup, with its password; it never comes here.
 */
export type BridgeMessage =
  | { ari: 'extension'; type: 'ready' | 'want-code' }
  | { ari: 'website'; type: 'signed-in'; user: BridgeUser }
  | { ari: 'website'; type: 'code'; code: string; userId: string }
  | { ari: 'website'; type: 'signed-out' };

/** Who is signed in on the website, as the extension shows them. */
export type BridgeUser = { id: string; username?: string; fullName?: string; email?: string };

/** The message a `message` event carries when this window sent it as `from`; otherwise undefined. */
export function bridgeMessage<From extends BridgeMessage['ari']>(
  event: MessageEvent,
  from: From,
): Extract<BridgeMessage, { ari: From }> | undefined {
  if (event.source !== window || event.origin !== window.location.origin) return undefined;
  const data: unknown = event.data;
  if (typeof data !== 'object' || data === null || !('ari' in data) || data.ari !== from) {
    return undefined;
  }
  return data as Extract<BridgeMessage, { ari: From }>;
}

/** Posts the message to this window, for the other side; only the window's own origin gets it. */
export function postBridgeMessage(message: BridgeMessage) {
  window.postMessage(message, window.location.origin);
}
