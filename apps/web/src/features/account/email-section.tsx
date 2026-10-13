import { ApiError } from '@ari/data-access';
import type { MeResponse } from '@ari/types';
import { Alert, Button, Tag, TextField } from '@ari/ui-kit';
import { useAction } from '@solidjs/router';
import { createForm, revalidateLogic } from '@tanstack/solid-form';
import { createSignal, Match, Show, Switch } from 'solid-js';
import * as v from 'valibot';
import { fill } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import styles from './account.module.scss';
import { CheckIcon, MailIcon, RetryIcon, TrashIcon } from './icons';
import { changeEmailAction, removeEmailAction, resendEmailLinkAction } from './queries';

const emailSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.nonEmpty('invalid'), v.email('invalid')),
});

/** Why the last request failed, as a key of the texts below. */
type Failure = 'invalid' | 'rateLimited' | 'networkError' | 'requestFailed';

const failureOf = (error: unknown): Failure => {
  if (error instanceof ApiError) {
    if (error.code === 'RATE_LIMITED') return 'rateLimited';
    if (error.code === 'VALIDATION_FAILED') return 'invalid';
    if (error.status === 0) return 'networkError';
  }
  return 'requestFailed';
};

/**
 * The account's optional email, from `/me`: none, waiting for its verify link (`pendingEmail`), or
 * verified (`email`). A verified email keeps working while a new one waits for its link.
 */
export function EmailSection(props: { user: MeResponse }) {
  const { t } = useI18n();
  const change = useAction(changeEmailAction);
  const resend = useAction(resendEmailLinkAction);
  const remove = useAction(removeEmailAction);
  const [editing, setEditing] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [failure, setFailure] = createSignal<Failure>();
  const [resent, setResent] = createSignal(false);

  const status = () =>
    props.user.pendingEmail ? 'pending' : props.user.email ? 'verified' : 'none';
  const address = () => props.user.pendingEmail ?? props.user.email ?? '';
  const showForm = () => editing() || status() === 'none';
  const failureText = (key: Failure) =>
    key === 'invalid' || key === 'rateLimited' ? t().account.email[key] : t().auth.errors[key];

  // Runs one request at a time; true when it worked.
  const run = async (request: () => Promise<unknown>) => {
    setBusy(true);
    setFailure(undefined);
    setResent(false);
    try {
      await request();
      return true;
    } catch (error) {
      setFailure(failureOf(error));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const form = createForm(() => ({
    defaultValues: { email: '' },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: emailSchema },
    onSubmit: async ({ value }) => {
      if (await run(() => change(v.parse(emailSchema, value).email))) setEditing(false);
    },
  }));
  const startChange = () => {
    form.reset({ email: address() });
    setFailure(undefined);
    setResent(false);
    setEditing(true);
  };

  return (
    <section class={styles.card}>
      <div class={styles['heading-row']}>
        <h2 class={styles.heading}>{t().account.email.title}</h2>
        <Switch>
          <Match when={status() === 'none'}>
            <Tag tone="neutral">{t().account.email.notAdded}</Tag>
          </Match>
          <Match when={status() === 'pending'}>
            <Tag tone="accent">{t().account.email.pending}</Tag>
          </Match>
          <Match when={status() === 'verified'}>
            <Tag icon={<CheckIcon />} class={styles['tag-icon']}>
              {t().account.email.verified}
            </Tag>
          </Match>
        </Switch>
      </div>
      <Show when={failure()}>{(key) => <Alert>{failureText(key())}</Alert>}</Show>
      <Switch>
        <Match when={showForm()}>
          <Show when={status() === 'none'}>
            <p class={styles.intro}>{t().account.email.intro}</p>
          </Show>
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
            <Button type="submit" variant="primary" class={styles['email-send']} disabled={busy()}>
              {t().account.email.send}
            </Button>
          </form>
          <Show when={status() !== 'none'}>
            <div class={styles.buttons}>
              <Button variant="ghost" disabled={busy()} onClick={() => setEditing(false)}>
                {t().account.email.cancel}
              </Button>
            </div>
          </Show>
        </Match>
        <Match when={!showForm()}>
          <div class={styles.address} data-status={status()}>
            <span class={styles['address-icon']}>
              <MailIcon />
            </span>
            <div class={styles['address-text']}>
              <span class={styles['address-value']}>{address()}</span>
              <span class={styles.hint}>
                {status() === 'pending'
                  ? t().account.email.pendingText
                  : t().account.email.verifiedText}
              </span>
              <Show when={status() === 'pending' && props.user.email}>
                {(email) => (
                  <span class={styles.hint}>
                    {fill(t().account.email.keepsWorking, { email: email() })}
                  </span>
                )}
              </Show>
            </div>
          </div>
          <Show when={resent()}>
            <p class={styles.hint} role="status">
              {t().account.email.resent}
            </p>
          </Show>
          <div class={styles.buttons}>
            <Switch>
              <Match when={status() === 'pending'}>
                <Button
                  icon={<RetryIcon />}
                  disabled={busy()}
                  onClick={async () => setResent(await run(() => resend()))}
                >
                  {t().account.email.resend}
                </Button>
                <Button variant="ghost" disabled={busy()} onClick={startChange}>
                  {t().account.email.change}
                </Button>
              </Match>
              <Match when={status() === 'verified'}>
                <Button disabled={busy()} onClick={startChange}>
                  {t().account.email.change}
                </Button>
                <Button
                  variant="ghost"
                  icon={<TrashIcon />}
                  disabled={busy()}
                  onClick={() => run(() => remove())}
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
