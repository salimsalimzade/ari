import { Title } from '@solidjs/meta';
import { AuthLayout } from '~/features/auth/auth-layout';
import { ForgotPasswordForm } from '~/features/auth/forgot-password-form';
import { useI18n } from '~/i18n/i18n';

/** Public: asks for a link to choose a new password. */
export default function ForgotPasswordPage() {
  const { t } = useI18n();
  return (
    <AuthLayout color="pink" quote={t().auth.login.quote}>
      <Title>{t().auth.forgot.pageTitle}</Title>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
