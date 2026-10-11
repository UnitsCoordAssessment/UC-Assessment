"""
End-to-end test: real browser (Playwright/Chromium) + real supabase-js +
PostgREST + PostgreSQL with supabase/schema.sql applied.

Usage (see tests/local-backend/README.md for starting the services):
    python3 e2e_test.py <page_url> <api_url> <anon_key> <psql_connection_string>
"""
import json
import pathlib
import subprocess
import sys

from playwright.sync_api import sync_playwright

PAGE_URL, API_URL, ANON_KEY, PG = sys.argv[1:5]
ROOT = pathlib.Path(__file__).resolve().parents[2]
CONFIG_JS = (ROOT / "js" / "config.js").read_text()
results = []

# Item ids in the order content.js lists them; "Problem N" is the Nth problem.
CONTENT = json.loads(subprocess.run(
    ["node", "-e", "global.window={}; require(process.argv[1]); const c=window.STUDY_CONTENT;"
     "console.log(JSON.stringify({practice: c.practice.map(p => p.id), problems: c.problems.map(p => p.id)}))",
     str(ROOT / "js" / "content.js")], check=True, capture_output=True, text=True).stdout)
P = {n + 1: pid for n, pid in enumerate(CONTENT["problems"])}
N_PROBLEMS = len(P)

def ID(suffix):
    """The item id that ends with this name, so the test survives renumbering."""
    found = [pid for pid in CONTENT["problems"] if pid.endswith("_" + suffix)]
    assert len(found) == 1, f"expected one problem named {suffix}, found {found}"
    return found[0]


# Answers typed on each page in the main scenario, and the is_correct value expected.
BY_NAME = {
    "NortonBars_Mult1": ("12", True), "NortonBars_Mult2": ("8/2", True),
    "NortonBars_DivisionWhole": ("12/3", True), "NortonBars_DivisionImproperFrac": ("2 1/4", True),
    "length_brokenruler1": ("8", True), "length_brokenruler2": ("11 1/4", False),
    "POW_threesevenths": ("3/7", True), "area_patterntiles": ("36 x 4", True),
    "area_garden1": ("6x7", True), "area_garden2": ("8", True),
    "area_yardsfeet1": ("10", False), "area_yardsfeet2": ("9", True),
    "area_tessellation": ("6*7*7*7", True), "GMSF_pie": ("Option A", True), "MSPF_pie": ("Option A", False),
    "IFS_greengraybars1": ("Option D", False), "IFS_greengraybars2": ("Option C", True),
    "area_cardboard": ("21", True), "volume_yellow": ("60 x 8", True),
    "proportion1": ("20", True), "proportion2": ("5/15", True), "volume_colin": ("180/2", True),
    "angle_properfrac": ("1/4", True), "angle_properfrac_followup": ("1/4", True),
    "angle_improperfrac": ("2", False), "angle_improperfrac_followup": ("8/3", True),
}
ANSWERS = {"practice_1": ("4x3", True), "practice_2": ("3 * 2 * 5", True)}
ANSWERS.update({ID(name): BY_NAME[name] for name in sorted(BY_NAME, key=lambda n: CONTENT["problems"].index(ID(n)))})
assert list(ANSWERS) == CONTENT["practice"] + CONTENT["problems"], "ANSWERS must cover every item in content.js"
ITEM_MULT1 = ID("NortonBars_Mult1")
ITEM_IMPROPER = ID("NortonBars_DivisionImproperFrac")
ITEM_TILES = ID("area_patterntiles")
ITEM_GRAYBARS = ID("IFS_greengraybars1")
ITEM_PIE = ID("GMSF_pie")
ITEM_NO_EXPLANATION = None  # no Yes/No problems remain (an explanation is always required)


def sql(query):
    out = subprocess.run(["psql", PG, "-t", "-A", "-F", "|", "-c", query],
                         check=True, capture_output=True, text=True).stdout.strip()
    return [line.split("|") for line in out.splitlines() if line]


def count(query):
    return int(sql(query)[0][0])


