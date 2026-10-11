#!/usr/bin/env node
/*
 * recode.js — re-applies the current codebook (js/codes.js) to answers that
 * have already been collected, so the rules can be revised after a pilot
 * without collecting data again.
 *
 * Usage (after scripts/export_data.py has written exports/):
 *   node scripts/recode.js exports/trials_full.jsonl
 *   node scripts/recode.js exports/trials_full.jsonl exports/trials_recoded.csv
 *
 * Writes one row per answer with the code from the current codebook
 * (code_stage, code_note, code_rule, codes_version), the code saved when the
 * student answered (saved_code_stage, saved_codes_version), and whether they
 * differ (changed). Correctness is re-scored with the current answer keys in
 * js/content.js. The output has no names or emails.
 *
 * Note: rules are matched by problem id, so if a problem's wording or figure
 * changed between instrument versions, check instrument_version before
 * comparing codes across versions.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const AnswerParser = require(path.join(ROOT, 'js', 'answer-parser.js'));
const AnswerCoder = require(path.join(ROOT, 'js', 'answer-coder.js'));

function loadBrowserFile(file, win) {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', file), 'utf8'), { window: win }, { filename: file });
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function main() {
  const [input, output] = process.argv.slice(2);
  if (!input) {
    console.error('Usage: node scripts/recode.js <trials_full.jsonl> [output.csv]');
    process.exit(1);
  }
  const win = {};
  loadBrowserFile('content.js', win);
  loadBrowserFile('codes.js', win);
  const content = win.STUDY_CONTENT;
  const codes = win.STUDY_CODES;
  const items = {};
  content.practice.concat(content.problems).forEach((it) => { items[it.id] = it; });

  const problems = AnswerCoder.check(codes, content);
  if (problems.length) {
    console.error('codes.js has problems; fix these first:\n  ' + problems.join('\n  '));
    process.exit(1);
  }

  const rows = fs.readFileSync(input, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  const bySession = {};
  rows.forEach((r) => { (bySession[r.session_id] = bySession[r.session_id] || []).push(r); });

  const columns = ['session_id', 'trial_index', 'item_id', 'instrument_version', 'raw_answer', 'is_correct',
    'code_stage', 'code_note', 'code_rule', 'codes_version', 'saved_code_stage', 'saved_codes_version', 'changed'];
  const lines = [columns.join(',')];

  Object.keys(bySession).forEach((sid) => {
    const answers = {};
    bySession[sid].sort((a, b) => a.trial_index - b.trial_index).forEach((r) => {
      const item = items[r.item_id];
      const raw = r.raw_answer;
      let parsed = null;
      let isCorrect = r.is_correct;
      if (item && item.response === 'typed') {
        parsed = AnswerParser.parse(raw || '');
        isCorrect = AnswerParser.score(raw || '', item.correct);
      } else if (item && item.response === 'choice') {
        isCorrect = item.correct == null || raw == null ? null : raw === item.correct;
      }
      const answer = { raw: raw, parsed: parsed, is_correct: isCorrect, response: item ? item.response : r.item_type };
      const code = AnswerCoder.code(codes, r.item_id, answer, (id) => answers[id] || null);
      answers[r.item_id] = answer;
      const saved = (r.data && r.data.code) || null;
      const savedStage = saved ? saved.stage : null;
      const stage = code ? code.stage : null;
      lines.push([
        sid, r.trial_index, r.item_id, r.instrument_version, raw, isCorrect,
        stage, code ? code.note : null, code ? code.rule : null, code ? code.codes_version : null,
        savedStage, saved ? saved.codes_version : null,
        saved ? String(savedStage !== stage) : ''
      ].map(csvCell).join(','));
    });
  });

  const out = output || path.join(path.dirname(input), 'trials_recoded.csv');
  fs.writeFileSync(out, lines.join('\n') + '\n', 'utf8');
  console.log(`Re-coded ${rows.length} answers from ${Object.keys(bySession).length} sittings with codebook ` +
    `"${codes.version}"; wrote ${out}`);
}

main();
