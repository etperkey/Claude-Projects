# KanLab User Guide

A complete guide to using the KanLab research project management platform.

---

## Getting Started

### Logging In

1. Open KanLab in your browser
2. Enter the password: `research2024` (default)
3. Click "Enter" to access the dashboard

### The Dashboard

After logging in, you'll see the Landing Page with:
- **Project Gallery** - All your research projects as cards
- **Quick Stats** - Overview of tasks and progress
- **Navigation** - Access settings, search, and utilities

---

## Managing Projects

### Viewing Projects

From the dashboard, you can:
- Click any project card to open it
- See progress bars showing task completion
- View project color and icon at a glance

### Creating a New Project

1. Click the **"+ New Project"** button on the dashboard
2. Fill in the project details:
   - **Title** - Project name
   - **Subtitle** - Short description
   - **Description** - Full project overview
   - **Hypothesis** - Research hypothesis
   - **Color** - Theme color for the project
   - **Icon** - Visual identifier
3. Click **"Create"**

### Editing a Project

1. Open the project
2. Click the **Edit** icon (pencil) in the header
3. Modify any project details
4. Click **"Save Changes"**

### Archiving a Project

1. Open the project
2. Click the **Archive** button
3. Confirm the action

Archived projects are moved out of the main view but can be restored later.

---

## Task Management

### The Kanban Board

Each project has a Kanban board with four columns:

| Column | Purpose |
|--------|---------|
| **Backlog** | Tasks not yet started |
| **In Progress** | Tasks currently being worked on |
| **Review** | Tasks awaiting review or verification |
| **Done** | Completed tasks |

### Creating Tasks

**Quick Add:**
1. Click in the "Add a task..." input at the bottom of any column
2. Type the task title
3. Press Enter

**Detailed Task:**
1. Click **"+ Add Task"** in any column
2. Fill in all desired properties
3. Click **"Create Task"**

### Moving Tasks

**Drag and Drop:**
1. Click and hold a task card
2. Drag it to the desired column
3. Drop it in position

Tasks automatically reorder within columns.

### Editing Tasks

1. Click on any task card to open the detail modal
2. Edit any of these properties:

| Property | Description |
|----------|-------------|
| **Title** | Task name |
| **Description** | Detailed task information |
| **Priority** | High, Medium, or Low |
| **Due Date** | Target completion date |
| **Labels** | Color-coded categories |
| **Checklist** | Subtasks with checkboxes |
| **Links** | External URLs related to the task |
| **Dependencies** | Other tasks this depends on |

3. Changes save automatically

### Quick Title Edit

Double-click on any task title to edit it inline without opening the modal.

### Deleting Tasks

1. Open the task detail modal
2. Click **"Delete Task"**
3. Confirm the deletion

Deleted tasks go to Trash and can be recovered within 30 days.

---

## Lab Notebook

### Creating Entries

1. Go to the **Notebook** tab in any project
2. Click **"+ New Entry"**
3. Enter a title and content
4. Click **"Save"**

### Entry Features

- **Markdown Support** - Format text using markdown syntax
- **Timestamps** - Automatic creation and modification times
- **Auto-Lock** - Entries lock after 24 hours for compliance

### Audit Trail

Each entry maintains a complete history:
- Who made changes
- When changes occurred
- What was modified

View the audit trail by clicking the history icon on any entry.

### Locked Entries

After 24 hours, entries automatically lock to preserve research integrity. Locked entries:
- Cannot be edited
- Show a lock icon
- Retain full audit history

---

## Research Notes

The **Notes** tab provides project-level documentation:

### Background
Overall context and background for the research project.

### Specific Aims
Detailed research objectives and goals.

### Miscellaneous Notes
General notes, ideas, and observations.

Each section auto-saves as you type.

---

## Literature Manager

### Adding References

**By PubMed ID:**
1. Go to the **Literature** tab
2. Enter a PubMed ID (PMID)
3. Click **"Fetch"**
4. Review and save the citation

**By DOI:**
1. Enter the DOI
2. Click **"Fetch"**
3. Review and save

**Bulk Import:**
1. Click **"Bulk Import"**
2. Paste multiple PMIDs or DOIs (one per line)
3. Click **"Import All"**

### Managing References

- **Tags** - Add custom tags for organization
- **Notes** - Add personal notes to any reference
- **Summary** - Generate AI summaries (requires API key)

### Searching Literature

Use the search box to filter references by:
- Title
- Authors
- Tags
- Notes

