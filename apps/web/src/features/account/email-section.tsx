import { Button, Tag, TextField } from '@ari/ui-kit';
import { createForm, revalidateLogic } from '@tanstack/solid-form';
import { createSignal, Match, Switch } from 'solid-js';
import * as v from 'valibot';
import { useI18n } from '~/i18n/i18n';
import styles from './account.module.scss';
import { CheckIcon, MailIcon, RetryIcon, TrashIcon } from './icons';

/** The account's email: none yet, sent a link and waiting, or verified. */
export type EmailState =
  | { status: 'none' }
  | { status: 'pending'; address: string }
  | { status: 'verified'; address: string };

const emailSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.nonEmpty('invalid'), v.email('invalid')),
});

/**
 * Adding an email is optional: it stays unverified until the link in the email is opened. The state
 * lives in the page until ari-api has the email endpoints.
 */
export function EmailSection(props: { initial?: EmailState }) {
  const { t } = useI18n();
  const [email, setEmail] = createSignal<EmailState>(props.initial ?? { status: 'none' });
  const address = () => {
    const state = email();
    return state.status === 'none' ? '' : state.address;
  };

  const form = createForm(() => ({
    defaultValues: { email: '' },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: emailSchema },
    onSubmit: ({ value }) =>
      setEmail({ status: 'pending', address: v.parse(emailSchema, value).email }),
  }));
  const changeEmail = () => {
    form.reset({ email: address() });
    setEmail({ status: 'none' });
  };

  return (
    <section class={styles.card}>
      <div class={styles['heading-row']}>
        <h2 class={styles.heading}>{t().account.email.title}</h2>
        <Switch>
          <Match when={email().status === 'none'}>
            <Tag tone="neutral">{t().account.email.notAdded}</Tag>
          </Match>
          <Match when={email().status === 'pending'}>
            <Tag tone="accent">{t().account.email.pending}</Tag>
          </Match>
          <Match when={email().status === 'verified'}>
            <Tag icon={<CheckIcon />} class={styles['tag-icon']}>
              {t().account.email.verified}
            </Tag>
          </Match>
        </Switch>
      </div>
      <Switch>
        <Match when={email().status === 'none'}>
          <p class={styles.intro}>{t().account.email.intro}</p>
          <form
            class={styles['email-form']}
            novalidate
            onSubmit={(event) => {
              event.preventDefault();
              form.handleSubmit();
            }}
          >
            <form.Field name="email">
              {(field) => (
                <TextField
                  label={t().account.email.label}
                  name="email"
                  type="email"
                  size="lg"
                  placeholder="you@example.com"
                  autocomplete="email"
                  class={styles['email-field']}
                  value={field().state.value}
                  onChange={field().handleChange}
                  error={field().state.meta.errors[0] && t().account.email.invalid}
                />
              )}
            </form.Field>
            <Button type="submit" variant="primary" class={styles['email-send']}>
              {t().account.email.send}
            </Button>
          </form>
        </Match>
        <Match when={email().status !== 'none'}>
          <div class={styles.address} data-status={email().status}>
            <span class={styles['address-icon']}>
              <MailIcon />
            </span>
            <div class={styles['address-text']}>
              <span class={styles['address-value']}>{address()}</span>
              <span class={styles.hint}>
                {email().status === 'pending'
                  ? t().account.email.pendingText
                  : t().account.email.verifiedText}
              </span>
            </div>
          </div>
          <div class={styles.buttons}>
            <Switch>
              <Match when={email().status === 'pending'}>
                {/* Sending the link again comes with ari-api's email endpoint. */}
                <Button icon={<RetryIcon />}>{t().account.email.resend}</Button>
                <Button variant="ghost" onClick={changeEmail}>
                  {t().account.email.change}
                </Button>
              </Match>
              <Match when={email().status === 'verified'}>
                <Button onClick={changeEmail}>{t().account.email.change}</Button>
                <Button
                  variant="ghost"
                  icon={<TrashIcon />}
                  onClick={() => {
                    form.reset({ email: '' });
                    setEmail({ status: 'none' });
                  }}
                >
                  {t().account.email.remove}
                </Button>
              </Match>
            </Switch>
          </div>
        </Match>
      </Switch>
    </section>
  );
}
