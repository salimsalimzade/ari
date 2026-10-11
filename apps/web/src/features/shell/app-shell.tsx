import { Avatar, Logo } from '@ari/ui-kit';
import { A, createAsync, useLocation } from '@solidjs/router';
import { ErrorBoundary, type JSX, Show, Suspense } from 'solid-js';
import { getMe } from '~/features/auth/queries';
import { useI18n } from '~/i18n/i18n';
import { LanguageSelect } from '~/i18n/language-select';
import styles from './app-shell.module.scss';
import { LibraryIcon, SettingsIcon } from './icons';

/**
 * The signed-in pages' frame: a sidebar on wide screens, a tab bar at the bottom on phones. Each
 * page puts its own phone header (MobileHeader) at the top of its content.
 */
export function AppShell(props: { children: JSX.Element }) {
  const { t } = useI18n();
  const location = useLocation();
  // Every settings page, though the link opens Account.
  const inSettings = () => location.pathname.startsWith('/settings');

  return (
    <div class={styles.shell}>
      <aside class={styles.sidebar}>
        <A href="/library" class={styles.brand} aria-label="Ari">
          <Logo wordmark="lg" />
        </A>
        <nav class={styles.nav} aria-label={t().nav.label}>
          <A href="/library" class={styles.link} activeClass={styles.active}>
            <LibraryIcon />
            {t().nav.library}
          </A>
        </nav>
        <div class={styles.bottom}>
          <LanguageSelect block class={styles.language} />
          <A
            href="/settings/account"
            class={styles.link}
            classList={{ [styles.active]: inSettings() }}
            activeClass=""
          >
            <SettingsIcon />
            {t().nav.settings}
          </A>
          <ErrorBoundary fallback={null}>
            <Suspense>
              <UserChip />
            </Suspense>
          </ErrorBoundary>
        </div>
      </aside>
      <main class={styles.main}>{props.children}</main>
      <nav class={styles.tabs} aria-label={t().nav.label}>
        <A href="/library" class={styles.tab} activeClass={styles.active}>
          <span class={styles['tab-icon']}>
            <LibraryIcon />
          </span>
          {t().nav.library}
        </A>
        <A href="/settings" class={styles.tab} activeClass={styles.active} end={false}>
          <span class={styles['tab-icon']}>
            <SettingsIcon />
          </span>
          {t().nav.settings}
        </A>
      </nav>
    </div>
  );
}

// Who is signed in, at the bottom of the sidebar.
function UserChip() {
  const { t } = useI18n();
  const me = createAsync(() => getMe());
  return (
    <Show when={me()}>
      {(user) => (
        <div class={styles.user}>
          <Avatar initial={(user().fullName ?? user().username ?? '?').charAt(0).toUpperCase()} />
          <div class={styles['user-text']}>
            <span class={styles['user-name']}>{user().fullName?.split(' ')[0]}</span>
            <span class={styles['user-plan']}>{t().nav.plan[user().plan ?? 'FREE']}</span>
          </div>
        </div>
      )}
    </Show>
  );
}
