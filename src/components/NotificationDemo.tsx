'use client';

import { useNotifications } from '@/contexts/NotificationContext';

export default function NotificationDemo() {
  const {
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyWarning,
    notifyUploadProgress,
    notifyUploadComplete,
    notifyUploadError,
  } = useNotifications();

  const createTestNotifications = () => {
    // Basic notifications
    notifyInfo('System Update', 'A new version of the application is available.');
    
    setTimeout(() => {
      notifySuccess('Profile Updated', 'Your profile has been successfully updated.');
    }, 1000);

    setTimeout(() => {
      notifyWarning('Storage Warning', 'You are approaching your storage limit.');
    }, 2000);

    setTimeout(() => {
      notifyError('Upload Failed', 'Failed to upload document due to network error.');
    }, 3000);

    // Upload workflow simulation
    setTimeout(() => {
      const uploadId = 'demo_upload_123';
      notifyUploadProgress('File Upload', 'Uploading AcmeInsurance_2024.pdf...', uploadId);
      
      setTimeout(() => {
        notifyUploadProgress('Processing', 'Processing AcmeInsurance_2024.pdf with LlamaParse...', uploadId);
      }, 1500);

      setTimeout(() => {
        notifyUploadProgress('Extracting Details', 'Extracting insurance product details...', uploadId);
      }, 3000);

      setTimeout(() => {
        notifyUploadProgress('Creating Embeddings', 'Creating vector embeddings for search...', uploadId);
      }, 4500);

      setTimeout(() => {
        notifyUploadComplete(
          'Successfully processed AcmeInsurance_2024.pdf. Document is now searchable and ready for chat.',
          uploadId,
          'doc_456'
        );
      }, 6000);
    }, 4000);
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Demo</h3>
      <p className="text-gray-600 mb-4">
        Test the notification system with various types of notifications including upload workflow simulation.
      </p>
      <button
        onClick={createTestNotifications}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 text-sm font-medium"
      >
        Create Test Notifications
      </button>
    </div>
  );
}