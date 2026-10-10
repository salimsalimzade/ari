import { Checkbox as KobalteCheckbox } from '@kobalte/core/checkbox';
import type { JSX } from 'solid-js';
import styles from './checkbox.module.scss';

export type CheckboxProps = {
  /** The label; it may hold links, e.g. to the terms. */
  children: JSX.Element;
  name?: string;
  value?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  /** Shown under the label, and marks the checkbox invalid. */
  error?: string;
  required?: boolean;
  disabled?: boolean;
  class?: string;
};

export function Checkbox(props: CheckboxProps) {
  return (
    <KobalteCheckbox
      class={props.class ? `${styles.root} ${props.class}` : styles.root}
      name={props.name}
      value={props.value}
      checked={props.checked}
      defaultChecked={props.defaultChecked}
      onChange={props.onChange}
      validationState={props.error ? 'invalid' : 'valid'}
      required={props.required}
      disabled={props.disabled}
    >
      <div class={styles.row}>
        <KobalteCheckbox.Input class={styles.input} />
        <KobalteCheckbox.Control class={styles.control}>
          <KobalteCheckbox.Indicator>
            <svg class={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </KobalteCheckbox.Indicator>
        </KobalteCheckbox.Control>
        <KobalteCheckbox.Label class={styles.label}>{props.children}</KobalteCheckbox.Label>
      </div>
      <KobalteCheckbox.ErrorMessage class={styles.error}>
        <svg class={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
        {props.error}
      </KobalteCheckbox.ErrorMessage>
    </KobalteCheckbox>
  );
}
