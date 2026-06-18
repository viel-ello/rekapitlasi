import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn — gabung className kondisional (clsx) lalu rapikan konflik Tailwind (twMerge).
 * Konvensi shadcn/ui.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
