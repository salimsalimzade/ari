import { Logo } from '@ari/ui-kit';
import { For } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import { Icon } from './icons';
import shared from './marketing.module.scss';
import styles from './pricing-compare.module.scss';

/** "What $5 a month replaces": each job by hand and with Ari, side by side (stacked on phones). */
export function PricingCompare() {
  const { t } = useI18n();
  return (
    <section class={`${shared.section} ${styles.compare}`} data-tone="surface">
      <div class={shared.intro}>
        <h2 class={styles.title}>{t().pricing.compareTitle}</h2>
        <p class={styles.lead}>{t().pricing.compareText}</p>
      </div>
      <div class={styles.table}>
        {/* The column names, for the eye; each cell says it again for screen readers. */}
        <div class={styles.head} aria-hidden="true">
          <span />
          <span>{t().pricing.byHand}</span>
          <span class={styles['with-ari']}>
            <Logo size={18} />
            {t().pricing.withAri}
          </span>
        </div>
        <ul class={styles.rows}>
          <For each={t().pricing.compare}>
            {(row) => (
              <li class={styles.row}>
                <span class={styles.job}>{row.job}</span>
                <span class={styles.hand}>
                  <span class={styles.mark}>
                    <Icon name="close" />
                  </span>
                  <span>
                    <span class={styles.hidden}>{t().pricing.byHand}: </span>
                    {row.hand}
                  </span>
                </span>
                <span class={styles.ari}>
                  <span class={styles.mark} data-ari="">
                    <Icon name="check" />
                  </span>
                  <span>
                    <span class={styles.hidden}>{t().pricing.withAri}: </span>
                    {row.ari}
                  </span>
                </span>
              </li>
            )}
          </For>
        </ul>
      </div>
    </section>
  );
}
