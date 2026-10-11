import { Logo, Tag } from '@ari/ui-kit';
import { For, Show } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import { highlightSwatches } from './hero';
import styles from './how-demo.module.scss';
import { Icon, Pointer } from './icons';
import { Stage } from './stage';

/** Each step plays this many 400ms frames. */
export const framesPerStep = 12;

// Where the pointer is on each frame of each step, in stage pixels, and the frames it clicks on.
const pointer: [number, number][][] = [
  [
    [320, 360],
    [58, 228],
    [450, 236],
    [450, 236],
    [450, 236],
    [96, 186],
    [96, 186],
    [96, 186],
    [96, 186],
    [540, 420],
    [540, 420],
    [540, 420],
  ],
  [
    [760, 26],
    [760, 26],
    [330, 400],
    [330, 400],
    [330, 400],
    [330, 400],
    [330, 400],
    [560, 494],
    [560, 494],
    [560, 494],
    [560, 494],
    [560, 494],
  ],
  [
    [300, 74],
    [300, 74],
    [300, 74],
    [300, 74],
    [300, 74],
    [300, 74],
    [300, 74],
    [300, 150],
    [612, 330],
    [612, 330],
    [612, 330],
    [612, 330],
  ],
];
const clicks = [
  [2, 6],
  [1, 4, 9],
  [0, 7, 9],
];

// The demo's page and library are sample content, so they stay in English.
const tableRows = [
  ['Hollow oak, north slope', '42 L', '12 cm²', '5 m'],
  ['Rock crevice by the creek', '18 L', '30 cm²', '1 m'],
  ['Dead beech on the ridge', '38 L', '15 cm²', '4 m'],
];
const libraryRows = [
  {
    color: 'blue',
    text: 'Scouts prefer a cavity of about 40 litres, with a small entrance placed high above the ground.',
    source: 'Meadow Quarterly · Oct 8',
    match: false,
  },
  {
    color: 'yellow',
    text: 'A scout reports a site with a waggle dance. The better the site, the more circuits she dances.',
    source: 'Meadow Quarterly · Oct 7',
    match: true,
  },
  {
    color: 'pink',
    text: 'No single bee compares all of the options. The choice emerges from many scouts.',
    source: 'Meadow Quarterly · Oct 7',
    match: false,
  },
  {
    color: 'purple',
    text: 'When about fifteen scouts are at the same site at once, they switch from dancing to piping.',
    source: 'honeybees-new-home.pdf · p. 4',
    match: false,
  },
];
const query = 'waggle';

/**
 * A browser acting out one step: 0 highlights a sentence and saves it, 1 clips the table with the
 * Ari icon, 2 searches the library and copies a quote with its citation.
 */
