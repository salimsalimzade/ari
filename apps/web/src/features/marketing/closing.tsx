import { Button } from '@ari/ui-kit';
import { useI18n } from '~/i18n/i18n';
import styles from './closing.module.scss';
import { links } from './links';
import shared from './marketing.module.scss';

/**
 * The last call to action. `price` names the plan's price in the sentence ("$48 a year" when the
 * pricing page is on yearly). Phones get the trial button, since extensions install on computers.
 */
export function Closing(props: { price?: string }) {
  const { t } = useI18n();
  return (
    <section class={styles.closing}>
      <div class={styles.band}>
        <span class={styles['circle-big']} />
        <span class={styles['circle-small']} />
        <h2 class={shared.title}>{t().marketing.cta.title}</h2>
        <p class={styles.text}>
          {t().marketing.cta.text.replace('{price}', props.price ?? t().marketing.cta.price)}
        </p>
        <div class={`${shared.actions} ${styles.install}`}>
          <Button variant="primary" href={links.chrome} class={shared.big}>
            {t().marketing.addToChrome}
          </Button>
          <Button href={links.firefox} class={shared.big}>
            {t().marketing.addToFirefox}
          </Button>
        </div>
        <Button variant="primary" href={links.trial} class={`${shared.big} ${styles.trial}`}>
          {t().marketing.faq.startTrial}
        </Button>
      </div>
    </section>
  );
}
