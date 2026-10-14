import { Show } from 'solid-js';
import styles from './auth.module.scss';
import { CheckIcon } from './icons';

/** A confirmation at the top of the form column, e.g. "Check your email" once a reset link is sent. */
export function AuthToast(props: { text?: string }) {
  return (
    <div role="status" class={styles['toast-region']}>
      <Show when={props.text}>
        {(text) => (
          <div class={styles.toast}>
            <span class={styles['toast-icon']}>
              <CheckIcon />
            </span>
            {text()}
          </div>
        )}
      </Show>
    </div>
  );
}
