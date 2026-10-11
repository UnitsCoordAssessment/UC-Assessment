// Run with:  node --test tests/answer-coder.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const { parse, score } = require('../js/answer-parser.js');
const { code, check } = require('../js/answer-coder.js');

const ROOT = path.resolve(__dirname, '..');
function load(file) {
  const win = {};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', file), 'utf8'), { window: win });
  return win;
}
const CONTENT = load('content.js').STUDY_CONTENT;
const CODES = load('codes.js').STUDY_CODES;
const ITEMS = Object.fromEntries(CONTENT.practice.concat(CONTENT.problems).map((it) => [it.id, it]));

// Minimal CSV reader for the recode test (handles quoted cells with commas).
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const typed = (raw, correct) => ({ raw, parsed: parse(raw), is_correct: correct === undefined ? null : correct, response: 'typed' });
const choice = (raw, correct) => ({ raw, parsed: null, is_correct: correct === undefined ? null : correct, response: 'choice' });

// A small codebook just for testing how rules match.
const T = {
  version: 'test',
  items: {
    a: [
      { contains: 'R', stage: '2', note: 'remainder' },
      { value: '9/4', form: 'number', stage: '3', note: 'decimal' },
      { value: '9/4', stage: '2 or 3', note: 'other notation' },
      { factors: [['60', '8'], ['60', '2', '2', '2']], stage: '3', note: 'copies' },
      { value: ['5', '13'], stage: '1', note: 'given numbers' },
      { unreadable: true, stage: 'any', note: 'unreadable' }
    ],
    b: [
      { option: 'D', stage: '2', note: 'D' },
      { option: ['Option G', 'Option H'], stage: '2', note: 'G or H' }
    ],
    c: [
      { value: '9', earlier: { item: 'a', value: '5' }, stage: '2', note: 'changed after a=5' },
      { value: '9', earlier: { item: 'b', correct: false }, stage: '1 or 2', note: 'after b wrong' },
      { value: '9', stage: 'any', note: 'plain' }
    ]
  }
};

test('values match in any notation, and the first matching rule wins', () => {
  assert.equal(code(T, 'a', typed('2.25')).note, 'decimal');
  assert.equal(code(T, 'a', typed('2 1/4')).note, 'other notation');
  assert.equal(code(T, 'a', typed('18/8')).note, 'other notation');
  assert.equal(code(T, 'a', typed('13')).stage, '1');
  assert.equal(code(T, 'a', typed('13')).rule, 5);
  assert.equal(code(T, 'a', typed('13')).codes_version, 'test');
});

test('contains, factors (any order) and unreadable answers', () => {
  assert.equal(code(T, 'a', typed('2 R1')).note, 'remainder');
  assert.equal(code(T, 'a', typed('2 r 1')).note, 'remainder');
  assert.equal(code(T, 'a', typed('8 x 60')).note, 'copies');
  assert.equal(code(T, 'a', typed('2*2*60*2')).note, 'copies');
  assert.equal(code(T, 'a', typed('10*8*6')).stage, null); // 480, but not those factors
  assert.equal(code(T, 'a', typed('2 x')).note, 'unreadable');
});

test('multiple-choice options, with or without the word "Option"', () => {
  assert.equal(code(T, 'b', choice('Option D')).note, 'D');
  assert.equal(code(T, 'b', choice('Option H')).note, 'G or H');
  assert.equal(code(T, 'b', choice('Option A')).stage, null);
});

test('rules can look at the same student’s earlier answers', () => {
  const earlier = { a: typed('5'), b: choice('Option D', false) };
  assert.equal(code(T, 'c', typed('9'), (id) => earlier[id]).note, 'changed after a=5');
  earlier.a = typed('9/4');
  assert.equal(code(T, 'c', typed('9'), (id) => earlier[id]).note, 'after b wrong');
  assert.equal(code(T, 'c', typed('9'), () => null).note, 'plain');
});

test('no match gives stage null; a problem with no rules gives null', () => {
  const r = code(T, 'a', typed('7'));
  assert.equal(r.stage, null);
  assert.equal(r.rule, null);
  assert.equal(code(T, 'nope', typed('7')), null);
});

