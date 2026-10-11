import { Title } from '@solidjs/meta';
import { AuthLayout } from '~/features/auth/auth-layout';
import { LoginForm } from '~/features/auth/login-form';
import { useI18n } from '~/i18n/i18n';

export default function Login() {
  const { t } = useI18n();
  return (
    <AuthLayout color="pink" quote={t().auth.login.quote}>
      <Title>{t().auth.login.pageTitle}</Title>
      <LoginForm />
    </AuthLayout>
  );
}
