import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getInitials(firstName?: string, lastName?: string, email?: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName[0].toUpperCase();
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return 'U';
}

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

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Token expiration checking is handled in api.ts

/**
 * Safely converts any value to a string for rendering in React components.
 * Prevents "Objects are not valid as a React child" errors by handling:
 * - Error objects (returns error.message or error.detail)
 * - Validation errors with type, loc, msg, input keys
 * - Plain objects (returns JSON string)
 * - Arrays (returns comma-separated values)
 * - Null/undefined (returns empty string)
 */
export function safeStringify(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  // Handle Error objects
  if (value instanceof Error) {
    return value.message;
  }
  
  // Handle validation errors (Zod-style errors with type, loc, msg, input)
  if (typeof value === 'object' && value.msg) {
    return value.msg;
  }
  
  // Handle API errors with detail property
  if (typeof value === 'object' && value.detail) {
    return value.detail;
  }
  
  // Handle objects with message property
  if (typeof value === 'object' && value.message) {
    return value.message;
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(safeStringify).join(', ');
  }
  
  // For other objects, try to extract meaningful information
  if (typeof value === 'object') {
    // If it looks like a validation error object
    if (value.type && value.loc && value.msg) {
      return value.msg;
    }
    
    // Last resort: JSON stringify but truncate if too long
    try {
      const jsonString = JSON.stringify(value);
      return jsonString.length > 200 ? jsonString.substring(0, 200) + '...' : jsonString;
    } catch {
      return '[Object]';
    }
  }
  
  return String(value);
}

/**
 * React-safe error display component helper
 * Use this to safely render any error value in JSX
 */
export function formatErrorForDisplay(error: any, fallback: string = 'An error occurred'): string {
  const errorString = safeStringify(error);
  return errorString || fallback;
}