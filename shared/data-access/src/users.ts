import type { MeResponse } from '@ari/types';
import { request } from './client';

export function fetchMe() {
  return request<MeResponse>('/api/v1/me');
}
