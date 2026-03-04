export function normalizeFirebaseStorageUrl(url: string): string {
  if (typeof url !== 'string' || !url) return url;

  // Preserve the original querystring/order as much as possible.
  // Only rewrite the bucket identifier when it is being used as a bucket name.
  try {
    const parsed = new URL(url);

    // 1) https://storage.googleapis.com/<bucket>/<object>
    if (parsed.hostname === 'storage.googleapis.com') {
      const match = url.match(/^(https?:\/\/storage\.googleapis\.com\/)([^/?#]+)([/?#].*)?$/i);
      if (!match) return url;
      const [, prefix, bucket, suffix = ''] = match;
      if (bucket.endsWith('.firebasestorage.app')) {
        const normalizedBucket = bucket.replace(/\.firebasestorage\.app$/i, '.appspot.com');
        return `${prefix}${normalizedBucket}${suffix}`;
      }
      return url;
    }

    // 2) https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<object>
    if (parsed.hostname === 'firebasestorage.googleapis.com') {
      const match = url.match(
        /^(https?:\/\/firebasestorage\.googleapis\.com\/v0\/b\/)([^/]+)(\/o\/.+?)?(\?.*)?(#.*)?$/i
      );
      if (!match) return url;
      const [, prefix, bucket, restPath = '', query = '', hash = ''] = match;
      if (bucket.endsWith('.firebasestorage.app')) {
        const normalizedBucket = bucket.replace(/\.firebasestorage\.app$/i, '.appspot.com');
        return `${prefix}${normalizedBucket}${restPath}${query}${hash}`;
      }
      return url;
    }

    return url;
  } catch {
    return url;
  }
}
