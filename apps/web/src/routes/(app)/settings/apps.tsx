import { ConnectedApps } from '~/features/settings/connected-apps';
import { SettingsPage } from '~/features/settings/settings-page';
import { useI18n } from '~/i18n/i18n';

export default function AppsSettings() {
  const { t } = useI18n();
  return (
    <SettingsPage title={t().settings.apps} pageTitle={t().apps.pageTitle}>
      <ConnectedApps />
    </SettingsPage>
  );
}
