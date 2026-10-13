import { ApiError, fetchMe, login, logout, register, verifyEmail } from '@ari/data-access';
import type { LoginRequest, RegisterRequest } from '@ari/types';
import { action, query, redirect } from '@solidjs/router';

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
  throw redirect('/login');
}, 'logout');

/** Public: confirms the email whose verify link was opened, with the code from that link. */
export const verifyEmailAction = action((code: string) => verifyEmail({ code }), 'verify-email');
