import { Button, Checkbox, TextField } from '@ari/ui-kit';
import { A } from '@solidjs/router';
import { createMemo, createSignal } from 'solid-js';
import * as v from 'valibot';
import type { Dictionary } from '~/i18n/en';
import { useI18n } from '~/i18n/i18n';
import styles from './auth.module.scss';
import { GoogleSignIn } from './google-sign-in';

// Built per language, so the messages follow the language picker.
function registerSchema(messages: Dictionary['auth']['errors']) {
  return v.object({
    name: v.pipe(v.string(), v.trim(), v.nonEmpty(messages.nameRequired)),
    username: v.pipe(v.string(), v.trim(), v.nonEmpty(messages.usernameRequired)),
    email: v.pipe(
      v.string(),
      v.trim(),
      v.nonEmpty(messages.emailRequired),
      v.email(messages.emailInvalid),
    ),
    // 72 bytes is the most bcrypt reads.
    password: v.pipe(
      v.string(),
      v.minLength(8, messages.passwordShort),
      v.maxBytes(72, messages.passwordLong),
    ),
    age: v.pipe(v.string(), v.trim(), v.regex(/^[1-9]\d*$/, messages.ageRequired)),
    terms: v.literal(true, messages.termsRequired),
  });
}

type RegisterSchema = ReturnType<typeof registerSchema>;
type RegisterErrors = NonNullable<v.FlatErrors<RegisterSchema>['nested']>;

export function RegisterForm() {
  const { t } = useI18n();
  const [name, setName] = createSignal('');
  const [username, setUsername] = createSignal('');
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [age, setAge] = createSignal('');
  const [agreed, setAgreed] = createSignal(false);
  // Errors show after the first submit, then follow what the user types.
  const [submitted, setSubmitted] = createSignal(false);
  const errors = createMemo((): RegisterErrors => {
    if (!submitted()) return {};
    const values = {
      name: name(),
      username: username(),
      email: email(),
      password: password(),
      age: age(),
      terms: agreed(),
    };
    const result = v.safeParse(registerSchema(t().auth.errors), values, { abortPipeEarly: true });
    return result.success ? {} : (v.flatten<RegisterSchema>(result.issues).nested ?? {});
  });
  const hasErrors = () => Object.keys(errors()).length > 0;

  let form!: HTMLFormElement;
  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (hasErrors()) form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    // Sending it to ari-api comes with F1's action. Username and age go only once ari-api's
    // RegisterRequest takes them.
  };

  return (
    <form ref={form} class={styles.form} novalidate onSubmit={submit}>
      <div class={styles.heading}>
        <h1 class={styles.title}>{t().auth.register.title}</h1>
      </div>
      <div class={styles.pair}>
        <TextField
          label={t().auth.register.name}
          name="displayName"
          size="lg"
          fill="surface"
          placeholder={t().auth.register.namePlaceholder}
          autocomplete="name"
          value={name()}
          onChange={setName}
          error={errors().name?.[0]}
        />
        <TextField
          label={t().auth.register.username}
          name="username"
          size="lg"
          fill="surface"
          placeholder={t().auth.register.usernamePlaceholder}
          autocomplete="username"
          value={username()}
          onChange={setUsername}
          error={errors().username?.[0]}
        />
      </div>
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
      <div class={styles.pair} data-end="narrow">
        <TextField
          label={t().auth.password}
          name="password"
          type="password"
          size="lg"
          fill="surface"
          placeholder={t().auth.register.passwordPlaceholder}
          autocomplete="new-password"
          description={t().auth.register.passwordHint}
          value={password()}
          onChange={setPassword}
          error={errors().password?.[0]}
        />
        <TextField
          label={t().auth.register.age}
          name="age"
          type="number"
          size="lg"
          fill="surface"
          class={styles.age}
          value={age()}
          onChange={setAge}
          error={errors().age?.[0]}
        />
      </div>
      <Checkbox name="terms" checked={agreed()} onChange={setAgreed} error={errors().terms?.[0]}>
        {t().auth.register.terms}
      </Checkbox>
      <Button type="submit" variant="primary" size="lg" block>
        {t().auth.register.submit}
      </Button>
      <GoogleSignIn />
      <p class={styles.switch}>
        {t().auth.register.haveAccount} <A href="/login">{t().auth.register.logIn}</A>
      </p>
    </form>
  );
}
