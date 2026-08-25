# Lab Tycoon

**A dark satire academic survival simulator**

Manage your research lab, chase grants, publish papers, and try not to lose your sanity in the cutthroat world of academia.

## About

Lab Tycoon is a Phaser 3 game that satirizes the modern academic experience. Balance research output, funding, student management, and your own well-being as you navigate the publish-or-perish landscape.

## Tech Stack

- **Phaser 3** - Game framework
- **Vite** - Build tool and dev server
- **ES Modules** - Modern JavaScript

## Game Structure

```
src/
├── main.js           # Game configuration and entry point
├── scenes/
│   ├── BootScene.js      # Asset loading
│   ├── MenuScene.js      # Main menu
│   ├── GameScene.js      # Core gameplay
│   ├── LabScene.js       # Laboratory management
│   ├── ResearchScene.js  # Research mechanics
│   ├── HireScene.js      # Staff recruitment
│   └── AcademiaScene.js  # Academic politics
├── objects/          # Game objects and entities
└── systems/          # Game systems and mechanics
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

Built version is deployed to `/Lab-Tycoon/` on the portfolio site via Netlify.

## Version

v0.1 - Initial release
