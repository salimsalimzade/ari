import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '@ari/types';
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
