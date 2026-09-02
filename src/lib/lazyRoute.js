import { lazy } from 'react';

/* Route-level lazy() that survives a deployment.
 *
 * Every build gives each chunk a new content hash. A tab left open across a
 * deploy is still running the OLD index.html, so the first route it navigates
 * to asks for a chunk filename that no longer exists on the server. The
 * failure is confusing rather than obvious, because vercel.json's SPA rewrite
 * used to answer that 404 with index.html at status 200:
 *
 *   Failed to load module script: Expected a JavaScript-or-Wasm module script
 *   but the server responded with a MIME type of "text/html".
 *
 * vercel.json now excludes /assets/ from the rewrite, so a rotated chunk 404s
 * honestly. This handles the other half: a missing chunk means "you are on a
 * stale build", and the fix for that is to reload and pick up the current
 * index.html. Doing it automatically costs the player one blink instead of a
 * dead screen mid-game.
 *
 * The sessionStorage flag is what stops a genuine, permanent load failure
 * (offline, a bad deploy, an ad blocker) from becoming a reload loop: the
 * second consecutive failure rethrows and reaches the error boundary. It is
 * cleared as soon as any route chunk loads, so the guard is always spent on
 * one reload per problem, not one per session.
 */
const RELOAD_FLAG = 'uah.chunk_reload';

// Private-mode Safari throws on sessionStorage rather than returning null.
const flag = {
  get: () => { try { return sessionStorage.getItem(RELOAD_FLAG); } catch { return null; } },
  set: () => { try { sessionStorage.setItem(RELOAD_FLAG, '1'); } catch { /* no memory: reload once, then the error surfaces */ } },
  clear: () => { try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* nothing to clear */ } },
};

export default function lazyRoute(factory) {
  return lazy(() =>
    factory()
      .then((mod) => { flag.clear(); return mod; })
      .catch((err) => {
        if (flag.get()) throw err; // already reloaded once — this is a real failure
        flag.set();
        window.location.reload();
        // The reload replaces the page; resolving or rejecting here would only
        // race it and flash an error boundary on the way out.
        return new Promise(() => {});
      }),
  );
}
