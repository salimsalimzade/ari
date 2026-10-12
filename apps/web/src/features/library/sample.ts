import type { HighlightColor } from '@ari/ui-kit';
import { subDays } from 'date-fns';

// The design's example library, until ari-api has endpoints for saves, sources and imports. Its
// texts stay in English, like the landing page's demos.

export type SaveKind = 'highlight' | 'clip' | 'import';

/** One saved item: a highlight, a clipped section or a highlight imported from a file. */
export type Save = {
  id: string;
  kind: SaveKind;
  /** A highlight's or an import's color; clips have none. */
  color?: HighlightColor;
  /** What a clip shows. */
  clip?: 'table' | 'image';
  text: string;
  tags: string[];
  comment: string;
  savedAt: Date;
  /** The source's name, a key of the sources. */
  source: string;
  /** Where in a file it was, e.g. "p. 4". */
  page?: string;
  /** The heading above it on a web page, e.g. "The scouts". */
  section?: string;
  /** Saved from an import during this visit. */
  isNew?: boolean;
};

export type Source = { name: string; title: string; author?: string; url?: string };

export type MarkType = 'highlight' | 'underline' | 'drawn' | 'handwritten' | 'strike' | 'note';

/** Something Ari found in an imported file, waiting to be saved or skipped. */
export type ImportMark = {
  id: number;
  type: MarkType;
  color: HighlightColor;
  text: string;
  page: string;
  comment?: string;
  /** The file's own highlight color, when Ari mapped it to one of its five. */
  fromColor?: 'orange' | 'red';
  /** A picture of the page, for marks that aren't plain text. */
  thumb?: 'circle' | 'hand';
  /** Ticked to be saved. */
  on: boolean;
  /** Already in the Library. */
  saved?: boolean;
};

export type ImportStatus =
  | 'uploading'
  | 'reading'
  | 'ready'
  | 'saved'
  | 'failed'
  | 'empty'
  | 'rejected'
  | 'discarded'
  | 'dismissed';

export type ImportFile = {
  id: string;
  name: string;
  megabytes: number;
  status: ImportStatus;
  /** Percent of the upload or of the reading. */
  progress: number;
  /** One of the examples the page starts with, not a file from this visit. */
  seeded: boolean;
  /** Read again after it failed. */
  retried?: boolean;
  title: string;
  author: string;
  marks?: ImportMark[];
  /** How many marks were saved. */
  kept?: number;
  savedOn?: Date;
  /** Why it wasn't uploaded. */
  rejected?: 'type' | 'tooBig' | 'noSpace';
  /** Megabytes left when it didn't fit. */
  spaceLeft?: number;
};

/** The day of the newest example save; local midnight, so the server and the browser agree. */
export const newestDay = new Date(2026, 9, 8);

// The addresses use the reserved .example domain, so no link leads to a real site.
export const sampleSources: Record<string, Source> = {
  'Meadow Quarterly': {
    name: 'Meadow Quarterly',
    title: 'How Honeybees Choose a New Home',
    author: 'J. Arden',
    url: 'https://meadowquarterly.example/honeybees-new-home',
  },
  'Hive & Field': {
    name: 'Hive & Field',
    title: 'Reading a Swarm',
    author: 'R. Okafor',
    url: 'https://hiveandfield.example/reading-a-swarm',
  },
  'honeybees-new-home.pdf': {
    name: 'honeybees-new-home.pdf',
    title: 'How Honeybees Choose a New Home',
    author: 'J. Arden',
  },
  'Field Notes Weekly': {
    name: 'Field Notes Weekly',
    title: 'Scouts at the hive door',
    author: 'L. Moreau',
    url: 'https://fieldnotesweekly.example/scouts-at-the-hive-door',
  },
  'Hive & Hollow': {
    name: 'Hive & Hollow',
    title: 'Sizing a nest box',
    url: 'https://hiveandhollow.example/sizing-a-nest-box',
  },
  'Ridge Apiary': {
    name: 'Ridge Apiary',
    title: 'Catching a swarm in the garden',
    author: 'T. Bell',
    url: 'https://ridgeapiary.example/catching-a-swarm',
  },
  'pollinator-survey-2026.pdf': {
    name: 'pollinator-survey-2026.pdf',
    title: 'Pollinator survey 2026',
  },
};

