import { Title } from '@solidjs/meta';
import styles from '~/features/settings/settings.module.scss';
import { SettingsNav } from '~/features/settings/settings-nav';
import { MobileHeader } from '~/features/shell/mobile-header';
import { useI18n } from '~/i18n/i18n';

// The list of sections; on phones it's where the Settings tab goes.
export default function SettingsIndex() {
  const { t } = useI18n();
  return (
    <>
      <Title>{t().settings.pageTitle}</Title>
      <MobileHeader />
      <h1 class={styles['mobile-title']}>{t().settings.title}</h1>
      <div class={styles.sections}>
        <SettingsNav variant="list" />
      </div>
    </>
  );
}
