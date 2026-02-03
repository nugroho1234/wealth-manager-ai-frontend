export interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'selected' | 'pending' | 'uploading' | 'processing' | 'extracting' | 'storing' | 'vectorizing' | 'completed' | 'error';
  error?: string;
  uploadId?: string;
}

export interface UploadResponse {
  upload_id: string;
  filename: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  message?: string;
}

export interface ProcessingStatus {
  upload_id: string;
  filename: string;
  status: 'processing' | 'parsing' | 'extracting' | 'storing' | 'completed' | 'failed';
  progress_percentage: number;
  current_step: string;
  error?: string;
  estimated_completion?: string;
}

export interface UploadedDocument {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  content_type: string;
  upload_status: 'uploaded' | 'processing' | 'completed' | 'failed';
  processing_status?: ProcessingStatus;
  uploaded_at: string;
  processed_at?: string;
  error_message?: string;
}

export interface FileValidationError {
  file: File;
  error: string;
}

export interface FileUploadOptions {
  maxFiles?: number;
  maxSizeBytes?: number;
  acceptedFileTypes?: string[];
  allowMultiple?: boolean;
}

export const DEFAULT_UPLOAD_OPTIONS: FileUploadOptions = {
  maxFiles: 1,
  maxSizeBytes: 15 * 1024 * 1024, // 15MB
  acceptedFileTypes: ['application/pdf'],
  allowMultiple: false,
};