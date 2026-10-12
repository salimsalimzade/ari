import type { RouteSectionProps } from '@solidjs/router';
import { SourcePage } from '~/features/sources/source-page';

export default function Source(props: RouteSectionProps) {
  return <SourcePage slug={props.params.id ?? ''} />;
}
