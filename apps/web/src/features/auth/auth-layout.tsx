import { type HighlightColor, HighlightMark, Logo, SourceAvatar } from '@ari/ui-kit';
import type { JSX } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import { LanguageSelect } from '~/i18n/language-select';
import styles from './auth.module.scss';

export type AuthLayoutProps = {
  /** A saved quote shown in the panel beside the form. */
  quote: string;
  color: HighlightColor;
  children: JSX.Element;
};

/** The log-in and sign-up pages: the form on the left, a saved quote on the right. */
export function AuthLayout(props: AuthLayoutProps) {
  const { t } = useI18n();
  return (
    <div class={styles.page}>
      <div class={styles.main}>
        <header class={styles.header}>
          <Logo wordmark="lg" />
          <LanguageSelect />
        </header>
        <main class={styles.content}>{props.children}</main>
        <footer class={styles.footer}>
          <span>© {new Date().getFullYear()} Ari</span>
        </footer>
      </div>
      <aside class={styles.aside}>
        <p class={styles.tagline}>{t().auth.tagline}</p>
        <figure class={styles.quote}>
          <blockquote>
            <HighlightMark color={props.color}>{props.quote}</HighlightMark>
          </blockquote>
          <figcaption>
            <SourceAvatar initial="M" />
            {t().auth.quoteSource}
          </figcaption>
        </figure>
      </aside>
    </div>
  );
}
