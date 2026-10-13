import { fill, t } from '~/i18n/i18n';
import type { PageSaves, Save } from '../saves/store';

/** The saves in the order they were made. */
export function inOrder(saves: Save[]) {
  return [...saves].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** A page's saves as plain text for Copy all: each quote with its comment, then the source. */
export function copyText(page: PageSaves) {
  const parts = inOrder(page.saves).map((save) => {
    const body =
      save.clipType === 'TABLE'
        ? `${save.text}\n\n${save.contentMd ?? ''}`
        : save.kind === 'CLIP'
          ? save.text
          : `“${save.text}”`;
    return save.comment
      ? `${body}\n${fill(t.panel.copiedComment, { comment: save.comment })}`
      : body;
  });
  const { title, siteName, url } = page.source;
  return [...parts, `${title} · ${siteName}\n${url}`].join('\n\n');
}
