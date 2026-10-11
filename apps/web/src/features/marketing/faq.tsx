import { Accordion, Button, Logo, Tag } from '@ari/ui-kit';
import { createSignal, For, Match, Switch } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import styles from './faq.module.scss';
import { Icon } from './icons';
import { links } from './links';
import shared from './marketing.module.scss';

/**
 * The questions on the left; the chosen one is answered on the right, as a short chat. Below
 * 1024px the chat would sit far from the question, so they open in place instead.
 */
export function Faq() {
  const { t } = useI18n();
  const [open, setOpen] = createSignal(0);
  const item = () => t().marketing.faq.items[open()];

  return (
    <section id="faq" class={`${shared.section} ${styles.faq}`}>
      <div class={styles.side}>
        <h2 class={shared.title}>{t().marketing.faq.title}</h2>
        <Accordion
          class={styles.accordion}
          defaultValue="0"
          items={t().marketing.faq.items.map((question, i) => ({
            value: String(i),
            title: question.q,
            content: question.a,
          }))}
        />
        <div class={styles.questions} role="tablist" aria-label={t().marketing.faq.title}>
          <For each={t().marketing.faq.items}>
            {(question, i) => (
              <button
                type="button"
                role="tab"
                id={`faq-${i()}`}
                aria-selected={open() === i()}
                aria-controls="faq-answer"
                class={styles.question}
                onClick={() => setOpen(i())}
              >
                <span>{question.q}</span>
                {open() === i() && <Icon name="chevronRight" />}
              </button>
            )}
          </For>
        </div>
        <div class={styles.support}>
          <span class={styles['support-icon']}>
            <Icon name="message" />
          </span>
          <div class={styles['support-text']}>
            <strong>{t().marketing.faq.stillQuestion}</strong>
            <span>{t().marketing.faq.replies}</span>
          </div>
          <Button href={links.support}>{t().marketing.faq.contact}</Button>
        </div>
      </div>
      <div id="faq-answer" class={styles.chat} role="tabpanel" aria-labelledby={`faq-${open()}`}>
        <div class={styles.asked}>{item().q}</div>
        <div class={styles.answer}>
          <span class={styles.bee}>
            <Logo size={20} />
          </span>
          <div class={styles.bubble}>{item().a}</div>
        </div>
        <div class={styles.extra}>
          <Switch>
            <Match when={open() === 0}>
              <span class={styles.state}>
                <Icon name="eyeOff" />
                {t().marketing.features.idle}
              </span>
              <span class={styles.state} data-on="">
                <Icon name="check" />
                {t().marketing.features.saving}
              </span>
            </Match>
            <Match when={open() === 1}>
              <div class={shared.actions}>
                <Button variant="primary" href={links.chrome}>
                  {t().marketing.addToChrome}
                </Button>
                <Button href={links.firefox}>{t().marketing.addToFirefox}</Button>
              </div>
              <span class={styles.note}>{t().marketing.faq.laterBrowsers}</span>
            </Match>
            <Match when={open() === 2}>
              <div class={styles.files}>
                <Tag tone="accent" icon={<Icon name="file" />}>
                  honeybees-new-home.pdf
                </Tag>
                <Tag icon={<Icon name="file" />}>field-notes.docx</Tag>
                <Tag tone="neutral" icon={<Icon name="file" />}>
                  whiteboard.jpg
                </Tag>
              </div>
              <span class={styles.note}>{t().marketing.faq.filesFound}</span>
            </Match>
            <Match when={open() === 3}>
              <div class={styles.services}>
                <For each={['Notion', 'Google Docs']}>
                  {(service) => (
                    <div class={styles.service}>
                      <span>{service}</span>
                      <Tag tone="neutral">{t().marketing.faq.comingSoon}</Tag>
                    </div>
                  )}
                </For>
              </div>
            </Match>
            <Match when={open() === 4}>
              <Button icon={<Icon name="download" />} href="/settings/export">
                {t().marketing.faq.export}
              </Button>
              <span class={styles.note}>{t().marketing.faq.exportPath}</span>
            </Match>
            <Match when={open() === 5}>
              <div class={styles.price}>
                <strong>{t().marketing.faq.price}</strong>
                <span>{t().marketing.faq.perMonth}</span>
              </div>
              <Button variant="primary" href={links.trial}>
                {t().marketing.faq.startTrial}
              </Button>
            </Match>
          </Switch>
        </div>
      </div>
    </section>
  );
}
