import { Button } from '@ari/ui-kit';
import { A, useNavigate } from '@solidjs/router';
import { For } from 'solid-js';
import { PlusIcon } from '~/features/library/icons';
import { fill, plural, useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import styles from './notes.module.scss';
import { useNotes } from './notes-store';
import type { Note } from './sample';

/** A note's line under its title: "Edited 10 min ago · 3 quotes", "Created just now · empty". */
export function useNoteMeta() {
  const { t } = useI18n();
  const format = useFormat();
  const notes = useNotes();
  return (note: Note) => {
    const when = format.ago(note.editedAt ?? note.createdAt, notes.now());
    const quotes = notes.quotesOf(note).length;
    const content = notes.isEmpty(note)
      ? t().notes.empty
      : quotes
        ? fill(plural(quotes, t().notes.quotes), { n: format.number(quotes) })
        : '';
    return [fill(note.editedAt ? t().notes.edited : t().notes.created, { when }), content]
      .filter(Boolean)
      .join(' · ');
  };
}

/** Starts an empty note and opens it. */
export function useNewNote() {
  const notes = useNotes();
  const navigate = useNavigate();
  return () => navigate(`/notes/${notes.create()}`);
}

/** The column of notes, newest change first, with New note above it. */
export function NotesList(props: { class?: string }) {
  const { t } = useI18n();
  const notes = useNotes();
  const meta = useNoteMeta();
  const newNote = useNewNote();
  return (
    <nav class={`${styles.list} ${props.class ?? ''}`} aria-labelledby="notes-heading">
      <div class={styles['list-head']}>
        <h2 id="notes-heading" class={styles['list-title']}>
          {t().notes.title}
        </h2>
        <Button variant="primary" icon={<PlusIcon />} onClick={newNote}>
          {t().notes.newNote}
        </Button>
      </div>
      <For each={notes.list()}>
        {(note) => (
          <A href={`/notes/${note.id}`} end class={styles.item} activeClass={styles.current}>
            <span class={styles['item-title']}>{note.title.trim() || t().notes.untitledNote}</span>
            <span class={styles['item-meta']}>{meta(note)}</span>
          </A>
        )}
      </For>
    </nav>
  );
}
