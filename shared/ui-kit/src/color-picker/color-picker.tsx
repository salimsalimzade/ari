import { RadioGroup } from '@kobalte/core/radio-group';
import { For } from 'solid-js';
import { type HighlightColor, highlightColors } from '../highlight-color';
import styles from './color-picker.module.scss';

export type ColorPickerProps = {
  value: HighlightColor;
  onChange: (color: HighlightColor) => void;
  /** md swatches are 28px, sm 22px. */
  size?: 'sm' | 'md';
  'aria-label'?: string;
  /** Each color's name for screen readers, e.g. in the page's language; English when left out. */
  names?: Record<HighlightColor, string>;
  class?: string;
};

/** The five highlight colors as a radio group. Arrow keys move between swatches. */
export function ColorPicker(props: ColorPickerProps) {
  return (
    <RadioGroup
      class={props.class ? `${styles.group} ${props.class}` : styles.group}
      value={props.value}
      onChange={(value) => props.onChange(value as HighlightColor)}
      aria-label={props['aria-label'] ?? 'Highlight color'}
      orientation="horizontal"
    >
      <For each={highlightColors}>
        {(color) => (
          <RadioGroup.Item value={color} class={styles.item}>
            <RadioGroup.ItemInput class={styles.input} />
            <RadioGroup.ItemControl
              class={styles.swatch}
              data-color={color}
              data-size={props.size ?? 'md'}
            />
            <RadioGroup.ItemLabel class={styles.label}>
              {props.names?.[color] ?? color}
            </RadioGroup.ItemLabel>
          </RadioGroup.Item>
        )}
      </For>
    </RadioGroup>
  );
}
