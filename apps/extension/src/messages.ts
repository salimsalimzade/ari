import { browser } from 'wxt/browser';
import type { Area } from './features/clip/crop';
import type { WebsitePage } from './website';

/** What one part of the extension asks another. */
export type Message =
  // To a tab's content script: the popup's buttons, the clip shortcut, a click in the side panel.
  | { type: 'save-selection' }
  | { type: 'start-clip' }
  | { type: 'focus-save'; id: string }
  // To the background, for what a page can't do itself. capture answers a JPEG data: URL, or null.
  | { type: 'capture'; area: Area; viewportWidth: number }
  | { type: 'panel-open' }
  | { type: 'open'; page: WebsitePage };

/** The content script's answer to save-selection. */
export type SaveSelectionResult = 'saved' | 'no-selection';

export function sendToBackground<T>(message: Message): Promise<T> {
  return browser.runtime.sendMessage(message);
}

export function sendToTab<T>(tabId: number, message: Message): Promise<T> {
  return browser.tabs.sendMessage(tabId, message);
}
