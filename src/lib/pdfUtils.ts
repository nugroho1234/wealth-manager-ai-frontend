/**
 * Utilities for working with PDF documents in Google Cloud Storage
 */

const GCS_BASE_URL = 'https://storage.googleapis.com/wealth-manager-public';

/**
 * Constructs a full URL to a PDF document with optional page navigation
 *
 * @param pdfUrl - The relative PDF URL from the database (e.g., "insurances/document.pdf")
 * @param pageNumber - Optional page number to navigate to (1-indexed)
 * @returns Full URL to the PDF, optionally with page anchor
 *
 * @example
 * getPdfUrl("insurances/policy.pdf")
 * // Returns: "https://storage.googleapis.com/wealth-manager-public/insurances/policy.pdf"
 *
 * getPdfUrl("insurances/policy.pdf", 5)
 * // Returns: "https://storage.googleapis.com/wealth-manager-public/insurances/policy.pdf#page=5"
 */
export function getPdfUrl(pdfUrl: string, pageNumber?: number): string {
  const fullUrl = `${GCS_BASE_URL}/${pdfUrl}`;

  if (pageNumber !== undefined && pageNumber > 0) {
    return `${fullUrl}#page=${pageNumber}`;
  }

  return fullUrl;
}

/**
 * Opens a PDF in a new tab, optionally navigating to a specific page
 *
 * @param pdfUrl - The relative PDF URL from the database
 * @param pageNumber - Optional page number to navigate to
 */
export function openPdfInNewTab(pdfUrl: string, pageNumber?: number): void {
  const url = getPdfUrl(pdfUrl, pageNumber);
  window.open(url, '_blank', 'noopener,noreferrer');
}
