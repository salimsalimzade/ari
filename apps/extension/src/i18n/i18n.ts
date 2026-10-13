import { az } from './az';
import { type Dictionary, en } from './en';

export type Language = 'en' | 'az';

/** The browser's first language when Ari speaks it, English otherwise. */
export const language: Language = navigator.language.toLowerCase().startsWith('az') ? 'az' : 'en';

/** The text in `language`. It doesn't change while a page is open, so it is a plain object. */
export const t: Dictionary = language === 'az' ? az : en;

/** Puts values into a dictionary text's {placeholders}. */
export function fill(text: string, values: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}

/** A text's singular or plural form for a count, e.g. { one: '1 clip', other: '{n} clips' }. */
export function plural(count: number, forms: { one: string; other: string }) {
  return fill(count === 1 ? forms.one : forms.other, { n: count });
}
