# Units-Coordination Assessment

A browser-based assessment built with **jsPsych 8** that saves to **Supabase**.
It should be run on a desktop with mouse and keyboard. Otherwise, it needs no build step, and can be hosted for free
as a static website (for example GitHub Pages).

---

## Try it (demo mode)

Double-click `index.html`, or open it in any browser. With no Supabase details
in `js/config.js`, the page runs in **demo mode**: nothing leaves the computer,
and the last page shows the data that would have been saved, with a download
button. A small label in the lower-left corner says "DEMO MODE".

---

## What students see

One page at a time, each with a **Continue** button in the lower-right corner
of the screen and **no Back button**:

1. **Consent**: IRB-approved consent message with information about the study and data collection, followed by
"Do you agree to participate in this study?" with Yes / No. Choosing No ends the assessment and saves
   nothing.
2. **About you**: first name, last name, age range, college/university email,
   academic program, and program of study.
3. **Practice introduction**, then **Practice Problems 1–2**.
4. **"The assessment will now begin."**
5. **Problems 1–26**, one per page. Each page has the figure (if any), the
   question, the answer (typed, or Option A/B/…), and the explanation box
   together.
6. **Final page**: completion message and the PIs' email addresses, with no
   Continue button.

In the answer box of a typed problem, students can type only digits, spaces,
and the symbols `+` `*` `x` `-` `/` `.` `(` `)` `R` `^` (set by `answerCharacters` in
`js/config.js`). Anything else is refused as it is typed or pasted, a short
note under the box lists the symbols they can use, and the refused characters
are saved. Uppercase `X`, lowercase `r`, `×`, `÷` and dashes are converted to
`x`, `R`, `x`, `/` and `-` instead of refused. The "Explain your answer" boxes
are not limited. Answers such as `4*3`, `4x3`, `4(3)`, `24/2`, `2 1/4`, `2.25`,
`10-3/4` and `(98-42)/7` are all read and scored; an answer with `R`
(`2 R1`) or `^` (`6*7^3`) is saved but not scored automatically, so it goes
to a person.
The follow-up problems (12, 17, 24 and 26) repeat the previous question with a
new figure, and students answer it again.

---

## Files

```
index.html                 the page students open
js/content.js              ← all wording and all problems (edit this to change the assessment)
js/config.js               ← technical settings: Supabase details, sites, courses, required answers
js/codes.js                ← the codebook: how each answer is interpreted (see "Coding answers")
img/                       the figures, taken from the Word document
js/pages.js                builds the pages (consent, about you, problems, ...)
js/answer-parser.js        reads typed answers in any notation; scores them
js/answer-filter.js        limits which characters can be typed in the answer box
js/answer-coder.js         applies the codebook to each answer
js/pointer-tracker.js      cursor/touch positions and leaving-the-page events
js/storage.js              saving, retrying, and backups
js/main.js                 the order of pages
css/style.css              layout, sized for touch
vendor/                    pinned copies of jsPsych 8.3.0 and supabase-js 2.117.3 (MIT licensed)
supabase/schema.sql        tables and access rules; run once in Supabase
scripts/export_data.py     downloads all data to CSV for analysis
scripts/recode.js          re-applies the current codebook to downloaded data
tests/                     automated tests (see "Testing")
```

---

## Changing the assessment

All wording and problems are in `js/content.js`. Each problem is a block like:

```js
{
  id: 'problem_01',            // stable; saved with every answer
  title: 'Problem 1',
  figure: { src: 'img/bars.png', alt: 'Description for screen readers', width: 586 },
  prompt: '<p>Pretend that ...</p><p>Using this information: <strong>How many ...?</strong></p>',
  response: 'typed',           // 'typed' | 'choice' | 'yesno'
  correct: '12'                // fills the automatic is_correct column; null = not scored
}
```

Blocks are separated by commas, and each one starts with `{` and ends with `}`.

- `lead` (optional) is text shown above the figure, as in Problems 12 and 17.
- `choice` problems also list `options: ['Option A', ...]`.
- `hint: false` hides the "You may enter either a number…" line (Problems 21–23 and 25).
- `correct` takes one value. Any expression equal to it is also scored correct,
  so `'90'` already accepts `180/2` or `5*3*6`; there is no need to list them.
- To replace a figure, put the new image in `img/` and change `src`. `width` is
  the display width in pixels; figures shrink automatically on small screens.
- After any change, increase `instrumentVersion` in `js/config.js`. Every
  saved row records the version the student saw.

**If the page is blank after an edit,** `content.js` almost certainly has a
typing slip: a text line missing its closing `'` or `</p>' +`, a missing comma
between blocks, or a block missing its opening `{`. In Chrome or Edge, press
F12 and open the Console tab; the red message names the file and line number.

