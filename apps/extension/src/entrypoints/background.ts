import type { FacetsResponse } from '@ari/types';
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import {
  account,
  apiRequest,
  connect,
  expired,
  followsWebsite,
  loadAccount,
  loggedOut,
  signInWithPassword,
  signOut,
} from '~/features/account/session';
import { cropShot } from '~/features/clip/crop';
import { panelWindows } from '~/features/saves/settings';
import { syncRetry, waitingSaves } from '~/features/saves/store';
import { syncSaves } from '~/features/saves/sync';
import { type Message, sendToTab } from '~/messages';
import { websiteOrigin, websiteUrl } from '~/website';

// The badge on the Ari icon: how many saves are kept only in this browser, terracotta while
// signed out (they wait for a sign-in), gray while ari-api can't be reached (they wait for a retry).
const badgeColors = { signedOut: '#8c491a', waiting: '#645c50' };

// The background answers what a page can't do itself, opens the welcome tab once, passes the
// shortcuts on, keeps the extension's session with ari-api and sends the saves to the library.
export default defineBackground(() => {
  // Every start refreshes the session, so it lapses only after 30 days of the browser closed.
  // Window ids start over with the browser, so no window has the side panel open yet.
  browser.runtime.onStartup.addListener(() => {
    void panelWindows.setValue([]);
    void loadAccount()
      .catch(() => false)
      .then(sync);
  });

  // — Side panel —

  // Open or closed per window, like the browser's own sidebar; each page in the window draws it.
  const setPanel = async (windowId: number | undefined, open: boolean | 'toggle') => {
    if (windowId === undefined) return;
    const ids = await panelWindows.getValue();
    const opened = open === 'toggle' ? !ids.includes(windowId) : open;
    const others = ids.filter((id) => id !== windowId);
    await panelWindows.setValue(opened ? [...others, windowId] : others);
  };
  browser.windows.onRemoved.addListener((windowId) => void setPanel(windowId, false));

  // — Saves to the library —

  const sync = () =>
    syncSaves((at) => void browser.alarms.create('sync', { when: at.getTime() })).catch(() => {});
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'sync') void sync();
  });

  const showBadge = async () => {
    const [{ count }, me, ended, retry] = await Promise.all([
      waitingSaves(),
      account.getValue(),
      expired.getValue(),
      syncRetry.getValue(),
    ]);
    const signedOut = !me || ended;
    const text = count && (signedOut || retry) ? String(Math.min(count, 99)) : '';
    await browser.action.setBadgeText({ text });
    await browser.action.setBadgeBackgroundColor({
      color: signedOut ? badgeColors.signedOut : badgeColors.waiting,
    });
    await browser.action.setBadgeTextColor({ color: '#ffffff' });
  };

  // A new or changed save goes out a moment later, so a burst of them goes together.
  let syncTimer: ReturnType<typeof setTimeout> | undefined;
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const keys = Object.keys(changes);
    const saves = keys.some((key) => key.startsWith('page:') || key === 'deletedSaves');
    if (saves || keys.some((key) => ['account', 'expired', 'syncRetry'].includes(key))) {
      void showBadge();
    }
    if (saves || keys.includes('account')) {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => void sync(), 1000);
    }
  });
  void showBadge();

  // — Signing in —

  // One sign-in at a time, in the order the codes came.
  let signingIn: Promise<unknown> = Promise.resolve();
  const signIn = (code: string, websiteUser: string) => {
    const next = signingIn.then(async () => {
      // Never after the extension's own Sign out, or once its session expired: then only a
      // password in the popup signs it in. A code from another website tab, after the first
      // already signed in; or the extension uses an account signed in with its password, which
      // the website doesn't change.
      const [current, follows, ended, out] = await Promise.all([
        account.getValue(),
        followsWebsite.getValue(),
        expired.getValue(),
        loggedOut.getValue(),
      ]);
      if (out || ended) return false;
      if (current?.id === websiteUser || (current && !follows)) return true;
      return connect(code, true);
    });
    signingIn = next.catch(() => false);
    return signingIn;
  };

  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install')
      void browser.tabs.create({ url: browser.runtime.getURL('/welcome.html') });
  });

  browser.commands.onCommand.addListener(async (command) => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (command === 'toggle-panel') void setPanel(tab?.windowId, 'toggle');
    // A browser page, or one loaded before Ari, has no content script to answer.
    if (command === 'clip-section' && tab?.id !== undefined)
      void sendToTab(tab.id, { type: 'start-clip' }).catch(() => {});
  });

  browser.runtime.onMessage.addListener(
    (message: Message, sender, respond: (answer: unknown) => void) => {
      const tab = sender.tab;
      const fromWebsite = !!sender.url && new URL(sender.url).origin === websiteOrigin;
      // The popup, the side panel and the welcome tab, not a content script.
      const fromExtension = !!sender.url?.startsWith(browser.runtime.getURL('/'));
      const answer = (work: Promise<unknown>) => {
        work.then(respond, () => respond(false));
        return true;
      };
      // Only the website's pages hand over codes for its user.
      if (message.type === 'connect' && fromWebsite) {
        return answer(signIn(message.code, message.websiteUser));
      }
      // The website logged out: the extension too, unless it uses an account picked for it.
      if (message.type === 'website-signed-out' && fromWebsite) {
        return answer(
          followsWebsite.getValue().then((follows) => (follows ? signOut(false) : undefined)),
        );
      }
      if (fromExtension) {
        if (message.type === 'sign-out') return answer(signOut(true));
        if (message.type === 'password-sign-in') {
          const { username, password } = message;
          return answer(signInWithPassword({ username, password }).catch(() => 'failed'));
        }
        if (message.type === 'sync-now') return answer(syncRetry.setValue(null).then(sync));
      }
      if (message.type === 'load-account') {
        return answer(loadAccount());
      }
      if (message.type === 'tags') {
        return answer(libraryTags());
      }
      if (message.type === 'window-id') {
        respond(tab?.windowId);
        return;
      }
      if (message.type === 'set-panel') {
        return answer(setPanel(message.windowId ?? tab?.windowId, message.open));
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

/** The library's tag names, most used first; none while signed out or offline. */
async function libraryTags() {
  const response = await apiRequest('/api/v1/saves/facets').catch(() => undefined);
  if (!response?.ok) return [];
  const facets: FacetsResponse = await response.json();
  return [...(facets.tags ?? [])]
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .flatMap((tag) => (tag.name ? [tag.name] : []));
}
