'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  FileUploadProgress, 
  FileValidationError, 
  FileUploadOptions, 
  DEFAULT_UPLOAD_OPTIONS,
  UploadResponse,
  ProcessingStatus 
} from '@/types/upload';
import { apiClient } from '@/lib/api';
import { formatErrorForDisplay } from '@/lib/utils';

// Metadata removed - backend extracts everything from PDF

interface FileUploadProps {
  options?: Partial<FileUploadOptions>;
  onUploadStart?: (files: File[]) => void;
  onUploadProgress?: (files: FileUploadProgress[]) => void;
  onUploadComplete?: (files: FileUploadProgress[]) => void;
  onUploadError?: (errors: FileValidationError[]) => void;
  className?: string;
  disabled?: boolean;
}

export default function FileUpload({
  options = {},
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  className = '',
  disabled = false
}: FileUploadProps) {
  const uploadOptions = { ...DEFAULT_UPLOAD_OPTIONS, ...options };
  const [files, setFiles] = useState<FileUploadProgress[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const completionCalledRef = useRef(false);
  
  // Removed metadata form - backend extracts everything from PDF

  // Handle upload progress and completion callbacks after state updates
  useEffect(() => {
    if (files.length === 0) {
      completionCalledRef.current = false;
      return;
    }
    
    // Always call onUploadProgress when files change
    onUploadProgress?.(files);
    
    // Check if all files are complete or have errors
    const allComplete = files.every(f => f.status === 'completed' || f.status === 'error');
    
    // Only call onUploadComplete once when all files are done
    if (allComplete && !completionCalledRef.current) {
      completionCalledRef.current = true;
      onUploadComplete?.(files);
    }
  }, [files, onUploadProgress, onUploadComplete]);

  const validateFile = (file: File): FileValidationError | null => {
    // Check file type
    if (!uploadOptions.acceptedFileTypes?.includes(file.type)) {
      return {
        file,
        error: `File type ${file.type} is not supported. Please upload PDF files only.`
      };
    }

    // Check file size
    if (uploadOptions.maxSizeBytes && file.size > uploadOptions.maxSizeBytes) {
      const maxSizeMB = (uploadOptions.maxSizeBytes / (1024 * 1024)).toFixed(1);
      return {
        file,
        error: `File size ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds the maximum allowed size of ${maxSizeMB}MB.`
      };
    }

    return null;
  };

  const validateFiles = (newFiles: File[]): { validFiles: File[]; errors: FileValidationError[] } => {
    const validFiles: File[] = [];
    const errors: FileValidationError[] = [];

    // Check total number of files
    const totalFiles = files.length + newFiles.length;
    if (uploadOptions.maxFiles && totalFiles > uploadOptions.maxFiles) {
      errors.push({
        file: newFiles[0], // Use first file as reference
        error: `Cannot upload more than ${uploadOptions.maxFiles} files at once.`
      });
      return { validFiles, errors };
    }

    // Validate each file
    for (const file of newFiles) {
      const validation = validateFile(file);
      if (validation) {
        errors.push(validation);
      } else {
        validFiles.push(file);
      }
    }

    return { validFiles, errors };
  };

  const uploadFiles = async (filesToUpload: File[]): Promise<void> => {
    try {
      console.log(`🚀 Starting upload for ${filesToUpload.length} files`);
      
      // Update all files to uploading status
      filesToUpload.forEach(file => {
        updateFileProgress(file, { status: 'uploading', progress: 0 });
      });

      // Create FormData with all files and metadata
      const formData = new FormData();
      
      // Add all files under the same 'files' key (FastAPI expects List[UploadFile])
      filesToUpload.forEach((file, index) => {
        console.log(`📎 Adding file ${index + 1}: ${file.name} (${file.size} bytes)`);
        formData.append('files', file);
      });
      
      // No metadata needed - backend extracts everything from PDF

      // Debug FormData contents
      console.log('📤 FormData contents:');
      const entries = Array.from(formData.entries());
      entries.forEach(([key, value]) => {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });

      // Upload all files with progress tracking
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        uploads: UploadResponse[];
        failed_uploads: Array<{[key: string]: string}>;
      }>('/api/v1/oracle/admin/upload-insurance', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            // Update progress for all uploading files
            filesToUpload.forEach(file => {
              updateFileProgress(file, { progress });
            });
          }
        },
      });

      console.log('✅ Upload response received:', response.data);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Upload failed');
      }

      // Handle successful uploads
      if (response.data.uploads && response.data.uploads.length > 0) {
        response.data.uploads.forEach((uploadResponse, index) => {
          const file = filesToUpload[index];
          if (file) {
            console.log(`✅ File ${file.name} uploaded successfully with ID: ${uploadResponse.upload_id}`);
            // Update status to processing
            updateFileProgress(file, { 
              status: 'processing', 
              progress: 100,
              uploadId: uploadResponse.upload_id 
            });
            
            // Start polling for processing status
            setTimeout(() => pollProcessingStatus(file, uploadResponse.upload_id), 100);
          }
        });
      }

      // Handle failed uploads
      if (response.data.failed_uploads && response.data.failed_uploads.length > 0) {
        response.data.failed_uploads.forEach((failedUpload, index) => {
          const file = filesToUpload[index];
          if (file) {
            const errorMessage = Object.values(failedUpload)[0] || 'Upload failed';
            console.error(`❌ File ${file.name} failed to upload:`, errorMessage);
            updateFileProgress(file, { 
              status: 'error', 
              error: errorMessage
            });
          }
        });
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      
      let errorMessage = 'Upload failed. Please try again.';
      
      // Handle specific error cases
      if (error.status_code === 401 || error.status_code === 403) {
        errorMessage = 'Authentication required. Please log in again.';
      } else if (error.status_code === 400) {
        errorMessage = error.detail || 'Invalid file or request format.';
      } else if (error.status_code === 413) {
        errorMessage = 'File too large. Please upload a smaller file.';
      } else if (error.detail) {
        errorMessage = error.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Update all files to error status
      filesToUpload.forEach(file => {
        updateFileProgress(file, { 
          status: 'error', 
          error: errorMessage
        });
      });
    }
  };

  const pollProcessingStatus = async (file: File, uploadId: string): Promise<void> => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const checkStatus = async (): Promise<void> => {
      try {
        const response = await apiClient.get<ProcessingStatus>(`/api/v1/admin/upload-status/${uploadId}`);
        const status = response.data;

        // Update progress based on processing step
        let progress = 100;
        if (status.status === 'processing') progress = 20;
        else if (status.status === 'parsing') progress = 40;
        else if (status.status === 'extracting') progress = 60;
        else if (status.status === 'storing') progress = 80;
        else if (status.status === 'completed') progress = 100;

        updateFileProgress(file, { 
          progress,
          status: status.status === 'completed' ? 'completed' : 'processing'
        });

        if (status.status === 'completed') {
          return; // Processing complete
        }

        if (status.status === 'failed') {
          updateFileProgress(file, { 
            status: 'error', 
            error: status.error || 'Processing failed' 
          });
          return;
        }

        // Continue polling if still processing
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000); // Check again in 5 seconds
        } else {
          updateFileProgress(file, { 
            status: 'error', 
            error: 'Processing timeout. Please check the status later.' 
          });
        }
      } catch (error: any) {
        updateFileProgress(file, { 
          status: 'error', 
          error: error.detail || 'Failed to check processing status' 
        });
      }
    };

    // Start checking status after a short delay
    setTimeout(checkStatus, 2000);
  };

  const updateFileProgress = (file: File, updates: Partial<FileUploadProgress>) => {
    setFiles(prev => {
      const updated = prev.map(f => 
        f.file === file ? { ...f, ...updates } : f
      );
      
      // Callback notifications are now handled in useEffect to avoid
      // state updates during render cycle
      return updated;
    });
  };

  const handleFiles = useCallback((acceptedFiles: File[]) => {
    if (disabled) return;

    const { validFiles, errors } = validateFiles(acceptedFiles);

    if (errors.length > 0) {
      onUploadError?.(errors);
      return;
    }

    if (validFiles.length === 0) return;

    // Create file progress objects and start uploading immediately
    const newFileProgress: FileUploadProgress[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,  // Start with pending status
    }));

    setFiles(prev => [...prev, ...newFileProgress]);
    // Reset completion flag when new files are added
    completionCalledRef.current = false;
    // Automatically call onUploadStart when files are selected
    onUploadStart?.(validFiles);
    
    // Immediately start processing the files
    setTimeout(() => uploadFiles(validFiles), 100);
  }, [disabled, files.length, onUploadError, onUploadStart]);

  const { getRootProps, getInputProps, isDragActive: dropzoneActive } = useDropzone({
    onDrop: handleFiles,
    accept: {
      'application/pdf': ['.pdf']
    },
    disabled,
    multiple: uploadOptions.allowMultiple,
    maxFiles: uploadOptions.maxFiles,
  });

  const removeFile = (fileToRemove: File) => {
    setFiles(prev => prev.filter(f => f.file !== fileToRemove));
    // Reset completion flag when files are removed
    completionCalledRef.current = false;
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'completed' && f.status !== 'error'));
    // Reset completion flag when completed files are cleared
    completionCalledRef.current = false;
  };

  // Process documents function removed - files upload automatically on selection

  const isProcessing = files.some(f => ['pending', 'uploading', 'processing', 'extracting', 'storing', 'vectorizing'].includes(f.status));

  const getStatusIcon = (status: FileUploadProgress['status']) => {
    switch (status) {
      case 'selected':
        return '📄';
      case 'pending':
        return '⏳';
      case 'uploading':
        return '📤';
      case 'processing':
        return '⚙️';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📄';
    }
  };

  const getStatusText = (status: FileUploadProgress['status']) => {
    switch (status) {
      case 'selected':
        return 'Ready to process';
      case 'pending':
        return 'Pending upload';
      case 'uploading':
        return 'Uploading';
      case 'processing':
        return 'Processing document';
      case 'extracting':
        return 'Extracting metadata';
      case 'storing':
        return 'Storing embeddings';
      case 'vectorizing':
        return 'Creating vectors';
      case 'completed':
        return 'Processing complete';
      case 'error':
        return 'Processing failed';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Metadata form removed - backend extracts everything from PDF */}
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer
          ${disabled 
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
            : dropzoneActive || isDragActive
              ? 'border-primary-400 bg-primary-50 scale-105' 
              : 'border-gray-300 bg-white hover:border-primary-300 hover:bg-primary-25'
          }
        `}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        
        <div className="space-y-4">
          <div className="text-6xl">📤</div>
          
          <div>
            <h3 className={`text-lg font-semibold ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
              {dropzoneActive ? 'Drop files here' : 'Upload Insurance Documents'}
            </h3>
            <p className={`text-sm mt-2 ${disabled ? 'text-gray-400' : 'text-gray-500'}`}>
              {disabled 
                ? 'Upload is currently disabled'
                : `Drag and drop up to ${uploadOptions.maxFiles} PDF files here, or click to select files`
              }
            </p>
            
            {/* Manual browse button as fallback */}
            {!disabled && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 font-medium"
              >
                Browse Files
              </button>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
            <span>PDF files only</span>
            <span>•</span>
            <span>Max {(uploadOptions.maxSizeBytes! / (1024 * 1024)).toFixed(0)}MB per file</span>
            <span>•</span>
            <span>Up to {uploadOptions.maxFiles} files</span>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900">
              Upload Progress ({files.length} files)
            </h4>
            {files.some(f => f.status === 'completed' || f.status === 'error') && (
              <button
                onClick={clearCompleted}
                className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
              >
                Clear completed
              </button>
            )}
          </div>

          <div className="space-y-3">
            {files.map((fileProgress, index) => (
              <div
                key={`${fileProgress.file.name}-${index}`}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <span className="text-2xl flex-shrink-0">
                      {getStatusIcon(fileProgress.status)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {fileProgress.file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(fileProgress.file.size / (1024 * 1024)).toFixed(1)} MB • {getStatusText(fileProgress.status)}
                      </p>
                    </div>
                  </div>
                  
                  {(fileProgress.status === 'selected' || fileProgress.status === 'pending' || fileProgress.status === 'error') && (
                    <button
                      onClick={() => removeFile(fileProgress.file)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Remove file"
                    >
                      ❌
                    </button>
                  )}
                </div>

                {/* Progress Bar */}
                {(fileProgress.status === 'uploading' || fileProgress.status === 'processing') && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {fileProgress.status === 'uploading' ? 'Uploading...' : 'Processing...'}
                      </span>
                      <span className="text-gray-600">{fileProgress.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300 ease-out"
                        style={{ width: `${fileProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {fileProgress.status === 'error' && fileProgress.error && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{formatErrorForDisplay(fileProgress.error)}</p>
                  </div>
                )}

                {/* Success Message */}
                {fileProgress.status === 'completed' && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      Document uploaded and processed successfully!
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Process button removed - files upload automatically */}
        </div>
      )}
    </div>
  );
}