import { ApiError } from '@ari/data-access';
import { Alert, Button, TextField } from '@ari/ui-kit';
import { A, useAction } from '@solidjs/router';
import { createForm, revalidateLogic } from '@tanstack/solid-form';
import { createSignal, Show } from 'solid-js';
import * as v from 'valibot';
import type { Dictionary } from '~/i18n/en';
import { useI18n } from '~/i18n/i18n';
import styles from './auth.module.scss';
import { loginAction } from './queries';

type ErrorKey = keyof Dictionary['auth']['errors'];

// Messages are keys of t().auth.errors, so a shown error follows the language picker.
const loginSchema = v.object({
  username: v.pipe(v.string(), v.trim(), v.nonEmpty('usernameRequired' satisfies ErrorKey)),
  password: v.pipe(v.string(), v.nonEmpty('passwordRequired' satisfies ErrorKey)),
});

export type LoginFormProps = {
  /** Fills in the username until the user types, e.g. after a password reset. */
  username?: string;
};

export function LoginForm(props: LoginFormProps) {
  const { t } = useI18n();
  const logIn = useAction(loginAction);
  // Why signing in failed: the request's error.
  const [failure, setFailure] = createSignal<unknown>();
  // ari-api's own message; ours only when there is none (an unreachable API).
  const failureMessage = () => {
    const error = failure();
    if (error instanceof ApiError && error.problem.detail) return error.problem.detail;
    const offline = error instanceof ApiError && error.status === 0;
    return t().auth.errors[offline ? 'networkError' : 'requestFailed'];
  };
  // Ours, with a link to reset the password, instead of ari-api's message.
  const wrongCredentials = () => {
    const error = failure();
    return error instanceof ApiError && error.code === 'INVALID_CREDENTIALS';
  };
  let formElement!: HTMLFormElement;
  const form = createForm(() => ({
    // A changed default fills an untouched form in.
    defaultValues: { username: props.username ?? '', password: '' },
    // Errors show after the first submit, then follow what the user types.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: loginSchema },
    onSubmitInvalid: () => formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    onSubmit: async ({ value }) => {
      setFailure(undefined);
      try {
        await logIn(v.parse(loginSchema, value));
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
      <h1 class={styles.title}>{t().auth.login.title}</h1>
      <Show when={failure()}>
        <Alert>
          <Show when={wrongCredentials()} fallback={failureMessage()}>
            {t().auth.login.wrongCredentials.before}
            <A href="/forgot-password">{t().auth.login.wrongCredentials.link}</A>
            {t().auth.login.wrongCredentials.after}
          </Show>
        </Alert>
      </Show>
      <form.Field name="username">
        {(field) => (
          <TextField
            label={t().auth.username}
            name="username"
            size="lg"
            fill="surface"
            autocomplete="username"
            value={field().state.value}
            onChange={field().handleChange}
            error={error(field().state.meta.errors)}
          />
        )}
      </form.Field>
      <form.Field name="password">
        {(field) => (
          <TextField
            label={t().auth.password}
            name="password"
            type="password"
            size="lg"
            fill="surface"
            autocomplete="current-password"
            labelAction={<a href="/forgot-password">{t().auth.login.forgotPassword}</a>}
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
        {submitting() ? t().auth.login.submitting : t().auth.login.submit}
      </Button>
      <p class={styles.switch}>
        {t().auth.login.newToAri} <A href="/register">{t().auth.login.createAccount}</A>
      </p>
    </form>
  );
}
