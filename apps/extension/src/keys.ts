// Shortcut keys as the keyboard prints them. Key names read the same in every language, so they
// stay out of the dictionaries.

export const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);

/** Copy's modifier key. */
export const modKey = isMac ? '⌘' : 'Ctrl';

/** Copy, as a menu shows it. */
export const copyLabel = isMac ? '⌘C' : 'Ctrl+C';

// Firefox writes Ctrl for the ⌘ key on a Mac, and MacCtrl for its Control key.
const macKeys: Record<string, string> = {
  Alt: '⌥',
  Shift: '⇧',
  Ctrl: '⌘',
  Command: '⌘',
  MacCtrl: '⌃',
};

/** A commands shortcut ("Alt+Shift+S") the way the keyboard shows it: ⌥⇧S on a Mac. */
export function shortcutLabel(shortcut: string, mac = isMac) {
  return mac
    ? shortcut
        .split('+')
        .map((key) => macKeys[key] ?? key)
        .join('')
    : shortcut;
}
