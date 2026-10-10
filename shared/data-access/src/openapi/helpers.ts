import type { paths } from './schema';

type Path = keyof paths;
type Method = 'get' | 'put' | 'post' | 'delete' | 'patch';
type SuccessStatus = 200 | 201 | 202 | 204;

type Operation<P extends Path, M extends Method> = NonNullable<paths[P][M]>;

// The body of any media type ari-api declares (it sends `*/*` for JSON responses today).
type Content<T> = T extends { content: infer C } ? C[keyof C] : never;

/** The JSON body an endpoint accepts, e.g. `RequestBody<'/api/v1/auth/login', 'post'>`. */
export type RequestBody<P extends Path, M extends Method> =
  Operation<P, M> extends { requestBody?: infer B } ? Content<NonNullable<B>> : never;

/**
 * The body an endpoint returns for a status, by default its success (2xx) body,
 * e.g. `ResponseBody<'/api/v1/me', 'get'>`. `never` when the response has no body.
 */
export type ResponseBody<
  P extends Path,
  M extends Method,
  S extends keyof Operation<P, M>['responses'] = Extract<
    keyof Operation<P, M>['responses'],
    SuccessStatus
  >,
> = Content<Operation<P, M>['responses'][S]>;
