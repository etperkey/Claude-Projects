# KanLab Architecture

Technical documentation for the KanLab research management platform.

---

## Application Architecture

### Component Tree

```
App.js (Root)
└─ ToastProvider
   └─ GoogleAuthProvider (OAuth, Drive API)
      └─ DataSyncProvider (Sync trigger)
         └─ AutoBackupProvider (Scheduled backups)
            └─ AppProvider (Theme, activities)
               └─ ApiKeysProvider (AI credentials)
                  └─ SemanticSearchProvider (Embeddings)
                     └─ ReferencesProvider
                        └─ TrashProvider
                           └─ HashRouter
                              └─ Routes & Components
```

### State Management

KanLab uses React Context API for global state management across 9 specialized providers:

| Provider | Responsibility |
|----------|----------------|
| `ToastContext` | Toast notifications |
| `GoogleAuthContext` | OAuth tokens, Drive/Calendar API |
| `DataSyncContext` | Sync triggers and debouncing |
| `AutoBackupContext` | Scheduled automatic backups |
| `AppContext` | Theme, activities, archives |
| `ApiKeysContext` | AI provider API keys |
| `SemanticSearchContext` | Embedding generation & search |
| `ReferencesContext` | Citation data management |
| `TrashContext` | Soft delete and recovery |

---

## Data Flow

### Persistence Flow

```
User Action
    │
    ▼
Component State Update
    │
    ▼
useEffect Hook
    │
    ├──────────────────────────────────┐
    ▼                                  ▼
localStorage.setItem()     DataSyncContext.triggerSync()
    │                                  │
    │                                  ▼
    │                      Google Drive API (if authenticated)
    │                                  │
    └──────────────────────────────────┘
                    │
                    ▼
           Toast Notification
```

### Sync Architecture

- **Debounced Sync**: 3-second delay to prevent API throttling
- **Bidirectional**: localStorage ↔ Google Drive
- **Conflict Resolution**: Last-write-wins strategy
- **Scope**: Handles both global and per-project data keys

---

## Core Components

### KanbanBoard (`src/components/KanbanBoard.js`)

The main task visualization component.

**Features:**
- HTML5 Drag and Drop API for task reordering
- 4-column layout (Backlog, In Progress, Review, Done)
- Inline title editing via double-click
- Quick-add forms per column
- Task filtering and search

**Key Functions:**
- `handleDragStart` / `handleDragEnd` - Drag state management
- `handleDrop` - Column drop handling with position calculation
- `updateTaskColumn` - Task column/position updates

### ProjectPage (`src/components/ProjectPage.js`)

Multi-tab project interface.

**Tabs:**
- Board - Kanban task view
- Notebook - Lab notebook entries
- Notes - Research documentation
- Literature - Citation manager
- Protocols - Experimental protocols
- Results - Research findings

**Features:**
- Project metadata display
- Task statistics and progress
- Project editing modal

### TaskDetailModal (`src/components/TaskDetailModal.js`)

Comprehensive task editor modal.

**Editable Properties:**
- Title and description
- Priority (high/medium/low)
- Due date
- Labels (8 color options)
- Checklist items
- External links
- Task dependencies

### LabNotebook (`src/components/LabNotebook.js`)

Electronic lab notebook with compliance features.

**Features:**
- Auto-locking after 24 hours
- Audit trail with version history
- Change tracking (who, when, what)
- Google Docs integration
- Entry types: CREATE, EDIT, LOCK, UNLOCK

### LiteratureManager (`src/components/LiteratureManager.js`)

Citation and reference management.

**Features:**
- PubMed ID lookup via E-utilities
- DOI resolution
- Bulk import
- Tag-based organization
- AI-powered summaries

### GlobalSearch (`src/components/GlobalSearch.js`)

Unified search interface.

**Search Modes:**
- Keyword search (traditional text matching)
- Semantic search (vector embeddings)

**Searchable Content:**
- Projects
- Tasks
- Notebook entries
- Literature
- Protocols
- Results
- Notes

### FileUploadTextarea (`src/components/FileUploadTextarea.js`)

Wrapper component that adds file upload capabilities to text areas.

**Features:**
- Drag-and-drop file upload overlay
- Clipboard paste handling for images
- File picker buttons (images/all files)
- Upload progress indicator
- Edit/Preview mode toggle
- Integrates with MacroTextarea and CitableTextarea

**Props:**
- `variant` - "macro", "citable", or "plain"
- `attachments` - Array of attachment objects
- `onAttachmentsChange` - Callback when attachments change
- `showThumbnails` - Show thumbnail strip below textarea
- `enableInlineImages` - Allow inline image markers

### ImageThumbnailStrip (`src/components/ImageThumbnailStrip.js`)

Horizontal scrolling strip of image thumbnails.

**Features:**
- Displays image attachments as clickable thumbnails
- "Insert" button to add image reference to text
- "×" button to remove attachment
- Opens full image in Google Drive on click

### MarkdownPreview (`src/components/MarkdownPreview.js`)

Renders text content with inline images resolved from attachments.

**Features:**
- Parses `![name](attachment:id)` markers
- Resolves to Google Drive thumbnail URLs
- Clickable images open in new tab
- Preserves text formatting

---

## Custom Hooks

### useFileUpload (`src/hooks/useFileUpload.js`)

Core hook for handling file uploads via drag/drop/paste.

```javascript
const {
  isDragging,        // Boolean - show drag overlay
  isUploading,       // Boolean - show progress
  uploadProgress,    // String - status message
  dragHandlers,      // Object - onDragEnter, onDragOver, onDragLeave, onDrop
  pasteHandler,      // Function - onPaste handler
  triggerFileDialog, // Function - open file picker
  FileInput          // Component - hidden file input
} = useFileUpload({
  onFilesUploaded,   // Callback with uploaded file info
  onUploadProgress,  // Progress callback
  maxFiles,          // Max files per upload (default 10)
  acceptedTypes,     // MIME type filter
  imageOnly          // Restrict to images
});
```

