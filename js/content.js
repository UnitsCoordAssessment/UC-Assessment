/*
 * content.js — every word students see, and every problem, in order.
 *
 * Edit wording here; no other file needs to change. Text fields accept HTML
 * (<p>, <strong>, <u>, ...). After changing any problem, increase
 * instrumentVersion in config.js so saved data records which version a
 * student saw.
 *
 * Problem fields
 *   id        Stable identifier saved with every answer. Do not reuse an id
 *             for a different problem.
 *   title     Heading shown at the top of the page.
 *   lead      (optional) Text shown above the figure.
 *   figure    (optional) { src, alt, width }. width is the display width in
 *             pixels (the width the figure had in the Word document); it
 *             shrinks automatically on narrow screens.
 *   prompt    Text shown below the figure.
 *   response  'typed'  answer box (read by answer-parser.js) + explanation box
 *             'choice' one of `options` + explanation box
 *             'yesno'  Yes/No + "If you answered Yes, please explain." box,
 *                      which is required only when the student picks Yes
 *   hint      (typed only) show the "You may enter either a number..." line.
 *             Defaults to true.
 *   correct   Used only to fill the automatic is_correct column:
 *             typed  -> any expression with the right value ('12', '9/4')
 *             choice -> the option text ('Option B')
 *             null   -> not scored automatically
 */
