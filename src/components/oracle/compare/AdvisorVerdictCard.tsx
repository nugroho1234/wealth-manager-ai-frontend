/**
 * Advisor's Verdict Card Component
 * Displays key strengths, weaknesses, and best-for recommendation for a product
 */

import { InsuranceProduct } from '@/types/oracle/insurance-product';
import { formatValue } from './utils';

interface AdvisorVerdictCardProps {
  product: InsuranceProduct;
}

export default function AdvisorVerdictCard({ product }: AdvisorVerdictCardProps) {
  const hasVerdict = product.key_strengths || product.key_weaknesses || product.best_for;

  if (!hasVerdict) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-amber-900">Advisor's Verdict</h4>
            <p className="text-sm text-amber-700 mt-1">No verdict available for this product yet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl p-6 border border-indigo-200 shadow-sm">
      <div className="flex items-center space-x-2 mb-4">
        <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h4 className="text-base font-semibold text-indigo-900">Advisor's Verdict</h4>
      </div>

      <div className="space-y-4">
        {/* Key Strengths */}
        {product.key_strengths && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-green-900">Strengths</span>
            </div>
            <div className="pl-6">
              <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {formatValue(product.key_strengths)}
              </div>
            </div>
          </div>
        )}

        {/* Key Weaknesses */}
        {product.key_weaknesses && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <svg className="h-4 w-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-amber-900">Weaknesses</span>
            </div>
            <div className="pl-6">
              <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {formatValue(product.key_weaknesses)}
              </div>
            </div>
          </div>
        )}

        {/* Best For */}
        {product.best_for && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-blue-900">Best For</span>
            </div>
            <div className="pl-6">
              <div className="text-sm text-gray-700 leading-relaxed">
                {formatValue(product.best_for)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
