# KanLab

**Research Project Management Dashboard for Academic Labs**

KanLab is a comprehensive research management platform that combines Kanban-style task management with electronic lab notebook (ELN) functionality, literature management, and AI-powered semantic search. Designed specifically for academic and scientific researchers.

---

## Features

### Task Management
- **Kanban Board** - 4-column workflow: Backlog → In Progress → Review → Done
- **Drag-and-Drop** - Reorder tasks within and between columns
- **Task Properties** - Priority levels, due dates, labels, checklists, links, and dependencies
- **Inline Editing** - Double-click to quickly edit task titles
- **Quick-Add Forms** - Rapidly create new tasks in any column

### Project Management
- **Built-in Research Projects** - Pre-configured templates for common research workflows
- **Custom Projects** - Create projects with custom colors, icons, and metadata
- **Project Editing** - Modify title, subtitle, description, hypothesis, and approaches
- **Progress Tracking** - Visual metrics showing task completion status
- **Project Archiving** - Archive inactive projects to declutter your workspace

### Research Documentation
- **Lab Notebook** - Electronic lab notebook with audit trails and version history
- **Auto-Locking** - Entries automatically lock after 24 hours for compliance
- **Research Notes** - Project-specific background, aims, and miscellaneous notes
- **Google Docs Sync** - Integrate notes with Google Workspace

### Literature Management
- **Citation Manager** - Import references via PubMed ID or DOI
- **Bulk Import** - Add multiple citations at once
- **Tagging System** - Organize references with custom tags
- **AI Summaries** - Generate paper summaries using Claude, OpenAI, or Gemini

### Protocols & Results
- **Protocol Documentation** - Record experimental methods and procedures
- **Results Tracking** - Document findings and link to related tasks
- **Structured Format** - Maintain consistent documentation across projects

### Automation & Templates
- **Recurring Tasks** - Schedule automatic task creation (daily, weekly, monthly)
- **Task Templates** - Save and reuse common task configurations
- **Google Calendar** - View and sync calendar events

### Data Management
- **Google Drive Sync** - Automatic cloud backup and synchronization
- **Local Backup** - Export all data as CSV
- **Trash Recovery** - 30-day retention for deleted items

### Search & AI
- **Global Search** - Search across all projects, tasks, notes, and literature
- **Semantic Search** - AI-powered vector search using embeddings
- **Multiple Providers** - Support for Claude, OpenAI, and Google Gemini APIs

---

## Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Claude-Project-01

# Install dependencies
npm install

# Start development server
npm start
```

### Default Access
- **Password**: `research2024`

### Available Scripts

```bash
npm start    # Run development server (http://localhost:3000)
npm build    # Create production build
npm test     # Run test suite
```

---

## Project Structure

```
Claude-Project-01/
├── src/
│   ├── components/          # React components (29+)
│   │   ├── KanbanBoard.js        # Task board with drag-drop
│   │   ├── ProjectPage.js        # Main project interface
│   │   ├── LandingPage.js        # Dashboard & project gallery
│   │   ├── TaskDetailModal.js    # Task editing modal
│   │   ├── LabNotebook.js        # ELN with audit trail
│   │   ├── ResearchNotes.js      # Project documentation
│   │   ├── LiteratureManager.js  # Citation management
│   │   ├── GlobalSearch.js       # Search interface
│   │   └── ...
│   │
│   ├── context/             # State management (9 providers)
│   │   ├── AppContext.js         # Theme & global state
│   │   ├── DataSyncContext.js    # Google Drive sync
│   │   ├── GoogleAuthContext.js  # OAuth & Drive API
│   │   ├── ApiKeysContext.js     # AI API credentials
│   │   ├── SemanticSearchContext.js  # Embeddings
│   │   └── ...
│   │
│   ├── utils/               # Helper functions
│   │   ├── citationFetcher.js    # PubMed/DOI lookup
│   │   ├── embeddingsDb.js       # Vector database
│   │   ├── auditTrail.js         # Entry versioning
│   │   └── ...
│   │
│   ├── data/
│   │   └── projects.js           # Built-in projects
│   │
│   ├── App.js               # Root component
│   ├── App.css              # Global styles (dark theme)
│   └── index.js             # Entry point
│
├── public/
│   └── index.html           # HTML shell with auth
│
├── package.json
└── netlify.toml             # Netlify deployment config
```

---

## Configuration

### API Keys (Optional)

Configure AI providers in Settings → API Keys:

| Provider | Features |
|----------|----------|
| **Claude** (Anthropic) | Text summarization |
| **OpenAI** | Embeddings & chat |
| **Google Gemini** | Embeddings & generation |

### Google Integration

1. Create a Google Cloud project
2. Enable Drive API and Calendar API
3. Configure OAuth 2.0 credentials
4. Add your Client ID in the application settings

### Changing the Password

Edit `public/index.html` and update the `PASSWORD_HASH` value with a new SHA-256 hash.

---

## Data Storage

All data is stored locally in browser localStorage:

| Key | Contents |
|-----|----------|
| `research-dashboard-custom-projects` | User-created projects |
| `research-dashboard-tasks` | Tasks organized by project |
| `research-dashboard-lab-notebook` | Lab notebook entries |
| `research-dashboard-literature` | Citations and references |
| `research-dashboard-recurring` | Recurring task schedules |
| `research-dashboard-templates` | Task templates |
| `research-dashboard-activity` | Activity log (max 100) |
| `research-dashboard-archived` | Archived project IDs |
| `research-dashboard-trash` | Soft-deleted items (30 days) |

---

## Technologies

- **React 18.2** - UI framework
- **React Router DOM 6.20** - Client-side routing
- **Google APIs** - Drive, Calendar, OAuth 2.0
- **AI APIs** - Claude, OpenAI, Gemini
- **PubMed E-utilities** - Literature search
- **localStorage** - Client-side persistence

---

## Deployment

### Netlify

```bash
npm run build
# Deploy the 'build' folder to Netlify
```

Configuration is included in `netlify.toml`.

### GitHub Pages

```bash
npm run build
npx gh-pages -d build
```

---

## Built-in Research Projects

KanLab includes four pre-configured research projects:

1. **TP53 Loss-of-Function in DLBCL** - Investigating immune escape mechanisms
2. **BiTE Therapy Optimization** - T-cell exhaustion and translational models
3. **Chemokine & G-Protein Mutations** - Lymphoma dissemination pathways
4. **Microbial Drivers of NLPHL** - Antigenic stimulation research

These can be customized or archived, and new projects can be created with full customization options.

---

## License

Private project - All rights reserved.
