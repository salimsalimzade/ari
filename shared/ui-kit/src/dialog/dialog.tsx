import { Dialog as KobalteDialog } from '@kobalte/core/dialog';
import { type JSX, Show } from 'solid-js';
import styles from './dialog.module.scss';

export type DialogProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  /**
   * false: Escape, a click outside and the close button are all off, so only the caller's own
   * buttons close it, by setting `open` to false (e.g. after an action finishes).
   */
  dismissible?: boolean;
  /** On phones it rises from the bottom edge as a sheet, e.g. to confirm an action. */
  sheet?: boolean;
  children?: JSX.Element;
};

export function Dialog(props: DialogProps) {
  const dismissible = () => props.dismissible ?? true;
  const preventUnlessDismissible = (event: Event) => {
    if (!dismissible()) event.preventDefault();
  };

  return (
    <KobalteDialog
      open={props.open}
      defaultOpen={props.defaultOpen}
      onOpenChange={props.onOpenChange}
    >
      <KobalteDialog.Portal>
        <KobalteDialog.Overlay class={styles.overlay} />
        <div class={styles.positioner} data-sheet={props.sheet ? '' : undefined}>
          <KobalteDialog.Content
            class={styles.content}
            onEscapeKeyDown={preventUnlessDismissible}
            onInteractOutside={preventUnlessDismissible}
          >
            <div class={styles.header}>
              <KobalteDialog.Title class={styles.title}>{props.title}</KobalteDialog.Title>
              <Show when={dismissible()}>
                <KobalteDialog.CloseButton class={styles.close} aria-label="Close">
                  <svg class={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </KobalteDialog.CloseButton>
              </Show>
            </div>
            <Show when={props.description}>
              <KobalteDialog.Description class={styles.description}>
                {props.description}
              </KobalteDialog.Description>
            </Show>
            {props.children}
          </KobalteDialog.Content>
        </div>
      </KobalteDialog.Portal>
    </KobalteDialog>
  );
}
