import { Alert, Button } from '@ari/ui-kit';
import { Title } from '@solidjs/meta';
import { createAsync, useAction, useSubmission } from '@solidjs/router';
import { ErrorBoundary, Show } from 'solid-js';
import { getMe, logoutAction } from '~/features/auth/queries';
import { MobileHeader } from '~/features/shell/mobile-header';
import { useI18n } from '~/i18n/i18n';
import styles from '~/styles/library.module.scss';

// Shows who is signed in, until F2 builds the library here.
export default function Library() {
  const { t } = useI18n();
  const me = createAsync(() => getMe(), { deferStream: true });
  const logOut = useAction(logoutAction);
  const loggingOut = useSubmission(logoutAction);

  return (
    <div class={styles.page}>
      <Title>{t().library.pageTitle}</Title>
      <MobileHeader />
      <main class={styles.content}>
        <h1 class={styles.title}>{t().library.title}</h1>
        <ErrorBoundary fallback={<Alert>{t().library.loadFailed}</Alert>}>
          <Show when={me()}>
            {(user) => (
              <p class={styles.account}>
                {t().library.signedIn} <strong>{user().fullName}</strong> · @{user().username}
              </p>
            )}
          </Show>
        </ErrorBoundary>
        <Button onClick={() => logOut()} disabled={loggingOut.pending}>
          {t().library.logOut}
        </Button>
      </main>
    </div>
  );
}
