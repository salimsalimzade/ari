import { SegmentedControl } from '@ari/ui-kit';
import { createSignal, For, onMount } from 'solid-js';
import type { Dictionary } from '~/i18n/en';
import { useI18n } from '~/i18n/i18n';
import styles from './sections.module.scss';

type Keyboard = 'mac' | 'windows';
type Action = keyof Dictionary['shortcuts']['actions'];

// Each shortcut's keys on a Mac and on Windows; key names read the same in every language.
const groups: {
  title: 'onPage' | 'inApp';
  shortcuts: { action: Action; mac: string[]; windows: string[] }[];
}[] = [
  {
    title: 'onPage',
    shortcuts: [
      { action: 'highlight', mac: ['⌥', '⇧', 'H'], windows: ['Alt', 'Shift', 'H'] },
      { action: 'clip', mac: ['⌥', '⇧', 'C'], windows: ['Alt', 'Shift', 'C'] },
      { action: 'popup', mac: ['⌥', '⇧', 'A'], windows: ['Alt', 'Shift', 'A'] },
    ],
  },
  {
    title: 'inApp',
    shortcuts: [
      { action: 'search', mac: ['⌘', 'K'], windows: ['Ctrl', 'K'] },
      { action: 'newNote', mac: ['N'], windows: ['N'] },
      { action: 'copy', mac: ['C'], windows: ['C'] },
      { action: 'close', mac: ['esc'], windows: ['Esc'] },
    ],
  },
];

/** The keyboard shortcuts, for a Mac or a Windows keyboard. */
export function Shortcuts() {
  const { t } = useI18n();
  const [keyboard, setKeyboard] = createSignal<Keyboard>('mac');
  // The server can't tell, so the page starts with Mac keys and switches once it's in the browser.
  onMount(() => {
    if (!/Mac|iPhone|iPad/.test(navigator.userAgent)) setKeyboard('windows');
  });

  return (
    <section class={styles.card}>
      <div class={styles['heading-row']}>
        <h2 class={styles.heading}>{t().settings.shortcuts}</h2>
        <SegmentedControl
          label={t().shortcuts.keyboard}
          size="sm"
          class={styles.keyboard}
          value={keyboard()}
          onChange={(value) => setKeyboard(value as Keyboard)}
          options={[
            { value: 'mac', label: t().shortcuts.mac },
            { value: 'windows', label: t().shortcuts.windows },
          ]}
        />
      </div>
      <p class={styles.text} data-phone="">
        {t().shortcuts.phoneNote}
      </p>
      <For each={groups}>
        {(group) => (
          <div class={styles['key-group']}>
            <h3 class={styles.overline}>{t().shortcuts[group.title]}</h3>
            <For each={group.shortcuts}>
              {(shortcut) => (
                <div class={styles['key-row']}>
                  <span class={styles['key-label']}>{t().shortcuts.actions[shortcut.action]}</span>
                  <span class={styles.keys}>
                    <For each={shortcut[keyboard()]}>
                      {(key) => <kbd class={styles.key}>{key}</kbd>}
                    </For>
                  </span>
                </div>
              )}
            </For>
          </div>
        )}
      </For>
      <p class={styles.text}>{t().shortcuts.note}</p>
    </section>
  );
}
