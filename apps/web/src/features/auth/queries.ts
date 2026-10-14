import { ApiError, fetchMe, login, logout, register, verifyEmail } from '@ari/data-access';
import type { LoginRequest, RegisterRequest } from '@ari/types';
import { action, query, redirect } from '@solidjs/router';
import { signOutExtension } from './extension-sign-in';
import { checkPasswordReset, requestPasswordReset, resetPassword } from './password-reset';

/** The signed-in user; without a session it goes to /login. */
export const getMe = query(async () => {
  try {
    return await fetchMe();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw redirect('/login');
    throw error;
  }
}, 'me');

// Each throws the ApiError of a failed request, for the form to show.

export const loginAction = action(async (body: LoginRequest) => {
  await login(body);
  throw redirect('/library');
}, 'login');

export const registerAction = action(async (body: RegisterRequest) => {
  await register(body);
  throw redirect('/library');
}, 'register');

export const logoutAction = action(async () => {
  await logout();
  signOutExtension();
  throw redirect('/login');
}, 'logout');

/** Public: confirms the email whose verify link was opened, with the code from that link. */
export const verifyEmailAction = action((code: string) => verifyEmail({ code }), 'verify-email');

/** Public: emails a reset link for a username or a confirmed email. */
export const requestPasswordResetAction = action(
  (login: string) => requestPasswordReset({ login }),
  'request-password-reset',
);

/** Why a reset link doesn't work. */
export type ResetLinkProblem = 'expired' | 'used' | 'invalid' | 'failed';

/** The problem an error means when it is about the reset link's code. */
export function resetLinkProblem(error: unknown): ResetLinkProblem | undefined {
  if (!(error instanceof ApiError)) return undefined;
  if (error.code === 'CODE_EXPIRED') return 'expired';
  if (error.code === 'CODE_USED') return 'used';
  if (error.code === 'INVALID_CODE') return 'invalid';
  return undefined;
}

/** Public: whose password a reset link's code changes, or why the link doesn't work. */
export const getPasswordReset = query(
  async (code: string): Promise<{ username: string } | { problem: ResetLinkProblem }> => {
    if (!code) return { problem: 'invalid' };
    try {
      return { username: (await checkPasswordReset({ code })).username };
    } catch (error) {
      // The code is all ari-api checks here, so an invalid body is an incomplete link.
      if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') {
        return { problem: 'invalid' };
      }
      return { problem: resetLinkProblem(error) ?? 'failed' };
    }
  },
  'password-reset',
);

/** Public: sets the new password with the code from a reset link, which it uses up. */
export const resetPasswordAction = action(
  (body: { code: string; password: string }) => resetPassword(body),
  'reset-password',
);
