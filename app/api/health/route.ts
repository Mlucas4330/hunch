// Imports nothing on purpose. A failing healthcheck gates the deploy, so anything this route touches
// becomes a rollback trigger. See docs/deployment.md.
export const dynamic = 'force-dynamic'

export function GET() {
  return new Response('ok', {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
  })
}