The automatic `is_correct` value is a convenience for checking data. It is
`null` when a problem is not auto-scored, and also when a typed answer cannot be
read (for example "7 rows and 5 left over"), so those go to a person instead of
being marked wrong.

**Settings in `js/config.js`:** `requireAnswers` (whether students must answer
and explain before Continue works; on by default), `showProgressBar` (off by
default, since the specification did not include one), and `answerCharacters`
(the characters allowed in typed answer boxes; `''` turns the limit off).
A single problem can override it with its own `answerCharacters` in
`content.js`, for example `answerCharacters: 'ABCDEFGHIJ'` for an answer that is
a letter. The note shown when a character is refused can be reworded by adding
`answerRefusedNote` to `content.js`; `{symbols}` in it is replaced by the
allowed symbols.

---

## Coding answers

`js/codes.js` is a codebook. For each problem it lists rules that give an
answer a **stage label** and a **note** explaining it. When a student
continues, the first rule that matches their answer is saved with the answer
(`data → code`), next to the raw answer, which is always saved unchanged.

Stage labels say which stage(s) of units coordination an answer is
**consistent with**: `'1'`, `'2'`, `'3'`, `'1 or 2'`, `'2 or 3'`, or `'any'`
(the answer says nothing about stage by itself). They are evidence to combine
across problems and with the explanations, not a stage assignment from one
answer. Notes mark where each prediction comes from: `(E: source)` for a
response observed with students in that study, `(T)` for a prediction from the
stage's defining operations. An answer that matches no rule is saved with
stage `null`, for a person to code.

A rule matches by any of these, and all the conditions in one rule must hold:

| Condition | Example | Matches |
|---|---|---|
| `value` | `value: ['5', '13', '36']` | the answer's value in any notation (`2.25`, `2 1/4`, `9/4` are the same) |
| `contains` | `contains: 'R'` | text in the answer, e.g. a remainder |
| `form` | `form: 'product'` | how it was written: `number`, `fraction`, `mixed_number`, `product`, `repeated_addition`, `sum`, `quotient`, `mixed` |
| `factors` | `factors: ['60', '8']` | a product of exactly these factors, in any order |
| `option` | `option: ['Option G', 'Option H']` | the option chosen (multiple choice) |
| `unreadable` | `unreadable: true` | the answer could not be read as a number |
| `correct` | `correct: false` | scored correct / incorrect |
| `earlier` | `earlier: { item: 'problem_11_area_yardsfeet1', value: '3' }` | the same student's answer to an earlier problem, e.g. 3 on Problem 11 and then 9 on Problem 12 |

The current rules are a **draft for review**, drawn from the item-by-item
analysis (Norton et al. 2015; Hackenberg 2007, 2010; Ulrich & Wilkins 2017;
Antonides et al. 2026; and others listed at the top of `codes.js`). After
changing any rule, increase `version` at the top of `codes.js`; every saved
code records the version that produced it.

**Re-coding collected data.** Because raw answers are kept, revised rules can
be applied to data already collected:

```bash
python3 scripts/export_data.py --out exports/
node scripts/recode.js exports/trials_full.jsonl
```

This writes `exports/trials_recoded.csv` with the new code for every answer,
the code saved at the time, and whether it changed. It checks `codes.js` for
mistakes first (an unreadable value, an option that does not exist, an
`earlier` problem that comes later) and stops if it finds any.

Like the answer keys in `content.js`, the codebook is part of the page, so a
student who opens the page source could read it.

---

## What is saved

| Table | One row per | Contents |
|---|---|---|
| `sessions` | sitting | site and course (from the link), age range, academic program, program of study, consent time, device and screen size |
| `participants` | sitting | first name, last name, email, **kept apart from everything else** |
| `trials` | problem page (practice and assessment) | answer, explanation, automatic score, and the timing and cursor data below |
| `completions` | finished sitting | finish time |

Each `trials` row includes:

| Field | Meaning |
|---|---|
| `raw_answer`, `explanation` | exactly what the student entered or chose |
| `is_correct` | true / false, or empty (see above) |
| `rt_ms` | time from the page appearing to Continue |
| `data → timing` | when the student first touched any field; for each field, first and last change and number of changes; when the figure finished loading |
| `data → answer_history` | each version of the typed answer, or each option clicked, with times (e.g. `13` changed to `12` after 4.2 s) |
| `data → refused_input` | characters the answer box refused, with times (e.g. `miles` after 6.1 s); the CSV export lists them in `refused_characters` |
| `data → code` | the answer's interpretation from `codes.js`: stage label, note, rule number, and codebook version (see "Coding answers"); the CSV export has them as `code_stage`, `code_note`, `code_rule`, `codes_version` |
| `data → parsed` | the answer read as math: exact value, normalized form, and structure (a product with its factors, repeated addition, a quotient, a mixed number, …) |
| `data → pointer_events` | cursor/touch samples `{t, type, x, y, nx, ny, pt, target, rx, ry}`. `target` names what is under the pointer (`figure`, `answer-box`, `option-C`, …). Over a figure, `rx, ry` give the position within the image (0–1), so the same spot on an image can be compared across screen sizes. |
| `left_page_count`, `left_page_ms` | times and total time the student switched to another tab or app during the page |

