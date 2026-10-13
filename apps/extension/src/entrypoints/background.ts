import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { cropShot } from '~/features/clip/crop';
import { type Message, sendToTab } from '~/messages';
import { sidebar } from '~/sidebar';
import { websiteUrl } from '~/website';

// The background answers what a page can't do itself, opens the welcome tab once, and passes
// the clip shortcut to the page. The side panel's shortcut is the browser's own.
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install')
      void browser.tabs.create({ url: browser.runtime.getURL('/welcome.html') });
  });

  browser.commands.onCommand.addListener(async (command) => {
    if (command !== 'clip-section') return;
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    // A browser page, or one loaded before Ari, has no content script to answer.
    if (tab?.id !== undefined) void sendToTab(tab.id, { type: 'start-clip' }).catch(() => {});
  });

  browser.runtime.onMessage.addListener(
    (message: Message, sender, respond: (answer: unknown) => void) => {
      const tab = sender.tab;
      if (message.type === 'panel-open') {
        sidebar.isOpen({ windowId: tab?.windowId }).then(respond, () => respond(false));
        return true;
      }
      if (message.type === 'capture' && tab?.windowId !== undefined) {
        browser.tabs
          .captureVisibleTab(tab.windowId, { format: 'png' })
          .then((shot) => cropShot(shot, message.area, message.viewportWidth))
          .then(respond, () => respond(null));
        return true;
      }
      if (message.type === 'open') {
        void browser.tabs.create({
          url: websiteUrl(message.page),
          index: tab ? tab.index + 1 : undefined,
        });
      }
    },
  );
});
