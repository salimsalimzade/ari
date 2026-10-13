import { ApiError } from '@ari/data-access';
import { Button } from '@ari/ui-kit';
import { useAction, useSearchParams } from '@solidjs/router';
import { createSignal, onMount, Show } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import styles from './auth.module.scss';
import { verifyEmailAction } from './queries';

type Outcome =
  | 'checking'
  | 'done'
  | 'expired'
  | 'taken'
  | 'missing'
  | 'networkError'
  | 'requestFailed';

const outcomeOf = (error: unknown): Outcome => {
  if (error instanceof ApiError) {
    if (error.code === 'INVALID_CODE') return 'expired';
    if (error.code === 'EMAIL_TAKEN') return 'taken';
    if (error.code === 'VALIDATION_FAILED') return 'missing';
    if (error.status === 0) return 'networkError';
  }
  return 'requestFailed';
};

/**
 * Confirms the email whose verify link was opened (`?code=`). It runs in the browser only, so a
 * mail scanner that fetches the link's HTML never uses up the single-use code.
 */
export function VerifyEmail() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const verify = useAction(verifyEmailAction);
  const [outcome, setOutcome] = createSignal<Outcome>('checking');

  const confirm = async () => {
    const code = typeof params.code === 'string' ? params.code.trim() : '';
    if (!code) {
      setOutcome('missing');
      return;
    }
    setOutcome('checking');
    try {
      await verify(code);
      setOutcome('done');
    } catch (error) {
      setOutcome(outcomeOf(error));
    }
  };
  onMount(confirm);

  const view = () => {
    const texts = t().verifyEmail;
    const result = outcome();
    switch (result) {
      case 'checking':
        return { title: texts.checking };
      case 'done':
        return { title: texts.doneTitle, text: texts.doneText };
      case 'expired':
        return { title: texts.expiredTitle, text: texts.expiredText };
      case 'taken':
        return { title: texts.takenTitle, text: texts.takenText };
      case 'missing':
        return { title: texts.missingTitle, text: texts.missingText };
      default:
        return { title: texts.failedTitle, text: t().auth.errors[result], retry: true };
    }
  };

  return (
    <div class={styles.form} data-width="narrow" aria-live="polite">
      <div class={styles.heading}>
        <h1 class={styles.title}>{view().title}</h1>
        <Show when={view().text}>{(text) => <p class={styles.text}>{text()}</p>}</Show>
      </div>
      <Show when={outcome() !== 'checking'}>
        <Show when={view().retry}>
          <Button variant="primary" size="lg" block onClick={confirm}>
            {t().verifyEmail.retry}
          </Button>
        </Show>
        <Button
          href="/settings/account"
          variant={view().retry ? 'secondary' : 'primary'}
          size="lg"
          block
        >
          {t().verifyEmail.toSettings}
        </Button>
      </Show>
    </div>
  );
}