(function (root) {
  'use strict';

  var BAR_FIGURE = {
    src: 'img/bars.png',
    alt: 'Three bars labeled Pink Bar, Green Bar, and Black Bar. Bars are not drawn to scale.',
    width: 650
  };

  root.STUDY_CONTENT = {
    continueLabel: 'Continue',

    // ---- Consent ------------------------------------------------------------
    consentHtml:
      '<p><strong>[IRB placeholder language and information about the study.]</strong></p>',
    consentQuestion: 'Do you agree to participate in this study?',
    declinedHtml:
      '<p>Thank you. You have chosen not to participate, and nothing has been recorded.</p>' +
      '<p>You may close this page.</p>',

    // ---- About you ----------------------------------------------------------
    demographicsIntroHtml:
      '<p><strong>Please enter the following information about yourself. This will be used ' +
      'for research purposes only. Information entered here will be kept confidential.</strong></p>',
    ageOptions: [
      '18-22 years',
      '23-25 years',
      '26-30 years',
      '31-35 years',
      '36-40 years',
      '41-45 years',
      '46-50 years',
      '51 years or older'
    ],
    academicProgramOptions: [
      'Certification Program (Non-Degree)',
      'Associate’s Degree (example: AA or AS)',
      'Bachelor’s Degree (example: BA or BS)',
      'Bachelor’s + Master’s Combined',
      'Master’s Degree (example: MBA, MA, MFA, or MS)',
      'Professional Doctorate (example: EdD, MD, or JD)',
      'Research Doctorate (example: PhD)',
      'Other, or no current academic program'
    ],
    programOfStudyOptions: [
      'Business --- examples: Accounting, Business Administration, Management',
      'Communications --- examples: Journalism, Media Studies, Public Relations',
      'Education --- Elementary or Early Childhood (or similar)',
      'Education --- Secondary with Mathematics Concentration',
      'Education --- Secondary with Non-Mathematics Concentration',
      'Engineering/Technology --- examples: Computer/Data Science, Engineering',
      'Health Science: --- examples: Nursing, Kinesiology, Public Health',
      'Humanities/Language --- examples: English, World Languages, Philosophy',
      'Mathematics --- Non-Education Concentration',
      'Natural Resources and Agriculture --- examples: Animal Science, Conservation',
      'Physical Sciences --- examples, Biology, Chemistry, Envr. Science, Physics',
      'Public/Legal Studies --- examples: Criminal Justice, EMS, Paralegal, Pre-Law',
      'Social Science --- examples: Anthropology, Economics, Political Science, Psychology, Sociology',
      'Technical/Vocational --- examples: Automotive, Carpentry, Culinary, HVAC/R, Welding',
      'Visual/Performing Arts --- examples: Art, Dance, Design, Drama, Film, Music'
    ],

    // ---- Transition pages ---------------------------------------------------
    practiceIntroHtml:
      '<p>There will be two practice problems. These problems are examples of the kinds of ' +
      'problems that you can expect to see on this assessment.</p>' +
      '<p>Click Continue to start the Practice Problems.</p>',
    assessmentIntroHtml:
      '<p><strong>The assessment will now begin. Click Continue to start the assessment.</strong></p>',

    // ---- Shared wording on problem pages -----------------------------------
    typedHint:
      'You may enter either a number (such as 12) or an expression that describes your ' +
      'thinking (such as 4*3, 4x3, or 24/2)',
    explainLabel: 'Briefly explain:',
    yesExplainLabel: 'If you answered Yes, please explain.',

    // ---- Final page (no Continue button) ------------------------------------
    completionHtml:
      '<p>The assessment is now complete.</p>' +
      '<p>If you have any questions or concerns, please send a message to either ' +
      'Dr. Joseph Antonides or Dr. Karen Zwanch, PIs of this project.</p>' +
      '<p>Dr. Antonides’ email address: ' +
      '<a href="mailto:Joseph.Antonides@colostate.edu">Joseph.Antonides@colostate.edu</a></p>' +
      '<p>Dr. Zwanch’s email address: ' +
      '<a href="mailto:Karen.Zwanch@okstate.edu">Karen.Zwanch@okstate.edu</a></p>',

    // ---- Practice problems --------------------------------------------------
    practice: [
      {
        id: 'practice_1',
        title: 'Practice Problem 1',
        figure: BAR_FIGURE,
        prompt:
          '<p>Pretend that the Black Bar fits into the Green Bar exactly 4 times.</p>' +
          '<p>Pretend that the Green Bar fits into the Pink Bar exactly 3 times.</p>' +
          '<p>Using this information: <strong>How many Black Bars would fit into the Pink Bar?</strong></p>',
        response: 'typed',
        correct: '12'
      },
      {
        id: 'practice_2',
        title: 'Practice Problem 2',
        figure: {
          src: 'img/tiles.png',
          alt: 'A green triangle, a pink trapezoid, and a yellow hexagon.',
          width: 432
        },
        prompt:
          '<p>You have tiles in the form of Triangles, Trapezoids, and Hexagons.</p>' +
          '<p>Three Triangles can be used to completely cover 1 Trapezoid.</p>' +
          '<p>Two Trapezoids can be used to completely cover 1 Hexagon.</p>' +
          '<p>Using this information: <strong>How many triangles would it take to cover 5 Hexagons?</strong></p>',
        response: 'typed',
        correct: '30'
      }
    ],

    // ---- Assessment problems ------------------------------------------------
    problems: [
      {
        id: 'problem_01_NortonBars_Mult1',
        title: 'Problem 1',
        figure: BAR_FIGURE,
        prompt:
          '<p>Pretend that the Black Bar fits into the Green Bar exactly 2 times.</p>' +
          '<p>Pretend that the Green Bar fits into the Pink Bar exactly 6 times.</p>' +
          '<p>Using this information: <strong>How many Black Bars would fit into the Pink Bar?</strong></p>',
        response: 'typed',
        correct: '12'
      },
      {
        id: 'problem_02_NortonBars_Mult2',
        title: 'Problem 2',
        figure: BAR_FIGURE,
        prompt:
          '<p>Pretend that the Green Bar fits into the Pink Bar exactly 2 times.</p>' +
          '<p>Pretend that the Black Bar fits into the Pink Bar exactly 8 times.</p>' +
          '<p>Using this information: <strong>How many times would the Black Bar fit into the Green Bar?</strong></p>',
        response: 'typed',
        correct: '4'
      },
      {
        id: 'problem_03_NortonBars_DivisionWhole',
        title: 'Problem 3',
        figure: BAR_FIGURE,
        prompt:
          '<p>Pretend that the Black Bar fits into the Pink Bar exactly 12 times.</p>' +
          '<p>Pretend that the Black Bar fits into the Green Bar exactly 3 times.</p>' +
          '<p>Using this information: <strong>How many times would the Green Bar fit into the Pink Bar?</strong></p>',
        response: 'typed',
        correct: '4'
      },
      {
        id: 'problem_04_NortonBars_DivisionImproperFrac',
        title: 'Problem 4',
        figure: BAR_FIGURE,
        prompt:
          '<p>Pretend that the Black Bar fits into the Pink Bar exactly 9 times.</p>' +
          '<p>Pretend that the Black Bar fits into the Green Bar exactly 4 times.</p>' +
          '<p>Using this information: <strong>How many times would the Green Bar fit into the Pink Bar?</strong></p>',
        response: 'typed',
        correct: '9/4'
      },
      {
        id: 'problem_05_length_brokenruler1',
        title: 'Problem 5',
        figure: {
          src: 'img/Broken Ruler 1.png',
          alt: 'Part of a measuring tape marked in inches, with half-inch and quarter-inch marks. ' +
            'The numbers 47 to 49 and 55 to 58 are visible; an ink spill covers the middle of the tape. ' +
            'A green bar lies below the tape.',
          width: 700
        },
        prompt:
          '<p>Part of a measuring tape (in inches, including 1/2 and 1/4 inches) is shown.</p>' +
          '<p>Unfortunately, ink spilled on part of the measuring tape.</p>' +
          '<p><strong>Use the information available to determine the length of the green bar.</strong></p>',
        response: 'typed',
        // Measured from the image: the bar runs from 47 1/2 to 55 1/2.
        correct: '8'
      },
      {
        id: 'problem_06_length_brokenruler2',
        title: 'Problem 6',
        figure: {
          src: 'img/Broken Ruler 2.png',
          alt: 'Part of a measuring tape marked in inches, with half-inch and quarter-inch marks. ' +
            'The numbers 47 to 49 and 55 to 58 are visible; an ink spill covers the middle of the tape. ' +
            'A green bar lies below the tape.',
          width: 700
        },
        prompt:
          '<p>Part of a measuring tape (in inches, including 1/2 and 1/4 inches) is shown.</p>' +
          '<p>Unfortunately, ink spilled on part of the measuring tape.</p>' +
          '<p><strong>Use the information available to determine the length of the green bar.</strong></p>',
        response: 'typed',
        // Measured from the image: the bar runs from 47 3/4 to 58 1/2.
        correct: '10 3/4'
      },
      {
        id: 'problem_07_POW_threesevenths',
        title: 'Problem 7',
        figure: {
          src: 'img/Three Sevenths.png',
          alt: 'Two bars drawn to scale. On the left, a white bar made of 4 equal pieces. On the right, ' +
            'a gray bar made of 3 pieces of the same size.',
          width: 650
        },
        prompt:
          '<p>A bar was broken into some number of equal-size pieces.</p>' +
          '<p>The pieces in gray (on the right) were removed.</p>' +
          '<p><strong>What fraction of the whole bar is represented by the pieces in gray?</strong></p>',
        response: 'typed',
        correct: '3/7'
      },
      {
        id: 'problem_08_area_patterntiles',
        title: 'Problem 8',
        figure: {
          src: 'img/pattern-1-and-2.png',
          alt: 'Left: Pattern 1, a large triangle made of hexagon, trapezoid, and triangle tiles. ' +
            'Right: Pattern 2, a larger triangle made of four copies of Pattern 1.',
          width: 624
        },
        prompt:
          '<p>You have tiles in the form of Triangles, Trapezoids, and Hexagons.</p>' +
          '<p>You know that 3 Triangles cover 1 Trapezoid, and that 2 Trapezoids cover 1 Hexagon.</p>' +
          '<p>These tiles are used to make a special pattern, called Pattern 1.</p>' +
          '<p>Pattern 2 is made using 4 copies of Pattern 1, as shown in the image.</p>' +
          '<p>Using this information: <strong>How many Triangles would it take to completely cover Pattern 2?</strong></p>',
        response: 'typed',
        // Pattern 1 = 4 hexagons + 3 trapezoids + 3 triangles = 24 + 9 + 3 = 36 triangles.
        correct: '144'
      },
      {
        id: 'problem_09_area_garden1',
        title: 'Problem 9',
        prompt:
          '<p>My community garden has many trees organized into rows. There are 7 trees in each row.</p>' +
          '<p>In one part of the garden, there are 6 rows of apple trees.</p>' +
          '<p>Using this information: <strong>How many apple trees are there altogether?</strong></p>',
        response: 'typed',
        correct: '42'
      },
      {
        id: 'problem_10_area_garden2',
        title: 'Problem 10',
        prompt:
          '<p>My community garden has many trees organized into rows. There are 7 trees in each row.</p>' +
          '<p>In one part of the garden, there are 42 apple trees.</p>' +
          '<p>In the next part of the garden, there are several pear trees.</p>' +
          '<p>There are 98 trees, including all apple trees and all pear trees.</p>' +
          '<p>Using this information: <strong>How many <u>rows</u> of pear trees are in the garden?</strong></p>',
        response: 'typed',
        // 98 - 42 = 56 pear trees = 8 rows of 7.
        correct: '8'
      },
      {
        id: 'problem_11_area_yardsfeet1',
        title: 'Problem 11',
        prompt:
          '<p>Recall that 1 yard = 3 feet.</p>' +
          '<p>Suppose one piece of Cardboard (call it Cardboard A) measures 1 yard long and 1 yard wide.</p>' +
          '<p>Suppose another piece of cardboard (call it Cardboard B) measures 1 foot long and 1 foot wide.</p>' +
          '<p>Using this information: <strong>How many copies of Cardboard B would it take to cover ' +
          'Cardboard A, with no gaps or overlaps?</strong></p>',
        response: 'typed',
        correct: '9'
      },
      {
        id: 'problem_12_area_yardsfeet2',
        title: 'Problem 12',
        lead:
          '<p><strong>This is the same as the previous problem, but now with an image.</strong></p>' +
          '<p>Recall that 1 yard = 3 feet.</p>' +
          '<p>You know that Cardboard A measures 1 yard long and 1 yard wide. You know that Cardboard B ' +
          'measures 1 foot long and 1 foot wide.</p>' +
          '<p>Here are images showing Cardboard A and Cardboard B:</p>',
        figure: {
          src: 'img/cardboard.png',
          alt: 'A large square labeled A and a small square labeled B. These shapes are drawn to scale.',
          width: 451
        },
        prompt:
          '<p>Using this information: <strong>How many copies of Cardboard B would it take to cover ' +
          'Cardboard A, with no gaps or overlaps?</strong></p>',
        response: 'typed',
        correct: 9
      },
      {
        id: 'problem_13_area_tessellation',
        title: 'Problem 13',
        figure: {
          src: 'img/bird-patterns.png',
          alt: 'Left: Pattern 1, made of 6 bird-shaped tiles. Right: Pattern 2, made of 7 copies of Pattern 1.',
          width: 624
        },
        prompt:
          '<p>Pattern 1, shown on the left, is formed by joining together 6 “Bird” tiles.</p>' +
          '<p>Pattern 2, shown on the right, is formed by joining together 7 copies of Pattern 1.</p>' +
          '<p>Pattern 3 is made by joining together 7 copies of Pattern 2.</p>' +
          '<p>Pattern 4 is made by joining together 7 copies of Pattern 3.</p>' +
          '<p>Using this information: <strong>How many Bird tiles are contained in Pattern 4?</strong></p>',
        response: 'typed',
        correct: '2058'
      },
      {
        id: 'problem_14_GMSF_pie',
        title: 'Problem 14',
        figure: {
          src: 'img/GMSF Pie Task.png',
          alt: 'On the left, a yellow piece of pizza labeled Friends Piece. On the right, several pink ' +
            'pieces of pizza cut into slices, labeled as different options.',
          width: 700
        },
        prompt:
          '<p>You and your friends are taking left-over pizzas from a party.</p>' +
          '<p>Your friend took the pizza shown on the left (in yellow), which is 7/5 the size of your pizza.</p>' +
          '<p><strong>Which option on the right (in pink) shows your pizza?</strong></p>',
        response: 'choice',
        options: ['Option A', 'Option B', 'Option C', 'Option D', 'Option E', 'Option F'],
        correct: 'Option B'
      },
      {
        id: 'problem_15_MSPF_pie',
        title: 'Problem 15',
        figure: {
          src: 'img/MSPF Pie Task.png',
          alt: 'On the left, a yellow piece of pie labeled Friend\u2019s Piece. On the right, four pink ' +
            'pieces of pie cut into slices, labeled Option A, Option B, Option C, and Option D.',
          width: 700
        },
        prompt:
          '<p>You and your friends are taking left-over pizzas from a party.</p>' +
          '<p>Your friend took the pizza shown on the left (in yellow), which is 3/5 the size of your pizza.</p>' +
          '<p><strong>Which option on the right (in pink) shows your pizza?</strong></p>',
        response: 'choice',
        options: ['Option A', 'Option B', 'Option C', 'Option D', 'Option E', 'Option F'],
        correct: 'Option C'
      },
      {
        id: 'problem_16_GMSF_greengraybars1',
        title: 'Problem 16',
        figure: {
          src: 'img/gray-bars.png',
          alt: 'A green bar at the top, and ten gray bars of different lengths labeled A through J.',
          width: 624
        },
        prompt:
          '<p>The green bar shown is 5/3 as long as one of the gray bars.<br>' +
          '<strong>Which gray bar?</strong></p>',
        response: 'choice',
        options: ['Option A', 'Option B', 'Option C', 'Option D', 'Option E',
          'Option F', 'Option G', 'Option H', 'Option I', 'Option J'],
        // Measured from the image (v1.0.2): with bar A as 1 unit, green = 5 and
        // A-J = 1, 2, 3, 4, 6, 7, 8, 9, 12, 15. Only C (3 units) gives 5/3.
        correct: 'Option C'
      },
      {
        id: 'problem_17_IFS_greengraybars2',
        title: 'Problem 17',
        lead:
          '<p><strong>This is the same as the previous problem, but now with an image.</strong></p>',
        figure: {
          src: 'img/gray-bars-partitioned.png',
          alt: 'The same green bar and gray bars A through J, with each gray bar divided into equal parts.',
          width: 624
        },
        prompt:
          '<p>The green bar shown is 5/3 as long as one of the gray bars.<br>' +
          '<strong>Which gray bar?</strong></p>',
        response: 'choice',
        options: ['Option A', 'Option B', 'Option C', 'Option D', 'Option E',
          'Option F', 'Option G', 'Option H', 'Option I', 'Option J'],
        correct: 'Option C'
      },
      {
        id: 'problem_18_area_cardboard',
        title: 'Problem 18',
        prompt:
          '<p>You have a rectangular piece of cardboard, and you have pieces of paper that measure ' +
          '4 inches long and 5 inches wide.</p>' +
          '<p>You know that the cardboard’s length is 3 times as long as the 4-inch side of the piece of paper.</p>' +
          '<p>You know that the cardboard’s width is 7 times as long as the 5-inch side of the piece of paper.</p>' +
          '<p>Using this information: <strong>How many of the pieces of paper would be needed to cover ' +
          'the cardboard, with no gaps or overlaps?</strong></p>',
        response: 'typed',
        correct: '21'
      },
      {
        id: 'problem_19_volume_yellow',
        title: 'Problem 19',
        figure: {
          src: 'img/package-a.png',
          alt: 'Package A, a rectangular box made of small yellow boxes.',
          width: 288
        },
        prompt:
          '<p>Package A, shown above, can be filled with 60 Yellow Boxes.</p>' +
          '<p>Package B has two times the length, two times the width, and two times the height of Package A.</p>' +
          '<p>Using this information: <strong>How many Yellow Boxes would it take to fill Package B?</strong></p>',
        response: 'typed',
        correct: '480'
      },
      {
        id: 'problem_20_proportion1',
        title: 'Problem 20',
        prompt:
          '<p>A car travels at a constant speed. It goes 15 miles in 9 minutes.</p>' +
          '<p>Using this information: <strong>How many miles does the car go in 12 minutes?</strong></p>',
        response: 'typed',
        correct: '20'
      },
      {
        id: 'problem_21_proportion2',
        title: 'Problem 21',
        prompt:
          '<p>A car travels at a constant speed. It goes 15 miles in 9 minutes.</p>' +
          '<p>Using this information: <strong>Going 5 miles in 3 minutes (at the same speed) is what ' +
          'fraction of the 15-mile, 9-minute trip?</strong></p>',
        response: 'typed',
        hint: false,
        correct: '1/3'
      },
      {
        id: 'problem_22_volume_colin',
        title: 'Problem 22',
        figure: {
          src: 'img/Colin Packages.png',
          alt: 'Top left: two ways a package of two identical cubes can be placed. Top right: an empty ' +
            'rectangular box. Bottom: the same box with packages placed along its height, along its ' +
            'width, and along its length.',
          width: 624
        },
        prompt:
          '<p>Colin has some packages that each contain two identical cubes. He wants to know how many ' +
          'packages it takes to completely fill the rectangular box.</p>' +
          '<p>Colin knows that he can fit 3 packages along the height, 3 packages along the width, and ' +
          '5 packages along the length, as shown in the image.</p>' +
          '<p>Using this information: <strong>How many packages would it take to completely fill the box?</strong></p>',
        response: 'typed',
        hint: false,
        // One value only. Any expression equal to it (such as 180/2) is also scored correct.
        correct: '90'
      },
      {
        id: 'problem_23_angle_properfrac',
        title: 'Problem 23',
        figure: {
          src: 'img/Angle A Angle B Unpartitioned.png',
          alt: 'A large angle, called Angle A, and a smaller angle, called Angle B.',
          width: 550
        },
        prompt:
          '<p><strong>What fraction of Angle A is Angle B?</strong></p>',
        response: 'typed',
        hint: false,
        correct: '1/4'
      },
      {
        id: 'problem_24_angle_properfrac_followup',
        title: 'Problem 24',
        lead:
          '<p><strong>This is the same as the previous problem, but now with a modified image.</strong></p>',
        figure: {
          src: 'img/Angle A Angle B Partitioned.png',
          alt: 'The same two angles, Angle A and Angle B, each with a circle around its vertex divided ' +
            'into 12 equal parts.',
          width: 550
        },
        prompt:
          '<p><strong>What fraction of Angle A is Angle B?</strong></p>',
        response: 'typed',
        correct: '1/4'
      },
      {
        id: 'problem_25_angle_improperfrac',
        title: 'Problem 25',
        figure: {
          src: 'img/Angle A Angle B Improper Unpartitioned.png',
          alt: 'Two angles, called Angle A and Angle B, each marked with a curved arrow. Angle B is ' +
            'larger than Angle A.',
          width: 550
        },
        prompt:
          '<p><strong>What fraction of Angle A is Angle B?</strong></p>',
        response: 'typed',
        hint: false,
        correct: '8/3'
      },
      {
        id: 'problem_26_angle_improperfrac_followup',
        title: 'Problem 26',
        lead:
          '<p><strong>This is the same as the previous problem, but now with a modified image.</strong></p>',
        figure: {
          src: 'img/Angle A Angle B Improper Partitioned.png',
          alt: 'The same two angles, Angle A and Angle B, each with a circle around its vertex divided ' +
            'into 12 equal parts.',
          width: 550
        },
        prompt:
          '<p><strong>What fraction of Angle A is Angle B?</strong></p>',
        response: 'typed',
        correct: '8/3'
      }
    ]
  };
})(window);
