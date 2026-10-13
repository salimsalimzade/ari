import { Button, Kbd } from '@ari/ui-kit';
import { type Accessor, For, Show } from 'solid-js';
import { t } from '~/i18n/i18n';
import { CheckIcon, ExternalIcon, UndoIcon } from '~/icons';
import { modKey } from '~/keys';
import type { Anchor } from './floating';
import styles from './notices.module.scss';

export type ToastMessage = { text: string; undo?: () => void };

/** What just happened, at the top center of the page, with Undo and Open in Ari. */
export function Toast(props: { toast: ToastMessage | null; onOpen: () => void }) {
  return (
    <div role="status" class={styles.region}>
      <Show when={props.toast}>
        {(toast) => (
          <div class={styles.toast}>
            <span class={styles.check}>
              <CheckIcon />
            </span>
            {toast().text}
            <span class={styles.divider} />
            <Show when={toast().undo}>
              {(undo) => (
                <button type="button" class={styles.action} onClick={() => undo()()}>
                  <UndoIcon />
                  {t.toast.undo}
                </button>
              )}
            </Show>
            <button type="button" class={styles.action} onClick={() => props.onOpen()}>
              {t.toast.openInAri}
              <ExternalIcon />
            </button>
          </div>
        )}
      </Show>
    </div>
  );
}

/** After the first save while signed out: the save stays in this browser until the user signs in. */
export function SignInCard(props: { onSignIn: () => void; onClose: () => void }) {
  return (
    <section class={styles['sign-in']} aria-labelledby="ari-sign-in-title">
      <div class={styles['sign-in-head']}>
        <span class={styles['sign-in-check']}>
          <CheckIcon />
        </span>
        <h2 id="ari-sign-in-title" class={styles['sign-in-title']}>
          {t.signIn.title}
        </h2>
      </div>
      <p class={styles['sign-in-text']}>{t.signIn.text}</p>
      <div class={styles['sign-in-actions']}>
        <Button variant="primary" class={styles.grow} onClick={() => props.onSignIn()}>
          {t.signIn.signIn}
        </Button>
        <Button variant="ghost" onClick={() => props.onClose()}>
          {t.signIn.notNow}
        </Button>
      </div>
    </section>
  );
}

/** Under text that ⌘C just sent to the open side panel. */
export function PanelNote(props: { anchor: Anchor }) {
  return (
    <div
      role="status"
      class={styles.note}
      style={{ left: `${props.anchor.left}px`, top: `${props.anchor.bottom + 10}px` }}
    >
      <span class={styles.keys}>
        <Kbd tone="inverse">{modKey}</Kbd>
        <Kbd tone="inverse">C</Kbd>
      </span>
      {t.addedToPanel}
    </div>
  );
}

/** "Saved" on each image that was just clipped, for as long as the toast shows. */
export function SavedBadges(props: { elements: Element[]; frame: Accessor<number> }) {
  return (
    <For each={props.elements}>
      {(element) => {
        const rect = () => {
          props.frame();
          return element.getBoundingClientRect();
        };
        return (
          <span
            class={styles.badge}
            style={{ left: `${rect().left + 12}px`, top: `${rect().top + 12}px` }}
          >
            <CheckIcon />
            {t.toast.savedBadge}
          </span>
        );
      }}
    </For>
  );
}
