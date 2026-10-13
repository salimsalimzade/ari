// The website's pages the extension opens. VITE_WEB_URL is the website's origin.

const origin = import.meta.env.VITE_WEB_URL || 'http://localhost:3000';

const pages = { login: '/login', library: '/library' } as const;

export type WebsitePage = keyof typeof pages;

export function websiteUrl(page: WebsitePage) {
  return `${origin}${pages[page]}`;
}
