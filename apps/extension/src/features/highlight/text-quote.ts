// Finds a highlight's words on its page again, the way the W3C's TextQuoteSelector does: by the
// words themselves and a little of the text around them, never by the page's DOM structure, which
// changes between visits.

/** A page's text in one string, with whitespace collapsed, and the text node each character is in. */
export type TextIndex = { text: string; segments: Segment[] };

/** One text node's characters in `TextIndex.text`: they start at `start`; `offsets` are in the node. */
type Segment = { node: Text; start: number; offsets: number[] };

/** A stretch of `TextIndex.text`, end excluded. */
export type Span = { start: number; end: number };

export type TextQuote = { exact: string; prefix: string; suffix: string };

// Text that is never highlighted; data-ari-ui is Ari's own UI where it isn't in a shadow root.
const skipped =
  'script, style, noscript, template, textarea, input, select, iframe, svg, canvas, [contenteditable=""], [contenteditable="true"], [data-ari-ui]';

// Text in a new one of these starts a new word, the way the page shows it.
const blocks =
  'address, article, aside, blockquote, caption, dd, details, div, dl, dt, fieldset, figcaption, figure, footer, form, h1, h2, h3, h4, h5, h6, header, li, main, nav, ol, p, pre, section, summary, table, td, th, tr, ul';

// How much text around the words a quote keeps.
const context = 32;

export function indexText(root: Node): TextIndex {
  const document = root.ownerDocument ?? (root as Document);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest(skipped) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  let text = '';
  const segments: Segment[] = [];
  let block: Element | null = null;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const nodeBlock = node.parentElement?.closest(blocks) ?? null;
    if (nodeBlock !== block && text && !text.endsWith(' ')) text += ' ';
    block = nodeBlock;
    const segment: Segment = { node, start: text.length, offsets: [] };
    for (let offset = 0; offset < node.data.length; offset++) {
      const char = node.data[offset];
      if (/\s/.test(char)) {
        if (!text || text.endsWith(' ')) continue;
        text += ' ';
      } else {
        text += char;
      }
      segment.offsets.push(offset);
    }
    if (segment.offsets.length) segments.push(segment);
  }
  return { text, segments };
}

/** The part of the index a range covers, without spaces at its ends; null when it has no text. */
export function spanOf(index: TextIndex, range: Range): Span | null {
  let start = -1;
  let end = -1;
  for (const segment of index.segments) {
    if (!range.intersectsNode(segment.node)) continue;
    const from = segment.node === range.startContainer ? range.startOffset : 0;
    const to = segment.node === range.endContainer ? range.endOffset : Number.POSITIVE_INFINITY;
    segment.offsets.forEach((offset, k) => {
      if (offset < from || offset >= to) return;
      if (start === -1) start = segment.start + k;
      end = segment.start + k + 1;
    });
  }
  while (start < end && index.text[start] === ' ') start++;
  while (end > start && index.text[end - 1] === ' ') end--;
  return start === -1 || start === end ? null : { start, end };
}

export function quoteOf(index: TextIndex, span: Span): TextQuote {
  return {
    exact: index.text.slice(span.start, span.end),
    prefix: index.text.slice(Math.max(0, span.start - context), span.start),
    suffix: index.text.slice(span.end, span.end + context),
  };
}

/** Where a quote is: of the places its words appear, the one whose neighbouring text matches best. */
export function findQuote(index: TextIndex, quote: TextQuote): Span | null {
  let best: Span | null = null;
  let bestScore = -1;
  for (
    let at = index.text.indexOf(quote.exact);
    at !== -1 && quote.exact;
    at = index.text.indexOf(quote.exact, at + 1)
  ) {
    const end = at + quote.exact.length;
    const score =
      sameEnd(index.text.slice(Math.max(0, at - quote.prefix.length), at), quote.prefix) +
      sameStart(index.text.slice(end, end + quote.suffix.length), quote.suffix);
    if (score > bestScore) {
      best = { start: at, end };
      bestScore = score;
    }
  }
  return best;
}

/**
 * Wraps a span's text in elements made by `mark`, one for each text node it crosses (leaving out
 * whitespace between blocks, like the gaps between table cells), and returns them.
 */
export function wrapSpan(index: TextIndex, span: Span, mark: () => HTMLElement) {
  const pieces: { node: Text; from: number; to: number }[] = [];
  for (const segment of index.segments) {
    if (segment.start >= span.end) break;
    const first = Math.max(span.start - segment.start, 0);
    const last = Math.min(span.end - segment.start, segment.offsets.length);
    if (first >= last) continue;
    const from = segment.offsets[first];
    const to = segment.offsets[last - 1] + 1;
    if (segment.node.data.slice(from, to).trim()) pieces.push({ node: segment.node, from, to });
  }
  return pieces.map(({ node, from, to }) => {
    const piece = from > 0 ? node.splitText(from) : node;
    if (to - from < piece.data.length) piece.splitText(to - from);
    const element = mark();
    piece.before(element);
    element.append(piece);
    return element;
  });
}

/** Puts a mark's text back where the mark was. */
export function unwrap(element: Element) {
  element.replaceWith(...element.childNodes);
}

function sameEnd(a: string, b: string) {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}

function sameStart(a: string, b: string) {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}
