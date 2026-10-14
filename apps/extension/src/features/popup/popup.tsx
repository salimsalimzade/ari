import { Avatar, Button, Logo } from '@ari/ui-kit';
import {
  Switch as Choose,
  createEffect,
  createResource,
  createSignal,
  type JSX,
  Match,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';
import { browser } from 'wxt/browser';
import { fill, plural, t } from '~/i18n/i18n';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  HighlighterIcon,
  LibraryIcon,
  PanelIcon,
  ScissorsIcon,
} from '~/icons';
import { copyLabel, shortcutLabel } from '~/keys';
import { type Message, type SaveSelectionResult, sendToBackground, sendToTab } from '~/messages';
import { isAriWebsite, type WebsitePage, websiteUrl } from '~/website';
import {
  type Account,
  addAccountNext,
  expired,
  followsWebsite,
  keptBeside,
  knownAccounts,
  loggedOut,
  websiteAccount,
} from '../account/session';
import { initialOf, nameOf, useAccount, useStored } from '../account/use-account';
import { isWebsite } from '../saves/page-url';
import { ownSaves, type PageSaves, syncRetry, waitingSaves } from '../saves/store';
import { tabPage } from '../saves/tab-page';
import { AccountList, AddAccount, ContinueAs, PasswordCheck, SignedOut } from './accounts';
import { Expired, Mismatch, NotSaved, Retrying, SignedIn } from './notices';
import styles from './popup.module.scss';

/**
 * What a click on the Ari icon opens: who the extension saves for and what still waits to reach
 * the library, this page's saves, and what Ari can do on the page.
 */
