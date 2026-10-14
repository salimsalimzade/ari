import { Button } from '@ari/ui-kit';
import { A } from '@solidjs/router';
import { For, Match, Show, Switch } from 'solid-js';
import { fill, plural } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { AlertIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon } from './icons';
import { ImportProgress, ImportRejected } from './import-rows';
import { isBusy } from './imports';
import styles from './imports.module.scss';
import { useLibrary } from './library-store';

/**
 * This visit's imports on the Library page: a tray in the corner on wide screens, which hides to a
 * pill, and a pill that leads to Imports on phones.
 */
export function ImportTray() {
  const { t } = useI18n();
  const library = useLibrary();
  const busy = () => library.session().filter(isBusy);
  const ready = () => library.session().filter((file) => file.status === 'ready');
  const rejected = () => library.session().filter((file) => file.status === 'rejected');
  // Uploading is the first half of each file's progress, and reading the second; ari-api tells no
  // share of its reading, so a file being read counts as three quarters.
  const percent = () => {
    const files = busy();
    if (!files.length) return 100;
    const total = files.reduce(
      (sum, file) =>
        sum +
        (file.status === 'uploading' ? file.progress / 2 : file.status === 'queued' ? 50 : 75),
      0,
    );
    return Math.round(total / files.length);
  };
  const tone = () => (busy().length ? 'busy' : ready().length ? 'ready' : 'rejected');
  const title = () => {
    if (busy().length)
      return fill(plural(busy().length, t().imports.trayImporting), { n: busy().length });
    if (ready().length)
      return fill(plural(ready().length, t().imports.trayReady), { n: ready().length });
    return t().imports.title;
  };
  const pillText = () => {
    if (busy().length)
      return fill(t().imports.pillImporting, { n: busy().length, percent: percent() });
    if (ready().length) return fill(t().imports.pillReady, { n: ready().length });
    return fill(plural(rejected().length, t().imports.pillRejected), { n: rejected().length });
  };
  const pillContent = () => (
    <>
      <Switch>
        <Match when={tone() === 'busy'}>
          <span class={styles.ring} style={{ '--percent': `${percent()}%` }} />
        </Match>
        <Match when={tone() === 'ready'}>
          <CheckIcon />
        </Match>
        <Match when={tone() === 'rejected'}>
          <AlertIcon />
        </Match>
      </Switch>
      {pillText()}
      <ChevronUpIcon />
    </>
  );

  return (
    <Show when={library.session().length}>
      <Show
        when={!library.trayHidden()}
        fallback={
          <button
            type="button"
            class={styles.pill}
            data-tone={tone()}
            aria-label={t().imports.showImports}
            onClick={() => library.setTrayHidden(false)}
          >
            {pillContent()}
          </button>
        }
      >
        <section class={styles.tray} aria-label={t().imports.title}>
          <div class={styles['tray-head']}>
            <h2 class={styles['tray-title']}>{title()}</h2>
            <button
              type="button"
              class={styles['tray-hide']}
              onClick={() => library.setTrayHidden(true)}
            >
              {t().imports.hide}
              <ChevronDownIcon />
            </button>
          </div>
          <div class={styles['tray-files']}>
            <For each={library.session()}>
              {(file) => (
                <Show when={file.status === 'rejected'} fallback={<ImportProgress file={file} />}>
                  <ImportRejected file={file} />
                </Show>
              )}
            </For>
          </div>
          <Show when={ready()[0]}>
            {(file) => (
              <Button variant="primary" href={`/imports/${file().id}`}>
                {fill(plural(file().found, t().imports.trayReview), { n: file().found })}
              </Button>
            )}
          </Show>
        </section>
      </Show>
      <A
        href="/imports"
        class={styles['phone-pill']}
        data-tone={tone()}
        aria-label={t().imports.showImports}
      >
        {pillContent()}
      </A>
    </Show>
  );
}
