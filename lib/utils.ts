import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// True when copy still contains a [bracketed] placeholder the founder must fill in.
export function hasPlaceholders(text: string): boolean {
  return /\[[^\]]+\]/.test(text)
}
