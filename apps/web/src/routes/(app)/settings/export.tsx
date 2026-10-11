import { ComingSoon, SettingsPage } from '~/features/settings/settings-page';
import { useI18n } from '~/i18n/i18n';

export default function ExportSettings() {
  const { t } = useI18n();
  return (
    <SettingsPage title={t().settings.export} pageTitle={`${t().settings.export} · Ari`}>
      <ComingSoon text={t().settings.exportSoon} />
    </SettingsPage>
  );
}
