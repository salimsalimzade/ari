import { refreshSession } from '@ari/data-access';
import { createMiddleware } from '@solidjs/start/middleware';

declare global {
  namespace App {
    interface RequestEventLocals {
      /** The Cookie header with the refreshed tokens, for the ari-api calls of this render. */
      cookie?: string;
    }
  }
}

const hasCookie = (cookie: string, name: string) => new RegExp(`(?:^|;\\s*)${name}=`).test(cookie);

// Before a page renders: when ari_access has expired but ari_refresh is still there, refresh first,
// so the page's data loads signed in (sequences §2).
export default createMiddleware({
  onRequest: async (event) => {
    // Pages only: the asset requests that follow would each spend the same refresh token.
    if (!event.request.headers.get('accept')?.includes('text/html')) return;
    const cookie = event.request.headers.get('cookie') ?? '';
    if (!hasCookie(cookie, 'ari_refresh') || hasCookie(cookie, 'ari_access')) return;

    const setCookies = await refreshSession(cookie);
    if (!setCookies) return;
    for (const header of setCookies) event.response.headers.append('set-cookie', header);
    // The new tokens replace the old ones in the Cookie header that ari-api gets during this render.
    const pairs = new Map(cookie.split(/;\s*/).map((pair) => [pair.split('=')[0], pair]));
    for (const header of setCookies) {
      const pair = header.split(';')[0];
      pairs.set(pair.split('=')[0], pair);
    }
    event.locals.cookie = [...pairs.values()].join('; ');
  },
});
