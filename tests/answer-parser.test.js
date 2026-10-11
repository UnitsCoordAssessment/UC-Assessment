// Run with:  node --test tests/answer-parser.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { parse, equivalent } = require('../js/answer-parser.js');

test('equivalent notations for 8 x 3 x 2 all parse to the same product', () => {
  const inputs = [
    '8*3*2', '8x3x2', '8 x 3 x 2', '8X3X2', '8 × 3 × 2', '8·3·2', '8 ⋅ 3 ⋅ 2',
    '8 times 3 times 2', '8 multiplied by 3 multiplied by 2', '8(3)(2)', '(8)(3)(2)',
    '8 (3) (2)', '[8][3][2]'
  ];
  for (const input of inputs) {
    const r = parse(input);
    assert.equal(r.ok, true, `${input}: ${r.error}`);
    assert.equal(r.value_text, '48', input);
    assert.equal(r.normalized.replace(/[()]/g, ''), '8*3*2', input);
    assert.deepEqual(r.structure, { kind: 'product', factors: ['8', '3', '2'] }, input);
  }
});

test('a bare number is recognized as a number, not a product', () => {
  const r = parse('48');
  assert.equal(r.ok, true);
  assert.equal(r.value_text, '48');
  assert.deepEqual(r.structure, { kind: 'number' });
});

test('repeated addition and sums are distinguished', () => {
  assert.deepEqual(parse('6+6+6+6').structure, { kind: 'repeated_addition', terms: ['6', '6', '6', '6'] });
  assert.equal(parse('6 plus 6 plus 6').value_text, '18');
  assert.deepEqual(parse('5+7').structure, { kind: 'sum', terms: ['5', '7'] });
});

test('mixed expressions report the operators used', () => {
  const r = parse('2(3+4)');
  assert.equal(r.value_text, '14');
  assert.deepEqual(r.structure, { kind: 'mixed', operators: ['*', '+'] });
});

test('fractions and decimals are exact', () => {
  assert.equal(parse('1/3 of 1/4').value_text, '1/12');
  assert.equal(parse('1/3 x 1/4').value_text, '1/12');
  assert.equal(parse('0.5*4').value_text, '2');
  assert.equal(parse('.25 times 8').value_text, '2');
  assert.equal(parse('0.1+0.2').value_text, '3/10'); // no floating-point error
  assert.equal(parse('12 ÷ 4').value_text, '3');
  assert.equal(parse('12 divided by 5').value_text, '12/5');
});

test('written fractions count as single quantities', () => {
  assert.deepEqual(parse('2/3').structure, { kind: 'fraction' });
  assert.deepEqual(parse('1/3 of 1/4').structure, { kind: 'product', factors: ['1/3', '1/4'] });
  assert.deepEqual(parse('1/4+1/4+1/4').structure,
    { kind: 'repeated_addition', terms: ['1/4', '1/4', '1/4'] });
  assert.deepEqual(parse('3 x 1/4').structure, { kind: 'product', factors: ['3', '1/4'] });
  assert.deepEqual(parse('(1/3)(1/4)').structure, { kind: 'product', factors: ['1/3', '1/4'] });
  // A quotient that is not a written fraction is still reported as mixed.
  assert.equal(parse('12/(2*3)').structure.kind, 'mixed');
});

test('fraction division is read the way students write it', () => {
  for (const input of ['2/3 ÷ 1/6', '2/3 divided by 1/6', '(2/3)/(1/6)', '2/3 / 1/6']) {
    const r = parse(input);
    assert.equal(r.value_text, '4', input);
    assert.deepEqual(r.structure, { kind: 'quotient', dividend: '2/3', divisor: '1/6' }, input);
    assert.equal(r.normalized.replace(/[÷]/g, '/'), '(2/3)/(1/6)', input);
  }
  assert.equal(parse('12/2/3').value_text, '2');   // ordinary left-to-right division
  assert.equal(parse('12/(2*3)').value_text, '2');
  assert.equal(parse('6*1/2').value_text, '3');
  assert.deepEqual(parse('6 ÷ 2').structure, { kind: 'quotient', dividend: '6', divisor: '2' });
});

test('3 groups of 4 is a product', () => {
  const r = parse('3 groups of 4');
  assert.equal(r.value_text, '12');
  assert.deepEqual(r.structure, { kind: 'product', factors: ['3', '4'] });
});

