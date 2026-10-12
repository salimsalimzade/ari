import type { RouteSectionProps } from '@solidjs/router';
import { ReadingView } from '~/features/library/reading-view';

export default function Save(props: RouteSectionProps) {
  return <ReadingView id={props.params.id ?? ''} />;
}
