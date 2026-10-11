import { Accordion } from '@ari/ui-kit';
import { useI18n } from '~/i18n/i18n';
import shared from './marketing.module.scss';
import styles from './pricing-faq.module.scss';

/** "Pricing questions": the title beside the questions, which open in place (stacked on phones). */
export function PricingFaq() {
  const { t } = useI18n();
  return (
    <section class={`${shared.section} ${styles.faq}`}>
      <h2 class={styles.title}>{t().pricing.faqTitle}</h2>
      <Accordion
        defaultValue="0"
        items={t().pricing.faq.map((question, i) => ({
          value: String(i),
          title: question.q,
          content: question.a,
        }))}
      />
    </section>
  );
}
