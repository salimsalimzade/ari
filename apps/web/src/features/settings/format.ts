import { format } from 'date-fns';
import { useI18n } from '~/i18n/i18n';

/**
 * Dates, numbers and file sizes the way the current language writes them. Numbers don't use Intl,
 * which Chrome lacks for Azerbaijani, so the server and the browser write them the same way.
 */
export function useFormat() {
  const { t, dateLocale } = useI18n();

  const number = (value: number, digits = 0) => {
    const { group, decimal } = t().settings.numberFormat;
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
    date: (date: Date) => format(date, t().settings.dateFormat, { locale: dateLocale() }),
    shortDate: (date: Date) => format(date, t().settings.shortDateFormat, { locale: dateLocale() }),
  };
}

/** Puts values into a dictionary text's {placeholders}. */
export function fill(text: string, values: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}
