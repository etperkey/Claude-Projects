# KanLab Demo

**Public demo version of KanLab - Research Project Management Dashboard**

This is the public-facing demo deployment of KanLab, showcasing the platform's features with sample research data.

## About

KanLab Demo is a standalone version of the Research Dashboard designed for public demonstration. It includes pre-populated demo data to showcase features without requiring user setup.

## Features

- Kanban-style task management (Backlog → In Progress → Review → Done)
- Electronic Lab Notebook (ELN) with rich text editing
- Literature management and organization
- Project-based organization with custom colors and icons
- Drag-and-drop file uploads with inline images
- Task due dates with optional times
- Calendar event integration

## Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Deployment

This demo is built and deployed to the portfolio site:

1. Run `npm run build`
2. Copy build output to `Claude-Project-01/public/KanLab/`
3. Commit and push to deploy via Netlify

## Related Projects

- **Claude-Project-02**: Main KanLab development (personal dashboard)
- **Claude-Project-01**: Portfolio site hosting this demo
