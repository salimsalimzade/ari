import { Title } from '@solidjs/meta';
import { AuthLayout } from '~/features/auth/auth-layout';
import { ResetPassword } from '~/features/auth/reset-password';
import { useI18n } from '~/i18n/i18n';

/** Public: where the link in a password reset email leads. */
export default function ResetPasswordPage() {
  const { t } = useI18n();
  return (
    <AuthLayout color="pink" quote={t().auth.login.quote}>
      <Title>{t().auth.reset.pageTitle}</Title>
      <ResetPassword />
    </AuthLayout>
  );
}
