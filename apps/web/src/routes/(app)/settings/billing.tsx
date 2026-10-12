import { PlanBilling } from '~/features/settings/plan-billing';
import { SettingsPage } from '~/features/settings/settings-page';
import { useI18n } from '~/i18n/i18n';

export default function BillingSettings() {
  const { t } = useI18n();
  return (
    <SettingsPage title={t().settings.billing} pageTitle={t().billing.pageTitle}>
      <PlanBilling />
    </SettingsPage>
  );
}
