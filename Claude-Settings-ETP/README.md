# Claude-Settings-ETP

Eric Perkey's personalized Claude Code settings, personas, and configurations.

## Contents

```
Claude-Settings-ETP/
├── CLAUDE.md                    # Global instructions & personas (deployed to ~/.claude/)
├── global-settings.json         # Hooks configuration (meditation bells, tab emojis)
├── global-settings.local.json   # Global permissions
├── project-settings.local.json  # Claude-Projects specific permissions
├── install.ps1                  # Install script to deploy settings
└── README.md                    # This file
```

## Personas

### Samur-AI Claude
*The way of the code warrior*

A disciplined, zen-like persona that pairs with the meditation bell sounds. Used for:
- Calm, focused work sessions
- Elegant refactoring
- Patient debugging

### Claude Noir
*Hard-boiled code detective*

A 1940s detective narrating code mysteries. Used for:
- Complex debugging
- Legacy code archaeology
- Comic relief

## Integration with Meditation-Hooks

The sound effects that play on task completion are thematically linked to the personas:

### Sound Modes

Set the `CLAUDE_SOUND_MODE` environment variable to choose your soundscape:

| Mode | Sounds | Persona |
|------|--------|---------|
| `zen` | Temple bells, duduk, bansuri, rain stick | Samur-AI Claude |
| `noir` | Typewriter, footsteps, rain, door close | Claude Noir |
| `mixed` | Both (default) | Random persona vibes |

```powershell
# Set in your PowerShell profile or environment
$env:CLAUDE_SOUND_MODE = "noir"   # Detective mode
$env:CLAUDE_SOUND_MODE = "zen"    # Meditation mode
$env:CLAUDE_SOUND_MODE = "mixed"  # Both (default)
```

### Noir Sounds (Claude Noir)

| Sound | Duration | Noir Vibe |
|-------|----------|-----------|
| typewriter-keys.mp3 | 10s | Typing up the case report |
| footsteps-concrete.mp3 | 10s | Walking down a dark alley |
| fast-footsteps.mp3 | 10s | Chasing a lead |
| steps-mud-wet.mp3 | 10s | Wet streets at night |
| rain-thunder.mp3 | 9s | Storm rolling in |
| door-close.mp3 | 2s | Closing the case |
| car-engine-start.mp3 | 3s | Hitting the road |
| match-light.mp3 | 8s | Lighting a cigarette |

### Zen Sounds (Samur-AI Claude)

| Sound | Vibe |
|-------|------|
| Temple bells (5) | Focus restored |
| Duduk | Armenian meditation |
| Bansuri | Indian contemplation |
| Kanun/Nai | Middle Eastern serenity |
| Rain stick | Natural calm |

## Installation

### Quick Install
```powershell
.\install.ps1
```

### Manual Install
Copy files to your Claude config:
```powershell
Copy-Item "CLAUDE.md" "$env:USERPROFILE\.claude\CLAUDE.md"
Copy-Item "global-settings.json" "$env:USERPROFILE\.claude\settings.json"
```

## Files Location

| File | Deployed To | Purpose |
|------|-------------|---------|
| CLAUDE.md | ~/.claude/CLAUDE.md | Global instructions for all sessions |
| global-settings.json | ~/.claude/settings.json | Hooks (sounds, emojis) |
| global-settings.local.json | ~/.claude/settings.local.json | Global permissions |

## Dependencies

- [Meditation-Hooks](../Meditation-Hooks/) - Sound files and VBS scripts
- Sounds symlinked at: `~/.claude/sounds -> Claude-Projects/Meditation-Hooks/sounds`
