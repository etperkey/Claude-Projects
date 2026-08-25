import React, { useState, useRef, useCallback } from 'react';
import MacroTextarea from './MacroTextarea';
import CitableTextarea from './CitableTextarea';
import ImageThumbnailStrip from './ImageThumbnailStrip';
import MarkdownPreview from './MarkdownPreview';
import { useFileUpload } from '../hooks/useFileUpload';
import { useGoogleAuth } from '../context/GoogleAuthContext';

/**
 * A textarea wrapper that adds file upload capabilities (drag-drop, paste, file picker).
 * Supports inline images with preview mode.
 *
 * @param {string} value - Text content
 * @param {Function} onChange - Called when text changes (receives string or event depending on variant)
 * @param {Object[]} attachments - Array of attachment objects
 * @param {Function} onAttachmentsChange - Called when attachments change
 * @param {string} variant - 'macro' | 'citable' | 'plain' (default: 'macro')
 * @param {boolean} showThumbnails - Show image thumbnail strip (default: true)
 * @param {boolean} enableInlineImages - Insert images as inline markers (default: true)
 * @param {boolean} showPreviewToggle - Show edit/preview toggle (default: true)
 * @param {string} projectId - Project ID (required for citable variant)
 * @param {string} projectName - Project name for context
 * @param {string} placeholder - Textarea placeholder
 * @param {number} rows - Textarea rows
 * @param {string} className - Additional CSS classes
 * @param {boolean} disabled - Disable the textarea
 */
