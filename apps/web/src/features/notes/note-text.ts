import type { Save, Source } from '~/features/library/sample';

/** A note's paragraph, or one of its quotes with the save and source it comes from. */
export type NotePart =
  | { kind: 'text'; text: string }
  | { kind: 'quote'; save: Save; source: Source };

// "J. Arden, How Honeybees Choose a New Home, p. 6", like the Library's copy with citation.
const citation = (save: Save, source: Source) =>
  [source.author, source.title, save.page].filter(Boolean).join(', ');

const join = (blocks: string[]) => blocks.filter((block) => block.trim()).join('\n\n');

/** The note as plain text: the title, then each paragraph and “quote” (citation). */
export function noteAsText(title: string, parts: NotePart[]) {
  return join([
    title,
    ...parts.map((part) =>
      part.kind === 'text'
        ? part.text
        : `“${part.save.text}” (${citation(part.save, part.source)})`,
    ),
  ]);
}

/** The note as Markdown: quotes become blockquotes, with a link to their source when it has one. */
export function noteAsMarkdown(title: string, parts: NotePart[]) {
  const blocks = parts.map((part) => {
    if (part.kind === 'text') return part.text;
    const where = citation(part.save, part.source);
    const cited = part.source.url ? `[${where}](${part.source.url})` : where;
    return `> ${part.save.text}\n>\n> — ${cited}`;
  });
  return `${join([`# ${title}`, ...blocks])}\n`;
}

/** "swarm-decisions-essay-draft": a title as a file name, keeping letters of any language. */
export function fileName(title: string) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
}

/** Saves text as a file through the browser's download. */
export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url));
}
