import React, { useState, useRef } from 'react';
import { useGoogleAuth } from '../context/GoogleAuthContext';

// Icon mapping for common file types
const getFileIcon = (mimeType, iconUrl) => {
  if (iconUrl) return iconUrl;

  if (mimeType?.includes('pdf')) return '📄';
  if (mimeType?.includes('image')) return '🖼️';
  if (mimeType?.includes('video')) return '🎬';
  if (mimeType?.includes('audio')) return '🎵';
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return '📊';
  if (mimeType?.includes('document') || mimeType?.includes('word')) return '📝';
  if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return '📽️';
  if (mimeType?.includes('zip') || mimeType?.includes('archive')) return '📦';
  return '📎';
};

// Format file size
const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function FileAttachments({
  attachments = [],
  onUpdate,
  maxFiles = 10,
  acceptedTypes = null, // e.g., ['application/pdf', 'image/*']
  showUpload = true,
  showPicker = true,
  compact = false
}) {
  const { isSignedIn, pickerLoaded, uploadFileToDrive, openFilePicker } = useGoogleAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef(null);

  // Handle local file upload
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (attachments.length + files.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setIsUploading(true);
    const newAttachments = [...attachments];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Uploading ${i + 1}/${files.length}: ${file.name}`);

      try {
        const result = await uploadFileToDrive(file);
        if (result) {
          newAttachments.push({
            id: result.id,
            name: result.name,
            mimeType: result.mimeType,
            url: result.webViewLink,
            downloadUrl: result.webContentLink,
            iconUrl: result.iconLink,
            uploadedAt: new Date().toISOString(),
            source: 'upload'
          });
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }

    onUpdate(newAttachments);
    setIsUploading(false);
    setUploadProgress('');

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle Google Drive picker
  const handlePickFromDrive = async () => {
    if (!pickerLoaded || !isSignedIn) {
      alert('Please sign in to Google to use this feature');
      return;
    }

    if (attachments.length >= maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    try {
      const result = await openFilePicker({
        multiSelect: true,
        mimeTypes: acceptedTypes
      });

      if (result) {
        const files = Array.isArray(result) ? result : [result];
        const newAttachments = [...attachments];

        for (const file of files) {
          // Check if already attached
          if (newAttachments.some(a => a.id === file.id)) continue;

          // Check max files
          if (newAttachments.length >= maxFiles) break;

          newAttachments.push({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            url: file.url,
            iconUrl: file.iconUrl,
            linkedAt: new Date().toISOString(),
            source: 'drive'
          });
        }

        onUpdate(newAttachments);
      }
    } catch (error) {
      console.error('Picker error:', error);
    }
  };

  // Remove attachment
  const handleRemove = (attachmentId) => {
    onUpdate(attachments.filter(a => a.id !== attachmentId));
  };

  if (!isSignedIn) {
    return (
      <div className={`file-attachments ${compact ? 'compact' : ''}`}>
        <div className="attachments-signin-prompt">
          Sign in to Google to attach files
        </div>
      </div>
    );
  }

  return (
    <div className={`file-attachments ${compact ? 'compact' : ''}`}>
      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="attachments-list">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="attachment-item">
              <span className="attachment-icon">
                {typeof getFileIcon(attachment.mimeType, attachment.iconUrl) === 'string' &&
                 getFileIcon(attachment.mimeType, attachment.iconUrl).startsWith('http') ? (
                  <img src={attachment.iconUrl} alt="" />
                ) : (
                  getFileIcon(attachment.mimeType, attachment.iconUrl)
                )}
              </span>
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="attachment-name"
                title={attachment.name}
              >
                {attachment.name}
              </a>
              {attachment.size && (
                <span className="attachment-size">{formatFileSize(attachment.size)}</span>
              )}
              <span className={`attachment-source ${attachment.source}`}>
                {attachment.source === 'upload' ? '↑' : '☁'}
              </span>
              <button
                className="attachment-remove"
                onClick={() => handleRemove(attachment.id)}
                title="Remove attachment"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload/picker buttons */}
      {(showUpload || showPicker) && attachments.length < maxFiles && (
        <div className="attachments-actions">
          {showUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={acceptedTypes?.join(',')}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="file-upload-input"
              />
              <button
                className="btn-attach upload"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? '⏳' : '📤'} {compact ? '' : 'Upload'}
              </button>
            </>
          )}

          {showPicker && pickerLoaded && (
            <button
              className="btn-attach picker"
              onClick={handlePickFromDrive}
              disabled={isUploading}
            >
              ☁️ {compact ? '' : 'Google Drive'}
            </button>
          )}
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress && (
        <div className="upload-progress">{uploadProgress}</div>
      )}

      {/* Empty state */}
      {attachments.length === 0 && !compact && (
        <div className="attachments-empty">
          No files attached
        </div>
      )}
    </div>
  );
}

export default FileAttachments;
