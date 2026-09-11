export function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length
}
