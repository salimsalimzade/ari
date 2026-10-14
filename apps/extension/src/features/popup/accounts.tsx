import { Alert, Avatar, Button, TextField } from '@ari/ui-kit';
import { createSignal, For, Show } from 'solid-js';
import { browser } from 'wxt/browser';
import { fill, plural, t } from '~/i18n/i18n';
import {
  CheckIcon,
  ChevronLeftIcon,
  CloudOffIcon,
  ExternalIcon,
  LogOutIcon,
  PlusIcon,
} from '~/icons';
import { sendToBackground } from '~/messages';
import { site, websiteUrl } from '~/website';
import type { Account, PasswordSignIn } from '../account/session';
import { contactOf, firstNameOf, initialOf, nameOf } from '../account/use-account';
import styles from './popup.module.scss';

/** Signed out while the website is signed in: that account (with its password), or another. */
export function ContinueAs(props: {
  account: Account;
  onContinue: () => void;
  onOther: () => void;
}) {
  return (
    <section class={styles.intro} aria-labelledby="ari-continue-title">
      <div class={styles['intro-text']}>
        <h1 id="ari-continue-title" class={styles.title}>
          {t.popup.signInTitle}
        </h1>
        <p class={styles.lead}>{fill(t.popup.signInText, { site })}</p>
      </div>
      <AccountCard account={props.account} />
      <Button variant="primary" block onClick={() => props.onContinue()}>
        {fill(t.popup.continueAs, { name: firstNameOf(props.account) })}
      </Button>
      <Button variant="ghost" block onClick={() => props.onOther()}>
        {t.popup.differentAccount}
      </Button>
    </section>
  );
}

/**
 * Signed out, and the website isn't signed in either. Before any Sign out, signing in on the
 * website signs the extension in; after one (`withPassword`), the popup asks for a password.
 */
export function SignedOut(props: { withPassword: boolean; onSignIn: () => void }) {
  return (
    <section class={styles.intro} aria-labelledby="ari-signed-out-title">
      <div class={styles['intro-text']}>
        <h1 id="ari-signed-out-title" class={styles.title}>
          {t.popup.signedOutTitle}
        </h1>
        <p class={styles.lead}>
          {props.withPassword ? t.popup.signInWithPassword : fill(t.popup.signedOutText, { site })}
        </p>
      </div>
      <Show
        when={props.withPassword}
        fallback={
          <Button
            variant="primary"
            block
            iconAfter={<ExternalIcon />}
            onClick={() => props.onSignIn()}
          >
            {fill(t.popup.openToSignIn, { site })}
          </Button>
        }
      >
        <Button variant="primary" block onClick={() => props.onSignIn()}>
          {t.popup.signInButton}
        </Button>
      </Show>
    </section>
  );
}

/**
 * The avatar's menu: the accounts used here and the website's, each switched to with its
 * password; Add another account; and Sign out.
 */
export function AccountList(props: {
  account: Account;
  website: Account | null;
  known: Account[];
  waiting: number;
  onPick: (account: Account) => void;
  onAdd: () => void;
  onSignOut: () => void;
}) {
  // The signed-in one first, then the website's, then the others used here.
  const others = () => {
    const list = [props.website, ...props.known].filter(
      (other): other is Account => !!other && other.id !== props.account.id,
    );
    return list.filter((other, index) => list.findIndex((x) => x.id === other.id) === index);
  };
  return (
    <>
      <ul class={styles.accounts} aria-label={t.popup.accounts}>
        <li class={styles['account-row']} data-current="">
          <Avatar initial={initialOf(props.account)} src={props.account.photoUrl} />
          <span class={styles['account-text']}>
            <span class={styles['account-name']}>{nameOf(props.account)}</span>
            <span class={styles['account-contact']}>{contactOf(props.account)}</span>
          </span>
          <span class={styles.check}>
            <CheckIcon />
            <span class={styles.hidden}>{t.popup.current}</span>
          </span>
        </li>
        <For each={others()}>
          {(other) => (
            <li>
              <button
                type="button"
                class={styles['account-row']}
                data-other=""
                onClick={() => props.onPick(other)}
              >
                <Avatar initial={initialOf(other)} />
                <span class={styles['account-text']}>
                  <span class={styles['account-name']}>{nameOf(other)}</span>
                  <span class={styles['account-contact']}>
                    {other.id === props.website?.id
                      ? fill(t.popup.onWebsite, { contact: contactOf(other), site })
                      : contactOf(other)}
                  </span>
                </span>
              </button>
            </li>
          )}
        </For>
        <li>
          <button type="button" class={styles['account-row']} onClick={() => props.onAdd()}>
            <span class={styles['add-icon']}>
              <PlusIcon />
            </span>
            <span class={styles['account-name']}>{t.popup.addAccount}</span>
          </button>
        </li>
      </ul>
      <Show when={props.waiting}>
        <p class={styles.note}>
          <CloudOffIcon />
          {plural(props.waiting, t.popup.moveNote)}
        </p>
      </Show>
      <Button
        variant="ghost"
        icon={<LogOutIcon />}
        class={styles['sign-out']}
        onClick={() => props.onSignOut()}
      >
        {t.popup.signOut}
      </Button>
    </>
  );
}

/**
 * An account's password: to switch to it from `current`, or to sign in as it after a Sign out
 * (Continue as). The reset happens on the website.
 */
