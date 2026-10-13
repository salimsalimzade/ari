/** A part of the visible page, in CSS pixels from its top left corner. */
export type Area = { left: number; top: number; width: number; height: number };

/**
 * Cuts an area out of a screenshot of the visible page (captureVisibleTab's PNG data: URL) and
 * returns it as a JPEG data: URL. The screenshot is in device pixels, so the area is scaled by its
 * width over the viewport's.
 */
export async function cropShot(shot: string, area: Area, viewportWidth: number) {
  const bitmap = await createImageBitmap(await (await fetch(shot)).blob());
  const scale = bitmap.width / viewportWidth;
  const canvas = new OffscreenCanvas(
    Math.max(1, Math.round(area.width * scale)),
    Math.max(1, Math.round(area.height * scale)),
  );
  canvas
    .getContext('2d')
    ?.drawImage(
      bitmap,
      area.left * scale,
      area.top * scale,
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** The part of a box inside the viewport, or null when too little of it shows to clip. */
export function visiblePart(rect: DOMRect): Area | null {
  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const width = Math.min(window.innerWidth, rect.right) - left;
  const height = Math.min(window.innerHeight, rect.bottom) - top;
  return width >= 4 && height >= 4 ? { left, top, width, height } : null;
}
