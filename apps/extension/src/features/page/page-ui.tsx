import { type HighlightColor, highlightColors } from '@ari/ui-kit';
import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { browser } from 'wxt/browser';
import { language, t } from '~/i18n/i18n';
import { type Message, type SaveSelectionResult, sendToBackground } from '~/messages';
import { account } from '../account/session';
import { useAccount } from '../account/use-account';
import { ClipMode } from '../clip/clip-mode';
import { HoverCard } from '../highlight/hover-card';
import { createMarks, markColors, markIdAt } from '../highlight/marks';
import { isEditable, selectedRange } from '../highlight/selection';
import { CommentBox, type Draft, SelectionToolbar } from '../highlight/selection-toolbar';
import { indexText, quoteOf, spanOf } from '../highlight/text-quote';
import {
  lastColor,
  type PanelSide,
  panelSide,
  panelWindows,
  rememberTags,
  showOnPage,
  signInShown,
} from '../saves/settings';
import {
  newId,
  ownSaves,
  type PageSaves,
  type PageStore,
  type Save,
  type Source,
} from '../saves/store';
import { SidePanel } from '../side-panel/side-panel';
import { type Anchor, createFrame, rangeAnchor } from './floating';
import { PanelNote, SavedBadges, SignInCard, Toast, type ToastMessage } from './notices';
import styles from './page.module.scss';
import { headingAbove } from './page-source';

// How long a toast stays, and how long the pointer can be off a highlight before its card closes.
const toastTime = 6000;
const noteTime = 2500;
const hoverDelay = 250;
const leaveDelay = 300;
// How often a page that loads its text late is searched again for highlights not found yet.
const retries = 10;
// The side panel's width (.panel in side-panel.module.scss): the page's content moves aside by it.
const panelWidth = 380;

/**
 * Everything Ari draws on a page: the selection toolbar, the highlights and their hover card, the
 * side panel, clip mode, the toasts. The content script mounts it in a shadow root on every
 * website; the welcome tab mounts it as it is, with `practice` saves.
 */
