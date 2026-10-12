import { A } from '@solidjs/router';
import { For } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import styles from './settings.module.scss';

const sections = [
  { href: '/settings/account', key: 'account' },
  { href: '/settings/billing', key: 'billing' },
  { href: '/settings/colors', key: 'colors' },
  { href: '/settings/shortcuts', key: 'shortcuts' },
  { href: '/settings/export', key: 'export' },
  { href: '/settings/apps', key: 'apps' },
] as const;

/** The settings sections in a column beside the open one (a row of pills on narrower screens). */
export function SettingsNav(props: { class?: string }) {
  const { t } = useI18n();
  return (
    <nav
      class={props.class ? `${styles.nav} ${props.class}` : styles.nav}
      aria-label={t().settings.sections}
    >
      <For each={sections}>
        {(section) => (
          <A href={section.href} class={styles.item} activeClass={styles.active}>
            {t().settings[section.key]}
          </A>
        )}
      </For>
    </nav>
  );
}
