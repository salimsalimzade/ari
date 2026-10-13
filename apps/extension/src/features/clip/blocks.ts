import { cleanText } from '../page/page-source';

export type BlockKind =
  | 'table'
  | 'image'
  | 'code'
  | 'quote'
  | 'list'
  | 'heading'
  | 'paragraph'
  | 'section';

/** What a click in clip mode would clip: `element` is outlined, `image` is an image block's picture. */
export type Block = { element: Element; kind: BlockKind; image?: HTMLImageElement };

// Pictures smaller than this (icons, avatars) are clipped with the block around them.
const smallestImage = 48;

// Checked in this order, so a paragraph inside a quote clips the whole quote.
const kinds: [selector: string, kind: BlockKind][] = [
  ['table', 'table'],
  ['pre', 'code'],
  ['blockquote', 'quote'],
  ['ul, ol, dl', 'list'],
  ['h1, h2, h3, h4, h5, h6', 'heading'],
  ['p', 'paragraph'],
];

/** The block of the page an element is in, or null when it is the page itself. */
export function blockAt(element: Element | null): Block | null {
  if (!element) return null;
  const image = imageAt(element);
  if (image) return { element: image.closest('figure') ?? image, kind: 'image', image };
  for (const [selector, kind] of kinds) {
    const found = element.closest(selector);
    if (!found) continue;
    if (kind === 'table' && !tableRows(found as HTMLTableElement).length) continue;
    return { element: found, kind };
  }
  const section = sectionAt(element);
  return section ? { element: section, kind: 'section' } : null;
}

function imageAt(element: Element) {
  const figure = element.closest('figure');
  const figureImages = figure?.querySelectorAll('img');
  const image =
    element.closest('img') ??
    element.closest('picture')?.querySelector('img') ??
    (figureImages?.length === 1 ? figureImages[0] : null);
  if (!image) return null;
  const { width, height } = image.getBoundingClientRect();
  return width >= smallestImage && height >= smallestImage ? image : null;
}

// The nearest box that is laid out as a block and big enough to be worth a clip.
function sectionAt(element: Element) {
  const document = element.ownerDocument;
  for (
    let current: Element | null = element;
    current && current !== document.body && current !== document.documentElement;
    current = current.parentElement
  ) {
    const { display } = getComputedStyle(current);
    const { width, height } = current.getBoundingClientRect();
    if (!display.startsWith('inline') && display !== 'contents' && width >= 40 && height >= 24) {
      return current;
    }
  }
  return null;
}

/** A table's cells as text, row by row. */
export function tableRows(table: HTMLTableElement) {
  return Array.from(table.rows, (row) =>
    Array.from(row.cells, (cell) => cleanText(cell.textContent)),
  );
}

/** Rows as a Markdown table, the first row as its header; a short row gets empty cells. */
export function markdownTable(rows: string[][]) {
  const width = Math.max(1, ...rows.map((row) => row.length));
  const line = (cells: string[]) =>
    `| ${Array.from({ length: width }, (_, i) => (cells[i] ?? '').replaceAll('|', '\\|')).join(' | ')} |`;
  const [head = [], ...body] = rows;
  return [line(head), line(Array(width).fill('---')), ...body.map(line)].join('\n');
}

/** What the page calls a table or picture: its caption, its figure's caption, or its alt text. */
export function captionOf(element: Element) {
  // Only a picture's own alt text: a box around a whole article isn't named after its first image.
  const image =
    element instanceof HTMLImageElement
      ? element
      : element.closest('figure, picture')?.querySelector('img');
  return (
    cleanText(element.closest('table')?.caption?.textContent) ||
    cleanText(element.closest('figure')?.querySelector('figcaption')?.textContent) ||
    cleanText(image?.alt) ||
    undefined
  );
}
