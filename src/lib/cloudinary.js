// Cloudinary URL builder. Centralizes the `res.cloudinary.com/{cloud}/...`
// prefix so the cloud name can be swapped via .env (e.g., dev vs. prod
// accounts) without grep-and-replace across data files. Defaults to the
// account currently used in production.
const DEFAULT_CLOUD_NAME =
  import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME ?? 'ds5th9gms';

/**
 * Build a Cloudinary delivery URL.
 *
 * @param {string} publicId — the asset id (with or without extension).
 * @param {object} opts
 * @param {string} [opts.version]  — version segment (e.g. 'v1779097844'); enables far-future caching.
 * @param {string} [opts.folder]   — folder under the image-upload root (e.g. 'guess-the-movie').
 * @param {string} [opts.cloudName]
 */
export function cloudinaryUrl(publicId, { version, folder, cloudName = DEFAULT_CLOUD_NAME } = {}) {
  const segments = [`https://res.cloudinary.com/${cloudName}/image/upload`];
  if (version) segments.push(version);
  if (folder) segments.push(folder);
  segments.push(publicId);
  return segments.join('/');
}
