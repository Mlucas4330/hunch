import { z } from 'zod'

const UuidSchema = z.string().uuid()

// Path params reach Drizzle untouched, and Postgres raises a cast error on a non-uuid rather than
// returning no rows -- which surfaces as a 500 where the honest answer is "no such thing".
export function isUuid(value: string | null | undefined): value is string {
  return UuidSchema.safeParse(value).success
}
