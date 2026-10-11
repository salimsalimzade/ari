/**
 * Type helpers for one operation of the types openapi-typescript generates, e.g.
 * `paths['/api/v1/auth/login']['post']`. They read only the operation's shape, so they work with
 * any generated schema without importing it.
 */
type Operation = { requestBody?: unknown; responses: object };

// Every other status an operation declares (4xx, 5xx, `default`) is an error.
type SuccessStatus = 200 | 201 | 202 | 203 | 204 | 206;

type Responses<Op extends Operation> = Op['responses'];

// The body of whichever media type a request or response declares; `never` when it has none.
type Content<T> = T extends { content: infer C } ? C[keyof C] : never;

/** The body the operation accepts. */
export type RequestBody<Op extends Operation> = Content<NonNullable<Op['requestBody']>>;

/** The body of the operation's success (2xx) responses; `never` when they have none. */
export type ResponseBody<Op extends Operation> = Content<
  Responses<Op>[Extract<keyof Responses<Op>, SuccessStatus>]
>;

/** The body of every error response the operation declares: 4xx, 5xx and `default`. */
export type ErrorBody<Op extends Operation> = Content<
  Responses<Op>[Exclude<keyof Responses<Op>, SuccessStatus>]
>;
