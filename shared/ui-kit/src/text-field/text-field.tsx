import { TextField as KobalteTextField } from '@kobalte/core/text-field';
import { Show } from 'solid-js';
import styles from './text-field.module.css';

export type TextFieldProps = {
  label: string;
  name?: string;
  type?: 'text' | 'email' | 'password' | 'search' | 'url';
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  autocomplete?: string;
  description?: string;
  /** Shown under the input, and marks the field invalid. */
  error?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  class?: string;
};

export function TextField(props: TextFieldProps) {
  return (
    <KobalteTextField
      class={props.class ? `${styles.root} ${props.class}` : styles.root}
      name={props.name}
      value={props.value}
      defaultValue={props.defaultValue}
      onChange={props.onChange}
      validationState={props.error ? 'invalid' : 'valid'}
      required={props.required}
      disabled={props.disabled}
      readOnly={props.readOnly}
    >
      <KobalteTextField.Label class={styles.label}>{props.label}</KobalteTextField.Label>
      <KobalteTextField.Input
        class={styles.input}
        type={props.type ?? 'text'}
        placeholder={props.placeholder}
        autocomplete={props.autocomplete}
      />
      <Show when={props.description}>
        <KobalteTextField.Description class={styles.description}>
          {props.description}
        </KobalteTextField.Description>
      </Show>
      <KobalteTextField.ErrorMessage class={styles.error}>
        {props.error}
      </KobalteTextField.ErrorMessage>
    </KobalteTextField>
  );
}
