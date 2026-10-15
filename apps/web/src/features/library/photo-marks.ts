// Finding the marks on a photographed page (F12), from its pixels and the words OCR found:
// highlighter behind words, a pen line under or through them, and pen drawings around them (a
// circle or box) or beside them (a bracket in the margin). Plain code over a raster, so it is
// tested without a browser.

/** A photo's pixels as RGBA, like the browser's ImageData. */
export type Raster = { data: Uint8ClampedArray; width: number; height: number };
export type Box = { x0: number; y0: number; x1: number; y1: number };
/**
 * A word OCR found, where it is, the height of its line's baseline under it (the letters stand on
 * it; descenders go below), and its line's place in reading order.
 */
export type OcrWord = { text: string; box: Box; baseline: number; line: number };

export type PhotoMarkType = 'highlight' | 'underline' | 'strike' | 'drawn';
/** Words marked one way, in reading order, with the marker's or pen's color as #rrggbb. */
export type PhotoMark = { type: PhotoMarkType; text: string; color?: string };

type Rgb = [number, number, number];

const luminance = ([r, g, b]: Rgb) => 0.299 * r + 0.587 * g + 0.114 * b;
const saturation = (rgb: Rgb) => {
  const max = Math.max(...rgb);
  return max ? (max - Math.min(...rgb)) / max : 0;
};
const brightness = (rgb: Rgb) => Math.max(...rgb) / 255;
function hue([r, g, b]: Rgb) {
  const max = Math.max(r, g, b);
  const chroma = max - Math.min(r, g, b);
  if (!chroma) return 0;
  const h =
    max === r ? ((g - b) / chroma) % 6 : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
  return (h * 60 + 360) % 360;
}
const hex = (rgb: Rgb) =>
  `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
const parseHex = (color: string): Rgb =>
  [1, 3, 5].map((i) => Number.parseInt(color.slice(i, i + 2), 16)) as Rgb;

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
const medianColor = (colors: Rgb[]): Rgb =>
  [0, 1, 2].map((c) => median(colors.map((rgb) => rgb[c]))) as Rgb;

/**
 * The page's paper as the camera saw it: the brightest part of the photo. Colors are measured
 * against it, so warm light or gray paper doesn't read as a highlight.
 */
export function paperColor(raster: Raster): Rgb {
  const step = Math.max(1, Math.floor(Math.sqrt((raster.width * raster.height) / 20000)));
  const samples: Rgb[] = [];
  for (let y = 0; y < raster.height; y += step) {
    for (let x = 0; x < raster.width; x += step) {
      const i = (y * raster.width + x) * 4;
      samples.push([raster.data[i], raster.data[i + 1], raster.data[i + 2]]);
    }
  }
  samples.sort((a, b) => luminance(a) - luminance(b));
  return medianColor(samples.slice(Math.floor(samples.length * 0.6)));
}

/** Reads the photo's pixels as if its paper were white. */
function reader(raster: Raster) {
  const paper = paperColor(raster);
  return (x: number, y: number): Rgb => {
    const i = (y * raster.width + x) * 4;
    return [0, 1, 2].map((c) =>
      Math.min(255, (raster.data[i + c] * 255) / Math.max(1, paper[c])),
    ) as Rgb;
  };
}

/**
 * Ink: dark pixels (print, a black or blue pen) and strongly colored mid-tone ones (a red or green
 * pen). A highlighter's color is light, so it is never ink.
 */
const isInk = (rgb: Rgb) =>
  luminance(rgb) < 120 ||
  (saturation(rgb) > 0.45 && brightness(rgb) < 0.85 && luminance(rgb) < 180);

function inkMask(raster: Raster, pixel: (x: number, y: number) => Rgb) {
  const mask = new Uint8Array(raster.width * raster.height);
  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      if (isInk(pixel(x, y))) mask[y * raster.width + x] = 1;
    }
  }
  return mask;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * The longest ink line across the word between two heights: how much of the word's width the
 * best row covers (a row counts with the one below it, for a slightly slanted pen), and that row.
 */
function lineAcross(
  inkAt: (x: number, y: number) => boolean,
  raster: Raster,
  box: Box,
  from: number,
  to: number,
) {
  const x0 = clamp(Math.round(box.x0), 0, raster.width - 1);
  const x1 = clamp(Math.round(box.x1), x0 + 1, raster.width);
  let best = { coverage: 0, row: -1 };
  for (
    let y = clamp(Math.round(from), 0, raster.height - 2);
    y <= clamp(Math.round(to), 0, raster.height - 2);
    y++
  ) {
    let covered = 0;
    for (let x = x0; x < x1; x++) {
      if (inkAt(x, y) || inkAt(x, y + 1)) covered++;
    }
    const coverage = covered / (x1 - x0);
    if (coverage > best.coverage) best = { coverage, row: y };
  }
  return best;
}

/** The color of the ink in a row across the word, for an underline's or a strike's color. */
function inkColor(
  inkAt: (x: number, y: number) => boolean,
  pixel: (x: number, y: number) => Rgb,
  box: Box,
  row: number,
) {
  const colors: Rgb[] = [];
  for (let x = Math.round(box.x0); x < Math.round(box.x1); x++) {
    for (const y of [row, row + 1]) {
      if (inkAt(x, y)) colors.push(pixel(x, y));
    }
  }
  return hex(medianColor(colors));
}

/** The color behind the word's letters when it is a highlighter's; undefined on plain paper. */
function highlightBehind(
  mask: Uint8Array,
  raster: Raster,
  pixel: (x: number, y: number) => Rgb,
  box: Box,
) {
  const width = Math.max(1, Math.round(box.x1 - box.x0));
  const height = Math.max(1, Math.round(box.y1 - box.y0));
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 600)));
  const paper: Rgb[] = [];
  let samples = 0;
  for (let y = Math.round(box.y0); y < Math.round(box.y1); y += step) {
    for (let x = Math.round(box.x0); x < Math.round(box.x1); x += step) {
      samples++;
      if (!mask[y * raster.width + x]) paper.push(pixel(x, y));
    }
  }
  if (paper.length < samples * 0.25) return;
  const color = medianColor(paper);
  return saturation(color) >= 0.2 && brightness(color) >= 0.6 ? hex(color) : undefined;
}

/**
 * An ink shape on the page, on a grid of cells about an eighth of a line high. Only its ink outside
 * the words OCR found counts (`cells`, `box`): a pen's circle that touches letters is still a thin
 * loop, and printed letters alone are no shape.
 */
type Shape = { box: Box; cells: number[]; all: number[]; color: Rgb };
type Grid = { cell: number; width: number; height: number };

/** The grid's cells whose middle is inside a word. */
function textCells(words: OcrWord[], grid: Grid) {
  const text = new Uint8Array(grid.width * grid.height);
  for (const { box } of words) {
    for (let y = Math.floor(box.y0 / grid.cell); y <= Math.floor(box.y1 / grid.cell); y++) {
      for (let x = Math.floor(box.x0 / grid.cell); x <= Math.floor(box.x1 / grid.cell); x++) {
        const cx = (x + 0.5) * grid.cell;
        const cy = (y + 0.5) * grid.cell;
        if (
          x < grid.width &&
          y < grid.height &&
          cx >= box.x0 &&
          cx <= box.x1 &&
          cy >= box.y0 &&
          cy <= box.y1
        )
          text[y * grid.width + x] = 1;
      }
    }
  }
  return text;
}

function shapes(
  mask: Uint8Array,
  raster: Raster,
  pixel: (x: number, y: number) => Rgb,
  words: OcrWord[],
  grid: Grid,
) {
  const { cell, width, height } = grid;
  const ink = new Uint8Array(width * height);
  const colors = new Map<number, Rgb>();
  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      if (!mask[y * raster.width + x]) continue;
      const index = Math.floor(y / cell) * width + Math.floor(x / cell);
      if (!ink[index]) colors.set(index, pixel(x, y));
      ink[index] = 1;
    }
  }
  const text = textCells(words, grid);
  const found: Shape[] = [];
  const seen = new Uint8Array(width * height);
  for (let start = 0; start < ink.length; start++) {
    if (!ink[start] || seen[start]) continue;
    const cells: number[] = [];
    const all: number[] = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const index = stack.pop() as number;
      all.push(index);
      if (!text[index]) cells.push(index);
      const cx = index % width;
      const cy = Math.floor(index / width);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = ny * width + nx;
          if (ink[next] && !seen[next]) {
            seen[next] = 1;
            stack.push(next);
          }
        }
      }
    }
    if (!cells.length) continue;
    // Loops, not Math.min(...cells): a figure's shape can have more cells than a call takes.
    const edges = { x0: width, y0: height, x1: 0, y1: 0 };
    for (const index of cells) {
      const x = index % width;
      const y = Math.floor(index / width);
      edges.x0 = Math.min(edges.x0, x);
      edges.y0 = Math.min(edges.y0, y);
      edges.x1 = Math.max(edges.x1, x + 1);
      edges.y1 = Math.max(edges.y1, y + 1);
    }
    found.push({
      box: { x0: edges.x0 * cell, y0: edges.y0 * cell, x1: edges.x1 * cell, y1: edges.y1 * cell },
      cells,
      all,
      color: medianColor(cells.slice(0, 500).map((index) => colors.get(index) as Rgb)),
    });
  }
  return found;
}

const sizeOf = (shape: Shape) => ({
  w: shape.box.x1 - shape.box.x0,
  h: shape.box.y1 - shape.box.y0,
});

/** Big enough to go around words: taller than a line and a half, wider than one. */
const isBig = (shape: Shape, lineHeight: number) =>
  sizeOf(shape).h >= lineHeight * 1.6 && sizeOf(shape).w >= lineHeight * 1.5;

/** Goes around a line at least, like a frame: what runs under words is its edge, no underline. */
const surrounds = (shape: Shape, lineHeight: number) =>
  sizeOf(shape).h >= lineHeight * 1.2 && sizeOf(shape).w >= lineHeight * 1.5;

/** Whether most of a shape lies on straight rows and columns: a printed frame, table or rule. */
function isStraight(shape: Shape, gridWidth: number) {
  const rows = new Map<number, number>();
  const columns = new Map<number, number>();
  for (const index of shape.cells) {
    const y = Math.floor(index / gridWidth);
    const x = index % gridWidth;
    rows.set(y, (rows.get(y) ?? 0) + 1);
    columns.set(x, (columns.get(x) ?? 0) + 1);
  }
  const spanX = columns.size;
  const spanY = rows.size;
  const straight = shape.cells.filter((index) => {
    const y = Math.floor(index / gridWidth);
    const x = index % gridWidth;
    return (rows.get(y) ?? 0) >= spanX * 0.6 || (columns.get(x) ?? 0) >= spanY * 0.6;
  }).length;
  return straight >= shape.cells.length * 0.6;
}

/** How much a tall shape wanders sideways, in cells: a hand-drawn line does, a printed rule doesn't. */
function wobble(shape: Shape, gridWidth: number) {
  const rows = new Map<number, number[]>();
  for (const index of shape.cells) {
    const y = Math.floor(index / gridWidth);
    const xs = rows.get(y) ?? [];
    xs.push(index % gridWidth);
    rows.set(y, xs);
  }
  const centers = [...rows.values()].map((xs) => xs.reduce((sum, x) => sum + x, 0) / xs.length);
  const mean = centers.reduce((sum, x) => sum + x, 0) / centers.length;
  return Math.sqrt(centers.reduce((sum, x) => sum + (x - mean) ** 2, 0) / centers.length);
}

/** The words a pen drawing marks, by their index, with the drawing's color. */
function drawnWords(words: OcrWord[], found: Shape[], { width, cell }: Grid, lineHeight: number) {
  const marked = new Map<number, string>();
  const lines = new Map<number, Box>();
  for (const word of words) {
    const line = lines.get(word.line);
    lines.set(
      word.line,
      line
        ? {
            x0: Math.min(line.x0, word.box.x0),
            y0: Math.min(line.y0, word.box.y0),
            x1: Math.max(line.x1, word.box.x1),
            y1: Math.max(line.y1, word.box.y1),
          }
        : { ...word.box },
    );
  }
  for (const shape of found) {
    const { w, h } = sizeOf(shape);
    const fill = (shape.cells.length * cell * cell) / (w * h);
    const color = hex(shape.color);
    // A circle or box around words: big, mostly empty inside, and not a printed frame.
    if (isBig(shape, lineHeight) && fill < 0.4 && !isStraight(shape, width)) {
      // All its ink, letters it touches too: OCR may read a circle's edge into the word's box.
      const cellsAt = shape.all;
      words.forEach((word, index) => {
        const cx = (word.box.x0 + word.box.x1) / 2;
        const cy = (word.box.y0 + word.box.y1) / 2;
        if (cx < shape.box.x0 || cx > shape.box.x1 || cy < shape.box.y0 || cy > shape.box.y1)
          return;
        // Ink on both sides of the word, around its height: inside the drawing, not by a corner.
        const top = Math.floor((word.box.y0 - lineHeight) / cell);
        const bottom = Math.floor((word.box.y1 + lineHeight) / cell);
        let left = false;
        let right = false;
        for (const index of cellsAt) {
          const y = Math.floor(index / width);
          if (y < top || y > bottom) continue;
          const x = (index % width) * cell;
          if (x < cx) left = true;
          else right = true;
        }
        if (left && right) marked.set(index, color);
      });
      continue;
    }
    // A bracket or line in the margin beside lines: tall, thin, and drawn by hand.
    if (h >= lineHeight * 1.8 && w <= lineHeight * 0.9 && wobble(shape, width) >= 0.5) {
      const near = lineHeight * 3;
      for (const [line, box] of lines) {
        const middle = (box.y0 + box.y1) / 2;
        if (middle < shape.box.y0 || middle > shape.box.y1) continue;
        const beside =
          (box.x0 >= shape.box.x1 - lineHeight && box.x0 - shape.box.x1 <= near) ||
          (shape.box.x0 >= box.x1 - lineHeight && shape.box.x0 - box.x1 <= near);
        if (!beside) continue;
        words.forEach((word, index) => {
          if (word.line === line) marked.set(index, color);
        });
      }
    }
  }
  return marked;
}

const sameHighlight = (a?: string, b?: string) => {
  if (!a || !b) return a === b;
  const difference = Math.abs(hue(parseHex(a)) - hue(parseHex(b)));
  return Math.min(difference, 360 - difference) < 30;
};

/**
 * The marks on the page, in reading order: each word marked one way (crossed out first, then
 * highlighted, underlined, drawn around), and words marked the same way one after another as one
 * mark. A word broken with a hyphen at a line's end is joined again.
 */
export function findMarks(raster: Raster, read: OcrWord[]): PhotoMark[] {
  if (!read.length) return [];
  const pixel = reader(raster);
  const mask = inkMask(raster, pixel);
  const lineHeight = median(read.map((word) => word.box.y1 - word.box.y0));
  // OCR sometimes reads a pen's circle into a word ("{quorum"), making its box far too tall: each
  // word is kept to a line's height around its baseline.
  const words = read.map((word) => ({
    ...word,
    box: {
      ...word.box,
      y0: Math.max(word.box.y0, word.baseline - lineHeight * 1.1),
      y1: Math.min(word.box.y1, word.baseline + lineHeight * 0.45),
    },
  }));
  // The ink's shapes on a grid of cells an eighth of a line high.
  const cell = Math.max(1, Math.round(lineHeight / 8));
  const grid = {
    cell,
    width: Math.ceil(raster.width / cell),
    height: Math.ceil(raster.height / cell),
  };
  const found = shapes(mask, raster, pixel, words, grid);
  const drawn = drawnWords(words, found, grid, lineHeight);
  // A circle's or a frame's edge passing under or through words is no underline or strike.
  const edges = new Set(
    found.filter((shape) => surrounds(shape, lineHeight)).flatMap((shape) => shape.cells),
  );
  const inkAt = (x: number, y: number) =>
    !!mask[y * raster.width + x] &&
    !edges.has(Math.floor(y / cell) * grid.width + Math.floor(x / cell));
  const looks = words.map((word, index): { type: PhotoMarkType; color?: string } | undefined => {
    const h = word.box.y1 - word.box.y0;
    const strike = lineAcross(
      inkAt,
      raster,
      word.box,
      word.box.y0 + h * 0.3,
      word.box.y0 + h * 0.72,
    );
    if (strike.coverage >= 0.9) {
      return { type: 'strike', color: inkColor(inkAt, pixel, word.box, strike.row) };
    }
    const highlight = highlightBehind(mask, raster, pixel, word.box);
    if (highlight) return { type: 'highlight', color: highlight };
    // From just under the baseline: the letters' feet stand on it, a pen's line runs below.
    const underline = lineAcross(
      inkAt,
      raster,
      word.box,
      word.baseline + h * 0.06,
      word.baseline + h * 0.9,
    );
    if (underline.coverage >= 0.88) {
      return { type: 'underline', color: inkColor(inkAt, pixel, word.box, underline.row) };
    }
    const color = drawn.get(index);
    return color ? { type: 'drawn', color } : undefined;
  });

  // A word OCR read badly between two marked the same way on its line is marked that way too.
  looks.forEach((look, index) => {
    const before = looks[index - 1];
    const after = looks[index + 1];
    const line = words[index].line;
    if (
      !look &&
      before &&
      after &&
      before.type === after.type &&
      words[index - 1].line === line &&
      words[index + 1].line === line
    ) {
      looks[index] = before;
    }
  });

  const marks: PhotoMark[] = [];
  let open: (PhotoMark & { line: number }) | undefined;
  words.forEach((word, index) => {
    const look = looks[index];
    if (!look) {
      open = undefined;
      return;
    }
    const goesOn =
      open?.type === look.type &&
      (look.type !== 'highlight' || sameHighlight(open.color, look.color));
    if (open && goesOn) {
      const broken = open.line !== word.line && /\p{L}-$/u.test(open.text);
      open.text = broken ? `${open.text.slice(0, -1)}${word.text}` : `${open.text} ${word.text}`;
      open.line = word.line;
      return;
    }
    open = { ...look, text: word.text, line: word.line };
    marks.push(open);
  });
  // A speck that OCR read as a letter or two is no mark. The line through crossed-out words reads
  // as hyphens between them.
  return marks
    .filter((mark) => (mark.text.match(/[\p{L}\p{N}]/gu) ?? []).length >= 2)
    .map(({ type, text, color }) => ({
      type,
      text:
        type === 'strike'
          ? text
              .replace(/[-–—_]+/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
          : text,
      color,
    }));
}
