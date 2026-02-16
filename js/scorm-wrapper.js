/* ===== SCORM 1.2 API Wrapper ===== */
/* Provides communication between the course and the LMS (e.g. HowNow).
   Loaded by scorm-launcher.html — content pages access via window.parent.SCORM */

var SCORM = (function () {
  var api = null;
  var initialized = false;

  /** Traverse parent/opener windows to find the LMS SCORM 1.2 API object */
  function findAPI(win) {
    var attempts = 0;
    while (win && attempts < 500) {
      attempts++;
      if (win.API) return win.API;
      if (win === win.parent) break;
      try { win = win.parent; } catch (e) { break; }
    }
    return null;
  }

  function getAPI() {
    if (api) return api;
    api = findAPI(window);
    if (!api && window.opener) {
      try { api = findAPI(window.opener); } catch (e) { /* cross-origin */ }
    }
    return api;
  }

  return {
    /** Initialise the SCORM session — call once when the course loads */
    init: function () {
      api = getAPI();
      if (!api) return false;

      try {
        var result = api.LMSInitialize('');
        initialized = (result === 'true' || result === true);
      } catch (e) {
        initialized = false;
      }

      if (initialized) {
        // Bypass the course password gate — the LMS handles authentication
        try { localStorage.setItem('ol_training_auth', 'true'); } catch (e) { /* noop */ }

        // Set initial status to incomplete if this is a fresh attempt
        var status = this.getValue('cmi.core.lesson_status');
        if (!status || status === 'not attempted' || status === '') {
          this.setValue('cmi.core.lesson_status', 'incomplete');
          this.commit();
        }
      }

      return initialized;
    },

    /** Set a SCORM data-model value */
    setValue: function (key, value) {
      if (!initialized || !api) return false;
      try { return api.LMSSetValue(key, String(value)); } catch (e) { return false; }
    },

    /** Get a SCORM data-model value */
    getValue: function (key) {
      if (!initialized || !api) return '';
      try { return api.LMSGetValue(key); } catch (e) { return ''; }
    },

    /** Commit (persist) data to the LMS */
    commit: function () {
      if (!initialized || !api) return false;
      try { return api.LMSCommit(''); } catch (e) { return false; }
    },

    /**
     * Report quiz score and set pass/fail status.
     * @param {number} score  Raw score (e.g. 16 out of 20)
     * @param {number} max    Maximum possible score (e.g. 20)
     */
    reportScore: function (score, max) {
      if (!initialized || !api) return;

      var pct = Math.round((score / max) * 100);
      this.setValue('cmi.core.score.raw', pct);
      this.setValue('cmi.core.score.max', 100);
      this.setValue('cmi.core.score.min', 0);

      // Use LMS mastery score if available, otherwise default to 80 %
      var masteryStr = this.getValue('cmi.student_data.mastery_score');
      var mastery = parseFloat(masteryStr);
      if (isNaN(mastery)) mastery = 80;

      this.setValue('cmi.core.lesson_status', pct >= mastery ? 'passed' : 'failed');
      this.commit();
    },

    /** End the SCORM session — call when the learner exits */
    finish: function () {
      if (!initialized || !api) return false;
      try {
        var result = api.LMSFinish('');
        initialized = false;
        return result;
      } catch (e) { return false; }
    },

    /** Check whether SCORM is active and connected to an LMS */
    isActive: function () {
      return initialized && api !== null;
    }
  };
})();
