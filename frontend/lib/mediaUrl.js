/**
 * The one place a lesson media URL is built.
 *
 * Media used to be answered by two different origins depending on its type:
 * stills came from the API host, while video, posters, audio-cache and sfx were
 * whatever `/public` happened to contain. Each of those five call sites built
 * its own string with its own cache-bust constant, which is why the two origins
 * drifted apart without anyone noticing.
 *
 * `NEXT_PUBLIC_MEDIA_BASE_URL` points at the object store. When it is unset the
 * caller's `fallbackBase` decides, so an unconfigured environment behaves
 * exactly as it did before this file existed -- that is the rollback, and it is
 * why the fallback is a required thought at each call site rather than a single
 * global default.
 */

const MEDIA_BASE_URL = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "").replace(/\/$/, "");

export function hasMediaBaseUrl() {
  return MEDIA_BASE_URL !== "";
}

/**
 * @param {string} path        root-relative, e.g. "/lesson-assets/boy.webp".
 *                             An absolute http(s) URL is passed through.
 * @param {string} [version]   cache-bust value appended as ?v=
 * @param {string} [fallbackBase] origin to use when the media base is unset.
 *                             "" means root-relative.
 */
export function mediaUrl(path, version, fallbackBase = "") {
  if (!path) {
    return path;
  }

  const absolute = /^https?:\/\//i.test(path);
  const base = absolute ? "" : MEDIA_BASE_URL || fallbackBase.replace(/\/$/, "");

  return withVersion(`${base}${path}`, version);
}

/**
 * Eleven lesson refs carry their own ?v= already -- a per-asset bust recorded
 * when that one image was re-rendered. Appending the global version as a second
 * `v` produced `?v=<per-asset>&v=<global>`, which parsers resolve last-wins, so
 * the per-asset bust was silently discarded.
 *
 * Both are meant to invalidate, so they are combined into one value rather than
 * one overwriting the other. Concatenating with a dash matches how api.js
 * already stacks STATIC_ASSET_VERSION with CORRECTED_ONE_ASSET_VERSION.
 */
function withVersion(url, version) {
  if (!version) {
    return url;
  }

  const hashAt = url.indexOf("#");
  const hash = hashAt === -1 ? "" : url.slice(hashAt);
  const withoutHash = hashAt === -1 ? url : url.slice(0, hashAt);

  const queryAt = withoutHash.indexOf("?");
  if (queryAt === -1) {
    return `${withoutHash}?v=${encodeURIComponent(version)}${hash}`;
  }

  const path = withoutHash.slice(0, queryAt);
  const params = new URLSearchParams(withoutHash.slice(queryAt + 1));
  const existing = params.get("v");
  params.set("v", existing ? `${existing}-${version}` : version);

  return `${path}?${params.toString()}${hash}`;
}
