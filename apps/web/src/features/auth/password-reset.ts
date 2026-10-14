import { ApiError } from '@ari/data-access';

// Timed stand-ins for ari-api's password reset (sequences §11), which ari-api doesn't have yet.
// Once it does: regenerate the types, add these calls to @ari/data-access, and delete this file.

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Emails a reset link to the account with this username or email, at its confirmed email. Throws
 * 404 ACCOUNT_NOT_FOUND when no account has it, 409 NO_EMAIL when the account has no email, and
 * 409 EMAIL_NOT_CONFIRMED when its email isn't confirmed yet. Ask for `no-account`, `no-email` or
 * `unconfirmed-email` (no username can have a "-") to see how the page answers each.
 */
export async function requestPasswordReset(body: { login: string }) {
  await wait(600);
  const login = body.login.trim().toLowerCase();
  if (login === 'no-account') throw new ApiError(404, { code: 'ACCOUNT_NOT_FOUND' });
  if (login === 'no-email') throw new ApiError(409, { code: 'NO_EMAIL' });
  if (login === 'unconfirmed-email') throw new ApiError(409, { code: 'EMAIL_NOT_CONFIRMED' });
}

/**
 * Whose password a reset link changes; checking never uses the link up. Open
 * /reset-password?code=expired (or used, invalid, failed) to see how the page answers ari-api's errors.
 */
export async function checkPasswordReset(body: { code: string }) {
  await wait(400);
  if (body.code === 'expired') throw new ApiError(410, { code: 'CODE_EXPIRED' });
  if (body.code === 'used') throw new ApiError(410, { code: 'CODE_USED' });
  if (body.code === 'invalid') throw new ApiError(401, { code: 'INVALID_CODE' });
  if (body.code === 'failed') throw new ApiError(500);
  // The design's example account.
  return { username: 'salim' };
}

/** Sets the new password and uses the link up. */
export async function resetPassword(_body: { code: string; password: string }) {
  await wait(600);
}
