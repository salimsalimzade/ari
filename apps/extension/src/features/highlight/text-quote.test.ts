import { beforeEach, describe, expect, it } from 'vitest';
import { findQuote, indexText, quoteOf, spanOf, unwrap, wrapSpan } from './text-quote';

const mark = () => document.createElement('ari-mark');

beforeEach(() => {
  document.body.innerHTML = `
    <article>
      <h1>How Honeybees   Choose a New Home</h1>
      <p>This is a swarm, and it is <em>not lost</em>. The scouts fly out.</p>
      <p>The scouts fly out again the next day.</p>
      <script>const scouts = 'fly out';</script>
    </article>`;
});

function rangeOver(node: Node, start: number, end: number) {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  return range;
}

describe('indexText', () => {
  it('collapses whitespace, separates blocks and leaves out scripts', () => {
    expect(indexText(document.body).text.trim()).toBe(
      'How Honeybees Choose a New Home This is a swarm, and it is not lost. The scouts fly out. The scouts fly out again the next day.',
    );
  });
});

describe('spanOf and quoteOf', () => {
  it('reads a selection across elements, trimmed', () => {
    const paragraph = document.querySelectorAll('p')[0];
    const range = document.createRange();
    range.setStart(paragraph.firstChild as Text, 'This is a swarm, and it is'.length);
    range.setEnd(paragraph.querySelector('em')?.firstChild as Text, 'not lost'.length);
    const index = indexText(document.body);
    const span = spanOf(index, range);
    expect(span && quoteOf(index, span).exact).toBe('not lost');
  });

  it('gives nothing for a selection of spaces', () => {
    const paragraph = document.querySelectorAll('p')[0].firstChild as Text;
    expect(spanOf(indexText(document.body), rangeOver(paragraph, 4, 5))).toBeNull();
  });
});

describe('findQuote', () => {
  it('tells repeated words apart by the text around them', () => {
    const second = document.querySelectorAll('p')[1].firstChild as Text;
    const index = indexText(document.body);
    const span = spanOf(index, rangeOver(second, 4, 'The scouts fly out'.length));
    expect(span).not.toBeNull();
    const quote = quoteOf(index, span as NonNullable<typeof span>);
    expect(quote.exact).toBe('scouts fly out');
    expect(findQuote(index, quote)).toEqual(span);
  });

  it('gives nothing for words that are no longer on the page', () => {
    const index = indexText(document.body);
    expect(findQuote(index, { exact: 'a hollow oak', prefix: '', suffix: '' })).toBeNull();
  });
});

describe('wrapSpan and unwrap', () => {
  it('marks the words in each text node they cross, then puts them back', () => {
    const index = indexText(document.body);
    const span = findQuote(index, { exact: 'it is not lost', prefix: '', suffix: '' });
    const marks = wrapSpan(index, span as NonNullable<typeof span>, mark);
    expect(marks.map((element) => element.textContent)).toEqual(['it is ', 'not lost']);
    expect(indexText(document.body).text).toBe(index.text);

    for (const element of marks) unwrap(element);
    expect(document.querySelector('ari-mark')).toBeNull();
    expect(document.querySelectorAll('p')[0].textContent).toBe(
      'This is a swarm, and it is not lost. The scouts fly out.',
    );
  });

  it('marks a heading with extra spaces in it', () => {
    const index = indexText(document.body);
    const span = findQuote(index, { exact: 'Honeybees Choose', prefix: 'How ', suffix: '' });
    const marks = wrapSpan(index, span as NonNullable<typeof span>, mark);
    expect(marks.map((element) => element.textContent)).toEqual(['Honeybees   Choose']);
  });
});
