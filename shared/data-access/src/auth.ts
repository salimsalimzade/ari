import type {
  LoginRequest,
  LoginResponse,
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
