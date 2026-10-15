import type { NoteResponse, SaveResponse } from '@ari/types';
import { describe, expect, it } from 'vitest';
import { type ExportWords, exportFile, exportName } from './export-file';

const website = {
  id: 'site',
  kind: 'WEBSITE',
  name: 'Meadow Quarterly',
  title: 'How Honeybees Choose a New Home',
  author: 'J. Arden',
  url: 'https://meadowquarterly.example/honeybees',
} as const;
const book = { id: 'book', kind: 'FILE', name: 'bees.pdf', title: 'The Bee Book' } as const;

const saves: SaveResponse[] = [
  {
    id: 'a',
    kind: 'HIGHLIGHT',
    color: 'YELLOW',
    text: 'In late spring a colony splits in two.',
    comment: '=1+1, a formula',
    tags: ['bees', 'swarm'],
    section: 'Why swarms split',
    source: website,
    createdAt: '2026-10-10T10:00:00Z',
  },
  {
    id: 'b',
    kind: 'IMPORT',
    color: 'GREEN',
    text: 'Scouts "dance" for a site.',
    pageNumber: 6,
    source: book,
    createdAt: '2026-10-11T10:00:00Z',
  },
  {
    id: 'c',
    kind: 'IMPORT',
    color: 'BLUE',
    text: 'The queen leaves first.',
    pageNumber: 2,
    source: book,
    createdAt: '2026-10-12T10:00:00Z',
  },
];
const notes: NoteResponse[] = [
  {
    id: 'n',
    title: 'Swarm decisions',
    blocks: [
      { kind: 'TEXT', text: 'Who decides?' },
      { kind: 'QUOTE', save: saves[1] },
    ],
    createdAt: '2026-10-13T10:00:00Z',
    updatedAt: '2026-10-14T10:00:00Z',
  },
];
const words: ExportWords = {
  title: 'Ari export',
  notes: 'Notes',
  comment: 'Comment',
  untitledNote: 'Untitled note',
  page: (save) => (save.page ? `p. ${save.page}` : undefined),
};

describe('exportFile', () => {
  it('writes Markdown by source, newest source first and its saves by page', async () => {
    const text = await exportFile('md', { saves, notes }, words).text();
    expect(text).toContain('## The Bee Book\n\nbees.pdf');
    expect(text.indexOf('## The Bee Book')).toBeLessThan(text.indexOf('## How Honeybees'));
    expect(text.indexOf('The queen leaves first')).toBeLessThan(text.indexOf('Scouts'));
    expect(text).toContain('J. Arden · <https://meadowquarterly.example/honeybees>');
    expect(text).toContain('*Why swarms split · yellow · #bees #swarm · 2026-10-10*');
    expect(text).toContain('# Notes\n\n## Swarm decisions\n\nWho decides?\n\n> Scouts');
  });

  it('writes plain text with quotes, comments and notes', async () => {
    const text = await exportFile('txt', { saves, notes }, words).text();
    expect(text).toContain('“In late spring a colony splits in two.”\nComment: =1+1, a formula');
    expect(text).toContain(
      'Swarm decisions\n\nWho decides?\n\n“Scouts "dance" for a site.” (The Bee Book, p. 6)',
    );
  });

  it('writes a CSV row per save and per note, safe for spreadsheets', async () => {
    const file = exportFile('csv', { saves, notes }, words);
    // UTF-8's byte order mark, for Excel; text() leaves it out.
    expect([...new Uint8Array(await file.slice(0, 3).arrayBuffer())]).toEqual([0xef, 0xbb, 0xbf]);
    const text = await file.text();
    const lines = text.split('\r\n');
    expect(lines[0]).toBe(
      'type,color,text,comment,tags,section,page,source,source_title,author,url,saved_at',
    );
    expect(lines[1]).toContain(
      `highlight,yellow,In late spring a colony splits in two.,"'=1+1, a formula","bees, swarm"`,
    );
    expect(lines[2]).toContain('import,green,"Scouts ""dance"" for a site.",,,,6,bees.pdf');
    expect(text).toContain('note,,"Who decides?');
  });

  it('keeps ari-api’s saves and notes as they are in JSON', async () => {
    const parsed = JSON.parse(await exportFile('json', { saves, notes }, words).text());
    expect(parsed.saves).toEqual(saves);
    expect(parsed.notes).toEqual(notes);
  });

  it('names the file by the day and format', () => {
    expect(exportName('txt', new Date(2026, 9, 16))).toBe('ari-export-2026-10-16.txt');
  });
});
