'use client';

import React from 'react';
import { formatErrorForDisplay } from '@/lib/utils';

interface ErrorDisplayProps {
  error: any;
  fallback?: string;
  className?: string;
  variant?: 'inline' | 'block' | 'alert';
}

/**
 * Safe error display component that prevents "Objects are not valid as a React child" errors
 * by properly converting any error value to a string before rendering.
 */
export default function ErrorDisplay({ 
  error, 
  fallback = 'An error occurred', 
  className = '',
  variant = 'inline'
}: ErrorDisplayProps) {
  if (!error) return null;

  const errorMessage = formatErrorForDisplay(error, fallback);
  
  const baseClasses = 'text-red-600';
  
  const variantClasses = {
    inline: 'text-sm',
    block: 'text-sm p-2 bg-red-50 border border-red-200 rounded',
    alert: 'text-sm p-3 bg-red-50 border border-red-200 rounded-md'
  };

  const finalClassName = `${baseClasses} ${variantClasses[variant]} ${className}`.trim();

  if (variant === 'inline') {
    return <span className={finalClassName}>{errorMessage}</span>;
  }

  return <div className={finalClassName}>{errorMessage}</div>;
}

// Export a hook for consistent error formatting in custom components
export function useErrorDisplay() {
  return {
    formatError: (error: any, fallback?: string) => formatErrorForDisplay(error, fallback)
  };
}