export function Popup() {
  const [tab] = createResource(async () => {
    const [active] = await browser.tabs.query({ active: true, currentWindow: true });
    return active;
  });
  const [saved] = createResource(tab, (current) => tabPage(current.url)?.store.get() ?? null);
  const [commands] = createResource(() => browser.commands.getAll(), { initialValue: [] });
  const [hint, setHint] = createSignal<string>();

  const user = useAccount();
  const ended = useStored(expired);
  const website = useStored(websiteAccount);
  const kept = useStored(keptBeside);
  const follows = useStored(followsWebsite);
  const known = useStored(knownAccounts);
  const retry = useStored(syncRetry);
  // After the user's own Sign out, signing in again takes a password, here in the popup.
  const out = useStored(loggedOut);
  // The account switcher; Add an account, or the account it asks the password of; and after
  // signing in there, how many waiting saves went along.
  const [accountsOpen, setAccountsOpen] = createSignal(false);
  const [adding, setAdding] = createSignal(false);
  const [checking, setChecking] = createSignal<Account>();
  const [switched, setSwitched] = createSignal<{ moved: number }>();
  const signedIn = (moved: number) => {
    setAdding(false);
    setChecking();
    setAccountsOpen(false);
    setSwitched({ moved });
  };

  // Saves kept only in this browser, counted again whenever saves change.
  const [waiting, setWaiting] = createSignal({ count: 0, sites: 0 });
  const countWaiting = () => void waitingSaves().then(setWaiting);
  onMount(() => {
    countWaiting();
    const onChanged = (_changes: unknown, area: string) => {
      if (area === 'local') countWaiting();
    };
    browser.storage.onChanged.addListener(onChanged);
    onCleanup(() => browser.storage.onChanged.removeListener(onChanged));
    // Their name and photo link (signed for an hour) are read again each time.
    void sendToBackground({ type: 'load-account' }).catch(() => {});
  });

  // The welcome tab's Not you? opens the popup for Add an account.
  const addNext = useStored(addAccountNext);
  createEffect(() => {
    if (!addNext()) return;
    setAdding(true);
    void addAccountNext.setValue(false);
  });

  // The website is signed in as somebody else, and the extension wasn't told to keep its own.
  const mismatch = () => {
    const signedIn = user();
    const other = website();
    return signedIn && other && other.id !== signedIn.id && !follows() && kept() !== other.id
      ? other
      : undefined;
  };

  // A website Ari saves on: not the browser's own pages, local files or Ari's website.
  const site = () => {
    const url = tab()?.url;
    return isWebsite(url) && !isAriWebsite(url) ? new URL(url).hostname : undefined;
  };
  const shortcut = (name: string) => {
    const keys = commands().find((command) => command.name === name)?.shortcut;
    return keys ? shortcutLabel(keys) : '';
  };

  // A message to the page, then the popup closes; a page loaded before Ari can't answer.
  const ask = async (message: Message) => {
    const id = tab()?.id;
    if (id === undefined) return;
    try {
      const answer = await sendToTab<SaveSelectionResult | boolean>(id, message);
      if (answer === 'no-selection') setHint(t.popup.noSelection);
      else window.close();
    } catch {
      setHint(t.popup.reload);
    }
  };

  // A website's page opens it itself (a page loaded before Ari can't); the welcome tab is Ari's own.
  const openPanel = () => {
    const current = tab();
    if (site()) return void ask({ type: 'open-panel' });
    void sendToBackground({ type: 'set-panel', open: true, windowId: current?.windowId }).then(() =>
      window.close(),
    );
  };

  const open = (page: WebsitePage) => {
    void browser.tabs.create({ url: websiteUrl(page) });
    window.close();
  };

  const signIn = () => (out() ? setAdding(true) : open('sign-in'));
  const addAccount = () => setAdding(true);

  const header = () => (
    <header class={styles.head}>
      <Logo size={20} wordmark="sm" />
      <Show when={user()}>
        {(signedIn) => (
          <button
            type="button"
            class={styles.account}
            aria-expanded={accountsOpen()}
            aria-label={fill(t.popup.account, { name: nameOf(signedIn()) })}
            title={fill(t.popup.account, { name: nameOf(signedIn()) })}
            onClick={() => setAccountsOpen(!accountsOpen())}
          >
            <span class={styles['avatar-dot']} data-dot={ended() ? '' : undefined}>
              <Avatar initial={initialOf(signedIn())} src={signedIn().photoUrl} />
            </span>
            {accountsOpen() ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </button>
        )}
      </Show>
      <Show when={user() === null && !website() && waiting().count}>
        <Button class={styles['sign-in']} onClick={signIn}>
          {t.popup.signIn}
        </Button>
      </Show>
    </header>
  );

  // What the account and the saves waiting to sync need; otherwise this page's saves.
  const status = () => (
    <Choose>
      <Match when={user() && switched()}>
        {(after) => <SignedIn account={user() as Account} moved={after().moved} />}
      </Match>
      <Match when={user() === null && website()}>
        {(other) => (
          <ContinueAs
            account={other()}
            onContinue={() => setChecking(other())}
            onOther={addAccount}
          />
        )}
      </Match>
      <Match when={user() === null && waiting().count}>
        <NotSaved waiting={waiting()} onSignIn={signIn} />
      </Match>
      <Match when={user() === null}>
        <SignedOut withPassword={!!out()} onSignIn={signIn} />
      </Match>
      <Match when={ended()}>
        <Expired waiting={waiting().count} onSignIn={() => setChecking(user() ?? undefined)} />
      </Match>
      <Match when={user() && mismatch()}>
        {(other) => (
          <Mismatch
            account={user() as Account}
            website={other()}
            onUse={() => setChecking(other())}
            onKeep={() => void keptBeside.setValue(other().id ?? null)}
          />
        )}
      </Match>
      <Match when={retry() && waiting().count}>
        <Retrying
          waiting={waiting().count}
          at={retry()?.at ?? ''}
          onSync={() => sendToBackground({ type: 'sync-now' })}
        />
      </Match>
      <Match when={user()}>
        <section class={styles.page} aria-label={t.popup.thisPage}>
          <div class={styles['page-text']}>
            <span class={styles['page-label']}>{t.popup.thisPage}</span>
            <span class={styles['page-count']}>
              <Show
                when={tabPage(tab()?.url)}
                fallback={isAriWebsite(tab()?.url) ? t.popup.ariWebsite : t.popup.unsupported}
              >
                {counts(saved(), user()?.id)}
              </Show>
            </span>
          </div>
          <Show when={tabPage(tab()?.url)}>
            <button type="button" class={styles['panel-link']} onClick={openPanel}>
              {t.popup.sidePanel}
              <ChevronRightIcon />
            </button>
          </Show>
        </section>
      </Match>
    </Choose>
  );

  const menu = () => (
    <>
      <div class={styles.menu}>
        <Row
          icon={<HighlighterIcon />}
          label={t.popup.saveSelection}
          keys={copyLabel}
          disabled={!site()}
          onClick={() => void ask({ type: 'save-selection' })}
        />
        <Row
          icon={<ScissorsIcon />}
          label={t.popup.clip}
          keys={shortcut('clip-section')}
          disabled={!site()}
          onClick={() => void ask({ type: 'start-clip' })}
        />
        <Row
          icon={<PanelIcon />}
          label={t.popup.openPanel}
          keys={shortcut('toggle-panel')}
          disabled={!tabPage(tab()?.url)}
          onClick={openPanel}
        />
      </div>
      <Show when={hint()}>
        <p role="status" class={styles.hint}>
          {hint()}
        </p>
      </Show>
      <Show when={user()}>
        <Button block icon={<LibraryIcon />} class={styles.library} onClick={() => open('library')}>
          {t.popup.openLibrary}
        </Button>
      </Show>
    </>
  );

  return (
    <main class={styles.popup}>
      <Choose
        fallback={
          <>
            {header()}
            <Show
              when={accountsOpen() && user()}
              fallback={
                <>
                  {status()}
                  {menu()}
                </>
              }
            >
              {(signedIn) => (
                <AccountList
                  account={signedIn()}
                  website={website() ?? null}
                  known={known() ?? []}
                  waiting={waiting().count}
                  onPick={setChecking}
                  onAdd={addAccount}
                  onSignOut={() => {
                    setAccountsOpen(false);
                    void sendToBackground({ type: 'sign-out' });
                  }}
                />
              )}
            </Show>
          </>
        }
      >
        <Match when={adding()}>
          <AddAccount
            waiting={waiting().count}
            onBack={() => setAdding(false)}
            onSignedIn={() => signedIn(waiting().count)}
          />
        </Match>
        <Match when={checking()}>
          {(account) => (
            <PasswordCheck
              account={account()}
              // Another account in use: switching from it; else signing in (again) as this one.
              current={user()?.id === account().id ? undefined : (user() ?? undefined)}
              onBack={() => setChecking()}
              onSignedIn={() => signedIn(waiting().count)}
            />
          )}
        </Match>
      </Choose>
    </main>
  );
}

function Row(props: {
  icon: JSX.Element;
  label: string;
  keys: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      class={styles.row}
      disabled={props.disabled}
      onClick={() => props.onClick()}
    >
      {props.icon}
      {props.label}
      <span class={styles.keys}>{props.keys}</span>
    </button>
  );
}

/** "5 highlights · 1 clip", leaving out what there is none of. */
function counts(page: PageSaves | null | undefined, accountId: string | undefined) {
  const saves = ownSaves(page?.saves ?? [], accountId);
  const highlights = saves.filter((save) => save.kind === 'HIGHLIGHT').length;
  const clips = saves.length - highlights;
  const parts = [
    highlights ? plural(highlights, t.counts.highlights) : '',
    clips ? plural(clips, t.counts.clips) : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : t.popup.nothingSaved;
}
