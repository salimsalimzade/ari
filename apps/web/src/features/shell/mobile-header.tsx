import { Logo } from '@ari/ui-kit';
import { A } from '@solidjs/router';
import { Show } from 'solid-js';
import { LanguageSelect } from '~/i18n/language-select';
import styles from './app-shell.module.scss';
import { BackIcon } from './icons';

export type MobileHeaderProps = {
  /** A "← Settings" link back to the page above; the logo when there is none. */
  back?: { href: string; label: string };
};

/** The top of a signed-in page on phones: back link or logo, and the language picker. */
export function MobileHeader(props: MobileHeaderProps) {
  return (
    <header class={styles['mobile-header']}>
      <Show when={props.back} fallback={<Logo wordmark="md" />}>
        {(back) => (
          <A href={back().href} class={styles.back}>
            <BackIcon />
            {back().label}
          </A>
        )}
      </Show>
      <LanguageSelect />
    </header>
  );
}