def check(cond, label):
    results.append((bool(cond), label))
    print(("ok   " if cond else "FAIL ") + label)


def new_page(context):
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    # Point the page at the local backend without editing config.js.
    page.route("**/js/config.js", lambda route: route.fulfill(
        content_type="application/javascript",
        body=CONFIG_JS.replace("supabaseUrl: ''", f"supabaseUrl: '{API_URL}'")
                      .replace("supabaseAnonKey: ''", f"supabaseAnonKey: '{ANON_KEY}'")))
    return page, errors


def cont(page):
    page.click("#jspsych-survey-html-form-next")


def consent_and_details(page, first, last, email, query="?site=CSU&course=calc1"):
    page.goto(PAGE_URL + query)
    page.check("input[name=consent][value=Yes]")
    cont(page)
    page.fill("input[name=first_name]", first)
    page.fill("input[name=last_name]", last)
    page.select_option("select[name=age_range]", "23-25 years")
    page.fill("input[name=email]", email)
    page.select_option("select[name=academic_program]", index=3)
    page.select_option("select[name=program_of_study]", index=7)
    cont(page)


def current_item(page):
    """Returns the problem id shown, or None on a non-problem page."""
    title = page.locator(".problem-title")
    if not title.count():
        return None
    t = title.inner_text()
    if t.startswith("Practice Problem"):
        return "practice_" + t.split()[-1]
    return P[int(t.split()[-1])]


def answer_page(page, item_id, touch=False):
    answer, _ = ANSWERS[item_id]
    if page.locator("input[name=answer]").count():
        page.fill("input[name=answer]", answer)
    elif page.locator("input[name=choice]").count():
        sel = f"label.choice:has(input[value='{answer}'])"
        page.locator(sel).tap() if touch else page.check(f"input[name=choice][value='{answer}']")
    elif page.locator("input[name=yesno]").count():
        page.check(f"input[name=yesno][value={answer}]")
    if item_id != ITEM_NO_EXPLANATION:  # answers No and leaves the box empty
        page.fill("textarea[name=explanation]", f"My reasoning for {item_id}.")


def run_all_pages(page, touch=False, before_continue=None):
    """Answers every page until the final page; returns the ids seen."""
    seen = []
    while True:
        page.wait_for_selector("#jspsych-survey-html-form-next, .final")
        if page.locator(".final").count():
            return seen
        item = current_item(page)
        if item:
            seen.append(item)
            answer_page(page, item, touch)
        if before_continue:
            before_continue(page, item)
        cont(page)


