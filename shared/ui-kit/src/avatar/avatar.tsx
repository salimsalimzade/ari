import { Show } from 'solid-js';
import styles from './avatar.module.scss';

export type AvatarProps = {
  /** The first letter of the person's name, shown when there is no photo. */
  initial: string;
  /** A photo; it fills the circle. */
  src?: string;
  /** sm 30px (sidebar), md 52px (settings list), lg 80px (phones), xl 96px (account). */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  class?: string;
};

/** Round picture of a person: their photo, or the first letter of their name. */
export function Avatar(props: AvatarProps) {
  return (
    <span
      class={props.class ? `${styles.avatar} ${props.class}` : styles.avatar}
      data-size={props.size ?? 'sm'}
      aria-hidden="true"
    >
      <Show when={props.src} fallback={props.initial}>
        {(src) => <img class={styles.image} src={src()} alt="" />}
      </Show>
    </span>
  );
}
