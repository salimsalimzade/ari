import { TextField as KobalteTextField } from '@kobalte/core/text-field';
import { children, createSignal, type JSX, Show } from 'solid-js';
import styles from './text-field.module.scss';

export type TextFieldProps = {
  label: string;
  /** Keeps the label row for screen readers only. */
  hideLabel?: boolean;
  /** Shown at the end of the label row, e.g. a "Forgot password?" link. */
  labelAction?: JSX.Element;
  name?: string;
  /** A password field gets a show/hide toggle. */
  type?: 'text' | 'email' | 'password' | 'search' | 'url' | 'number';
  /** A textarea that grows with its text instead of a one-line input. */
  multiline?: boolean;
  /** Input height: md 36px (panels), lg 44px (desktop forms), xl 48px (mobile forms). */
  size?: 'md' | 'lg' | 'xl';
  /** Input background: surface when the field sits on the canvas color. */
  fill?: 'canvas' | 'surface';
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
  // Resolved once: reading a JSX prop again would build its DOM again and break hydration.
  const labelAction = children(() => props.labelAction);
  const [revealed, setRevealed] = createSignal(false);
  const isPassword = () => props.type === 'password' && !props.multiline;
  const inputType = () => (isPassword() && revealed() ? 'text' : (props.type ?? 'text'));

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
      <div class={styles['label-row']} data-hidden={props.hideLabel ? '' : undefined}>
        <KobalteTextField.Label class={styles.label}>{props.label}</KobalteTextField.Label>
        <Show when={labelAction()}>
          <span class={styles['label-action']}>{labelAction()}</span>
        </Show>
      </div>
      <div
        class={styles.box}
        data-size={props.size ?? 'md'}
        data-fill={props.fill ?? 'canvas'}
        data-multiline={props.multiline ? '' : undefined}
      >
        <Show
          when={props.multiline}
          fallback={
            <KobalteTextField.Input
              class={styles.input}
              type={inputType()}
              placeholder={props.placeholder}
              autocomplete={props.autocomplete}
            />
          }
        >
          {/* The server writes a textarea's value as an attribute, which browsers ignore, so the
              text also goes in as content. */}
          <KobalteTextField.TextArea
            class={styles.input}
            placeholder={props.placeholder}
            autoResize
          >
            {props.value ?? props.defaultValue}
          </KobalteTextField.TextArea>
        </Show>
        <Show when={isPassword()}>
          <button
            type="button"
            class={styles.reveal}
            aria-label="Show password"
            aria-pressed={revealed()}
            disabled={props.disabled}
            onClick={() => setRevealed(!revealed())}
          >
            <Show when={revealed()} fallback={<EyeIcon />}>
              <EyeOffIcon />
            </Show>
          </button>
        </Show>
      </div>
      <Show when={props.description}>
        <KobalteTextField.Description class={styles.description}>
          {props.description}
        </KobalteTextField.Description>
      </Show>
      <KobalteTextField.ErrorMessage class={styles.error}>
        <AlertIcon />
        {props.error}
      </KobalteTextField.ErrorMessage>
    </KobalteTextField>
  );
}

// Lucide icons, drawn inline so the field needs no icon package.

function EyeIcon() {
  return (
    <svg class={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg class={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.73 5.08a10.74 10.74 0 0 1 11.21 6.57 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-1.45 2.49" />
      <path d="M14.08 14.16a3 3 0 0 1-4.24-4.24" />
      <path d="M17.48 17.5a10.75 10.75 0 0 1-15.42-5.15 1 1 0 0 1 0-.7 10.75 10.75 0 0 1 4.45-5.14" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg class={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}
