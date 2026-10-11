import { Button } from '@ari/ui-kit';
import { createAsync, revalidate } from '@solidjs/router';
import { ErrorBoundary, Show, Suspense } from 'solid-js';
import { getMe } from '~/features/auth/queries';
import { useI18n } from '~/i18n/i18n';
import styles from './account.module.scss';
import { EmailSection } from './email-section';
import { AlertIcon, RetryIcon } from './icons';
import { ProfileForm } from './profile-form';
import { ProfilePhoto } from './profile-photo';

/** The Account section: photo, profile and email, with its loading and error states. */
export function AccountSettings() {
  const { t } = useI18n();
  const me = createAsync(() => getMe(), { deferStream: true });

  return (
    <ErrorBoundary
      fallback={(_, reset) => (
        <section class={styles.card} data-state="error">
          <span class={styles['state-icon']}>
            <AlertIcon />
          </span>
          <h2 class={styles['state-title']}>{t().account.loadFailed}</h2>
          <p class={styles['state-text']}>{t().account.loadFailedText}</p>
          <Button
            icon={<RetryIcon />}
            class={styles['state-retry']}
            onClick={async () => {
              await revalidate(getMe.key);
              reset();
            }}
          >
            {t().account.retry}
          </Button>
        </section>
      )}
    >
      <Suspense fallback={<AccountSkeleton />}>
        <Show when={me()}>
          {(user) => (
            <>
              <ProfilePhoto
                initial={(user().fullName ?? user().username ?? '?').charAt(0).toUpperCase()}
              />
              <ProfileForm user={user()} />
              <EmailSection />
            </>
          )}
        </Show>
      </Suspense>
    </ErrorBoundary>
  );
}

// The three cards' shapes while the account loads.
function AccountSkeleton() {
  return (
    <div class={styles.skeleton} aria-hidden="true">
      <div class={styles.card}>
        <span class={styles.bone} data-shape="heading" />
        <div class={styles.photo}>
          <span class={styles.bone} data-shape="avatar" />
          <div class={styles['photo-side']}>
            <span class={styles.bone} data-shape="button" />
            <span class={styles.bone} data-shape="line" />
          </div>
        </div>
      </div>
      <div class={styles.card}>
        <span class={styles.bone} data-shape="heading" />
        <div class={styles.fields}>
          <span class={styles.bone} data-shape="field" />
          <span class={styles.bone} data-shape="field" />
          <span class={styles.bone} data-shape="field" />
        </div>
        <span class={styles.bone} data-shape="button" />
      </div>
      <div class={styles.card}>
        <span class={styles.bone} data-shape="heading" />
        <span class={styles.bone} data-shape="line" />
        <span class={styles.bone} data-shape="input" />
      </div>
    </div>
  );
}