test('negative numbers and unicode minus signs', () => {
  assert.equal(parse('−3+5').value_text, '2');
  assert.equal(parse('-2*-3').value_text, '6');
});

test('thousands separators', () => {
  assert.equal(parse('1,000').value_text, '1000');
  assert.equal(parse('12,345 + 1').value_text, '12346');
});

test('equations are accepted when both sides agree', () => {
  const r = parse('8*3*2=48');
  assert.equal(r.ok, true);
  assert.equal(r.has_equals, true);
  assert.equal(r.value_text, '48');
  assert.deepEqual(r.structure, { kind: 'product', factors: ['8', '3', '2'] });
  const bad = parse('8*3*2 = 46');
  assert.equal(bad.ok, false);
  assert.match(bad.error, /not equal/);
});

test('trailing unit words are removed and recorded', () => {
  const r = parse('72 marbles');
  assert.equal(r.ok, true);
  assert.equal(r.value_text, '72');
  assert.equal(r.stripped_words, 'marbles');
  const r2 = parse('3 x 4 x 6 marbles');
  assert.equal(r2.value_text, '72');
  assert.deepEqual(r2.structure.factors, ['3', '4', '6']);
  assert.equal(parse('72 bags of marbles').value_text, '72');
});

test('unparseable answers fail with a reason instead of guessing', () => {
  const cases = {
    '': /empty/,
    '8 3 2': /two numbers in a row/,
    'abc': /unrecognized/,
    '8**3': /unexpected/,
    '8/0': /division by zero/,
    'x8': /between two numbers/,
    '8x': /between two numbers/,
    '8 plus': /ends too early/,
    '3 x': /between two numbers/,
    '1/3 of': /ends too early/,
    '(8*3': /closing parenthesis/,
    '8*3)': /unexpected/
  };
  for (const [input, pattern] of Object.entries(cases)) {
    const r = parse(input);
    assert.equal(r.ok, false, `${input} should fail`);
    assert.match(r.error, pattern, `${input}: ${r.error}`);
    assert.equal(r.value_text, null);
  }
});

test('equivalent() compares exact values', () => {
  assert.equal(equivalent('8x3x2', 48), true);
  assert.equal(equivalent('8 times 3 times 2', '6*8'), true);
  assert.equal(equivalent('47', 48), false);
  assert.equal(equivalent('nonsense', 48), false);
  assert.equal(equivalent('2/4', '1/2'), true);
});

test('results contain only JSON-safe values', () => {
  const r = parse('1/3 of 1/4');
  assert.doesNotThrow(() => JSON.stringify(r));
});

test('mixed numbers', () => {
  for (const input of ['2 1/4', '2 and 1/4', '2  1/4']) {
    const r = parse(input);
    assert.equal(r.value_text, '9/4', input);
    assert.deepEqual(r.structure, { kind: 'mixed_number' }, input);
  }
  assert.equal(parse('7 5/7 rows').value_text, '54/7');
  assert.equal(parse('3 x 2 1/4').value_text, '27/4');
  assert.deepEqual(parse('3 x 2 1/4').structure, { kind: 'product', factors: ['3', '2 1/4'] });
  assert.equal(parse('1 1/2 + 1 1/2').structure.kind, 'repeated_addition');
  assert.equal(parse('8 2 1/4').ok, false); // two numbers in a row
});

test('count and unit words after an answer', () => {
  assert.equal(parse('4 times').value_text, '4');
  assert.equal(parse('4 times').stripped_words, 'times');
  assert.equal(parse('2 1/4 times').value_text, '9/4');
  assert.equal(parse('1/3 of the trip').value_text, '1/3');
  assert.equal(parse('1/3 of the trip').stripped_words, 'of the trip');
  assert.equal(parse('20 miles').value_text, '20');
  assert.equal(parse('2058 bird tiles').value_text, '2058');
  assert.equal(parse('3*2*5 triangles').value_text, '30');
});

test('score() leaves unreadable answers unscored', () => {
  const { score } = require('../js/answer-parser.js');
  assert.equal(score('4x3', '12'), true);
  assert.equal(score('13', '12'), false);
  assert.equal(score('7 rows and 5 trees left over', '54/7'), null);
  assert.equal(score('', '12'), null);
  assert.equal(score('12', null), null);
  assert.throws(() => score('12', 'not a number'));
});

