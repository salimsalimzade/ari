import type { ErrorBody, RequestBody, ResponseBody } from '@ari/utils';
import type { paths } from './schema';

type Me = paths['/api/v1/me']['get'];
type ChangeEmail = paths['/api/v1/me/email']['put'];
type ResendEmailLink = paths['/api/v1/me/email/resend']['post'];
type UpdateProfile = paths['/api/v1/me']['put'];
type ChangePhoto = paths['/api/v1/me/photo']['put'];

export type MeResponse = ResponseBody<Me>;
export type MeError = ErrorBody<Me>;

export type ChangeEmailRequest = RequestBody<ChangeEmail>;
export type ChangeEmailResponse = ResponseBody<ChangeEmail>;

export type ResendEmailLinkResponse = ResponseBody<ResendEmailLink>;

export type UpdateProfileRequest = RequestBody<UpdateProfile>;
export type UpdateProfileResponse = ResponseBody<UpdateProfile>;

export type ChangePhotoResponse = ResponseBody<ChangePhoto>;
