import { Button, Logo } from '@ari/ui-kit';
import type { JSX } from 'solid-js';
import { browser } from 'wxt/browser';
import { fill, t } from '~/i18n/i18n';
import { PinIcon, PuzzleIcon } from '~/icons';
import { copyLabel } from '~/keys';
import { websiteUrl } from '~/website';
import { PageUi } from '../page/page-ui';
import { pageStore } from '../saves/store';
import { welcomeUrl } from '../saves/tab-page';
import styles from './welcome.module.scss';

/**
 * The tab Ari opens once it is installed: pin it, try a highlight right here, sign in. The page
 * runs the same UI as a website, but its saves are practice ones that the browser forgets.
 */
export function Welcome() {
  const store = pageStore(welcomeUrl(), 'session');
  const source = () => ({ url: welcomeUrl(), title: t.welcome.pageTitle, siteName: 'Ari' });

  const signIn = () => void browser.tabs.create({ url: websiteUrl('login') });

  return (
    <main class={styles.page}>
      <header class={styles.header}>
        <div class={styles['title-row']}>
          <Logo size={56} />
          <h1 class={styles.title}>{t.welcome.title}</h1>
        </div>
        <p class={styles.intro}>{t.welcome.intro}</p>
      </header>
      <ol class={styles.steps}>
        <Step number={1} title={t.welcome.pinTitle} text={t.welcome.pinText}>
          <div class={styles.toolbar} aria-hidden="true">
            <PuzzleIcon />
            <span class={styles['toolbar-divider']} />
            <Logo size={20} />
            Ari
            <span class={styles.pin}>
              <PinIcon />
            </span>
          </div>
        </Step>
        <Step
          number={2}
          title={t.welcome.tryTitle}
          text={fill(t.welcome.tryText, { keys: copyLabel })}
        >
          <p class={styles.sample}>
            {t.welcome.sampleLead} <span class={styles['sample-target']}>{t.welcome.sample}</span>
          </p>
        </Step>
        <Step number={3} title={t.welcome.syncTitle} text={t.welcome.syncText}>
          <div class={styles.actions}>
            <Button variant="primary" onClick={signIn}>
              {t.welcome.signIn}
            </Button>
            <Button variant="ghost" onClick={() => window.close()}>
              {t.welcome.later}
            </Button>
          </div>
        </Step>
      </ol>
      <PageUi store={store} source={source} practice />
    </main>
  );
}

function Step(props: { number: number; title: string; text: string; children: JSX.Element }) {
  return (
    <li class={styles.step}>
      <span class={styles.number} aria-hidden="true">
        {props.number}
      </span>
      <div class={styles['step-body']}>
        <div class={styles['step-text']}>
          <h2 class={styles['step-title']}>{props.title}</h2>
          <p class={styles['step-hint']}>{props.text}</p>
        </div>
        {props.children}
      </div>
    </li>
  );
}
