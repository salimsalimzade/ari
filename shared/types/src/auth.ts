import type { ErrorBody, RequestBody, ResponseBody } from '@ari/utils';
import type { paths } from './schema';

type Login = paths['/api/v1/auth/login']['post'];
type Register = paths['/api/v1/auth/register']['post'];

export type LoginRequest = RequestBody<Login>;
export type LoginResponse = ResponseBody<Login>;
export type LoginError = ErrorBody<Login>;

export type RegisterRequest = RequestBody<Register>;
export type RegisterResponse = ResponseBody<Register>;
export type RegisterError = ErrorBody<Register>;
