import { type ButtonRootProps, Button as KobalteButton } from '@kobalte/core/button';
import type { PolymorphicProps } from '@kobalte/core/polymorphic';
import { type JSX, Show, splitProps } from 'solid-js';
import styles from './button.module.scss';

export type ButtonProps = PolymorphicProps<'button', ButtonRootProps<'button'>> & {
  /** primary: solid terracotta. secondary: outlined. ghost and danger: colored text only. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** md is 36px high, lg 48px. */
  size?: 'md' | 'lg';
  /** Shown before the label. */
  icon?: JSX.Element;
  /** Shown after the label, e.g. an external-link icon. */
  iconAfter?: JSX.Element;
  /** A round button that shows only `icon`; give it an `aria-label`. */
  iconOnly?: boolean;
  /** Fills the width of its container. */
  block?: boolean;
};

/** Pill button. */
export function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, [
    'variant',
    'size',
    'icon',
    'iconAfter',
    'iconOnly',
    'block',
    'class',
    'children',
  ]);
  return (
    <KobalteButton
      class={local.class ? `${styles.button} ${local.class}` : styles.button}
      data-variant={local.variant ?? 'secondary'}
      data-size={local.size ?? 'md'}
      data-icon-only={local.iconOnly ? '' : undefined}
      data-block={local.block ? '' : undefined}
      {...others}
    >
      {local.icon}
      <Show when={!local.iconOnly}>{local.children}</Show>
      {local.iconAfter}
    </KobalteButton>
  );
}
