import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

// Pinned to globalThis for the same reason as the Redis client: `next dev` re-evaluates this module on
// every edit, and a pool per evaluation holds its connections until Postgres refuses new ones.
const globalForDb = globalThis as unknown as { dbClient?: ReturnType<typeof postgres> }

const client = globalForDb.dbClient ?? postgres(connectionString)
if (process.env.NODE_ENV !== 'production') globalForDb.dbClient = client

export const db = drizzle(client, { schema })
