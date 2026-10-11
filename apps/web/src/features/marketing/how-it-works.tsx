import { For } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import { createTicker } from './create-ticker';
import { framesPerStep, HowDemo } from './how-demo';
import styles from './how-it-works.module.scss';
import shared from './marketing.module.scss';

/** Three steps on the left; the browser on the right acts out the selected one, then the next. */
export function HowItWorks() {
  const { t } = useI18n();
  let demo!: HTMLDivElement;
  const [frame, setFrame] = createTicker({
    every: 400,
    frames: framesPerStep * 3,
    still: framesPerStep - 1,
    target: () => demo,
  });
  const step = () => Math.floor(frame() / framesPerStep);
  const progress = () => frame() % framesPerStep;

  return (
    <section id="how" class={shared.section}>
      <div class={shared.intro}>
        <h2 class={shared.title}>{t().marketing.how.title}</h2>
        <p class={`${shared.lead} ${styles.lead}`}>{t().marketing.how.text}</p>
      </div>
      <div class={styles.layout}>
        <div class={styles.steps} role="tablist" aria-label={t().marketing.how.title}>
          <For each={t().marketing.how.steps}>
            {(item, i) => (
              <button
                type="button"
                role="tab"
                class={styles.step}
                aria-selected={step() === i()}
                onClick={() => setFrame(i() * framesPerStep)}
              >
                <span class={styles['step-head']}>
                  <span class={styles.number}>{i() + 1}</span>
                  <span class={styles['step-title']}>{item.title}</span>
                  <span class={styles.short}>{t().marketing.how.short[i()]}</span>
                </span>
                <span class={styles['step-text']}>{item.text}</span>
                <span class={styles.track}>
                  <span
                    class={styles.progress}
                    style={{
                      width: step() === i() ? `${((progress() + 1) / framesPerStep) * 100}%` : '0%',
                      transition: progress() === 0 ? 'none' : undefined,
                    }}
                  />
                </span>
              </button>
            )}
          </For>
        </div>
        {/* Phones: the tabs only name the steps; the open one is told here. */}
        <div class={styles.current}>
          <span class={styles['current-title']}>{t().marketing.how.steps[step()].title}</span>
          <span class={styles['current-text']}>{t().marketing.how.steps[step()].text}</span>
          <span class={styles.track} data-on="">
            <span
              class={styles.progress}
              style={{
                width: `${((progress() + 1) / framesPerStep) * 100}%`,
                transition: progress() === 0 ? 'none' : undefined,
              }}
            />
          </span>
        </div>
        <div ref={demo} class={styles.demo}>
          <HowDemo step={step()} frame={progress()} />
        </div>
      </div>
    </section>
  );
}
