import { Title } from '@solidjs/meta';
import { createSignal } from 'solid-js';
import { Closing } from '~/features/marketing/closing';
import shared from '~/features/marketing/marketing.module.scss';
import { PricingCompare } from '~/features/marketing/pricing-compare';
import { PricingFaq } from '~/features/marketing/pricing-faq';
import { type Billing, PricingPlan } from '~/features/marketing/pricing-plan';
import { SiteFooter } from '~/features/marketing/site-footer';
import { SiteHeader } from '~/features/marketing/site-header';
import { useI18n } from '~/i18n/i18n';

// One plan with a monthly / yearly switch, what's included, Ari against doing it by hand, and
// pricing questions. The switch also sets the price in the closing call to action.
export default function Pricing() {
  const { t } = useI18n();
  const [billing, setBilling] = createSignal<Billing>('monthly');
  return (
    <div class={shared.page}>
      <Title>{t().pricing.pageTitle}</Title>
      <SiteHeader pricingHref="/pricing" />
      <main>
        <PricingPlan billing={billing()} onBillingChange={setBilling} />
        <PricingCompare />
        <PricingFaq />
        <Closing price={billing() === 'yearly' ? t().pricing.ctaYearly : t().pricing.ctaMonthly} />
      </main>
      <SiteFooter />
    </div>
  );
}
