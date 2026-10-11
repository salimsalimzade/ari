import { AccountSettings } from '~/features/account/account-settings';
import { SettingsPage } from '~/features/settings/settings-page';
import { useI18n } from '~/i18n/i18n';

export default function Account() {
  const { t } = useI18n();
  return (
    <SettingsPage title={t().settings.account} pageTitle={t().account.pageTitle}>
      <AccountSettings />
    </SettingsPage>
  );
}
