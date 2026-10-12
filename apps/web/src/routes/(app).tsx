import type { RouteSectionProps } from '@solidjs/router';
import { LibraryProvider } from '~/features/library/library-store';
import { NotesProvider } from '~/features/notes/notes-store';
import { AppShell } from '~/features/shell/app-shell';

// The signed-in pages, inside the sidebar and tab bar, sharing the Library's and the notes' state.
export default function App(props: RouteSectionProps) {
  return (
    <LibraryProvider>
      <NotesProvider>
        <AppShell>{props.children}</AppShell>
      </NotesProvider>
    </LibraryProvider>
  );
}
