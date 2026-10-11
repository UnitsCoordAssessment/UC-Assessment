/*
 * codes.js — the codebook: how each answer is interpreted.
 *
 * DRAFT for review. Each problem has a list of rules. The first rule that
 * matches a student's answer gives that answer a stage label and a note, which
 * are saved with the answer (data.code). The raw answer is always saved too,
 * so these rules can be changed at any time and re-applied to collected data
 * with scripts/recode.js. After changing any rule, increase `version` below;
 * every saved code records the version that produced it.
 *
 * Stage labels: the stage(s) of units coordination an answer is CONSISTENT
 * WITH. They are evidence to combine across problems and with the
 * explanations, not a stage assignment from one answer.
 *   '1'  '2'  '3'          consistent with that stage
 *   '1 or 2'  '2 or 3'     consistent with either
 *   'any'                  says nothing about stage by itself (e.g. a correct
 *                          answer every stage can reach, or a misreading)
 *
 * Notes say why, and where the prediction comes from:
 *   (E: source)  this response was observed with students in that study
 *   (T)          a prediction from the stage's defining operations
 *
 * Rule conditions (all the conditions in a rule must hold):
 *   value: '16'  or  ['5', '13', '36']   the answer's value, in any notation
 *   contains: 'R'                         text in the answer (any case)
 *   form: 'product'                       how it was written: 'number',
 *                                         'fraction', 'mixed_number', 'product',
 *                                         'repeated_addition', 'sum', 'quotient',
 *                                         'mixed' (several operations)
 *   factors: ['60', '8']                  a product of exactly these factors,
 *                                         in any order; [[...], [...]] for several
 *   option: 'Option D'  or  ['Option G', 'Option H']   (multiple choice)
 *   unreadable: true                      the answer could not be read as a number
 *   correct: true / false                 scored correct / incorrect
 *   earlier: { item: '<problem id>', value: '3' }   the same student's answer to
 *                                         an earlier problem (value, option or
 *                                         correct, as above)
 * Answers that match no rule are saved with stage null, for a person to code.
 *
 * Sources: Norton et al. (2015) written-instrument rubric; Ulrich & Wilkins
 * (2017); Hackenberg (2007, 2010); Hackenberg & Lee (2015); Hackenberg &
 * Sevinc (2024); Hackenberg, Aydeniz Temizer & Borowski (2023); Antonides et
 * al. (2026); Antonides & Battista (2023) and Zwanch et al. (2024) as
 * summarized in Antonides et al. (2026); Lovin et al. (2018); Battista (2004).
 */
