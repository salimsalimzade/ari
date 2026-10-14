import type { SourceSummaryResponse } from '@ari/types';
import { type HighlightColor, highlightColors } from '@ari/ui-kit';
import { isThisYear } from 'date-fns';
import { type SaveKind, type Source, toSource } from '~/features/library/saves';
import { useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';

export type SourceKind = 'website' | 'file';

/** A website or file, with what is saved from it. */
export type SourceSummary = {
  source: Source;
  /** Every save from it. */
  saves: number;
  /** Its saves of each kind. */
  kinds: Record<SaveKind, number>;
  /** The colors its saves use, in the color picker's order. */
  colors: HighlightColor[];
  /** The newest save with a color, shown on its card. */
  latest?: { text: string; color: HighlightColor };
  /** The notes quoting its saves, the one changed most recently first. */
  notes: { id: string; title: string; quotes: number }[];
  firstSavedAt: Date;
  lastSavedAt: Date;
};

/** A source as ari-api sends it, in the shape the pages use. */
export function toSourceSummary(response: SourceSummaryResponse): SourceSummary {
  const used = new Set(response.colors?.map((color) => color.toLowerCase()));
  const latest = response.latestHighlight;
  return {
    source: toSource(response),
    saves: response.savesCount ?? 0,
    kinds: {
      highlight: response.highlightsCount ?? 0,
      clip: response.clipsCount ?? 0,
      import: response.importsCount ?? 0,
    },
    colors: highlightColors.filter((color) => used.has(color)),
    latest:
      latest?.text && latest.color
        ? { text: latest.text, color: latest.color.toLowerCase() as HighlightColor }
        : undefined,
    notes: (response.notes ?? []).map((note) => ({
      id: note.id ?? '',
      title: note.title ?? '',
      quotes: note.quotesCount ?? 0,
    })),
    firstSavedAt: new Date(response.firstSavedAt ?? 0),
    lastSavedAt: new Date(response.lastSavedAt ?? 0),
  };
}

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
  return (source: Source) =>
    source.kind === 'website' ? t().sources.website : (fileType(source.name) ?? t().sources.file);
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
