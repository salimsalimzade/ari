import type { ErrorBody, ResponseBody } from '@ari/utils';
import type { paths } from './schema';

type Me = paths['/api/v1/me']['get'];

export type MeResponse = ResponseBody<Me>;
export type MeError = ErrorBody<Me>;
