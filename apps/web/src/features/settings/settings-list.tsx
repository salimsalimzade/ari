import type { MeResponse } from '@ari/types';
import { Avatar, Button } from '@ari/ui-kit';
import { A, createAsync, useAction, useSubmission } from '@solidjs/router';
import { ErrorBoundary, For, type JSX, Show, Suspense } from 'solid-js';
import { getMe, logoutAction } from '~/features/auth/queries';
import { ChevronRightIcon } from '~/features/shell/icons';
import { useI18n } from '~/i18n/i18n';
import { fill } from './format';
import { useDefaultColorName } from './highlight-colors';
import { CardIcon, DownloadIcon, KeyboardIcon, LinkIcon, LogOutIcon, PaletteIcon } from './icons';
import { usePlanSummary } from './plan-billing';
import styles from './settings.module.scss';

/**
 * /settings on phones (and up to 1024px): the account, then each section with a line about it,
 * then Log out.
 */
export function SettingsList() {
  const { t } = useI18n();
  const me = createAsync(() => getMe(), { deferStream: true });
  const planSummary = usePlanSummary();
  const defaultColor = useDefaultColorName();
  const logOut = useAction(logoutAction);
  const loggingOut = useSubmission(logoutAction);

  const items: {
    href: string;
    key: 'billing' | 'colors' | 'shortcuts' | 'export' | 'apps';
    icon: () => JSX.Element;
    summary: () => string;
  }[] = [
    { href: '/settings/billing', key: 'billing', icon: CardIcon, summary: planSummary },
    {
      href: '/settings/colors',
      key: 'colors',
      icon: PaletteIcon,
      summary: () => fill(t().colors.summary, { name: defaultColor() }),
    },
    {
      href: '/settings/shortcuts',
      key: 'shortcuts',
      icon: KeyboardIcon,
      summary: () => t().shortcuts.summary,
    },
    {
      href: '/settings/export',
      key: 'export',
      icon: DownloadIcon,
      summary: () => t().exportData.summary,
    },
    { href: '/settings/apps', key: 'apps', icon: LinkIcon, summary: () => t().apps.summary },
  ];

  return (
    <div class={styles.list}>
      <ErrorBoundary fallback={<AccountLink />}>
        <Suspense fallback={<AccountLink />}>
          <AccountLink user={me()} />
        </Suspense>
      </ErrorBoundary>
      <nav class={styles.items} aria-label={t().settings.sections}>
        <For each={items}>
          {(item) => (
            <A href={item.href} class={styles['list-item']}>
              <span class={styles['list-icon']}>{item.icon()}</span>
              <span class={styles['list-text']}>
                <span class={styles['list-label']}>{t().settings[item.key]}</span>
                <span class={styles['list-summary']}>{item.summary()}</span>
              </span>
              <ChevronRightIcon />
            </A>
          )}
        </For>
      </nav>
      <Button
        variant="ghost"
        icon={<LogOutIcon />}
        class={styles['log-out']}
        disabled={loggingOut.pending}
        onClick={() => logOut()}
      >
        {t().settings.logOut}
      </Button>
    </div>
  );
}

// The signed-in person, leading to Account; just "Account" while they load or if they don't.
function AccountLink(props: { user?: MeResponse }) {
  const { t } = useI18n();
  const name = () => props.user?.fullName ?? props.user?.username;
  return (
    <A href="/settings/account" class={styles.account}>
      <Avatar initial={(name() ?? '?').charAt(0).toUpperCase()} size="md" />
      <span class={styles['list-text']}>
        <span class={styles['account-name']}>{name()?.split(' ')[0] ?? t().settings.account}</span>
        <Show when={props.user?.username}>
          {(username) => (
            <span class={styles['list-summary']}>
              {fill(t().settings.accountSummary, { username: username() })}
            </span>
          )}
        </Show>
      </span>
      <ChevronRightIcon />
    </A>
  );
}
