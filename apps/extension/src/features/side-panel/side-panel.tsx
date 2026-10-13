import { Button, Kbd, Logo, Switch } from '@ari/ui-kit';
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { browser } from 'wxt/browser';
import { plural, t } from '~/i18n/i18n';
import {
  CheckIcon,
  CloseIcon,
  CommentIcon,
  CopyIcon,
  ExternalIcon,
  EyeIcon,
  ScissorsIcon,
} from '~/icons';
import { modKey } from '~/keys';
import { sendToTab } from '~/messages';
import { sidebar } from '~/sidebar';
import { websiteUrl } from '~/website';
import { showOnPage } from '../saves/settings';
import type { PageSaves, Save } from '../saves/store';
import { tabPage } from '../saves/tab-page';
import { copyText, inOrder } from './copy-text';
import styles from './side-panel.module.scss';

type Tab = { id?: number; url?: string; title?: string };

/** The sidebar beside a page: what was saved from it. A new save shows up ringed at once. */
export function SidePanel() {
  const [tab, setTab] = createSignal<Tab>();
  const [saved, setSaved] = createSignal<PageSaves | null>(null);
  const [active, setActive] = createSignal<string | null>(null);
  const [visible, setVisible] = createSignal(true);
  const [copied, setCopied] = createSignal(false);

  const url = () => tab()?.url;
  const page = createMemo(() => tabPage(url()));
  const saves = () => inOrder(saved()?.saves ?? []);

  // The active tab of this window, as it changes.
  onMount(async () => {
    const { id: windowId } = await browser.windows.getCurrent();
    const refresh = async () => {
      const [current] = await browser.tabs.query({ active: true, windowId });
      setTab(current);
    };
    const onActivated = (info: { windowId: number }) => {
      if (info.windowId === windowId) void refresh();
    };
    const onUpdated = (
      _id: number,
      change: { url?: string; title?: string },
      updated: Tab & { active?: boolean; windowId?: number },
    ) => {
      if (updated.active && updated.windowId === windowId && (change.url || change.title)) {
        setTab(updated);
      }
    };
    browser.tabs.onActivated.addListener(onActivated);
    browser.tabs.onUpdated.addListener(onUpdated);
    onCleanup(() => {
      browser.tabs.onActivated.removeListener(onActivated);
      browser.tabs.onUpdated.removeListener(onUpdated);
    });
    void refresh();

    void showOnPage.getValue().then(setVisible);
    onCleanup(showOnPage.watch((value) => setVisible(value)));
  });

  // The page's saves; the newest one that arrives while the panel is open becomes active.
  createEffect(() => {
    const current = page();
    setSaved(null);
    setActive(null);
    if (!current) return;
    let known: Set<string> | undefined;
    const show = (next: PageSaves | null, arrived: boolean) => {
      const ids = next?.saves.map((save) => save.id) ?? [];
      const added = arrived && known ? ids.filter((id) => !known?.has(id)) : [];
      known = new Set(ids);
      setSaved(next);
      if (added.length) setActive(added[added.length - 1]);
    };
    void current.store.get().then((next) => show(next, false));
    onCleanup(current.store.watch((next) => show(next, true)));
  });

  const focus = (save: Save) => {
    setActive(save.id);
    const id = tab()?.id;
    if (id !== undefined) void sendToTab(id, { type: 'focus-save', id: save.id }).catch(() => {});
  };

  const copyAll = async () => {
    const current = saved();
    if (!current) return;
    await navigator.clipboard.writeText(copyText(current));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [hintBefore, hintAfter] = t.panel.hint.split('{keys}');

  return (
    <main class={styles.panel}>
      <header class={styles.head}>
        <Logo size={20} />
        <h1 class={styles.title}>{t.panel.title}</h1>
        <Button
          variant="ghost"
          iconOnly
          icon={<CloseIcon />}
          aria-label={t.panel.close}
          class={styles.close}
          onClick={() => void sidebar.close()}
        />
      </header>
      <Show
        when={page()}
        fallback={<Empty title={t.panel.unsupportedTitle} text={t.panel.unsupportedText} />}
      >
        <div class={styles.page}>
          <span class={styles['page-title']}>{saved()?.source.title ?? tab()?.title}</span>
          <Show when={saved()}>
            {(current) => (
              <span class={styles['page-meta']}>
                {current().source.siteName} · {plural(current().saves.length, t.counts.saves)}
              </span>
            )}
          </Show>
        </div>
        <Switch
          icon={<EyeIcon />}
          label={t.panel.showOnPage}
          checked={visible()}
          onChange={(value) => void showOnPage.setValue(value)}
        />
        <Show
          when={saves().length}
          fallback={<Empty title={t.panel.emptyTitle} text={t.panel.emptyText} />}
        >
          <ul class={styles.list}>
            <For each={saves()}>
              {(save) => (
                <SaveCard
                  save={save}
                  active={active() === save.id}
                  onFocus={() => focus(save)}
                  onRemove={() => void page()?.store.remove([save.id])}
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
            onClick={() => void browser.tabs.create({ url: websiteUrl('library') })}
          >
            {t.panel.openInAri}
          </Button>
        </div>
      </Show>
    </main>
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
          <span class={styles.text}>{props.save.text}</span>
        </span>
        <Show when={props.save.clipType === 'IMAGE' && props.save.imageUrl}>
          {(src) => <img class={styles.image} src={src()} alt="" />}
        </Show>
        <Show when={props.save.comment}>
          {(comment) => (
            <span class={styles['card-comment']}>
              <CommentIcon />
              {comment()}
            </span>
          )}
        </Show>
      </button>
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

function Empty(props: { title: string; text: string }) {
  return (
    <div class={styles.empty}>
      <span class={styles['empty-title']}>{props.title}</span>
      <span class={styles['empty-text']}>{props.text}</span>
    </div>
  );
}
