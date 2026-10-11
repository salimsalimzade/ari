import { Accordion as KobalteAccordion } from '@kobalte/core/accordion';
import { For, type JSX } from 'solid-js';
import styles from './accordion.module.scss';

export type AccordionItem = {
  value: string;
  title: string;
  content: JSX.Element;
};

export type AccordionProps = {
  items: AccordionItem[];
  /** The open item; undefined when all are closed. One at a time, and it can close again. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string | undefined) => void;
  class?: string;
};

/**
 * Questions that open in place, e.g. an FAQ. A "+" that turns to "−" on wide screens, an arrow
 * that turns on phones; the answer slides open.
 */
export function Accordion(props: AccordionProps) {
  return (
    <KobalteAccordion
      class={props.class ? `${styles.root} ${props.class}` : styles.root}
      collapsible
      value={props.value === undefined ? undefined : [props.value]}
      defaultValue={props.defaultValue === undefined ? undefined : [props.defaultValue]}
      onChange={(value) => props.onChange?.(value[0])}
    >
      <For each={props.items}>
        {(item) => (
          <KobalteAccordion.Item value={item.value} class={styles.item}>
            <KobalteAccordion.Header class={styles.header}>
              <KobalteAccordion.Trigger class={styles.trigger}>
                <span class={styles.title}>{item.title}</span>
                <span class={styles.mark} aria-hidden="true">
                  <svg class={styles.icon} data-wide="" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14" />
                    <path class={styles.vertical} d="M12 5v14" />
                  </svg>
                  <svg class={styles.icon} data-narrow="" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </KobalteAccordion.Trigger>
            </KobalteAccordion.Header>
            <KobalteAccordion.Content class={styles.content}>
              <div class={styles.answer}>{item.content}</div>
            </KobalteAccordion.Content>
          </KobalteAccordion.Item>
        )}
      </For>
    </KobalteAccordion>
  );
}
