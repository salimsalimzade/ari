import { describe, expect, it } from 'vitest';
import { type Box, findMarks, type OcrWord, type Raster } from './photo-marks';

type Rgb = [number, number, number];

// A warm, slightly gray page, as a phone camera sees paper indoors.
const paperRgb: Rgb = [245, 238, 225];
const ink: Rgb = [30, 30, 30];

function page(): Raster {
  const width = 640;
  const height = 480;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set([...paperRgb, 255], i * 4);
  return { data, width, height };
}

function paint(raster: Raster, x: number, y: number, rgb: Rgb) {
  if (x < 0 || y < 0 || x >= raster.width || y >= raster.height) return;
  raster.data.set(rgb, (Math.round(y) * raster.width + Math.round(x)) * 4);
}

function rect(raster: Raster, box: Box, rgb: Rgb) {
  for (let y = box.y0; y < box.y1; y++)
    for (let x = box.x0; x < box.x1; x++) paint(raster, x, y, rgb);
}

// Words are 80px wide and 30px high, four to a line, lines 60px apart.
const box = (line: number, place: number): Box => ({
  x0: 40 + place * 90,
  y0: 40 + line * 60,
  x1: 120 + place * 90,
  y1: 70 + line * 60,
});

/** Letters: dark strokes with gaps between them, like printed text. */
function letters(raster: Raster, at: Box) {
  for (let x = at.x0; x + 6 <= at.x1; x += 10)
    rect(raster, { x0: x, y0: at.y0 + 5, x1: x + 6, y1: at.y1 - 5 }, ink);
}

function words(raster: Raster, lines: string[][]): OcrWord[] {
  return lines.flatMap((line, lineIndex) =>
    line.map((text, place) => {
      const at = box(lineIndex, place);
      letters(raster, at);
      return { text, box: at, baseline: at.y1 - 5, line: lineIndex };
    }),
  );
}

const text = [
  ['alpha', 'beta', 'gamma', 'delta'],
  ['epsilon', 'zeta', 'eta', 'theta'],
  ['iota', 'kappa', 'lambda', 'mu'],
];

// A highlighter's color as it shows on this paper.
const highlighter = (marker: Rgb): Rgb => marker.map((c, i) => (c * paperRgb[i]) / 255) as Rgb;

