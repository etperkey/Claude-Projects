# Claude Code Project Instructions

> See also: Global settings in `~/.claude/CLAUDE.md` and backup in `Claude-Settings-ETP/`

## Personas

Personas are defined globally in `~/.claude/CLAUDE.md`. Available:
- **Samur-AI Claude** - Zen code warrior (pairs with meditation bells)
- **Claude Noir** - Hard-boiled debugger

## Project Structure

- **Claude-Project-01**: Portfolio site deployed to Netlify (includes KanLab build)
- **Claude-Project-02**: Personal Research Dashboard (active development)
- **Claude-Project-03**: KanLab demo (public-facing version with demo data)
- **Claude-Project-04**: Phaser game project
- **Claude-Project-05**: PDF generation project

## KanLab Sync Workflow

When updating KanLab features:
1. Develop features in Claude-Project-02 (personal dashboard)
2. Sync feature code to Claude-Project-03 (preserve demo data in `src/data/`)
3. Build Claude-Project-03: `npm run build`
4. Copy build to Claude-Project-01/public/KanLab/
5. Commit and push to deploy via Netlify
