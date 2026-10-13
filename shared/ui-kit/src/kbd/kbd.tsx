import styles from './kbd.module.scss';

export type KbdProps = {
  /** neutral on light panels, accent inside a primary button, inverse on the dark toast. */
  tone?: 'neutral' | 'accent' | 'inverse';
  /** One key: a symbol (⌘, ⇧) or a name (Ctrl, C). */
  children: string;
  class?: string;
};

/** One key of a keyboard shortcut. */
export function Kbd(props: KbdProps) {
  return (
    <kbd
      class={props.class ? `${styles.kbd} ${props.class}` : styles.kbd}
      data-tone={props.tone ?? 'neutral'}
    >
      {props.children}
    </kbd>
  );
}
