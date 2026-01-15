import { useState, useRef, useCallback } from 'react';
import { useGoogleAuth } from '../context/GoogleAuthContext';

/**
 * Hook for handling file uploads via drag-and-drop, paste, and file picker.
 * Uses Google Drive for storage.
 *
 * @param {Object} options
 * @param {Function} options.onFilesUploaded - Callback with uploaded file metadata array
 * @param {Function} options.onUploadProgress - Optional progress callback
 * @param {number} options.maxFiles - Maximum files allowed (default: 10)
 * @param {string[]} options.acceptedTypes - MIME types to accept (null for all)
 * @param {boolean} options.imageOnly - Quick filter for image-only mode
 */
export function useFileUpload({
  onFilesUploaded,
  onUploadProgress,
  maxFiles = 10,
  acceptedTypes = null,
  imageOnly = false
} = {}) {
  const { isSignedIn, uploadFileToDrive } = useGoogleAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  // Filter files by accepted types
  const filterFiles = useCallback((files) => {
    if (!files || files.length === 0) return [];

    let filtered = Array.from(files);

    // Apply image-only filter
    if (imageOnly) {
      filtered = filtered.filter(f => f.type.startsWith('image/'));
    }

    // Apply accepted types filter
    if (acceptedTypes && acceptedTypes.length > 0) {
      filtered = filtered.filter(file => {
        return acceptedTypes.some(type => {
          if (type.endsWith('/*')) {
            const baseType = type.slice(0, -2);
            return file.type.startsWith(baseType);
          }
          return file.type === type;
        });
      });
    }

    // Limit number of files
    return filtered.slice(0, maxFiles);
  }, [acceptedTypes, imageOnly, maxFiles]);

  // Process and upload files
  const processFiles = useCallback(async (files) => {
    if (!isSignedIn) {
      console.warn('Cannot upload files: not signed in to Google');
      return [];
    }

    const validFiles = filterFiles(files);
    if (validFiles.length === 0) return [];

    setIsUploading(true);
    const uploaded = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const progressText = `Uploading ${i + 1}/${validFiles.length}: ${file.name}`;
      setUploadProgress(progressText);
      if (onUploadProgress) onUploadProgress(progressText);

      try {
        const result = await uploadFileToDrive(file);
        if (result) {
          uploaded.push({
            id: result.id,
            name: result.name,
            mimeType: result.mimeType,
            url: result.webViewLink,
            downloadUrl: result.webContentLink,
            thumbnailLink: result.thumbnailLink,
            iconUrl: result.iconLink,
            uploadedAt: new Date().toISOString(),
            source: 'upload',
            isImage: result.mimeType?.startsWith('image/'),
            size: file.size
          });
        }
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
      }
    }

    setIsUploading(false);
    setUploadProgress('');
    if (onUploadProgress) onUploadProgress('');

    if (uploaded.length > 0 && onFilesUploaded) {
      onFilesUploaded(uploaded);
    }

    return uploaded;
  }, [isSignedIn, filterFiles, uploadFileToDrive, onFilesUploaded, onUploadProgress]);

  // Drag handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;

    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  }, [processFiles]);

  // Paste handler for textarea
  const handlePaste = useCallback(async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files = [];
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault(); // Prevent default paste only if we have files
      await processFiles(files);
    }
    // Let text paste through normally
  }, [processFiles]);

  // File input change handler
  const handleFileInputChange = useCallback(async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  // Trigger file dialog programmatically
  const triggerFileDialog = useCallback((accept = null) => {
    if (fileInputRef.current) {
      if (accept) {
        fileInputRef.current.accept = accept;
      } else if (imageOnly) {
        fileInputRef.current.accept = 'image/*';
      } else if (acceptedTypes) {
        fileInputRef.current.accept = acceptedTypes.join(',');
      } else {
        fileInputRef.current.accept = '';
      }
      fileInputRef.current.click();
    }
  }, [imageOnly, acceptedTypes]);

  // Hidden file input component
  const FileInput = useCallback(() => (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      style={{ display: 'none' }}
      onChange={handleFileInputChange}
    />
  ), [handleFileInputChange]);

  return {
    // State
    isDragging,
    isUploading,
    uploadProgress,
    isSignedIn,

    // Drag handlers (spread onto container)
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop
    },

    // Paste handler (add to textarea)
    pasteHandler: handlePaste,

    // File picker trigger
    triggerFileDialog,

    // Hidden file input (render in component)
    FileInput,
    fileInputRef,

    // Manual file processing
    processFiles
  };
}

export default useFileUpload;
