import { useNavigate } from '@solidjs/router';
import { Show } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import { CheckIcon, CloseIcon } from './icons';
import { useLibrary } from './library-store';
import styles from './toast.module.scss';

/** What just happened, at the bottom of any signed-in page: a save, an import, a copy. */
export function LibraryToast() {
  const { t } = useI18n();
  const library = useLibrary();
  const navigate = useNavigate();
  return (
    <div role="status" class={styles.region}>
      <Show when={library.toast()}>
        {(toast) => (
          <div class={styles.toast}>
            <span class={styles.icon}>
              <CheckIcon />
            </span>
            <span class={styles.text}>{toast().text}</span>
            <Show when={toast().source}>
              {(source) => (
                <button
                  type="button"
                  class={styles.action}
                  onClick={() => {
                    library.showSource(source());
                    library.closeToast();
                    navigate('/library');
                  }}
                >
                  {t().imports.showOnlyFile}
                </button>
              )}
            </Show>
            <button
              type="button"
              class={styles.close}
              aria-label={t().imports.closeToast}
              onClick={library.closeToast}
            >
              <CloseIcon />
            </button>
          </div>
        )}
      </Show>
    </div>
  );
}
