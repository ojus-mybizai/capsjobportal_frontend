const cache = new Map();

export function cachedRequest(key, fetcher, { ttlMs } = {}) {
  const now = Date.now();
  const entry = cache.get(key);

  if (entry) {
    if (entry.value !== undefined) {
      if (!entry.expiresAt || entry.expiresAt > now) {
        return Promise.resolve(entry.value);
      }
      cache.delete(key);
    } else if (entry.promise) {
      return entry.promise;
    }
  }

  const promise = Promise.resolve()
    .then(() => fetcher())
    .then((value) => {
      cache.set(key, {
        value,
        expiresAt: typeof ttlMs === "number" && ttlMs > 0 ? now + ttlMs : null,
      });
      return value;
    })
    .catch((error) => {
      cache.delete(key);
      throw error;
    });

  cache.set(key, {
    promise,
    expiresAt: typeof ttlMs === "number" && ttlMs > 0 ? now + ttlMs : null,
  });

  return promise;
}

export function clearRequestCache(prefix) {
  if (!prefix) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (String(key).startsWith(String(prefix))) {
      cache.delete(key);
    }
  }
}
