import { createAsync, revalidate } from '@solidjs/router';
import { createEffect, onCleanup, Show, startTransition } from 'solid-js';
import { getMe } from '~/features/auth/queries';
import { RetryIcon } from '~/features/library/icons';
import { useI18n } from '~/i18n/i18n';
import styles from './app-shell.module.scss';

// While ari-api can't be reached, how often everything is asked for again.
const retryEvery = 15_000;

/**
 * Over the page while ari-api can't be reached: what shows may be out of date, and changes wait.
 * Every query runs again every 15 seconds, when the browser is back online, or on Try again; once
 * ari-api answers, the bar goes and the pages fill in.
 */
export function ConnectionBanner() {
  const { t } = useI18n();
  const me = createAsync(() => getMe(), { deferStream: true });
  // getMe answers undefined only when ari-api couldn't be reached.
  const down = () => me() === undefined;
  const retry = () => startTransition(() => revalidate());
  createEffect(() => {
    if (!down()) return;
    const timer = setInterval(retry, retryEvery);
    window.addEventListener('online', retry);
    onCleanup(() => {
      clearInterval(timer);
      window.removeEventListener('online', retry);
    });
  });

  return (
    <Show when={down()}>
      <div role="alert" class={styles.offline}>
        <span class={styles['offline-text']}>
          <strong>{t().connection.title}</strong> {t().connection.text}
        </span>
        <button type="button" class={styles['offline-retry']} onClick={() => void retry()}>
          <RetryIcon />
          {t().connection.retry}
        </button>
      </div>
    </Show>
  );
}
