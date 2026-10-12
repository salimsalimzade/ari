import { Title } from '@solidjs/meta';
import { SettingsList } from '~/features/settings/settings-list';
import { MobileHeader } from '~/features/shell/mobile-header';
import { useI18n } from '~/i18n/i18n';

// The list of sections; on phones it's where the Settings tab goes.
export default function SettingsIndex() {
  const { t } = useI18n();
  return (
    <>
      <Title>{t().settings.pageTitle}</Title>
      <MobileHeader title={t().settings.title} />
      <SettingsList />
    </>
  );
}
