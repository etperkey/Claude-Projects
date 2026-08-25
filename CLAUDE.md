# Claude Code Project Instructions

> Public portfolio and demo projects. Private research lives in `Claude-Projects-private`.
> See also: Global settings in `~/.claude/CLAUDE.md`

## Personas

Personas are defined globally in `~/.claude/CLAUDE.md`. Available:
- **Samur-AI Claude** - Zen code warrior (pairs with meditation bells)
- **Claude Noir** - Hard-boiled debugger

## Project Structure

Public-facing apps, demos, and tools.

### lab/ — Public Research Tools

| # | Directory | Description | Type |
|---|-----------|-------------|------|
| 05 | `lab/05-bcl-oncoprint` | BCL Oncoprint: Interactive DLBCL cell line mutation viewer | React app |
| 14 | `lab/14-gc-animation` | GC reaction animated simulation with voiceover narration | React app (Vite) |

### nonlab/ — Public Tools & Games

| # | Directory | Description | Type |
|---|-----------|-------------|------|
| 02 | `nonlab/02-kanlab-demo` | KanLab Demo: Public-facing version with sample data | React app |
| 03 | `nonlab/03-lab-tycoon` | Lab Tycoon: Academic survival simulator (Phaser 3) | Game |
| 05 | `nonlab/05-tme-tamagotchi` | TME Tamagotchi: Tumor microenvironment virtual pet | Game |
| 06 | `nonlab/06-gc-folk-song` | GC Folk Song: Lyrics and generation scripts for Udio | Creative |
| 07 | `nonlab/07-nccn-guidelines` | NCCN Guidelines Viewer: Interactive lymphoma treatment explorer | React app |
| 09 | `nonlab/09-strongyloides-fund` | FundRealScience: Ivermectin research funding page | Web |

## KanLab Sync Workflow

When updating KanLab features:
1. Develop features in the private KanLab dashboard (lives in the private repo, not here)
2. Sync feature code to `nonlab/02-kanlab-demo` (preserve demo data in `src/data/`)
3. Build 02-kanlab-demo: `npm run build`
4. Copy build to etp-profile/public/KanLab/
5. Commit and push to deploy via Netlify
