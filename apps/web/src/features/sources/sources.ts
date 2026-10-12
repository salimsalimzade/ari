import { type HighlightColor, highlightColors } from '@ari/ui-kit';
import { isThisYear } from 'date-fns';
import { createMemo } from 'solid-js';
import { useLibrary } from '~/features/library/library-store';
import type { Save, Source } from '~/features/library/sample';
import { useNotes } from '~/features/notes/notes-store';
import { useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';

export type SourceKind = 'website' | 'file';

/** A website or file, with the saves made from it. */
export type SourceSummary = {
  /** Its part of the address: /sources/meadow-quarterly. */
  slug: string;
  source: Source;
  kind: SourceKind;
  /** Newest first. */
  saves: Save[];
  /** The colors its saves use, in the color picker's order. */
  colors: HighlightColor[];
  /** The newest save with a color, shown on its card. */
  latest?: Save;
  /** Some of its saves are quoted in a note. */
  quoted: boolean;
};

/** "meadow-quarterly" for "Meadow Quarterly". Stands in for the id ari-api will give a source. */
export const sourceSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'source';

/** A file's type from its name, e.g. "PDF"; undefined without an extension. */
export const fileType = (name: string) =>
  name.includes('.') ? name.split('.').pop()?.toUpperCase() : undefined;

/** "Oct 8", with the year when it isn't this year's. */
export function useSaveDate() {
  const format = useFormat();
  return (date: Date) => (isThisYear(date) ? format.shortDate(date) : format.date(date));
}

/** "Website", or a file's type: "PDF". */
export function useKindLabel() {
  const { t } = useI18n();
  return (summary: SourceSummary) =>
    summary.kind === 'website'
      ? t().sources.website
      : (fileType(summary.source.name) ?? t().sources.file);
}

/**
 * The source's address with a text fragment, so the browser scrolls to the save and marks it.
 * Browsers without text fragments open the page at its top.
 */
export function spotUrl(url: string, text: string) {
  const words = text.trim().split(/\s+/);
  // "-" separates a fragment's parts, so it is escaped too.
  const encode = (part: string[]) => encodeURIComponent(part.join(' ')).replace(/-/g, '%2D');
  const fragment =
    words.length <= 8 ? encode(words) : `${encode(words.slice(0, 4))},${encode(words.slice(-4))}`;
  return `${url.split('#')[0]}#:~:text=${fragment}`;
}

/** The Library's saves by source, the one saved from most recently first. */
export function useSources() {
  const library = useLibrary();
  const notes = useNotes();

  const quotedIds = createMemo(
    () =>
      new Set(
        notes
          .list()
          .flatMap((note) => notes.quotesOf(note))
          .map((save) => save.id),
      ),
  );

  const list = createMemo(() => {
    // The saves are newest first, so the sources come out in the order they were last saved from.
    const groups = new Map<string, Save[]>();
    for (const save of library.saves()) {
      const saves = groups.get(save.source);
      if (saves) saves.push(save);
      else groups.set(save.source, [save]);
    }
    return [...groups].map(([name, saves]): SourceSummary => {
      const source = library.sourceOf(name);
      const used = new Set(saves.map((save) => save.color));
      return {
        slug: sourceSlug(name),
        source,
        kind: source.url ? 'website' : 'file',
        saves,
        colors: highlightColors.filter((color) => used.has(color)),
        latest: saves.find((save) => save.color),
        quoted: saves.some((save) => quotedIds().has(save.id)),
      };
    });
  });

  return {
    list,
    find: (slug: string) => list().find((summary) => summary.slug === slug),
    isQuoted: (saveId: string) => quotedIds().has(saveId),
  };
}
