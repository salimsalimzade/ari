import { HighlightMark, highlightColors, TextField } from '@ari/ui-kit';
import { For } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import { fill } from './format';
import styles from './sections.module.scss';
import { useSettings } from './settings-store';

/** The default color in words, with its name when it has one: "Yellow · Key idea". */
export function useDefaultColorName() {
  const { t } = useI18n();
  const settings = useSettings();
  return () => {
    const color = settings.defaultColor();
    const name = settings.colorNames[color].trim();
    return name ? `${t().colors.names[color]} · ${name}` : t().colors.names[color];
  };
}

/**
 * The color new highlights get, and optional names for the five colors. Changes apply as they're
 * made; they stay in the page until ari-api can store them.
 */
export function HighlightColors() {
  const { t } = useI18n();
  const settings = useSettings();
  const defaultName = useDefaultColorName();

  return (
    <section class={styles.card}>
      <h2 class={styles.heading}>{t().settings.colors}</h2>
      <p class={styles.text}>{t().colors.intro}</p>
      <div class={styles.colors} role="radiogroup" aria-label={t().colors.defaultLabel}>
        <For each={highlightColors}>
          {(color) => (
            <div class={styles.color}>
              <span class={styles.swatch} data-color={color} />
              <TextField
                label={fill(t().colors.nameLabel, { color: t().colors.names[color] })}
                hideLabel
                size="lg"
                class={styles['color-name']}
                value={settings.colorNames[color]}
                onChange={(name) => settings.setColorName(color, name)}
              />
              <label class={styles.default}>
                <input
                  type="radio"
                  name="default-color"
                  class={styles.radio}
                  aria-label={t().colors.names[color]}
                  checked={settings.defaultColor() === color}
                  onChange={() => settings.setDefaultColor(color)}
                />
                <span class={styles['default-dot']} />
                {t().colors.default}
              </label>
            </div>
          )}
        </For>
      </div>
      <div class={styles.preview}>
        <span class={styles.overline}>{t().colors.preview}</span>
        <p class={styles['preview-quote']}>
          <HighlightMark color={settings.defaultColor()}>{t().colors.previewQuote}</HighlightMark>{' '}
          {t().colors.previewRest}
        </p>
        <span class={styles.caption}>{fill(t().colors.previewNote, { name: defaultName() })}</span>
      </div>
    </section>
  );
}
