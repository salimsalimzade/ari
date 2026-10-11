import { type RouteSectionProps, useLocation } from '@solidjs/router';
import styles from '~/features/settings/settings.module.scss';
import { SettingsNav } from '~/features/settings/settings-nav';
import { useI18n } from '~/i18n/i18n';

export default function Settings(props: RouteSectionProps) {
  const { t } = useI18n();
  const location = useLocation();
  const isIndex = () => location.pathname.replace(/\/$/, '') === '/settings';

  return (
    <div class={styles.page} data-index={isIndex() ? '' : undefined}>
      <h1 class={styles.title}>{t().settings.title}</h1>
      <div class={styles.layout}>
        <SettingsNav variant="side" class={styles.side} />
        <div>{props.children}</div>
      </div>
    </div>
  );
}