export function PasswordCheck(props: {
  account: Account;
  current?: Account;
  onBack: () => void;
  onSignedIn: () => void;
}) {
  const [password, setPassword] = createSignal('');
  const signIn = createPasswordSignIn(props.onSignedIn);

  return (
    <form
      class={styles.password}
      onSubmit={(event) => {
        event.preventDefault();
        const username = props.account.username;
        if (username && password()) void signIn.submit(username, password());
      }}
    >
      <BackTitle
        title={props.current ? t.popup.switchTitle : t.popup.signInTitle}
        onBack={props.onBack}
      />
      <AccountCard account={props.account} other={!!props.current} />
      <TextField
        label={t.popup.passwordFor}
        type="password"
        size="lg"
        autocomplete="current-password"
        required
        value={password()}
        onChange={setPassword}
      />
      <Show when={signIn.result()}>
        {(failed) => (
          <Alert>
            {failed() !== 'wrong-password'
              ? t.popup.signInFailed
              : props.current
                ? fill(t.popup.wrongPassword, { account: contactOf(props.current) })
                : t.popup.wrongPasswordOnly}
          </Alert>
        )}
      </Show>
      <Button type="submit" variant="primary" block disabled={signIn.busy()}>
        {props.current ? t.popup.switch : t.popup.signInButton}
      </Button>
      <button
        type="button"
        class={styles.link}
        onClick={() => forgotPassword(props.account.username)}
      >
        {t.popup.forgotPassword}
      </button>
    </form>
  );
}

/**
 * Add an account, right in the popup: its username and password. The extension switches to it,
 * and the saves still waiting here go to it.
 */
export function AddAccount(props: { waiting: number; onBack: () => void; onSignedIn: () => void }) {
  const [username, setUsername] = createSignal('');
  const [password, setPassword] = createSignal('');
  const signIn = createPasswordSignIn(props.onSignedIn);
  const wrong = () => signIn.result() === 'wrong-password';

  return (
    <form
      class={styles.password}
      onSubmit={(event) => {
        event.preventDefault();
        if (username().trim() && password()) void signIn.submit(username().trim(), password());
      }}
    >
      <BackTitle title={t.popup.addTitle} onBack={props.onBack} />
      <TextField
        label={t.popup.username}
        size="lg"
        autocomplete="username"
        required
        value={username()}
        onChange={setUsername}
      />
      <TextField
        label={t.popup.password}
        type="password"
        size="lg"
        autocomplete="current-password"
        required
        value={password()}
        onChange={setPassword}
      />
      <Show
        when={signIn.result()}
        fallback={
          <>
            <button
              type="button"
              class={styles.link}
              onClick={() => forgotPassword(username().trim())}
            >
              {t.popup.forgotPassword}
            </button>
            <Show when={props.waiting}>
              <p class={styles.note}>
                <CloudOffIcon />
                {plural(props.waiting, t.popup.addNote)}
              </p>
            </Show>
          </>
        }
      >
        <Alert>
          <Show when={wrong()} fallback={t.popup.signInFailed}>
            {t.popup.wrongLogin}{' '}
            <button
              type="button"
              class={styles['alert-link']}
              onClick={() => forgotPassword(username().trim())}
            >
              {t.popup.resetPassword}
            </button>
          </Show>
        </Alert>
      </Show>
      <Button type="submit" variant="primary" block disabled={signIn.busy()}>
        {t.popup.signInButton}
      </Button>
    </form>
  );
}

/** Signs in with a password through the background: busy while it asks, then why it didn't. */
function createPasswordSignIn(onSignedIn: () => void) {
  const [result, setResult] = createSignal<Exclude<PasswordSignIn, 'signed-in'>>();
  const [busy, setBusy] = createSignal(false);
  const submit = async (username: string, password: string) => {
    if (busy()) return;
    setBusy(true);
    setResult();
    const answer = await sendToBackground<PasswordSignIn>({
      type: 'password-sign-in',
      username,
      password,
    }).catch((): PasswordSignIn => 'failed');
    setBusy(false);
    if (answer === 'signed-in') onSignedIn();
    else setResult(answer);
  };
  return { result, busy, submit };
}

/** The reset happens on the website, with the username filled in. */
function forgotPassword(login: string | undefined) {
  void browser.tabs.create({ url: websiteUrl('forgot-password', login ? { login } : undefined) });
  window.close();
}

function BackTitle(props: { title: string; onBack: () => void }) {
  return (
    <div class={styles.back}>
      <Button
        variant="ghost"
        iconOnly
        icon={<ChevronLeftIcon />}
        aria-label={t.popup.back}
        onClick={() => props.onBack()}
      />
      <h1 class={styles['back-title']}>{props.title}</h1>
    </div>
  );
}

/** An account's name and email, on a white card. `other` tints it as not the one in use. */
function AccountCard(props: { account: Account; other?: boolean }) {
  return (
    <div class={styles['account-card']} data-other={props.other ? '' : undefined}>
      <Avatar initial={initialOf(props.account)} class={styles['avatar-lg']} />
      <span class={styles['account-text']}>
        <span class={styles['account-card-name']}>{nameOf(props.account)}</span>
        <span class={styles['account-card-contact']}>{contactOf(props.account)}</span>
      </span>
    </div>
  );
}
