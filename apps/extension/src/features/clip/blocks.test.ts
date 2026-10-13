import { beforeEach, describe, expect, it } from 'vitest';
import { blockAt, captionOf, markdownTable, tableRows } from './blocks';

beforeEach(() => {
  document.body.innerHTML = `
    <article>
      <h2>Where scouts look</h2>
      <blockquote><p id="quoted">No single bee compares all of the options.</p></blockquote>
      <ul><li id="item">A hollow oak</li></ul>
      <p id="plain">Each scout <em id="word">measures</em> a cavity.</p>
      <table>
        <caption> Table 1.  Sites the scouts reported </caption>
        <tr><th>Site</th><th>Volume</th></tr>
        <tr><td id="cell">Hollow oak | north</td><td>42 L</td></tr>
        <tr><td>Rock crevice</td></tr>
      </table>
      <figure><img alt="A swarm on a post"><figcaption>Figure 1. A swarm resting</figcaption></figure>
    </article>`;
});

const at = (id: string) => blockAt(document.getElementById(id));

describe('blockAt', () => {
  it('finds the block a click is in', () => {
    expect(at('word')?.kind).toBe('paragraph');
    expect(at('item')?.kind).toBe('list');
    expect(at('cell')?.kind).toBe('table');
  });

  it('clips a whole quote, not the paragraph inside it', () => {
    expect(at('quoted')?.element.tagName).toBe('BLOCKQUOTE');
  });
});

describe('tableRows and markdownTable', () => {
  it('turns a table into Markdown, escaping pipes and padding short rows', () => {
    const rows = tableRows(document.querySelector('table') as HTMLTableElement);
    expect(markdownTable(rows)).toBe(
      [
        '| Site | Volume |',
        '| --- | --- |',
        '| Hollow oak \\| north | 42 L |',
        '| Rock crevice |  |',
      ].join('\n'),
    );
  });
});

describe('captionOf', () => {
  it('reads a table caption and a figure caption', () => {
    expect(captionOf(document.getElementById('cell') as Element)).toBe(
      'Table 1. Sites the scouts reported',
    );
    expect(captionOf(document.querySelector('img') as Element)).toBe('Figure 1. A swarm resting');
  });

  it('has nothing to say about a plain paragraph, or a box around the whole article', () => {
    expect(captionOf(document.getElementById('plain') as Element)).toBeUndefined();
    expect(captionOf(document.querySelector('article') as Element)).toBeUndefined();
  });
});