test('answer keys in content.js parse and match the intended values', () => {
  global.window = {};
  require('../js/content.js');
  const content = global.window.STUDY_CONTENT;
  const all = content.practice.concat(content.problems);
  const typed = all.filter((p) => p.response === 'typed' && p.correct != null);
  const expected = {
    practice_1: '12', practice_2: '30',
    problem_01_NortonBars_Mult1: '12', problem_02_NortonBars_Mult2: '4',
    problem_03_NortonBars_DivisionWhole: '4', problem_04_NortonBars_DivisionImproperFrac: '9/4',
    problem_05_length_brokenruler1: '8', problem_06_length_brokenruler2: '43/4',
    problem_07_POW_threesevenths: '3/7', problem_08_area_patterntiles: '144',
    problem_09_area_garden1: '42', problem_10_area_garden2: '8', problem_11_area_yardsfeet1: '9',
    problem_13_area_tessellation: '2058', problem_18_area_cardboard: '21', problem_19_volume_yellow: '480',
    problem_20_proportion1: '20', problem_21_proportion2: '1/3', problem_22_volume_colin: '90',
    problem_23_angle_properfrac: '1/4', problem_25_angle_improperfrac: '8/3',
    problem_12_area_yardsfeet2: '9', problem_24_angle_properfrac_followup: '1/4',
    problem_26_angle_improperfrac_followup: '8/3'
  };
  assert.deepEqual(Object.fromEntries(typed.map((p) => [p.id, parse(p.correct).value_text])), expected);
  for (const p of all.filter((x) => x.response === 'choice')) {
    assert.ok(p.options.includes(p.correct), p.id);
  }
  assert.equal(new Set(all.map((p) => p.id)).size, all.length, 'ids are unique');
  assert.equal(content.problems.length, 26);
  assert.equal(content.practice.length, 2);
});

test('answers students are likely to give to these problems', () => {
  const { score } = require('../js/answer-parser.js');
  const cases = [
    ['4*3', '12', true], ['4x3', '12', true], ['24/2', '12', true], ['12 black bars', '12', true],
    ['3x2x5', '30', true], ['5 x 6', '30', true],
    ['8/2', '4', true], ['4 times', '4', true],
    ['9/4', '9/4', true], ['2 1/4', '9/4', true], ['2.25', '9/4', true], ['2', '9/4', false],
    ['36 x 4', '144', true], ['6 x 7 x 7 x 7', '2058', true],
    ['15/9 x 12', '20', true], ['20 miles', '20', true],
    ['1/3', '1/3', true], ['3/9', '1/3', true], ['5/15', '1/3', true], ['one third', '1/3', null],
    ['8 times 3', '24', true],
    ['8 inches', '8', true], ['8"', '8', true], ['9', '8', false], ['55 1/2', '8', false],
    ['10.75', '10 3/4', true], ['10¾', '10 3/4', true], ['58 1/2 - 47 3/4', '10 3/4', true],
    ['11 1/4', '10 3/4', false], ['11 3/4', '10 3/4', false],
    ['3/7', '3/7', true], ['3 out of 7', '3/7', true], ['3/4', '3/7', false]
  ];
  for (const [answer, key, want] of cases) assert.equal(score(answer, key), want, `${answer} vs ${key}`);
});

test('ruler answers: inch marks, fraction characters, tape-measure hyphens', () => {
  const cases = [
    ['10 3/4"', '43/4'], ['10 3/4 ″', '43/4'], ['8"', '8'], ['8 “', '8'], ["10 3/4''", '43/4'],
    ['10¾', '43/4'], ['10 ¾', '43/4'], ['10 ¾ inches', '43/4'], ['½', '1/2'], ['2×¾', '3/2'], ['3⁄7', '3/7'],
    ['10-3/4', '43/4'], ['10-3/4 inches', '43/4'], ['10-3/4"', '43/4']
  ];
  for (const [input, want] of cases) assert.equal(parse(input).value_text, want, input);
  assert.deepEqual(parse('10-3/4').structure, { kind: 'mixed_number' });
  // Inside a longer expression a hyphen is still subtraction.
  assert.equal(parse('58 1/2-47 3/4').value_text, '43/4');
  assert.equal(parse('58-47').value_text, '11');
  assert.equal(parse('12 - 3/4').value_text, '45/4');
});

test('"out of" is read as a fraction', () => {
  assert.equal(parse('3 out of 7').value_text, '3/7');
  assert.deepEqual(parse('3 out of 7').structure, { kind: 'fraction' });
  assert.equal(parse('3 out of 7 pieces').value_text, '3/7');
  assert.equal(parse('3 out of').ok, false);
});