describe('findMarks', () => {
  it('finds nothing on plain printed text', () => {
    const raster = page();
    expect(findMarks(raster, words(raster, text))).toEqual([]);
  });

  it('finds highlighted words, one mark for words highlighted one after another', () => {
    const raster = page();
    for (const at of [box(0, 1), box(0, 2)])
      rect(raster, { ...at, x1: at.x1 + 10 }, highlighter([255, 240, 110]));
    rect(raster, box(2, 3), highlighter([120, 200, 255]));
    const marks = findMarks(raster, words(raster, text));
    expect(marks.map(({ type, text }) => ({ type, text }))).toEqual([
      { type: 'highlight', text: 'beta gamma' },
      { type: 'highlight', text: 'mu' },
    ]);
    expect(marks[0].color).toMatch(/^#ff/);
  });

  it('starts a new mark where the highlighter changes color', () => {
    const raster = page();
    rect(raster, box(1, 0), highlighter([255, 240, 110]));
    rect(raster, box(1, 1), highlighter([255, 130, 200]));
    expect(findMarks(raster, words(raster, text)).map((mark) => mark.text)).toEqual([
      'epsilon',
      'zeta',
    ]);
  });

  it('finds words underlined or crossed out with a pen, in its color', () => {
    const raster = page();
    for (const place of [0, 1]) {
      const at = box(0, place);
      rect(raster, { x0: at.x0 - 2, y0: at.y1 + 3, x1: at.x1 + 10, y1: at.y1 + 5 }, [30, 60, 200]);
    }
    const struck = box(2, 2);
    rect(
      raster,
      { x0: struck.x0 - 2, y0: struck.y0 + 14, x1: struck.x1 + 2, y1: struck.y0 + 16 },
      [200, 30, 30],
    );
    const marks = findMarks(raster, words(raster, text));
    expect(marks.map(({ type, text }) => ({ type, text }))).toEqual([
      { type: 'underline', text: 'alpha beta' },
      { type: 'strike', text: 'lambda' },
    ]);
    const [r, g, b] = [1, 3, 5].map((i) =>
      Number.parseInt(marks[0].color?.slice(i, i + 2) ?? '', 16),
    );
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });

  it('finds the words a pen circles, between the words around them', () => {
    const raster = page();
    // An ellipse around "eta", passing through the gaps beside it and between the lines.
    for (let a = 0; a < Math.PI * 2; a += 0.002) {
      for (let t = 0; t < 3; t++) {
        paint(raster, 260 + (44 + t) * Math.cos(a), 115 + (30 + t) * Math.sin(a), [30, 60, 200]);
      }
    }
    const marks = findMarks(raster, words(raster, text));
    expect(marks.map(({ type, text }) => ({ type, text }))).toEqual([
      { type: 'drawn', text: 'eta' },
    ]);
  });

  it('counts words a sloppy circle cuts through as circled too', () => {
    const raster = page();
    for (let a = 0; a < Math.PI * 2; a += 0.002) {
      for (let t = 0; t < 3; t++) {
        paint(raster, 260 + (100 + t) * Math.cos(a), 115 + (34 + t) * Math.sin(a), [30, 60, 200]);
      }
    }
    const marks = findMarks(raster, words(raster, text));
    expect(marks.map(({ type, text }) => ({ type, text }))).toEqual([
      { type: 'drawn', text: 'zeta eta theta' },
    ]);
  });

  it('finds the lines a hand-drawn bracket in the margin marks', () => {
    const raster = page();
    for (let y = 36; y < 136; y++) {
      const x = 20 + 6 * Math.sin(y / 9);
      for (let t = 0; t < 3; t++) paint(raster, x + t, y, ink);
    }
    expect(
      findMarks(raster, words(raster, text)).map(({ type, text }) => ({ type, text })),
    ).toEqual([{ type: 'drawn', text: 'alpha beta gamma delta epsilon zeta eta theta' }]);
  });

  it('leaves out a straight printed rule and a printed frame', () => {
    const raster = page();
    rect(raster, { x0: 20, y0: 36, x1: 22, y1: 196 }, ink);
    const frame = { x0: 125, y0: 95, x1: 395, y1: 135 };
    rect(raster, { ...frame, y1: frame.y0 + 2 }, ink);
    rect(raster, { ...frame, y0: frame.y1 - 2 }, ink);
    rect(raster, { ...frame, x1: frame.x0 + 2 }, ink);
    rect(raster, { ...frame, x0: frame.x1 - 2 }, ink);
    expect(findMarks(raster, words(raster, text))).toEqual([]);
  });

  it('reads the line through crossed-out words as spaces, not hyphens', () => {
    const raster = page();
    const from = box(0, 0);
    const to = box(0, 1);
    rect(raster, { x0: from.x0 - 4, y0: from.y0 + 14, x1: to.x1 + 4, y1: from.y0 + 16 }, ink);
    const marks = findMarks(raster, words(raster, [['-always-', 'choose-the', 'closest', 'site']]));
    expect(marks.map(({ type, text }) => ({ type, text }))).toEqual([
      { type: 'strike', text: 'always choose the' },
    ]);
  });

  it('joins a word broken with a hyphen at a line’s end', () => {
    const raster = page();
    rect(raster, box(0, 3), highlighter([255, 240, 110]));
    rect(raster, box(1, 0), highlighter([255, 240, 110]));
    const marks = findMarks(
      raster,
      words(raster, [
        ['the', 'old', 'queen', 'colo-'],
        ['ny', 'leaves', 'first', 'today'],
      ]),
    );
    expect(marks.map((mark) => mark.text)).toEqual(['colony']);
  });
});
