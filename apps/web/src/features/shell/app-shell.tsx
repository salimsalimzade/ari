import { Avatar, Logo } from '@ari/ui-kit';
import { A, createAsync, useLocation } from '@solidjs/router';
import { ErrorBoundary, type JSX, Show, Suspense } from 'solid-js';
import { useExtensionSignIn } from '~/features/auth/extension-sign-in';
import { getMe } from '~/features/auth/queries';
import { CommandPalette } from '~/features/library/command-palette';
import { GlobeIcon, UploadIcon } from '~/features/library/icons';
import { useLibrary } from '~/features/library/library-store';
import { LibraryToast } from '~/features/library/library-toast';
import { useNotes } from '~/features/notes/notes-store';
import { useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { LanguageSelect } from '~/i18n/language-select';
import styles from './app-shell.module.scss';
import { ConnectionBanner } from './connection-banner';
import { LibraryIcon, NotesIcon, SettingsIcon } from './icons';

/**
 * The signed-in pages' frame: a sidebar on wide screens, a tab bar at the bottom on phones (without
 * Imports, which phones reach through the Library's import pill and the search palette). Each page
 * puts its own phone header (MobileHeader) at the top of its content.
 */
export function AppShell(props: { children: JSX.Element }) {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  const notes = useNotes();
  const location = useLocation();
  const ready = () => library.files.filter((file) => file.status === 'ready').length;
  // The sidebar opens the newest note; any note page counts as Notes.
  const notesHref = () => {
    const newest = notes.list()[0];
    return newest ? `/notes/${newest.id}` : '/notes';
  };
  const inNotes = () => location.pathname.startsWith('/notes');
  // Every settings page, though the link opens Account.
  const inSettings = () => location.pathname.startsWith('/settings');

  return (
    <div class={styles.shell}>
      <aside class={styles.sidebar}>
        <A href="/library" class={styles.brand} aria-label="Ari">
          <Logo wordmark="lg" />
        </A>
        <nav class={styles.nav} aria-label={t().nav.label}>
          <A href="/library" class={styles.link} activeClass={styles.active} end={false}>
            <LibraryIcon />
            <span class={styles['link-label']}>{t().nav.library}</span>
            <span class={styles['link-count']}>{format.number(library.total())}</span>
          </A>
          <A
            href={notesHref()}
            class={styles.link}
            classList={{ [styles.active]: inNotes() }}
            activeClass=""
          >
            <NotesIcon />
            <span class={styles['link-label']}>{t().nav.notes}</span>
            <span class={styles['link-count']}>{format.number(notes.list().length)}</span>
          </A>
          <A href="/sources" class={styles.link} activeClass={styles.active} end={false}>
            <GlobeIcon />
            <span class={styles['link-label']}>{t().nav.sources}</span>
            <span class={styles['link-count']}>
              {format.number(library.facetOptions('sources').length)}
            </span>
          </A>
          <A href="/imports" class={styles.link} activeClass={styles.active} end={false}>
            <UploadIcon />
            <span class={styles['link-label']}>{t().nav.imports}</span>
            <Show when={ready()}>
              <span class={styles.badge}>{ready()}</span>
            </Show>
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
      <main class={styles.main}>
        <Suspense>
          <ConnectionBanner />
        </Suspense>
        {props.children}
      </main>
      <nav class={styles.tabs} aria-label={t().nav.label}>
        <A href="/library" class={styles.tab} activeClass={styles.active} end={false}>
          <span class={styles['tab-icon']}>
            <LibraryIcon />
          </span>
          {t().nav.library}
        </A>
        <A href="/notes" class={styles.tab} activeClass={styles.active} end={false}>
          <span class={styles['tab-icon']}>
            <NotesIcon />
          </span>
          {t().nav.notes}
        </A>
        <A href="/sources" class={styles.tab} activeClass={styles.active} end={false}>
          <span class={styles['tab-icon']}>
            <GlobeIcon />
          </span>
          {t().nav.sources}
        </A>
        <A href="/settings" class={styles.tab} activeClass={styles.active} end={false}>
          <span class={styles['tab-icon']}>
            <SettingsIcon />
          </span>
          {t().nav.settings}
        </A>
      </nav>
      <CommandPalette />
      <LibraryToast />
    </div>
  );
}

// Who is signed in, at the bottom of the sidebar. It also signs the Ari extension in as them.
function UserChip() {
  const { t } = useI18n();
  const me = createAsync(() => getMe());
  useExtensionSignIn(() => {
    const user = me();
    return user?.id
      ? { id: user.id, username: user.username, fullName: user.fullName, email: user.email }
      : undefined;
  });
  return (
    <Show when={me()}>
      {(user) => (
        <div class={styles.user}>
          <Avatar
            initial={(user().fullName ?? user().username ?? '?').charAt(0).toUpperCase()}
            src={user().photoUrl}
          />
          <div class={styles['user-text']}>
            <span class={styles['user-name']}>{user().fullName?.split(' ')[0]}</span>
            <span class={styles['user-plan']}>{t().nav.plan[user().plan ?? 'NONE']}</span>
          </div>
        </div>
      )}
    </Show>
  );
}
