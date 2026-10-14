import type { RequestBody, ResponseBody } from '@ari/utils';
import type { paths } from './schema';

type ListImports = paths['/api/v1/imports']['get'];
type GetImport = paths['/api/v1/imports/{id}']['get'];
type ReviewImport = paths['/api/v1/imports/{id}/review']['put'];

/** The Imports page: the files not dismissed, newest first, and the upload space. */
export type ImportsResponse = ResponseBody<ListImports>;
/** One uploaded file and how far it got; with its marks once read (from `GET /imports/{id}`). */
export type ImportResponse = ResponseBody<GetImport>;
/** Something reading found in a file, to tick or untick in the review. */
export type ImportMarkResponse = NonNullable<ImportResponse['marks']>[number];

/** The review: the source's title and author, a tag and color for all, and the ticked marks. */
export type ReviewImportRequest = RequestBody<ReviewImport>;
/** How many saves the review added to the Library and removed from it. */
export type ReviewImportResponse = ResponseBody<ReviewImport>;
