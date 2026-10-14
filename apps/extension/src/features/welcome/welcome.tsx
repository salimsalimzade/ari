import { Avatar, Button, Logo } from '@ari/ui-kit';
import { Show } from 'solid-js';
import { browser } from 'wxt/browser';
import { fill, t } from '~/i18n/i18n';
import { CheckIcon, CommentIcon, HighlighterIcon, PinIcon, PuzzleIcon } from '~/icons';
import { site, type WebsitePage, websiteUrl } from '~/website';
import { addAccountNext } from '../account/session';
import { contactOf, initialOf, useAccount } from '../account/use-account';
import { PageUi } from '../page/page-ui';
import { pageStore } from '../saves/store';
import { welcomeUrl } from '../saves/tab-page';
import styles from './welcome.module.scss';

/**
 * The tab Ari opens once it is installed: what Ari does, an account (or the one the website is
 * already signed in as), and pinning it. The sample text is real: the page runs the same UI as a
 * website, but its saves are practice ones that the browser forgets.
 */
export function Welcome() {
  const store = pageStore(welcomeUrl(), 'session');
  const source = () => ({ url: welcomeUrl(), title: t.welcome.pageTitle, siteName: 'Ari' });
  const user = useAccount();
  const open = (page: WebsitePage) => void browser.tabs.create({ url: websiteUrl(page) });
  // Opens the popup on Add an account. openPopup() has to run in the click itself.
  const notYou = () => {
    void addAccountNext.setValue(true);
    void browser.action.openPopup().catch(() => {});
  };

  return (
    <main class={styles.page}>
      <div class={styles.backdrop} aria-hidden="true">
        <span class={styles['circle-sage']} />
        <span class={styles['circle-accent']} />
      </div>
      <section class={styles.hero}>
        <Logo size={28} wordmark="md" />
        <h1 class={styles.title}>{t.welcome.title}</h1>
        <p class={styles.intro}>{t.welcome.intro}</p>
        <Show
          when={user()}
          fallback={
            <>
              <div class={styles.actions}>
                <Button
                  variant="primary"
                  size="lg"
                  class={styles.grow}
                  onClick={() => open('register')}
                >
                  {t.welcome.register}
                </Button>
                <Button size="lg" class={styles['log-in']} onClick={() => open('sign-in')}>
                  {t.welcome.logIn}
                </Button>
              </div>
              <p class={styles.note}>{t.welcome.later}</p>
            </>
          }
        >
          {(signedIn) => (
            <>
              <div class={styles.connected}>
                <Avatar initial={initialOf(signedIn())} class={styles.avatar} />
                <span class={styles['connected-text']}>
                  <span class={styles['connected-title']}>
                    {fill(t.welcome.connected, { site })}
                  </span>
                  <span class={styles['connected-contact']}>{contactOf(signedIn())}</span>
                </span>
                <span class={styles['connected-check']}>
                  <CheckIcon />
                </span>
              </div>
              <p class={styles.note} data-tone="strong">
                {fill(t.welcome.synced, { site })}{' '}
                <button type="button" class={styles.link} onClick={notYou}>
                  {t.welcome.notYou}
                </button>
              </p>
            </>
          )}
        </Show>
      </section>
      <div class={styles.demo}>
        <div class={styles['toolbar-demo']} aria-hidden="true">
          <span class={styles['save-demo']}>
            <HighlighterIcon />
            {t.toolbar.save}
          </span>
          <span class={styles.swatch} style={{ background: 'var(--ari-hl-yellow)' }} />
          <span class={styles.swatch} style={{ background: 'var(--ari-hl-pink)' }} />
          <span class={styles.swatch} style={{ background: 'var(--ari-hl-green)' }} />
          <span class={styles['comment-demo']}>
            <CommentIcon />
          </span>
        </div>
        <article class={styles.sample} aria-labelledby="ari-try-here">
          <span id="ari-try-here" class={styles['sample-label']}>
            {t.welcome.tryHere}
          </span>
          {t.welcome.sampleLead} <span class={styles['sample-target']}>{t.welcome.sample}</span>{' '}
          {t.welcome.sampleEnd}
        </article>
        <div class={styles['saved-demo']} aria-hidden="true">
          <span class={styles['saved-title']}>
            <CheckIcon />
            {t.welcome.savedTitle}
          </span>
          <p class={styles['saved-quote']}>
            <span>{t.welcome.sample}</span>
          </p>
          <span class={styles['saved-source']}>{t.welcome.savedSource}</span>
        </div>
      </div>
      <footer class={styles.pin}>
        <span class={styles['pin-title']}>{t.welcome.pin}</span>
        <div class={styles['pin-demo']} title={t.welcome.pinHint}>
          <PuzzleIcon />
          <span class={styles['pin-divider']} />
          <Logo size={20} />
          Ari
          <span class={styles['pin-icon']}>
            <PinIcon />
          </span>
          <span class={styles.hidden}>{t.welcome.pinHint}</span>
        </div>
      </footer>
      <PageUi store={store} source={source} practice />
    </main>
  );
}
