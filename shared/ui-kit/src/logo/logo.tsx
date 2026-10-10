import { Show } from 'solid-js';
import styles from './logo.module.scss';

export type LogoProps = {
  /** Size of the bee in px. */
  size?: number;
  /** Shows "ari" next to the bee: lg 26px (desktop), md 24px (mobile). */
  wordmark?: 'md' | 'lg';
  class?: string;
};

/** The bee mark, with or without the "ari" wordmark. The bee is a placeholder until the final logo. */
export function Logo(props: LogoProps) {
  return (
    <span
      class={props.class ? `${styles.logo} ${props.class}` : styles.logo}
      data-wordmark={props.wordmark}
    >
      <svg
        class={styles.bee}
        width={props.size ?? 28}
        height={props.size ?? 28}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <ellipse class={styles.wing} cx="8" cy="7.5" rx="4" ry="3" transform="rotate(-28 8 7.5)" />
        <ellipse class={styles.wing} cx="16" cy="7.5" rx="4" ry="3" transform="rotate(28 16 7.5)" />
        <ellipse class={styles.body} cx="12" cy="14.5" rx="5.5" ry="7" />
        <path class={styles.stripes} d="M7.6 13h8.8M7.6 16.5h8.8" />
      </svg>
      <Show when={props.wordmark}>
        <span class={styles.wordmark}>ari</span>
      </Show>
    </span>
  );
}
