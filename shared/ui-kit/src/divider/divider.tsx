import { children, type JSX, Show } from 'solid-js';
import styles from './divider.module.scss';

export type DividerProps = {
  /** Text between the two lines, e.g. "or". Without it the divider is a plain rule. */
  children?: JSX.Element;
  class?: string;
};

export function Divider(props: DividerProps) {
  const className = () => (props.class ? `${styles.divider} ${props.class}` : styles.divider);
  // Resolved once: reading a JSX prop again would build its DOM again and break hydration.
  const label = children(() => props.children);
  return (
    <Show when={label()} fallback={<hr class={className()} />}>
      <div class={className()} data-labelled>
        {label()}
      </div>
    </Show>
  );
}