export function HowDemo(props: { step: number; frame: number }) {
  const { t } = useI18n();
  const f = () => props.frame;
  const on = (step: number, from: number, to = framesPerStep) =>
    props.step === step && f() >= from && f() < to;
  const flag = (value: boolean) => (value ? '' : undefined);

  const typed = () => (props.step === 2 ? query.slice(0, Math.min(query.length, f())) : '');
  const filtered = () => on(2, 7);
  const toast = () => {
    if (on(0, 7, 11)) return { text: t().marketing.how.saved, open: true };
    if (on(1, 10)) return { text: t().marketing.how.clipSaved, open: true };
    if (on(2, 10)) return { text: t().marketing.how.copied, open: false };
    return undefined;
  };
  const selection = () => {
    if (props.step === 1 || on(0, 7)) return 'saved';
    if (on(0, 2)) return 'selected';
    return undefined;
  };

  return (
    <Stage width={792} height={540} class={styles.stage}>
      <div class={styles.browser} aria-hidden="true">
        <div class={styles.bar}>
          <div class={styles.lights}>
            <span />
            <span />
            <span />
          </div>
          <div class={styles.url}>
            <Icon name="lock" />
            {props.step === 2 ? 'Ari · Library' : 'meadowquarterly.org/honeybees-new-home'}
          </div>
          <span class={styles['ari-icon']} data-on={flag(on(1, 1, 10))}>
            <Logo size={20} />
          </span>
        </div>

        <div class={styles.view} data-hidden={flag(props.step === 2)}>
          <article class={styles.article}>
            <div class={styles.headline}>How Honeybees Choose a New Home</div>
            <div class={styles.byline}>By J. Arden · 8 min read</div>
            <p>
              In late spring a colony splits in two. The old queen leaves with about half of the
              workers, and the swarm hangs from a branch while it decides where to live.
            </p>
            <p>
              <span class={styles.selection} data-state={selection()}>
                A few hundred scouts fly out to inspect tree hollows.
                <span class={styles.toolbar} data-on={flag(on(0, 4, 7))}>
                  <span class={styles.save} data-pressed={flag(on(0, 6, 7))}>
                    <Icon name="check" />
                    {t().marketing.how.save}
                  </span>
                  <For each={highlightSwatches}>
                    {(color) => (
                      <span
                        class={styles.swatch}
                        style={{ background: `var(--ari-hl-${color})` }}
                      />
                    )}
                  </For>
                  <span class={styles.divider} />
                  <span class={styles.comment}>
                    <Icon name="message" />
                    {t().marketing.how.addComment}
                  </span>
                </span>
              </span>{' '}
              Each scout measures a cavity by walking around its inside walls, and she may spend
              forty minutes on a single site.
            </p>
            <div
              class={styles.table}
              data-lifted={flag(on(1, 1, 10))}
              data-outlined={flag(on(1, 3, 10))}
            >
              <span class={styles['table-label']} data-on={flag(on(1, 3, 6))}>
                <Icon name="scissors" />
                {t().marketing.how.tableClip}
              </span>
              <div class={styles['table-row']} data-head="">
                <span>Site</span>
                <span>Volume</span>
                <span>Entrance</span>
                <span>Height</span>
              </div>
              <For each={tableRows}>
                {(row) => (
                  <div class={styles['table-row']}>
                    <For each={row}>{(cell) => <span>{cell}</span>}</For>
                  </div>
                )}
              </For>
            </div>
          </article>
          <div class={styles.dim} data-on={flag(on(1, 1, 10))} />
          <div class={styles['clip-bar']} data-on={flag(on(1, 1, 6))}>
            <Logo size={20} />
            {t().marketing.how.selectSection}
            <span class={styles.pill}>{t().marketing.how.cancel}</span>
          </div>
          <div class={styles.panel} data-on={flag(on(1, 6, 10))}>
            <div class={styles['panel-head']}>
              <Logo size={20} />
              <strong>{t().marketing.how.clipTitle}</strong>
              <span class={styles.close}>
                <Icon name="close" />
              </span>
            </div>
            <div class={styles.mini}>
              <div class={styles['mini-row']} data-head="">
                <span>Site</span>
                <span>Vol.</span>
                <span>Entr.</span>
                <span>Ht.</span>
              </div>
              <div class={styles['mini-row']}>
                <span>Hollow oak</span>
                <span>42 L</span>
                <span>12</span>
                <span>5 m</span>
              </div>
              <div class={styles['mini-row']}>
                <span>Rock crevice</span>
                <span>18 L</span>
                <span>30</span>
                <span>1 m</span>
              </div>
            </div>
            <div class={styles.field}>
              <span class={styles['field-label']}>{t().marketing.how.titleLabel}</span>
              <span class={styles.input}>Table 1. Sites the scouts reported</span>
            </div>
            <div class={styles.meta}>
              <Icon name="globe" />
              Meadow Quarterly · meadowquarterly.org
            </div>
            <div>
              <Tag>nest site</Tag>
            </div>
            <div class={styles['panel-actions']}>
              <span class={styles['save-wide']} data-pressed={flag(on(1, 9, 10))}>
                {t().marketing.how.saveToAri}
              </span>
              <span class={styles.pill}>{t().marketing.how.reselect}</span>
            </div>
          </div>
        </div>

        <div class={styles.view} data-app="" data-hidden={flag(props.step !== 2)}>
          <aside class={styles.sidebar}>
            <Logo wordmark="md" size={20} />
            <div class={styles.nav}>
              <span data-on="">
                <Icon name="library" />
                {t().marketing.how.library}
              </span>
              <span>
                <Icon name="notes" />
                {t().marketing.how.notes}
              </span>
              <span>
                <Icon name="globe" />
                {t().marketing.how.sources}
              </span>
            </div>
          </aside>
          <div class={styles.main}>
            <div class={styles.search}>
              <Icon name="search" />
              <span class={styles.query}>
                {typed()}
                <span class={styles.caret} data-on={flag(on(2, 0, 7))} />
                <Show when={!typed()}>
                  <span class={styles.placeholder}>{t().marketing.how.search}</span>
                </Show>
              </span>
              <span class={styles.kbd}>⌘K</span>
            </div>
            <div class={styles.results}>
              <For each={libraryRows}>
                {(row) => (
                  <div
                    class={styles.result}
                    data-hidden={flag(filtered() && !row.match)}
                    data-active={flag(row.match && on(2, 8))}
                  >
                    <span class={styles.dot} style={{ background: `var(--ari-hl-${row.color})` }} />
                    <div class={styles['result-text']}>
                      <span class={styles.quote}>{row.text}</span>
                      <span class={styles.source}>{row.source}</span>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
          <div class={styles.detail} data-on={flag(on(2, 8))}>
            <Tag tone="accent">{t().marketing.how.highlight}</Tag>
            <p class={styles['detail-quote']}>
              <mark>
                A scout reports a site with a waggle dance. The better the site, the more circuits
                she dances.
              </mark>
            </p>
            <span class={styles.source}>Meadow Quarterly · J. Arden</span>
            <span class={styles['save-wide']} data-pressed={flag(on(2, 9, 10))}>
              <Icon name="copy" />
              {t().marketing.how.copyCitation}
            </span>
          </div>
          <div class={styles.citation} data-on={flag(on(2, 10))}>
            <span class={styles['citation-label']}>{t().marketing.how.pasted}</span>
            <span class={styles.quote}>
              “A scout reports a site with a waggle dance. The better the site, the more circuits
              she dances.” J. Arden, “How Honeybees Choose a New Home,” <em>Meadow Quarterly</em>,
              2026.
            </span>
          </div>
        </div>

        <div class={styles.toast} data-on={flag(!!toast())}>
          <span class={styles['toast-check']}>
            <Icon name="check" />
          </span>
          <span class={styles['toast-text']}>{toast()?.text}</span>
          <Show when={toast()?.open}>
            <span class={styles['toast-divider']} />
            <span class={styles['toast-open']}>
              {t().marketing.how.openInAri}
              <Icon name="external" />
            </span>
          </Show>
        </div>
        <div
          class={styles.pointer}
          style={{
            transform: `translate(${pointer[props.step][f()][0]}px, ${pointer[props.step][f()][1]}px)`,
          }}
        >
          <div data-pressed={flag(clicks[props.step].includes(f()))}>
            <Pointer />
          </div>
        </div>
      </div>
    </Stage>
  );
}
