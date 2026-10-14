import { type Accessor, createSignal, onCleanup } from 'solid-js';
import type { WxtStorageItem } from 'wxt/utils/storage';
import { type Account, account } from './session';

/** A storage item's value, kept current: undefined until storage answers. */
export function useStored<T>(
  item: WxtStorageItem<T, Record<string, unknown>>,
): Accessor<T | undefined> {
  const [value, setValue] = createSignal<T>();
  // Wrapped, so Solid never takes the value for an updater function.
  const set = (next: T) => setValue(() => next);
  void item.getValue().then(set);
  onCleanup(item.watch(set));
  return value;
}

/** Who is signed in, kept current: null while signed out, undefined until storage answers. */
export function useAccount() {
  return useStored(account);
}

/** The first letter of the person's name, for the avatar without a photo. */
export function initialOf(user: Account) {
  return (user.fullName || user.username || '?').charAt(0).toUpperCase();
}

/** The name the extension greets them by. */
export function nameOf(user: Account) {
  return user.fullName || user.username || '';
}

/** Their first name, as in "Continue as Bea". */
export function firstNameOf(user: Account) {
  return user.fullName?.split(' ')[0] || user.username || '';
}

/** What tells two accounts apart under the name: the email, or the username. */
export function contactOf(user: Account) {
  return user.email || (user.username ? `@${user.username}` : '');
}
