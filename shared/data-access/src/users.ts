import type {
  ChangeEmailRequest,
  ChangeEmailResponse,
  ChangePhotoResponse,
  MeResponse,
  ResendEmailLinkResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from '@ari/types';
import { request } from './client';

export function fetchMe() {
  return request<MeResponse>('/api/v1/me');
}

/** Makes it the pending email and emails it a verify link, in the `ari_lang` cookie's language. */
export function changeEmail(body: ChangeEmailRequest) {
  return request<ChangeEmailResponse>('/api/v1/me/email', { method: 'PUT', body });
}

export function resendEmailLink() {
  return request<ResendEmailLinkResponse>('/api/v1/me/email/resend', { method: 'POST' });
}

/** Removes the verified and the pending email. */
export function removeEmail() {
  return request<void>('/api/v1/me/email', { method: 'DELETE' });
}

/** Changes the full name, username and date of birth (an ISO date). */
export function updateProfile(body: UpdateProfileRequest) {
  return request<UpdateProfileResponse>('/api/v1/me', { method: 'PUT', body });
}

/** Uploads the cropped photo as the multipart field `photo`; ari-api replaces the old one. */
export function changePhoto(photo: Blob) {
  const body = new FormData();
  body.append('photo', photo, 'photo.jpg');
  return request<ChangePhotoResponse>('/api/v1/me/photo', { method: 'PUT', body });
}

export function removePhoto() {
  return request<void>('/api/v1/me/photo', { method: 'DELETE' });
}
