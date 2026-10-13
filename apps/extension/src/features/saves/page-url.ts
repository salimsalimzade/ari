/** The address a page's saves are kept under: without the #fragment, which only scrolls the page. */
export function pageUrl(href: string) {
  const url = new URL(href);
  url.hash = '';
  return url.href;
}

/** Whether Ari saves on a page: websites only, not the browser's own pages or local files. */
export function isWebsite(href: string | undefined): href is string {
  return !!href && /^https?:\/\//.test(href);
}

/** The domain shown next to a source's name, without "www.". */
export function domainOf(href: string) {
  return new URL(href).hostname.replace(/^www\./, '');
}
