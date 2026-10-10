import type { RequestBody, ResponseBody } from '../openapi/helpers';

export type LoginRequest = RequestBody<'/api/v1/auth/login', 'post'>;
export type LoginResponse = ResponseBody<'/api/v1/auth/login', 'post'>;

export type RegisterRequest = RequestBody<'/api/v1/auth/register', 'post'>;
export type RegisterResponse = ResponseBody<'/api/v1/auth/register', 'post'>;
