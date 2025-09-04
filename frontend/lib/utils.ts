import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date utility
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format currency utility
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Format percentage utility
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Position color utility
export function getPositionColor(position: string): string {
  const colors: { [key: string]: string } = {
    QB: 'bg-red-100 text-red-800',
    RB: 'bg-green-100 text-green-800',
    WR: 'bg-blue-100 text-blue-800',
    TE: 'bg-orange-100 text-orange-800',
    DST: 'bg-purple-100 text-purple-800',
    K: 'bg-gray-100 text-gray-800',
  };
  
  return colors[position] || 'bg-gray-100 text-gray-800';
}

// Score color utility (for fantasy points)
export function getScoreColor(score: number): string {
  if (score >= 20) return 'text-green-600 font-bold';
  if (score >= 15) return 'text-green-500';
  if (score >= 10) return 'text-gray-700';
  if (score >= 5) return 'text-orange-500';
  return 'text-red-500';
}