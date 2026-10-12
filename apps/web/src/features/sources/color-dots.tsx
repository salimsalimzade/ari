import type { HighlightColor } from '@ari/ui-kit';
import { For } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import styles from './sources.module.scss';

/** A dot of each highlight color a source uses, named for screen readers. */
export function ColorDots(props: { colors: HighlightColor[]; size?: 'sm' | 'md' }) {
  const { t } = useI18n();
  return (
    <span class={styles.dots} data-size={props.size ?? 'sm'}>
      <For each={props.colors}>
        {(color) => <span class={styles.dot} data-color={color} aria-hidden="true" />}
      </For>
      <span class={styles['visually-hidden']}>
        {props.colors.map((color) => t().colors.names[color]).join(', ')}
      </span>
    </span>
  );
}
