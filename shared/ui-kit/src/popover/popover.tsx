import { Popover as KobaltePopover } from '@kobalte/core/popover';
import type { JSX } from 'solid-js';
import styles from './popover.module.scss';

export type PopoverProps = {
  /** The button's content; Kobalte gives the button `data-expanded` while the panel is open. */
  trigger: JSX.Element;
  triggerClass?: string;
  /** Marks the button as in use with `data-active`, e.g. a filter with values chosen. */
  active?: boolean;
  /** Names the panel for screen readers, e.g. "Tags". */
  label: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: 'bottom-start' | 'bottom-end';
  class?: string;
  children: JSX.Element;
};

/** A panel under its button, e.g. a filter's options. Escape and a click outside close it. */
export function Popover(props: PopoverProps) {
  return (
    <KobaltePopover
      open={props.open}
      onOpenChange={props.onOpenChange}
      placement={props.placement ?? 'bottom-start'}
      gutter={8}
    >
      <KobaltePopover.Trigger
        class={props.triggerClass}
        data-active={props.active ? '' : undefined}
      >
        {props.trigger}
      </KobaltePopover.Trigger>
      <KobaltePopover.Portal>
        <KobaltePopover.Content
          class={props.class ? `${styles.content} ${props.class}` : styles.content}
          aria-label={props.label}
        >
          {props.children}
        </KobaltePopover.Content>
      </KobaltePopover.Portal>
    </KobaltePopover>
  );
}
