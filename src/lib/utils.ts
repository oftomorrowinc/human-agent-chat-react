import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Compose className strings with Tailwind-aware deduping. Standard shadcn `cn()`. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
