import { browser } from 'wxt/browser';
import type { Area } from './features/clip/crop';
import type { WebsitePage } from './website';

/** What one part of the extension asks another. */
export type Message =
  // To a tab's content script: the popup's buttons and the clip shortcut.
  | { type: 'save-selection' }
  | { type: 'start-clip' }
  | { type: 'open-panel' }
  // To the background, for what a page can't do itself. capture answers a JPEG data: URL, or null;
  // tags the library's tag names, most used first; window-id the sender's window. set-panel opens
  // or closes the side panel in a window: the sender's, unless windowId says another.
  | { type: 'capture'; area: Area; viewportWidth: number }
  | { type: 'open'; page: WebsitePage }
  | { type: 'tags' }
  | { type: 'window-id' }
  | { type: 'set-panel'; open: boolean; windowId?: number }
  // To the background, for the extension's session. connect signs in with a code from the website
  // for its user (websiteUser) and answers whether it worked. sign-out is the extension's own Log
  // out, website-signed-out the website's. load-account reads the signed-in user again.
  | { type: 'connect'; code: string; websiteUser: string }
  | { type: 'sign-out' }
  | { type: 'website-signed-out' }
  | { type: 'load-account' }
  // From the popup: an account's username and password sign the extension in (Add an account,
  // Continue as, the switcher, Session expired, Use ari.app account); it answers a PasswordSignIn.
  | { type: 'password-sign-in'; username: string; password: string }
  // From the popup: send the saves kept only in this browser to the library now.
  | { type: 'sync-now' };

/** The content script's answer to save-selection. */
export type SaveSelectionResult = 'saved' | 'no-selection';

export function sendToBackground<T>(message: Message): Promise<T> {
  return browser.runtime.sendMessage(message);
}

export function sendToTab<T>(tabId: number, message: Message): Promise<T> {
  return browser.tabs.sendMessage(tabId, message);
}
