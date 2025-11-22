import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

export function generateReferenceNumber(...parts: (string | number)[]): string {
  if (parts.length === 0) {
    parts = ['REF'];
  }
  
  // Convert all parts to strings and filter out empty ones
  const stringParts = parts.map(part => String(part)).filter(Boolean);
  
  // If the last part is a number, pad it with zeros
  const lastPart = stringParts[stringParts.length - 1];
  if (!isNaN(Number(lastPart))) {
    stringParts[stringParts.length - 1] = String(lastPart).padStart(6, '0');
  }
  
  return stringParts.join('-');
}
