import type { JSX } from 'solid-js';
import styles from './alert.module.scss';

export type AlertProps = {
  /** The message; a link in it (e.g. "reset your password") is bold and keeps the alert's color. */
  children: JSX.Element;
  class?: string;
};

/** Form-level error, e.g. when an email and password don't match. */
export function Alert(props: AlertProps) {
  return (
    <div role="alert" class={props.class ? `${styles.alert} ${props.class}` : styles.alert}>
      <svg class={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
      <span>{props.children}</span>
    </div>
  );
}
