/*
 * pages.js — builds the jsPsych pages.
 *
 * Every page is a form with a single Continue button in the lower-right
 * corner. There is no Back button.
 *
 * Each problem page saves one row with:
 *   kind              'practice' or 'problem'
 *   item_id, title, item_type ('typed' | 'choice' | 'yesno'), instrument_version
 *   raw_answer        the typed answer, the chosen option, or Yes/No
 *   explanation       the text in the explanation box
 *   is_correct        true/false; null when not scored automatically or when a
 *                     typed answer could not be read (left for a person)
 *   parsed            (typed) answer-parser.js result: value, structure, ...
 *   rt                ms from the page appearing to Continue (jsPsych)
 *   timing            first_input_ms, per-field first_ms / last_ms / n_events,
 *                     figure_load_ms
 *   answer_history    successive versions of the typed answer, or each option
 *                     clicked, with times: [{t, v}, ...]
 *   refused_input     (typed) characters the answer box refused because they are
 *                     not in answerCharacters (config.js), with times: [{t, c}, ...]
 *   code              the answer's interpretation from codes.js (answer-coder.js):
 *                     {stage, note, rule, codes_version}; null if the problem has
 *                     no rules
 *   pointer_events   cursor/touch samples (see pointer-tracker.js)
 *   left_page_count, left_page_ms   times the student switched away from the page
 */
