import { Title } from '@solidjs/meta';
import type { JSX } from 'solid-js';
import { MobileHeader } from '~/features/shell/mobile-header';
import { useI18n } from '~/i18n/i18n';
import styles from './settings.module.scss';

/** One settings section: on phones it gets a "← Settings" header and its own title. */
export function SettingsPage(props: { title: string; pageTitle: string; children: JSX.Element }) {
  const { t } = useI18n();
  return (
    <>
      <Title>{props.pageTitle}</Title>
      <MobileHeader back={{ href: '/settings', label: t().settings.title }} />
      <h1 class={styles['mobile-title']}>{props.title}</h1>
      <div class={styles.sections}>{props.children}</div>
    </>
  );
}
