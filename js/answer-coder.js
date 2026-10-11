/*
 * answer-coder.js
 *
 * Gives each answer an interpretation from the codebook in codes.js: the
 * stage(s) of units coordination the answer is consistent with, and a note
 * saying why. The raw answer is always saved unchanged; the code is saved
 * beside it (data.code), so the rules can be revised later and re-applied to
 * collected data with scripts/recode.js.
 *
 * How a rule is chosen
 *   Rules for a problem are tried in order, and the first rule whose
 *   conditions all hold is used. An answer that matches no rule is saved with
 *   stage null ("for a person to code"). A problem with no rules is not coded
 *   (code is null).
 *
 * Conditions a rule can use (see codes.js for examples)
 *   value      the answer equals this value, or one of these values, whatever
 *              the notation ('2.25', '2 1/4' and '9/4' are the same value)
 *   contains   the answer contains this text, or one of these texts
 *              (ignoring upper/lower case), e.g. 'R' for a remainder
 *   form       how the answer was written: 'number', 'fraction',
 *              'mixed_number', 'product', 'repeated_addition', 'sum',
 *              'quotient' or 'mixed' (several operations)
 *   factors    the answer is a product of exactly these factors, in any
 *              order, e.g. ['60', '8']; a list of lists allows several
 *   option     (multiple-choice problems) the option chosen, e.g. 'Option D'
 *   unreadable true: the answer could not be read as a number
 *   correct    true / false: the answer was scored correct / incorrect
 *   earlier    a condition on the same student's answer to an earlier problem:
 *              { item: 'problem_11_area_yardsfeet1', value: '3' }, or with
 *              option: 'Option C', or correct: true / false
 *
 * Works in the browser (window.AnswerCoder) and in Node (require()).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./answer-parser.js'));
  } else {
    root.AnswerCoder = factory(root.AnswerParser);
  }
})(typeof self !== 'undefined' ? self : this, function (AnswerParser) {
  'use strict';

  var CONDITIONS = ['value', 'contains', 'form', 'factors', 'option', 'unreadable', 'correct', 'earlier'];

  function list(x) { return Array.isArray(x) ? x : [x]; }

  var valueCache = {};
  function valueOf(text) {
    var key = String(text);
    if (!Object.prototype.hasOwnProperty.call(valueCache, key)) {
      var r = AnswerParser.parse(key);
      if (!r.ok) throw new Error('codes.js: "' + key + '" cannot be read as a number (' + r.error + ')');
      valueCache[key] = r.value_text;
    }
    return valueCache[key];
  }

  function optionMatches(chosen, wanted) {
    return list(wanted).some(function (o) {
      return chosen === o || chosen === 'Option ' + o;
    });
  }

  // answer: { raw, parsed, is_correct, response }  (parsed only for typed answers)
  function answerMatches(cond, answer) {
    var parsed = answer.parsed;
    var readable = !!(parsed && parsed.ok);
    if (cond.value !== undefined) {
      if (!readable) return false;
      var wanted = list(cond.value).map(valueOf);
      if (wanted.indexOf(parsed.value_text) === -1) return false;
    }
    if (cond.contains !== undefined) {
      var raw = String(answer.raw || '').toUpperCase();
      if (!list(cond.contains).some(function (s) { return raw.indexOf(String(s).toUpperCase()) !== -1; })) return false;
    }
    if (cond.form !== undefined) {
      if (!readable || list(cond.form).indexOf(parsed.structure && parsed.structure.kind) === -1) return false;
    }
    if (cond.factors !== undefined) {
      if (!readable || !parsed.structure || parsed.structure.kind !== 'product') return false;
      var got = parsed.structure.factors.map(valueOf).sort().join('|');
      var sets = Array.isArray(cond.factors[0]) ? cond.factors : [cond.factors];
      if (!sets.some(function (set) { return set.map(valueOf).sort().join('|') === got; })) return false;
    }
    if (cond.option !== undefined) {
      if (answer.raw == null || !optionMatches(answer.raw, cond.option)) return false;
    }
    if (cond.unreadable !== undefined) {
      var isUnreadable = answer.response === 'typed' && !readable && String(answer.raw || '').trim() !== '';
      if (isUnreadable !== !!cond.unreadable) return false;
    }
    if (cond.correct !== undefined) {
      if (answer.is_correct !== cond.correct) return false;
    }
    return true;
  }

  function ruleMatches(rule, answer, earlierAnswer) {
    if (!answerMatches(rule, answer)) return false;
    if (rule.earlier) {
      var prev = earlierAnswer(rule.earlier.item);
      if (!prev || !answerMatches(rule.earlier, prev)) return false;
    }
    return true;
  }

  /**
   * code(codes, itemId, answer, earlierAnswer)
   *   codes          window.STUDY_CODES (from codes.js)
   *   itemId         the problem's id
   *   answer         { raw, parsed, is_correct, response }
   *   earlierAnswer  function(itemId) -> the same student's earlier answer in
   *                  the same shape, or null
   * Returns null when the problem has no rules; otherwise
   *   { stage, note, rule, codes_version }  (rule is 1-based; null if none matched)
   */
  function code(codes, itemId, answer, earlierAnswer) {
    var rules = codes && codes.items && codes.items[itemId];
    if (!rules || !rules.length) return null;
    earlierAnswer = earlierAnswer || function () { return null; };
    for (var i = 0; i < rules.length; i++) {
      if (ruleMatches(rules[i], answer, earlierAnswer)) {
        return { stage: rules[i].stage, note: rules[i].note, rule: i + 1, codes_version: codes.version };
      }
    }
    return { stage: null, note: 'No rule matched; for a person to code', rule: null, codes_version: codes.version };
  }

  /**
   * check(codes, content): problems with the codebook, as a list of messages
   * (empty when everything is consistent). Used by the tests.
   */
  function check(codes, content) {
    var problems = [];
    var items = content.practice.concat(content.problems);
    var byId = {};
    items.forEach(function (it, i) { byId[it.id] = { item: it, index: i }; });
    Object.keys(codes.items || {}).forEach(function (id) {
      var entry = byId[id];
      if (!entry) { problems.push(id + ': not a problem id in content.js'); return; }
      var it = entry.item;
      codes.items[id].forEach(function (rule, r) {
        var where = id + ' rule ' + (r + 1);
        if (!rule.stage || !rule.note) problems.push(where + ': needs both stage and note');
        var used = CONDITIONS.filter(function (c) { return rule[c] !== undefined; });
        if (!used.length) problems.push(where + ': has no condition, so it would match every answer');
        Object.keys(rule).forEach(function (k) {
          if (CONDITIONS.indexOf(k) === -1 && k !== 'stage' && k !== 'note') {
            problems.push(where + ': unknown field "' + k + '"');
          }
        });
        function checkCond(cond, target, label) {
          try {
            if (cond.value !== undefined) list(cond.value).forEach(valueOf);
            if (cond.factors !== undefined) {
              (Array.isArray(cond.factors[0]) ? cond.factors : [cond.factors]).forEach(function (s) { s.forEach(valueOf); });
            }
          } catch (e) { problems.push(label + ': ' + e.message); }
          var typedOnly = ['value', 'contains', 'form', 'factors', 'unreadable'].filter(function (c) { return cond[c] !== undefined; });
          if (target.response === 'choice' && typedOnly.length) problems.push(label + ': ' + typedOnly.join(', ') + ' used on a multiple-choice problem');
          if (target.response !== 'choice' && cond.option !== undefined) problems.push(label + ': option used on a typed problem');
          if (cond.option !== undefined && target.options) {
            list(cond.option).forEach(function (o) {
              if (target.options.indexOf(o) === -1 && target.options.indexOf('Option ' + o) === -1) {
                problems.push(label + ': "' + o + '" is not an option of ' + target.id);
              }
            });
          }
        }
        checkCond(rule, it, where);
        if (rule.earlier) {
          var prev = byId[rule.earlier.item];
          if (!prev) problems.push(where + ': earlier item "' + rule.earlier.item + '" is not in content.js');
          else if (prev.index >= entry.index) problems.push(where + ': earlier item "' + rule.earlier.item + '" does not come before ' + id);
          else checkCond(rule.earlier, prev.item, where + ' (earlier)');
        }
      });
    });
    return problems;
  }

  return { code: code, check: check, CONDITIONS: CONDITIONS };
});
