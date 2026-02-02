"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface ProposalData {
  proposal_id: string;
  client_name: string;
  generated_html?: string;
  generated_at?: string;
  status: string;
}

interface PageData {
  title: string;
  content: string;
}

export default function ProposalPreviewPage() {
  const { id: proposalId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [proposalData, setProposalData] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [pages, setPages] = useState<PageData[]>([]);

  // Function to fetch individual page content from backend
  const fetchIndividualPages = async (proposalId: string): Promise<PageData[]> => {
    const pageNames = ['Page 1 - Title', 'Page 2 - Features', 'Page 3 - Illustration', 'Page 4 - Recommendation'];
    const pages: PageData[] = [];

    try {
      // Fetch each page individually
      for (let pageNumber = 1; pageNumber <= 4; pageNumber++) {
        try {
          // Special handling for Page 3 - check intelligent analysis status first
          if (pageNumber === 3) {
            try {
              // console.log('🤖 Checking intelligent analysis status for Page 3...');
              const statusResponse = await apiClient.get(`/api/v1/oracle/proposals/${proposalId}/intelligent-analysis-status`);
              const status = statusResponse.data?.data?.status;

              if (status === 'pending') {
                // Show loading state for Page 3
                pages.push({
                  title: pageNames[pageNumber - 1],
                  content: `
                    <html>
                      <head>
                        <style>
                          body { font-family: Inter, system-ui, sans-serif; margin: 0; padding: 0; }
                          .loading-container {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            min-height: 80vh;
                            padding: 2rem;
                            text-align: center;
                          }
                          .spinner {
                            width: 40px;
                            height: 40px;
                            border: 4px solid #e5e7eb;
                            border-top: 4px solid #3b82f6;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                            margin-bottom: 1rem;
                          }
                          @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                          }
                          .loading-text { color: #6b7280; font-size: 1.1rem; margin-bottom: 0.5rem; }
                          .loading-subtext { color: #9ca3af; font-size: 0.9rem; }
                        </style>
                      </head>
                      <body>
                        <div class="loading-container">
                          <div class="spinner"></div>
                          <div class="loading-text">🤖 Analyzing Cash Surrender Values...</div>
                          <div class="loading-subtext">Our AI is selecting optimal ages for comparison. Please wait...</div>
                        </div>
                      </body>
                    </html>
                  `
                });
                // console.log('⏳ Page 3 showing loading state (intelligent analysis pending)');
                continue;
              }
            } catch (statusError) {
              console.warn('⚠️ Could not check intelligent analysis status, proceeding with normal Page 3 load');
            }
          }

          const response = await apiClient.get(`/api/v1/oracle/proposals/${proposalId}/page/${pageNumber}`);

          if (response.data) {
            pages.push({
              title: pageNames[pageNumber - 1],
              content: response.data
            });
            // console.log(`✅ Successfully loaded ${pageNames[pageNumber - 1]}`);
          } else {
            // Fallback for missing page
            pages.push({
              title: pageNames[pageNumber - 1],
              content: `<html><body><div class="p-8 text-center text-gray-500">${pageNames[pageNumber - 1]} content not available</div></body></html>`
            });
            console.warn(`⚠️ ${pageNames[pageNumber - 1]} content not available`);
          }
        } catch (pageError) {
          console.error(`❌ Error loading ${pageNames[pageNumber - 1]}:`, pageError);
          // Fallback for failed page
          pages.push({
            title: pageNames[pageNumber - 1],
            content: `<html><body><div class="p-8 text-center text-gray-500">Error loading ${pageNames[pageNumber - 1]}</div></body></html>`
          });
        }
      }

      return pages;
    } catch (error: any) {
      console.error('Error fetching individual pages:', error);

      // Check if it's an authentication error
      if (error?.status_code === 401 || error?.status_code === 403) {
        console.error('❌ Authentication error in preview page:', error);
        toast.error('Session expired. Please login again.');
        router.push('/login');
        return [];
      }

      // Return fallback pages for other errors
      return pageNames.map((name, index) => ({
        title: name,
        content: `<html><body><div class="p-8 text-center text-gray-500">Error loading ${name}</div></body></html>`
      }));
    }
  };

  // Load proposal data and fetch individual pages
  useEffect(() => {
    const loadProposalData = async () => {
      try {
        setLoading(true);

        // Check if user is authenticated before making API calls
        if (!user) {
          // console.log('❌ User not authenticated, redirecting to login');
          router.push('/login');
          return;
        }

        // console.log('✅ User authenticated:', user.email);

        // Get proposal basic data
        const response = await apiClient.get(`/api/v1/oracle/proposals/${proposalId}`);

        if (response.data && response.data.success) {
          const data = response.data.data;
          setProposalData(data);

          // Fetch individual pages from backend
          // console.log('🔄 Fetching individual pages...');
          const individualPages = await fetchIndividualPages(proposalId as string);
          // console.log(`✅ Loaded ${individualPages.length} individual pages:`, individualPages.map(p => p.title));
          setPages(individualPages);
        } else {
          toast.error('Failed to load proposal data');
          router.push('/oracle/proposals');
        }
      } catch (error: any) {
        console.error('Error loading proposal:', error);

        // Check if it's an authentication error
        if (error?.status_code === 401 || error?.status_code === 403) {
          console.error('❌ Authentication error in main load:', error);
          toast.error('Session expired. Please login again.');
          router.push('/login');
        } else {
          toast.error('Failed to load proposal preview');
          router.push('/oracle/proposals');
        }
      } finally {
        setLoading(false);
      }
    };

    if (proposalId && user) {
      loadProposalData();
    }
  }, [proposalId, user, router]);

  // Auto-refresh Page 3 when intelligent analysis completes
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkAndRefreshPage3 = async () => {
      try {
        // Only check if we have pages loaded and Page 3 exists
        if (pages.length >= 3 && proposalId) {
          const statusResponse = await apiClient.get(`/api/v1/oracle/proposals/${proposalId}/intelligent-analysis-status`);
          const status = statusResponse.data?.data?.status;

          // If analysis completed and Page 3 currently shows loading, refresh it
          if (status === 'completed' && pages[2].content.includes('Analyzing Cash Surrender Values')) {
            // console.log('🎉 Intelligent analysis completed! Refreshing Page 3...');

            try {
              const page3Response = await apiClient.get(`/api/v1/oracle/proposals/${proposalId}/page/3`);
              if (page3Response.data) {
                setPages(prevPages => {
                  const newPages = [...prevPages];
                  newPages[2] = {
                    title: 'Page 3 - Illustration',
                    content: page3Response.data
                  };
                  return newPages;
                });
                toast.success('✨ Cash surrender value analysis completed!');
              }
            } catch (refreshError) {
              console.error('❌ Error refreshing Page 3:', refreshError);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error checking intelligent analysis status:', error);
      }
    };

    // Start checking every 5 seconds if Page 3 is in loading state
    if (pages.length >= 3 && pages[2].content.includes('Analyzing Cash Surrender Values')) {
      // console.log('⏰ Starting intelligent analysis status checks...');
      intervalId = setInterval(checkAndRefreshPage3, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [pages, proposalId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && activeTab > 0) {
        setActiveTab(activeTab - 1);
      } else if (e.key === 'ArrowRight' && activeTab < pages.length - 1) {
        setActiveTab(activeTab + 1);
      } else if (e.key >= '1' && e.key <= '4') {
        const pageIndex = parseInt(e.key) - 1;
        if (pageIndex < pages.length) {
          setActiveTab(pageIndex);
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [activeTab, pages.length]);

  // Download proposal as PDF
  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      toast('Generating PDF download...');

      // Call backend API to generate and download PDF
      // The backend PDF endpoint will generate the combined HTML internally
      const response = await apiClient.get(`/api/v1/oracle/proposals/${proposalId}/download-pdf`, {
        responseType: 'blob'
      });

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `proposal-${proposalData?.client_name || 'client'}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF downloaded successfully!');
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to generate PDF download');
    } finally {
      setDownloading(false);
    }
  };

  // Go back to proposal editor
  const handleBackToEditor = () => {
    router.push(`/proposals/${proposalId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading proposal preview...</p>
        </div>
      </div>
    );
  }

  if (!proposalData || pages.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Proposal Not Ready</h1>
          <p className="text-gray-600 mb-6">
            This proposal hasn't been generated yet or the pages are still loading.
          </p>
          <button
            onClick={handleBackToEditor}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Editor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Proposal Preview: {proposalData.client_name}
            </h1>
            {proposalData.generated_at && (
              <p className="text-sm text-gray-500 mt-1">
                Generated on {new Date(proposalData.generated_at).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToEditor}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Back to Editor
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Page Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <div className="flex items-center justify-between">
            <div className="flex space-x-8">
              {pages.map((page, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === index
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {page.title}
                </button>
              ))}
            </div>

            {/* Navigation arrows */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab(Math.max(0, activeTab - 1))}
                disabled={activeTab === 0}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <span className="text-sm text-gray-500 min-w-[60px] text-center">
                {pages.length > 0 ? `${activeTab + 1} / ${pages.length}` : '0 / 0'}
              </span>

              <button
                onClick={() => setActiveTab(Math.min(pages.length - 1, activeTab + 1))}
                disabled={activeTab >= pages.length - 1}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Page Info */}
          {pages.length > 0 && pages[activeTab] && (
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {pages[activeTab].title}
                  </span>
                  <span className="text-xs text-gray-500 ml-4">
                    Use ← → arrow keys or 1-4 number keys to navigate
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {activeTab + 1} of {pages.length}
                </span>
              </div>
            </div>
          )}

          {/* Page Content */}
          {pages.length > 0 && pages[activeTab] ? (
            <div className="proposal-page-viewer">
              <div
                className="proposal-content"
                dangerouslySetInnerHTML={{ __html: pages[activeTab].content }}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <div className="text-lg font-medium mb-2">No page content available</div>
              <p className="text-sm">The proposal may not have been generated yet or there was an error processing the pages.</p>
            </div>
          )}
        </div>
      </div>

      {/* Print styles for better PDF generation */}
      <style jsx global>{`
        .proposal-page-viewer {
          /* Center the page content and add scale for better viewing */
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 20px;
          background: #f3f4f6;
          min-height: 70vh;
        }

        .proposal-content {
          /* Scale the A4 landscape page for better readability */
          transform: scale(0.85);
          transform-origin: top center;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          background: white;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        .proposal-content img {
          max-width: 100%;
          height: auto;
        }

        .proposal-content table {
          width: 100%;
          border-collapse: collapse;
        }

        .proposal-content th,
        .proposal-content td {
          padding: 8px;
          text-align: left;
        }

        /* Responsive scaling for different screen sizes */
        @media (max-width: 1024px) {
          .proposal-content {
            transform: scale(0.65);
          }
        }

        @media (max-width: 768px) {
          .proposal-content {
            transform: scale(0.5);
          }
        }

        @media print {
          .proposal-page-viewer {
            background: white;
            padding: 0;
          }

          .proposal-content {
            transform: none !important;
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}