export function PageUi(props: { store: PageStore; source: () => Source; practice?: boolean }) {
  let layer!: HTMLDivElement;
  const frame = createFrame();
  const [page, setPage] = createSignal<PageSaves | null>(null);
  const [loaded, setLoaded] = createSignal(false);
  const [visible, setVisible] = createSignal(true);
  const [color, setColor] = createSignal<HighlightColor>('yellow');
  const [picked, setPicked] = createSignal<Range | null>(null);
  const [commenting, setCommenting] = createSignal(false);
  const [draft, setDraft] = createSignal<Draft>({ comment: '', tags: [] });
  const [hovered, setHovered] = createSignal<{ id: string; element: Element } | null>(null);
  const [toast, setToast] = createSignal<ToastMessage | null>(null);
  const [badges, setBadges] = createSignal<Element[]>([]);
  const [signIn, setSignIn] = createSignal(false);
  const [note, setNote] = createSignal<Anchor | null>(null);
  const [clipping, setClipping] = createSignal(false);
  // The side panel is open in some windows (as Firefox's own sidebar would be), on one side.
  const [windowId, setWindowId] = createSignal<number>();
  const [openIn, setOpenIn] = createSignal<number[]>([]);
  const [side, setSide] = createSignal<PanelSide>('right');
  const panelOpen = () => {
    const id = windowId();
    return id !== undefined && openIn().includes(id);
  };

  // Saves another account sent to its library stay hidden while it isn't signed in.
  const me = useAccount();
  const saves = () => ownSaves(page()?.saves ?? [], me()?.id);

  const anchor = () => {
    frame();
    const range = picked();
    return range ? rangeAnchor(range) : undefined;
  };
  const hoveredSave = () => saves().find((save) => save.id === hovered()?.id);
  const hoverAnchor = () => {
    frame();
    const rect = hovered()?.element.getBoundingClientRect();
    return rect && { left: rect.left, top: rect.top, bottom: rect.bottom };
  };
  const source = () => page()?.source ?? props.source();

  // — Toasts —

  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  const closeToast = () => {
    clearTimeout(toastTimer);
    setToast(null);
    setBadges([]);
  };
  const showToast = (message: ToastMessage, images: Element[] = []) => {
    clearTimeout(toastTimer);
    setToast(message);
    setBadges(images);
    toastTimer = setTimeout(closeToast, toastTime);
  };
  const openLibrary = () => void sendToBackground({ type: 'open', page: 'library' });

  // — Side panel —

  // While it is open, the page's own content moves aside to make room for it.
  createEffect(() => {
    if (!panelOpen() || !loaded()) return;
    const property = `margin-${side()}`;
    const html = document.documentElement.style;
    const before = [html.getPropertyValue(property), html.getPropertyPriority(property)] as const;
    html.setProperty(property, `${panelWidth}px`, 'important');
    onCleanup(() => html.setProperty(property, ...before));
  });

  /**
   * After a save: "Saved on this browser" the first time while signed out, a toast with Undo
   * otherwise.
   */
  const announce = async (saves: Save[], text: string, images: Element[] = []) => {
    if (!props.practice && !(await signInShown.getValue()) && !(await account.getValue())) {
      await signInShown.setValue(true);
      setSignIn(true);
      return;
    }
    const ids = saves.map((save) => save.id);
    showToast(
      {
        text,
        undo: () => {
          void props.store.remove(ids);
          closeToast();
        },
      },
      images,
    );
  };

  // — Highlights —

  async function saveRange(range: Range, highlight: HighlightColor, note?: Draft) {
    const index = indexText(document.body);
    const span = spanOf(index, range);
    if (!span) return null;
    const quote = quoteOf(index, span);
    const save: Save = {
      id: newId(),
      kind: 'HIGHLIGHT',
      color: highlight,
      text: quote.exact,
      prefix: quote.prefix,
      suffix: quote.suffix,
      comment: note?.comment.trim() || undefined,
      section: headingAbove(range.startContainer),
      tags: note?.tags ?? [],
      createdAt: new Date().toISOString(),
    };
    await props.store.add(props.source(), [save]);
    await lastColor.setValue(highlight);
    if (save.tags.length) await rememberTags(save.tags);
    return save;
  }

  /** Saves the selection, with the comment box's comment and tags while it is open. */
  async function saveSelection(highlight: HighlightColor) {
    const range = picked();
    if (!range) return;
    const note = commenting() ? draft() : undefined;
    setPicked(null);
    closeComment();
    document.getSelection()?.removeAllRanges();
    const save = await saveRange(range, highlight, note);
    if (save) await announce([save], t.toast.saved);
  }

  async function saveFromPopup(): Promise<SaveSelectionResult> {
    const range = selectedRange(document, layer);
    if (!range) return 'no-selection';
    setPicked(null);
    document.getSelection()?.removeAllRanges();
    const save = await saveRange(range, color());
    if (!save) return 'no-selection';
    await announce([save], t.toast.saved);
    return 'saved';
  }

  async function deleteSave(save: Save) {
    setHovered(null);
    await props.store.remove([save.id]);
    const from = source();
    showToast({
      text: t.toast.deleted,
      undo: () => {
        void props.store.add(from, [save]);
        closeToast();
      },
    });
  }

  // The hover card opens a moment after the pointer reaches a highlight, and stays while the
  // pointer moves from the highlight onto it.
  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  const keepCard = () => clearTimeout(hideTimer);
  const leaveCard = () => {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => setHovered(null), leaveDelay);
  };

  function closeComment() {
    setCommenting(false);
    setDraft({ comment: '', tags: [] });
  }

  function startClip() {
    setPicked(null);
    closeComment();
    setHovered(null);
    setSignIn(false);
    closeToast();
    setClipping(true);
  }

  // Marks follow the saves; a page that shows its text late is searched again as it changes.
  let marks: ReturnType<typeof createMarks> | undefined;
  let observer: MutationObserver | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let tries = 0;
  const syncMarks = () => {
    marks ??= createMarks(document, markColors(layer));
    const missing = marks.sync(visible() ? saves() : []);
    if (!missing || tries >= retries) {
      observer?.disconnect();
      return;
    }
    observer ??= new MutationObserver(() => {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => {
        tries++;
        syncMarks();
      }, 800);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  createEffect(() => {
    saves();
    visible();
    tries = 0;
    syncMarks();
  });

  onMount(() => {
    void props.store.get().then((saved) => {
      setPage(saved);
      setLoaded(true);
    });
    const unwatch = [
      props.store.watch(setPage),
      showOnPage.watch((value) => setVisible(value)),
      lastColor.watch((value) => setColor(value)),
      panelWindows.watch((ids) => setOpenIn(ids)),
      panelSide.watch((value) => setSide(value)),
    ];
    void showOnPage.getValue().then(setVisible);
    void lastColor.getValue().then(setColor);
    void panelWindows.getValue().then(setOpenIn);
    void panelSide.getValue().then(setSide);
    // Asked again when the tab shows, in case it moved to another window.
    const findWindow = () =>
      void sendToBackground<number | undefined>({ type: 'window-id' }).then(setWindowId, () => {});
    const onVisibility = () => {
      if (document.visibilityState === 'visible') findWindow();
    };
    findWindow();

    const fromUs = (event: Event) => event.composedPath().includes(layer);
    const readSelection = () => {
      if (clipping() || commenting()) return;
      setPicked(selectedRange(document, layer));
    };

    const onMouseDown = (event: MouseEvent) => {
      if (fromUs(event) || !commenting()) return;
      closeComment();
      setPicked(null);
    };
    const onMouseUp = (event: MouseEvent) => {
      if (!fromUs(event)) setTimeout(readSelection);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!fromUs(event)) readSelection();
    };
    const onSelectionChange = () => {
      if (!commenting() && document.getSelection()?.isCollapsed) setPicked(null);
    };
    // The toolbar's keys, while it shows: S saves, 1–5 save in a color, C comments, Esc closes.
    const onKeyDown = (event: KeyboardEvent) => {
      if (!picked() || commenting() || clipping()) return;
      if (event.metaKey || event.ctrlKey || event.altKey || fromUs(event)) return;
      if (isEditable(document.activeElement)) return;
      const key = event.key.toLowerCase();
      const number = key.length === 1 ? Number(key) : 0;
      if (key === 's') void saveSelection(color());
      else if (number >= 1 && number <= highlightColors.length)
        void saveSelection(highlightColors[number - 1]);
      else if (key === 'c') setCommenting(true);
      else if (key === 'escape') setPicked(null);
      else return;
      event.preventDefault();
      event.stopPropagation();
    };
    // ⌘C sends the selection to the side panel when it's open; the copy itself goes ahead.
    let noteTimer: ReturnType<typeof setTimeout> | undefined;
    const onCopy = (event: ClipboardEvent) => {
      if (!panelOpen() || clipping() || fromUs(event)) return;
      const range = selectedRange(document, layer);
      if (!range) return;
      const at = rangeAnchor(range);
      void (async () => {
        const save = await saveRange(range, color());
        if (!save || !at) return;
        setPicked(null);
        clearTimeout(noteTimer);
        setNote(at);
        noteTimer = setTimeout(() => setNote(null), noteTime);
      })();
    };

    const onMouseOver = (event: MouseEvent) => {
      const id = markIdAt(event.target);
      if (!id || clipping()) return;
      keepCard();
      clearTimeout(showTimer);
      const element = event.target as Element;
      showTimer = setTimeout(() => setHovered({ id, element }), hoverDelay);
    };
    const onMouseOut = (event: MouseEvent) => {
      if (markIdAt(event.target)) leaveCard();
    };

    const onMessage = (message: Message, _sender: unknown, respond: (answer: unknown) => void) => {
      if (message.type === 'save-selection') {
        void saveFromPopup().then(respond);
        return true;
      }
      if (message.type === 'start-clip') {
        startClip();
        respond(true);
      } else if (message.type === 'open-panel') {
        void sendToBackground({ type: 'set-panel', open: true });
        respond(true);
      }
    };

    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('copy', onCopy, true);
    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);
    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('visibilitychange', onVisibility);
    browser.runtime.onMessage.addListener(onMessage);

    onCleanup(() => {
      for (const stop of unwatch) stop();
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('copy', onCopy, true);
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('visibilitychange', onVisibility);
      browser.runtime.onMessage.removeListener(onMessage);
      for (const timer of [toastTimer, noteTimer, showTimer, hideTimer, retryTimer]) {
        clearTimeout(timer);
      }
      observer?.disconnect();
      marks?.sync([]);
    });
  });

  return (
    <div ref={layer} class={styles.layer} lang={language} data-ari-ui="">
      {/* First, so the toolbar, the cards and clip mode open over it. */}
      <Show when={panelOpen() && loaded()}>
        <SidePanel
          source={source()}
          saves={saves()}
          side={side()}
          visible={visible()}
          onFocus={(save) => marks?.focus(save.id)}
          onRemove={(save) => void props.store.remove([save.id])}
          onOpen={openLibrary}
          onClose={() => void sendToBackground({ type: 'set-panel', open: false })}
        />
      </Show>
      <Show when={picked() && !clipping()}>
        <SelectionToolbar
          anchor={anchor}
          commenting={commenting()}
          onSave={(highlight) => void saveSelection(highlight ?? color())}
          onComment={() => (commenting() ? closeComment() : setCommenting(true))}
        />
        <Show when={commenting()}>
          <CommentBox
            anchor={anchor}
            draft={draft()}
            onChange={setDraft}
            onSave={() => void saveSelection(color())}
            onCancel={closeComment}
          />
        </Show>
      </Show>
      <Show when={!picked() && !clipping() && hoveredSave()}>
        {(save) => (
          <HoverCard
            save={save()}
            anchor={hoverAnchor}
            onColor={(highlight) => void props.store.update(save().id, { color: highlight })}
            onDelete={() => void deleteSave(save())}
            onOpen={openLibrary}
            onMouseEnter={keepCard}
            onMouseLeave={leaveCard}
          />
        )}
      </Show>
      <Show when={note()}>{(at) => <PanelNote anchor={at()} />}</Show>
      <Show when={clipping()}>
        <ClipMode
          store={props.store}
          source={props.source}
          frame={frame}
          onSaved={(saves, text, images) => {
            setClipping(false);
            void announce(saves, text, images);
          }}
          onClose={() => setClipping(false)}
        />
      </Show>
      <SavedBadges elements={badges()} frame={frame} />
      <Show when={signIn()}>
        <SignInCard
          onSignIn={() => {
            setSignIn(false);
            void sendToBackground({ type: 'open', page: 'sign-in' });
          }}
          onClose={() => setSignIn(false)}
        />
      </Show>
      <Toast toast={toast()} onOpen={openLibrary} />
    </div>
  );
}
