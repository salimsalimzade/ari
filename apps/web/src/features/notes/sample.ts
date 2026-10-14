import { subMinutes } from 'date-fns';

// The design's example notes, until ari-api has endpoints for notes. Their texts stay in English,
// like the landing page's demos.

/** A paragraph of the note's own text, or a quote of a save in the Library. */
export type Block =
  | { id: string; kind: 'text'; text: string }
  | { id: string; kind: 'quote'; saveId: string };

export type Note = {
  id: string;
  title: string;
  /** Always ends with a paragraph, so there is somewhere to write after a quote. */
  blocks: Block[];
  createdAt: Date;
  /** Undefined until something is written in it. */
  editedAt?: Date;
};

const text = (id: string, value: string): Block => ({ id, kind: 'text', text: value });
/**
 * Two notes of the design's, as text only: the Library comes from ari-api now, so the example
 * quotes it had are gone; quotes come from the saves the user picks.
 */
export function sampleNotes(): Note[] {
  return [
    {
      id: 'n1',
      title: 'Swarm decisions: essay draft',
      createdAt: new Date(2026, 9, 4, 9, 30),
      editedAt: subMinutes(new Date(), 10),
      blocks: [
        text(
          'n1-1',
          'Honeybee swarms make one of the most careful group decisions in nature. They have a few days to choose a home they will live in for years, and no one is in charge.',
        ),
        text(
          'n1-3',
          'The search starts with a small group of scouts. Each one finds a site, judges it and reports back to the cluster.',
        ),
        text('n1-5', 'What surprised me is that the swarm never holds a vote in the usual sense.'),
        text(
          'n1-7',
          'So the choice is less a vote than a race: the first site to gather about fifteen scouts wins.',
        ),
      ],
    },
    {
      id: 'n2',
      title: 'Nest site checklist',
      createdAt: new Date(2026, 9, 3, 17, 5),
      editedAt: new Date(2026, 9, 6, 18, 20),
      blocks: [
        text('n2-1', 'What the scouts look for, to check against our own hive boxes.'),
        text(
          'n2-3',
          'Our deep box holds about 40 litres too, so the size is fine. The entrance is the question.',
        ),
        text('n2-5', 'Next: measure the entrance on the north hive.'),
      ],
    },
  ];
}
