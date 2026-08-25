# Claude Projects

Public portfolio of research tools, demos, and games built with Claude Code.

Each folder is a self-contained project with its own README and build setup.
Private research projects are kept in a separate private repository and are not
part of this repo.

---

## Lab — Research Tools

| Folder | Description | Stack |
|--------|-------------|-------|
| **lab/05-bcl-oncoprint** | Interactive DLBCL cell line viewer — mutations, CNV, expression, CRISPR/RNAi dependency, and fusions from public DepMap releases | React |
| **lab/14-gc-animation** | Animated simulation of the germinal center reaction, with voiceover narration | React (Vite) |

## Nonlab — Tools & Games

| Folder | Description | Stack |
|--------|-------------|-------|
| **nonlab/02-kanlab-demo** | KanLab Demo — research project management dashboard (Kanban + ELN), shipped with sample data | React |
| **nonlab/03-lab-tycoon** | Lab Tycoon — dark-satire academic survival simulator | Phaser 3 |
| **nonlab/05-tme-tamagotchi** | TME Tamagotchi — tumor microenvironment virtual pet | Game |
| **nonlab/06-gc-folk-song** | GC Folk Song — lyrics and generation scripts for the germinal center folk song | Creative |
| **nonlab/07-nccn-guidelines** | NCCN Guidelines Viewer — interactive lymphoma treatment explorer | React |
| **nonlab/09-strongyloides-fund** | FundRealScience — research funding page | Web |

---

## Getting Started

Most projects are standard Node apps:

```bash
cd <project-folder>
npm install
npm start        # or: npm run dev
```

See the individual project README for anything that differs.

---

## Configuration Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Claude Code project instructions |
| `.gitignore` | Ignore rules — dependencies, build output, and private projects |
| `.gitattributes` | Git LFS configuration |

---

*Last updated: 2026-08-25*
