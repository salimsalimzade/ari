import { ApiError } from '@ari/data-access';
import { Alert, Button, TextField } from '@ari/ui-kit';
import {
  A,
  createAsync,
  revalidate,
  useAction,
  useNavigate,
  useSearchParams,
} from '@solidjs/router';
import { createForm, revalidateLogic } from '@tanstack/solid-form';
import { createSignal, Match, Show, Suspense, Switch } from 'solid-js';
import * as v from 'valibot';
import type { Dictionary } from '~/i18n/en';
import { fill } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import styles from './auth.module.scss';
import { AlertIcon, CheckIcon, LockIcon } from './icons';
import {
  getPasswordReset,
  type ResetLinkProblem,
  resetLinkProblem,
  resetPasswordAction,
} from './queries';

type ErrorKey = keyof Dictionary['auth']['errors'];

// Messages are keys of t().auth.errors, so a shown error follows the language picker.
const newPasswordSchema = v.pipe(
  v.object({
    // The same rules as signing up; 72 bytes is the most bcrypt reads.
    password: v.pipe(
      v.string(),
      v.minLength(8, 'passwordShort' satisfies ErrorKey),
      v.maxBytes(72, 'passwordLong' satisfies ErrorKey),
    ),
    confirm: v.pipe(v.string(), v.nonEmpty('confirmRequired' satisfies ErrorKey)),
  }),
  v.forward(
    v.partialCheck(
      [['password'], ['confirm']],
      (input) => input.password === input.confirm,
      'passwordsDiffer' satisfies ErrorKey,
    ),
    ['confirm'],
  ),
);

/** Where a reset email's link leads (`?code=`): checks the link, then takes the new password. */
export function ResetPassword() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const code = () => (typeof params.code === 'string' ? params.code.trim() : '');
  const link = createAsync(() => getPasswordReset(code()), { deferStream: true });
  // Found when saving, e.g. the link expired while the form was open.
  const [savedProblem, setSavedProblem] = createSignal<ResetLinkProblem>();
  const problem = () => {
    const result = link();
    return savedProblem() ?? (result && 'problem' in result ? result.problem : undefined);
  };
  const username = () => {
    const result = link();
    return result && 'username' in result ? result.username : undefined;
  };
  const [retrying, setRetrying] = createSignal(false);
  const retry = async () => {
    setRetrying(true);
    try {
      await revalidate(getPasswordReset.keyFor(code()));
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Suspense
      fallback={
        <div class={styles.form} data-width="narrow">
          <h1 class={styles.title}>{t().auth.reset.checking}</h1>
        </div>
      }
    >
      <Switch>
        <Match when={problem()}>
          {(problem) => <LinkProblem problem={problem()} retrying={retrying()} onRetry={retry} />}
        </Match>
        <Match when={username()}>
          {(username) => (
            <NewPasswordForm code={code()} username={username()} onLinkProblem={setSavedProblem} />
          )}
        </Match>
      </Switch>
    </Suspense>
  );
}

type NewPasswordFormProps = {
  code: string;
  username: string;
  /** Saving found the link no longer works. */
  onLinkProblem: (problem: ResetLinkProblem) => void;
};

