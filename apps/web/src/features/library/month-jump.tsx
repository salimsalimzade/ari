import { Dialog } from '@ari/ui-kit';
import { isSameMonth, startOfMonth, subMonths } from 'date-fns';
import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount } from 'solid-js';
import { useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { CalendarIcon, ChevronDownIcon } from './icons';
import styles from './library.module.scss';
import { useLibrary } from './library-store';

// Below the sticky day heading, the first day still in view is the one being read.
const headingHeight = 44;

/**
 * Jumping to a month: a column of the last 13 months beside the list on wide screens, a button
 * that opens them in a sheet on narrower ones. The month being read is marked.
 */
export function MonthJump(props: { list: () => HTMLElement | undefined }) {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  const [open, setOpen] = createSignal(false);
  // The day at the top of the screen, while scrolling.
  const [reading, setReading] = createSignal<Date>();

  const newest = () => library.saves()[0]?.savedAt ?? library.from() ?? new Date();
  const months = createMemo(() =>
    Array.from({ length: 13 }, (_, index) => startOfMonth(subMonths(newest(), index))),
  );
  const current = () => reading() ?? library.visible()[0]?.savedAt ?? newest();
  const go = (index: number) => {
    library.jumpTo(index === 0 ? undefined : months()[index]);
    setOpen(false);
  };

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
      onClick={() => go(index)}
    >
      {format.month(month, newest().getFullYear())}
    </button>
  );

  return (
    <>
      <nav class={styles.months} aria-label={t().library.jumpToMonth}>
        <span class={styles['months-label']}>{t().library.jumpTo}</span>
        <For each={months()}>{(month, index) => monthButton(month, index(), styles.month)}</For>
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
          <For each={months().slice(0, 12)}>
            {(month, index) => monthButton(month, index(), styles['month-cell'])}
          </For>
        </div>
      </Dialog>
    </>
  );
}
