'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MeetingTrackerSidebar from '@/components/meeting-tracker/Sidebar';
import { useAuth } from '@/contexts/AuthContext';

interface Company {
  company_id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  timezone: string;
  plan_type: string;
  status: string;
  website?: string;
  created_at: string;
}

interface ValidationError {
  row: number;
  field: string;
  error: string;
}

export default function CompanyImportPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const companyId = params.companyId as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<{
    is_valid: boolean;
    total_rows: number;
    valid_rows: number;
    errors: ValidationError[];
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported_count: number;
    total_rows: number;
    errors: string[];
    company_activated: boolean;
  } | null>(null);

  // Check admin access
  const isAdmin = user?.role_id === 1 || user?.role_id === 2;

  useEffect(() => {
    if (isAdmin) {
      fetchCompany();
    }
  }, [isAdmin, companyId]);

  const fetchCompany = async () => {
    try {
      const authTokensStr = localStorage.getItem('auth_tokens');
      if (!authTokensStr) throw new Error('No authentication token found. Please log in again.');

      const authTokens = JSON.parse(authTokensStr);
      const token = authTokens.access_token;

      if (!token) throw new Error('No authentication token found. Please log in again.');

      const response = await fetch(
        `http://localhost:8000/api/v1/admin/meeting-tracker/companies/${companyId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch company');

      const data = await response.json();
      setCompany(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const authTokensStr = localStorage.getItem('auth_tokens');
      if (!authTokensStr) throw new Error('No authentication token found. Please log in again.');

      const authTokens = JSON.parse(authTokensStr);
      const token = authTokens.access_token;

      if (!token) throw new Error('No authentication token found. Please log in again.');

      const response = await fetch(
        `http://localhost:8000/api/v1/admin/meeting-tracker/companies/${companyId}/csv-template`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to download template');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hierarchy_template_${company?.name || 'company'}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidationResult(null);
      setImportResult(null);
      setError(null);
    }
  };

  const handleValidate = async () => {
    if (!selectedFile) return;

    setValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      const authTokensStr = localStorage.getItem('auth_tokens');
      if (!authTokensStr) throw new Error('No authentication token found. Please log in again.');

      const authTokens = JSON.parse(authTokensStr);
      const token = authTokens.access_token;

      if (!token) throw new Error('No authentication token found. Please log in again.');

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(
        `http://localhost:8000/api/v1/admin/meeting-tracker/companies/${companyId}/validate-csv`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Validation failed');
      }

      const result = await response.json();
      setValidationResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setImportResult(null);

    try {
      const authTokensStr = localStorage.getItem('auth_tokens');
      if (!authTokensStr) throw new Error('No authentication token found. Please log in again.');

      const authTokens = JSON.parse(authTokensStr);
      const token = authTokens.access_token;

      if (!token) throw new Error('No authentication token found. Please log in again.');

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(
        `http://localhost:8000/api/v1/admin/meeting-tracker/companies/${companyId}/import-csv`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Import failed');
      }

      const result = await response.json();
      setImportResult(result);

      if (result.success) {
        // Redirect to companies page after 2 seconds
        setTimeout(() => {
          router.push('/meeting-tracker/admin/companies');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (!isAdmin) {
    return (
      <MeetingTrackerSidebar>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-400">You need admin privileges to access this page.</p>
          </div>
        </div>
      </MeetingTrackerSidebar>
    );
  }

  if (loading) {
    return (
      <MeetingTrackerSidebar>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </MeetingTrackerSidebar>
    );
  }

  if (!company) {
    return (
      <MeetingTrackerSidebar>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-white mb-2">Company Not Found</h1>
            <p className="text-gray-400">{error || 'The requested company could not be found.'}</p>
          </div>
        </div>
      </MeetingTrackerSidebar>
    );
  }

  return (
    <MeetingTrackerSidebar>
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Import Team Hierarchy</h1>
            <p className="text-gray-400">Company: {company.name}</p>
            <div className="mt-2">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  company.status === 'draft'
                    ? 'bg-yellow-900/30 text-yellow-400'
                    : company.status === 'active'
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {company.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-700 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-red-400 text-xl mr-3">⚠️</span>
                <div>
                  <h3 className="text-red-400 font-semibold mb-1">Error</h3>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Alert */}
          {importResult?.success && (
            <div className="mb-6 bg-green-900/20 border border-green-700 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-green-400 text-xl mr-3">✓</span>
                <div>
                  <h3 className="text-green-400 font-semibold mb-1">Import Successful!</h3>
                  <p className="text-green-300 text-sm">
                    Imported {importResult.imported_count} team members. Company has been activated.
                    Redirecting to hierarchy dashboard...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Download Template */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                1
              </div>
              <div className="flex-grow">
                <h2 className="text-xl font-semibold text-white mb-2">Download CSV Template</h2>
                <p className="text-gray-400 mb-4">
                  Download the CSV template with example rows. Send this to the company to fill in their team
                  data.
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Download Template
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Upload CSV */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                2
              </div>
              <div className="flex-grow">
                <h2 className="text-xl font-semibold text-white mb-2">Upload Completed CSV</h2>
                <p className="text-gray-400 mb-4">
                  Once the company has filled in the CSV, upload it here for validation and import.
                </p>

                <div className="mb-4">
                  <label className="block">
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      {selectedFile ? (
                        <div>
                          <div className="text-4xl mb-2">📄</div>
                          <p className="text-white font-medium">{selectedFile.name}</p>
                          <p className="text-gray-400 text-sm mt-1">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="text-4xl mb-2">📁</div>
                          <p className="text-white font-medium">Click to select CSV file</p>
                          <p className="text-gray-400 text-sm mt-1">or drag and drop</p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                {selectedFile && (
                  <div className="flex space-x-4">
                    <button
                      onClick={handleValidate}
                      disabled={validating}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {validating ? 'Validating...' : 'Validate CSV'}
                    </button>
                    {validationResult?.is_valid && (
                      <button
                        onClick={handleImport}
                        disabled={uploading}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploading ? 'Importing...' : 'Import & Activate'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Validation Results</h3>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Total Rows</div>
                  <div className="text-2xl font-bold text-white">{validationResult.total_rows}</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Valid Rows</div>
                  <div className="text-2xl font-bold text-green-400">{validationResult.valid_rows}</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Errors</div>
                  <div className="text-2xl font-bold text-red-400">{validationResult.errors.length}</div>
                </div>
              </div>

              {validationResult.is_valid ? (
                <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-green-400 text-xl mr-3">✓</span>
                    <p className="text-green-300">
                      CSV is valid! Click "Import & Activate" to complete the setup.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                  <div className="mb-3">
                    <span className="text-red-400 font-semibold">Validation Errors:</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {validationResult.errors.map((err, idx) => (
                      <div key={idx} className="bg-gray-900 rounded p-3 text-sm">
                        <span className="text-red-400 font-semibold">Row {err.row}</span>
                        <span className="text-gray-400 mx-2">•</span>
                        <span className="text-gray-300">{err.field}</span>
                        <span className="text-gray-400 mx-2">:</span>
                        <span className="text-red-300">{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Import Errors */}
          {importResult && !importResult.success && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-4">Import Failed</h3>
              <div className="space-y-2">
                {importResult.errors.map((err, idx) => (
                  <div key={idx} className="bg-gray-900 rounded p-3 text-sm text-red-300">
                    {err}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CSV Format Info */}
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-blue-400 text-xl mr-3">ℹ️</span>
              <div>
                <h3 className="text-blue-400 font-semibold mb-2">CSV Format Requirements</h3>
                <ul className="text-blue-300 text-sm space-y-1">
                  <li>• Headers: Email, Full Name, Manager Email, Level, Team Name, Position Title</li>
                  <li>• All users must already exist in the system with matching emails</li>
                  <li>• Level 1 users cannot have a manager</li>
                  <li>• Levels 2-4 must have a manager</li>
                  <li>• Manager Email must reference another user in the CSV or existing hierarchy</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MeetingTrackerSidebar>
  );
}
