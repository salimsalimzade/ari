import { type ButtonRootProps, Button as KobalteButton } from '@kobalte/core/button';
import type { PolymorphicProps } from '@kobalte/core/polymorphic';
import { splitProps } from 'solid-js';
import styles from './button.module.css';

export type ButtonProps = PolymorphicProps<'button', ButtonRootProps<'button'>>;

export function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, ['class']);
  return (
    <KobalteButton
      class={local.class ? `${styles.button} ${local.class}` : styles.button}
      {...others}
    />
  );
}
