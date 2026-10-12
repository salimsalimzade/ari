import { SegmentedControl as KobalteSegmentedControl } from '@kobalte/core/segmented-control';
import { For, Show } from 'solid-js';
import styles from './segmented-control.module.scss';

export type SegmentedOption = {
  value: string;
  label: string;
  /** A small pill after the label, e.g. "Save 20%". */
  badge?: string;
  /** The badge on phones, e.g. "−20%". */
  shortBadge?: string;
};

export type SegmentedControlProps = {
  /** Names the group for screen readers, e.g. "Billing period". */
  label: string;
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  /** md: a filled pill of 44px options. sm: an outlined pill of 36px options (44px on phones). */
  size?: 'sm' | 'md';
  /** Fills its container, the options sharing the width. */
  block?: boolean;
  class?: string;
};

/** A pill of options where exactly one is on; arrow keys move between them. */
export function SegmentedControl(props: SegmentedControlProps) {
  return (
    <KobalteSegmentedControl
      class={props.class ? `${styles.root} ${props.class}` : styles.root}
      value={props.value}
      onChange={props.onChange}
      data-size={props.size ?? 'md'}
      data-block={props.block ? '' : undefined}
    >
      <KobalteSegmentedControl.Label class={styles.label}>
        {props.label}
      </KobalteSegmentedControl.Label>
      <div class={styles.track} role="presentation">
        <For each={props.options}>
          {(option) => (
            <KobalteSegmentedControl.Item value={option.value} class={styles.item}>
              <KobalteSegmentedControl.ItemInput class={styles.input} />
              <KobalteSegmentedControl.ItemLabel class={styles['item-label']}>
                {option.label}
                <Show when={option.badge}>
                  <span class={styles.badge} data-short={option.shortBadge ? '' : undefined}>
                    {option.badge}
                  </span>
                </Show>
                <Show when={option.shortBadge}>
                  <span class={styles.badge} data-phone="">
                    {option.shortBadge}
                  </span>
                </Show>
              </KobalteSegmentedControl.ItemLabel>
            </KobalteSegmentedControl.Item>
          )}
        </For>
      </div>
    </KobalteSegmentedControl>
  );
}
