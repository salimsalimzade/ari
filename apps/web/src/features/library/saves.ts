import type { FacetsResponse, SaveResponse } from '@ari/types';
import { type HighlightColor, highlightColors } from '@ari/ui-kit';
import { fill } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';

export type SaveKind = 'highlight' | 'clip' | 'import';

/** Where saves come from: a web page, or a file imported into the Library. */
export type Source = {
  id: string;
  kind: 'website' | 'file';
  /** The site's name, or the file's. */
  name: string;
  title: string;
  author?: string;
  url?: string;
};

/** One saved item: a highlight, a clipped section or a highlight imported from a file. */
export type Save = {
  id: string;
  kind: SaveKind;
  /** A highlight's or an import's color; clips have none. */
  color?: HighlightColor;
  /** What a clip shows. */
  clip?: 'table' | 'image';
  /** The marked words, or a clip's title. */
  text: string;
  /** A table clip's table, as Markdown. */
  contentMd?: string;
  /** An image clip's picture: a link that works for an hour. */
  imageUrl?: string;
  tags: string[];
  comment: string;
  savedAt: Date;
  source: Source;
  /** The page of a file it is on. */
  page?: number;
  /** The heading above it on a web page, e.g. "The scouts". */
  section?: string;
  /**
   * Saved from an import during this visit. ari-api doesn't import files yet, so it stays in this
   * page only.
   */
  isNew?: boolean;
};

/** "p. 4" for a save on a file's page, in the current language. */
export function usePageLabel() {
  const { t } = useI18n();
  return (save: Save) => (save.page ? fill(t().library.page, { n: save.page }) : undefined);
}

/** A source as ari-api sends it, alone or with a save. */
export function toSource(response: NonNullable<SaveResponse['source']>): Source {
  return {
    id: response.id ?? '',
    kind: response.kind === 'FILE' ? 'file' : 'website',
    name: response.name ?? '',
    title: response.title ?? response.name ?? '',
    author: response.author,
    url: response.url,
  };
}

/** A save as ari-api sends it, in the shape the pages use. */
export function toSave(response: SaveResponse): Save {
  return {
    id: response.id ?? '',
    kind: (response.kind?.toLowerCase() ?? 'highlight') as SaveKind,
    color: response.color?.toLowerCase() as HighlightColor | undefined,
    clip: response.clipType?.toLowerCase() as Save['clip'],
    text: response.text ?? '',
    contentMd: response.contentMd,
    imageUrl: response.imageUrl,
    tags: response.tags ?? [],
    comment: response.comment ?? '',
    savedAt: new Date(response.createdAt ?? 0),
    source: toSource(response.source ?? {}),
    page: response.pageNumber,
    section: response.section,
  };
}

/** A choice in a filter: a tag's name, a color, or a source's id with its name. */
export type FacetOption = { value: string; name?: string; count: number };

export type Facets = {
  /** The type tabs: how many saves of each type match the other filters. */
  counts: Record<'all' | SaveKind, number>;
  /** Over the whole Library, most used first; colors in the color picker's order. */
  tags: FacetOption[];
  colors: FacetOption[];
  sources: FacetOption[];
};

export function toFacets(response: FacetsResponse): Facets {
  const counts = { all: response.total ?? 0, highlight: 0, clip: 0, import: 0 };
  for (const type of response.types ?? []) {
    if (type.kind) counts[type.kind.toLowerCase() as SaveKind] = type.count ?? 0;
  }
  const colorCounts = new Map(
    (response.colors ?? []).map((color) => [color.color?.toLowerCase(), color.count ?? 0]),
  );
  const byCount = (a: FacetOption, b: FacetOption) => b.count - a.count;
  return {
    counts,
    tags: (response.tags ?? [])
      .map((tag) => ({ value: tag.name ?? '', count: tag.count ?? 0 }))
      .sort(byCount),
    colors: highlightColors.map((color) => ({ value: color, count: colorCounts.get(color) ?? 0 })),
    sources: (response.sources ?? [])
      .map((source) => ({ value: source.id ?? '', name: source.name, count: source.count ?? 0 }))
      .sort(byCount),
  };
}
