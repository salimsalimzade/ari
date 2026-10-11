import { Select } from '@ari/ui-kit';
import { type Language, languages, useI18n } from './i18n';

/** Switches the site's language: "English" on wide screens, "EN" on phones. */
export function LanguageSelect(props: { class?: string }) {
  const { language, setLanguage, t } = useI18n();
  return (
    <Select
      class={props.class}
      options={languages}
      value={language()}
      onChange={(value) => setLanguage(value as Language)}
      label={t().language}
      icon={<GlobeIcon />}
    />
  );
}

// Lucide's globe.
function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}
