import { Avatar, Tag } from '@ari/ui-kit';
import { For, type JSX } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import { createTicker } from './create-ticker';
import styles from './features.module.scss';
import { Icon } from './icons';
import shared from './marketing.module.scss';
import { Stage } from './stage';

// The demos' content (quotes, files, sources) is sample data, so it stays in English.
const imported = [
  { color: 'yellow', text: 'The swarm lifts off and flies to its new home.', page: 'p. 5' },
  { color: 'purple', text: 'Scouts switch from dancing to piping.', page: 'p. 4' },
  { color: 'green', text: 'Piping warms the swarm up for flight.', page: 'p. 4' },
];
const sources = [
  {
    initial: 'M',
    name: 'Meadow Quarterly',
    kind: 'Website · How Honeybees Choose a New Home',
    count: '6 saved',
  },
  { initial: 'P', name: 'honeybees-new-home.pdf', kind: 'PDF · imported Oct 5', count: '3 saved' },
  { initial: 'W', name: 'field-notes.docx', kind: 'Word · imported Oct 9', count: '4 saved' },
];

/** "Built for reading, writing and citing": four cards whose demos play while they're on screen. */
export function Features() {
  const { t } = useI18n();
  let grid!: HTMLDivElement;
  // 16 frames of 400ms, shared by the four demos.
  const [frame] = createTicker({ every: 400, frames: 16, still: 12, target: () => grid });
  const flag = (value: boolean) => (value ? '' : undefined);
  const importProgress = () =>
    frame() >= 15 ? 100 : Math.min(100, Math.round((frame() / 5) * 100));
  const importStatus = () =>
    frame() >= 6 && frame() < 15
      ? t().marketing.features.found
      : frame() >= 15
        ? t().marketing.features.ready
        : t().marketing.features.reading;
  const spread = () => frame() >= 3 && frame() < 15;
  const saving = () => frame() >= 5 && frame() < 12;

  return (
    <section id="features" class={`${shared.section} ${styles.features}`} data-tone="surface">
      <div class={shared.intro}>
        <h2 class={shared.title}>{t().marketing.features.title}</h2>
        <p class={`${shared.lead} ${styles.lead}`}>{t().marketing.features.text}</p>
      </div>
      <div ref={grid} class={styles.grid}>
        <Card
          wide
          title={t().marketing.features.notesTitle}
          text={t().marketing.features.notesText}
        >
          <div class={styles.demo} data-phone-notes="">
            <strong class={styles['phone-title']}>Swarm decisions</strong>
            <span class={`${styles.serif} ${styles['phone-text']}`}>
              What surprised me is that the swarm never holds a vote in the usual sense.
            </span>
            <div class={styles.slot} data-on={flag(frame() < 6)} />
            <div class={styles.drop} data-on={flag(frame() >= 3 && frame() < 6)} />
            <div class={styles['phone-quotes']}>
              <span class={styles.overline}>{t().marketing.features.savedQuotes}</span>
            </div>
            <div
              class={styles['phone-chip']}
              data-moved={flag(frame() >= 4 && frame() < 15)}
              data-gone={flag(frame() === 15)}
              data-instant={flag(frame() === 0)}
            >
              <span class={styles.serif}>
                <mark data-color="pink">No single bee compares all of the options.</mark>
              </span>
              <span class={styles.small}>
                <Icon name="globe" />
                Meadow Quarterly
                <span class={styles.kept} data-on={flag(frame() >= 7 && frame() < 15)}>
                  <Tag icon={<Icon name="check" />}>{t().marketing.features.sourceKept}</Tag>
                </span>
              </span>
            </div>
          </div>
          <Stage width={656} height={240} class={styles['wide-notes']}>
            <div class={styles.demo} data-notes="">
              <div class={styles.draft}>
                <strong>Swarm decisions</strong>
                <span class={styles.serif}>
                  What surprised me is that the swarm never holds a vote in the usual sense.
                </span>
              </div>
              <div class={styles.slot} data-on={flag(frame() < 6)} />
              <div class={styles.drop} data-on={flag(frame() >= 3 && frame() < 6)} />
              <div class={styles.quotes}>
                <span class={styles.overline}>{t().marketing.features.savedQuotes}</span>
                <span class={styles.gap} />
                <div class={styles['quote-card']}>
                  <mark data-color="blue">Scouts prefer a cavity of about 40 litres…</mark>
                </div>
              </div>
              <div
                class={styles.chip}
                data-moved={flag(frame() >= 4 && frame() < 15)}
                data-gone={flag(frame() === 15)}
                data-instant={flag(frame() === 0)}
              >
                <span class={styles.serif}>
                  <mark data-color="pink">No single bee compares all of the options.</mark>
                </span>
                <span class={styles.small}>
                  <Icon name="globe" />
                  Meadow Quarterly
                </span>
                <span class={styles.kept} data-on={flag(frame() >= 7 && frame() < 15)}>
                  <Tag icon={<Icon name="check" />}>{t().marketing.features.sourceKept}</Tag>
                </span>
              </div>
            </div>
          </Stage>
        </Card>

        <Card title={t().marketing.features.importTitle} text={t().marketing.features.importText}>
          <div class={styles.demo} data-import="">
            <div class={styles.file}>
              <span class={styles['file-icon']}>
                <Icon name="file" size="md" />
              </span>
              <div class={styles['file-text']}>
                <strong>honeybees-new-home.pdf</strong>
                <span>{importStatus()}</span>
              </div>
              <span class={styles.percent}>{importProgress()}%</span>
            </div>
            <span class={styles.bar}>
              <span
                style={{
                  width: `${importProgress()}%`,
                  transition: frame() === 0 ? 'none' : undefined,
                }}
              />
            </span>
            <For each={imported}>
              {(row, i) => (
                <div class={styles.found} data-on={flag(frame() >= 6 + i() && frame() < 15)}>
                  <span class={styles.dot} style={{ background: `var(--ari-hl-${row.color})` }} />
                  <span class={styles['found-text']}>{row.text}</span>
                  <span class={styles.small}>{row.page}</span>
                </div>
              )}
            </For>
          </div>
        </Card>

        <Card title={t().marketing.features.sourcesTitle} text={t().marketing.features.sourcesText}>
          <div class={styles.demo} data-sources="">
            <For each={sources}>
              {(source, i) => (
                <div
                  class={styles.source}
                  style={{
                    'z-index': 3 - i(),
                    transform: spread()
                      ? `translateY(${20 + i() * 70}px) scale(1)`
                      : `translateY(${84 + i() * 10}px) scale(${1 - i() * 0.05})`,
                  }}
                >
                  <Avatar initial={source.initial} />
                  <div class={styles['source-text']}>
                    <strong>{source.name}</strong>
                    <span>{source.kind}</span>
                  </div>
                  <span class={styles.count} data-on={flag(spread())}>
                    {source.count}
                  </span>
                </div>
              )}
            </For>
          </div>
        </Card>

        <Card
          wide
          title={t().marketing.features.privacyTitle}
          text={t().marketing.features.privacyText}
        >
          <div class={styles.demo} data-privacy="">
            <div class={styles['site-bar']}>
              <Icon name="lock" />
              <span class={styles.ellipsis}>meadowquarterly.org/honeybees-new-home</span>
              <PrivacyStatus saving={saving()} />
            </div>
            {/* Phones: the status gets a line of its own under the address. */}
            <div class={styles['status-row']}>
              <PrivacyStatus saving={saving()} />
            </div>
            <div class={styles['site-text']}>
              Scouts that find a good site come back and dance for it.{' '}
              <span class={styles.picked} data-on={flag(saving())}>
                The better the site, the more circuits she dances.
              </span>
              <span class={styles['wide-only']}>
                {' '}
                Other scouts go and check the site for themselves, and the best option slowly gains
                followers.
              </span>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

function PrivacyStatus(props: { saving: boolean }) {
  const { t } = useI18n();
  return (
    <span class={styles.status} data-on={props.saving ? '' : undefined}>
      <Icon name={props.saving ? 'check' : 'eyeOff'} />
      {props.saving ? t().marketing.features.saving : t().marketing.features.idle}
    </span>
  );
}

function Card(props: { wide?: boolean; title: string; text: string; children: JSX.Element }) {
  return (
    <div class={styles.card} data-wide={props.wide ? '' : undefined}>
      <div class={styles.visual} aria-hidden="true">
        {props.children}
      </div>
      <div class={styles['card-copy']}>
        <h3>{props.title}</h3>
        <p>{props.text}</p>
      </div>
    </div>
  );
}
