import { Button } from '@ari/ui-kit';
import { Title } from '@solidjs/meta';
import { createEffect, For, on } from 'solid-js';
import { MobileHeader } from '~/features/shell/mobile-header';
import { fill, plural, useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { FileDrop } from './file-drop';
import { GridIcon, ListIcon, SearchIcon, UploadIcon } from './icons';
import { ImportTray } from './import-tray';
import { useAppleKeyboard } from './keyboard';
import styles from './library.module.scss';
import { LibraryFilters } from './library-filters';
import { type LibraryView, useLibrary } from './library-store';
import { MonthJump } from './month-jump';
import { SaveList } from './save-list';

// Below the sticky day heading, the first save still in view is the one being read.
const headingHeight = 44;

/** /library: every save with its source, filtered, by day. */
export function LibraryPage() {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  const apple = useAppleKeyboard();
  let list!: HTMLDivElement;

  const count = () => {
    const total = library.saves().length;
    const shown = library.filtered().length;
    return shown === total
      ? fill(plural(total, t().library.count), { n: format.number(total) })
      : fill(t().library.countFiltered, {
          n: format.number(shown),
          total: format.number(total),
        });
  };

  // When the list starts over below the top of the screen, scroll back up to it.
  createEffect(
    on(
      library.restarts,
      () => {
        const top = list.getBoundingClientRect().top + window.scrollY - 16;
        if (window.scrollY > top) window.scrollTo({ top });
      },
      { defer: true },
    ),
  );

  // Switching between list and grid keeps the save being read at the top.
  const switchView = (view: LibraryView) => {
    const reading = [...list.querySelectorAll<HTMLElement>('[data-save]')].find(
      (item) => item.getBoundingClientRect().bottom > headingHeight,
    );
    library.setView(view);
    const id = reading?.dataset.save;
    if (!id || window.scrollY < 10) return;
    const same = list.querySelector<HTMLElement>(`[data-save="${id}"]`);
    if (same)
      window.scrollTo({
        top: same.getBoundingClientRect().top + window.scrollY - headingHeight,
      });
  };

  return (
    <div class={styles.page}>
      <Title>{t().library.pageTitle}</Title>
      <MobileHeader
        actions={
          <button
            type="button"
            class={styles['phone-search']}
            aria-label={t().library.search}
            onClick={() => library.setPaletteOpen(true)}
          >
            <SearchIcon />
          </button>
        }
      />
      <header class={styles.toolbar}>
        <button type="button" class={styles.search} onClick={() => library.setPaletteOpen(true)}>
          <SearchIcon />
          <span class={styles['search-text']}>{t().library.search}</span>
          <kbd class={styles.kbd}>{apple() ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
        <Button icon={<UploadIcon />} class={styles.import} onClick={library.pickFiles}>
          {t().library.import}
        </Button>
      </header>
      <div class={styles['title-row']}>
        <div class={styles.heading}>
          <h1 class={styles.title}>{t().library.title}</h1>
          <p class={styles.count}>{count()}</p>
        </div>
        <div class={styles.views} role="radiogroup" aria-label={t().library.view}>
          <For each={['list', 'grid'] as const}>
            {(view) => (
              <label class={styles.view}>
                <input
                  type="radio"
                  name="library-view"
                  class={styles.radio}
                  checked={library.view() === view}
                  onChange={() => switchView(view)}
                />
                {view === 'list' ? <ListIcon /> : <GridIcon />}
                <span class={styles['view-name']}>{t().library.views[view]}</span>
              </label>
            )}
          </For>
        </div>
      </div>
      <LibraryFilters />
      <div class={styles.body}>
        <div ref={list} class={styles.list}>
          <SaveList />
        </div>
        <MonthJump list={() => list} />
      </div>
      <ImportTray />
      <FileDrop />
    </div>
  );
}