with sync_playwright() as p:
    browser = p.chromium.launch()

    # ---- A. Full session on a laptop -----------------------------------------
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page, errors = new_page(ctx)
    layout = {"pages": 0, "corner_ok": 0, "single_button": 0}

    def inspect(page, item):
        layout["pages"] += 1
        box = page.locator("#jspsych-survey-html-form-next").bounding_box()
        vw, vh = 1280, 800
        if box and vw - (box["x"] + box["width"]) <= 40 and vh - (box["y"] + box["height"]) <= 40:
            layout["corner_ok"] += 1
        buttons = page.locator("button, input[type=submit], input[type=button]")
        labels = [buttons.nth(i).get_attribute("value") or buttons.nth(i).inner_text() for i in range(buttons.count())]
        if labels == ["Continue"]:
            layout["single_button"] += 1
        if item == ITEM_MULT1:  # change the answer once, to check the answer history
            page.fill("input[name=answer]", "13")
            page.fill("input[name=answer]", "12")
        if item == ITEM_GRAYBARS:  # move the cursor across the figure
            img = page.locator(".problem-figure img").bounding_box()
            for k in range(1, 9):
                page.mouse.move(img["x"] + img["width"] * k / 10, img["y"] + img["height"] * k / 10)
                page.wait_for_timeout(30)

    consent_and_details(page, "Ada", "Lovelace", "Ada.Lovelace@School.edu")
    seen = run_all_pages(page, before_continue=inspect)
    page.wait_for_selector(".final .save-status.saved")
    check(seen == list(ANSWERS), f"A: pages appear in order: 2 practice problems, then Problems 1-{N_PROBLEMS}")
    n_pages = N_PROBLEMS + 4  # practice intro, 2 practice problems, assessment intro, problems
    check(layout["pages"] == n_pages and layout["corner_ok"] == n_pages,
          f"A: Continue is in the lower-right corner on all {layout['pages']} pages after the details page")
    check(layout["single_button"] == n_pages, "A: Continue is the only button on every page (no Back button)")
    final_buttons = page.locator("#jspsych-survey-html-form-next, button").count()
    check(final_buttons == 0, "A: the final page has no Continue button")
    check("Karen.Zwanch@okstate.edu" in page.inner_text(".final"), "A: final page shows the PIs' contact details")

    sid = sql("select session_id from participants where email = 'Ada.Lovelace@School.edu'")
    check(len(sid) == 1, "A: one participant row with name and email")
    sid = sid[0][0]
    srow = sql(f"select site, course, age_range, academic_program is not null, program_of_study is not null "
               f"from sessions where id = '{sid}'")[0]
    check(srow == ["CSU", "calc1", "23-25 years", "t", "t"], "A: session has site, course and demographics")
    check(count(f"select count(*) from trials where session_id = '{sid}' and kind = 'practice'") == 2
          and count(f"select count(*) from trials where session_id = '{sid}' and kind = 'problem'") == N_PROBLEMS,
          f"A: 2 practice rows and {N_PROBLEMS} problem rows saved")
    check(count(f"select count(*) from completions where session_id = '{sid}'") == 1, "A: completion saved")
    got = {r[0]: (r[1], None if r[2] == "" else r[2] == "t") for r in sql(
        f"select item_id, raw_answer, is_correct from trials where session_id = '{sid}'")}
    check(got == ANSWERS, "A: every answer and its automatic score saved as expected")
    if got != ANSWERS:
        print("     mismatches:", {k: (got.get(k), v) for k, v in ANSWERS.items() if got.get(k) != v})
    expl = dict(sql(f"select item_id, coalesce(explanation, '') from trials where session_id = '{sid}'"))
    check(expl[ITEM_TILES] == f"My reasoning for {ITEM_TILES}.", "A: explanations saved")
    structure = sql(f"select data->'parsed'->'structure'->>'kind', data->'parsed'->>'value_text' "
                    f"from trials where session_id = '{sid}' and item_id = '{ITEM_IMPROPER}'")[0]
    check(structure == ["mixed_number", "9/4"], "A: '2 1/4' read as the mixed number 9/4")
    hist = json.loads(sql(f"select data->'answer_history' from trials where session_id = '{sid}' "
                          f"and item_id = '{ITEM_MULT1}'")[0][0])
    check([h["v"] for h in hist] == ["12", "13", "12"], "A: answer history records each version of the answer")
    timing = json.loads(sql(f"select data->'timing' from trials where session_id = '{sid}' "
                            f"and item_id = '{ITEM_TILES}'")[0][0])
    check(timing["first_input_ms"] is not None and timing["fields"]["answer"]["first_ms"] >= 0
          and timing["fields"]["explanation"]["last_ms"] >= timing["fields"]["explanation"]["first_ms"]
          and timing["figure_load_ms"] is not None,
          "A: timing recorded for the page, each field, and the figure")
    fig = sql(f"select count(*), min((e->>'rx')::float), max((e->>'rx')::float) "
              f"from trials, jsonb_array_elements(data->'pointer_events') e "
              f"where session_id = '{sid}' and item_id = '{ITEM_GRAYBARS}' and e->>'target' = 'figure'")[0]
    check(int(fig[0]) >= 6 and 0 <= float(fig[1]) and float(fig[2]) <= 1,
          f"A: cursor samples over the figure include positions within the image ({fig[0]} samples)")
    leaked = count(f"select count(*) from trials where session_id = '{sid}' and "
                   f"(data::text ilike '%lovelace%' or data::text ilike '%school.edu%')")
    leaked += count(f"select count(*) from sessions where id = '{sid}' and "
                    f"(client::text ilike '%lovelace%' or client::text ilike '%school.edu%')")
    check(leaked == 0, "A: name and email appear only in the participants table")
    check(not errors, f"A: no page errors {errors or ''}")
    ctx.close()

    # ---- B. Required fields and the Enter key ---------------------------------
    ctx = browser.new_context()
    page, errors = new_page(ctx)
    page.goto(PAGE_URL + "?site=OSU&course=nonstem")
    cont(page)
    check(page.locator("input[name=consent]").count() == 2, "B: Continue without choosing Yes/No stays on consent")
    page.check("input[name=consent][value=Yes]")
    cont(page)
    page.fill("input[name=first_name]", "Grace")
    page.fill("input[name=last_name]", "Hopper")
    page.select_option("select[name=age_range]", index=2)
    page.fill("input[name=email]", "grace@school")  # no dot in the domain
    page.select_option("select[name=academic_program]", index=1)
    page.select_option("select[name=program_of_study]", index=1)
    cont(page)
    check(page.locator("input[name=email]").count() == 1, "B: an email without a domain ending is refused")
    page.fill("input[name=email]", "grace@school.edu")
    cont(page)
    cont(page)  # practice introduction
    cont(page)  # Practice Problem 1 with nothing entered
    check(current_item(page) == "practice_1", "B: Continue with an empty answer stays on the page")
    page.fill("input[name=answer]", "12")
    page.press("input[name=answer]", "Enter")
    focused = page.evaluate("document.activeElement.name")
    check(current_item(page) == "practice_1" and focused == "explanation",
          "B: Enter in the answer box moves to the explanation instead of submitting")
    cont(page)
    check(current_item(page) == "practice_1", "B: Continue without an explanation stays on the page")
    ctx.close()

    # ---- C. Wi-Fi drops after the first problem, then comes back ---------------
    ctx = browser.new_context()
    page, errors = new_page(ctx)
    consent_and_details(page, "Katherine", "Johnson", "kj@school.edu")
    went_offline = {"done": False}

    def drop(page, item):
        if item == "practice_2" and not went_offline["done"]:
            ctx.set_offline(True)
            went_offline["done"] = True

    run_all_pages(page, before_continue=drop)
    page.wait_for_selector(".final .save-status.warning")
    check("not been saved" in page.inner_text(".final"), "C: final page warns that answers are unsaved")
    stored = int(page.evaluate(
        "Object.keys(localStorage).filter(k => k.startsWith('uca-unsaved-'))"
        ".map(k => JSON.parse(localStorage.getItem(k)).length).reduce((a,b)=>a+b,0)"))
    check(stored >= 19, f"C: unsaved rows kept in browser storage ({stored} rows)")
    ctx.set_offline(False)
    page.click("#retry-save")
    page.wait_for_selector(".final .save-status.saved")
    sid = sql("select session_id from participants where email = 'kj@school.edu'")[0][0]
    check(count(f"select count(*) from trials where session_id = '{sid}'") == len(ANSWERS), f"C: all {len(ANSWERS)} pages saved after retry")
    check(count(f"select count(*) from completions where session_id = '{sid}'") == 1, "C: completion saved after retry")
    left = page.evaluate("Object.keys(localStorage).filter(k => k.startsWith('uca-unsaved-')).length")
    check(left == 0, "C: browser storage cleared once everything was saved")
    ctx.close()

    # ---- D. Tab closed while offline; data recovered on the next visit ---------
    ctx = browser.new_context()
    page, errors = new_page(ctx)
    consent_and_details(page, "Dorothy", "Vaughan", "dv@school.edu")
    sid = sql("select session_id from participants where email = 'dv@school.edu'")[0][0]
    ctx.set_offline(True)
    cont(page)  # practice introduction
    for item in ("practice_1", "practice_2"):
        answer_page(page, item)
        cont(page)
    page.close()
    check(count(f"select count(*) from trials where session_id = '{sid}'") == 0, "D: nothing saved while offline")
    ctx.set_offline(False)
    page2, _ = new_page(ctx)
    page2.goto(PAGE_URL)
    page2.wait_for_timeout(2500)
    check(count(f"select count(*) from trials where session_id = '{sid}'") == 2,
          "D: the next visit on that device sent the 2 unsaved pages")
    ctx.close()

    # ---- E. iPad-style touch session ------------------------------------------
    ctx = browser.new_context(viewport={"width": 820, "height": 1180}, has_touch=True, is_mobile=True,
                              device_scale_factor=2)
    page, errors = new_page(ctx)
    corner = {"ok": 0, "n": 0}

    def tap_figure(page, item):
        corner["n"] += 1
        box = page.locator("#jspsych-survey-html-form-next").bounding_box()
        if 820 - (box["x"] + box["width"]) <= 40 and 1180 - (box["y"] + box["height"]) <= 40:
            corner["ok"] += 1
        if item == ITEM_PIE:
            img = page.locator(".problem-figure img").bounding_box()
            page.touchscreen.tap(img["x"] + img["width"] * 0.3, img["y"] + img["height"] * 0.8)

    consent_and_details(page, "Mary", "Jackson", "mj@school.edu")
    run_all_pages(page, touch=True, before_continue=tap_figure)
    page.wait_for_selector(".final .save-status.saved")
    check(corner["ok"] == corner["n"], "E: Continue is in the lower-right corner on the iPad screen")
    sid = sql("select session_id from participants where email = 'mj@school.edu'")[0][0]
    check(count(f"select count(*) from trials where session_id = '{sid}'") == len(ANSWERS), f"E: all {len(ANSWERS)} pages saved")
    tap = sql(f"select e->>'pt', e->>'rx', e->>'ry' from trials, jsonb_array_elements(data->'pointer_events') e "
              f"where session_id = '{sid}' and item_id = '{ITEM_PIE}' and e->>'target' = 'figure' limit 1")
    check(tap and tap[0][0] == "touch" and abs(float(tap[0][1]) - 0.3) < 0.02 and abs(float(tap[0][2]) - 0.8) < 0.02,
          f"E: a tap on the figure is recorded as touch at its position in the image {tap[:1]}")
    choice = sql(f"select raw_answer, is_correct from trials where session_id = '{sid}' and item_id = '{ITEM_PIE}'")[0]
    check(choice == ["Option A", "t"], "E: tapping an option selects it")
    coarse = sql(f"select client->>'coarse_pointer' from sessions where id = '{sid}'")[0][0]
    check(coarse == "true", "E: session records a touch device")
    check(not errors, f"E: no page errors {errors or ''}")
    ctx.close()

    # ---- F. Student declines ---------------------------------------------------
    ctx = browser.new_context()
    page, errors = new_page(ctx)
    before = count("select count(*) from sessions")
    page.goto(PAGE_URL + "?site=CSU&course=calc1")
    page.check("input[name=consent][value=No]")
    cont(page)
    page.wait_for_timeout(1000)
    check("nothing has been recorded" in page.inner_text("body"), "F: decline message shown")
    check(page.locator("#jspsych-survey-html-form-next").count() == 0, "F: decline page has no Continue button")
    check(count("select count(*) from sessions") == before, "F: nothing saved for a student who declines")
    ctx.close()

    # ---- G. Link without site and course ---------------------------------------
    ctx = browser.new_context()
    page, errors = new_page(ctx)
    consent_and_details(page, "Annie", "Easley", "ae@school.edu", query="")
    page.wait_for_timeout(1000)
    row = sql("select coalesce(s.site, 'NULL'), coalesce(s.course, 'NULL') from sessions s "
              "join participants p on p.session_id = s.id where p.email = 'ae@school.edu'")
    check(row == [["NULL", "NULL"]], "G: a link without site and course still works (saved as blank)")
    ctx.close()

    browser.close()

dups = count("select count(*) from (select session_id, trial_index from trials group by 1, 2 having count(*) > 1) d")
check(dups == 0, "No duplicate rows anywhere")

failed = [label for ok, label in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
sys.exit(1 if failed else 0)
