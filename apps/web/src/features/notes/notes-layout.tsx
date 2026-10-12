import { Button } from '@ari/ui-kit';
import { Title } from '@solidjs/meta';
import { useLocation } from '@solidjs/router';
import { type JSX, Show } from 'solid-js';
import { NotesIcon } from '~/features/shell/icons';
import { MobileHeader } from '~/features/shell/mobile-header';
import { useI18n } from '~/i18n/i18n';
import styles from './notes.module.scss';
import { NotesList, useNewNote } from './notes-list';
import { useNotes } from './notes-store';

/**
 * Every /notes page. Wide screens: the list of notes beside the open note. Phones: /notes is the
 * list and a note has the screen to itself. Without notes, the empty state instead.
 */
export function NotesLayout(props: { children: JSX.Element }) {
  const notes = useNotes();
  const location = useLocation();
  const isIndex = () => location.pathname.replace(/\/$/, '') === '/notes';
  return (
    <Show when={notes.list().length} fallback={<NotesEmpty />}>
      <div class={styles.layout} data-index={isIndex() ? '' : undefined}>
        <Show when={isIndex()}>
          <MobileHeader />
        </Show>
        <NotesList class={styles.side} />
        <div class={styles.content}>{props.children}</div>
      </div>
    </Show>
  );
}

/** /notes on wide screens, beside the list: nothing open yet. */
export function NotesHome() {
  const { t } = useI18n();
  return (
    <div class={styles.home}>
      <Title>{t().notes.pageTitle}</Title>
      <span class={styles['state-icon']}>
        <NotesIcon />
      </span>
      <p class={styles['state-text']}>{t().notes.pick}</p>
    </div>
  );
}

function NotesEmpty() {
  const { t } = useI18n();
  const newNote = useNewNote();
  return (
    <div class={styles.empty}>
      <Title>{t().notes.pageTitle}</Title>
      <MobileHeader />
      <h2 class={styles['empty-heading']}>{t().notes.title}</h2>
      <div class={styles.state}>
        <span class={styles['state-icon']}>
          <NotesIcon />
        </span>
        <h3 class={styles['state-title']}>{t().notes.emptyTitle}</h3>
        <p class={styles['state-text']}>{t().notes.emptyText}</p>
        <Button variant="primary" class={styles['state-action']} onClick={newNote}>
          {t().notes.newNote}
        </Button>
      </div>
    </div>
  );
}
