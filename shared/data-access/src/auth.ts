import type {
  ExtensionCodeResponse,
  LoginRequest,
  LoginResponse,
  PasswordResetCheckRequest,
  PasswordResetCheckResponse,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  RegisterRequest,
  RegisterResponse,
  UsernameAvailabilityResponse,
  VerifyEmailRequest,
} from '@ari/types';
import { request } from './client';

// A 401 from these means wrong credentials or no session, so they never refresh.

export function login(body: LoginRequest) {
  return request<LoginResponse>('/api/v1/auth/login', { method: 'POST', body, refresh: false });
}

export function register(body: RegisterRequest) {
  return request<RegisterResponse>('/api/v1/auth/register', {
    method: 'POST',
    body,
    refresh: false,
  });
}

export function logout() {
  return request<void>('/api/v1/auth/logout', { method: 'POST', refresh: false });
}

/** A one-time code that signs the browser extension in as the signed-in user (F13). */
export function createExtensionCode() {
  return request<ExtensionCodeResponse>('/api/v1/me/extension-code', { method: 'POST' });
}

/** Public: whether anybody has the username, for the live check while it is typed. */
export function checkUsername(username: string) {
  return request<UsernameAvailabilityResponse>(
    `/api/v1/auth/username-available?username=${encodeURIComponent(username)}`,
    { refresh: false },
  );
}

/** Public: the link may be opened signed out, and its 401 means a bad link, not a lost session. */
export function verifyEmail(body: VerifyEmailRequest) {
  return request<void>('/api/v1/auth/verify-email', { method: 'POST', body, refresh: false });
}

// A forgotten password is public: the user is signed out, and a 401 means a bad link.

/**
 * Emails a reset link to the account with this username or verified email. Its errors say why
 * none was sent: ACCOUNT_NOT_FOUND, NO_EMAIL, EMAIL_NOT_CONFIRMED or RATE_LIMITED.
 */
export function requestPasswordReset(body: PasswordResetRequest) {
  return request<void>('/api/v1/auth/password-reset', { method: 'POST', body, refresh: false });
}

/** Whose password a reset link changes; checking never uses the link up. */
export function checkPasswordReset(body: PasswordResetCheckRequest) {
  return request<PasswordResetCheckResponse>('/api/v1/auth/password-reset/check', {
    method: 'POST',
    body,
    refresh: false,
  });
}

/** Sets the new password and uses the link up; every session of the account ends. */
export function resetPassword(body: PasswordResetConfirmRequest) {
  return request<void>('/api/v1/auth/password-reset/confirm', {
    method: 'POST',
    body,
    refresh: false,
  });
}
