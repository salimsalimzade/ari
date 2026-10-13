import { checkUsername } from '@ari/data-access';
import { createEffect, createSignal, on, onCleanup } from 'solid-js';

// The same rule as ari-api's; anything else is the form's own error, not worth asking about.
const usernameRule = /^[A-Za-z0-9_.]{3,30}$/;

/**
 * The live "is it taken?" check on a username field. It asks ari-api 300 ms after the typing
 * stops, only for a valid username that isn't `current` (the user's own), and drops an answer that
 * comes back for an older value. Only "taken" is ever shown; a free name, a pending check and a
 * failed one (offline, too many checks) all say nothing: the submit still decides.
 */
export function createUsernameCheck(username: () => string, current?: () => string | undefined) {
  const [taken, setTaken] = createSignal(false);
  let latest = 0;

  createEffect(
    on(username, (value) => {
      const request = ++latest;
      const wanted = value.trim();
      setTaken(false);
      if (!usernameRule.test(wanted) || wanted.toLowerCase() === current?.()?.toLowerCase()) return;
      const timer = setTimeout(async () => {
        try {
          const { available } = await checkUsername(wanted);
          if (request === latest) setTaken(!available);
        } catch {
          // Nothing to show; the submit still decides.
        }
      }, 300);
      onCleanup(() => clearTimeout(timer));
    }),
  );

  return taken;
}
