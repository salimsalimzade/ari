import type { HighlightColor } from '@ari/ui-kit';

// Imports, until ari-api reads files (F11, F12): the page uploads and reads them with timed
// stand-ins, and "reading" a file finds the same example marks in every one. Their texts stay in
// English, like the landing page's demos.

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
/** What "reading" a file finds, a stand-in: every kind of mark Ari can find. */
export function standInMarks(): ImportMark[] {
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
