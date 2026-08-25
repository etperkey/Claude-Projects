"""
Dark Zone Blues — Udio generation script
Generates the GC folk song via direct Udio API calls
"""
import os
import sys
import json
import time
import base64
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load auth token from .env
load_dotenv(Path(__file__).parent / ".env")
FULL_TOKEN = os.getenv("UDIO_AUTH_TOKEN")

if not FULL_TOKEN:
    raise ValueError("UDIO_AUTH_TOKEN not found in .env")

# Output directory
OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

API_BASE = "https://www.udio.com/api"

# --- Extract access_token JWT from the Supabase session cookie ---
def get_access_token():
    """Extract the JWT access_token from the base64-encoded Supabase session."""
    payload = FULL_TOKEN.replace("base64-", "")
    # Add padding
    payload += "=" * (4 - len(payload) % 4) if len(payload) % 4 else ""
    decoded = json.loads(base64.b64decode(payload))
    return decoded["access_token"]


def get_headers_cookie():
    """Headers using cookie auth (what the browser sends)."""
    # Split token into chunks like Supabase does
    chunk_size = 3180  # Supabase default chunk size
    chunks = []
    token = FULL_TOKEN
    while token:
        chunks.append(token[:chunk_size])
        token = token[chunk_size:]

    if len(chunks) == 1:
        cookie = f"sb-api-auth-token={chunks[0]}"
    else:
        cookie = "; ".join(f"sb-api-auth-token.{i}={c}" for i, c in enumerate(chunks))

    return {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Cookie": cookie,
        "Origin": "https://www.udio.com",
        "Referer": "https://www.udio.com/my-creations",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
    }


def get_headers_bearer():
    """Headers using Bearer token auth."""
    jwt = get_access_token()
    return {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {jwt}",
        "Origin": "https://www.udio.com",
        "Referer": "https://www.udio.com/my-creations",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
    }


# --- Style prompts ---
STYLE_PROMPT = (
    "1960s acoustic folk, protest song, singer-songwriter, male vocal, "
    "nasal singing voice, talk-singing, acoustic fingerpicking guitar, "
    "harmonica, upright bass, narrative ballad, lo-fi warmth, "
    "analog recording, slight room reverb, medium tempo"
)

CHORUS_LYRICS = """[Chorus]
Blowin' through the germinal center
Where the strong survive and the weak ones fade
Blowin' through the germinal center
Every antibody gets remade"""

FULL_LYRICS = """[Intro]

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

[Outro]"""


def generate(lyrics, headers_fn):
    """Submit a generation request to Udio."""
    url = f"{API_BASE}/generate-proxy"
    headers = headers_fn()
    data = {
        "prompt": STYLE_PROMPT,
        "samplerOptions": {"seed": -1},
        "lyricInput": lyrics,
    }

    print(f"POST {url}")
    resp = requests.post(url, headers=headers, json=data)
    print(f"Status: {resp.status_code}")

    if resp.status_code != 200:
        print(f"Response: {resp.text[:500]}")
        return None

    result = resp.json()
    print(f"Track IDs: {result.get('track_ids', [])}")
    return result


def check_status(track_ids, headers_fn):
    """Check if songs are finished generating."""
    url = f"{API_BASE}/songs?songIds={','.join(track_ids)}"
    resp = requests.get(url, headers=headers_fn())
    if resp.status_code != 200:
        print(f"Status check failed: {resp.status_code}")
        return None
    data = resp.json()
    songs = data.get("songs", [])
    finished = all(s.get("finished") for s in songs)
    return {"finished": finished, "songs": songs}


def download(song_url, title):
    """Download a generated song."""
    safe_title = "".join(c if c.isalnum() or c in " -_" else "_" for c in title)
    path = OUTPUT_DIR / f"{safe_title}.mp3"
    print(f"Downloading: {title} -> {path}")
    resp = requests.get(song_url)
    resp.raise_for_status()
    path.write_bytes(resp.content)
    print(f"Saved: {path} ({len(resp.content) / 1024:.1f} KB)")
    return path


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Generate Dark Zone Blues on Udio")
    parser.add_argument("--full", action="store_true", help="Use full lyrics (default: chorus only)")
    parser.add_argument("--auth", choices=["cookie", "bearer"], default="cookie",
                        help="Auth method (default: cookie)")
    args = parser.parse_args()

    lyrics = FULL_LYRICS if args.full else CHORUS_LYRICS
    headers_fn = get_headers_bearer if args.auth == "bearer" else get_headers_cookie
    mode = "full" if args.full else "chorus-only"

    print(f"=== Dark Zone Blues — Udio Generation ===")
    print(f"Mode: {mode} | Auth: {args.auth}")
    print(f"Style: {STYLE_PROMPT[:60]}...")
    print()

    # Submit generation
    result = generate(lyrics, headers_fn)
    if not result:
        print("\nTrying bearer auth instead...")
        headers_fn = get_headers_bearer
        result = generate(lyrics, headers_fn)
    if not result:
        print("Generation failed with both auth methods.")
        sys.exit(1)

    track_ids = result.get("track_ids", [])
    if not track_ids:
        print("No track IDs returned.")
        sys.exit(1)

    # Poll for completion
    print(f"\nWaiting for {len(track_ids)} tracks to generate...")
    for attempt in range(60):  # Max 5 minutes
        time.sleep(5)
        status = check_status(track_ids, headers_fn)
        if status is None:
            continue
        if status["finished"]:
            print("\nAll tracks ready!")
            for song in status["songs"]:
                download(song["song_path"], song.get("title", "dark_zone_blues"))
            print("\nDone!")
            return
        else:
            pending = sum(1 for s in status["songs"] if not s.get("finished"))
            print(f"  [{attempt*5}s] {pending} track(s) still generating...")

    print("Timed out waiting for generation.")


if __name__ == "__main__":
    main()
