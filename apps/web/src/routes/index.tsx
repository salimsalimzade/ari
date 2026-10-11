import { Title } from '@solidjs/meta';
import { createSignal } from 'solid-js';
import { Closing } from '~/features/marketing/closing';
import { Faq } from '~/features/marketing/faq';
import { Features } from '~/features/marketing/features';
import { Hero } from '~/features/marketing/hero';
import { HowItWorks } from '~/features/marketing/how-it-works';
import shared from '~/features/marketing/marketing.module.scss';
import { type Billing, PricingPlan } from '~/features/marketing/pricing-plan';
import { Problem } from '~/features/marketing/problem';
import { SiteFooter } from '~/features/marketing/site-footer';
import { SiteHeader } from '~/features/marketing/site-header';
import { useI18n } from '~/i18n/i18n';

// The landing page: problem → how it works → features → pricing → questions → call to action.
export default function Landing() {
  const { t } = useI18n();
  const [billing, setBilling] = createSignal<Billing>('monthly');
  return (
    <div class={shared.page}>
      <Title>{t().marketing.pageTitle}</Title>
      <SiteHeader />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <PricingPlan section billing={billing()} onBillingChange={setBilling} />
        <Faq />
        <Closing />
      </main>
      <SiteFooter />
    </div>
  );
}
