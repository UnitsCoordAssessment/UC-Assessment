// Run with:  node --test tests/answer-filter.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { clean, symbolsText } = require('../js/answer-filter.js');

const ALLOWED = '0123456789 *x-/.()R^'; // the default in config.js

test('allowed answers pass through unchanged', () => {
  for (const s of ['12', '4*3', '4x3', '24/2', '10 3/4', '10-3/4', '2.25', '(98-42)/7',
    '2 R1', '6*7*7*7', '6*7^3', '60 x 8', '180/2', '']) {
    const r = clean(s, s.length, ALLOWED);
    assert.equal(r.value, s, s);
    assert.equal(r.refused, '', s);
    assert.equal(r.caret, s.length, s);
  }
});

test('other characters are refused and reported', () => {
  assert.deepEqual(clean('20 miles', 8, ALLOWED), { value: '20 ', caret: 3, refused: 'miles' });
  assert.deepEqual(clean('8"', 2, ALLOWED), { value: '8', caret: 1, refused: '"' });
  assert.deepEqual(clean('2+2', 3, ALLOWED), { value: '22', caret: 2, refused: '+' });
  assert.deepEqual(clean('10¾', 3, ALLOWED), { value: '10', caret: 2, refused: '¾' });
  assert.deepEqual(clean('3,000', 5, ALLOWED), { value: '3000', caret: 4, refused: ',' });
  assert.deepEqual(clean('Option C', 8, ALLOWED), { value: ' ', caret: 1, refused: 'OptionC' });
});

test('look-alike characters are converted, not refused', () => {
  assert.deepEqual(clean('4X3', 3, ALLOWED), { value: '4x3', caret: 3, refused: '' });
  assert.deepEqual(clean('4 × 3', 5, ALLOWED), { value: '4 x 3', caret: 5, refused: '' });
  assert.deepEqual(clean('12 ÷ 3', 6, ALLOWED), { value: '12 / 3', caret: 6, refused: '' });
  assert.deepEqual(clean('2 r1', 4, ALLOWED), { value: '2 R1', caret: 4, refused: '' });
  assert.deepEqual(clean('98 − 42', 7, ALLOWED), { value: '98 - 42', caret: 7, refused: '' });
  assert.deepEqual(clean('10–3/4', 6, ALLOWED), { value: '10-3/4', caret: 6, refused: '' });
  assert.deepEqual(clean('6·7', 3, ALLOWED), { value: '6*7', caret: 3, refused: '' });
  assert.deepEqual(clean('7ˆ3', 3, ALLOWED), { value: '7^3', caret: 3, refused: '' });
});

test('a conversion is used only if its result is allowed', () => {
  // With only digits allowed, X is refused rather than turned into x.
  assert.deepEqual(clean('4X3', 3, '0123456789'), { value: '43', caret: 2, refused: 'X' });
});

test('the cursor stays where the student was typing', () => {
  // Typing "m" in the middle of "20 3": "20m 3", cursor after the m (position 3).
  assert.deepEqual(clean('20m 3', 3, ALLOWED), { value: '20 3', caret: 2, refused: 'm' });
  // Refused text after the cursor does not move it.
  assert.deepEqual(clean('20 miles', 2, ALLOWED), { value: '20 ', caret: 2, refused: 'miles' });
  // A null cursor stays null.
  assert.equal(clean('20 miles', null, ALLOWED).caret, null);
});

test('no limit when the allowed list is empty', () => {
  assert.deepEqual(clean('20 miles', 8, ''), { value: '20 miles', caret: 8, refused: '' });
  assert.deepEqual(clean('Option C', 8, null), { value: 'Option C', caret: 8, refused: '' });
});

test('the note lists the allowed symbols without digits or spaces', () => {
  assert.equal(symbolsText(ALLOWED), '* x - / . ( ) R ^');
});
