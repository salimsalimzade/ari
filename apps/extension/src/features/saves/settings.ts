import type { HighlightColor } from '@ari/ui-kit';
import { storage } from 'wxt/utils/storage';

// The extension's own choices, shared by every tab, the popup and the side panel.

/** Sites (hostnames) where the selection toolbar and ⌘C don't save. */
export const pausedSites = storage.defineItem<string[]>('local:pausedSites', { fallback: [] });

/** Whether highlights are marked on their pages. */
export const showOnPage = storage.defineItem<boolean>('local:showOnPage', { fallback: true });

/** The color Save and ⌘C use: the one picked last. */
export const lastColor = storage.defineItem<HighlightColor>('local:lastColor', {
  fallback: 'yellow',
});

/** Whether the first save has shown "Saved on this browser"; it shows once. */
export const signInShown = storage.defineItem<boolean>('local:signInShown', { fallback: false });

/** Tags used lately, newest first, offered when tagging a clip. */
export const recentTags = storage.defineItem<string[]>('local:recentTags', { fallback: [] });

export async function rememberTags(tags: string[]) {
  const recent = await recentTags.getValue();
  await recentTags.setValue([...new Set([...tags, ...recent])].slice(0, 8));
}
