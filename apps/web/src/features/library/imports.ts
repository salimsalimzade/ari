import type { ImportMarkResponse, ImportResponse } from '@ari/types';
import type { HighlightColor } from '@ari/ui-kit';

// Imports from ari-api (F5, F11, sequences §5): a PDF or Word file is uploaded, read in the
// background for its marks, then reviewed into the Library.

/** The files Ari imports, by their names; ari-api checks the bytes too. */
export const importAccept = '.pdf,.docx';
const importable = ['pdf', 'docx'];

export const isImportable = (name: string) =>
  importable.includes(name.split('.').pop()?.toLowerCase() ?? '');

export type MarkType = 'highlight' | 'underline' | 'drawn' | 'handwritten' | 'strike' | 'note';

/** Something Ari found in an imported file, waiting to be saved or skipped. */
export type ImportMark = {
  id: string;
  type: MarkType;
  color: HighlightColor;
  /** The marked words or a note's text; empty for a handwritten mark. */
  text: string;
  page?: number;
  comment?: string;
  /** The file's own highlight color, when Ari mapped it to one of its five. */
  fromColor?: 'orange' | 'red';
  /** A picture of a drawn or handwritten mark: a link that works for an hour. */
  imageUrl?: string;
  /** Ticked to be saved. */
  on: boolean;
  /** Already in the Library. */
  saved: boolean;
};

/**
 * Where a file is: uploading and rejected stay in this page; queued and reading while ari-api
 * reads it; then ready to review, empty or failed; saved once reviewed, or discarded.
 */
export type ImportStatus =
  | 'uploading'
  | 'queued'
  | 'reading'
  | 'ready'
  | 'saved'
  | 'failed'
  | 'empty'
  | 'rejected'
  | 'discarded';

export type ImportFile = {
  /** ari-api's id; a file still uploading or rejected has one of this page's. */
  id: string;
  name: string;
  megabytes: number;
  status: ImportStatus;
  /** Percent of the upload. */
  progress: number;
  title: string;
  author: string;
  /** How many marks reading found. */
  found: number;
  /** How many of them are in the Library. */
  kept: number;
  savedOn?: Date;
  /** Why reading failed: UNREADABLE, ENCRYPTED or READ_FAILED. */
  error?: string;
  /** Why it wasn't uploaded. */
  rejected?: 'type' | 'noSpace' | 'failed';
  /** Megabytes left when it didn't fit. */
  spaceLeft?: number;
  /** Once read, from `getImport` only. */
  marks?: ImportMark[];
};

const megabytesOf = (bytes = 0) => bytes / 1048576;

/** A file's name without its extension, as the title until reading finds one. */
export const titleOf = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');

export function toImportMark(response: ImportMarkResponse): ImportMark {
  return {
    id: response.id ?? '',
    type: (response.type?.toLowerCase() ?? 'highlight') as MarkType,
    color: (response.color?.toLowerCase() ?? 'yellow') as HighlightColor,
    text: response.text ?? '',
    page: response.pageNumber,
    comment: response.comment,
    fromColor: response.fileColor?.toLowerCase() as ImportMark['fromColor'],
    imageUrl: response.imageUrl,
    on: !!response.selected,
    saved: !!response.saveId,
  };
}

export function toImportFile(response: ImportResponse): ImportFile {
  const name = response.fileName ?? '';
  return {
    id: response.id ?? '',
    name,
    megabytes: megabytesOf(response.sizeBytes),
    status: (response.status?.toLowerCase() ?? 'queued') as ImportStatus,
    progress: 100,
    title: response.title ?? titleOf(name),
    author: response.author ?? '',
    found: response.marksCount ?? 0,
    kept: response.keptCount ?? 0,
    savedOn: response.reviewedAt ? new Date(response.reviewedAt) : undefined,
    error: response.errorCode,
    marks: response.marks?.map(toImportMark),
  };
}

/**
 * The upload space in megabytes: what the files take, and everyone's limit. A file of any size
 * goes in while it fits.
 */
export type Space = { used: number; limit: number };

export function toSpace(response?: { usedBytes?: number; limitBytes?: number }): Space {
  return {
    used: megabytesOf(response?.usedBytes),
    limit: megabytesOf(response?.limitBytes ?? 52428800),
  };
}

export const isBusy = (file: ImportFile) =>
  file.status === 'uploading' || file.status === 'queued' || file.status === 'reading';
