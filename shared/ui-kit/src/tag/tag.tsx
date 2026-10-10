import { type JSX, Show } from 'solid-js';
import styles from './tag.module.scss';

export type TagProps = {
  /** sage for the user's tags, accent for an item's type, neutral in the sidebar, outline to add one. */
  tone?: 'accent' | 'sage' | 'neutral' | 'outline';
  icon?: JSX.Element;
  /** Makes the tag a button. */
  onClick?: () => void;
  class?: string;
  children: JSX.Element;
};

/** Small pill label. */
export function Tag(props: TagProps) {
  const className = () => (props.class ? `${styles.tag} ${props.class}` : styles.tag);
  const tone = () => props.tone ?? 'sage';
  return (
    <Show
      when={props.onClick}
      fallback={
        <span class={className()} data-tone={tone()}>
          {props.icon}
          {props.children}
        </span>
      }
    >
      <button
        type="button"
        class={className()}
        data-tone={tone()}
        onClick={() => props.onClick?.()}
      >
        {props.icon}
        {props.children}
      </button>
    </Show>
  );
}
