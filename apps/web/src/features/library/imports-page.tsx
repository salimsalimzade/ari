import { Button } from '@ari/ui-kit';
import { Title } from '@solidjs/meta';
import { A } from '@solidjs/router';
import { For, Match, Show, Switch } from 'solid-js';
import { MobileHeader } from '~/features/shell/mobile-header';
import { fill, plural, useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { FileDrop } from './file-drop';
import { AlertIcon, FileIcon, UploadIcon } from './icons';
import { ImportProgress, ImportRejected, useImportText } from './import-rows';
import styles from './imports.module.scss';
import { trialMegabytes, useLibrary } from './library-store';
import type { ImportFile } from './sample';

const isBusy = (file: ImportFile) => file.status === 'uploading' || file.status === 'reading';

/** /imports: upload space, where to drop files, then the files by what they need. */
export function ImportsPage() {
  const { t } = useI18n();
  const library = useLibrary();
  const files = () => library.files.filter((file) => file.status !== 'dismissed');
  const ready = () => library.files.filter((file) => file.status === 'ready');
  const history = () =>
    library.files.filter((file) => ['saved', 'failed', 'empty', 'discarded'].includes(file.status));
  const summary = () =>
    fill(t().imports.summary, {
      files: fill(plural(files().length, t().imports.files), { n: files().length }),
      ready: ready().length,
    });

  return (
    <div class={styles.page}>
      <Title>{t().imports.pageTitle}</Title>
      <MobileHeader title={t().imports.title} />
      <header class={styles.header}>
        <div class={styles.heading}>
          <h1 class={styles.title}>{t().imports.title}</h1>
          <p class={styles.summary}>{summary()}</p>
        </div>
        <Button
          variant="primary"
          icon={<UploadIcon />}
          class={styles['import-button']}
          disabled={library.space().tone === 'full'}
          onClick={library.pickFiles}
        >
          <span class={styles['wide-only']}>{t().imports.importFiles}</span>
          <span class={styles['phone-only']}>{t().imports.chooseFiles}</span>
        </Button>
      </header>
      <Show when={files().length} fallback={<FirstImport />}>
        <div class={styles.sections}>
          <UploadMeter />
          <DropZone />
          <Show when={ready().length}>
            <h2 class={styles.overline}>{fill(t().imports.ready, { n: ready().length })}</h2>
            <For each={ready()}>{(file) => <ReadyFile file={file} />}</For>
          </Show>
          <Show when={library.files.some(isBusy)}>
            <h2 class={styles.overline}>{t().imports.inProgress}</h2>
            <For each={library.files.filter(isBusy)}>
              {(file) => <ImportProgress file={file} />}
            </For>
          </Show>
          <Show when={library.files.some((file) => file.status === 'rejected')}>
            <h2 class={styles.overline}>{t().imports.notImported}</h2>
            <For each={library.files.filter((file) => file.status === 'rejected')}>
              {(file) => <ImportRejected file={file} />}
            </For>
          </Show>
          <Show when={history().length}>
            <h2 class={styles.overline}>{t().imports.history}</h2>
            <div class={styles.history}>
              <For each={history()}>{(file) => <HistoryRow file={file} />}</For>
            </div>
          </Show>
        </div>
      </Show>
      <FileDrop />
    </div>
  );
}

// Upload space: what's used, what's being imported now, and what's left.
function UploadMeter() {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  const space = () => library.space();
  const percent = (megabytes: number) => `${Math.min(100, (megabytes / trialMegabytes) * 100)}%`;
  const megabytes = (value: number) => `${format.number(value, 1)} MB`;
  return (
    <section class={styles.meter} data-tone={space().tone} aria-label={t().imports.space}>
      <div class={styles['meter-head']}>
        <span class={styles['meter-used']}>
          {fill(t().imports.spaceUsed, {
            used: megabytes(space().used + space().pending),
            limit: `${trialMegabytes} MB`,
          })}
        </span>
        <span class={styles['meter-left']}>
          {fill(t().imports.spaceLeft, { left: megabytes(space().left) })}
        </span>
      </div>
      {/* The text above says how full it is. */}
      <span class={styles['meter-bar']} aria-hidden="true">
        <span class={styles['meter-fill']} style={{ width: percent(space().used) }} />
        <span
          class={styles['meter-pending']}
          style={{
            width: percent(Math.min(space().pending, Math.max(0, trialMegabytes - space().used))),
          }}
        />
      </span>
      <p class={styles['meter-note']}>
        {space().tone === 'full'
          ? t().imports.spaceFull
          : space().tone === 'low'
            ? t().imports.spaceLow
            : t().imports.spaceOk}
      </p>
      <Show when={space().pending > 0}>
        <span class={styles['meter-legend']}>
          <span class={styles['legend-dot']} />
          {fill(t().imports.spacePending, { size: megabytes(space().pending) })}
        </span>
      </Show>
      <Show when={space().tone !== 'ok'}>
        <div>
          <Button variant="primary" href="/settings/billing">
            {t().imports.seeHive}
          </Button>
        </div>
      </Show>
    </section>
  );
}

function DropZone() {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  const full = () => library.space().tone === 'full';
  const left = () => `${format.number(library.space().left, 1)} MB`;
  return (
    <button type="button" class={styles.zone} disabled={full()} onClick={library.pickFiles}>
      <span class={styles['zone-icon']}>
        <UploadIcon />
      </span>
      <Show
        when={!full()}
        fallback={
          <>
            <span class={styles['zone-title']}>{t().imports.dropFull}</span>
            <span class={styles['zone-text']}>{t().imports.dropFullText}</span>
          </>
        }
      >
        <span class={styles['zone-title']}>
          <span class={styles['wide-only']}>{t().imports.dropTitle}</span>
          <span class={styles['phone-only']}>{t().imports.dropTitlePhone}</span>
        </span>
        <span class={styles['zone-text']}>
          <span class={styles['wide-only']}>{fill(t().imports.dropText, { left: left() })}</span>
          <span class={styles['phone-only']}>
            {fill(t().imports.dropTextPhone, { left: left() })}
          </span>
        </span>
      </Show>
    </button>
  );
}

function ReadyFile(props: { file: ImportFile }) {
  const { t } = useI18n();
  const format = useFormat();
  const text = useImportText();
  return (
    <div class={styles.ready}>
      <FileIcon />
      <div class={styles['ready-text']}>
        <span class={styles['ready-name']}>{props.file.name}</span>
        <span class={styles['ready-found']}>
          {[text.status(props.file), format.fileSize(props.file.megabytes), props.file.author]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
      <Button variant="primary" href={`/imports/${props.file.id}`}>
        {t().imports.review}
      </Button>
    </div>
  );
}

function HistoryRow(props: { file: ImportFile }) {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  const text = useImportText();
  const problem = () => props.file.status === 'failed' || props.file.status === 'empty';
  return (
    <div class={styles['history-row']} data-problem={problem() ? '' : undefined}>
      {problem() ? <AlertIcon /> : <FileIcon />}
      <div class={styles['history-text']}>
        <span class={styles['history-name']}>{props.file.name}</span>
        <span class={styles['history-status']}>
          {format.fileSize(props.file.megabytes)} · {text.status(props.file)}
        </span>
      </div>
      <Switch>
        <Match when={props.file.status === 'saved' && props.file.marks}>
          <A href={`/imports/${props.file.id}`} class={styles['history-action']}>
            {t().imports.editReview}
          </A>
        </Match>
        <Match when={props.file.status === 'failed'}>
          <button
            type="button"
            class={styles['history-action']}
            onClick={() => library.retry(props.file.id)}
          >
            {t().imports.retry}
          </button>
        </Match>
        <Match when={props.file.status === 'empty'}>
          <button
            type="button"
            class={styles['history-action']}
            onClick={() => library.dismiss(props.file.id)}
          >
            {t().imports.dismiss}
          </button>
        </Match>
      </Switch>
    </div>
  );
}

// Before any file: where to drop one, and the three steps.
function FirstImport() {
  const { t } = useI18n();
  const library = useLibrary();
  return (
    <div class={styles.sections}>
      <button type="button" class={styles.zone} data-size="lg" onClick={library.pickFiles}>
        <span class={styles['zone-icon']}>
          <UploadIcon />
        </span>
        <span class={styles['zone-title']}>{t().imports.dropTitle}</span>
        <span class={styles['zone-text']}>{t().imports.dropFirstText}</span>
      </button>
      <ol class={styles.steps}>
        <For each={t().imports.steps}>
          {(step, index) => (
            <li class={styles.step}>
              <span class={styles['step-number']}>{index() + 1}</span>
              <span class={styles['step-title']}>{step.title}</span>
              <span class={styles['step-text']}>{step.text}</span>
            </li>
          )}
        </For>
      </ol>
    </div>
  );
}
