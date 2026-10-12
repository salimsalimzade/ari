import { HighlightColors } from '~/features/settings/highlight-colors';
import { SettingsPage } from '~/features/settings/settings-page';
import { useI18n } from '~/i18n/i18n';

export default function ColorSettings() {
  const { t } = useI18n();
  return (
    <SettingsPage title={t().settings.colors} pageTitle={t().colors.pageTitle}>
      <HighlightColors />
    </SettingsPage>
  );
}