function NewPasswordForm(props: NewPasswordFormProps) {
  const { t } = useI18n();
  const save = useAction(resetPasswordAction);
  const navigate = useNavigate();
  // Why saving failed: the request's error.
  const [failure, setFailure] = createSignal<unknown>();
  // ari-api's own message; ours only when there is none (an unreachable API).
  const failureMessage = () => {
    const error = failure();
    if (error instanceof ApiError && error.problem.detail) return error.problem.detail;
    const offline = error instanceof ApiError && error.status === 0;
    return t().auth.errors[offline ? 'networkError' : 'requestFailed'];
  };
  let formElement!: HTMLFormElement;
  const form = createForm(() => ({
    defaultValues: { password: '', confirm: '' },
    // Errors show after the first submit, then follow what the user types.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: newPasswordSchema },
    onSubmitInvalid: () => formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    onSubmit: async ({ value }) => {
      setFailure(undefined);
      try {
        await save({ code: props.code, password: value.password });
        // /login fills in the username and says the password changed.
        navigate('/login', { state: { passwordUpdated: props.username } });
      } catch (error) {
        const problem = resetLinkProblem(error);
        if (problem) props.onLinkProblem(problem);
        else setFailure(error);
      }
    },
  }));
  const submitting = form.useStore((state) => state.isSubmitting);
  const values = form.useStore((state) => state.values);
  const longEnough = () => values().password.length >= 8;
  const matching = () => values().confirm !== '' && values().confirm === values().password;
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
      <div class={styles.heading}>
        <h1 class={styles.title}>{t().auth.reset.title}</h1>
        <p class={styles.text}>{fill(t().auth.reset.forUser, { username: props.username })}</p>
      </div>
      <Show when={failure()}>
        <Alert>{failureMessage()}</Alert>
      </Show>
      {/* Tells password managers which account the new password belongs to. */}
      <input type="text" name="username" autocomplete="username" value={props.username} hidden />
      <form.Field name="password">
        {(field) => (
          <TextField
            label={t().auth.reset.password}
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
      </form.Field>
      <form.Field name="confirm">
        {(field) => (
          <TextField
            label={t().auth.reset.confirm}
            name="confirm"
            type="password"
            size="lg"
            fill="surface"
            autocomplete="new-password"
            value={field().state.value}
            onChange={field().handleChange}
            error={error(field().state.meta.errors)}
          />
        )}
      </form.Field>
      <ul class={styles.checks}>
        <li data-met={longEnough() ? '' : undefined}>
          <CheckIcon />
          {t().auth.reset.longEnough}
        </li>
        <li data-met={matching() ? '' : undefined}>
          <CheckIcon />
          {t().auth.reset.matching}
        </li>
      </ul>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        block
        class={styles.submit}
        disabled={submitting()}
      >
        {submitting() ? t().auth.reset.submitting : t().auth.reset.submit}
      </Button>
    </form>
  );
}

type LinkProblemProps = {
  problem: ResetLinkProblem;
  retrying: boolean;
  /** Checks the link again, after a failure that wasn't about the link. */
  onRetry: () => void;
};

/** Why the link doesn't work, with the way on: a new link, logging in, or another try. */
function LinkProblem(props: LinkProblemProps) {
  const { t } = useI18n();
  const view = () => {
    const texts = t().auth.reset;
    switch (props.problem) {
      case 'expired':
        return {
          title: texts.expiredTitle,
          text: texts.expiredText,
          button: texts.sendNew,
          href: '/forgot-password',
          link: { label: texts.backToLogin, href: '/login' },
        };
      case 'used':
        return {
          title: texts.usedTitle,
          text: texts.usedText,
          button: texts.logIn,
          href: '/login',
          link: { label: texts.sendNew, href: '/forgot-password' },
        };
      case 'invalid':
        return {
          title: texts.invalidTitle,
          text: texts.invalidText,
          button: texts.requestNew,
          href: '/forgot-password',
          link: { label: texts.backToLogin, href: '/login' },
        };
      default:
        return {
          title: texts.failedTitle,
          text: texts.failedText,
          button: texts.retry,
          link: { label: texts.backToLogin, href: '/login' },
        };
    }
  };

  return (
    <div class={styles.form} data-width="narrow" aria-live="polite">
      <span class={styles.badge} data-tone={props.problem === 'used' ? 'neutral' : undefined}>
        <Show when={props.problem === 'used'} fallback={<AlertIcon />}>
          <LockIcon />
        </Show>
      </span>
      <div class={styles.heading}>
        <h1 class={styles.title}>{view().title}</h1>
        <p class={styles.text}>{view().text}</p>
      </div>
      <Show
        when={view().href}
        fallback={
          <Button
            variant="primary"
            size="lg"
            block
            class={styles.submit}
            disabled={props.retrying}
            onClick={props.onRetry}
          >
            {view().button}
          </Button>
        }
      >
        {(href) => (
          <Button href={href()} variant="primary" size="lg" block class={styles.submit}>
            {view().button}
          </Button>
        )}
      </Show>
      <A href={view().link.href} class={styles.link}>
        {view().link.label}
      </A>
    </div>
  );
}
