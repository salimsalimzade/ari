import { A } from '@solidjs/router';
import { isToday } from 'date-fns';
import { Show } from 'solid-js';
import { fill, plural, useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { AlertIcon, FileIcon } from './icons';
import styles from './imports.module.scss';
import { useLibrary } from './library-store';
import type { ImportFile } from './sample';

/** What a file's status says: "Uploading 40%", "6 highlights found", "Couldn’t read the text"… */
export function useImportText() {
  const { t } = useI18n();
  const format = useFormat();
  const megabytes = (value: number) => `${format.number(value, 1)} MB`;

  return {
    status: (file: ImportFile) => {
      const found = file.marks?.length ?? 0;
      switch (file.status) {
        case 'uploading':
          return fill(t().imports.uploading, { n: Math.round(file.progress) });
        case 'reading':
          return fill(t().imports.reading, { n: Math.round(file.progress) });
        case 'ready':
          return fill(plural(found, t().imports.found), { n: found });
        case 'saved': {
          const kept = file.kept ?? 0;
          const day = file.savedOn && !isToday(file.savedOn) ? format.shortDate(file.savedOn) : '';
          return [
            fill(plural(kept, t().imports.saved), { n: kept }),
            found > kept && fill(t().imports.skipped, { n: found - kept }),
            day || t().library.today,
          ]
            .filter(Boolean)
            .join(' · ');
        }
        case 'failed':
          return t().imports.unreadable;
        case 'empty':
          return t().imports.noHighlights;
        case 'discarded':
          return t().imports.discarded;
        default:
          return '';
      }
    },
    /** Why a file wasn't uploaded. */
    rejection: (file: ImportFile) =>
      file.rejected === 'type'
        ? t().imports.wrongType
        : file.rejected === 'tooBig'
          ? t().imports.tooBig
          : fill(t().imports.noSpace, { left: megabytes(file.spaceLeft ?? 0) }),
  };
}

/** A file being uploaded or read (or just read), with its progress. */
export function ImportProgress(props: { file: ImportFile }) {
  const text = useImportText();
  const busy = () => props.file.status === 'uploading' || props.file.status === 'reading';
  return (
    <div class={styles.progress}>
      <FileIcon />
      <div class={styles['progress-body']}>
        <div class={styles['progress-head']}>
          <span class={styles['progress-name']}>{props.file.name}</span>
          <span class={styles['progress-status']}>{text.status(props.file)}</span>
        </div>
        <span class={styles.bar}>
          <span
            class={styles['bar-fill']}
            data-status={props.file.status}
            style={{ width: busy() ? `${Math.round(props.file.progress)}%` : '100%' }}
          />
        </span>
      </div>
    </div>
  );
}

/** A file that wasn't uploaded, why, and what to do about it. */
export function ImportRejected(props: { file: ImportFile }) {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  const text = useImportText();
  return (
    <div role="alert" class={styles.rejected}>
      <AlertIcon />
      <div class={styles['rejected-body']}>
        <span class={styles['rejected-name']}>
          {props.file.name} · {format.fileSize(props.file.megabytes)}
        </span>
        <span class={styles['rejected-text']}>{text.rejection(props.file)}</span>
        <div class={styles['rejected-actions']}>
          <Show when={props.file.rejected !== 'type'}>
            <A href="/settings/billing" class={styles['see-hive']}>
              {t().imports.seeHiveShort}
            </A>
          </Show>
          <button
            type="button"
            class={styles.dismiss}
            onClick={() => library.dismiss(props.file.id)}
          >
            {t().imports.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