Site and course come from the link: give each class its own link, for example
`…/index.html?site=CSU&course=calc1`. Students never see or type them. Valid
codes are listed in `js/config.js`.

---

## Going live with Supabase

1. **Create a project** at supabase.com. Choose a US region if your IRB or IT
   office requires data to stay in the US.
2. **Create the tables.** In the dashboard, open *SQL Editor*, paste all of
   `supabase/schema.sql`, and click *Run*. (If you ran the earlier version of
   this file, see the note at its top first.)
3. **Connect the page.** From *Project Settings → API Keys*, copy the
   **Project URL** and the public key into `js/config.js`. Newer projects call
   it the **publishable** key; older ones call it **anon**.
   - The public key is meant to be public. It can only add rows; it cannot
     read anything, including names and emails.
   - **Never put the secret key (older name: `service_role`) in any file in
     this folder.** It bypasses every rule. Keep it in a password manager.
4. **Host the folder.** Any static host works. With GitHub Pages: put this
   folder in a repository, then *Settings → Pages → Deploy from branch*.

### Downloading data

On a research-team computer:

```bash
export SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
export SUPABASE_SERVICE_KEY="…secret (service_role) key…"
python3 scripts/export_data.py --out exports/
```

This writes `trials.csv` (one row per problem page, with site, course and
demographics joined in, and the code, timing and parsed-answer fields as columns),
`sessions.csv`, `completions.csv`, `trials_full.jsonl` (every field, including
cursor samples), and **`identifying/participants.csv`**, the only file with
names and emails. Everything outside `identifying/` is keyed by a random
session ID and can go to the analysis team as is.

### When a participant withdraws

`supabase/schema.sql` ends with a commented-out query that deletes everything
for one email address. Run it in the SQL Editor.

---

## Before collecting real data

- [ ] Replace the IRB placeholder on the consent page (`consentHtml` in
      `js/content.js`) with the approved wording.
- [ ] Confirm with your IRB that collecting names and email addresses through
      a cloud database is approved, and list Supabase as a data processor if
      they ask. Ask CSU IT whether it needs a vendor security review.
- [ ] Check Supabase's current plans: confirm the plan includes automatic
      backups and will not pause an inactive project during data collection.
- [ ] Pilot the whole flow on the actual iPads and laptops, on each campus's
      Wi-Fi.
- [ ] Have someone who uses a screen reader try it. Figures have text
      descriptions, but several problems depend on seeing the image.

---

## Testing

Five automated suites:

| Suite | What it checks |
|---|---|
| `tests/answer-parser.test.js` (20 tests) | Every notation above, mixed numbers, unit words, fraction division, unreadable answers left unscored, and that every answer key in `content.js` gives the intended value |
| `tests/answer-filter.test.js` (7 tests) | Allowed answers pass through unchanged; other characters are refused and reported; look-alike symbols are converted; the cursor stays where the student was typing |
| `tests/answer-coder.test.js` (10 tests) | How rules match (values in any notation, text, factors, options, earlier answers, first match wins); that `codes.js` agrees with `content.js` and codes every correct answer and every option; expected codes for answers from the item analysis; and that `scripts/recode.js` re-codes exported data |
| `tests/local-backend/access_rules_test.sql` (28 checks) | The public key can add rows but cannot read, change or delete anything, including names and emails; invalid emails, blank names, duplicate saves and orphan rows are rejected; the analysis view has no name or email columns; withdrawal by email removes everything |
| `tests/local-backend/e2e_test.py` (40 checks) | A real browser takes the whole assessment against a local copy of Supabase's stack: page order, Continue in the lower-right corner on every page, no Back button, every answer and score saved, timing and cursor data, required fields, the Enter key, Wi-Fi dropping mid-session, a tab closed with unsaved answers, an iPad touch session, a student declining, and a link without site/course |

Parser, filter and coder tests need only Node:
`node --test tests/answer-parser.test.js tests/answer-filter.test.js tests/answer-coder.test.js`.
For the other two suites, see `tests/local-backend/README.md`.
