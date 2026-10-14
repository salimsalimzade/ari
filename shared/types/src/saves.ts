import type { ErrorBody, RequestBody, ResponseBody } from '@ari/utils';
import type { paths } from './schema';

type CreateSave = paths['/api/v1/saves']['post'];
type ListSaves = paths['/api/v1/saves']['get'];
type GetSave = paths['/api/v1/saves/{id}']['get'];
type UpdateSave = paths['/api/v1/saves/{id}']['patch'];
type Facets = paths['/api/v1/saves/facets']['get'];

/** A highlight or a table clip, as JSON; an image clip sends it as the multipart `save` part. */
export type CreateSaveRequest = NonNullable<
  CreateSave['requestBody']
>['content']['application/json'];
export type SaveResponse = ResponseBody<CreateSave>;
export type CreateSaveError = ErrorBody<CreateSave>;

/** The Library's filters and paging: `tag`, `color` and `source` repeat. */
export type ListSavesQuery = NonNullable<ListSaves['parameters']['query']>;
/** One page of saves, newest first; `nextCursor` is left out on the last page. */
export type SavePageResponse = ResponseBody<ListSaves>;

export type GetSaveResponse = ResponseBody<GetSave>;

export type UpdateSaveRequest = RequestBody<UpdateSave>;
export type UpdateSaveResponse = ResponseBody<UpdateSave>;

/** The filters the facets count by: the list's, without paging. */
export type SaveFacetsQuery = NonNullable<Facets['parameters']['query']>;
export type FacetsResponse = ResponseBody<Facets>;
