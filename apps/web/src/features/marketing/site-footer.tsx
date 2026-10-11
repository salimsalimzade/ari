import { Logo } from '@ari/ui-kit';
import { A } from '@solidjs/router';
import { useI18n } from '~/i18n/i18n';
import { LanguageSelect } from '~/i18n/language-select';
import { links } from './links';
import styles from './site-footer.module.scss';

/**
 * One row on wide screens; on phones a card with the tagline, two columns of links and the
 * language picker.
 */
export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer class={styles.footer}>
      <div class={styles.brand}>
        <Logo wordmark="md" />
        <p class={styles.tagline}>{t().marketing.footer.tagline}</p>
      </div>
      <div class={styles.columns}>
        <nav class={styles.group} aria-label={t().marketing.footer.product}>
          <span class={styles.heading}>{t().marketing.footer.product}</span>
          <A href="/#how" class={styles.extra}>
            {t().marketing.footer.how}
          </A>
          <A href="/pricing">{t().marketing.footer.pricing}</A>
          <A href="/#faq" class={styles.extra}>
            {t().marketing.footer.faq}
          </A>
        </nav>
        <nav class={styles.group} aria-label={t().marketing.footer.helpLabel}>
          <span class={styles.heading}>{t().marketing.footer.help}</span>
          <a href={links.support} class={styles.extra}>
            {t().marketing.footer.support}
          </a>
          <a href={links.privacy}>{t().marketing.footer.privacy}</a>
          <a href={links.terms}>{t().marketing.footer.terms}</a>
        </nav>
      </div>
      <div class={styles.bottom}>
        <span class={styles.copyright}>© {new Date().getFullYear()} Ari</span>
        <LanguageSelect class={styles.language} />
      </div>
    </footer>
  );
}
