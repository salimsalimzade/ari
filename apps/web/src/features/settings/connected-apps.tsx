import { Tag } from '@ari/ui-kit';
import { For } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import styles from './sections.module.scss';

const apps = [
  { name: 'Notion', initial: 'N', key: 'notion' },
  { name: 'Google Docs', initial: 'G', key: 'googleDocs' },
] as const;

/** The apps Ari will send highlights to; none is connected yet. */
export function ConnectedApps() {
  const { t } = useI18n();
  return (
    <section class={styles.card}>
      <h2 class={styles.heading}>{t().settings.apps}</h2>
      <p class={styles.text}>{t().apps.intro}</p>
      <For each={apps}>
        {(app) => (
          <div class={styles.row}>
            <span class={styles['row-icon']} data-shape="square" aria-hidden="true">
              {app.initial}
            </span>
            <div class={styles['row-text']}>
              <span class={styles['row-title']}>{app.name}</span>
              <span class={styles['row-sub']}>{t().apps[app.key]}</span>
            </div>
            <Tag tone="neutral">{t().apps.comingSoon}</Tag>
          </div>
        )}
      </For>
      <p class={styles.text}>{t().apps.outro}</p>
    </section>
  );
}
