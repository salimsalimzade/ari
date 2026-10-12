import { Button } from '@ari/ui-kit';
import { A, useAction, useSubmission } from '@solidjs/router';
import { For } from 'solid-js';
import { logoutAction } from '~/features/auth/queries';
import { useI18n } from '~/i18n/i18n';
import { LogOutIcon } from './icons';
import styles from './settings.module.scss';

const sections = [
  { href: '/settings/account', key: 'account' },
  { href: '/settings/billing', key: 'billing' },
  { href: '/settings/shortcuts', key: 'shortcuts' },
  { href: '/settings/export', key: 'export' },
  { href: '/settings/apps', key: 'apps' },
] as const;

/**
 * The settings sections in a column beside the open one, with Log out under them; narrower screens
 * show the sections as rows of pills, and Log out on /settings.
 */
export function SettingsNav(props: { class?: string }) {
  const { t } = useI18n();
  const logOut = useAction(logoutAction);
  const loggingOut = useSubmission(logoutAction);
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
      <Button
        variant="ghost"
        icon={<LogOutIcon />}
        class={styles['nav-log-out']}
        disabled={loggingOut.pending}
        onClick={() => logOut()}
      >
        {t().settings.logOut}
      </Button>
    </nav>
  );
}