function FileUploadTextarea({
  value = '',
  onChange,
  attachments = [],
  onAttachmentsChange,
  variant = 'macro',
  showThumbnails = true,
  enableInlineImages = true,
  showPreviewToggle = true,
  projectId,
  projectName,
  placeholder,
  rows = 4,
  className = '',
  disabled = false,
  ...props
}) {
  const { isSignedIn } = useGoogleAuth();
  const [previewMode, setPreviewMode] = useState(false);
  const containerRef = useRef(null);
  const textareaRef = useRef(null);

  // Handle newly uploaded files
  const handleFilesUploaded = useCallback((newFiles) => {
    if (!onAttachmentsChange) return;

    const updatedAttachments = [...attachments, ...newFiles];
    onAttachmentsChange(updatedAttachments);

    // Insert inline image markers for images
    if (enableInlineImages) {
      const imageFiles = newFiles.filter(f => f.isImage);
      if (imageFiles.length > 0) {
        const markers = imageFiles.map(f => `![${f.name}](attachment:${f.id})`).join('\n');
        insertTextAtCursor(markers + '\n');
      }
    }
  }, [attachments, onAttachmentsChange, enableInlineImages]);

  const {
    isDragging,
    isUploading,
    uploadProgress,
    dragHandlers,
    pasteHandler,
    triggerFileDialog,
    FileInput
  } = useFileUpload({
    onFilesUploaded: handleFilesUploaded,
    maxFiles: 10
  });

  // Insert text at cursor position
  const insertTextAtCursor = useCallback((text) => {
    // Get the actual textarea element
    let textarea = textareaRef.current;
    if (!textarea) {
      // Try to find textarea in the container
      textarea = containerRef.current?.querySelector('textarea');
    }
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const currentValue = value || '';

    const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);

    // Call onChange with appropriate format
    if (variant === 'plain') {
      onChange({ target: { value: newValue } });
    } else {
      // MacroTextarea expects string for onChange
      onChange(newValue);
    }

    // Set cursor position after inserted text
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newPos = start + text.length;
        textarea.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [value, onChange, variant]);

  // Handle removing an attachment
  const handleRemoveAttachment = useCallback((attachmentId) => {
    if (!onAttachmentsChange) return;

    const updated = attachments.filter(a => a.id !== attachmentId);
    onAttachmentsChange(updated);

    // Optionally remove inline reference from text
    const regex = new RegExp(`!\\[[^\\]]*\\]\\(attachment:${attachmentId}\\)\\n?`, 'g');
    const newValue = (value || '').replace(regex, '');
    if (newValue !== value) {
      if (variant === 'plain') {
        onChange({ target: { value: newValue } });
      } else {
        onChange(newValue);
      }
    }
  }, [attachments, onAttachmentsChange, value, onChange, variant]);

  // Handle inserting an image from thumbnail strip
  const handleInsertImage = useCallback((attachment) => {
    const marker = `![${attachment.name}](attachment:${attachment.id})\n`;
    insertTextAtCursor(marker);
  }, [insertTextAtCursor]);

  // Wrap onChange for different variants
  const handleChange = useCallback((valueOrEvent) => {
    if (variant === 'plain') {
      onChange(valueOrEvent);
    } else if (variant === 'citable') {
      // CitableTextarea passes event
      onChange(valueOrEvent);
    } else {
      // MacroTextarea passes string
      onChange(valueOrEvent);
    }
  }, [onChange, variant]);

  // Get image attachments for thumbnail strip
  const imageAttachments = attachments.filter(a => a.isImage || a.mimeType?.startsWith('image/'));

  // Render the appropriate textarea variant
  const renderTextarea = () => {
    const commonProps = {
      value,
      placeholder: placeholder || 'Type here... (drag files to upload, Ctrl+V to paste images)',
      rows,
      className: `upload-textarea ${className}`,
      disabled: disabled || isUploading,
      onPaste: pasteHandler,
      ...props
    };

    switch (variant) {
      case 'citable':
        return (
          <CitableTextarea
            {...commonProps}
            onChange={handleChange}
            projectId={projectId}
            projectName={projectName}
          />
        );
      case 'plain':
        return (
          <textarea
            ref={textareaRef}
            {...commonProps}
            onChange={handleChange}
          />
        );
      default: // 'macro'
        return (
          <MacroTextarea
            {...commonProps}
            onChange={handleChange}
            projectName={projectName}
          />
        );
    }
  };

  return (
    <div
      ref={containerRef}
      className={`file-upload-textarea-wrapper ${isDragging ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
      {...dragHandlers}
    >
      {/* Edit/Preview toggle */}
      {showPreviewToggle && attachments.some(a => a.isImage) && (
        <div className="textarea-mode-toggle">
          <button
            type="button"
            className={!previewMode ? 'active' : ''}
            onClick={() => setPreviewMode(false)}
          >
            Edit
          </button>
          <button
            type="button"
            className={previewMode ? 'active' : ''}
            onClick={() => setPreviewMode(true)}
          >
            Preview
          </button>
        </div>
      )}

      {/* Drop overlay */}
      {isDragging && (
        <div className="drop-overlay">
          <div className="drop-overlay-content">
            <span className="drop-icon">📎</span>
            <span>Drop files to upload</span>
          </div>
        </div>
      )}

      {/* Main content - textarea or preview */}
      {previewMode ? (
        <MarkdownPreview
          content={value}
          attachments={attachments}
          className="preview-content"
        />
      ) : (
        renderTextarea()
      )}

      {/* Upload progress indicator */}
      {isUploading && (
        <div className="upload-indicator">
          <span className="spinner"></span>
          <span>{uploadProgress}</span>
        </div>
      )}

      {/* Thumbnail strip for images */}
      {showThumbnails && imageAttachments.length > 0 && !previewMode && (
        <ImageThumbnailStrip
          attachments={imageAttachments}
          onRemove={handleRemoveAttachment}
          onInsert={handleInsertImage}
        />
      )}

      {/* Action buttons */}
      <div className="upload-textarea-actions">
        {isSignedIn ? (
          <>
            <button
              type="button"
              className="btn-upload-file"
              onClick={() => triggerFileDialog()}
              disabled={isUploading || disabled}
              title="Add file attachment"
            >
              📎 Add File
            </button>
            <button
              type="button"
              className="btn-upload-image"
              onClick={() => triggerFileDialog('image/*')}
              disabled={isUploading || disabled}
              title="Add image"
            >
              🖼️ Add Image
            </button>
          </>
        ) : (
          <span className="upload-disabled-hint">
            Connect Google Drive to add files
          </span>
        )}
        {attachments.length > 0 && (
          <span className="attachment-count">
            {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
          </span>
        )}
      </div>

      {/* Hidden file input */}
      <FileInput />
    </div>
  );
}

export default FileUploadTextarea;
