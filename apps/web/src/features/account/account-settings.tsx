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
  const me = createAsync(() => getMe(), { deferStream: true });

  return (
    <ErrorBoundary
      fallback={(_, reset) => (
        <LoadFailed
          onRetry={async () => {
            await revalidate(getMe.key);
            reset();
          }}
        />
      )}
    >
      <Suspense fallback={<AccountSkeleton />}>
        <Show
          when={me()}
          // ari-api couldn't be reached.
          fallback={<LoadFailed onRetry={() => revalidate(getMe.key)} />}
        >
          {(user) => (
            <>
              <ProfilePhoto
                initial={(user().fullName ?? user().username ?? '?').charAt(0).toUpperCase()}
                photoUrl={user().photoUrl}
              />
              <ProfileForm user={user()} />
              <EmailSection user={user()} />
            </>
          )}
        </Show>
      </Suspense>
    </ErrorBoundary>
  );
}

// The account didn't load: ari-api couldn't be reached, or answered with an error.
function LoadFailed(props: { onRetry: () => Promise<unknown> }) {
  const { t } = useI18n();
  return (
    <section class={styles.card} data-state="error" role="alert">
      <span class={styles['state-icon']}>
        <AlertIcon />
      </span>
      <h2 class={styles['state-title']}>{t().account.loadFailed}</h2>
      <p class={styles['state-text']}>{t().account.loadFailedText}</p>
      <Button
        icon={<RetryIcon />}
        class={styles['state-retry']}
        onClick={() => void props.onRetry()}
      >
        {t().account.retry}
      </Button>
    </section>
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
