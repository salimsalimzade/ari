import styles from './source-avatar.module.scss';

export type SourceAvatarProps = {
  /** One letter, e.g. "M" for Meadow Quarterly. */
  initial: string;
  /** sm 20px, md 28px, lg 40px, xl 64px. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  class?: string;
};

/** Round letter avatar for a website or file source. */
export function SourceAvatar(props: SourceAvatarProps) {
  return (
    <span
      class={props.class ? `${styles.avatar} ${props.class}` : styles.avatar}
      data-size={props.size ?? 'md'}
      aria-hidden="true"
    >
      {props.initial}
    </span>
  );
}
