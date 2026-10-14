import type { ErrorBody, RequestBody, ResponseBody } from '@ari/utils';
import type { paths } from './schema';

type Login = paths['/api/v1/auth/login']['post'];
type Register = paths['/api/v1/auth/register']['post'];
type VerifyEmail = paths['/api/v1/auth/verify-email']['post'];
type PasswordReset = paths['/api/v1/auth/password-reset']['post'];
type PasswordResetCheck = paths['/api/v1/auth/password-reset/check']['post'];
type PasswordResetConfirm = paths['/api/v1/auth/password-reset/confirm']['post'];
type UsernameAvailable = paths['/api/v1/auth/username-available']['get'];
type ExtensionCode = paths['/api/v1/me/extension-code']['post'];
type ExtensionToken = paths['/api/v1/auth/extension/token']['post'];
type ExtensionRefresh = paths['/api/v1/auth/extension/refresh']['post'];

export type LoginRequest = RequestBody<Login>;
export type LoginResponse = ResponseBody<Login>;
export type LoginError = ErrorBody<Login>;

export type RegisterRequest = RequestBody<Register>;
export type RegisterResponse = ResponseBody<Register>;
export type RegisterError = ErrorBody<Register>;

export type VerifyEmailRequest = RequestBody<VerifyEmail>;

// A forgotten password: a link to the account's verified email, then a new password.
export type PasswordResetRequest = RequestBody<PasswordReset>;
export type PasswordResetCheckRequest = RequestBody<PasswordResetCheck>;
export type PasswordResetCheckResponse = ResponseBody<PasswordResetCheck>;
export type PasswordResetConfirmRequest = RequestBody<PasswordResetConfirm>;

export type UsernameAvailabilityResponse = ResponseBody<UsernameAvailable>;

// The browser extension's own session (F13): a code from the signed-in website, then tokens.
export type ExtensionCodeResponse = ResponseBody<ExtensionCode>;
export type ExtensionTokenRequest = RequestBody<ExtensionToken>;
export type ExtensionTokensResponse = ResponseBody<ExtensionToken>;
export type ExtensionRefreshRequest = RequestBody<ExtensionRefresh>;
