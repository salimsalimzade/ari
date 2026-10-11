import { Button, Logo, SegmentedControl } from '@ari/ui-kit';
import { A } from '@solidjs/router';
import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import { type Language, languages, useI18n } from '~/i18n/i18n';
import { LanguageSelect } from '~/i18n/language-select';
import { Icon } from './icons';
import { links } from './links';
import styles from './site-header.module.scss';

export type SiteHeaderProps = {
  /** Where "Pricing" goes: the landing page's section, or the pricing page (marked as current). */
  pricingHref?: '/#pricing' | '/pricing';
};

/**
 * The marketing pages' top bar: logo, section links, language, Log in and Add to Chrome. Below
 * 1024px the links move into a menu, which on phones fills the screen and also holds the trial,
 * Log in and the language.
 */
export function SiteHeader(props: SiteHeaderProps) {
  const { t, language, setLanguage } = useI18n();
  const [menuOpen, setMenuOpen] = createSignal(false);
  const sections = () => [
    { href: '/#how', label: t().marketing.nav.how },
    { href: '/#features', label: t().marketing.nav.features },
    { href: props.pricingHref ?? '/#pricing', label: t().marketing.nav.pricing },
    { href: '/#faq', label: t().marketing.nav.faq },
  ];
  const close = () => setMenuOpen(false);
  let menuButton!: HTMLButtonElement;

  // While the menu is open: Escape closes it, and the page under the phone menu doesn't scroll.
  createEffect(() => {
    if (!menuOpen()) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      close();
      menuButton.focus();
    };
    document.addEventListener('keydown', onKey);
    document.documentElement.dataset.menuOpen = '';
    onCleanup(() => {
      document.removeEventListener('keydown', onKey);
      delete document.documentElement.dataset.menuOpen;
    });
  });

  return (
    <header class={styles.header}>
      <A href="/" class={styles.brand} aria-label="Ari">
        <Logo wordmark="lg" />
      </A>
      <nav class={styles.links} aria-label={t().marketing.nav.label}>
        <For each={sections()}>
          {(section) => (
            // Only a page of its own (/pricing) is marked; the others are sections of the landing.
            <A
              href={section.href}
              activeClass={section.href.includes('#') ? '' : styles.current}
              inactiveClass=""
              end
            >
              {section.label}
            </A>
          )}
        </For>
      </nav>
      <LanguageSelect />
      <Button variant="ghost" href={links.logIn} class={styles['log-in']}>
        {t().marketing.nav.logIn}
      </Button>
      <Button variant="primary" href={links.chrome} class={styles.install}>
        {t().marketing.addToChrome}
      </Button>
      <Button
        ref={menuButton}
        iconOnly
        icon={<Icon name="menu" size="md" />}
        aria-label={t().marketing.nav.menu}
        aria-expanded={menuOpen()}
        aria-controls="site-menu"
        class={styles['menu-button']}
        onClick={() => setMenuOpen(!menuOpen())}
      />
      <Show when={menuOpen()}>
        <div id="site-menu" class={styles.menu}>
          <div class={styles['menu-top']}>
            <Logo wordmark="md" size={28} />
            <Button
              iconOnly
              icon={<Icon name="close" size="md" />}
              aria-label={t().marketing.nav.closeMenu}
              class={styles['menu-close']}
              onClick={() => {
                close();
                menuButton.focus();
              }}
            />
          </div>
          <nav class={styles['menu-links']} aria-label={t().marketing.nav.label}>
            <For each={sections()}>
              {(section) => (
                <A href={section.href} class={styles['menu-link']} onClick={close}>
                  <span>{section.label}</span>
                  <Icon name="chevronRight" size="md" />
                </A>
              )}
            </For>
          </nav>
          <div class={styles['menu-actions']}>
            <Button
              variant="primary"
              href={links.trial}
              class={styles['phone-only']}
              onClick={close}
            >
              {t().marketing.faq.startTrial}
            </Button>
            <Button href={links.logIn} onClick={close}>
              {t().marketing.nav.logIn}
            </Button>
            <Button
              variant="primary"
              href={links.chrome}
              class={styles['wide-only']}
              onClick={close}
            >
              {t().marketing.addToChrome}
            </Button>
          </div>
          <div class={`${styles['menu-language']} ${styles['phone-only']}`}>
            <span class={styles.overline}>{t().marketing.nav.language}</span>
            <SegmentedControl
              block
              label={t().marketing.nav.language}
              value={language()}
              onChange={(value) => setLanguage(value as Language)}
              options={languages.map((item) => ({ value: item.value, label: item.label }))}
            />
          </div>
          <p class={`${styles['menu-note']} ${styles['phone-only']}`}>
            <Icon name="monitor" />
            {t().marketing.hero.extensionNote}
          </p>
        </div>
      </Show>
    </header>
  );
}