test('check() catches mistakes in a codebook', () => {
  const content = { practice: [], problems: [
    { id: 'p1', response: 'typed', correct: '4' },
    { id: 'p2', response: 'choice', options: ['Option A', 'Option B'], correct: 'Option A' }
  ] };
  const bad = { version: 'x', items: {
    p1: [{ value: 'four', stage: '1', note: 'n' }, { stage: '1', note: 'no condition' }, { value: '4', note: 'no stage' },
      { option: 'Option A', stage: '1', note: 'option on typed' }, { value: '4', earlier: { item: 'p2' }, stage: '1', note: 'later item' }],
    p2: [{ option: 'Option Z', stage: '1', note: 'bad option' }, { value: '4', stage: '1', note: 'value on choice' }],
    p9: [{ value: '1', stage: '1', note: 'unknown item' }]
  } };
  const problems = check(bad, content).join('\n');
  for (const s of ['"four" cannot be read', 'no condition', 'needs both stage and note', 'option used on a typed problem',
    'does not come before', '"Option Z" is not an option', 'used on a multiple-choice problem', 'p9: not a problem id']) {
    assert.ok(problems.includes(s), s);
  }
});

test('codes.js is consistent with content.js', () => {
  assert.deepEqual(check(CODES, CONTENT), []);
});

test('every problem has rules, and every correct answer and every option is coded', () => {
  for (const p of CONTENT.problems) {
    const rules = CODES.items[p.id];
    assert.ok(rules && rules.length, `${p.id} has no rules`);
    if (p.response === 'typed') {
      const c = code(CODES, p.id, typed(String(p.correct), true), () => null);
      assert.notEqual(c.stage, null, `${p.id}: the correct answer ${p.correct} is not coded`);
    } else {
      for (const o of p.options) {
        const c = code(CODES, p.id, choice(o, o === p.correct), () => null);
        assert.notEqual(c.stage, null, `${p.id}: ${o} is not coded`);
      }
    }
  }
});

test('codes for expected answers from the item analysis', () => {
  const id = (s) => CONTENT.problems.find((p) => p.id.endsWith('_' + s)).id;
  const cases = [
    ['NortonBars_Mult2', '16', '2'], ['NortonBars_Mult2', '8-2', '1'],
    ['NortonBars_DivisionImproperFrac', '2 R1', '2'], ['NortonBars_DivisionImproperFrac', '2 1/9', '2'],
    ['NortonBars_DivisionImproperFrac', '9/4', '2 or 3'], ['area_garden2', '56', '1'],
    ['volume_yellow', '60 x 8', '3'], ['volume_yellow', '10*8*6', '2'],
    ['area_tessellation', '294', '2'], ['proportion2', '3', '2'], ['angle_improperfrac', '3/8', '2']
  ];
  for (const [name, raw, stage] of cases) {
    const item = ITEMS[id(name)];
    assert.equal(code(CODES, item.id, typed(raw, score(raw, item.correct)), () => null).stage, stage, `${name} ${raw}`);
  }
});

test('scripts/recode.js re-applies the codebook to exported answers', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'recode-'));
  const id = (s) => CONTENT.problems.find((p) => p.id.endsWith('_' + s)).id;
  const rows = [
    { session_id: 's1', trial_index: 14, item_id: id('area_yardsfeet1'), raw_answer: '3', is_correct: false,
      instrument_version: 'x', data: { code: { stage: '1 or 2', codes_version: 'old' } } },
    { session_id: 's1', trial_index: 15, item_id: id('area_yardsfeet2'), raw_answer: '9', is_correct: true,
      instrument_version: 'x', data: {} },
    { session_id: 's2', trial_index: 7, item_id: id('NortonBars_DivisionImproperFrac'), raw_answer: '2 R1',
      instrument_version: 'x', data: { code: { stage: '1', codes_version: 'old' } } }
  ];
  const input = path.join(dir, 'trials_full.jsonl');
  fs.writeFileSync(input, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'recode.js'), input]);
  const out = parseCsv(fs.readFileSync(path.join(dir, 'trials_recoded.csv'), 'utf8'));
  const head = out[0];
  const col = (row, name) => row[head.indexOf(name)];
  assert.equal(out.length, 4);
  const byItem = Object.fromEntries(out.slice(1).map((r) => [col(r, 'item_id'), r]));
  assert.equal(col(byItem[id('area_yardsfeet2')], 'code_stage'), '2'); // 3 then 9: changed after the figure
  assert.equal(col(byItem[id('NortonBars_DivisionImproperFrac')], 'code_stage'), '2');
  assert.equal(col(byItem[id('NortonBars_DivisionImproperFrac')], 'changed'), 'true');
  assert.equal(col(byItem[id('area_yardsfeet1')], 'changed'), 'false');
});
