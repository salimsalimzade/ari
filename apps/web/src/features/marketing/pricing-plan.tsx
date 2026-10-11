import { Button, Logo, SegmentedControl } from '@ari/ui-kit';
import { For, Show } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import { Icon } from './icons';
import { links } from './links';
import shared from './marketing.module.scss';
import styles from './pricing-plan.module.scss';

export type Billing = 'monthly' | 'yearly';

/**
 * The headline, the monthly / yearly switch, what's included and the Hive card. The pricing page
 * opens with it; on the landing page it is the `#pricing` section, under an h2.
 */
export function PricingPlan(props: {
  billing: Billing;
  onBillingChange: (billing: Billing) => void;
  section?: boolean;
}) {
  const { t } = useI18n();
  const yearly = () => props.billing === 'yearly';

  return (
    <section
      id={props.section ? 'pricing' : undefined}
      class={styles.plan}
      data-section={props.section ? '' : undefined}
    >
      <div class={styles.copy}>
        <Show when={props.section} fallback={<h1 class={styles.title}>{t().pricing.title}</h1>}>
          <h2 class={shared.title}>{t().pricing.title}</h2>
        </Show>
        <p class={styles.text}>{t().pricing.text}</p>
        <SegmentedControl
          label={t().pricing.period}
          class={styles.period}
          value={props.billing}
          onChange={(value) => props.onBillingChange(value as Billing)}
          options={[
            { value: 'monthly', label: t().pricing.monthly },
            {
              value: 'yearly',
              label: t().pricing.yearly,
              badge: t().pricing.save,
              shortBadge: t().pricing.saveShort,
            },
          ]}
        />
      </div>
      <div class={styles.card}>
        <span class={styles.circle} />
        <div class={styles.name}>
          <Logo size={28} />
          {t().pricing.plan}
        </div>
        <div class={styles.price}>
          <strong>{yearly() ? t().pricing.yearPrice : t().pricing.monthPrice}</strong>
          <span>{yearly() ? t().pricing.perYear : t().pricing.perMonth}</span>
        </div>
        <span class={styles.billed}>
          {yearly() ? t().pricing.billedYearly : t().pricing.billedMonthly}
        </span>
        <Button variant="primary" href={links.trial} class={styles.trial}>
          {t().marketing.faq.startTrial}
        </Button>
        <span class={styles.cancel}>{t().pricing.cancel}</span>
      </div>
      <div class={styles.included}>
        <span class={styles.overline}>{t().pricing.included}</span>
        <ul class={styles.list}>
          <For each={t().pricing.features}>
            {(feature) => (
              <li>
                <span class={styles.check}>
                  <Icon name="check" />
                </span>
                {feature}
              </li>
            )}
          </For>
        </ul>
      </div>
    </section>
  );
}
