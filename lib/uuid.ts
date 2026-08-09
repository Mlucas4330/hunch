import { z } from 'zod'

const UuidSchema = z.string().uuid()

export function isUuid(value: string | null | undefined): value is string {
  return UuidSchema.safeParse(value).success
}
