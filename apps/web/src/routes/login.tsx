import { Title } from '@solidjs/meta';
import { useLocation } from '@solidjs/router';
import { createSignal, onCleanup, onMount } from 'solid-js';
import { AuthLayout } from '~/features/auth/auth-layout';
import { AuthToast } from '~/features/auth/auth-toast';
import { LoginForm } from '~/features/auth/login-form';
import { useI18n } from '~/i18n/i18n';

export default function Login() {
  const { t } = useI18n();
  const location = useLocation<{ passwordUpdated?: string }>();
  // Whose password /reset-password just changed. It comes in the history state, which the server
  // never sees, so it is read once the page is in the browser.
  const [updatedFor, setUpdatedFor] = createSignal<string>();
  const [toast, setToast] = createSignal(false);
  onMount(() => {
    const username = location.state?.passwordUpdated;
    if (!username) return;
    setUpdatedFor(username);
    setToast(true);
    const timer = setTimeout(() => setToast(false), 9000);
    onCleanup(() => clearTimeout(timer));
  });
  return (
    <AuthLayout color="pink" quote={t().auth.login.quote}>
      <Title>{t().auth.login.pageTitle}</Title>
      <LoginForm username={updatedFor()} />
      <AuthToast text={toast() ? t().auth.reset.done : undefined} />
    </AuthLayout>
  );
}
