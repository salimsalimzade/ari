import { Slider as KobalteSlider } from '@kobalte/core/slider';
import type { JSX } from 'solid-js';
import styles from './slider.module.scss';

export type SliderProps = {
  label: string;
  /** Keeps the label for screen readers only. */
  hideLabel?: boolean;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Read out instead of the number, e.g. "150%". */
  valueLabel?: (value: number) => string;
  /** Shown before and after the track, e.g. minus and plus buttons. */
  start?: JSX.Element;
  end?: JSX.Element;
  class?: string;
};

/** One-thumb slider, e.g. the zoom of a photo crop. Arrow keys move it too. */
export function Slider(props: SliderProps) {
  return (
    <KobalteSlider
      class={props.class ? `${styles.root} ${props.class}` : styles.root}
      value={[props.value]}
      onChange={([value]) => props.onChange(value)}
      minValue={props.min ?? 0}
      maxValue={props.max ?? 100}
      step={props.step ?? 1}
      getValueLabel={props.valueLabel && ((params) => props.valueLabel?.(params.values[0]) ?? '')}
    >
      <KobalteSlider.Label class={styles.label} data-hidden={props.hideLabel ? '' : undefined}>
        {props.label}
      </KobalteSlider.Label>
      <div class={styles.row}>
        {props.start}
        <KobalteSlider.Track class={styles.track}>
          <KobalteSlider.Fill class={styles.fill} />
          <KobalteSlider.Thumb class={styles.thumb}>
            <KobalteSlider.Input />
          </KobalteSlider.Thumb>
        </KobalteSlider.Track>
        {props.end}
      </div>
    </KobalteSlider>
  );
}
