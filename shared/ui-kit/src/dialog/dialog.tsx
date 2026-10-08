import { Dialog as KobalteDialog } from '@kobalte/core/dialog';
import { type JSX, Show } from 'solid-js';
import styles from './dialog.module.css';

export type DialogProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  children?: JSX.Element;
};

export function Dialog(props: DialogProps) {
  return (
    <KobalteDialog
      open={props.open}
      defaultOpen={props.defaultOpen}
      onOpenChange={props.onOpenChange}
    >
      <KobalteDialog.Portal>
        <KobalteDialog.Overlay class={styles.overlay} />
        <div class={styles.positioner}>
          <KobalteDialog.Content class={styles.content}>
            <KobalteDialog.Title class={styles.title}>{props.title}</KobalteDialog.Title>
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
