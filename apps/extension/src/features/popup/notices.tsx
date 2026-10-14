import { Button } from '@ari/ui-kit';
import { createSignal, type JSX } from 'solid-js';
import { fill, plural, t } from '~/i18n/i18n';
import { CheckIcon, ClockIcon, CloudOffIcon, RefreshIcon, UsersIcon } from '~/icons';
import { site } from '~/website';
import type { Account } from '../account/session';
import { contactOf } from '../account/use-account';
import styles from './popup.module.scss';

/** Just signed in with a password in the popup: new saves, and those waiting, go to them. */
export function SignedIn(props: { account: Account; moved: number }) {
  const text = () =>
    [t.popup.signedInText, props.moved ? plural(props.moved, t.popup.movedNote) : '']
      .filter(Boolean)
      .join(' ');
  return (
    <Notice
      tone="sage"
      icon={<CheckIcon />}
      title={fill(t.popup.signedInTitle, { account: contactOf(props.account) })}
      text={text()}
    />
  );
}

/** Signed out with saves kept only in this browser: they sync once somebody signs in. */
export function NotSaved(props: {
  waiting: { count: number; sites: number };
  onSignIn: () => void;
}) {
  const text = () =>
    fill(plural(props.waiting.count, t.popup.keptHere), {
      sites: plural(props.waiting.sites, t.popup.sites),
    });
  return (
    <Notice
      tone="accent"
      icon={<CloudOffIcon />}
      title={plural(props.waiting.count, t.popup.notSaved)}
      text={text()}
    >
      <Button variant="primary" block onClick={() => props.onSignIn()}>
        {t.popup.signInToSync}
      </Button>
    </Notice>
  );
}

/** ari-api ended the session: the account's password signs the extension in again. */
export function Expired(props: { waiting: number; onSignIn: () => void }) {
  const text = () =>
    [t.popup.expiredText, props.waiting ? plural(props.waiting, t.popup.expiredWaiting) : '']
      .filter(Boolean)
      .join(' ');
  return (
    <Notice tone="neutral" icon={<ClockIcon />} title={t.popup.expiredTitle} text={text()}>
      <Button variant="primary" block onClick={() => props.onSignIn()}>
        {t.popup.signInAgain}
      </Button>
    </Notice>
  );
}

/**
 * The extension saves for one account while the website is signed in as another: switch to that
 * one with its password, or keep this one.
 */
export function Mismatch(props: {
  account: Account;
  website: Account;
  onUse: () => void;
  onKeep: () => void;
}) {
  return (
    <Notice
      tone="accent"
      icon={<UsersIcon />}
      title={fill(t.popup.mismatchTitle, { site })}
      text={fill(t.popup.mismatchText, {
        account: contactOf(props.account),
        site,
        website: contactOf(props.website),
      })}
    >
      <div class={styles.actions}>
        <Button variant="primary" class={styles.grow} onClick={() => props.onUse()}>
          {fill(t.popup.useWebsiteAccount, { site })}
        </Button>
        <Button variant="ghost" onClick={() => props.onKeep()}>
          {t.popup.keep}
        </Button>
      </div>
    </Notice>
  );
}

/** Signed in, but ari-api couldn't be reached: sync tries again on its own, or now. */
export function Retrying(props: { waiting: number; at: string; onSync: () => Promise<unknown> }) {
  const [busy, setBusy] = createSignal(false);
  const minutes = () => Math.max(1, Math.ceil((Date.parse(props.at) - Date.now()) / 60_000));
  return (
    <Notice
      tone="neutral"
      icon={<RefreshIcon />}
      title={plural(props.waiting, t.popup.waitingTitle)}
      text={fill(t.popup.waitingText, { n: minutes() })}
      action={
        <button
          type="button"
          class={styles.link}
          disabled={busy()}
          onClick={() => {
            setBusy(true);
            void props.onSync().finally(() => setBusy(false));
          }}
        >
          {t.popup.syncNow}
        </button>
      }
    />
  );
}

/** A tinted card: an icon, a title and a line, then `children`; `action` goes under the line. */
function Notice(props: {
  tone: 'accent' | 'neutral' | 'sage';
  icon: JSX.Element;
  title: string;
  text: string;
  action?: JSX.Element;
  children?: JSX.Element;
}) {
  return (
    <section class={styles.notice} data-tone={props.tone} aria-label={props.title}>
      <div class={styles['notice-head']}>
        <span class={styles['notice-icon']}>{props.icon}</span>
        <div class={styles['notice-text']}>
          <span class={styles['notice-title']}>{props.title}</span>
          <span>{props.text}</span>
          {props.action}
        </div>
      </div>
      {props.children}
    </section>
  );
}
