import { ApiError } from '@ari/data-access';
import { Alert, Button, Checkbox, DatePicker, dateFormat, TextField } from '@ari/ui-kit';
import { A, useAction } from '@solidjs/router';
import { createForm, revalidateLogic } from '@tanstack/solid-form';
import { format, parse } from 'date-fns';
import { createSignal, Show } from 'solid-js';
import * as v from 'valibot';
import type { Dictionary } from '~/i18n/en';
import { useI18n } from '~/i18n/i18n';
import styles from './auth.module.scss';
import { registerAction } from './queries';

type ErrorKey = keyof Dictionary['auth']['errors'];

// Messages are keys of t().auth.errors, so a shown error follows the language picker.
const registerSchema = v.object({
  fullName: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('nameRequired' satisfies ErrorKey),
    v.maxLength(150, 'nameLong' satisfies ErrorKey),
  ),
  // The same rule as ari-api's.
  username: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('usernameRequired' satisfies ErrorKey),
    v.regex(/^[A-Za-z0-9_.]{3,30}$/, 'usernameInvalid' satisfies ErrorKey),
  ),
  // 72 bytes is the most bcrypt reads.
  password: v.pipe(
    v.string(),
    v.minLength(8, 'passwordShort' satisfies ErrorKey),
    v.maxBytes(72, 'passwordLong' satisfies ErrorKey),
  ),
  birthDate: v.pipe(v.string(), v.nonEmpty('birthDateRequired' satisfies ErrorKey)),
  terms: v.literal(true, 'termsRequired' satisfies ErrorKey),
});

export function RegisterForm() {
  const { t, dateLocale } = useI18n();
  const signUp = useAction(registerAction);
  // Why signing up failed: the request's error.
  const [failure, setFailure] = createSignal<unknown>();
  // ari-api's own message; ours only when there is none (an unreachable API).
  const failureMessage = () => {
    const error = failure();
    if (error instanceof ApiError && error.problem.detail) return error.problem.detail;
    const offline = error instanceof ApiError && error.status === 0;
    return t().auth.errors[offline ? 'networkError' : 'requestFailed'];
  };
  let formElement!: HTMLFormElement;
  const RegisterForm = createForm(() => ({
    defaultValues: {
      fullName: '',
      username: '',
      password: '',
      birthDate: '',
      terms: false,
    },
    // Errors show after the first submit, then follow what the user types.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: registerSchema },
    onSubmitInvalid: () => formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    onSubmit: async ({ value }) => {
      setFailure(undefined);
      const { fullName, username, password, birthDate } = v.parse(registerSchema, value);
      try {
        await signUp({
          fullName,
          username,
          password,
          // ari-api takes an ISO date.
          birthDate: format(parse(birthDate, dateFormat, new Date()), 'yyyy-MM-dd'),
        });
      } catch (error) {
        setFailure(error);
      }
    },
  }));
  const submitting = RegisterForm.useStore((state) => state.isSubmitting);
  // A field's first error, in the current language.
  const error = (errors: ({ message: string } | undefined)[]) => {
    const key = errors[0]?.message as ErrorKey | undefined;
    return key && t().auth.errors[key];
  };

  return (
    <form
      ref={formElement}
      class={styles.form}
      novalidate
      onSubmit={(event) => {
        event.preventDefault();
        RegisterForm.handleSubmit();
      }}
    >
      <div class={styles.heading}>
        <h1 class={styles.title}>{t().auth.register.title}</h1>
      </div>
      <Show when={failure()}>
        <Alert>{failureMessage()}</Alert>
      </Show>
      <div class={styles.pair}>
        <RegisterForm.Field name="fullName">
          {(field) => (
            <TextField
              label={t().auth.register.name}
              name="fullName"
              size="lg"
              fill="surface"
              autocomplete="name"
              value={field().state.value}
              onChange={field().handleChange}
              error={error(field().state.meta.errors)}
            />
          )}
        </RegisterForm.Field>
        <RegisterForm.Field name="username">
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
        </RegisterForm.Field>
      </div>
      <div class={styles.pair}>
        <RegisterForm.Field name="password">
          {(field) => (
            <TextField
              label={t().auth.password}
              name="password"
              type="password"
              size="lg"
              fill="surface"
              autocomplete="new-password"
              value={field().state.value}
              onChange={field().handleChange}
              error={error(field().state.meta.errors)}
            />
          )}
        </RegisterForm.Field>
        <RegisterForm.Field name="birthDate">
          {(field) => (
            <DatePicker
              label={t().auth.register.birthDate}
              name="birthDate"
              size="lg"
              fill="surface"
              locale={dateLocale()}
              labels={t().datePicker}
              placeholder="DD.MM.YYYY"
              max={format(new Date(), dateFormat)}
              value={field().state.value}
              onChange={field().handleChange}
              error={error(field().state.meta.errors)}
            />
          )}
        </RegisterForm.Field>
      </div>
      <RegisterForm.Field name="terms">
        {(field) => (
          <Checkbox
            name="terms"
            checked={field().state.value}
            onChange={field().handleChange}
            error={error(field().state.meta.errors)}
          >
            {t().auth.register.terms}
          </Checkbox>
        )}
      </RegisterForm.Field>
      <Button type="submit" variant="primary" size="lg" block disabled={submitting()}>
        {submitting() ? t().auth.register.submitting : t().auth.register.submit}
      </Button>
      <p class={styles.switch}>
        {t().auth.register.haveAccount} <A href="/login">{t().auth.register.logIn}</A>
      </p>
    </form>
  );
}
