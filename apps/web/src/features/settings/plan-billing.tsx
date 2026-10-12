import { Alert, Button, Dialog, Tag, type TagProps } from '@ari/ui-kit';
import { createSignal, For, Show } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import { fill, useFormat } from './format';
import { CardIcon, DownloadIcon } from './icons';
import styles from './sections.module.scss';
import { type BillingPeriod, type PlanState, sample, useSettings } from './settings-store';

const trialMegabytes = 50;
const planMegabytes = 1024;

const tagTones: Record<PlanState, TagProps['tone']> = {
  trial: 'sage',
  active: 'sage',
  failed: 'accent',
  trialCanceled: 'neutral',
  canceled: 'neutral',
};

const isTrial = (plan: PlanState) => plan === 'trial' || plan === 'trialCanceled';

// The day a canceled trial or plan ends, or the next payment.
const endDate = (plan: PlanState) => (isTrial(plan) ? sample.trialEnds : sample.nextPayment);

/** The plan in a few words, for the list of sections: "Free trial · 9 days left". */
export function usePlanSummary() {
  const { t } = useI18n();
  const format = useFormat();
  const settings = useSettings();
  return () =>
    fill(t().billing.summary[settings.plan()], {
      days: sample.trialDays - sample.trialDay,
      date: format.shortDate(endDate(settings.plan())),
    });
}

/** Plan and billing: the Hive plan, the upload space it gives, and the card and invoices. */
export function PlanBilling() {
  return (
    <>
      <PlanCard />
      <UploadSpace />
      <Payment />
    </>
  );
}

