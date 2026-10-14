import { browser } from 'wxt/browser';
import { isAriWebsite } from '~/website';
import { isWebsite, pageUrl } from './page-url';
import { pageStore } from './store';

/** The welcome tab, whose "Try it here" saves are only practice. */
export function welcomeUrl() {
  return browser.runtime.getURL('/welcome.html');
}

/**
 * A tab's saves: a website's, or the welcome tab's practice ones; null where Ari doesn't save
 * (the browser's own pages, local files and Ari's website).
 */
export function tabPage(href: string | undefined) {
  if (href?.startsWith(welcomeUrl())) {
    return { url: welcomeUrl(), store: pageStore(welcomeUrl(), 'session') };
  }
  if (!isWebsite(href) || isAriWebsite(href)) return null;
  const url = pageUrl(href);
  return { url, store: pageStore(url) };
}
