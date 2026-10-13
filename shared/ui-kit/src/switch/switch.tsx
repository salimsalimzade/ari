import { Switch as KobalteSwitch } from '@kobalte/core/switch';
import type { JSX } from 'solid-js';
import styles from './switch.module.scss';

export type SwitchProps = {
  label: string;
  /** Shown before the label, e.g. an eye for "Show on page". */
  icon?: JSX.Element;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  class?: string;
};

/** An on / off row: the label, then the track at the end. Clicking either one switches it. */
export function Switch(props: SwitchProps) {
  return (
    <KobalteSwitch
      class={props.class ? `${styles.root} ${props.class}` : styles.root}
      checked={props.checked}
      onChange={props.onChange}
      disabled={props.disabled}
    >
      <KobalteSwitch.Input class={styles.input} />
      <KobalteSwitch.Label class={styles.label}>
        {props.icon}
        {props.label}
      </KobalteSwitch.Label>
      <KobalteSwitch.Control class={styles.control}>
        <KobalteSwitch.Thumb class={styles.thumb} />
      </KobalteSwitch.Control>
    </KobalteSwitch>
  );
}