function PlanCard() {
  const { t } = useI18n();
  const format = useFormat();
  const settings = useSettings();
  const [confirming, setConfirming] = createSignal(false);
  const plan = () => settings.plan();
  const price = (period: BillingPeriod) =>
    period === 'monthly' ? t().pricing.monthPrice : t().pricing.yearPrice;
  const note = () => {
    if (plan() === 'trial')
      return fill(t().billing.trialNote, { date: format.date(sample.trialEnds) });
    if (plan() === 'active' && settings.period() === 'yearly')
      return fill(t().billing.yearlyNote, { date: format.date(sample.nextPayment) });
  };
  // "$5 a month" after a trial, "$5" for the next payment.
  const statusPrice = () => {
    if (plan() !== 'trial') return price(settings.period());
    return settings.period() === 'monthly' ? t().billing.monthlyPrice : t().billing.yearlyPrice;
  };
  const status = () =>
    fill(t().billing.status[plan()], {
      days: sample.trialDays - sample.trialDay,
      date: format.date(endDate(plan())),
      price: statusPrice(),
    });

  return (
    <section class={styles.card}>
      <div class={styles['heading-row']}>
        <h2 class={styles.heading}>{t().pricing.plan}</h2>
        <Tag tone={tagTones[plan()]}>{t().billing.tags[plan()]}</Tag>
      </div>
      <Show when={plan() === 'failed'}>
        <Alert>
          {fill(t().billing.failedAlert, {
            price: t().pricing.monthPrice,
            date: format.date(sample.failedPayment),
            deadline: format.date(sample.updateCardBy),
          })}
        </Alert>
      </Show>
      <p class={styles.text}>{status()}</p>
      <Show when={plan() === 'trial'}>
        <div class={styles.stack}>
          <span class={styles.meter}>
            <span
              class={styles['meter-fill']}
              style={{ width: `${(sample.trialDay / sample.trialDays) * 100}%` }}
            />
          </span>
          <span class={styles.caption}>
            {fill(t().billing.trialDay, { day: sample.trialDay, days: sample.trialDays })}
          </span>
        </div>
      </Show>
      <Show when={plan() === 'trial' || plan() === 'active'}>
        <div
          class={styles.choices}
          data-columns="2"
          role="radiogroup"
          aria-label={t().pricing.period}
        >
          <For each={['monthly', 'yearly'] as const}>
            {(period) => (
              <label class={styles.choice} data-layout="price">
                <input
                  type="radio"
                  name="period"
                  class={styles.radio}
                  checked={settings.period() === period}
                  onChange={() => settings.setPeriod(period)}
                />
                <span class={styles['choice-head']}>
                  <span class={styles['choice-label']}>{t().pricing[period]}</span>
                  <Show when={period === 'yearly'}>
                    <Tag>{t().pricing.save}</Tag>
                  </Show>
                </span>
                <span class={styles.price}>
                  {price(period)}{' '}
                  <span class={styles.per}>
                    {period === 'monthly' ? t().billing.perMonth : t().billing.perYear}
                  </span>
                </span>
              </label>
            )}
          </For>
        </div>
        <Show when={note()}>{(text) => <span class={styles.note}>{text()}</span>}</Show>
      </Show>
      <div class={styles.buttons}>
        <Show
          when={plan() === 'trialCanceled' || plan() === 'canceled'}
          fallback={
            <Button variant="ghost" onClick={() => setConfirming(true)}>
              {plan() === 'trial' ? t().billing.cancelTrial : t().billing.cancelPlan}
            </Button>
          }
        >
          <Button variant="primary" onClick={settings.resumePlan}>
            {plan() === 'trialCanceled' ? t().billing.resumeTrial : t().billing.resumePlan}
          </Button>
        </Show>
      </div>
      <Dialog
        open={confirming()}
        onOpenChange={setConfirming}
        sheet
        title={plan() === 'trial' ? t().billing.cancelTrialTitle : t().billing.cancelPlanTitle}
        description={
          plan() === 'trial'
            ? t().billing.cancelTrialText
            : fill(t().billing.cancelPlanText, { date: format.date(sample.nextPayment) })
        }
      >
        <div class={styles['confirm-actions']}>
          <Button onClick={() => setConfirming(false)}>{t().billing.keepPlan}</Button>
          <Button
            variant="primary"
            onClick={() => {
              settings.cancelPlan();
              setConfirming(false);
            }}
          >
            {plan() === 'trial' ? t().billing.cancelTrial : t().billing.cancelPlan}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}

function UploadSpace() {
  const { t } = useI18n();
  const format = useFormat();
  const settings = useSettings();
  const limit = () => (isTrial(settings.plan()) ? trialMegabytes : planMegabytes);
  const percent = () => (sample.uploadedMegabytes / limit()) * 100;

  return (
    <section class={styles.card}>
      <h2 class={styles.heading}>{t().billing.space}</h2>
      <div class={styles.space}>
        <span class={styles['space-used']}>
          {fill(t().billing.spaceUsed, {
            used: format.size(sample.uploadedMegabytes),
            limit: format.size(limit()),
          })}
        </span>
        <span class={styles['space-left']}>
          {fill(t().billing.spaceLeft, { left: format.size(limit() - sample.uploadedMegabytes) })}
        </span>
      </div>
      {/* The text above says how full it is. */}
      <span class={styles.meter} data-size="lg" aria-hidden="true">
        <span class={styles['meter-fill']} style={{ width: `${percent()}%` }} />
      </span>
      <p class={styles.text}>
        {isTrial(settings.plan()) ? t().billing.spaceTrial : t().billing.spacePlan}
      </p>
    </section>
  );
}

function Payment() {
  const { t } = useI18n();
  const format = useFormat();
  const settings = useSettings();
  const plan = () => settings.plan();

  return (
    <section class={styles.card}>
      <h2 class={styles.heading}>{t().billing.payment}</h2>
      <div class={styles.row}>
        <span class={styles['row-icon']}>
          <CardIcon />
        </span>
        <div class={styles['row-text']}>
          <span class={styles['row-title']}>
            {isTrial(plan())
              ? t().billing.noCard
              : fill(t().billing.card, { last4: sample.card.last4 })}
          </span>
          <span class={styles['row-sub']} data-tone={plan() === 'failed' ? 'danger' : undefined}>
            {isTrial(plan())
              ? fill(t().billing.noCardText, { date: format.date(sample.trialEnds) })
              : plan() === 'failed'
                ? fill(t().billing.cardDeclined, { date: format.date(sample.failedPayment) })
                : fill(t().billing.cardExpires, { date: sample.card.expires })}
          </span>
        </div>
        {/* Adding or changing the card comes with ari-api's billing endpoints. */}
        <Show
          when={isTrial(plan()) || plan() === 'failed'}
          fallback={<Button>{t().billing.changeCard}</Button>}
        >
          <Button variant="primary">
            {isTrial(plan()) ? t().billing.addCard : t().billing.updateCard}
          </Button>
        </Show>
      </div>
      <span class={styles.overline}>{t().billing.invoices}</span>
      <Show when={!isTrial(plan())} fallback={<p class={styles.text}>{t().billing.noInvoices}</p>}>
        <div class={styles.invoices}>
          <For each={sample.invoices}>
            {(date, index) => {
              const failed = () => plan() === 'failed' && index() === 0;
              return (
                <div class={styles.invoice}>
                  <span class={styles['invoice-date']}>{format.date(date)}</span>
                  <span>${format.number(sample.invoiceDollars, 2)}</span>
                  <Tag tone={failed() ? 'accent' : 'sage'}>
                    {failed() ? t().billing.unpaid : t().billing.paid}
                  </Tag>
                  <Button
                    variant="ghost"
                    size="lg"
                    iconOnly
                    icon={<DownloadIcon />}
                    aria-label={t().billing.downloadInvoice}
                    title={t().billing.downloadInvoice}
                  />
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </section>
  );
}
