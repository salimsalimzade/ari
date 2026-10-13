import { Title } from '@solidjs/meta';
import { AuthLayout } from '~/features/auth/auth-layout';
import { VerifyEmail } from '~/features/auth/verify-email';
import { useI18n } from '~/i18n/i18n';

/** Public: where the link in a verify email leads. */
export default function VerifyEmailPage() {
  const { t } = useI18n();
  return (
    <AuthLayout color="green" quote={t().verifyEmail.quote}>
      <Title>{t().verifyEmail.pageTitle}</Title>
      <VerifyEmail />
    </AuthLayout>
  );
}
