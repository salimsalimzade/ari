import { describe, expect, it } from 'vitest';
import { shortcutLabel } from './keys';

describe('shortcutLabel', () => {
  it('prints symbols on a Mac', () => {
    expect(shortcutLabel('Alt+Shift+S', true)).toBe('⌥⇧S');
    expect(shortcutLabel('Ctrl+Shift+Y', true)).toBe('⌘⇧Y');
    expect(shortcutLabel('MacCtrl+A', true)).toBe('⌃A');
  });

  it('keeps the names elsewhere', () => {
    expect(shortcutLabel('Alt+A', false)).toBe('Alt+A');
  });
});
