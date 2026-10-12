import { ExportData } from '~/features/settings/export-data';
import { SettingsPage } from '~/features/settings/settings-page';
import { useI18n } from '~/i18n/i18n';

export default function ExportSettings() {
  const { t } = useI18n();
  return (
    <SettingsPage title={t().settings.export} pageTitle={t().exportData.pageTitle}>
      <ExportData />
    </SettingsPage>
  );
}