// kind, color or clip shape, text, tags, comment, the section it is in on a web page
const patterns: [SaveKind, string, string, string[], string, string][] = [
  [
    'highlight',
    'yellow',
    'In late spring a colony splits in two. The old queen leaves with about half of the workers, and the swarm hangs from a branch for a few days while it decides where to live.',
    ['swarm'],
    'Opening line for the essay',
    'Why swarms split',
  ],
  [
    'clip',
    'table',
    'Table 1. Sites the scouts reported',
    ['nest site', 'scouts'],
    '',
    'The scouts',
  ],
  [
    'highlight',
    'pink',
    'No single bee compares all of the options. The choice emerges from many scouts, each advertising one site.',
    ['decision'],
    'Key quote for the argument',
    'How the swarm agrees',
  ],
  [
    'import',
    'purple',
    'When about fifteen scouts are at the same site at once, they switch from dancing to piping, which warms the swarm up for flight.',
    ['decision', 'swarm'],
    '',
    '',
  ],
  ['clip', 'image', 'Swarm hanging from an oak branch', ['swarm'], '', 'Why swarms split'],
  [
    'highlight',
    'green',
    'A few hundred scouts fly out to inspect tree hollows. Each scout measures a cavity by walking around its inside walls.',
    ['scouts'],
    '',
    'The scouts',
  ],
  [
    'highlight',
    'blue',
    'Scouts prefer a cavity of about 40 litres, with a small entrance placed high above the ground.',
    ['nest site'],
    'Compare with standard hive box sizes',
    'The scouts',
  ],
  [
    'highlight',
    'yellow',
    'A scout reports a site with a waggle dance. The better the site, the more circuits she dances.',
    ['dance', 'scouts'],
    '',
    'Reporting back',
  ],
  [
    'import',
    'green',
    'The swarm lifts off and flies to its new home, steered by scouts that streak through the cloud toward the chosen site.',
    ['swarm'],
    '',
    '',
  ],
];

// The design's smaller sources: source, color, text, tags, days before the newest save, the
// section (or a file's page).
const fewerSaves: [string, HighlightColor, string, string[], number, string][] = [
  [
    'Field Notes Weekly',
    'green',
    'Scouts that find a poor site dance briefly, then stop and stay quiet.',
    ['dance'],
    5,
    'Poor sites',
  ],
  [
    'Field Notes Weekly',
    'green',
    'A scout that stops dancing can still be won over to a better site by another scout.',
    ['dance', 'scouts'],
    5,
    'Poor sites',
  ],
  [
    'Field Notes Weekly',
    'blue',
    'Most scouts visit a site several times before they dance for it.',
    ['scouts'],
    6,
    'Checking a site',
  ],
  [
    'Field Notes Weekly',
    'yellow',
    'The first scouts back are rarely the ones whose site wins.',
    ['decision'],
    6,
    'Who wins',
  ],
  [
    'Hive & Hollow',
    'blue',
    'A box of about 40 litres matches what scouts choose in the wild.',
    ['nest site'],
    10,
    'Volume',
  ],
  [
    'Hive & Hollow',
    'blue',
    'Boxes much smaller than 20 litres are almost never chosen.',
    ['nest site'],
    10,
    'Volume',
  ],
  [
    'Hive & Hollow',
    'yellow',
    'An entrance of about 15 square centimetres keeps the nest easy to defend.',
    ['nest site'],
    11,
    'The entrance',
  ],
  [
    'Ridge Apiary',
    'yellow',
    'Most swarms settle within twenty metres of the hive they left.',
    ['swarm'],
    17,
    'Where swarms land',
  ],
  [
    'Ridge Apiary',
    'pink',
    'Leave a clustered swarm alone for an hour before you try to box it.',
    ['swarm'],
    18,
    'Boxing the swarm',
  ],
  [
    'pollinator-survey-2026.pdf',
    'purple',
    'Honeybee counts were highest on the north slope.',
    ['survey'],
    24,
    'p. 2',
  ],
];

/** 2,431 saves, six a day, and ten more from the smaller sources; newest first. */
export function sampleSaves(): Save[] {
  const daily = Array.from({ length: 2431 }, (_, index): Save => {
    const [kind, look, text, tags, comment, section] = patterns[index % patterns.length];
    const day = Math.floor(index / 6);
    return {
      id: `s${index}`,
      kind,
      color: kind === 'clip' ? undefined : (look as HighlightColor),
      clip: kind === 'clip' ? (look as 'table' | 'image') : undefined,
      text,
      tags,
      comment,
      savedAt: subDays(newestDay, day),
      source:
        kind === 'import'
          ? 'honeybees-new-home.pdf'
          : day % 3 === 2
            ? 'Hive & Field'
            : 'Meadow Quarterly',
      page: kind === 'import' ? `p. ${3 + (index % 9)}` : undefined,
      section: kind === 'import' ? undefined : section,
    };
  });
  const fewer = fewerSaves.map(([source, color, text, tags, day, where], index): Save => {
    const file = !sampleSources[source]?.url;
    return {
      id: `x${index}`,
      kind: file ? 'import' : 'highlight',
      color,
      text,
      tags,
      comment: '',
      savedAt: subDays(newestDay, day),
      source,
      page: file ? where : undefined,
      section: file ? undefined : where,
    };
  });
  // A stable sort, so each day keeps its order.
  return [...daily, ...fewer].sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
}

