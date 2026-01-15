import React, { useMemo } from 'react';

/**
 * Renders text content with inline images resolved from attachment references.
 * Supports markdown-style image syntax: ![alt](attachment:id)
 *
 * @param {string} content - Text content with possible attachment references
 * @param {Object[]} attachments - Array of attachment objects
 * @param {string} className - Additional CSS class
 */
function MarkdownPreview({ content = '', attachments = [], className = '' }) {
  // Build attachment lookup map
  const attachmentMap = useMemo(() => {
    const map = {};
    attachments.forEach(a => {
      map[a.id] = a;
    });
    return map;
  }, [attachments]);

  // Parse and render content
  const renderedContent = useMemo(() => {
    if (!content) return null;

    // Split on image markers: ![alt](attachment:id)
    const parts = content.split(/(!\[[^\]]*\]\(attachment:[^)]+\))/g);

    return parts.map((part, index) => {
      // Check if this part is an image marker
      const match = part.match(/!\[([^\]]*)\]\(attachment:([^)]+)\)/);

      if (match) {
        const [, alt, attachmentId] = match;
        const attachment = attachmentMap[attachmentId];

        if (attachment && (attachment.isImage || attachment.mimeType?.startsWith('image/'))) {
          const imageUrl = attachment.thumbnailLink || attachment.downloadUrl || attachment.url;
          return (
            <span key={index} className="inline-image-wrapper">
              <img
                src={imageUrl}
                alt={alt || attachment.name}
                className="inline-image"
                onClick={() => window.open(attachment.url || attachment.downloadUrl, '_blank')}
                title={`${attachment.name} - Click to open full size`}
              />
            </span>
          );
        }

        // Attachment not found or not an image - show placeholder
        return (
          <span key={index} className="missing-attachment">
            [Image: {alt || 'Unknown'}]
          </span>
        );
      }

      // Regular text - render with line breaks preserved
      if (!part) return null;

      return (
        <span key={index}>
          {part.split('\n').map((line, lineIndex, arr) => (
            <React.Fragment key={lineIndex}>
              {line}
              {lineIndex < arr.length - 1 && <br />}
            </React.Fragment>
          ))}
        </span>
      );
    });
  }, [content, attachmentMap]);

  return (
    <div className={`markdown-preview ${className}`}>
      {renderedContent || <span className="empty-content">No content</span>}
    </div>
  );
}

export default MarkdownPreview;
