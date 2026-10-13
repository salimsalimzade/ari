import { type HighlightColor, highlightColors } from '@ari/ui-kit';
import type { Save } from '../saves/store';
import { findQuote, indexText, unwrap, wrapSpan } from './text-quote';

/** The element around a highlight's words: a name of its own, so a page's styles for mark miss it. */
const markTag = 'ari-mark';

type MarkColors = Record<HighlightColor, string> & { ring: string };

/**
 * The design tokens' highlight colors, read where Ari's UI is drawn: marks sit in the page, which
 * doesn't have the tokens, so they get the colors as inline styles.
 */
export function markColors(element: Element): MarkColors {
  const style = getComputedStyle(element);
  const token = (name: string) => style.getPropertyValue(`--ari-${name}`).trim();
  const colors = Object.fromEntries(highlightColors.map((color) => [color, token(`hl-${color}`)]));
  return { ...(colors as Record<HighlightColor, string>), ring: token('action-primary') };
}

/** The id of the highlight an event happened on, if it did. */
export function markIdAt(target: EventTarget | null) {
  return target instanceof Element ? target.closest(markTag)?.getAttribute('data-ari-id') : null;
}

/** The page's highlight marks. */
export function createMarks(document: Document, colors: MarkColors) {
  const marks = new Map<string, HTMLElement[]>();
  let saves = new Map<string, Save>();
  let active: string | null = null;

  const paint = (element: HTMLElement, save: Save) => {
    // !important and the basics spelled out: a page's styles must not restyle its highlights.
    const style = (name: string, value: string) =>
      element.style.setProperty(name, value, 'important');
    style('background-color', colors[save.color ?? 'yellow']);
    style('box-shadow', save.id === active ? `0 0 0 2px ${colors.ring}` : 'none');
    style('color', 'inherit');
    style('border-radius', '3px');
    style('cursor', 'pointer');
    style('box-decoration-break', 'clone');
  };

  const mark = (save: Save) => {
    const index = indexText(document.body);
    const span = findQuote(index, {
      exact: save.text,
      prefix: save.prefix ?? '',
      suffix: save.suffix ?? '',
    });
    if (!span) return null;
    return wrapSpan(index, span, () => {
      const element = document.createElement(markTag);
      element.setAttribute('data-ari-id', save.id);
      return element;
    });
  };

  return {
    /**
     * Makes the marks match the page's highlights: removes deleted ones, recolors changed ones and
     * marks new ones. Returns how many it couldn't find; a page that loads its text late may still.
     */
    sync(next: Save[]) {
      saves = new Map(next.filter((save) => save.kind === 'HIGHLIGHT').map((s) => [s.id, s]));
      for (const [id, elements] of marks) {
        // A page that renders again drops our marks with its old text; those are found again.
        if (saves.has(id) && elements.every((element) => element.isConnected)) continue;
        for (const element of elements) if (element.isConnected) unwrap(element);
        marks.delete(id);
      }
      let missing = 0;
      for (const save of saves.values()) {
        const elements = marks.get(save.id) ?? mark(save);
        if (!elements) {
          missing++;
          continue;
        }
        marks.set(save.id, elements);
        for (const element of elements) paint(element, save);
      }
      return missing;
    },
    /** Rings a highlight and scrolls to it, as when it is picked in the side panel. */
    focus(id: string) {
      active = id;
      for (const [markId, elements] of marks) {
        const save = saves.get(markId);
        if (save) for (const element of elements) paint(element, save);
      }
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      marks.get(id)?.[0]?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    },
  };
}
