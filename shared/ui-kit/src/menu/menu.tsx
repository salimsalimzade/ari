import { DropdownMenu } from '@kobalte/core/dropdown-menu';
import { For, type JSX, Show, type ValidComponent } from 'solid-js';
import styles from './menu.module.scss';

export type MenuItem = {
  label: string;
  /** Shown before the label. */
  icon?: JSX.Element;
  /** Shown at the end, e.g. the "/" that does the same in a note. */
  hint?: string;
  /** Colors the item like a destructive action, e.g. "Delete note". */
  danger?: boolean;
  onSelect: () => void;
};

export type MenuProps = {
  /**
   * Renders the button with Kobalte's props spread on it, e.g.
   * `(props) => <Button {...props}>Add to note</Button>`. It has `data-expanded` while open.
   */
  trigger: ValidComponent;
  /** The items, in groups with a little space between them. */
  groups: MenuItem[][];
  placement?: 'bottom-start' | 'bottom-end';
  /** Runs once the menu has closed and focus is back on its button, e.g. to move it elsewhere. */
  onClosed?: () => void;
  class?: string;
};

/** A menu of actions under its button. Arrow keys move, Enter picks, Escape closes. */
export function Menu(props: MenuProps) {
  return (
    <DropdownMenu placement={props.placement ?? 'bottom-start'} gutter={8}>
      <DropdownMenu.Trigger as={props.trigger} />
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          class={props.class ? `${styles.content} ${props.class}` : styles.content}
          // Kobalte focuses the button right after this, whatever the handler does.
          onCloseAutoFocus={() => queueMicrotask(() => props.onClosed?.())}
        >
          <For each={props.groups}>
            {(group) => (
              <DropdownMenu.Group class={styles.group}>
                <For each={group}>
                  {(item) => (
                    <DropdownMenu.Item
                      class={styles.item}
                      data-danger={item.danger ? '' : undefined}
                      onSelect={item.onSelect}
                    >
                      {item.icon}
                      <DropdownMenu.ItemLabel class={styles.label}>
                        {item.label}
                      </DropdownMenu.ItemLabel>
                      <Show when={item.hint}>
                        <span class={styles.hint} aria-hidden="true">
                          {item.hint}
                        </span>
                      </Show>
                    </DropdownMenu.Item>
                  )}
                </For>
              </DropdownMenu.Group>
            )}
          </For>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  );
}
