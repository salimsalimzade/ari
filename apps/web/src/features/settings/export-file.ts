import type { NoteResponse, SaveResponse } from '@ari/types';
import { format } from 'date-fns';
import { type Save, type Source, toSave } from '~/features/library/saves';
import { type NotePart, noteAsMarkdown, noteAsText } from '~/features/notes/note-text';
import { toNote } from '~/features/notes/notes';

export type ExportFormat = 'md' | 'txt' | 'csv' | 'json';
/** What an export can hold: highlights (imported ones too), clips, and notes. */
export type ExportPart = 'highlights' | 'clips' | 'notes';

/** What the export holds: ari-api's saves and notes, as it sent them. */
export type ExportData = { saves: SaveResponse[]; notes: NoteResponse[] };

/** The words a file needs from the dictionaries, in the language picked. */
export type ExportWords = {
  title: string;
  notes: string;
  comment: string;
  untitledNote: string;
  /** "p. 4" for a save on a file's page. */
  page: (save: Save) => string | undefined;
};

export const exportTypes: Record<ExportFormat, string> = {
  md: 'text/markdown',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
};

/** "ari-export-2026-10-16.md" */
export const exportName = (exportFormat: ExportFormat, date = new Date()) =>
  `ari-export-${format(date, 'yyyy-MM-dd')}.${exportFormat}`;

const day = (date: Date) => format(date, 'yyyy-MM-dd');

/** The saves of each source together, the source saved from most recently first. */
function bySource(saves: Save[]) {
  const sources = new Map<string, { source: Source; saves: Save[] }>();
  for (const save of [...saves].sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime())) {
    const group = sources.get(save.source.id) ?? { source: save.source, saves: [] };
    group.saves.push(save);
    sources.set(save.source.id, group);
  }
  // Within a source, in reading order: by page for a file, then as they were saved.
  for (const group of sources.values()) {
    group.saves.sort(
      (a, b) => (a.page ?? 0) - (b.page ?? 0) || a.savedAt.getTime() - b.savedAt.getTime(),
    );
  }
  return [...sources.values()];
}

/** "Why swarms split · p. 4 · yellow · #bees #swarm · 2026-10-16" */
const details = (save: Save, words: ExportWords) =>
  [
    save.section,
    words.page(save),
    save.color,
    save.tags.map((tag) => `#${tag}`).join(' '),
    day(save.savedAt),
  ]
    .filter(Boolean)
    .join(' · ');

/** "J. Arden · https://…", or the file's name. */
const sourceLine = (source: Source) =>
  [source.author, source.url ?? (source.name !== source.title ? source.name : undefined)]
    .filter(Boolean)
    .join(' · ');

/** A note's paragraphs and quotes, each quote with the save it shows. */
function notePartsOf(response: NoteResponse, words: ExportWords) {
  const note = toNote(response);
  const parts = note.blocks.flatMap((block): NotePart[] => {
    if (block.kind === 'text') return [{ kind: 'text', text: block.text }];
    const save = note.quoted[block.saveId];
    return save ? [{ kind: 'quote', save, source: save.source, page: words.page(save) }] : [];
  });
  return { title: note.title || words.untitledNote, updatedAt: note.updatedAt, parts };
}

const quoted = (text: string) =>
  text
    .split('\n')
    .map((line) => `> ${line}`.trimEnd())
    .join('\n');

function asMarkdown(data: ExportData, words: ExportWords) {
  const blocks = [`# ${words.title}`];
  for (const { source, saves } of bySource(data.saves.map(toSave))) {
    const line = sourceLine(source);
    blocks.push(`## ${source.title}`);
    if (line) blocks.push(source.url ? line.replace(source.url, `<${source.url}>`) : line);
    for (const save of saves) {
      blocks.push(quoted(save.text));
      if (save.contentMd) blocks.push(save.contentMd);
      if (save.comment) blocks.push(`**${words.comment}:** ${save.comment}`);
      blocks.push(`*${details(save, words)}*`);
    }
  }
  if (data.notes.length) {
    blocks.push(`# ${words.notes}`);
    for (const note of data.notes.map((response) => notePartsOf(response, words))) {
      blocks.push(noteAsMarkdown(note.title, note.parts, '##').trim());
    }
  }
  return `${blocks.join('\n\n')}\n`;
}

function asText(data: ExportData, words: ExportWords) {
  const blocks = [words.title];
  for (const { source, saves } of bySource(data.saves.map(toSave))) {
    blocks.push([source.title, sourceLine(source)].filter(Boolean).join('\n'));
    for (const save of saves) {
      blocks.push(
        [
          `“${save.text}”`,
          save.contentMd,
          save.comment && `${words.comment}: ${save.comment}`,
          details(save, words),
        ]
          .filter(Boolean)
          .join('\n'),
      );
    }
  }
  if (data.notes.length) {
    blocks.push(words.notes);
    for (const note of data.notes.map((response) => notePartsOf(response, words))) {
      blocks.push(noteAsText(note.title, note.parts));
    }
  }
  return `${blocks.join('\n\n')}\n`;
}

const csvColumns = [
  'type',
  'color',
  'text',
  'comment',
  'tags',
  'section',
  'page',
  'source',
  'source_title',
  'author',
  'url',
  'saved_at',
] as const;

type CsvRow = Partial<Record<(typeof csvColumns)[number], string | number>>;

// Quoted when it has to be; a cell starting like a formula gets a ' so a spreadsheet shows it.
const cell = (value: string | number | undefined) => {
  const text = String(value ?? '').replace(/^[=+\-@\t\r]/, "'$&");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

function asCsv(data: ExportData, words: ExportWords) {
  const rows = data.saves.map(toSave).map(
    (save): CsvRow => ({
      type: save.kind,
      color: save.color,
      text: save.contentMd ? `${save.text}\n\n${save.contentMd}` : save.text,
      comment: save.comment,
      tags: save.tags.join(', '),
      section: save.section,
      page: save.page,
      source: save.source.name,
      source_title: save.source.title,
      author: save.source.author,
      url: save.source.url,
      saved_at: save.savedAt.toISOString(),
    }),
  );
  // A note is a row of its own: its title, and its text with its quotes.
  for (const note of data.notes.map((response) => notePartsOf(response, words))) {
    rows.push({
      type: 'note',
      text: noteAsText('', note.parts),
      source_title: note.title,
      saved_at: note.updatedAt.toISOString(),
    });
  }
  const lines = [csvColumns, ...rows.map((row) => csvColumns.map((column) => row[column]))];
  // The byte order mark tells Excel the file is UTF-8, so "ə" and "ş" show.
  return `\uFEFF${lines.map((line) => line.map(cell).join(',')).join('\r\n')}\r\n`;
}

/** The export as one file in the format picked. */
export function exportFile(exportFormat: ExportFormat, data: ExportData, words: ExportWords) {
  const text =
    exportFormat === 'md'
      ? asMarkdown(data, words)
      : exportFormat === 'txt'
        ? asText(data, words)
        : exportFormat === 'csv'
          ? asCsv(data, words)
          : `${JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2)}\n`;
  return new Blob([text], { type: `${exportTypes[exportFormat]};charset=utf-8` });
}
