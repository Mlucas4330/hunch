// Runs before the server on every boot. Plain ESM over drizzle-orm's runtime migrator rather than
// `drizzle-kit migrate`, because `output: standalone` leaves drizzle-kit (a devDependency) out of the
// runtime image. Cannot import db/index.ts: that resolves through the `@/` alias the Next build
// provides, which plain node does not.
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

// `max: 1` because drizzle takes an advisory lock for the duration: a pool would let one connection
// hold the lock while another waits on it for a connection that never frees. `onnotice` is silenced
// because the migrator's own CREATE SCHEMA IF NOT EXISTS emits two notices on every boot after the
// first, and postgres.js dumps them as full objects -- noise in front of the one line that matters.
const client = postgres(connectionString, { max: 1, onnotice: () => {} })

try {
  await migrate(drizzle(client), { migrationsFolder: './db/migrations' })
  console.log('migrations up to date')
} catch (error) {
  console.error('migration failed', error)
  process.exitCode = 1
} finally {
  await client.end()
}
