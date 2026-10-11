import type { MeResponse } from '@ari/types';
import { Button, DatePicker, dateFormat, TextField } from '@ari/ui-kit';
import { createForm, revalidateLogic } from '@tanstack/solid-form';
import { format, parseISO } from 'date-fns';
import * as v from 'valibot';
import type { Dictionary } from '~/i18n/en';
import { useI18n } from '~/i18n/i18n';
import styles from './account.module.scss';

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

/** Full name, username and date of birth. */
export function ProfileForm(props: { user: MeResponse }) {
  const { t, dateLocale } = useI18n();
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
    // Saving comes with ari-api's profile endpoint.
    onSubmit: () => {},
  }));
  const error = (errors: ({ message: string } | undefined)[]) => {
    const key = errors[0]?.message as ErrorKey | undefined;
    return key && t().auth.errors[key];
  };

  return (
    <section class={styles.card}>
      <h2 class={styles.heading}>{t().account.profile.title}</h2>
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
                description={t().account.profile.usernameHint}
                value={field().state.value}
                onChange={field().handleChange}
                error={error(field().state.meta.errors)}
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
        <Button type="submit" variant="primary" class={styles.save}>
          {t().account.profile.save}
        </Button>
      </form>
    </section>
  );
}
