import type { RouteSectionProps } from '@solidjs/router';
import { ImportReview } from '~/features/library/import-review';

export default function Review(props: RouteSectionProps) {
  return <ImportReview id={props.params.id ?? ''} />;
}
