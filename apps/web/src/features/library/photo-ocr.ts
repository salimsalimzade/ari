import { findMarks, type OcrWord, type PhotoMark } from './photo-marks';

// Photo import (F12): Ari reads a photographed page in the browser with tesseract.js, from the
// files vite.config.ts copies into public/ocr/, and finds what is marked on it (photo-marks.ts).
// Only the marked words go to ari-api, never the photo.

/** The photos Ari reads, by their type; tesseract.js reads these in every browser. */
export const photoTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
const photoExtensions = ['jpg', 'jpeg', 'png', 'webp'];

export const isPhoto = (name: string) =>
  photoExtensions.includes(name.split('.').pop()?.toLowerCase() ?? '');

/** The photo's type for ari-api, from the file's own or its name. */
export function photoType(file: File): (typeof photoTypes)[number] {
  const known = photoTypes.find((type) => type === file.type);
  if (known) return known;
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
}

// The Latin-script languages Ari reads, English first. Read together with them, Russian turns
// Latin text into Cyrillic look-alikes and the other way round, so a line they read badly is read
// again in Russian alone. tesseract.js caches each language's data after its first use.
const latin = ['eng', 'aze', 'tur'];
const cyrillic = ['rus'];
// A line read with less confidence than this (0 to 100) is tried in Russian too.
const unsure = 60;
// Bigger photos take longer and read no better.
const longestSide = 3000;

// The photo's orientation is applied by drawing it, so its words and pixels line up.
async function drawn(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, longestSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('No canvas to read the photo on');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { canvas, raster: context.getImageData(0, 0, canvas.width, canvas.height) };
}

type Recognized = Awaited<ReturnType<Tesseract.Worker['recognize']>>['data'];
type OcrLine = NonNullable<Recognized['blocks']>[number]['paragraphs'][number]['lines'][number];

const linesOf = (data: Recognized) =>
  (data.blocks ?? []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines));

// A pen line through a word's edge often reads as a bracket or a bar.
const cleaned = (text: string) => text.trim().replace(/^[{}|[\]]+|[{}|[\]]+$/gu, '');

/** A line's words, each with the baseline's height under its middle. */
function wordsOf(line: OcrLine, index: number): OcrWord[] {
  const { x0, y0, x1, y1 } = line.baseline;
  const slope = x1 === x0 ? 0 : (y1 - y0) / (x1 - x0);
  return line.words
    .map((word) => ({
      text: cleaned(word.text),
      box: word.bbox,
      baseline: y0 + slope * ((word.bbox.x0 + word.bbox.x1) / 2 - x0),
      line: index,
    }))
    .filter((word) => /[\p{L}\p{N}]/u.test(word.text));
}

/**
 * Reads the photo and finds its marks, telling how far it got (0 to 1: getting the reader ready
 * is the first tenth). Throws when the photo can't be opened or the reader fails to load.
 */
export async function readPhotoMarks(
  file: File,
  progress: (share: number) => void,
): Promise<PhotoMark[]> {
  const [{ createWorker, OEM }, { canvas, raster }] = await Promise.all([
    import('tesseract.js'),
    drawn(file),
  ]);
  const base = `${location.origin}/ocr`;
  const reader = (languages: string[], logger?: (message: Tesseract.LoggerMessage) => void) =>
    createWorker(languages, OEM.LSTM_ONLY, {
      workerPath: `${base}/worker.min.js`,
      corePath: `${base}/core`,
      langPath: `${base}/lang`,
      workerBlobURL: false,
      logger,
    });
  const worker = await reader(latin, (message) =>
    progress(
      message.status === 'recognizing text' ? 0.1 + message.progress * 0.8 : message.progress * 0.1,
    ),
  );
  let russian: Tesseract.Worker | undefined;
  try {
    const lines = linesOf((await worker.recognize(canvas, {}, { blocks: true, text: false })).data);
    for (const [index, line] of lines.entries()) {
      if (line.confidence >= unsure) continue;
      russian ??= await reader(cyrillic);
      // Some room around the line, which tesseract needs to read it well.
      const pad = Math.round((line.bbox.y1 - line.bbox.y0) * 0.3);
      const left = Math.max(0, line.bbox.x0 - pad);
      const top = Math.max(0, line.bbox.y0 - pad);
      const rectangle = {
        left,
        top,
        width: Math.min(canvas.width, line.bbox.x1 + pad) - left,
        height: Math.min(canvas.height, line.bbox.y1 + pad) - top,
      };
      const again = linesOf(
        (await russian.recognize(canvas, { rectangle }, { blocks: true, text: false })).data,
      );
      if (again.length === 1 && again[0].confidence > line.confidence) lines[index] = again[0];
    }
    progress(0.95);
    const marks = findMarks(
      raster,
      lines.flatMap((line, index) => wordsOf(line, index)),
    );
    progress(1);
    return marks;
  } finally {
    void worker.terminate();
    void russian?.terminate();
  }
}
