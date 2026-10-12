import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { fill, useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { UploadIcon } from './icons';
import styles from './imports.module.scss';
import { useLibrary } from './library-store';

const hasFiles = (event: DragEvent) => !!event.dataTransfer?.types.includes('Files');

/**
 * Files dropped anywhere on the page are imported, and the page shows where to drop them while
 * files are dragged over it.
 */
export function FileDrop() {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  const [dragging, setDragging] = createSignal(false);

  onMount(() => {
    // dragenter and dragleave fire for every element crossed; the window is left at zero.
    let depth = 0;
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth++;
      setDragging(true);
    };
    const leave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    // Without this, the browser would open the file instead of dropping it here.
    const over = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const drop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      library.addFiles(event.dataTransfer?.files);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    onCleanup(() => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    });
  });

  return (
    <Show when={dragging()}>
      <div class={styles.drop} aria-hidden="true">
        <span class={styles['drop-icon']}>
          <UploadIcon />
        </span>
        <span class={styles['drop-title']}>{t().imports.dropHere}</span>
        <span class={styles['drop-text']}>
          {fill(t().imports.dropHereText, { left: `${format.number(library.space().left, 1)} MB` })}
        </span>
      </div>
    </Show>
  );
}
