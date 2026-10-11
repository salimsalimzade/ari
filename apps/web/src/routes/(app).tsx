import type { RouteSectionProps } from '@solidjs/router';
import { AppShell } from '~/features/shell/app-shell';

// The signed-in pages, inside the sidebar and tab bar.
export default function App(props: RouteSectionProps) {
  return <AppShell>{props.children}</AppShell>;
}
