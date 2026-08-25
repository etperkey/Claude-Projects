# Udio Generation Guide — Dark Zone Blues

## Udio Interface Overview

Udio has two modes: **Basic** and **Custom**. We want **Custom** mode:
- **Style prompt** — goes in the main prompt box (describes genre, mood, instruments)
- **Lyrics** — paste into the **Lyrics Editor** (switch to "Write Your Own")
- **Style Reduction** — Udio's negative prompt feature (in Advanced Controls)
- **Manual Mode** — uses only your exact tags, no AI refinement (recommended for control)

Section tags like `[Verse]`, `[Chorus]`, `[Harmonica]` are recognized.
Use `(parentheses)` for backing vocals if needed.

---

## Step-by-Step

### 1. Go to udio.com → Create → Switch to Custom mode

### 2. Paste this into the STYLE PROMPT box:

```
1960s acoustic folk, protest song, singer-songwriter, male vocal, nasal singing voice, talk-singing, acoustic fingerpicking guitar, harmonica, upright bass, narrative ballad, lo-fi warmth, analog recording, slight room reverb, medium tempo
```

> **Tip:** Udio offers autocomplete tag suggestions below the prompt box — use them to refine.
> **Tip:** Repeat key words to emphasize them. If the voice isn't nasal enough, try doubling: "nasal vocal, nasal singing voice"

### 3. Open Advanced Controls → Style Reduction, paste:

```
electric guitar, drums, synthesizer, auto-tune, pop, rock, modern production, female vocal, choir, orchestra
```

### 4. Click "Write Your Own" in lyrics → Paste the lyrics below

### 5. Consider enabling Manual Mode for tighter control over tags

### 6. Generate 4+ variations → pick the best take

---

## Alternative Style Prompts (if first attempt misses)

**If too polished/modern:**
```
early 1960s folk revival, acoustic singer-songwriter, talk-singing male vocal, raspy voice, harmonica and acoustic guitar, simple folk arrangement, narrative protest song, Greenwich Village folk, lo-fi, lo-fi
```

**If too slow/mellow:**
```
folk ballad, acoustic guitar strumming, blues harmonica, gravelly male voice, 1960s recording quality, mono mix, warm analog tape, storytelling folk song, 100 BPM, driving rhythm
```

**If voice is wrong:**
```
1960s folk, acoustic guitar, harmonica, weathered male voice, gravelly, nasal vocal, nasal vocal, storytelling ballad, protest song, fingerpicking, medium tempo, analog warmth
```

---

## Lyrics — Ready to Paste

Copy everything between the lines below into Udio's Lyrics Editor:

---

[Intro]

[Verse 1]
Well I was just a naive cell, driftin' through the blood
When an antigen came callin' like a Mississippi flood
It grabbed my BCR and it whispered, "Follow me,
Past the T cell border, to where the follicles run free"

I crossed into the dark zone where the lights don't ever shine
Where a billion cells are dividin' on the double-helix line
AID was rewritin' every letter that I knew
Somatic hypermutation — Lord, I'm somebody new

[Chorus]
Blowin' through the germinal center
Where the strong survive and the weak ones fade
Blowin' through the germinal center
Every antibody gets remade

[Harmonica]

[Verse 2]
Then they pushed me to the light zone, put me on display
The FDCs were holdin' antigen like a poker hand to play
"Show us what you got now, let's see how tight you bind"
If your affinity ain't high enough, you get left behind

The T-follicular helpers watched from the corner of the room
With their ICOS and their CD40L, decidin' on my doom
"We'll give you one more chance, boy — go cycle through again"
Back to the dark zone, back to where it all began

[Chorus]
Blowin' through the germinal center
Where the strong survive and the weak ones fade
Blowin' through the germinal center
Every antibody gets remade

[Verse 3]
Some cells class-switched to IgG, threw their IgM away
Some went off to IgA for the mucosal highway
The plasma cells shipped out along the bone marrow line
Pumpin' out their antibodies like a California wine

The memory cells, they settled down in quiet neighborhoods
Ready to respond again, the way a good cell should
If the antigen comes back around like an old unwanted friend
The germinal center knows it never really ends

[Chorus]
Blowin' through the germinal center
Where the strong survive and the weak ones fade
Blowin' through the germinal center
Every antibody gets remade

[Harmonica]

[Verse 4]
But sometimes in the dark zone, when the mutations roll
A B cell loses its direction and the cancer takes its toll
BCL2 won't let you die and MYC won't let you rest
EZH2 rewrites the rules and puts 'em to the test

They call it lymphoma now, a germinal center crime
When the cells that should have died kept dividin' overtime
From follicular to diffuse, the names all change, but the song
Remains the same old ballad of a cell that went wrong

[Chorus]
Blowin' through the germinal center
Where the strong survive and the weak ones fade
Blowin' through the germinal center
Some get saved, and some get betrayed

[Outro]

---

## Generation Strategy

1. **Start with the chorus** — Generate just the chorus first to lock in the vocal tone and melody you like, then build outward
2. **Multiple takes** — Generate 4+ variations per section, pick the best
3. **Extend** — Once you have a good opening, use Udio's extend feature to continue the song forward
4. **Inpainting** — Fix rough transitions between sections after the full song is assembled

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Voice too clean/pop | Add "raspy," "gravelly," "weathered voice" — repeat for emphasis |
| Too fast or slow | Specify "100 BPM" or "slow medium tempo" |
| Harmonica sounds weird | Try "blues harmonica solo" as a specific tag for those sections |
| Scientific terms garbled | Re-generate that section; Udio may mangle "hypermutation" or "T-follicular" |
| Too much production | Add "sparse," "minimal arrangement," "solo acoustic" |
| Wrong era feel | Lean into "Greenwich Village folk," "1963," "mono recording" |

## Pronunciation Guide (for QC'ing output)

| Term | Should sound like |
|------|-------------------|
| BCR | "bee-see-arr" |
| AID | "aid" (one syllable) |
| FDCs | "eff-dee-sees" |
| ICOS | "eye-koss" |
| CD40L | "see-dee-forty-ell" |
| IgG | "eye-gee-gee" |
| IgM | "eye-gee-em" |
| IgA | "eye-gee-ay" |
| BCL2 | "bee-see-ell-two" |
| MYC | "mick" |
| EZH2 | "ee-zee-aitch-two" |