const markTexts = [
  'In late spring a colony splits in two. The old queen leaves with about half of the workers.',
  'A few hundred scouts fly out to inspect tree hollows. Each scout measures a cavity by walking around its inside walls.',
  'No single bee compares all of the options. The choice emerges from many scouts, each advertising one site.',
  'When about fifteen scouts are at the same site at once, they switch from dancing to piping.',
  'Scouts prefer a cavity of about 40 litres, with a small entrance placed high above the ground.',
  'A scout reports a site with a waggle dance. The better the site, the more circuits she dances.',
  'Scouts that find a poor site dance for it only briefly, then stop.',
  'The swarm usually needs about two days to settle on one site.',
  'A cavity close to the ground is turned down more often than one high in a tree.',
  'Bees check the size of the entrance before they explore the inside.',
  'Piping tells the swarm that the decision is almost made.',
  'The swarm lifts off and flies to its new home, steered by scouts that streak through the cloud.',
];
const markColors: HighlightColor[] = ['yellow', 'green', 'blue', 'pink', 'purple'];

/** The highlights Ari "finds" in a file: `count` of them, varied by `seed`. */
export function sampleMarks(count: number, seed: number): ImportMark[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    type: 'highlight',
    text: markTexts[(id + seed) % markTexts.length],
    page: `p. ${2 + id}`,
    color: markColors[(id + seed) % markColors.length],
    on: true,
  }));
}

// A file with every kind of mark Ari can find.
function mixedMarks(): ImportMark[] {
  const marks: Omit<ImportMark, 'id' | 'on'>[] = [
    { type: 'highlight', color: 'yellow', text: markTexts[0], page: 'p. 2' },
    {
      type: 'highlight',
      color: 'yellow',
      text: 'A few hundred scouts fly out to inspect tree hollows.',
      page: 'p. 3',
      fromColor: 'orange',
    },
    {
      type: 'underline',
      color: 'blue',
      text: markTexts[4],
      page: 'p. 3',
      comment: 'Compare with the 2019 study',
    },
    {
      type: 'highlight',
      color: 'green',
      text: 'Each scout measures a cavity by walking around its inside walls.',
      page: 'p. 3',
    },
    { type: 'drawn', color: 'purple', text: markTexts[3], page: 'p. 4', thumb: 'circle' },
    {
      type: 'handwritten',
      color: 'yellow',
      text: 'Handwritten note: “so 15?”',
      page: 'p. 4',
      thumb: 'hand',
    },
    { type: 'highlight', color: 'pink', text: markTexts[2], page: 'p. 5' },
    { type: 'strike', color: 'yellow', text: 'Bees always choose the closest site.', page: 'p. 5' },
    { type: 'highlight', color: 'yellow', text: markTexts[5], page: 'p. 6', fromColor: 'red' },
    { type: 'underline', color: 'green', text: markTexts[6], page: 'p. 7' },
    { type: 'highlight', color: 'blue', text: markTexts[7], page: 'p. 8' },
    {
      type: 'note',
      color: 'yellow',
      text: 'Check figure 3 against the field photos.',
      page: 'p. 9',
    },
    { type: 'highlight', color: 'purple', text: markTexts[11], page: 'p. 11' },
  ];
  return marks.map((mark, id) => ({
    ...mark,
    id,
    on: mark.type === 'highlight' || mark.type === 'underline',
  }));
}

/** The files on the Imports page at first: one to review, one saved, two that went wrong. */
export function sampleImports(): ImportFile[] {
  const base = { progress: 100, seeded: true, author: '' };
  return [
    {
      ...base,
      id: 'f1',
      name: 'honeybees-new-home.pdf',
      megabytes: 2.1,
      status: 'ready',
      title: 'How Honeybees Choose a New Home',
      author: 'J. Arden',
      marks: mixedMarks(),
    },
    {
      ...base,
      id: 'f2',
      name: 'field-notes.docx',
      megabytes: 2.9,
      status: 'saved',
      title: 'Field notes',
      kept: 8,
      savedOn: new Date(2026, 9, 2),
      marks: sampleMarks(10, 3).map((mark, index) => ({
        ...mark,
        on: index < 8,
        saved: index < 8,
      })),
    },
    { ...base, id: 'f3', name: 'page-photo.png', megabytes: 1.2, status: 'failed', title: '' },
    { ...base, id: 'f4', name: 'slides.pdf', megabytes: 3, status: 'empty', title: '' },
  ];
}
