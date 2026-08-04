// The snippet and the public report run on customer domains we do not know in advance, so the
// wildcard is the point. It is only safe while Access-Control-Allow-Credentials is absent: adding
// it would expose session-authenticated responses to every origin on the internet. Never add it.
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin'
}

export function preflight(methods = 'POST, OPTIONS') {
  return new Response(null, {
    status: 204,
    headers: { ...CORS_HEADERS, 'Access-Control-Allow-Methods': `${methods}` }
  })
}
