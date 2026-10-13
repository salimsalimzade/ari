import type { ErrorBody, RequestBody, ResponseBody } from '@ari/utils';
import type { paths } from './schema';

type Login = paths['/api/v1/auth/login']['post'];
type Register = paths['/api/v1/auth/register']['post'];
type VerifyEmail = paths['/api/v1/auth/verify-email']['post'];
type UsernameAvailable = paths['/api/v1/auth/username-available']['get'];

export type LoginRequest = RequestBody<Login>;
export type LoginResponse = ResponseBody<Login>;
export type LoginError = ErrorBody<Login>;

export type RegisterRequest = RequestBody<Register>;
export type RegisterResponse = ResponseBody<Register>;
export type RegisterError = ErrorBody<Register>;

export type VerifyEmailRequest = RequestBody<VerifyEmail>;

export type UsernameAvailabilityResponse = ResponseBody<UsernameAvailable>;
