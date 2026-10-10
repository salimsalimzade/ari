/** The five highlight colors. Each one has a `--ari-hl-<color>` token. */
export const highlightColors = ['yellow', 'green', 'blue', 'pink', 'purple'] as const;

export type HighlightColor = (typeof highlightColors)[number];
