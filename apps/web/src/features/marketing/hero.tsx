import { Button } from '@ari/ui-kit';
import { For } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import { createTicker } from './create-ticker';
import styles from './hero.module.scss';
import { Icon } from './icons';
import { links } from './links';
import shared from './marketing.module.scss';
import { Stage } from './stage';

export const highlightSwatches = ['yellow', 'green', 'blue', 'pink', 'purple'];

// The sample page and note are the demo's content, so they stay in English.
const quote =
  'No single bee compares all of the options. The choice emerges from many scouts, each advertising one site.';

/** The headline, the install buttons, and a page whose sentence gets saved into a note. */
export function Hero() {
  const { t } = useI18n();
  // 0 plain · 1 highlighted, toolbar up · 2 saved: toast, quote flies into the note · 3 rest.
  const [frame] = createTicker({ every: 1700, frames: 4, still: 2 });

  return (
    <div class={styles.hero}>
      <div class={styles.copy}>
        <h1 class={styles.title}>{t().marketing.hero.title}</h1>
        <p class={styles.text}>{t().marketing.hero.text}</p>
        <div class={`${shared.actions} ${styles.install}`}>
          <Button variant="primary" href={links.chrome} class={shared.big}>
            {t().marketing.addToChrome}
          </Button>
          <Button href={links.firefox} class={shared.big}>
            {t().marketing.addToFirefox}
          </Button>
        </div>
        <span class={styles.trial}>{t().marketing.hero.trial}</span>
        {/* Phones can't install the extension, so they start the trial instead. */}
        <Button
          variant="primary"
          href={links.trial}
          class={`${shared.big} ${styles['phone-trial']}`}
        >
          {t().marketing.faq.startTrial}
        </Button>
        <p class={styles.device}>
          <Icon name="monitor" />
          {t().marketing.hero.extensionNote}
        </p>
      </div>
      <PhoneDemo frame={frame()} />
      <Stage width={606} height={540} class={styles.stage}>
        <div class={styles.page} aria-hidden="true">
          <div class={styles.site}>meadowquarterly.org</div>
          <div class={styles.headline}>How Honeybees Choose a New Home</div>
          <p>
            Every spring, beekeepers get calls about a strange sight: a dark, humming cluster of
            bees hanging from a fence post or a low branch.
          </p>
          <p>
            <span class={styles.selection} data-on={frame() >= 1 ? '' : undefined}>
              {quote}
              <span class={styles.toolbar} data-on={frame() === 1 ? '' : undefined}>
                <span class={styles.save}>
                  <Icon name="check" />
                  {t().marketing.hero.save}
                </span>
                <For each={highlightSwatches}>
                  {(color) => (
                    <span class={styles.swatch} style={{ background: `var(--ari-hl-${color})` }} />
                  )}
                </For>
              </span>
            </span>
          </p>
        </div>
        <div class={styles.note} aria-hidden="true">
          <div class={styles['note-kind']}>
            <Icon name="notes" />
            {t().marketing.hero.note}
          </div>
          <div class={styles['note-title']}>Swarm decisions</div>
          <p class={styles['note-text']}>
            What surprised me is that the swarm never holds a vote in the usual sense.
          </p>
          <figure class={styles.quote} data-on={frame() >= 2 ? '' : undefined}>
            <p>
              <mark>{quote}</mark>
            </p>
            <figcaption>
              <Icon name="globe" />
              Meadow Quarterly · How Honeybees Choose a New Home
            </figcaption>
          </figure>
        </div>
        <div class={styles.toast} data-on={frame() === 2 ? '' : undefined} aria-hidden="true">
          <span class={styles['toast-check']}>
            <Icon name="check" />
          </span>
          {t().marketing.hero.saved}
        </div>
      </Stage>
    </div>
  );
}

// The same story stacked for a phone: the page on top, the note below, the quote moving down.
function PhoneDemo(props: { frame: number }) {
  const { t } = useI18n();
  const flag = (value: boolean) => (value ? '' : undefined);
  return (
    <div class={styles.phone} aria-hidden="true">
      <div class={styles['phone-page']}>
        <div class={styles.site}>meadowquarterly.org</div>
        <div class={styles['phone-headline']}>How Honeybees Choose a New Home</div>
        <p>
          <span class={styles.selection} data-on={flag(props.frame >= 1)}>
            {quote}
            <span class={styles.toolbar} data-on={flag(props.frame === 1)}>
              <span class={styles.save}>
                <Icon name="check" />
                {t().marketing.hero.save}
              </span>
              <For each={highlightSwatches}>
                {(color) => (
                  <span class={styles.swatch} style={{ background: `var(--ari-hl-${color})` }} />
                )}
              </For>
            </span>
          </span>
        </p>
      </div>
      <div class={styles['phone-note']}>
        <div class={styles['note-kind']}>
          <Icon name="notes" />
          {t().marketing.hero.note} · Swarm decisions
        </div>
        <figure class={styles.quote} data-phone="" data-on={flag(props.frame >= 2)}>
          <p>
            <mark>No single bee compares all of the options.</mark>
          </p>
          <figcaption>
            <Icon name="globe" />
            Meadow Quarterly
          </figcaption>
        </figure>
      </div>
      <div class={styles.toast} data-phone="" data-on={flag(props.frame === 2)}>
        <span class={styles['toast-check']}>
          <Icon name="check" />
        </span>
        {t().marketing.hero.saved}
      </div>
    </div>
  );
}
