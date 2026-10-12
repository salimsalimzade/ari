import type { RouteSectionProps } from '@solidjs/router';
import { NotesLayout } from '~/features/notes/notes-layout';

export default function Notes(props: RouteSectionProps) {
  return <NotesLayout>{props.children}</NotesLayout>;
}
