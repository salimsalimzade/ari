import { Button, TextField } from '@ari/ui-kit';
import { A } from '@solidjs/router';
import { createMemo, createSignal } from 'solid-js';
import * as v from 'valibot';
import type { Dictionary } from '~/i18n/en';
import { useI18n } from '~/i18n/i18n';
import styles from './auth.module.scss';
import { GoogleSignIn } from './google-sign-in';

// Built per language, so the messages follow the language picker.
function loginSchema(messages: Dictionary['auth']['errors']) {
  return v.object({
    email: v.pipe(
      v.string(),
      v.trim(),
      v.nonEmpty(messages.emailRequired),
      v.email(messages.emailInvalid),
    ),
    password: v.pipe(v.string(), v.nonEmpty(messages.passwordRequired)),
  });
}

type LoginSchema = ReturnType<typeof loginSchema>;
type LoginErrors = NonNullable<v.FlatErrors<LoginSchema>['nested']>;

export function LoginForm() {
  const { t } = useI18n();
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  // Errors show after the first submit, then follow what the user types.
  const [submitted, setSubmitted] = createSignal(false);
  const errors = createMemo((): LoginErrors => {
    if (!submitted()) return {};
    const values = { email: email(), password: password() };
    const result = v.safeParse(loginSchema(t().auth.errors), values, { abortPipeEarly: true });
    return result.success ? {} : (v.flatten<LoginSchema>(result.issues).nested ?? {});
  });
  const hasErrors = () => Object.keys(errors()).length > 0;

  let form!: HTMLFormElement;
  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (hasErrors()) form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    // Sending it to ari-api comes with F1's action.
  };

  return (
    <form ref={form} class={styles.form} data-width="narrow" novalidate onSubmit={submit}>
      <h1 class={styles.title}>{t().auth.login.title}</h1>
      <TextField
        label={t().auth.email}
        name="email"
        type="email"
        size="lg"
        fill="surface"
        placeholder={t().auth.emailPlaceholder}
        autocomplete="email"
        value={email()}
        onChange={setEmail}
        error={errors().email?.[0]}
      />
      <TextField
        label={t().auth.password}
        name="password"
        type="password"
        size="lg"
        fill="surface"
        placeholder={t().auth.login.passwordPlaceholder}
        autocomplete="current-password"
        labelAction={<a href="/forgot-password">{t().auth.login.forgotPassword}</a>}
        value={password()}
        onChange={setPassword}
        error={errors().password?.[0]}
      />
      <Button type="submit" variant="primary" size="lg" block class={styles.submit}>
        {t().auth.login.submit}
      </Button>
      <GoogleSignIn />
      <p class={styles.switch}>
        {t().auth.login.newToAri} <A href="/register">{t().auth.login.createAccount}</A>
      </p>
    </form>
  );
}
