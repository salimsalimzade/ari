import { type Accessor, createEffect, createSignal, onCleanup, onMount } from 'solid-js';

/** Where a floating element points, in viewport pixels. */
export type Anchor = { left: number; top: number; bottom: number };

const margin = 8;

/**
 * A number that changes once per frame while the page scrolls or resizes. Positions that read it
 * follow the page, like the toolbar over a selection.
 */
export function createFrame() {
  const [frame, setFrame] = createSignal(0);
  onMount(() => {
    let request = 0;
    const tick = () => {
      cancelAnimationFrame(request);
      request = requestAnimationFrame(() => setFrame((n) => n + 1));
    };
    // Capture, to hear scrolling inside a page's own scroll boxes too.
    window.addEventListener('scroll', tick, { capture: true, passive: true });
    window.addEventListener('resize', tick, { passive: true });
    onCleanup(() => {
      cancelAnimationFrame(request);
      window.removeEventListener('scroll', tick, { capture: true });
      window.removeEventListener('resize', tick);
    });
  });
  return frame;
}

/**
 * Keeps a fixed element next to its anchor and inside the viewport: on the preferred side when it
 * fits there, on the other one when it doesn't, and hidden while the anchor is scrolled away.
 */
export function createFloating(anchor: Accessor<Anchor | undefined>, side: 'above' | 'below') {
  const [element, setElement] = createSignal<HTMLElement>();
  const [size, setSize] = createSignal({ width: 0, height: 0 });

  createEffect(() => {
    const current = element();
    if (!current) return;
    const observer = new ResizeObserver(() =>
      setSize({ width: current.offsetWidth, height: current.offsetHeight }),
    );
    observer.observe(current);
    onCleanup(() => observer.disconnect());
  });

  const style = () => {
    const at = anchor();
    if (!at || at.bottom < 0 || at.top > window.innerHeight)
      return { visibility: 'hidden' } as const;
    const { width, height } = size();
    const gap = 10;
    const above = at.top - gap - height;
    const below = at.bottom + gap;
    const fitsAbove = above >= margin;
    const fitsBelow = below + height <= window.innerHeight - margin;
    const top =
      side === 'above'
        ? fitsAbove || !fitsBelow
          ? above
          : below
        : fitsBelow || !fitsAbove
          ? below
          : above;
    const left = Math.min(Math.max(margin, at.left), window.innerWidth - width - margin);
    return { top: `${Math.max(margin, top)}px`, left: `${Math.max(margin, left)}px` };
  };

  return { ref: setElement, style };
}

/** A range's anchor: where its first line starts, and how far its lines reach up and down. */
export function rangeAnchor(range: Range): Anchor | undefined {
  const first = range.getClientRects()[0];
  const box = range.getBoundingClientRect();
  return first ? { left: first.left, top: box.top, bottom: box.bottom } : undefined;
}
