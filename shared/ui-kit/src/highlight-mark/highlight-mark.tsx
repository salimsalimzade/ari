import type { JSX } from 'solid-js';
import type { HighlightColor } from '../highlight-color';
import styles from './highlight-mark.module.scss';

export type HighlightMarkProps = {
  color: HighlightColor;
  /** fill paints behind the whole line, marker only its lower half. */
  markStyle?: 'fill' | 'marker';
  children: JSX.Element;
};

/** Saved-quote text with its highlight color behind it. */
export function HighlightMark(props: HighlightMarkProps) {
  return (
    <mark class={styles.mark} data-color={props.color} data-style={props.markStyle ?? 'fill'}>
      {props.children}
    </mark>
  );
}
