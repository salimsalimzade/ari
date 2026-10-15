import { isToday } from 'date-fns';
import { fill, plural, useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { AlertIcon, FileIcon } from './icons';
import type { ImportFile } from './imports';
import styles from './imports.module.scss';
import { useLibrary } from './library-store';

/** What a file's status says: "Uploading 40%", "6 highlights found", "Couldn’t read the text"… */
export function useImportText() {
  const { t } = useI18n();
  const format = useFormat();
  const megabytes = (value: number) => `${format.number(value, 1)} MB`;

  return {
    status: (file: ImportFile) => {
      switch (file.status) {
        case 'uploading':
          return fill(t().imports.uploading, { n: Math.round(file.progress) });
        case 'queued':
          return t().imports.queued;
        case 'reading':
          return t().imports.reading;
        case 'ready':
          return fill(plural(file.found, t().imports.found), { n: file.found });
        case 'saved': {
          const day = file.savedOn && !isToday(file.savedOn) ? format.shortDate(file.savedOn) : '';
          return [
            fill(plural(file.kept, t().imports.saved), { n: file.kept }),
            file.found > file.kept && fill(t().imports.skipped, { n: file.found - file.kept }),
            day || t().library.today,
          ]
            .filter(Boolean)
            .join(' · ');
        }
        case 'failed':
          return file.error === 'ENCRYPTED' ? t().imports.encrypted : t().imports.unreadable;
        case 'empty':
          return t().imports.noHighlights;
        case 'discarded':
          return t().imports.discarded;
        default:
          return '';
      }
    },
    /** Why a file wasn't uploaded. */
    rejection: (file: ImportFile) => {
      switch (file.rejected) {
        case 'type':
          return t().imports.wrongType;
        case 'noSpace':
          return fill(t().imports.noSpace, { left: megabytes(file.spaceLeft ?? 0) });
        case 'unreadable':
          return t().imports.photoUnreadable;
        default:
          return t().imports.uploadFailed;
      }
    },
  };
}

/**
 * A file being uploaded or read (or just read), with its progress: the upload's share, or how far
 * this page has read a photo, then a bar that waits while ari-api reads a file.
 */
export function ImportProgress(props: { file: ImportFile }) {
  const text = useImportText();
  // ari-api's files are at 100: only a photo read here moves while it reads.
  const width = () =>
    props.file.status === 'uploading' || props.file.status === 'reading'
      ? `${props.file.progress}%`
      : '100%';
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
            style={{ width: width() }}
          />
        </span>
      </div>
    </div>
  );
}

/** A file that wasn't uploaded, why, and a way to put the message away. */
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
