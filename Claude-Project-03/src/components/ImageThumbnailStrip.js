import React from 'react';

/**
 * Displays a horizontal strip of image thumbnails for attachments.
 * Allows inserting images into text and removing attachments.
 *
 * @param {Object[]} attachments - Array of image attachment objects
 * @param {Function} onRemove - Callback when remove button clicked (receives attachment id)
 * @param {Function} onInsert - Callback when insert button clicked (receives attachment object)
 * @param {boolean} compact - Use smaller thumbnails
 */
function ImageThumbnailStrip({ attachments = [], onRemove, onInsert, compact = false }) {
  // Filter to only images
  const images = attachments.filter(a => a.isImage || a.mimeType?.startsWith('image/'));

  if (images.length === 0) return null;

  const handleOpen = (attachment) => {
    if (attachment.url) {
      window.open(attachment.url, '_blank');
    } else if (attachment.downloadUrl) {
      window.open(attachment.downloadUrl, '_blank');
    }
  };

  return (
    <div className={`image-thumbnail-strip ${compact ? 'compact' : ''}`}>
      {images.map(attachment => (
        <div key={attachment.id} className="thumbnail-item">
          <img
            src={attachment.thumbnailLink || attachment.downloadUrl || attachment.url}
            alt={attachment.name}
            title={attachment.name}
            onClick={() => handleOpen(attachment)}
          />
          <div className="thumbnail-actions">
            {onInsert && (
              <button
                type="button"
                className="btn-insert"
                onClick={(e) => {
                  e.stopPropagation();
                  onInsert(attachment);
                }}
                title="Insert in text"
              >
                +
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                className="btn-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(attachment.id);
                }}
                title="Remove"
              >
                ×
              </button>
            )}
          </div>
          <span className="thumbnail-name">{attachment.name}</span>
        </div>
      ))}
    </div>
  );
}

export default ImageThumbnailStrip;
