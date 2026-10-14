import { ApiError } from '@ari/data-access';
import { Alert, Button, TextField } from '@ari/ui-kit';
import { A, useAction, useSearchParams } from '@solidjs/router';
import { createForm, revalidateLogic } from '@tanstack/solid-form';
import { createSignal, onCleanup, Show } from 'solid-js';
import * as v from 'valibot';
import type { Dictionary } from '~/i18n/en';
import { useI18n } from '~/i18n/i18n';
import styles from './auth.module.scss';
import { AuthToast } from './auth-toast';
import { ArrowLeftIcon } from './icons';
import { requestPasswordResetAction } from './queries';

type ErrorKey = keyof Dictionary['auth']['errors'];

// Messages are keys of t().auth.errors, so a shown error follows the language picker.
const forgotSchema = v.object({
  login: v.pipe(v.string(), v.trim(), v.nonEmpty('loginRequired' satisfies ErrorKey)),
});

/**
 * Asks for a reset link by username or email. It says when no account matches (with the way to
 * create one), and when the account has no confirmed email to send the link to. `?login=` fills
 * the field in (the extension's Forgot password? sends the username).
 */
export function ForgotPasswordForm() {
  const { t } = useI18n();
  const [params] = useSearchParams<{ login?: string }>();
  const send = useAction(requestPasswordResetAction);
  // Why sending failed: the request's error.
  const [failure, setFailure] = createSignal<unknown>();
  const failureMessage = () => {
    const error = failure();
    if (error instanceof ApiError && error.code === 'RATE_LIMITED') {
      return t().auth.forgot.rateLimited;
    }
    if (error instanceof ApiError && error.code === 'NO_EMAIL') return t().auth.forgot.noEmail;
    if (error instanceof ApiError && error.code === 'EMAIL_NOT_CONFIRMED') {
      return t().auth.forgot.notConfirmed;
    }
    if (error instanceof ApiError && error.problem.detail) return error.problem.detail;
    const offline = error instanceof ApiError && error.status === 0;
    return t().auth.errors[offline ? 'networkError' : 'requestFailed'];
  };
  // No account has the username or email: ours, with a link to create one.
  const noAccount = () => {
    const error = failure();
    return error instanceof ApiError && error.code === 'ACCOUNT_NOT_FOUND';
  };
  const [sent, setSent] = createSignal(false);
  let sentTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(sentTimer));

  let formElement!: HTMLFormElement;
  const form = createForm(() => ({
    defaultValues: { login: params.login ?? '' },
    // Errors show after the first submit, then follow what the user types.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: forgotSchema },
    onSubmitInvalid: () => formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    onSubmit: async ({ value }) => {
      setFailure(undefined);
      try {
        await send(v.parse(forgotSchema, value).login);
        clearTimeout(sentTimer);
        setSent(true);
        sentTimer = setTimeout(() => setSent(false), 9000);
      } catch (error) {
        setFailure(error);
      }
    },
  }));
  const submitting = form.useStore((state) => state.isSubmitting);
  // A field's first error, in the current language.
  const error = (errors: ({ message: string } | undefined)[]) => {
    const key = errors[0]?.message as ErrorKey | undefined;
    return key && t().auth.errors[key];
  };

  return (
    <form
      ref={formElement}
      class={styles.form}
      data-width="narrow"
      novalidate
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <A href="/login" class={styles.link}>
        <ArrowLeftIcon />
        {t().auth.forgot.back}
      </A>
      <div class={styles.heading}>
        <h1 class={styles.title}>{t().auth.forgot.title}</h1>
        <p class={styles.text}>{t().auth.forgot.intro}</p>
      </div>
      <Show when={failure()}>
        <Alert>
          <Show when={noAccount()} fallback={failureMessage()}>
            {t().auth.forgot.noAccount.before}
            <A href="/register">{t().auth.forgot.noAccount.link}</A>
            {t().auth.forgot.noAccount.after}
          </Show>
        </Alert>
      </Show>
      <form.Field name="login">
        {(field) => (
          <TextField
            label={t().auth.forgot.login}
            name="login"
            size="lg"
            fill="surface"
            autocomplete="username"
            value={field().state.value}
            onChange={field().handleChange}
            error={error(field().state.meta.errors)}
          />
        )}
      </form.Field>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        block
        class={styles.submit}
        disabled={submitting()}
      >
        {submitting() ? t().auth.forgot.submitting : t().auth.forgot.submit}
      </Button>
      <AuthToast text={sent() ? t().auth.forgot.sent : undefined} />
    </form>
  );
}
