import type {
  FacetsResponse,
  GetSaveResponse,
  ListSavesQuery,
  SaveFacetsQuery,
  SavePageResponse,
  UpdateSaveRequest,
  UpdateSaveResponse,
} from '@ari/types';
import { request, searchOf } from './client';

/** The signed-in user's saves, newest first, a page at a time (send `nextCursor` back). */
export function listSaves(query: ListSavesQuery = {}) {
  return request<SavePageResponse>(`/api/v1/saves${searchOf(query)}`);
}

/** The type tabs' counts for the filters, and the tag, color and source choices. */
export function fetchSaveFacets(query: SaveFacetsQuery = {}) {
  return request<FacetsResponse>(`/api/v1/saves/facets${searchOf(query)}`);
}

/** One save with its source; a 404 is a save that doesn't exist or isn't theirs. */
export function fetchSave(id: string) {
  return request<GetSaveResponse>(`/api/v1/saves/${encodeURIComponent(id)}`);
}

/** Changes a save's color, comment or tags; a field left out stays as it is. */
export function updateSave(id: string, body: UpdateSaveRequest) {
  return request<UpdateSaveResponse>(`/api/v1/saves/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body,
  });
}

export function deleteSave(id: string) {
  return request<void>(`/api/v1/saves/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
