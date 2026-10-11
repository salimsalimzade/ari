import { ComingSoon, SettingsPage } from '~/features/settings/settings-page';
import { useI18n } from '~/i18n/i18n';

export default function ShortcutsSettings() {
  const { t } = useI18n();
  return (
    <SettingsPage title={t().settings.shortcuts} pageTitle={`${t().settings.shortcuts} · Ari`}>
      <ComingSoon text={t().settings.shortcutsSoon} />
    </SettingsPage>
  );
}
