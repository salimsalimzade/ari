import { describe, expect, it } from 'vitest';
import { isPhoto, photoType } from './photo-ocr';

describe('photos', () => {
  it('knows photos by their names', () => {
    expect(isPhoto('IMG_0412.JPG')).toBe(true);
    expect(isPhoto('page.webp')).toBe(true);
    expect(isPhoto('notes.pdf')).toBe(false);
    expect(isPhoto('scan.heic')).toBe(false);
  });

  it('sends the file’s type, or one from its name', () => {
    expect(photoType(new File([], 'a.png', { type: 'image/png' }))).toBe('image/png');
    expect(photoType(new File([], 'a.webp'))).toBe('image/webp');
    expect(photoType(new File([], 'a.JPG'))).toBe('image/jpeg');
  });
});
