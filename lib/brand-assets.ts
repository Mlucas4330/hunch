import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import {
  BRAND_FILENAME_PATTERN,
  BRAND_LOGO_SIGNATURES,
  BRAND_PUBLIC_PATH
} from '@/lib/constants'

export type BrandLogoType = (typeof BRAND_LOGO_SIGNATURES)[number]['ext']

export function brandStorageReady(): boolean {
  return Boolean(process.env.BRAND_DIR)
}

// The only way from a request to a file: a name saveBrandLogo could have written, inside BRAND_DIR.
export function brandLogoPath(file: string): string | null {
  const dir = process.env.BRAND_DIR

  if (!dir || !BRAND_FILENAME_PATTERN.test(file)) return null

  const root = resolve(dir)
  const path = resolve(root, file)

  if (!path.startsWith(root + sep)) return null

  return path
}

export function sniffBrandLogoType(bytes: Uint8Array): BrandLogoType | null {
  for (const signature of BRAND_LOGO_SIGNATURES) {
    if (signature.bytes.every((byte, i) => bytes[i] === byte)) return signature.ext
  }

  return null
}

export function brandLogoContentType(file: string): string {
  return file.endsWith('.png') ? 'image/png' : 'image/jpeg'
}

export async function saveBrandLogo(image: Buffer, type: BrandLogoType): Promise<string> {
  const dir = process.env.BRAND_DIR

  if (!dir) throw new Error('BRAND_DIR is not set')

  const filename = `${randomUUID()}.${type}`

  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), image)

  return `${BRAND_PUBLIC_PATH}/${filename}`
}

export async function deleteBrandLogo(url: string): Promise<void> {
  if (!url.startsWith(`${BRAND_PUBLIC_PATH}/`)) return

  const path = brandLogoPath(url.slice(BRAND_PUBLIC_PATH.length + 1))
  if (!path) return

  await unlink(path).catch(() => {})
}
