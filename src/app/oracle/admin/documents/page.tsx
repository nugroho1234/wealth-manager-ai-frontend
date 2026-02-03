'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { UserRole } from '@/types/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import FileUpload from '@/components/FileUpload';
import { 
  FileUploadProgress, 
  FileValidationError, 
  UploadedDocument,
  DEFAULT_UPLOAD_OPTIONS 
} from '@/types/upload';
import { apiClient } from '@/lib/api';
import { formatErrorForDisplay } from '@/lib/utils';

function DocumentsContent() {
  const { user } = useAuth();
  const {
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyUploadProgress,
    notifyUploadComplete,
    notifyUploadError,
  } = useNotifications();
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadStats, setUploadStats] = useState({
    total: 0,
    processing: 0,
    completed: 0,
    failed: 0
  });

  // Check if user has admin privileges
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    if (isAdmin) {
      fetchUploadedDocuments();
    }
  }, [isAdmin]);

  const fetchUploadedDocuments = async () => {
    try {
      setIsLoading(true);
      
      const response = await apiClient.get<{
        success: boolean;
        message: string;
        data: UploadedDocument[];
      }>('/api/v1/oracle/admin/uploaded-documents?limit=5');
      
      // Extract documents array from wrapped response
      const documents = response.data.data || [];
      setUploadedDocuments(documents);
      
      // Calculate stats from the documents array
      const stats = documents.reduce((acc, doc) => {
        acc.total++;
        if (doc.upload_status === 'processing') acc.processing++;
        else if (doc.upload_status === 'completed') acc.completed++;
        else if (doc.upload_status === 'failed') acc.failed++;
        return acc;
      }, { total: 0, processing: 0, completed: 0, failed: 0 });
      
      setUploadStats(stats);
      
    } catch (error: any) {
      // Only show error notification if it's not a 404 (no documents found)
      if (error.status_code !== 404) {
        const errorMessage = error.detail || error.message || 'Failed to fetch uploaded documents';
        notifyError('Fetch Error', errorMessage);
      }
      // For 404, just set empty array (no documents yet)
      setUploadedDocuments([]);
      setUploadStats({ total: 0, processing: 0, completed: 0, failed: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadStart = (files: File[]) => {
    const fileCount = files.length;
    notifyInfo(
      'Upload Started', 
      `Starting upload of ${fileCount} file${fileCount > 1 ? 's' : ''}...`
    );
    
    // Create upload progress notifications for each file
    files.forEach((file, index) => {
      const uploadId = `upload_${Date.now()}_${index}`;
      notifyUploadProgress(
        'File Upload',
        `Uploading ${file.name}...`,
        uploadId
      );
    });
  };

  const handleUploadProgress = (files: FileUploadProgress[]) => {
    // Track upload progress and create stage notifications
    files.forEach(file => {
      const uploadId = file.uploadId || `upload_${Date.now()}`;
      
      if (file.status === 'processing') {
        notifyUploadProgress(
          'Processing',
          `Processing ${file.file.name} with LlamaParse...`,
          uploadId
        );
      } else if (file.status === 'extracting') {
        notifyUploadProgress(
          'Extracting Details',
          `Extracting details from ${file.file.name}...`,
          uploadId
        );
      } else if (file.status === 'storing') {
        notifyUploadProgress(
          'Storing Files',
          `Uploading ${file.file.name} to cloud storage...`,
          uploadId
        );
      } else if (file.status === 'vectorizing') {
        notifyUploadProgress(
          'Creating Embeddings',
          `Creating vector embeddings for ${file.file.name}...`,
          uploadId
        );
      }
    });
  };

  const handleUploadComplete = (files: FileUploadProgress[]) => {
    const successful = files.filter(f => f.status === 'completed').length;
    const failed = files.filter(f => f.status === 'error').length;
    
    // Create completion notifications
    files.forEach(file => {
      const uploadId = file.uploadId || `upload_${Date.now()}`;
      
      if (file.status === 'completed') {
        notifyUploadComplete(
          `Successfully processed ${file.file.name}. Document is now searchable and ready for chat.`,
          uploadId,
          `doc_${Date.now()}`
        );
      } else if (file.status === 'error') {
        notifyUploadError(
          `Failed to process ${file.file.name}`,
          uploadId,
          file.error
        );
      }
    });
    
    // Summary notification
    if (successful > 0 && failed === 0) {
      notifySuccess(
        'Upload Complete',
        `Successfully processed all ${successful} document${successful > 1 ? 's' : ''}. Ready for search and chat!`
      );
    } else if (successful > 0 && failed > 0) {
      notifyInfo(
        'Upload Partially Complete',
        `Processed ${successful} document${successful > 1 ? 's' : ''}, but ${failed} failed. Check individual notifications for details.`
      );
    }
    
    // Refresh the documents list
    fetchUploadedDocuments();
  };

  const handleUploadError = (errors: FileValidationError[]) => {
    errors.forEach(error => {
      notifyError('Upload Validation Error', error.error);
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'processing':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'uploaded':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">
            You need administrator privileges to access document upload functionality.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <main className="max-w-6xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Upload Insurance Documents
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Upload PDF insurance documents to automatically parse and extract product information 
              for search and comparison purposes.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{uploadStats.total}</div>
                <div className="text-sm text-gray-600">Total Documents</div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600 mb-2">{uploadStats.processing}</div>
                <div className="text-sm text-gray-600">Processing</div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">{uploadStats.completed}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">{uploadStats.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="mb-12">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Upload New Documents</h2>
              
              <FileUpload
                options={DEFAULT_UPLOAD_OPTIONS}
                onUploadStart={handleUploadStart}
                onUploadProgress={handleUploadProgress}
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
              />
            </div>
          </div>

          {/* Recently Uploaded Documents */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Recent Insurance Documents</h2>
              <button
                onClick={fetchUploadedDocuments}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 text-sm font-medium"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading documents...</p>
              </div>
            ) : uploadedDocuments.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Uploaded</h3>
                <p className="text-gray-600">Upload your first insurance document to get started.</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {uploadedDocuments.map((doc) => (
                      <div key={doc.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/20 hover:shadow-md transition-all duration-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">🛡️</span>
                            <span className={getStatusBadge(doc.upload_status)}>
                              {doc.upload_status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {doc.filename || "Unknown Insurance Product"}
                          </h3>
                          
                          <div className="text-xs text-gray-600">
                            <span className="inline-flex items-center">
                              <span className="mr-1">🏢</span>
                              {doc.original_filename?.includes(' - ') 
                                ? doc.original_filename.split(' - ').slice(1).join(' - ')
                                : "Insurance Provider"
                              }
                            </span>
                          </div>
                          
                          <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                            <span className="inline-flex items-center">
                              <span className="mr-1">📅</span>
                              {formatDate(doc.uploaded_at)}
                            </span>
                          </div>
                          
                          {doc.error_message && (
                            <div className="text-xs text-red-600 bg-red-50 p-2 rounded-md mt-2">
                              {formatErrorForDisplay(doc.error_message)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </Sidebar>
  );
}

export default function DocumentsPage() {
  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
      <DocumentsContent />
    </ProtectedRoute>
  );
}