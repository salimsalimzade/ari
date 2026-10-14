import {
  ApiError,
  checkPasswordReset,
  fetchMe,
  login,
  logout,
  register,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from '@ari/data-access';
import type { LoginRequest, RegisterRequest } from '@ari/types';
import { action, json, query, redirect } from '@solidjs/router';
import { signOutExtension } from './extension-sign-in';

/**
 * The signed-in user; without a session it goes to /login. Undefined while ari-api can't be
 * reached (no answer, or a server error), so a page still renders around it.
 */
export const getMe = query(async () => {
  try {
    return await fetchMe();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw redirect('/login');
    if (error instanceof ApiError && isUnreachable(error)) return undefined;
    throw error;
  }
}, 'me');

/** ari-api gave no answer, or a server error: it may answer when asked again. */
export const isUnreachable = (error: ApiError) => error.status === 0 || error.status >= 500;

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
      const { username } = await checkPasswordReset({ code });
      return username ? { username } : { problem: 'failed' };
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

/**
 * Public: sets the new password with the code from a reset link, which it uses up. It revalidates
 * nothing: checking the link again would find it used and show that before the page moves on.
 */
export const resetPasswordAction = action(async (body: { code: string; password: string }) => {
  await resetPassword(body);
  return json(undefined, { revalidate: [] });
}, 'reset-password');
