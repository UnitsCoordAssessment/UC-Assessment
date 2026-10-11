"""
export_data.py — downloads all assessment data from Supabase for analysis.

Run on a research-team computer, never on the public website:

    export SUPABASE_URL="https://abcdefghijklmnop.supabase.co"
    export SUPABASE_SERVICE_KEY="..."   # the "secret" key (older projects: "service_role")
    python3 scripts/export_data.py --out exports/

Creates a dated folder containing:
    trials.csv         one row per problem page: answer, explanation, timing,
                       parsed-answer summary, plus site, course and demographics
    sessions.csv       one row per sitting: site, course, demographics, device
    completions.csv    one row per sitting that reached the last page
    trials_full.jsonl  every page's complete record, including cursor samples
    identifying/participants.csv
                       names and email addresses, keyed by session_id

Only identifying/ contains names or email addresses. Everything else is keyed
by a random session_id and can be shared with the analysis team as is.

Uses only the Python standard library (no installs needed).
The secret key bypasses all access rules: store it in a password manager or
an environment variable, never in a file that gets shared or committed.
"""
import argparse
import csv
import datetime as dt
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

PAGE_SIZE = 1000  # Supabase's default maximum rows per request


def fetch_all(base_url, key, table, order):
    rows, offset = [], 0
    while True:
        url = f"{base_url}/rest/v1/{table}?select=*&order={order}&limit={PAGE_SIZE}&offset={offset}"
        headers = {"apikey": key}
        if key.startswith("eyJ"):  # older JWT-style keys also go in the Authorization header
            headers["Authorization"] = f"Bearer {key}"
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                batch = json.load(resp)
        except urllib.error.HTTPError as e:
            sys.exit(f"Could not read {table}: HTTP {e.code} {e.read().decode(errors='replace')}")
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            return rows
        offset += PAGE_SIZE


def write_csv(path, rows, columns):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=columns, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({c: (json.dumps(v) if isinstance(v, (dict, list)) else v) for c, v in r.items()})


SESSION_FIELDS = ["site", "course", "age_range", "academic_program", "program_of_study"]


def flatten_trial(t, session):
    d = t.get("data") or {}
    parsed = d.get("parsed") or {}
    structure = parsed.get("structure") or {}
    pointer = d.get("pointer_events") or []
    code = d.get("code") or {}
    timing = d.get("timing") or {}
    fields = timing.get("fields") or {}
    return {
        **{k: v for k, v in t.items() if k != "data"},
        **{f: session.get(f) for f in SESSION_FIELDS},
        "title": d.get("title"),
        "first_input_ms": timing.get("first_input_ms"),
        "answer_first_ms": (fields.get("answer") or {}).get("first_ms"),
        "answer_last_ms": (fields.get("answer") or {}).get("last_ms"),
        "explanation_first_ms": (fields.get("explanation") or {}).get("first_ms"),
        "explanation_last_ms": (fields.get("explanation") or {}).get("last_ms"),
        "answer_versions": len(d.get("answer_history") or []) or None,
        "parsed_ok": parsed.get("ok"),
        "parsed_normalized": parsed.get("normalized"),
        "parsed_value": parsed.get("value_text"),
        "parsed_structure": structure.get("kind"),
        "parsed_factors": " ".join(structure.get("factors") or []) or None,
        "parsed_terms": " ".join(structure.get("terms") or []) or None,
        "parsed_error": parsed.get("error"),
        "parsed_stripped_words": parsed.get("stripped_words") or None,
        "refused_characters": "".join(r.get("c", "") for r in d.get("refused_input") or []) or None,
        "code_stage": code.get("stage"),
        "code_note": code.get("note"),
        "code_rule": code.get("rule"),
        "codes_version": code.get("codes_version"),
        "pointer_samples": len(pointer),
        "pointer_types": " ".join(sorted({e.get("pt") for e in pointer if e.get("pt")})) or None,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="exports", help="folder to write into (default: exports/)")
    args = ap.parse_args()

    base = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not base or not key:
        sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_KEY first (see the top of this file).")

    sessions = fetch_all(base, key, "sessions", "started_at")
    participants = fetch_all(base, key, "participants", "received_at")
    trials = fetch_all(base, key, "trials", "id")
    completions = fetch_all(base, key, "completions", "finished_at")
    by_session = {s["id"]: s for s in sessions}

    # Create the folder only once the data has arrived, so failed runs leave nothing behind.
    stamp = dt.datetime.now().strftime("export-%Y%m%d-%H%M%S")
    out = pathlib.Path(args.out) / stamp
    n = 1
    while out.exists():
        n += 1
        out = pathlib.Path(args.out) / f"{stamp}-{n}"
    out.mkdir(parents=True)

    write_csv(out / "sessions.csv", sessions,
              ["id", "site", "course", "instrument_version", "started_at", "consented_at",
               "age_range", "academic_program", "program_of_study", "received_at", "client"])

    flat = [flatten_trial(t, by_session.get(t["session_id"], {})) for t in trials]
    first = ["session_id", "trial_index", "kind", "item_id", "title", "item_type",
             "raw_answer", "explanation", "is_correct", "code_stage", "code_note", "rt_ms"]
    rest = [c for c in (flat[0].keys() if flat else []) if c not in first]
    write_csv(out / "trials.csv", flat, first + rest)

    (out / "identifying").mkdir()
    write_csv(out / "identifying" / "participants.csv", participants,
              ["session_id", "first_name", "last_name", "email", "received_at"])

    write_csv(out / "completions.csv", completions,
              ["session_id", "finished_at", "n_trials", "received_at", "summary"])

    with open(out / "trials_full.jsonl", "w", encoding="utf-8") as f:
        for t in trials:
            f.write(json.dumps(t) + "\n")

    print(f"Wrote {len(sessions)} sessions, {len(participants)} participants, {len(trials)} trials, "
          f"{len(completions)} completions to {out}")


if __name__ == "__main__":
    main()
