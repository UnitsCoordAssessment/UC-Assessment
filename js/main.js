/*
 * main.js — the order of pages:
 *   consent -> about you -> practice introduction -> 2 practice problems ->
 *   "the assessment will now begin" -> 18 problems -> final page
 */
(async function () {
  'use strict';

  var cfg = window.STUDY_CONFIG;
  var text = window.STUDY_CONTENT;
  var Pages = window.Pages;
  var storage = new window.StudyStorage(cfg);
  var finished = false;
  var openedAt = new Date().toISOString();
  var consentedAt = null;

  if (storage.mode === 'demo') document.body.classList.add('demo-mode');

  // Send anything an earlier, interrupted visit on this device left unsaved.
  storage.recoverPrevious().then(function (n) {
    if (n) console.info('Recovered ' + n + ' unsaved rows from an earlier visit.');
  });

  // Start downloading every figure now, so problem pages show them immediately.
  text.practice.concat(text.problems).forEach(function (item) {
    if (item.figure) new Image().src = item.figure.src;
  });

  var jsPsych = initJsPsych({
    show_progress_bar: !!cfg.showProgressBar,
    auto_update_progress_bar: false,
    message_progress_bar: '',
    on_data_update: function (data) {
      if (data.kind === 'practice' || data.kind === 'problem') storage.saveTrial(data);
    },
    on_finish: function () {
      finished = true;
      // No session means the student declined; jsPsych is already showing that message.
      if (storage.sessionId) showFinalPage();
    }
  });

  // Site and course come from the link, never from the student.
  var url = jsPsych.data.urlVariables();
  var site = cfg.sites.indexOf(url.site) !== -1 ? url.site : null;
  var course = Object.prototype.hasOwnProperty.call(cfg.courses, url.course) ? url.course : null;

  function warnBeforeLeaving(e) {
    if (finished) return;
    e.preventDefault();
    e.returnValue = '';
  }

  var consent = Pages.consent(function (agreed) {
    if (!agreed) {
      jsPsych.abortExperiment('<div class="page info">' + text.declinedHtml + '</div>');
      return;
    }
    consentedAt = new Date().toISOString();
    window.addEventListener('beforeunload', warnBeforeLeaving);
  });

  var aboutYou = Pages.demographics(function (answers) {
    storage.startSession({
      site: site,
      course: course,
      instrument_version: cfg.instrumentVersion,
      started_at: openedAt,
      consented_at: consentedAt,
      age_range: answers.age_range,
      academic_program: answers.academic_program,
      program_of_study: answers.program_of_study,
      client: {
        user_agent: navigator.userAgent,
        screen: { w: screen.width, h: screen.height, dpr: window.devicePixelRatio || 1 },
        viewport: { w: window.innerWidth, h: window.innerHeight },
        max_touch_points: navigator.maxTouchPoints || 0,
        coarse_pointer: window.matchMedia ? matchMedia('(pointer: coarse)').matches : null,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    }, {
      first_name: answers.first_name,
      last_name: answers.last_name,
      email: answers.email
    });
  });

  var practicePages = text.practice.map(function (item) { return Pages.problem(item, true); });
  var assessmentPages = text.problems.map(function (item) { return Pages.problem(item, false); });
  var problemPages = practicePages.concat(assessmentPages);

  problemPages.forEach(function (trial, i) {
    var userOnFinish = trial.on_finish;
    trial.on_finish = function (data) {
      if (userOnFinish) userOnFinish.apply(this, arguments);
      if (jsPsych.progressBar) jsPsych.progressBar.progress = (i + 1) / problemPages.length;
    };
  });

  // ---------------------------------------------------------------------------
  // Final page: the completion message, with no Continue button. If any
  // answers could not be saved, a notice and a backup download appear below it.
  // ---------------------------------------------------------------------------
  async function showFinalPage() {
    var el = jsPsych.getDisplayElement();
    renderFinal(el, null);
    await storage.finishSession({
      n_trials: storage.allRows().filter(function (r) { return r.table === 'trials'; }).length,
      total_time_ms: jsPsych.getTotalTime()
    });
    renderFinal(el, await storage.flush());
  }

  function renderFinal(el, remaining) {
    var html = '<div class="page final">' + text.completionHtml;
    if (storage.mode === 'demo') {
      html += '<div class="save-status demo">' +
        '<p><strong>Demo mode:</strong> nothing was sent anywhere. This is what would have been saved.</p>' +
        '<p><button type="button" class="jspsych-btn" id="download-backup">Download the data (JSON)</button></p>' +
        '<pre class="data-preview">' + escapeHtml(JSON.stringify(storage.allRows(), null, 2)) + '</pre></div>';
    } else if (remaining === null) {
      html += '<p class="save-status saving">Saving your answers…</p>';
    } else if (remaining > 0) {
      html += '<div class="save-status warning">' +
        '<p><strong>Some of your answers have not been saved yet.</strong> Please keep this page ' +
        'open and let the person running the session know.</p>' +
        '<p><button type="button" class="jspsych-btn" id="retry-save">Try saving again</button> ' +
        '<button type="button" class="jspsych-btn" id="download-backup">Download a backup file</button></p>' +
        '<p class="hint">Unsaved items: ' + remaining + '</p></div>';
    } else {
      html += '<p class="save-status saved">Your answers have been saved.</p>';
    }
    el.innerHTML = html + '</div>';

    var dl = document.getElementById('download-backup');
    if (dl) dl.addEventListener('click', function () { storage.downloadBackup(site || 'assessment'); });
    var retry = document.getElementById('retry-save');
    if (retry) {
      retry.addEventListener('click', async function () {
        retry.disabled = true;
        renderFinal(el, await storage.flush());
      });
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; });
  }

  await jsPsych.run([
    consent,
    aboutYou,
    Pages.info(text.practiceIntroHtml, 'practice_intro')
  ].concat(practicePages, [
    Pages.info(text.assessmentIntroHtml, 'assessment_intro')
  ], assessmentPages));
})();