(function (root) {
  'use strict';

  var cfg = root.STUDY_CONFIG;
  var text = root.STUDY_CONTENT;

  // This student's answers so far, for codebook rules that look at an
  // earlier problem (e.g. a follow-up problem). There is no Back button, so
  // earlier problems are always finished.
  var answersSoFar = {};

  function codeAnswer(itemId, answer) {
    if (!root.AnswerCoder || !root.STUDY_CODES) return null;
    try {
      return root.AnswerCoder.code(root.STUDY_CODES, itemId, answer, function (id) {
        return answersSoFar[id] || null;
      });
    } catch (e) {
      // A mistake in codes.js must never stop the assessment.
      return { stage: null, note: 'Coding error: ' + e.message, rule: null,
        codes_version: root.STUDY_CODES.version || null };
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Enter in a one-line box moves to the next field instead of submitting the page.
  function enterMovesToNextField(form) {
    form.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
      if (e.target.type === 'submit') return;
      e.preventDefault();
      var fields = Array.prototype.filter.call(form.elements, function (el) {
        return !el.disabled && el.type !== 'hidden' && el.type !== 'submit' && el.offsetParent !== null;
      });
      var next = fields[fields.indexOf(e.target) + 1];
      if (next) next.focus();
    });
  }

  /**
   * A page with a Continue button. All pages use this, so every page looks
   * and behaves the same way.
   */
  function page(options) {
    var userOnLoad = options.on_load;
    return {
      type: root.jsPsychSurveyHtmlForm,
      html: '<div class="page">' + options.html + '</div>',
      button_label: text.continueLabel,
      autofocus: '',
      data: options.data || {},
      on_load: function () {
        var form = document.getElementById('jspsych-survey-html-form');
        if (form) enterMovesToNextField(form);
        window.scrollTo(0, 0);
        if (userOnLoad) userOnLoad.apply(this, arguments);
      },
      on_finish: options.on_finish
    };
  }

  // ---------------------------------------------------------------------------
  // Problem pages
  // ---------------------------------------------------------------------------

  function figureHtml(figure) {
    if (!figure) return '';
    return '<figure class="problem-figure">' +
      '<img src="' + escapeHtml(figure.src) + '" alt="' + escapeHtml(figure.alt || '') + '" ' +
      'style="width:' + Number(figure.width) + 'px" draggable="false" ' +
      'data-track="figure" data-track-relative>' +
      '</figure>';
  }

  function optionLetter(option, i) {
    var m = /([A-Z])$/.exec(option);
    return m ? m[1] : String(i + 1);
  }

  function responseHtml(item) {
    var req = cfg.requireAnswers ? ' required' : '';
    var html = '<div class="response">';
    if (item.response === 'typed') {
      html +=
        '<input name="answer" type="text" class="answer-input" autocomplete="off" ' +
        'autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="200" ' +
        'aria-label="Your answer" data-track="answer-box"' + req + '>' +
        // Filled in by answer-filter.js when a character is refused.
        '<p class="answer-note" role="status" aria-live="polite"></p>';
      if (item.hint !== false) html += '<p class="hint">' + escapeHtml(text.typedHint) + '</p>';
    } else if (item.response === 'choice') {
      var many = item.options.length > 6 ? ' many' : '';
      html += '<fieldset class="choices' + many + '" data-track="choices"><legend class="visually-hidden">Choose one option</legend>';
      item.options.forEach(function (option, i) {
        html += '<label class="choice" data-track="option-' + optionLetter(option, i) + '">' +
          '<input type="radio" name="choice" value="' + escapeHtml(option) + '"' + req + '>' +
          '<span>' + escapeHtml(option) + '</span></label>';
      });
      html += '</fieldset>';
    } else if (item.response === 'yesno') {
      html += '<fieldset class="choices yesno" data-track="yesno"><legend class="visually-hidden">Yes or No</legend>' +
        ['Yes', 'No'].map(function (v) {
          return '<label class="choice" data-track="option-' + v + '">' +
            '<input type="radio" name="yesno" value="' + v + '"' + req + '><span>' + v + '</span></label>';
        }).join('') +
        '</fieldset>';
    } else {
      throw new Error('Unknown response type "' + item.response + '" for ' + item.id);
    }

    var label = item.response === 'yesno' ? text.yesExplainLabel : text.explainLabel;
    var explainRequired = item.response === 'yesno' ? '' : req; // Yes/No: set when Yes is chosen
    html +=
      '<label class="explain-label" for="explanation-' + item.id + '">' + escapeHtml(label) + '</label>' +
      '<textarea id="explanation-' + item.id + '" name="explanation" class="explanation-input" rows="5" ' +
      'maxlength="10000" data-track="explanation-box"' + explainRequired + '></textarea>';
    return html + '</div>';
  }

  // Records when each field is first and last changed, and how the answer evolved.
  function ResponseRecorder(item) {
    this.item = item;
    this.t0 = performance.now();
    this.first = null;
    this.fields = {};
    this.history = [];
    this.historyTruncated = false;
    this.refused = [];
    this.figureLoadMs = null;
  }

  // Characters the answer box refused (see answer-filter.js), with times.
  ResponseRecorder.prototype.noteRefused = function (chars) {
    if (this.refused.length >= 200) return;
    this.refused.push({ t: Math.round(performance.now() - this.t0), c: chars });
  };

  ResponseRecorder.prototype.attach = function (form) {
    var self = this;
    function onEvent(e) {
      var name = e.target && e.target.name;
      if (!name) return;
      var t = Math.round(performance.now() - self.t0);
      if (self.first === null) self.first = t;
      var f = self.fields[name] || (self.fields[name] = { first_ms: t, last_ms: t, n_events: 0 });
      f.last_ms = t;
      f.n_events += 1;
      var tracked = (name === 'answer' && e.type === 'input') ||
        ((name === 'choice' || name === 'yesno') && e.type === 'change');
      if (!tracked) return;
      var v = e.target.value;
      var last = self.history[self.history.length - 1];
      if (last && last.v === v) return;
      if (self.history.length >= cfg.answerHistoryMax) { self.historyTruncated = true; return; }
      self.history.push({ t: t, v: v });
    }
    form.addEventListener('input', onEvent);
    form.addEventListener('change', onEvent);

    var img = form.querySelector('.problem-figure img');
    if (img) {
      var done = function () { self.figureLoadMs = Math.round(performance.now() - self.t0); };
      if (img.complete) done(); else img.addEventListener('load', done);
    }
  };

  ResponseRecorder.prototype.result = function () {
    return {
      timing: { first_input_ms: this.first, fields: this.fields, figure_load_ms: this.figureLoadMs },
      answer_history: this.history,
      answer_history_truncated: this.historyTruncated,
      refused_input: this.refused
    };
  };

  // The note shown under the answer box when a character is refused.
  // content.js can override the wording with answerRefusedNote; "{symbols}"
  // in it is replaced by the allowed symbols.
  function refusedNoteText(allowed) {
    var symbols = root.AnswerFilter.symbolsText(allowed);
    var template = text.answerRefusedNote ||
      'Your answer can include only numbers and these symbols: {symbols}';
    return template.replace('{symbols}', symbols);
  }

  function limitAnswerBox(form, item, recorder) {
    var allowed = item.answerCharacters !== undefined ? item.answerCharacters : cfg.answerCharacters;
    var box = form.querySelector('input[name="answer"]');
    var note = form.querySelector('.answer-note');
    if (!box || !allowed) return;
    var timer = null;
    root.AnswerFilter.attach(box, allowed, function (chars) {
      recorder.noteRefused(chars);
      if (!note) return;
      note.textContent = refusedNoteText(allowed);
      clearTimeout(timer);
      timer = setTimeout(function () { note.textContent = ''; }, 6000);
    });
  }

  function problemPage(item, isPractice) {
    var tracker = new root.PointerTracker({
      enabled: cfg.pointerTracking,
      sampleMs: cfg.pointerSampleMs,
      maxEvents: cfg.pointerMaxEventsPerTrial
    });
    var recorder;

    var html =
      '<h2 class="problem-title">' + escapeHtml(item.title) + '</h2>' +
      (item.lead || '') +
      figureHtml(item.figure) +
      (item.prompt || '') +
      responseHtml(item);

    return page({
      html: html,
      data: {
        kind: isPractice ? 'practice' : 'problem',
        item_id: item.id,
        title: item.title,
        item_type: item.response,
        instrument_version: cfg.instrumentVersion
      },
      on_load: function () {
        var form = document.getElementById('jspsych-survey-html-form');
        recorder = new ResponseRecorder(item);
        recorder.attach(form);
        if (item.response === 'typed') limitAnswerBox(form, item, recorder);
        tracker.start(document.querySelector('.jspsych-content') || document.body);
        if (item.response === 'yesno' && cfg.requireAnswers) {
          var box = form.querySelector('textarea[name="explanation"]');
          form.addEventListener('change', function (e) {
            if (e.target.name === 'yesno') box.required = e.target.value === 'Yes';
          });
        }
      },
      on_finish: function (data) {
        var r = data.response || {};
        var raw = item.response === 'typed' ? (r.answer || '')
          : item.response === 'choice' ? (r.choice || null)
          : (r.yesno || null);
        data.raw_answer = raw;
        data.explanation = r.explanation || '';
        if (item.response === 'typed') {
          data.parsed = root.AnswerParser.parse(raw);
          data.is_correct = root.AnswerParser.score(raw, item.correct);
        } else if (item.response === 'choice') {
          data.is_correct = item.correct == null || raw == null ? null : raw === item.correct;
        } else {
          data.is_correct = null;
        }
        var answer = { raw: raw, parsed: data.parsed || null, is_correct: data.is_correct, response: item.response };
        data.code = codeAnswer(item.id, answer);
        answersSoFar[item.id] = answer;
        var rec = recorder.result();
        Object.keys(rec).forEach(function (k) { data[k] = rec[k]; });
        var tracked = tracker.stop();
        Object.keys(tracked).forEach(function (k) { data[k] = tracked[k]; });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Other pages
  // ---------------------------------------------------------------------------

  function consentPage(onAnswer) {
    return page({
      html:
        '<div class="consent">' + text.consentHtml + '</div>' +
        '<p class="question">' + escapeHtml(text.consentQuestion) + '</p>' +
        '<fieldset class="choices yesno"><legend class="visually-hidden">' +
        escapeHtml(text.consentQuestion) + '</legend>' +
        '<label class="choice"><input type="radio" name="consent" value="Yes" required><span>Yes</span></label>' +
        '<label class="choice"><input type="radio" name="consent" value="No" required><span>No</span></label>' +
        '</fieldset>',
      data: { kind: 'consent' },
      on_finish: function (data) {
        onAnswer((data.response || {}).consent === 'Yes');
      }
    });
  }

  function selectHtml(name, label, options) {
    return '<label class="field">' + escapeHtml(label) +
      '<select name="' + name + '" required>' +
      '<option value="">Choose…</option>' +
      options.map(function (o) {
        return '<option value="' + escapeHtml(o) + '">' + escapeHtml(o) + '</option>';
      }).join('') +
      '</select></label>';
  }

  function demographicsPage(onSubmit) {
    var name = function (field, label, auto) {
      return '<label class="field">' + label +
        '<input name="' + field + '" type="text" required maxlength="100" pattern=".*\\S.*" ' +
        'autocomplete="' + auto + '" spellcheck="false"></label>';
    };
    return page({
      html:
        '<div class="intro">' + text.demographicsIntroHtml + '</div>' +
        name('first_name', 'First name:', 'given-name') +
        name('last_name', 'Last name:', 'family-name') +
        selectHtml('age_range', 'Current Age:', text.ageOptions) +
        '<label class="field">College/University Email Address:' +
        '<input name="email" type="email" required maxlength="254" autocomplete="email" ' +
        'inputmode="email" autocapitalize="off" spellcheck="false" ' +
        'pattern="[^@\\s]+@[^@\\s]+\\.[^@\\s]+" ' +
        'title="Enter an email address such as name@school.edu"></label>' +
        selectHtml('academic_program', 'Current Academic Program:', text.academicProgramOptions) +
        selectHtml('program_of_study', 'Current Program of Study (choose one):', text.programOfStudyOptions),
      data: { kind: 'demographics' },
      on_finish: function (data) {
        var r = data.response || {};
        onSubmit({
          first_name: (r.first_name || '').trim(),
          last_name: (r.last_name || '').trim(),
          email: (r.email || '').trim(),
          age_range: r.age_range || null,
          academic_program: r.academic_program || null,
          program_of_study: r.program_of_study || null
        });
        data.response = null; // names and email are not kept in the page data
      }
    });
  }

  function infoPage(html, kind) {
    return page({ html: '<div class="info">' + html + '</div>', data: { kind: kind } });
  }

  root.Pages = {
    consent: consentPage,
    demographics: demographicsPage,
    info: infoPage,
    problem: problemPage
  };
})(window);
