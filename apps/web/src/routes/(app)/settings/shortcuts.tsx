import { SettingsPage } from '~/features/settings/settings-page';
import { Shortcuts } from '~/features/settings/shortcuts';
import { useI18n } from '~/i18n/i18n';

export default function ShortcutsSettings() {
  const { t } = useI18n();
  return (
    <SettingsPage title={t().settings.shortcuts} pageTitle={t().shortcuts.pageTitle}>
      <Shortcuts />
    </SettingsPage>
  );
}
