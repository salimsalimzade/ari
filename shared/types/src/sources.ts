import type { ResponseBody } from '@ari/utils';
import type { paths } from './schema';

type ListSources = paths['/api/v1/sources']['get'];
type SourceCounts = paths['/api/v1/sources/counts']['get'];
type GetSource = paths['/api/v1/sources/{id}']['get'];

/** The kind tab and paging of the Sources page. */
export type ListSourcesQuery = NonNullable<ListSources['parameters']['query']>;
/**
 * One page of sources with saves, the one saved from most recently first; `nextCursor` is left out
 * on the last page.
 */
export type SourcePageResponse = ResponseBody<ListSources>;

/** A source with what is saved from it: counts, colors, its newest highlight, first and last save. */
export type SourceSummaryResponse = ResponseBody<GetSource>;

/** How many sources with saves there are, in all and of each kind. */
export type SourceCountsResponse = ResponseBody<SourceCounts>;
