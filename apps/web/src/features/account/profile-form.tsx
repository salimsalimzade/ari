import { ApiError } from '@ari/data-access';
import type { MeResponse } from '@ari/types';
import { Alert, Button, DatePicker, dateFormat, TextField } from '@ari/ui-kit';
import { useAction } from '@solidjs/router';
import { createForm, revalidateLogic } from '@tanstack/solid-form';
import { format, parse, parseISO } from 'date-fns';
import { createSignal, Show } from 'solid-js';
import * as v from 'valibot';
import { createUsernameCheck } from '~/features/auth/username-check';
import type { Dictionary } from '~/i18n/en';
import { useI18n } from '~/i18n/i18n';
import styles from './account.module.scss';
import { updateProfileAction } from './queries';

type ErrorKey = keyof Dictionary['auth']['errors'];

// The same rules as sign-up; messages are keys of t().auth.errors.
const profileSchema = v.object({
  fullName: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('nameRequired' satisfies ErrorKey),
    v.maxLength(150, 'nameLong' satisfies ErrorKey),
  ),
  username: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('usernameRequired' satisfies ErrorKey),
    v.regex(/^[A-Za-z0-9_.]{3,30}$/, 'usernameInvalid' satisfies ErrorKey),
  ),
  birthDate: v.pipe(v.string(), v.nonEmpty('birthDateRequired' satisfies ErrorKey)),
});

/** Why saving failed: a taken username shows on its field, the rest above the form. */
type Failure = 'usernameTaken' | 'networkError' | 'requestFailed';

const failureOf = (error: unknown): Failure => {
  if (error instanceof ApiError) {
    if (error.code === 'USERNAME_TAKEN') return 'usernameTaken';
    if (error.status === 0) return 'networkError';
  }
  return 'requestFailed';
};

/** Full name, username and date of birth, saved through ari-api. */
export function ProfileForm(props: { user: MeResponse }) {
  const { t, dateLocale } = useI18n();
  const save = useAction(updateProfileAction);
  const [failure, setFailure] = createSignal<Failure>();
  // The username the API turned down, until it is changed.
  const [takenUsername, setTakenUsername] = createSignal<string>();
  const [saved, setSaved] = createSignal(false);
  let formElement!: HTMLFormElement;
  const form = createForm(() => ({
    defaultValues: {
      fullName: props.user.fullName ?? '',
      username: props.user.username ?? '',
      // ari-api sends an ISO date; the picker shows dd.MM.yyyy.
      birthDate: props.user.birthDate ? format(parseISO(props.user.birthDate), dateFormat) : '',
    },
    // Errors show after the first submit, then follow what the user types.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: profileSchema },
    onSubmitInvalid: () => formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    onSubmit: async ({ value }) => {
      setFailure(undefined);
      setSaved(false);
      const { fullName, username, birthDate } = v.parse(profileSchema, value);
      try {
        await save({
          fullName,
          username,
          birthDate: format(parse(birthDate, dateFormat, new Date()), 'yyyy-MM-dd'),
        });
        setSaved(true);
      } catch (error) {
        const reason = failureOf(error);
        setFailure(reason);
        if (reason === 'usernameTaken') setTakenUsername(username.toLowerCase());
      }
    },
  }));
  const submitting = form.useStore((state) => state.isSubmitting);
  // The user's own username needs no check.
  const usernameTaken = createUsernameCheck(
    form.useStore((state) => state.values.username),
    () => props.user.username,
  );
  const error = (errors: ({ message: string } | undefined)[]) => {
    const key = errors[0]?.message as ErrorKey | undefined;
    return key && t().auth.errors[key];
  };
  // ari-api's "taken" shows on the field while it still holds that username.
  const usernameError = (value: string, errors: ({ message: string } | undefined)[]) =>
    error(errors) ??
    (takenUsername() === value.trim().toLowerCase() || usernameTaken()
      ? t().auth.usernameTaken
      : undefined);

  return (
    <section class={styles.card}>
      <h2 class={styles.heading}>{t().account.profile.title}</h2>
      <Show when={failure() === 'networkError' || failure() === 'requestFailed'}>
        <Alert>
          {t().auth.errors[failure() === 'networkError' ? 'networkError' : 'requestFailed']}
        </Alert>
      </Show>
      <form
        ref={formElement}
        class={styles.profile}
        novalidate
        onSubmit={(event) => {
          event.preventDefault();
          form.handleSubmit();
        }}
      >
        <div class={styles.fields}>
          <form.Field name="fullName">
            {(field) => (
              <TextField
                label={t().account.profile.fullName}
                name="fullName"
                size="lg"
                autocomplete="name"
                value={field().state.value}
                onChange={field().handleChange}
                error={error(field().state.meta.errors)}
              />
            )}
          </form.Field>
          <form.Field name="username">
            {(field) => (
              <TextField
                label={t().account.profile.username}
                name="username"
                size="lg"
                prefix="@"
                autocomplete="username"
                value={field().state.value}
                onChange={(value) => {
                  setSaved(false);
                  field().handleChange(value);
                }}
                error={usernameError(field().state.value, field().state.meta.errors)}
              />
            )}
          </form.Field>
          <form.Field name="birthDate">
            {(field) => (
              <DatePicker
                label={t().account.profile.birthDate}
                name="birthDate"
                size="lg"
                locale={dateLocale()}
                labels={t().datePicker}
                placeholder="DD.MM.YYYY"
                max={format(new Date(), dateFormat)}
                value={field().state.value}
                onChange={field().handleChange}
                error={error(field().state.meta.errors)}
              />
            )}
          </form.Field>
        </div>
        <div class={styles['save-row']}>
          <Button type="submit" variant="primary" class={styles.save} disabled={submitting()}>
            {submitting() ? t().account.profile.saving : t().account.profile.save}
          </Button>
          <Show when={saved()}>
            <span class={styles.hint} role="status">
              {t().account.profile.saved}
            </span>
          </Show>
        </div>
      </form>
    </section>
  );
}
