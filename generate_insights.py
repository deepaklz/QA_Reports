"""
generate_insights.py
────────────────────
Run this locally to generate AI insights from your report data using Gemini.
The output (insights.json) is saved and committed to GitHub — no API key
is ever needed on the website.

Usage:
    python generate_insights.py                   # prompts for key
    python generate_insights.py --key YOUR_KEY    # pass key directly
    set GEMINI_API_KEY=YOUR_KEY && python generate_insights.py  # via env var
"""

import json
import os
import re
import urllib.request
import urllib.error
import getpass
import argparse
from datetime import datetime

DATA_JS  = "data.js"
OUTPUT   = "insights.json"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


# ── Load REPORT_DATA from data.js ───────────────────────────────────────────
def load_data():
    if not os.path.exists(DATA_JS):
        raise FileNotFoundError(f"'{DATA_JS}' not found. Run 'python convert_excel.py' first.")
    with open(DATA_JS, encoding="utf-8") as f:
        content = f.read()
    match = re.search(r"const REPORT_DATA\s*=\s*(\[.*?\]);", content, re.DOTALL)
    if not match:
        raise ValueError("Could not find REPORT_DATA in data.js")
    return json.loads(match.group(1))


# ── Call Gemini REST API ─────────────────────────────────────────────────────
def call_gemini(api_key, prompt):
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}]
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{GEMINI_URL}?key={api_key}",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            return data["candidates"][0]["content"]["parts"][0]["text"]
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Gemini API error {e.code}: {body}")


# ── Build prompt ─────────────────────────────────────────────────────────────
def build_prompt(period, modules):
    prompt = (
        f'You are a senior QA analyst. Below are software testing observations '
        f'grouped by module for the period "{period}". For each module, write:\n'
        f'1. A short summary paragraph of the issues found.\n'
        f'2. Specific, actionable fix suggestions for the development team.\n\n'
        f'Keep the tone professional but concise. '
        f'Format with module names as bold headings (**Module Name**).\n\n'
    )
    for mod, rows in modules.items():
        prompt += f"**Module: {mod}**\n"
        for r in rows:
            sub  = r.get("Sub-Modules", "")
            obs  = r.get("Observations", "")
            stat = r.get("Status", "") or "Open"
            prompt += f"- [{sub}] {obs} (Status: {stat})\n"
        prompt += "\n"
    return prompt


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Generate QA insights using Gemini AI")
    parser.add_argument("--key", help="Gemini API key (or set GEMINI_API_KEY env var)")
    args = parser.parse_args()

    # Resolve API key
    api_key = (
        args.key
        or os.environ.get("GEMINI_API_KEY")
        or getpass.getpass("Enter your Gemini API key (input hidden): ").strip()
    )
    if not api_key:
        print("❌  No API key provided. Exiting.")
        return

    print("📊  Loading report data from data.js…")
    rows = load_data()
    print(f"    {len(rows)} rows loaded.")

    # Group rows by (month, date_range) → module
    periods = {}
    for r in rows:
        key = (r.get("_month", ""), r.get("Date Range", ""))
        mod = r.get("Modules", "Unknown")
        periods.setdefault(key, {}).setdefault(mod, []).append(r)

    insights = {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "periods": {}
    }

    for (month, dr), modules in periods.items():
        period_label = dr or month
        print(f"\n🤖  Generating insights for: {period_label} …")
        try:
            prompt = build_prompt(period_label, modules)
            text   = call_gemini(api_key, prompt)
            insights["periods"][period_label] = {
                "month":      month,
                "date_range": dr,
                "text":       text
            }
            preview = text[:120].replace("\n", " ")
            print(f"    ✅  Done   →  {preview}…")
        except Exception as exc:
            print(f"    ❌  Error: {exc}")
            insights["periods"][period_label] = {
                "month":      month,
                "date_range": dr,
                "error":      str(exc)
            }

    # Save
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(insights, f, ensure_ascii=False, indent=2)

    print(f"\n✅  Saved to {OUTPUT}")
    print(f"    Periods covered: {', '.join(insights['periods'].keys())}")
    print()
    print("   Next step → push to GitHub:")
    print(f"     git add {OUTPUT} && git commit -m \"Update insights\" && git push")
    print("     npx vercel --prod --yes")
    print()


if __name__ == "__main__":
    main()
