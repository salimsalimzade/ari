import type {
  ListSourcesQuery,
  SourceCountsResponse,
  SourcePageResponse,
  SourceSummaryResponse,
} from '@ari/types';
import { request, searchOf } from './client';

/**
 * The signed-in user's sources with saves, the one saved from most recently first, a page at a
 * time (send `nextCursor` back).
 */
export function listSources(query: ListSourcesQuery = {}) {
  return request<SourcePageResponse>(`/api/v1/sources${searchOf(query)}`);
}

/** How many sources with saves there are, of each kind. */
export function fetchSourceCounts() {
  return request<SourceCountsResponse>('/api/v1/sources/counts');
}

/**
 * One source with what is saved from it; a 404 is a source that doesn't exist, isn't theirs, or
 * has nothing saved from it any more.
 */
export function fetchSource(id: string) {
  return request<SourceSummaryResponse>(`/api/v1/sources/${encodeURIComponent(id)}`);
}
