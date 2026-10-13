import { domainOf } from '../saves/page-url';
import type { Source } from '../saves/store';

/** A page's title and site, from its Open Graph tags when it has them. */
export function readSource(document: Document, url: string): Source {
  const meta = (name: string) =>
    document
      .querySelector<HTMLMetaElement>(`meta[property="${name}"], meta[name="${name}"]`)
      ?.content.trim();
  return {
    url,
    title: meta('og:title') || document.title.trim() || domainOf(url),
    siteName: meta('og:site_name') || meta('application-name') || domainOf(url),
  };
}

/** The text of the last heading before a node, for a save's section. */
export function headingAbove(node: Node) {
  let heading: Element | undefined;
  for (const candidate of (node.ownerDocument ?? document).querySelectorAll(
    'h1, h2, h3, h4, h5, h6',
  )) {
    if (!(candidate.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) break;
    heading = candidate;
  }
  return cleanText(heading?.textContent).slice(0, 500) || undefined;
}

/** Text with its whitespace collapsed, as the page shows it. */
export function cleanText(text: string | null | undefined) {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}
