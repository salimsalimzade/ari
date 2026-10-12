import type { RouteSectionProps } from '@solidjs/router';
import { NoteEditor } from '~/features/notes/note-editor';

export default function Note(props: RouteSectionProps) {
  return <NoteEditor id={props.params.id ?? ''} />;
}