window.STUDY_CODES = {
  version: '0.1 draft 2026-10-10',

  items: {

    // ---- Problems 1-4: bars (Norton et al. 2015, Tasks 4-7) -----------------

    // Black fits into Green 2 times; Green into Pink 6 times. Black into Pink? (12)
    problem_01_NortonBars_Mult1: [
      { value: '12', stage: 'any',
        note: 'Correct. Stage 2 or 3 depends on the explanation (one three-level relation vs. built up or multiplied without justification); Stage 1 students may multiply without reasons (E: Norton et al. 2015)' },
      { value: '8', stage: '1', note: 'Added the given numbers, 2 + 6 (E: Norton et al. 2015)' },
      { value: ['4', '5', '4 1/2'], stage: '1',
        note: 'Subtracted (6 − 2) or estimated from the picture, where pink looks about 4–5 blacks long (E: Norton et al. 2015)' },
      { value: '3', stage: '1 or 2', note: 'Divided instead of multiplying, 6 ÷ 2 (T)' }
    ],

    // Green into Pink 2 times; Black into Pink 8 times. Black into Green? (4)
    problem_02_NortonBars_Mult2: [
      { value: '4', stage: 'any',
        note: 'Correct. 8 ÷ 2 is halving, which is available before equi-partitioning, so not diagnostic alone (E: Ulrich & Wilkins 2017)' },
      { value: '16', stage: '2', note: 'Multiplied instead of dividing (E: Norton et al. 2015, Stage 2 indicator)' },
      { value: '6', stage: '1', note: 'Subtracted, 8 − 2 (E: Norton et al. 2015, Student #9 wrote "8÷2=6")' },
      { value: '10', stage: '1', note: 'Added, 8 + 2 (E: Norton et al. 2015)' },
      { value: '1/4', stage: '2 or 3',
        note: 'Gave the relation as a unit fraction (black is 1/4 of green), which Norton et al. note Stage 2 and 3 students sometimes do (E)' },
      { value: ['2', '3', '2 1/2'], stage: '1',
        note: 'Estimated from the picture, where green looks about 2½ blacks long (E: Norton et al. 2015)' }
    ],

    // Black into Pink 12 times; Black into Green 3 times. Green into Pink? (4)
    problem_03_NortonBars_DivisionWhole: [
      { value: '4', stage: '2 or 3',
        note: 'Correct. Stage 3 if the explanation says pink is four 3s; Stage 2 if it divides without justification (E: Norton et al. 2015)' },
      { value: '36', stage: '2', note: 'Multiplied instead of dividing (E: Norton et al. 2015, Stage 2 indicator)' },
      { value: '9', stage: '1', note: 'Subtracted, 12 − 3 (E: Norton et al. 2015)' },
      { value: '15', stage: '1', note: 'Added, 12 + 3 (E: Norton et al. 2015)' },
      { value: '1/4', stage: '2 or 3', note: 'Gave the relation as a unit fraction (green is 1/4 of pink) (E: Norton et al. 2015)' },
      { value: '2', stage: '1', note: 'Estimated from the picture, where pink looks about 2 greens long (E: Norton et al. 2015)' }
    ],

    // Black into Pink 9 times; Black into Green 4 times. Green into Pink? (9/4)
    problem_04_NortonBars_DivisionImproperFrac: [
      { contains: 'R', stage: '2', note: 'Whole number with a remainder, e.g. 2 R1 (E: Norton et al. 2015, Stage 2 indicator)' },
      { value: '9/4', stage: '2 or 3',
        note: 'Correct. Stage 3 if the leftover black is named as 1/4 of a green; division with no account of the leftover is a Stage 2 indicator (E: Norton et al. 2015)' },
      { value: '2 1/9', stage: '2', note: 'Named the leftover against the pink bar (E: Norton et al. 2015, Stage 2 indicator)' },
      { value: '2', stage: '1 or 2',
        note: 'Whole number only: dropped the leftover (Stage 2) or estimated from the picture, where pink looks about 2 greens (Stage 1) (E: Norton et al. 2015)' },
      { value: '3', stage: '1 or 2', note: 'Rounded up to a whole number (T)' },
      { value: ['5', '13', '36'], stage: '1', note: 'Subtracted, added or multiplied the given numbers (E: Norton et al. 2015)' },
      { value: '4/9', stage: '1 or 2', note: 'Reversed the relation: green as a fraction of pink (T)' }
    ],

    // ---- Problems 5-6: broken ruler ------------------------------------------

    // Bar from 47 1/2 to 55 1/2. (8)
    problem_05_length_brokenruler1: [
      { value: '8', stage: 'any', note: 'Correct; the difference is easy for adults at any stage (T)' },
      { value: ['55', '55 1/2'], stage: '1', note: 'Read the end of the bar as its length (T)' },
      { value: '9', stage: '1', note: 'Counted labeled numbers or marks (47 to 55) instead of the spaces between them (T)' },
      { value: ['7 1/2', '8 1/2'], stage: 'any', note: 'Off by half an inch: misread an end of the bar' }
    ],

    // Bar from 47 3/4 to 58 1/2. (10 3/4)
    problem_06_length_brokenruler2: [
      { value: '10 3/4', stage: 'any', note: 'Correct (T)' },
      { value: ['11 1/4', '10 1/4', '11 3/4'], stage: '1 or 2',
        note: 'Handled whole inches and fractions of an inch separately, e.g. 58 − 47 = 11, then ¾ − ½ = ¼ (T)' },
      { value: '43', stage: '1 or 2',
        note: 'Counted 43 quarter-inches without converting back to inches (T; cf. Zwanch et al. 2024, Stage 2 students counting small units)' },
      { value: ['58', '58 1/2'], stage: '1', note: 'Read the end of the bar as its length (T)' },
      { value: ['10 1/2', '11'], stage: 'any', note: 'Off by a quarter inch: misread an end of the bar' }
    ],

    // ---- Problem 7: fraction of a removed part --------------------------------

    // 4 white pieces remain, 3 gray pieces removed. Gray as a fraction of the whole? (3/7)
    problem_07_POW_threesevenths: [
      { value: '3/7', stage: '2 or 3',
        note: 'Correct: kept the removed part related to the whole bar (disembedding). Expect most undergraduates to get this (T; Lovin et al. 2018)' },
      { value: '3/4', stage: '1', note: 'Named the gray part against the remaining white bar: parts within wholes (T)' },
      { value: '4/7', stage: 'any', note: 'Named the white part instead of the gray' },
      { value: ['1/7', '1/3'], stage: 'any', note: 'Named one piece' }
    ],

    // ---- Problem 8: pattern tiles --------------------------------------------

    // Pattern 2 = 4 copies of Pattern 1 (36 triangles). Triangles in Pattern 2? (144)
    problem_08_area_patterntiles: [
      { value: '144', factors: ['4', '36'], stage: '2 or 3',
        note: 'Correct, as 4 × 36: Pattern 2 as 4 units of 36. A quick time supports Stage 3 (T; cf. Jake, Antonides et al. 2026)' },
      { value: '144', stage: '2 or 3',
        note: 'Correct. Jake (advanced Stage 2) reached 144 by counting triangles by 1s, 3s and 6s on the figure (E: Antonides et al. 2026)' },
      { value: '72', stage: '1 or 2',
        note: 'Pattern 2 as double Pattern 1, comparing heights rather than areas; Jake did this at first (E: Antonides et al. 2026)' },
      { value: '108', stage: '1 or 2', note: 'Used 3 copies of Pattern 1 (cf. Jake deciding between dividing by 3 and 4) (E: Antonides et al. 2026)' },
      { value: '36', stage: '1 or 2', note: 'Found Pattern 1 but not Pattern 2 (T)' },
      { value: ['10', '40'], stage: '1', note: 'Counted tiles instead of triangles (10 tiles in Pattern 1) (T)' },
      { value: '12', stage: '1', note: 'Counted only the green triangles (T)' }
    ],

    // ---- Problems 9-10: garden rows ------------------------------------------

    // 6 rows of 7 apple trees. How many? (42)
    problem_09_area_garden1: [
      { value: '42', stage: 'any', note: 'Correct; a multiplication fact. Useful as a timing baseline' }
    ],

    // 42 apple trees, 98 trees in all, 7 per row. Rows of pear trees? (8)
    problem_10_area_garden2: [
      { value: '8', stage: '2 or 3',
        note: 'Correct. Keeping the apple trees as 6 rows (e.g. 14 − 6) and answering quickly is the Stage 3 pattern; Stage 2 students often recompute (E: Norton et al. 2015; Boyce & Norton 2016)' },
      { value: '56', stage: '1',
        note: 'Answered in trees, not rows (98 − 42). Emily (Stage 1) could not say whether her difference meant tiles or rows (E: Hackenberg & Sevinc 2024)' },
      { value: '56/6', stage: '1',
        note: 'Divided the pear trees by the number of apple rows instead of by 7, as Emily (Stage 1) proposed (E: Hackenberg & Sevinc 2024)' },
      { value: '14', stage: '1 or 2', note: 'All rows (98 ÷ 7), not just the pear rows (T)' },
      { value: '6', stage: '1 or 2', note: 'Apple rows instead of pear rows (T)' }
    ],

    // ---- Problems 11-12: square yard and square feet --------------------------

    // 1 yd × 1 yd covered by 1 ft × 1 ft. (9)
    problem_11_area_yardsfeet1: [
      { value: '9', stage: 'any', note: 'Correct; "1 square yard = 9 square feet" is a memorized fact, and 3 × 3 is small (T)' },
      { value: '3', stage: '1 or 2',
        note: 'Compared side lengths, not areas. All Stage 2 undergraduates in Zwanch et al. (2024) did this on a square-cm/square-inch task (E)' },
      { value: '6', stage: '1', note: 'Added 3 + 3 (T)' }
    ],

    // Same question with a to-scale figure. (9)
    problem_12_area_yardsfeet2: [
      { value: '9', earlier: { item: 'problem_11_area_yardsfeet1', value: '3' }, stage: '2',
        note: 'Changed from 3 (side lengths) to 9 after seeing the figure: relies on figurative material (E: Zwanch et al. 2024; Antonides et al. 2026)' },
      { value: '9', earlier: { item: 'problem_11_area_yardsfeet1', correct: false }, stage: '1 or 2',
        note: 'Correct only after seeing the figure (T)' },
      { value: '9', stage: 'any', note: 'Correct, as in Problem 11' },
      { value: '3', stage: '1 or 2', note: 'Still compared side lengths, not areas, even with the figure (E: Zwanch et al. 2024)' },
      { value: '6', stage: '1', note: 'Added 3 + 3 (T)' }
    ],

    // ---- Problem 13: nested bird patterns --------------------------------------

    // 6 birds; each pattern is 7 copies of the one before. Birds in Pattern 4? (2058)
    problem_13_area_tessellation: [
      { contains: '^', stage: 'any',
        note: 'Wrote an exponent (e.g. 6 × 7^3). The instrument cannot evaluate exponents yet, so check the value by hand' },
      { value: '2058', factors: [['294', '7'], ['42', '7', '7'], ['42', '49'], ['6', '343'], ['6', '49', '7']], stage: '2 or 3',
        note: 'Correct, built from an earlier pattern (e.g. 294 × 7): each pattern as 7 of the one before (E: Antonides & Battista 2023, Stage 3 PST)' },
      { value: '2058', stage: 'any',
        note: 'Correct. Consistent with Stage 3, but Stage 1 students sometimes multiply every given number without reasons; see the explanation (E: Antonides & Battista 2023; Hackenberg & Sevinc 2024)' },
      { value: '294', stage: '2', note: 'One level short: Pattern 3 (6 × 7 × 7) (T; cf. Antonides & Battista 2023)' },
      { value: '14406', stage: '2', note: 'One level too many (6 × 7 × 7 × 7 × 7) (T)' },
      { value: '126', stage: '2', note: 'Treated Patterns 2–4 as 3 more copies (6 × 7 × 3) (T)' },
      { value: '168', stage: '2', note: 'Multiplied by the pattern number (6 × 7 × 4) (T)' },
      { value: '42', stage: '1 or 2', note: 'Pattern 2 only (T)' },
      { value: '27', stage: '1', note: 'Added the given numbers, 6 + 7 + 7 + 7 (T)' }
    ],

    // ---- Problems 14-15: pies ---------------------------------------------------
    // Caution: in both, the correct option is the only one on the correct side
    // of the friend's piece (smaller in 14, larger in 15), so it can be chosen
    // by size alone.

    // Friend's piece is 7/5 of yours. (A: 5 small slices = 5/7 of the friend's piece)
    problem_14_GMSF_pie: [
      { option: 'Option A', stage: '3',
        note: 'Friend’s piece is 7 of my fifths, so mine is 5 of its 7 parts: reversing an improper fraction (E: Hackenberg 2010). Weak: A is the only smaller option' },
      { option: 'Option D', stage: '2',
        note: '7/5 of the friend’s piece: took the friend’s piece as the whole (E: Hackenberg 2007, Stage 2 students did not make improper fractions of the original whole)' },
      { option: 'Option C', stage: '1 or 2', note: 'The friend’s piece cut into 5 ("fifths" of the wrong whole) (T)' },
      { option: 'Option B', stage: '1 or 2', note: '7 small slices: the same size as the friend’s piece (matched the 7) (T)' }
    ],

    // Friend's piece is 3/5 of yours. (D: 5 thirds of the friend's piece)
    problem_15_MSPF_pie: [
      { option: 'Option D', stage: '2 or 3',
        note: 'Split the friend’s piece into 3 to get my fifth, then took 5: reversible partitive fraction scheme, which needs splitting (E: Hackenberg 2010; Lovin et al. 2018). Weak: D is the only larger option' },
      { option: 'Option A', stage: '1 or 2', note: '3/5 of the friend’s piece: relationship read backwards (wrong whole) (T)' },
      { option: 'Option B', stage: '1', note: 'The friend’s piece cut into 5 (T)' },
      { option: 'Option C', stage: '1', note: 'The friend’s piece cut into 3 (T)' }
    ],

    // ---- Problems 16-17: gray bars --------------------------------------------
    // With bar A as 1 unit: green = 5; A-J = 1, 2, 3, 4, 6, 7, 8, 9, 12, 15.

    // Green is 5/3 as long as which gray bar? (C)
    problem_16_IFS_greengraybars1: [
      { option: 'Option C', stage: '2 or 3',
        note: 'Green is 5 thirds of the bar, so split green into 5 and take 3 (Stage 3); Stage 2 students may find C by trying bars (T)' },
      { option: ['Option G', 'Option H'], stage: '2',
        note: 'Made 5/3 of the green bar (about 8 units) instead of reversing the relation (T; cf. Norton et al. 2015, multiplying instead of dividing)' },
      { option: 'Option J', stage: '1', note: 'Multiplied 5 × 3 (15 units) (T)' },
      { option: ['Option A', 'Option B', 'Option D'], stage: 'any', note: 'Shorter than the green bar, but not 3/5 of it' },
      { option: ['Option E', 'Option F', 'Option I'], stage: 'any', note: 'Longer than the green bar: relation read backwards or estimated' }
    ],

    // Same question with the gray bars divided into units. (C)
    problem_17_IFS_greengraybars2: [
      { option: 'Option C', earlier: { item: 'problem_16_IFS_greengraybars1', correct: true }, stage: '2 or 3',
        note: 'Same correct answer as Problem 16' },
      { option: 'Option C', earlier: { item: 'problem_16_IFS_greengraybars1', correct: false }, stage: '1 or 2',
        note: 'Correct only after the bars were divided: relied on the figure (Stage 2) or matched the 3 parts to the 3 in 5/3 (Stage 1) (T)' },
      { option: 'Option C', stage: '2 or 3', note: 'Correct (T)' },
      { option: ['Option G', 'Option H'], stage: '2', note: 'Made 5/3 of the green bar instead of reversing the relation (T)' },
      { option: 'Option J', stage: '1', note: 'Multiplied 5 × 3 (15 units) (T)' },
      { option: ['Option A', 'Option B', 'Option D'], stage: 'any', note: 'Shorter than the green bar, but not 3/5 of it' },
      { option: ['Option E', 'Option F', 'Option I'], stage: 'any', note: 'Longer than the green bar: relation read backwards or estimated' }
    ],

    // ---- Problem 18: cardboard and paper --------------------------------------

    // 3 paper lengths by 7 paper widths. Pieces of paper? (21)
    problem_18_area_cardboard: [
      { value: '21', stage: 'any', note: 'Correct; the sides are given as multiples of the paper, so it reduces to 3 × 7 (T)' },
      { value: '10', stage: '1', note: 'Added 3 + 7 (T)' },
      { value: '420', stage: '1 or 2', note: 'Area in square inches (12 × 35), not the number of papers (T)' }
    ],

    // ---- Problems 19 and 22: volume -------------------------------------------

    // Package B doubles each dimension of Package A (60 boxes). (480)
    problem_19_volume_yellow: [
      { value: '480', factors: [['60', '8'], ['60', '2', '2', '2'], ['8', '60']], stage: '3',
        note: 'Package B as 8 copies of Package A (2 × 2 × 2 of the 60-box unit). Check the explanation for a memorized "volume × 2³" rule (T)' },
      { value: '480', factors: [['10', '8', '6'], ['10', '6', '8']], stage: '2',
        note: 'Recomputed from the doubled dimensions shown in the figure (10 × 8 × 6) (T)' },
      { value: '480', stage: '2 or 3', note: 'Correct (T)' },
      { value: '120', stage: '1 or 2', note: 'Doubled once: scaled Package A as a whole (T)' },
      { value: '240', stage: '1 or 2', note: 'Scaled by 4, as for area (T)' },
      { value: '360', stage: '1 or 2', note: 'Doubled for each dimension and added (60 × 6) (T)' }
    ],

    // Packages of 2 cubes: 3 along the height, 3 along the width, 5 along the length. (90)
    problem_22_volume_colin: [
      { value: '90', stage: '2 or 3',
        note: 'Accounted for how the packages are turned. Jake (advanced Stage 2) reached 90 using the pictures (E: Antonides et al. 2026)' },
      { value: '45', stage: 'any',
        note: 'Multiplied the package counts (3 × 3 × 5) without accounting for orientation, as expected from many students (E: Battista 2004; Jake’s first answer, Antonides et al. 2026)' },
      { value: '180', stage: 'any', note: 'Counted cubes, not packages (T)' },
      { value: '11', stage: '1', note: 'Added 3 + 3 + 5 (T)' }
    ],

    // ---- Problems 20-21: speed -------------------------------------------------

    // 15 miles in 9 minutes. Miles in 12 minutes? (20)
    problem_20_proportion1: [
      { value: '20', stage: '2 or 3',
        note: 'Correct, e.g. 5 miles in 3 minutes, 4 times. Cross-multiplying also gets here (E: Hackenberg et al. 2023)' },
      { value: '18', stage: '1 or 2',
        note: 'Additive: added 3 miles for 3 more minutes. Lisa (Stage 2) started additively too (E: Hackenberg et al. 2023)' },
      { value: '7 1/5', stage: '1 or 2', note: 'Inverted the rate (12 × 9/15) (T)' }
    ],

    // 5 miles in 3 minutes as a fraction of the 15-mile, 9-minute trip. (1/3)
    problem_21_proportion2: [
      { value: '1/3', stage: '2 or 3',
        note: 'Correct. Computing 5/15 is enough, so this is weak evidence of seeing a journey as a fraction of another (E: Hackenberg et al. 2023, Joanna, Stage 3)' },
      { value: '3', stage: '2',
        note: 'How many short trips fit in the long one, not the fraction. Stage 2 students divided journeys but did not see the result as a fraction of the original (E: Hackenberg et al. 2023)' },
      { value: ['5/3', '3/5'], stage: '1 or 2', note: 'Gave the speed (or its inverse) instead of a fraction of the trip (T)' },
      { value: '1', stage: '1 or 2', note: 'Same speed, so treated as the same trip (T)' }
    ],

    // ---- Problems 23-26: angles (all predictions are T: no studies tie angle
    // measure to stages for undergraduates) -------------------------------------

    // Angle B (30°) as a fraction of Angle A (120°). (1/4)
    problem_23_angle_properfrac: [
      { value: '1/4', stage: 'any', note: 'Correct; ¼ can be found by halving twice, or from degree estimates (T; cf. Ulrich & Wilkins 2017 on halving)' },
      { value: '4', stage: '1 or 2', note: 'Gave A as a multiple of B instead of B as a fraction of A (T)' },
      { value: ['1/3', '1/5'], stage: 'any', note: 'Close estimate (T)' },
      { value: '1/12', stage: '1', note: 'Named B against a full turn instead of Angle A (T)' }
    ],

    // Same, with each angle in a circle of 12 equal parts. (1/4)
    problem_24_angle_properfrac_followup: [
      { value: '1/4', earlier: { item: 'problem_23_angle_properfrac', correct: true }, stage: 'any', note: 'Same correct answer as Problem 23' },
      { value: '1/4', earlier: { item: 'problem_23_angle_properfrac', correct: false }, stage: '1',
        note: 'Correct only once the circle was partitioned: part-whole with a partitioned whole, not iterating a unit fraction (T; cf. Lovin et al. 2018)' },
      { value: '1/4', stage: 'any', note: 'Correct (T)' },
      { value: '1/12', stage: '1', note: 'Named B against the whole circle (1 of 12 parts) instead of Angle A (T)' },
      { value: '1/3', stage: '1', note: 'Named A against the whole circle (4 of 12 parts) (T)' },
      { value: '4', stage: '1 or 2', note: 'Gave A as a multiple of B instead of B as a fraction of A (T)' }
    ],

    // Angle B (240°) as a fraction of Angle A (90°). (8/3)
    problem_25_angle_improperfrac: [
      { contains: 'R', stage: '2', note: 'Whole number with a remainder (T; cf. Norton et al. 2015 Task 7)' },
      { value: '8/3', stage: '3', note: 'Improper fraction of A: B is 8 thirds of A (iterative fraction scheme) (T)' },
      { value: '3/8', stage: '2', note: 'Made the smaller angle a fraction of the larger: reversed to a proper fraction (T)' },
      { value: '9/4', stage: '2', note: 'Named the leftover against B’s parts, e.g. 2 2/8 (T; cf. Norton et al. 2015 Task 7)' },
      { value: '2', stage: '1 or 2', note: 'Whole number only (T)' },
      { value: '2/3', stage: '1', note: 'Named B against a full turn (240 of 360) instead of Angle A (T)' },
      { value: '1', stage: 'any', note: 'Read B as its smaller, non-reflex angle (T)' }
    ],

    // Same, with each angle in a circle of 12 equal parts. (8/3)
    problem_26_angle_improperfrac_followup: [
      { contains: 'R', stage: '2', note: 'Whole number with a remainder (T)' },
      { value: '8/3', earlier: { item: 'problem_25_angle_improperfrac', correct: true }, stage: '3', note: 'Same correct answer as Problem 25' },
      { value: '8/3', earlier: { item: 'problem_25_angle_improperfrac', correct: false }, stage: '2',
        note: 'Correct only after seeing the parts: counted 8 and 3 parts on the figure (T)' },
      { value: '8/3', stage: '2 or 3', note: 'Correct (T)' },
      { value: '3/8', stage: '2', note: 'Made the smaller angle a fraction of the larger (T)' },
      { value: '9/4', stage: '2', note: 'Named the leftover against B’s parts, e.g. 2 2/8 (T)' },
      { value: '2', stage: '1 or 2', note: 'Whole number only (T)' },
      { value: '2/3', stage: '1', note: 'Named B against the whole circle (8 of 12 parts) (T)' },
      { value: '1/4', stage: '1', note: 'Named A against the whole circle (3 of 12 parts) (T)' }
    ]
  }
};
