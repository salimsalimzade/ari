import { createSignal, onMount } from 'solid-js';

/**
 * Whether shortcuts use ⌘ (Mac, iPhone, iPad) rather than Ctrl. The server can't tell, so it
 * starts with ⌘ and checks once in the browser.
 */
export function useAppleKeyboard() {
  const [apple, setApple] = createSignal(true);
  onMount(() => setApple(/Mac|iPhone|iPad/.test(navigator.userAgent)));
  return apple;
}
