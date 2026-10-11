import { type Accessor, createContext, createSignal, type JSX, useContext } from 'solid-js';
import { getRequestEvent, isServer } from 'solid-js/web';
import { az } from './az';
import { type Dictionary, en } from './en';

export type Language = 'en' | 'az';

/** Each language named in itself; phones show the short label. */
export const languages: { value: Language; label: string; shortLabel: string }[] = [
  { value: 'en', label: 'English', shortLabel: 'EN' },
  { value: 'az', label: 'Azərbaycan', shortLabel: 'AZ' },
];

const dictionaries: Record<Language, Dictionary> = { en, az };

// The choice is kept in a cookie, so the server renders the page in it too.
const cookiePattern = /(?:^|;\s*)ari_lang=(en|az)(?:;|$)/;

/** The language a Cookie header asks for; English when it asks for none. */
export function languageFromCookie(cookie: string | null | undefined): Language {
  return (cookie?.match(cookiePattern)?.[1] as Language | undefined) ?? 'en';
}

type I18n = {
  language: Accessor<Language>;
  setLanguage: (language: Language) => void;
  /** The current language's text. */
  t: Accessor<Dictionary>;
};

const I18nContext = createContext<I18n>();

export function I18nProvider(props: { children: JSX.Element }) {
  const cookie = isServer ? getRequestEvent()?.request.headers.get('cookie') : document.cookie;
  const [language, setLanguageSignal] = createSignal(languageFromCookie(cookie));

  const setLanguage = (next: Language) => {
    setLanguageSignal(next);
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    void cookieStore.set({
      name: 'ari_lang',
      value: next,
      path: '/',
      expires: Date.now() + oneYear,
      sameSite: 'lax',
    });
    document.documentElement.lang = next;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t: () => dictionaries[language()] }}>
      {props.children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error('useI18n needs an I18nProvider above it');
  return i18n;
}