---

## Protocols & Results

### Protocols Tab

Document experimental procedures:
1. Go to the **Protocols** tab
2. Click **"+ New Protocol"**
3. Enter protocol details
4. Save

### Results Tab

Record research findings:
1. Go to the **Results** tab
2. Click **"+ New Result"**
3. Document findings
4. Link to related tasks or protocols

---

## Automation

### Recurring Tasks

Set up tasks that automatically repeat:

1. Open **Settings → Recurring Tasks**
2. Click **"+ New Recurring Task"**
3. Configure:
   - Task title and details
   - Target project
   - Frequency (daily, weekly, bi-weekly, monthly)
   - Start date
4. Save

Recurring tasks automatically create new task instances on schedule.

### Task Templates

Save task configurations for reuse:

1. Open **Settings → Task Templates**
2. Click **"+ New Template"**
3. Configure template properties
4. Save

To use a template:
1. Click **"+ Add from Template"** in any column
2. Select the template
3. A new task is created with template values

---

## Search

### Global Search

1. Click the search icon in the navigation bar
2. Enter your search query
3. Results show matches from:
   - Projects
   - Tasks
   - Notebook entries
   - Literature
   - Protocols
   - Results
   - Notes

### Semantic Search

For AI-powered search (requires API key):

1. Enable semantic search in Settings
2. Configure your preferred AI provider
3. Search queries will use vector embeddings for smarter results

---

## Google Integration

### Connecting Google Account

1. Go to **Settings → Google Integration**
2. Click **"Connect Google Account"**
3. Authorize the requested permissions
4. Select features to enable

### Google Drive Sync

When connected, KanLab can:
- Auto-backup your data to Drive
- Sync changes across devices
- Import data from existing backups

### Google Calendar

- View upcoming calendar events
- Publish tasks as calendar events
- Sync due dates with your calendar

---

## Settings

### Theme

Toggle between light and dark themes via the sun/moon icon in the navigation bar.

### API Keys

Configure AI providers for enhanced features:

| Provider | Setup |
|----------|-------|
| **Claude** | Enter your Anthropic API key |
| **OpenAI** | Enter your OpenAI API key |
| **Gemini** | Enter your Google AI API key |

API keys are stored locally and never sent to our servers.

### Backup & Export

**Manual Backup:**
1. Click the backup icon in the navigation bar
2. Choose export format (JSON or CSV)
3. Download the backup file

**Auto-Backup:**
When Google Drive is connected, automatic backups occur on data changes.

---

## Trash & Recovery

### Viewing Trash

1. Go to **Settings → Trash**
2. View all deleted items

### Restoring Items

1. Find the item in Trash
2. Click **"Restore"**
3. Item returns to its original location

### Permanent Deletion

- Items in Trash auto-delete after 30 days
- To permanently delete immediately, use **"Delete Forever"**

---

## Activity Timeline

View a history of all actions:

1. Click the activity icon in the navigation bar
2. See recent actions:
   - Task created/moved/updated/deleted
   - Project changes
   - Notebook edits
   - And more

The timeline shows the most recent 100 actions.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Double-click task` | Inline title edit |
| `Escape` | Close modal |
| `Enter` | Submit quick-add form |

---

## Tips & Best Practices

### Task Organization

- Use **labels** to categorize tasks by type (experiment, analysis, writing)
- Set **priorities** to focus on what matters most
- Add **due dates** to track deadlines
- Use **checklists** for multi-step tasks

### Project Structure

- Keep project descriptions updated
- Use the hypothesis field to maintain research focus
- Archive completed projects to reduce clutter

### Documentation

- Make regular notebook entries to document progress
- Use the literature manager to track all references
- Document protocols as you develop them

### Data Safety

- Enable Google Drive sync for cloud backups
- Periodically export local backups
- Keep API keys secure

---

## Troubleshooting

### Data Not Saving

1. Check browser localStorage is not full
2. Try refreshing the page
3. Export a backup and reimport

### Google Sync Not Working

1. Verify your Google account is connected
2. Check that Drive permissions are granted
3. Try disconnecting and reconnecting

### Search Not Finding Results

1. Ensure content has been indexed
2. For semantic search, verify API key is configured
3. Try simpler search terms

### Performance Issues

1. Archive old projects
2. Clear completed tasks periodically
3. Limit activity log size

---

## Getting Help

For additional support:
- Check the README.md for technical details
- Review ARCHITECTURE.md for system information
- Contact your system administrator
