import { useNotes } from '~/features/notes/notes-store';

/** Whether a save is quoted in one of the notes. */
export function useQuoted() {
  const notes = useNotes();
  return (saveId: string) => notes.list().some((note) => note.saveIds.includes(saveId));
}
