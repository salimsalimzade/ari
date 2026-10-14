import { Dialog } from '@ari/ui-kit';
import { isSameMonth, startOfMonth, subMonths } from 'date-fns';
import { createEffect, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js';
import { useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { CalendarIcon, ChevronDownIcon } from './icons';
import styles from './library.module.scss';
import { derive, useLibrary } from './library-store';

// Below the sticky day heading, the first day still in view is the one being read.
const headingHeight = 44;
// How many months the column offers; Earlier goes on from the last of them.
const shownMonths = 12;

/**
 * Jumping to a month: a column beside the list on wide screens, a button that opens it in a sheet
 * on narrower ones. It offers only the months the list's saves are from, and Earlier while older
 * saves are still to load (ari-api can't tell which months have saves before they load). The month
 * being read is marked.
 */
export function MonthJump(props: { list: () => HTMLElement | undefined }) {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  const [open, setOpen] = createSignal(false);
  // The day at the top of the screen, while scrolling.
  const [reading, setReading] = createSignal<Date>();

  // The months of the saves loaded for the filters, newest first (the saves come in that order).
  const saved = derive(() => {
    const result: Date[] = [];
    for (const save of library.loaded()) {
      const month = startOfMonth(save.savedAt);
      if (result.at(-1)?.getTime() !== month.getTime()) result.push(month);
    }
    return result;
  });
  const months = () => saved().slice(0, shownMonths);
  const earlier = () => library.hasMore() || saved().length > shownMonths;
  // One month and nothing older: there is nowhere to jump.
  const shown = () => months().length > 1 || (months().length === 1 && earlier());
  const newest = () => months()[0] ?? startOfMonth(new Date());
  const current = () => reading() ?? library.visible()[0]?.savedAt ?? newest();
  // No month goes back to the newest saves.
  const go = (month?: Date) => {
    library.jumpTo(month);
    setOpen(false);
  };
  const goEarlier = () => go(subMonths(months().at(-1) ?? newest(), 1));

  onMount(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      for (const day of props.list()?.querySelectorAll<HTMLElement>('[data-day]') ?? []) {
        if (day.getBoundingClientRect().bottom > headingHeight) {
          setReading(new Date(Number(day.dataset.day)));
          return;
        }
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onCleanup(() => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    });
  });
  // A new start (a jump or a filter) reads from the top again.
  createEffect(on(library.restarts, () => setReading(undefined), { defer: true }));

  const monthButton = (month: Date, index: number, class_: string) => (
    <button
      type="button"
      class={class_}
      aria-current={isSameMonth(month, current()) ? 'true' : undefined}
      onClick={() => go(index === 0 ? undefined : month)}
    >
      {format.month(month, newest().getFullYear())}
    </button>
  );
  const earlierButton = (class_: string) => (
    <Show when={earlier()}>
      <button type="button" class={class_} onClick={goEarlier}>
        {t().library.earlier}
      </button>
    </Show>
  );

  return (
    <Show when={shown()}>
      <nav class={styles.months} aria-label={t().library.jumpToMonth}>
        <span class={styles['months-label']}>{t().library.jumpTo}</span>
        <For each={months()}>{(month, index) => monthButton(month, index(), styles.month)}</For>
        {earlierButton(styles.month)}
      </nav>
      <button
        type="button"
        class={styles['month-button']}
        aria-haspopup="dialog"
        aria-label={`${t().library.jumpToMonth}: ${format.monthAndYear(current())}`}
        onClick={() => setOpen(true)}
      >
        <CalendarIcon />
        {format.monthAndYear(current())}
        <ChevronDownIcon />
      </button>
      <Dialog open={open()} onOpenChange={setOpen} sheet title={t().library.jumpToMonth}>
        <div class={styles['month-grid']}>
          <For each={months()}>
            {(month, index) => monthButton(month, index(), styles['month-cell'])}
          </For>
          {earlierButton(styles['month-cell'])}
        </div>
      </Dialog>
    </Show>
  );
}
