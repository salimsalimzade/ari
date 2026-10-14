// The website's pages the extension opens. VITE_WEB_URL is the website's origin.

export const websiteOrigin = new URL(import.meta.env.VITE_WEB_URL || 'http://localhost:3000')
  .origin;

/** The website's address as people see it, e.g. ari.app, for the texts' {site}. */
export const site = new URL(websiteOrigin).host;

const pages = {
  // A signed-in page signs the extension in; a signed-out visitor logs in first, then comes back.
  'sign-in': '/library',
  register: '/register',
  library: '/library',
  'forgot-password': '/forgot-password',
} as const;

export type WebsitePage = keyof typeof pages;

/** A page's address, with `query` as its search parameters. */
export function websiteUrl(page: WebsitePage, query?: Record<string, string>) {
  const search = query ? `?${new URLSearchParams(query)}` : '';
  return `${websiteOrigin}${pages[page]}${search}`;
}
