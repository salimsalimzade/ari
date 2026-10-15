import type {
  ImportResponse,
  ImportsResponse,
  PhotoImportRequest,
  ReviewImportRequest,
  ReviewImportResponse,
} from '@ari/types';
import { request, upload } from './client';

const path = (id: string) => `/api/v1/imports/${encodeURIComponent(id)}`;

/** The Imports page: every file not dismissed, newest first, and the upload space. */
export function listImports() {
  return request<ImportsResponse>('/api/v1/imports');
}

/**
 * Uploads a PDF or Word file as the multipart field `file`, reporting the share sent; ari-api
 * answers with the import, QUEUED, and reads it in the background.
 */
export function uploadImport(file: File, onProgress?: (sent: number) => void) {
  const body = new FormData();
  body.append('file', file, file.name);
  return upload<ImportResponse>('/api/v1/imports', body, onProgress);
}

/**
 * Keeps the marks found on a photo, which the browser read: ari-api answers with the import, READY
 * with its marks for the same review as a file's, or EMPTY.
 */
export function importPhoto(body: PhotoImportRequest) {
  return request<ImportResponse>('/api/v1/imports/photo', { method: 'POST', body });
}

/** One import, with its marks once it is READY or SAVED; a 404 is one that isn't theirs. */
export function fetchImport(id: string) {
  return request<ImportResponse>(path(id));
}

/** Saves the ticked marks to the Library (and removes unticked saved ones). */
export function reviewImport(id: string, body: ReviewImportRequest) {
  return request<ReviewImportResponse>(`${path(id)}/review`, { method: 'PUT', body });
}

/** Reads a failed file again. */
export function retryImport(id: string) {
  return request<ImportResponse>(`${path(id)}/retry`, { method: 'POST' });
}

/** Hides a failed, empty or discarded file from the Imports page. */
export function dismissImport(id: string) {
  return request<void>(`${path(id)}/dismiss`, { method: 'POST' });
}

/** Drops a file before its review: nothing reaches the Library. */
export function discardImport(id: string) {
  return request<void>(path(id), { method: 'DELETE' });
}
