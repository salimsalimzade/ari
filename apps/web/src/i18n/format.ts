import { differenceInHours, differenceInMinutes, format, isThisYear } from 'date-fns';
import { useI18n } from './i18n';

/**
 * Dates, numbers and file sizes the way the current language writes them. Numbers don't use Intl,
 * which Chrome lacks for Azerbaijani, so the server and the browser write them the same way.
 */
export function useFormat() {
  const { t, dateLocale } = useI18n();
  const pattern = (date: Date, key: keyof ReturnType<typeof t>['formats']) =>
    format(date, t().formats[key], { locale: dateLocale() });

  const number = (value: number, digits = 0) => {
    const { group, decimal } = t().formats;
    const [whole, fraction] = value.toFixed(digits).split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, group);
    return fraction ? `${grouped}${decimal}${fraction}` : grouped;
  };

  return {
    number,
    /** Megabytes as "18.4 MB", or as "0.98 GB" from 1,000 MB up. */
    size: (megabytes: number) => {
      if (megabytes < 1000) return `${number(megabytes, Number.isInteger(megabytes) ? 0 : 1)} MB`;
      const gigabytes = megabytes / 1024;
      return `${number(gigabytes, Number.isInteger(gigabytes) ? 0 : 2)} GB`;
    },
    /** A file's size: "640 KB" under 0.1 MB, otherwise "2.1 MB". */
    fileSize: (megabytes: number) =>
      megabytes < 0.1
        ? `${Math.max(1, Math.round(megabytes * 1024))} KB`
        : `${number(megabytes, 1)} MB`,
    date: (date: Date) => pattern(date, 'date'),
    shortDate: (date: Date) => pattern(date, 'shortDate'),
    /** "Thu, Oct 8", with the year when it isn't this year's. */
    dayHeading: (date: Date) =>
      pattern(date, isThisYear(date) ? 'dayHeading' : 'dayHeadingWithYear'),
    /** "Oct", or "Oct ’25" for a month outside `currentYear`. */
    month: (date: Date, currentYear: number) =>
      pattern(date, date.getFullYear() === currentYear ? 'month' : 'monthWithYear'),
    monthAndYear: (date: Date) => pattern(date, 'monthAndYear'),
    /** "just now", "10 min ago" or "3 hr ago" within a day of `now`, then "Oct 6". */
    ago: (date: Date, now: Date) => {
      const minutes = differenceInMinutes(now, date);
      if (minutes < 1) return t().ago.now;
      if (minutes < 60) return fill(plural(minutes, t().ago.minutes), { n: minutes });
      const hours = differenceInHours(now, date);
      if (hours < 24) return fill(plural(hours, t().ago.hours), { n: hours });
      return pattern(date, isThisYear(date) ? 'shortDate' : 'date');
    },
  };
}

/** Puts values into a dictionary text's {placeholders}. */
export function fill(text: string, values: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}

/** A text's singular or plural form for a count, e.g. { one: '1 file', other: '{n} files' }. */
export function plural(count: number, forms: { one: string; other: string }) {
  return count === 1 ? forms.one : forms.other;
}
