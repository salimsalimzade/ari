import { Title } from '@solidjs/meta';
import { AuthLayout } from '~/features/auth/auth-layout';
import { RegisterForm } from '~/features/auth/register-form';
import { useI18n } from '~/i18n/i18n';

export default function Register() {
  const { t } = useI18n();
  return (
    <AuthLayout color="blue" quote={t().auth.register.quote}>
      <Title>{t().auth.register.pageTitle}</Title>
      <RegisterForm />
    </AuthLayout>
  );
}
