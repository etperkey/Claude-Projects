#!/usr/bin/env python3
"""
Submit data to the LymphGen v2.0 web tool and download results.
v2: Includes checkUdata.php pre-validation and missing hidden fields.
"""
import re
import time
import zipfile
import io
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
INPUT_DIR = SCRIPT_DIR / "lymphgen_input"
RESULT_DIR = INPUT_DIR / "results"

BASE_URL = "https://llmpp.ccr.cancer.gov/lymphgen"
STUDY_NAME = "BCL_Oncoprint"


def main():
    session = requests.Session()
    retries = Retry(total=5, backoff_factor=2, status_forcelist=[500, 502, 503, 504])
    session.mount("https://", HTTPAdapter(max_retries=retries))
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    })

    # Step 1: GET form page to extract jobid and session cookie
    print("Step 1: Getting form page...")
    resp = session.get(f"{BASE_URL}/lymphgendataportal.php", params={"version": "2.0"})
    resp.raise_for_status()
    print(f"  PHPSESSID: {session.cookies.get('PHPSESSID', 'none')}")

    match = re.search(r"name='jobid'\s+id='jobid'\s+value='([^']+)'", resp.text)
    if not match:
        match = re.search(r'name="jobid"[^>]*value="([^"]+)"', resp.text)
    if not match:
        print("ERROR: Could not find jobid in form page")
        return
    jobid = match.group(1)
    print(f"  jobid: {jobid}")

    # Prepare file handles and form data (reusable)
    def open_files():
        return {
            "sampleAnnotationFileToUpload": (
                "sample_annotation.txt",
                open(INPUT_DIR / "sample_annotation.txt", "rb"),
                "text/plain",
            ),
            "mutGeneListFileToUpload": (
                "mutation_genelist.txt",
                open(INPUT_DIR / "mutation_genelist.txt", "rb"),
                "text/plain",
            ),
            "mutflatFileToUpload": (
                "mutation_flat.txt",
                open(INPUT_DIR / "mutation_flat.txt", "rb"),
                "text/plain",
            ),
            "cghGeneListToUpload": (
                "cnv_genelist.txt",
                open(INPUT_DIR / "cnv_genelist.txt", "rb"),
                "text/plain",
            ),
            "flatFileToUpload": (
                "cnv_flat.txt",
                open(INPUT_DIR / "cnv_flat.txt", "rb"),
                "text/plain",
            ),
        }

    form_data = {
        "jobid": jobid,
        "studyname": STUDY_NAME,
        "CGHTYPE": "FULLCGH",
        "BN2": "2",
        "EZB": "3",
        "MCD": "5",
        "N1": "7",
        "ST2": "11",
        "A53": "13",
        "indicator": "30030",
        "version": "2.0",
        "HasL265P": "1",
        # Missing hidden fields from before:
        "post-type": "step2",
        "op-mode": "supply",
        "example": "0",
        "CheckBox": "received",
    }

    # Step 2: Pre-validate via checkUdata.php (the JS does this before form submit)
    print("Step 2: Pre-validating via checkUdata.php...")
    files = open_files()
    resp = session.post(f"{BASE_URL}/checkUdata.php", files=files, data=form_data, timeout=120)
    resp.raise_for_status()
    # Close file handles
    for f in files.values():
        f[1].close()

    print(f"  Response ({len(resp.text)} chars)")
    # Check for REPLY pattern
    reply_match = re.search(r"REPLY([\s\S]*)REPLY", resp.text)
    if reply_match:
        reply_content = reply_match.group(1).strip()
        print(f"  REPLY content: {reply_content[:300]}")
    valid_match = re.search(r"inputisvalid", resp.text)
    if valid_match:
        print("  Validation: PASSED (inputisvalid)")
    else:
        print("  Validation: FAILED or unknown")
        print(f"  Full response: {resp.text[:1000]}")
        # Continue anyway to see what happens

    # Step 3: Submit form to initStudy.php (standard form POST)
    print("Step 3: Submitting to initStudy.php...")
    files = open_files()
    resp = session.post(f"{BASE_URL}/initStudy.php", files=files, data=form_data, timeout=120)
    resp.raise_for_status()
    for f in files.values():
        f[1].close()

    print(f"  Response ({len(resp.text)} chars)")

    # Look for JavaScript in the response that handles job execution
    for m in re.finditer(r"(runStudy|startStudy|JOBSTART|JOBDONE|option=)[^\n]{0,200}", resp.text):
        print(f"  JS ref: {m.group(0)[:200]}")

    # Check if response redirects or contains a different URL
    if "runStudy.php" in resp.text:
        print("  Found runStudy.php reference in response")
    if "processStudy" in resp.text:
        print("  Found processStudy reference in response")

    # Save the initStudy response for debugging
    with open(INPUT_DIR / "initStudy_response.html", "w", encoding="utf-8") as f:
        f.write(resp.text)
    print(f"  Saved response to initStudy_response.html")

    # Step 4: START the job (must include jobID!)
    print("Step 4: Starting job...")
    resp = session.get(f"{BASE_URL}/runStudy.php",
                       params={"option": "START", "jobID": jobid}, timeout=30)
    resp.raise_for_status()
    print(f"  Response: {resp.text[:300]}")

    # Step 5: Poll until JOBDONE (matching the JS: 3s intervals, jobID required)
    print("Step 5: Polling for completion...")
    time.sleep(2)  # Initial delay matching JS: setTimeout(checkStud, 2000)
    for attempt in range(200):
        try:
            # The JS calls START again inside checkStud(), then VIEW
            session.get(f"{BASE_URL}/runStudy.php",
                        params={"option": "START", "jobID": jobid}, timeout=30)
            resp = session.get(f"{BASE_URL}/runStudy.php",
                               params={"option": "VIEW", "jobID": jobid}, timeout=30)
            resp.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"  Attempt {attempt + 1}: Connection error ({e}), retrying...")
            time.sleep(3)
            continue
        text = resp.text.strip()
        if text == "JOBDONE":
            print(f"  Job completed after ~{(attempt + 1) * 3}s")
            break
        if "JOBRUNNING" in text:
            if attempt < 5 or attempt % 10 == 0:
                print(f"  Attempt {attempt + 1}: JOBRUNNING...")
        elif "JOBSTARTING" in text:
            if attempt < 5 or attempt % 10 == 0:
                print(f"  Attempt {attempt + 1}: JOBSTARTING...")
        elif "Job on Queue" in text:
            if attempt < 5 or attempt % 10 == 0:
                print(f"  Attempt {attempt + 1}: {text[:100]}")
        elif "ERROR" in text.upper():
            print(f"  ERROR: {text[:500]}")
            return
        else:
            print(f"  Attempt {attempt + 1}: {text[:200]}")
        time.sleep(3)
    else:
        print("  TIMEOUT after 600s")
        return

    # Step 6: Get result download link (jobID required)
    print("Step 6: Getting results...")
    resp = session.get(f"{BASE_URL}/runStudy.php",
                       params={"option": "GETRESULT", "jobID": jobid}, timeout=30)
    resp.raise_for_status()
    print(f"  GETRESULT response: {resp.text[:500]}")

    # Extract download link
    match = re.search(r"href=['\"]([^'\"]*\.zip[^'\"]*)['\"]", resp.text)
    if match:
        link = match.group(1)
        download_url = link if link.startswith("http") else f"{BASE_URL}/{link}"
    else:
        download_url = f"{BASE_URL}/tmp/{jobid}/{STUDY_NAME}.zip"

    print(f"  Download URL: {download_url}")

    # Step 7: Download and extract
    print("Step 7: Downloading results...")
    resp = session.get(download_url, timeout=60)

    if resp.status_code != 200 or len(resp.content) < 100:
        alternates = [
            f"{BASE_URL}/download/{STUDY_NAME}.zip",
            f"{BASE_URL}/results/{jobid}.zip",
            f"{BASE_URL}/tmp/{jobid}/results.zip",
        ]
        for alt in alternates:
            resp = session.get(alt, timeout=30)
            if resp.status_code == 200 and len(resp.content) > 100:
                print(f"  Found at: {alt}")
                break

    if resp.status_code != 200 or len(resp.content) < 100:
        print(f"  Failed to download: HTTP {resp.status_code}, {len(resp.content)} bytes")
        return

    RESULT_DIR.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
        zf.extractall(RESULT_DIR)
        print(f"  Extracted {len(zf.namelist())} files to {RESULT_DIR}/")
        for name in zf.namelist():
            print(f"    {name}")

    # Show results
    result_file = RESULT_DIR / STUDY_NAME / f"{STUDY_NAME}_Result.txt"
    if result_file.exists():
        print()
        print("=== Results ===")
        with open(result_file, encoding="utf-8") as f:
            lines = f.readlines()
        print(lines[0].strip())
        classified = []
        for line in lines[1:]:
            if not line.strip():
                continue
            fields = line.strip().split("\t")
            prediction = fields[-1] if fields else ""
            if prediction != "Other":
                classified.append(line.strip())
                print(f"  * {line.strip()}")
        print(f"\n  {len(classified)} classified, {len(lines) - 1 - len(classified)} Other")

    print("\nDone.")


if __name__ == "__main__":
    main()
