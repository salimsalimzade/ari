import {
  changeEmail,
  changePhoto,
  removeEmail,
  removePhoto,
  resendEmailLink,
  updateProfile,
} from '@ari/data-access';
import type { UpdateProfileRequest } from '@ari/types';
import { action } from '@solidjs/router';

// Each throws the ApiError of a failed request, for the page to show. After one finishes, the
// router reloads getMe, so every section (and the sidebar) shows the account's new state.

/** Full name, username and date of birth (an ISO date). */
export const updateProfileAction = action(
  (body: UpdateProfileRequest) => updateProfile(body),
  'update-profile',
);

/** The cropped photo; ari-api replaces the old one. */
export const changePhotoAction = action((photo: Blob) => changePhoto(photo), 'change-photo');

export const removePhotoAction = action(() => removePhoto(), 'remove-photo');

/** Makes it the pending email; ari-api emails it a verify link. */
export const changeEmailAction = action((email: string) => changeEmail({ email }), 'change-email');

export const resendEmailLinkAction = action(() => resendEmailLink(), 'resend-email-link');

export const removeEmailAction = action(() => removeEmail(), 'remove-email');
