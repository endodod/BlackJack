const TTL = 15000

let entry = null

export function prefetchStats() {
  if (entry && Date.now() - entry.timestamp < TTL) return
  const promise = fetch('/api/user/stats')
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null)
  entry = { promise, timestamp: Date.now() }
}

export function consumeStatsPrefetch() {
  if (!entry || Date.now() - entry.timestamp >= TTL) {
    entry = null
    return null
  }
  const { promise } = entry
  entry = null
  return promise
}
