import { Button, Logo } from '@ari/ui-kit';
import {
  type Accessor,
  createResource,
  createSignal,
  Index,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';
import { fill, plural, t } from '~/i18n/i18n';
import { ScissorsIcon } from '~/icons';
import { sendToBackground } from '~/messages';
import { headingAbove } from '../page/page-source';
import { recentTags, rememberTags } from '../saves/settings';
import { newId, type PageStore, type Save, type Source } from '../saves/store';
import { type Block, blockAt, captionOf, markdownTable, tableRows } from './blocks';
import styles from './clip.module.scss';
import { type ClipDetails, ClipPanel, type Draft } from './clip-panel';
import { visiblePart } from './crop';
import { type ImageDetails, ImagePanel } from './image-panel';

type Picked = { element: Element; image: HTMLImageElement };
type Box = { x0: number; y0: number; x1: number; y1: number };
type Outline = { rect: DOMRect; number?: number; dashed?: boolean };

// A press that moves further than this drags a box instead of clicking.
const dragDistance = 6;

/**
 * Clip mode: the page dims, the block under the pointer is outlined, and a click clips it (a
 * table as Markdown, an image into a set of picked images, anything else as a screenshot), or a
 * dragged box clips that part of the page. Then a panel asks for the clip's details.
 */
export function ClipMode(props: {
  store: PageStore;
  source: () => Source;
  frame: Accessor<number>;
  onSaved: (saves: Save[], text: string, images: Element[]) => void;
  onClose: () => void;
}) {
  const [hovered, setHovered] = createSignal<Block | null>(null);
  const [images, setImages] = createSignal<Picked[]>([]);
  const [box, setBox] = createSignal<Box | null>(null);
  const [draft, setDraft] = createSignal<Draft | null>(null);
  const [reviewing, setReviewing] = createSignal(false);
  const [capturing, setCapturing] = createSignal(false);
  const [failed, setFailed] = createSignal(false);
  const [suggestions] = createResource(() => recentTags.getValue(), { initialValue: [] });
  let catcher: HTMLDivElement | undefined;

  const picking = () => !draft() && !reviewing();

  // The page under the pointer: the catcher steps aside for a moment so the browser can find it.
  const elementAt = (x: number, y: number) => {
    if (catcher) catcher.style.pointerEvents = 'none';
    const element = document.elementFromPoint(x, y);
    if (catcher) catcher.style.pointerEvents = '';
    return element;
  };

  const titleOf = (element: Element) =>
    captionOf(element) ?? headingAbove(element) ?? props.source().title;

  const outlines = (): Outline[] => {
    props.frame();
    const list: Outline[] = images().map((picked, i) => ({
      rect: grow(picked.element.getBoundingClientRect(), 6),
      number: i + 1,
    }));
    const block = hovered();
    if (block && !images().some((picked) => picked.element === block.element)) {
      const image = block.kind === 'image';
      list.push({
        rect: grow(block.element.getBoundingClientRect(), image ? 6 : 8),
        dashed: image,
      });
    }
    return list;
  };

  const dimStyle = () => {
    if (!picking()) return {};
    const holes = outlines()
      .map((outline) => roundedRect(outline.rect, 12))
      .join('');
    const page = `M0 0H${window.innerWidth}V${window.innerHeight}H0Z`;
    return holes ? { 'clip-path': `path(evenodd, "${page}${holes}")` } : {};
  };

  const label = () => {
    const block = hovered();
    if (!block || box()) return undefined;
    const text = block.kind === 'image' ? t.clip.clickToSelect : t.clip.clickToClip;
    const rect = grow(block.element.getBoundingClientRect(), 8);
    props.frame();
    return {
      text: fill(text, { kind: t.clip.kinds[block.kind] }),
      left: Math.max(8, rect.left),
      top: rect.top - 38 >= 8 ? rect.top - 38 : rect.top + 8,
    };
  };

  const dragged = () => {
    const current = box();
    return current && isDrag(current) ? boxRect(current) : undefined;
  };

  function pick(block: Block | null) {
    if (!block) return;
    const image = block.image;
    if (image) {
      setImages((list) =>
        list.some((picked) => picked.image === image)
          ? list.filter((picked) => picked.image !== image)
          : [...list, { element: block.element, image }],
      );
      return;
    }
    // While images are being picked, a click only picks images.
    if (images().length) return;
    if (block.kind === 'table') {
      const table = block.element as HTMLTableElement;
      setDraft({
        kind: 'table',
        rows: tableRows(table),
        title: titleOf(table),
        section: headingAbove(table),
      });
      return;
    }
    void clipElement(block.element);
  }

  async function clipElement(element: Element) {
    const rect = element.getBoundingClientRect();
    if (rect.height <= window.innerHeight && (rect.top < 0 || rect.bottom > window.innerHeight)) {
      element.scrollIntoView({ block: 'nearest' });
      await paint();
    }
    // The same margin the outline showed around it.
    await clipArea(grow(element.getBoundingClientRect(), 8), element);
  }

  async function clipArea(rect: DOMRect, element?: Element) {
    const area = visiblePart(rect);
    if (!area) return;
    const at = element ?? elementAt(area.left + 1, area.top + 1);
    setFailed(false);
    setHovered(null);
    // Ari's own overlay stays out of the screenshot.
    setCapturing(true);
    await paint();
    const image = await sendToBackground<string | null>({
      type: 'capture',
      area,
      viewportWidth: window.innerWidth,
    }).catch(() => null);
    setCapturing(false);
    if (!image) {
      setFailed(true);
      return;
    }
    setDraft({
      kind: 'shot',
      image,
      title: at ? titleOf(at) : props.source().title,
      section: at ? headingAbove(at) : undefined,
    });
  }

  const imageItems = () =>
    images().map(({ image }, i) => ({
      src: image.currentSrc || image.src,
      caption: captionOf(image) ?? fill(t.clip.imageCaption, { n: i + 1 }),
    }));

  async function saveDraft(details: ClipDetails) {
    const current = draft();
    if (!current) return;
    const save: Save = {
      id: newId(),
      kind: 'CLIP',
      clipType: current.kind === 'table' ? 'TABLE' : 'IMAGE',
      text: details.title.trim() || props.source().title,
      contentMd: current.kind === 'table' ? markdownTable(current.rows) : undefined,
      imageUrl: current.kind === 'shot' ? current.image : undefined,
      comment: details.comment.trim() || undefined,
      section: current.section,
      tags: details.tags,
      createdAt: new Date().toISOString(),
    };
    await props.store.add(props.source(), [save]);
    await rememberTags(details.tags);
    props.onSaved([save], t.toast.clipSaved, []);
  }

  async function saveImages(details: ImageDetails) {
    const picked = images();
    const createdAt = new Date().toISOString();
    const saves: Save[] = imageItems().map((item, i) => ({
      id: newId(),
      kind: 'CLIP',
      clipType: 'IMAGE',
      text: item.caption,
      imageUrl: item.src,
      comment: details.comments[i]?.trim() || undefined,
      section: headingAbove(picked[i].image),
      tags: details.tags,
      createdAt,
    }));
    await props.store.add(props.source(), saves);
    await rememberTags(details.tags);
    props.onSaved(
      saves,
      plural(saves.length, t.toast.imagesSaved),
      picked.map(({ image }) => image),
    );
  }

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!picking()) return;
      if (event.key === 'Escape') props.onClose();
      else if (event.key === 'Enter' && images().length) setReviewing(true);
      else return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('keydown', onKeyDown, true);
    onCleanup(() => window.removeEventListener('keydown', onKeyDown, true));
  });

  return (
    <div class={styles.clip} data-capturing={capturing() ? '' : undefined}>
      <div class={styles.dim} style={dimStyle()} />
      <Show when={picking()}>
        <div
          ref={catcher}
          class={styles.catcher}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            setBox({ x0: event.clientX, y0: event.clientY, x1: event.clientX, y1: event.clientY });
          }}
          onPointerMove={(event) => {
            const current = box();
            if (!current) {
              setHovered(blockAt(elementAt(event.clientX, event.clientY)));
              return;
            }
            const next = { ...current, x1: event.clientX, y1: event.clientY };
            setBox(next);
            if (isDrag(next)) setHovered(null);
          }}
          onPointerUp={(event) => {
            const current = box();
            setBox(null);
            if (!current) return;
            if (!isDrag(current)) pick(blockAt(elementAt(event.clientX, event.clientY)));
            else if (!images().length) void clipArea(boxRect(current));
          }}
          onPointerLeave={() => setHovered(null)}
        />
        <Index each={outlines()}>
          {(outline) => (
            <>
              <div
                class={styles.outline}
                data-dashed={outline().dashed ? '' : undefined}
                style={rectStyle(outline().rect)}
              />
              <Show when={outline().number}>
                {(number) => (
                  <span
                    class={styles.number}
                    style={{
                      left: `${outline().rect.left - 10}px`,
                      top: `${outline().rect.top - 10}px`,
                    }}
                  >
                    {number()}
                  </span>
                )}
              </Show>
            </>
          )}
        </Index>
        <Show when={label()}>
          {(at) => (
            <span class={styles.label} style={{ left: `${at().left}px`, top: `${at().top}px` }}>
              <ScissorsIcon />
              {at().text}
            </span>
          )}
        </Show>
        <Show when={dragged()}>
          {(rect) => <div class={styles.box} style={rectStyle(rect())} />}
        </Show>
        <div class={styles.bar} role="status">
          <Logo size={20} />
          <Show
            when={images().length}
            fallback={
              <>
                {t.clip.bar}
                <span class={styles['bar-hint']}>
                  {failed() ? t.clip.captureFailed : t.clip.barHint}
                </span>
              </>
            }
          >
            {(count) => (
              <>
                {plural(count(), t.clip.imagesSelected)}
                <span class={styles['bar-hint']}>{t.clip.imagesHint}</span>
                <Button variant="primary" onClick={() => setReviewing(true)}>
                  {fill(t.clip.saveImages, { n: count() })}
                </Button>
              </>
            )}
          </Show>
          <Button onClick={() => props.onClose()}>{t.clip.cancel}</Button>
        </div>
      </Show>
      <Show when={draft()}>
        {(current) => (
          <ClipPanel
            draft={current()}
            source={props.source()}
            suggestions={suggestions()}
            onSave={(details) => void saveDraft(details)}
            onReselect={() => setDraft(null)}
            onClose={() => props.onClose()}
          />
        )}
      </Show>
      <Show when={reviewing() && images().length}>
        <ImagePanel
          items={imageItems()}
          source={props.source()}
          suggestions={suggestions()}
          onRemove={(index) => {
            setImages((list) => list.filter((_, i) => i !== index));
            if (!images().length) setReviewing(false);
          }}
          onSave={(details) => void saveImages(details)}
          onBack={() => setReviewing(false)}
          onClose={() => props.onClose()}
        />
      </Show>
    </div>
  );
}

// Two frames and a moment: long enough for a change to be on screen before a screenshot.
function paint() {
  return new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 30))),
  );
}

function isDrag(box: Box) {
  return Math.abs(box.x1 - box.x0) > dragDistance || Math.abs(box.y1 - box.y0) > dragDistance;
}

function boxRect(box: Box) {
  const left = Math.min(box.x0, box.x1);
  const top = Math.min(box.y0, box.y1);
  return new DOMRect(left, top, Math.abs(box.x1 - box.x0), Math.abs(box.y1 - box.y0));
}

function grow(rect: DOMRect, by: number) {
  return new DOMRect(rect.left - by, rect.top - by, rect.width + 2 * by, rect.height + 2 * by);
}

function rectStyle(rect: DOMRect) {
  return {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}

// A rounded rectangle as SVG path commands, for the holes the outlined blocks cut in the dimming.
function roundedRect(rect: DOMRect, radius: number) {
  const { left: x, top: y, width: w, height: h } = rect;
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  return (
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}` +
    `A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
}
