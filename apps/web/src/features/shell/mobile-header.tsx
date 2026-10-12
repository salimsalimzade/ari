import { Logo } from '@ari/ui-kit';
import { A } from '@solidjs/router';
import { type JSX, Show } from 'solid-js';
import { LanguageSelect } from '~/i18n/language-select';
import styles from './app-shell.module.scss';
import { BackIcon } from './icons';

export type MobileHeaderProps = {
  /** A "← Settings" link back to the page above. */
  back?: { href: string; label: string };
  /** The page's title, where a page without a back link would show the logo. */
  title?: string;
  /** Buttons after the language picker, e.g. the Library's search. */
  actions?: JSX.Element;
};

/** The top of a signed-in page on phones: back link, title or logo, and the language picker. */
export function MobileHeader(props: MobileHeaderProps) {
  return (
    <header class={styles['mobile-header']}>
      <Show
        when={props.back}
        fallback={
          <Show when={props.title} fallback={<Logo wordmark="md" />}>
            <h1 class={styles['mobile-title']}>{props.title}</h1>
          </Show>
        }
      >
        {(back) => (
          <A href={back().href} class={styles.back}>
            <BackIcon />
            {back().label}
          </A>
        )}
      </Show>
      <div class={styles['mobile-actions']}>
        <LanguageSelect />
        {props.actions}
      </div>
    </header>
  );
}
