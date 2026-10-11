import { ComingSoon, SettingsPage } from '~/features/settings/settings-page';
import { useI18n } from '~/i18n/i18n';

export default function BillingSettings() {
  const { t } = useI18n();
  return (
    <SettingsPage title={t().settings.billing} pageTitle={`${t().settings.billing} · Ari`}>
      <ComingSoon text={t().settings.billingSoon} />
    </SettingsPage>
  );
}
