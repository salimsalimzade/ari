import { Button, Logo, Switch } from '@ari/ui-kit';
import { createResource, createSignal, type JSX, Show } from 'solid-js';
import { browser } from 'wxt/browser';
import { plural, t } from '~/i18n/i18n';
import {
  ChevronRightIcon,
  HighlighterIcon,
  LibraryIcon,
  PanelIcon,
  PauseIcon,
  ScissorsIcon,
} from '~/icons';
import { copyLabel, shortcutLabel } from '~/keys';
import { type Message, type SaveSelectionResult, sendToTab } from '~/messages';
import { sidebar } from '~/sidebar';
import { type WebsitePage, websiteUrl } from '~/website';
import { isWebsite } from '../saves/page-url';
import { pausedSites } from '../saves/settings';
import type { PageSaves } from '../saves/store';
import { tabPage } from '../saves/tab-page';
import styles from './popup.module.scss';

/** What a click on the Ari icon opens: this page's saves and what Ari can do on it. */
export function Popup() {
  const [tab] = createResource(async () => {
    const [active] = await browser.tabs.query({ active: true, currentWindow: true });
    return active;
  });
  const [saved] = createResource(tab, (current) => tabPage(current.url)?.store.get() ?? null);
  const [commands] = createResource(() => browser.commands.getAll(), { initialValue: [] });
  const [hint, setHint] = createSignal<string>();

  const site = () => {
    const url = tab()?.url;
    return isWebsite(url) ? new URL(url).hostname : undefined;
  };
  const [paused, { mutate: setPaused }] = createResource(
    site,
    async (current) => (await pausedSites.getValue()).includes(current),
    { initialValue: false },
  );
  const shortcut = (name: string) => {
    const keys = commands().find((command) => command.name === name)?.shortcut;
    return keys ? shortcutLabel(keys) : '';
  };

  const setPause = async (pause: boolean) => {
    const current = site();
    if (!current) return;
    setPaused(pause);
    const sites = (await pausedSites.getValue()).filter((other) => other !== current);
    await pausedSites.setValue(pause ? [...sites, current] : sites);
  };

  // A message to the page, then the popup closes; a page loaded before Ari can't answer.
  const ask = async (message: Message) => {
    const id = tab()?.id;
    if (id === undefined) return;
    try {
      const answer = await sendToTab<SaveSelectionResult | boolean>(id, message);
      if (answer === 'no-selection') setHint(t.popup.noSelection);
      else window.close();
    } catch {
      setHint(t.popup.reload);
    }
  };

  // sidebar.open() has to run in the click itself, before anything is awaited.
  const openPanel = () => {
    void sidebar.open().finally(() => window.close());
  };

  const open = (page: WebsitePage) => {
    void browser.tabs.create({ url: websiteUrl(page) });
    window.close();
  };

  return (
    <main class={styles.popup}>
      <header class={styles.head}>
        <Logo size={20} wordmark="sm" />
        <Button variant="ghost" class={styles['sign-in']} onClick={() => open('login')}>
          {t.popup.signIn}
        </Button>
      </header>
      <section class={styles.page} aria-label={t.popup.thisPage}>
        <div class={styles['page-text']}>
          <span class={styles['page-label']}>{t.popup.thisPage}</span>
          <span class={styles['page-count']}>
            <Show when={tabPage(tab()?.url)} fallback={t.popup.unsupported}>
              {counts(saved())}
            </Show>
          </span>
        </div>
        <button type="button" class={styles['panel-link']} onClick={openPanel}>
          {t.popup.sidePanel}
          <ChevronRightIcon />
        </button>
      </section>
      <div class={styles.menu}>
        <Row
          icon={<HighlighterIcon />}
          label={t.popup.saveSelection}
          keys={copyLabel}
          disabled={!site()}
          onClick={() => void ask({ type: 'save-selection' })}
        />
        <Row
          icon={<ScissorsIcon />}
          label={t.popup.clip}
          keys={shortcut('clip-section')}
          disabled={!site()}
          onClick={() => void ask({ type: 'start-clip' })}
        />
        <Row
          icon={<PanelIcon />}
          label={t.popup.openPanel}
          keys={shortcut('_execute_sidebar_action')}
          onClick={openPanel}
        />
        <Switch
          class={styles.row}
          icon={<PauseIcon />}
          label={t.popup.pause}
          checked={paused()}
          disabled={!site()}
          onChange={(pause) => void setPause(pause)}
        />
      </div>
      <Show when={hint()}>
        <p role="status" class={styles.hint}>
          {hint()}
        </p>
      </Show>
      <Button block icon={<LibraryIcon />} class={styles.library} onClick={() => open('library')}>
        {t.popup.openLibrary}
      </Button>
    </main>
  );
}

function Row(props: {
  icon: JSX.Element;
  label: string;
  keys: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      class={styles.row}
      disabled={props.disabled}
      onClick={() => props.onClick()}
    >
      {props.icon}
      {props.label}
      <span class={styles.keys}>{props.keys}</span>
    </button>
  );
}

/** "5 highlights · 1 clip", leaving out what there is none of. */
function counts(page: PageSaves | null | undefined) {
  const saves = page?.saves ?? [];
  const highlights = saves.filter((save) => save.kind === 'HIGHLIGHT').length;
  const clips = saves.length - highlights;
  const parts = [
    highlights ? plural(highlights, t.counts.highlights) : '',
    clips ? plural(clips, t.counts.clips) : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : t.popup.nothingSaved;
}
