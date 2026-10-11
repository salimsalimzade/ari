import { Logo } from '@ari/ui-kit';
import { For, type JSX } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import { createTicker } from './create-ticker';
import { Icon } from './icons';
import shared from './marketing.module.scss';
import styles from './problem.module.scss';
import { Stage } from './stage';

// Frames (400ms each): 0–6 scattered · 7–18 they gather into Ari's library · 19 back.
const gatherFrom = 7;
const listFrom = 10;
const end = 19;

// Saved quotes in the library; the demo's content stays in English.
const rows = [
  {
    color: 'pink',
    text: 'No single bee compares all of the options. The choice emerges from many scouts.',
    date: 'Oct 7',
  },
  {
    color: 'blue',
    text: 'Scouts prefer a cavity of about 40 litres, with a small entrance placed high above the ground.',
    date: 'Oct 8',
  },
  { color: 'yellow', text: 'A scout reports a site with a waggle dance.', date: 'Oct 8' },
];

// Where each piece lies on the stage, and its middle (where the design measured it), for the
// desktop stage and the narrower phone one. The pieces all gather to the stage's center.
type Spot = { x: number; y: number; center: [number, number]; tilt: number };
const layouts = {
  wide: {
    size: [676, 460],
    center: [310, 230],
    tab: { x: 40, y: 52, center: [165, 73], tilt: -4 },
    bookmark: { x: 340, y: 76, center: [470, 96], tilt: 3 },
    sticky: { x: 60, y: 176, center: [190, 226], tilt: 2 },
    screenshot: { x: 370, y: 190, center: [470, 250], tilt: -3 },
    copied: { x: 130, y: 340, center: [295, 362], tilt: -2 },
  },
  phone: {
    size: [342, 380],
    center: [171, 190],
    tab: { x: 16, y: 28, center: [121, 48], tilt: -4 },
    bookmark: { x: 118, y: 94, center: [230, 112], tilt: 3 },
    sticky: { x: 18, y: 154, center: [108, 200], tilt: 2 },
    screenshot: { x: 210, y: 168, center: [269, 214], tilt: -3 },
    copied: { x: 22, y: 298, center: [167, 316], tilt: -2 },
  },
} satisfies Record<string, { size: number[]; center: number[] } & Record<string, unknown>>;

/** "Quotes get lost…": scattered tabs, bookmarks and notes, then the same quotes in Ari. */
export function Problem() {
  const { t } = useI18n();
  let stage!: HTMLDivElement;
  const [frame, setFrame] = createTicker({
    every: 400,
    frames: 20,
    still: 12,
    target: () => stage,
  });
  const listed = () => frame() >= listFrom && frame() < end;

  return (
    <section id="why" class={`${shared.section} ${styles.problem}`} data-tone="surface">
      <div class={styles.copy}>
        <h2 class={shared.title}>{t().marketing.problem.title}</h2>
        <p class={shared.lead}>{t().marketing.problem.text}</p>
        <div class={styles.toggle} role="tablist" aria-label={t().marketing.problem.compare}>
          <button type="button" role="tab" aria-selected={!listed()} onClick={() => setFrame(0)}>
            {t().marketing.problem.without}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={listed()}
            onClick={() => setFrame(listFrom)}
          >
            {t().marketing.problem.with}
          </button>
        </div>
      </div>
      <div ref={stage} aria-hidden="true">
        <Scene layout="wide" frame={frame()} />
        <Scene layout="phone" frame={frame()} />
      </div>
    </section>
  );
}

function Scene(props: { layout: keyof typeof layouts; frame: number }) {
  const { t } = useI18n();
  const layout = layouts[props.layout];
  const phone = props.layout === 'phone';
  const gathered = () => props.frame >= gatherFrom && props.frame < end;
  const listed = () => props.frame >= listFrom && props.frame < end;

  // A piece tilted where it lies, then pulled to the stage's center, shrunk and faded out.
  const Piece = (piece: { spot: Spot; class: string; children: JSX.Element }) => (
    <div
      class={`${styles.piece} ${piece.class}`}
      style={{
        left: `${piece.spot.x}px`,
        top: `${piece.spot.y}px`,
        opacity: gathered() ? 0 : 1,
        transform: gathered()
          ? `translate(${layout.center[0] - piece.spot.center[0]}px, ${layout.center[1] - piece.spot.center[1]}px) scale(.35) rotate(0deg)`
          : `translate(0px, 0px) scale(1) rotate(${piece.spot.tilt}deg)`,
      }}
    >
      {piece.children}
    </div>
  );

  return (
    <div class={styles.frame} data-layout={props.layout}>
      <Stage width={layout.size[0]} height={layout.size[1]}>
        <span class={styles['circle-big']} />
        <span class={styles['circle-small']} />
        <Piece spot={layout.tab as Spot} class={styles.tab}>
          <span class={styles.favicon} />
          <span class={styles.ellipsis}>
            {phone ? 'How Honeybees Choose a…' : 'How Honeybees Choose a New…'}
          </span>
          <Icon name="close" />
        </Piece>
        <Piece spot={layout.bookmark as Spot} class={styles.bookmark}>
          <span class={styles.star}>★</span>
          {phone ? 'Bookmarks › bees (14)' : 'Bookmarks › Reading › bees (14)'}
        </Piece>
        <Piece spot={layout.sticky as Spot} class={styles.sticky}>
          <div class={styles['sticky-kind']}>{t().marketing.problem.notesApp}</div>
          “The choice emerges from many scouts”
          <br />
          <span class={styles['sticky-ask']}>{t().marketing.problem.whereFrom}</span>
        </Piece>
        <Piece spot={layout.screenshot as Spot} class={styles.screenshot}>
          <div class={styles.shot}>
            <span style={{ width: '80%' }} />
            <span style={{ width: '95%' }} />
            <span style={{ width: '60%' }} />
          </div>
          <span class={styles['shot-name']}>
            {phone ? 'Screenshot.png' : 'Screenshot 2026-10-02.png'}
          </span>
        </Piece>
        <Piece spot={layout.copied as Spot} class={styles.copied}>
          <strong>{t().marketing.problem.copied}</strong> · “Scouts prefer a cavity of about 40
          litres…”
        </Piece>
        <div class={styles.library} data-on={listed() ? '' : undefined}>
          <div class={styles['library-head']}>
            <Logo size={phone ? 18 : 20} />
            <strong>{t().marketing.problem.library}</strong>
            <span>
              {phone ? t().marketing.problem.librarySaved : t().marketing.problem.libraryCount}
            </span>
          </div>
          <For each={rows}>
            {(row, i) => (
              <div
                class={styles.row}
                data-on={props.frame >= listFrom + i() && props.frame < end ? '' : undefined}
              >
                <span class={styles.dot} style={{ background: `var(--ari-hl-${row.color})` }} />
                <div class={styles['row-text']}>
                  <span class={styles.quote}>{row.text}</span>
                  <span class={styles.source}>
                    <Icon name="globe" />
                    {/* A long source name is cut short before the date is. */}
                    <span class={styles.where}>
                      {phone
                        ? 'Meadow Quarterly'
                        : 'Meadow Quarterly · How Honeybees Choose a New Home'}
                    </span>
                    <span class={styles.date}>· {row.date}</span>
                  </span>
                </div>
              </div>
            )}
          </For>
        </div>
      </Stage>
    </div>
  );
}
