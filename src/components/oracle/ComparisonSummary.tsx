'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

interface ComparisonSummaryProps {
  insuranceIds: string[];
  userQuery?: string;
}

interface SummaryData {
  summary: string;
  key_points: string[];
  cached: boolean;
  generated_at: string;
  category: string | null;
}

export default function ComparisonSummary({ insuranceIds, userQuery }: ComparisonSummaryProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!insuranceIds || insuranceIds.length < 2) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.post<SummaryData>(
          '/api/v1/oracle/compare/summary',
          {
            insurance_ids: insuranceIds,
            user_query: userQuery || null
          }
        );

        setSummary(response.data);
      } catch (err: any) {
        console.error('Error fetching comparison summary:', err);
        setError(err.detail || err.message || 'Failed to generate comparison summary');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [insuranceIds, userQuery]);

  // Don't render if less than 2 products
  if (!insuranceIds || insuranceIds.length < 2) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-md border border-blue-100 p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white rounded-lg p-2">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Comparison Summary</h2>
            <p className="text-sm text-gray-600">
              {userQuery ? (
                <>Comparing {insuranceIds.length} products for: <span className="font-medium text-blue-700">"{userQuery}"</span></>
              ) : (
                <>Intelligent insights for {insuranceIds.length} products</>
              )}
            </p>
          </div>
        </div>

        {summary && !loading && (
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            {summary.cached ? (
              <span className="flex items-center bg-green-100 text-green-700 px-2 py-1 rounded">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Cached
              </span>
            ) : (
              <span className="flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded">
                <svg className="w-3 h-3 mr-1 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                </svg>
                Fresh
              </span>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="animate-pulse">
            <div className="h-4 bg-blue-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-blue-200 rounded w-5/6 mb-2"></div>
            <div className="h-4 bg-blue-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-blue-200 rounded w-4/6 mb-2"></div>
            <div className="h-4 bg-blue-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-blue-200 rounded w-3/6"></div>
          </div>
          <p className="text-sm text-blue-600 text-center mt-4">
            Generating intelligent comparison...
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Failed to generate summary</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {summary && !loading && !error && (
        <div className="prose prose-blue max-w-none">
          {/* Key Points Section */}
          {summary.key_points && summary.key_points.length > 0 && (
            <div className="mb-6 bg-white rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Key Highlights
              </h3>
              <ul className="space-y-2">
                {summary.key_points.map((point, index) => (
                  <li key={index} className="flex items-start text-sm text-gray-700">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 mt-0.5 text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="flex-1">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary Text */}
          <div className="text-gray-800 leading-relaxed">
            {summary.summary.split('\n\n').map((paragraph, index) => (
              paragraph.trim() && (
                <p key={index} className="mb-4 last:mb-0">
                  {paragraph.trim()}
                </p>
              )
            ))}
          </div>

          {/* Category Badge */}
          {summary.category && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Category: {summary.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