---

## Utility Modules

### citationFetcher.js

Fetches citation data from external APIs.

```javascript
// PubMed lookup
fetchByPMID(pmid) → { title, authors, journal, year, abstract, doi }

// DOI lookup
fetchByDOI(doi) → { title, authors, journal, year, abstract }
```

### embeddingsDb.js

Vector database for semantic search.

```javascript
// Store embedding
storeEmbedding(id, type, content, vector)

// Search similar
searchSimilar(queryVector, limit) → [{ id, type, similarity }]
```

### auditTrail.js

Audit trail management for lab notebook compliance.

```javascript
// Record change
recordChange(entryId, changeType, previousValue, newValue, userId)

// Get history
getEntryHistory(entryId) → [{ timestamp, type, user, changes }]
```

### AI API Clients

- `claudeApi.js` - Anthropic Claude API client
- `openaiEmbeddings.js` - OpenAI API for embeddings/chat
- `geminiApi.js` - Google Gemini API client

---

## Data Models

### Project

```javascript
{
  id: string,              // Unique identifier
  title: string,           // Project name
  subtitle: string,        // Short description
  description: string,     // Full description
  color: string,           // Theme color (hex)
  icon: string,            // Icon identifier
  hypothesis: string,      // Research hypothesis
  approaches: string[],    // Research methodologies
  isBuiltIn: boolean,      // System vs custom project
  archived: boolean        // Archive status
}
```

### Task

```javascript
{
  id: string,              // Unique identifier
  title: string,           // Task name
  description: string,     // Task details
  column: string,          // Current column (backlog/inprogress/review/done)
  position: number,        // Order within column
  priority: string,        // high/medium/low
  dueDate: string,         // ISO date string
  labels: string[],        // Color labels
  checklist: [             // Subtasks
    { id: string, text: string, completed: boolean }
  ],
  links: string[],         // External URLs
  dependencies: string[],  // Task IDs this depends on
  attachments: [           // File attachments
    { id: string, name: string, mimeType: string, isImage: boolean,
      webViewLink: string, thumbnailLink: string }
  ]
}
```

### Notebook Entry

```javascript
{
  id: string,              // Unique identifier
  projectId: string,       // Parent project
  title: string,           // Entry title
  content: string,         // Entry content (markdown)
  createdAt: string,       // ISO timestamp
  updatedAt: string,       // ISO timestamp
  locked: boolean,         // Lock status
  lockedAt: string,        // Lock timestamp
  auditTrail: [            // Change history
    { timestamp, type, userId, changes }
  ],
  attachments: [           // File attachments
    { id: string, name: string, mimeType: string, isImage: boolean,
      webViewLink: string, thumbnailLink: string }
  ]
}
```

### Literature Reference

```javascript
{
  id: string,              // Unique identifier
  projectId: string,       // Parent project
  title: string,           // Paper title
  authors: string[],       // Author list
  journal: string,         // Publication venue
  year: number,            // Publication year
  abstract: string,        // Paper abstract
  pmid: string,            // PubMed ID
  doi: string,             // Digital Object Identifier
  tags: string[],          // Custom tags
  notes: string,           // User notes
  summary: string          // AI-generated summary
}
```

### Trash Item

```javascript
{
  id: string,              // Unique identifier
  type: string,            // Item type (task/project/reference/etc)
  data: object,            // Original item data
  deletedAt: string,       // Deletion timestamp
  expiresAt: string        // Auto-purge date (30 days)
}
```

---

## Security

### Authentication

- Password-based access control
- SHA-256 hash verification
- Session-based authentication via sessionStorage

### API Key Storage

- User API keys stored in localStorage
- Keys never sent to external servers except their respective APIs
- No server-side key storage

### Data Privacy

- All data stored client-side (localStorage)
- Google Drive sync is opt-in
- No analytics or tracking

---

## External API Integration

### Google APIs

| API | Usage |
|-----|-------|
| OAuth 2.0 | User authentication |
| Drive API | File sync and backup |
| Calendar API | Event viewing and publishing |

### Research APIs

| API | Usage |
|-----|-------|
| PubMed E-utilities | Citation lookup by PMID |
| DOI REST API | Citation lookup by DOI |

### AI APIs

| Provider | Capabilities |
|----------|--------------|
| Claude (Anthropic) | Text summarization |
| OpenAI | Embeddings, chat completion |
| Google Gemini | Embeddings, text generation |

---

## Performance Considerations

### Debouncing

Data sync operations are debounced with a 3-second delay to:
- Prevent API rate limiting
- Reduce network requests
- Batch multiple rapid changes

### Activity Log Limits

- Maximum 100 activity entries retained
- Oldest entries automatically pruned
- Reduces localStorage consumption

### Vector Search

- Embeddings stored in localStorage
- Cached to avoid recomputation
- Configurable embedding model per provider

---

## Design Patterns

| Pattern | Implementation |
|---------|----------------|
| Provider Pattern | Nested context providers for feature isolation |
| Hooks Pattern | Custom hooks for reusable logic |
| Controlled Components | Form inputs managed through state |
| Modal Pattern | Overlay-based editing interfaces |
| Tab Navigation | Multi-view interfaces within pages |
| Drag-and-Drop | HTML5 native drag API |
| Debouncing | Sync optimization |

---

## Browser Compatibility

Tested and supported:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (Chromium-based)

Required Browser APIs:
- localStorage / sessionStorage
- Fetch API
- Crypto API (SubtleCrypto)
- HTML5 Drag and Drop
- Clipboard API (paste images)
- File API (file reading)
