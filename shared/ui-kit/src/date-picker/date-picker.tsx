import { Popover as KobaltePopover } from '@kobalte/core/popover';
import {
  addDays,
  addMonths,
  addYears,
  clamp,
  eachDayOfInterval,
  endOfWeek,
  format,
  getMonth,
  getYear,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  type Locale,
  parse,
  setMonth,
  setYear,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { enGB } from 'date-fns/locale/en-GB';
import { createMemo, createSignal, createUniqueId, For, Show } from 'solid-js';
import styles from './date-picker.module.scss';

/** How DatePicker reads and writes dates: 12.05.1995. */
export const dateFormat = 'dd.MM.yyyy';

/** The calendar's control names, from the app's dictionaries. */
export type DatePickerLabels = {
  month: string;
  year: string;
  previousMonth: string;
  nextMonth: string;
};

export type DatePickerProps = {
  label: string;
  name?: string;
  /** The chosen day as dd.MM.yyyy, or '' when none is chosen. */
  value: string;
  onChange: (value: string) => void;
  /** The earliest and latest days that can be chosen, as dd.MM.yyyy. */
  min?: string;
  max?: string;
  /** date-fns locale for the month and weekday names and the first day of the week; en-GB by
   * default. */
  locale?: Locale;
  labels: DatePickerLabels;
  /** The date format, e.g. DD.MM.YYYY; never the label's job. */
  placeholder?: string;
  /** Box height: md 36px (panels), lg 44px (forms; 48px on phones), xl 48px (mobile forms). */
  size?: 'md' | 'lg' | 'xl';
  /** Box background: surface when the field sits on the canvas color. */
  fill?: 'canvas' | 'surface';
  description?: string;
  /** Shown under the box, and marks the field invalid. */
  error?: string;
  disabled?: boolean;
  class?: string;
};

function parseDate(value: string | undefined) {
  const date = value ? parse(value, dateFormat, new Date()) : undefined;
  return date && isValid(date) ? date : undefined;
}

/** A pill field that opens a month calendar; month and year selects jump to far-off dates. */
export function DatePicker(props: DatePickerProps) {
  const id = createUniqueId();
  const labelId = `${id}-label`;
  const triggerId = `${id}-trigger`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  const [open, setOpen] = createSignal(false);
  // The day the keyboard is on; the calendar shows its month.
  const [focused, setFocused] = createSignal(new Date(0));
  // Opened with a pointer: the focused day shows no focus ring until a key is pressed, so it
  // doesn't look chosen.
  const [pointer, setPointer] = createSignal(false);
  let grid: HTMLTableElement | undefined;
  let box: HTMLDivElement | undefined;

  const locale = () => props.locale ?? enGB;
  const min = () => parseDate(props.min) ?? new Date(1900, 0, 1);
  const max = () => parseDate(props.max) ?? new Date(2100, 11, 31);
  const limit = (day: Date) => clamp(day, { start: min(), end: max() });
  const selected = () => parseDate(props.value);
  const isSelected = (day: Date) => {
    const chosen = selected();
    return !!chosen && isSameDay(day, chosen);
  };

  const months = createMemo(() =>
    Array.from({ length: 12 }, (_, month) =>
      format(new Date(2000, month, 1), 'LLLL', { locale: locale() }),
    ),
  );
  // Latest year first: most dates picked from far-off years are birth dates.
  const years = () => {
    const last = getYear(max());
    return Array.from({ length: last - getYear(min()) + 1 }, (_, index) => last - index);
  };
  // Six weeks from the start of the week holding the 1st, so the calendar keeps its height.
  const weeks = createMemo(() => {
    const start = startOfWeek(startOfMonth(focused()), { locale: locale() });
    const days = eachDayOfInterval({ start, end: addDays(start, 41) });
    return Array.from({ length: 6 }, (_, week) => days.slice(week * 7, week * 7 + 7));
  });

  // preventScroll: the calendar may not be in place yet when it opens.
  const focusDay = () =>
    grid?.querySelector<HTMLElement>('button[tabindex="0"]')?.focus({ preventScroll: true });
  const moveTo = (day: Date) => {
    setFocused(limit(day));
    focusDay();
  };
  const choose = (day: Date) => {
    props.onChange(format(day, dateFormat));
    setOpen(false);
  };

  const onOpenChange = (next: boolean) => {
    if (next) setFocused(limit(selected() ?? new Date()));
    setOpen(next);
  };

  const onGridKeyDown = (event: KeyboardEvent) => {
    const day = focused();
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(day, -1),
      ArrowRight: () => addDays(day, 1),
      ArrowUp: () => addDays(day, -7),
      ArrowDown: () => addDays(day, 7),
      Home: () => startOfWeek(day, { locale: locale() }),
      End: () => endOfWeek(day, { locale: locale() }),
      PageUp: () => (event.shiftKey ? addYears(day, -1) : addMonths(day, -1)),
      PageDown: () => (event.shiftKey ? addYears(day, 1) : addMonths(day, 1)),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    moveTo(move());
  };

  return (
    <div
      class={props.class ? `${styles.root} ${props.class}` : styles.root}
      data-invalid={props.error ? '' : undefined}
      data-disabled={props.disabled ? '' : undefined}
    >
      <label id={labelId} for={triggerId} class={styles.label}>
        {props.label}
      </label>
      <KobaltePopover
        open={open()}
        onOpenChange={onOpenChange}
        anchorRef={() => box}
        placement="bottom-start"
        gutter={6}
      >
        <div
          ref={box}
          class={styles.box}
          data-size={props.size ?? 'md'}
          data-fill={props.fill ?? 'canvas'}
        >
          <KobaltePopover.Trigger
            id={triggerId}
            class={styles.trigger}
            disabled={props.disabled}
            aria-labelledby={`${labelId} ${triggerId}`}
            aria-describedby={
              [props.description && descriptionId, props.error && errorId]
                .filter(Boolean)
                .join(' ') || undefined
            }
            aria-invalid={props.error ? true : undefined}
            onPointerDown={() => setPointer(true)}
            onKeyDown={() => setPointer(false)}
          >
            <span class={styles.value} data-placeholder={selected() ? undefined : ''}>
              {selected() ? props.value : props.placeholder}
            </span>
            <CalendarIcon />
          </KobaltePopover.Trigger>
        </div>
        <KobaltePopover.Portal>
          <KobaltePopover.Content
            class={styles.content}
            aria-label={props.label}
            data-pointer={pointer() ? '' : undefined}
            onKeyDown={() => setPointer(false)}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              focusDay();
            }}
          >
            <div class={styles.header}>
              <select
                class={styles.select}
                aria-label={props.labels.month}
                onChange={(event) =>
                  setFocused(limit(setMonth(focused(), +event.currentTarget.value)))
                }
              >
                <For each={months()}>
                  {(name, month) => (
                    <option value={month()} selected={month() === getMonth(focused())}>
                      {name}
                    </option>
                  )}
                </For>
              </select>
              <select
                class={styles.select}
                aria-label={props.labels.year}
                onChange={(event) =>
                  setFocused(limit(setYear(focused(), +event.currentTarget.value)))
                }
              >
                <For each={years()}>
                  {(year) => (
                    <option value={year} selected={year === getYear(focused())}>
                      {year}
                    </option>
                  )}
                </For>
              </select>
              <button
                type="button"
                class={styles.nav}
                aria-label={props.labels.previousMonth}
                disabled={isSameMonth(focused(), min())}
                onClick={() => setFocused(limit(addMonths(focused(), -1)))}
              >
                <ChevronIcon path="m15 18-6-6 6-6" />
              </button>
              <button
                type="button"
                class={styles.nav}
                aria-label={props.labels.nextMonth}
                disabled={isSameMonth(focused(), max())}
                onClick={() => setFocused(limit(addMonths(focused(), 1)))}
              >
                <ChevronIcon path="m9 18 6-6-6-6" />
              </button>
            </div>
            <table ref={grid} class={styles.grid} onKeyDown={onGridKeyDown}>
              <thead>
                <tr>
                  <For each={weeks()[0]}>
                    {(day) => (
                      <th
                        scope="col"
                        abbr={format(day, 'EEEE', { locale: locale() })}
                        class={styles.weekday}
                      >
                        {format(day, 'EEEEEE', { locale: locale() })}
                      </th>
                    )}
                  </For>
                </tr>
              </thead>
              <tbody>
                <For each={weeks()}>
                  {(week) => (
                    <tr>
                      <For each={week}>
                        {(day) => (
                          <td>
                            <Show when={isSameMonth(day, focused())}>
                              <button
                                type="button"
                                class={styles.day}
                                tabindex={isSameDay(day, focused()) ? 0 : -1}
                                disabled={isBefore(day, min()) || isAfter(day, max())}
                                aria-label={format(day, 'EEEE, d MMMM yyyy', {
                                  locale: locale(),
                                })}
                                aria-current={isToday(day) ? 'date' : undefined}
                                aria-pressed={isSelected(day)}
                                onClick={() => choose(day)}
                              >
                                {format(day, 'd')}
                              </button>
                            </Show>
                          </td>
                        )}
                      </For>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </KobaltePopover.Content>
        </KobaltePopover.Portal>
      </KobaltePopover>
      <input type="hidden" name={props.name} value={props.value} />
      <Show when={props.description}>
        <p id={descriptionId} class={styles.description}>
          {props.description}
        </p>
      </Show>
      <Show when={props.error}>
        <p id={errorId} class={styles.error}>
          <AlertIcon />
          {props.error}
        </p>
      </Show>
    </div>
  );
}

// Lucide icons, drawn inline so the field needs no icon package.

function CalendarIcon() {
  return (
    <svg class={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 2v4M16 2v4M3 10h18" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
    </svg>
  );
}

function ChevronIcon(props: { path: string }) {
  return (
    <svg class={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path d={props.path} />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg class={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}
