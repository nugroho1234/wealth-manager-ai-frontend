/**
 * PageBadge Component
 *
 * Displays a clickable badge that links to a specific page in a PDF document.
 * Used to show citations and references from RAG chat responses.
 */

import React from 'react';
import { getPdfUrl } from '@/lib/pdfUtils';

interface PageBadgeProps {
  /** Page number to link to (1-indexed) */
  page: number;
  /** Optional section name on that page */
  section?: string;
  /** PDF URL from the database (e.g., "insurances/document.pdf") */
  pdfUrl: string;
  /** Additional CSS classes */
  className?: string;
}

export default function PageBadge({ page, section, pdfUrl, className = '' }: PageBadgeProps) {
  const url = getPdfUrl(pdfUrl, page);
  const tooltipText = section ? `Go to page ${page}: ${section}` : `Go to page ${page}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={tooltipText}
      className={`inline-flex items-center px-3 py-1.5 bg-blue-50 hover:bg-blue-100
                 text-blue-700 hover:text-blue-800 rounded-lg text-sm font-medium
                 transition-colors duration-150 border border-blue-200 hover:border-blue-300
                 ${className}`}
    >
      <svg
        className="w-4 h-4 mr-1.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
      <span>Page {page}</span>
      {section && (
        <span className="ml-1.5 text-xs text-blue-600 font-normal">· {section}</span>
      )}
    </a>
  );
}
