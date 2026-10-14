import { Button, Kbd, Logo, Switch } from '@ari/ui-kit';
import { createEffect, createSignal, For, Show } from 'solid-js';
import { plural, t } from '~/i18n/i18n';
import {
  CheckIcon,
  CloseIcon,
  CommentIcon,
  CopyIcon,
  ExternalIcon,
  EyeIcon,
  PanelIcon,
  PanelLeftIcon,
  ScissorsIcon,
} from '~/icons';
import { modKey } from '~/keys';
import { type PanelSide, panelSide, showOnPage } from '../saves/settings';
import type { Save, Source } from '../saves/store';
import { copyText, inOrder } from './copy-text';
import styles from './side-panel.module.scss';

// A save longer than this shows its start, up to a word, with Show more.
const shortLength = 250;

/**
 * Beside the page, on the right until the user moves it: what was saved from the page. A save
 * that arrives while it is open shows up ringed; a click finds it on the page. PageUi draws it, so
 * it follows the page's saves without asking anyone.
 */
export function SidePanel(props: {
  source: Source;
  saves: Save[];
  side: PanelSide;
  /** Whether highlights are marked on the page (Show on page). */
  visible: boolean;
  onFocus: (save: Save) => void;
  onRemove: (save: Save) => void;
  onOpen: () => void;
  onClose: () => void;
}) {
  let panel!: HTMLElement;
  const [active, setActive] = createSignal<string | null>(null);
  const [copied, setCopied] = createSignal(false);
  const saves = () => inOrder(props.saves);

  // The newest save that arrives while the panel is open becomes active.
  let known: Set<string> | undefined;
  createEffect(() => {
    const ids = props.saves.map((save) => save.id);
    const added = known ? ids.filter((id) => !known?.has(id)) : [];
    known = new Set(ids);
    if (added.length) setActive(added[added.length - 1]);
  });

  const focus = (save: Save) => {
    setActive(save.id);
    props.onFocus(save);
  };

  const copyAll = async () => {
    await writeClipboard(copyText({ source: props.source, saves: props.saves }), panel);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const moveLabel = () => (props.side === 'right' ? t.panel.moveLeft : t.panel.moveRight);
  const [hintBefore, hintAfter] = t.panel.hint.split('{keys}');

  return (
    <aside ref={panel} class={styles.panel} data-side={props.side} aria-label={t.panel.title}>
      <header class={styles.head}>
        <Logo size={20} />
        <h1 class={styles.title}>{t.panel.title}</h1>
        <span class={styles.move}>
          <Button
            variant="ghost"
            iconOnly
            icon={props.side === 'right' ? <PanelLeftIcon /> : <PanelIcon />}
            aria-label={moveLabel()}
            onClick={() => void panelSide.setValue(props.side === 'right' ? 'left' : 'right')}
          />
          <span class={styles.tip} aria-hidden="true">
            {moveLabel()}
          </span>
        </span>
        <Button
          variant="ghost"
          iconOnly
          icon={<CloseIcon />}
          aria-label={t.panel.close}
          onClick={() => props.onClose()}
        />
      </header>
      <div class={styles.page}>
        <span class={styles['page-title']}>{props.source.title}</span>
        <span class={styles['page-meta']}>
          {props.source.siteName} · {plural(props.saves.length, t.counts.saves)}
        </span>
      </div>
      <Switch
        icon={<EyeIcon />}
        label={t.panel.showOnPage}
        checked={props.visible}
        onChange={(value) => void showOnPage.setValue(value)}
      />
      <Show
        when={saves().length}
        fallback={
          <div class={styles.empty}>
            <span class={styles['empty-title']}>{t.panel.emptyTitle}</span>
            <span class={styles['empty-text']}>{t.panel.emptyText}</span>
          </div>
        }
      >
        <ul class={styles.list}>
          <For each={saves()}>
            {(save) => (
              <SaveCard
                save={save}
                active={active() === save.id}
                onFocus={() => focus(save)}
                onRemove={() => props.onRemove(save)}
              />
            )}
          </For>
        </ul>
      </Show>
      <p class={styles.hint}>
        {hintBefore}
        <Kbd>{modKey}</Kbd>
        <Kbd>C</Kbd>
        {hintAfter}
      </p>
      <div class={styles.actions}>
        <Button
          icon={copied() ? <CheckIcon /> : <CopyIcon />}
          disabled={!saves().length}
          onClick={() => void copyAll()}
        >
          {copied() ? t.panel.copied : t.panel.copyAll}
        </Button>
        <Button
          variant="primary"
          class={styles.grow}
          iconAfter={<ExternalIcon />}
          onClick={() => props.onOpen()}
        >
          {t.panel.openInAri}
        </Button>
      </div>
    </aside>
  );
}

function SaveCard(props: {
  save: Save;
  active: boolean;
  onFocus: () => void;
  onRemove: () => void;
}) {
  let card!: HTMLLIElement;
  createEffect(() => {
    if (props.active) card.scrollIntoView({ block: 'nearest' });
  });
  const isClip = () => props.save.kind === 'CLIP';
  const [expanded, setExpanded] = createSignal(false);
  const long = () => props.save.text.length > shortLength;
  const text = () => (long() && !expanded() ? shortened(props.save.text) : props.save.text);

  return (
    <li ref={card} class={styles.card} data-active={props.active ? '' : undefined}>
      <button type="button" class={styles['card-main']} onClick={() => props.onFocus()}>
        <span class={styles['text-row']}>
          <Show
            when={isClip()}
            fallback={
              <span
                class={styles.dot}
                style={{ background: `var(--ari-hl-${props.save.color ?? 'yellow'})` }}
              />
            }
          >
            <span class={styles['clip-icon']}>
              <ScissorsIcon />
            </span>
          </Show>
          <span class={styles.text}>{text()}</span>
        </span>
        <Show when={props.save.clipType === 'IMAGE' && props.save.imageUrl}>
          {(src) => <img class={styles.image} src={src()} alt="" />}
        </Show>
      </button>
      <Show when={long()}>
        <button
          type="button"
          class={styles.more}
          aria-expanded={expanded()}
          onClick={() => setExpanded(!expanded())}
        >
          {expanded() ? t.panel.showLess : t.panel.showMore}
        </button>
      </Show>
      <Show when={props.save.comment}>
        {(comment) => (
          <span class={styles['card-comment']}>
            <CommentIcon />
            {comment()}
          </span>
        )}
      </Show>
      <Show when={props.active}>
        <button
          type="button"
          class={styles.remove}
          aria-label={isClip() ? t.panel.removeClip : t.panel.removeHighlight}
          title={isClip() ? t.panel.removeClip : t.panel.removeHighlight}
          onClick={() => props.onRemove()}
        >
          <CloseIcon />
        </button>
      </Show>
    </li>
  );
}

/** A long save's start, cut at a word, with an ellipsis. */
function shortened(text: string) {
  const start = text.slice(0, shortLength);
  return `${start.slice(0, start.lastIndexOf(' ')).replace(/[,.;:]$/, '')}…`;
}

/**
 * Copies `text`. An http:// page has no navigator.clipboard, so a field inside Ari's own UI
 * (`within`) copies it there: the page's copy listener ignores what happens in Ari's UI.
 */
async function writeClipboard(text: string, within: HTMLElement) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    field.className = styles.offscreen;
    within.append(field);
    field.select();
    document.execCommand('copy');
    field.remove();
  }
}
