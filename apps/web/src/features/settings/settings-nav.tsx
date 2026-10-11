import { A } from '@solidjs/router';
import { For } from 'solid-js';
import { ChevronRightIcon } from '~/features/shell/icons';
import { useI18n } from '~/i18n/i18n';
import styles from './settings.module.scss';

const sections = [
  { href: '/settings/account', key: 'account' },
  { href: '/settings/billing', key: 'billing' },
  { href: '/settings/shortcuts', key: 'shortcuts' },
  { href: '/settings/export', key: 'export' },
] as const;

/**
 * The settings sections: the column beside a section on wide screens (`variant="side"`), or the
 * list on /settings itself (`variant="list"`).
 */
export function SettingsNav(props: { variant: 'side' | 'list'; class?: string }) {
  const { t } = useI18n();
  return (
    <nav
      class={props.class ? `${styles.nav} ${props.class}` : styles.nav}
      data-variant={props.variant}
      aria-label={t().settings.sections}
    >
      <For each={sections}>
        {(section) => (
          <A href={section.href} class={styles.item} activeClass={styles.active}>
            <span>{t().settings[section.key]}</span>
            {props.variant === 'list' && <ChevronRightIcon />}
          </A>
        )}
      </For>
    </nav>
  );
}
