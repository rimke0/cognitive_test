/** jsPsych 7 timeline, i18n, CSV/JSON export */
import { initJsPsych } from "https://esm.sh/jspsych@7.3.4";
import HtmlKeyboardResponse from "https://esm.sh/@jspsych/plugin-html-keyboard-response@2.1.0";
import HtmlButtonResponse from "https://esm.sh/@jspsych/plugin-html-button-response@2.1.0";

import { initLangFromStorage, getLang, setLang, t } from "./js/i18n.js";
import {
  buildSessionMetadata,
  createParticipantId,
  exitFullscreenBestEffort,
  isMobileOrTablet,
  requestFullscreenBestEffort,
} from "./js/session.js";
import { Datastore } from "./js/datastore.js";
import { buildSRTTimeline } from "./js/tasks/srt.js";
import { buildStroopTimeline } from "./js/tasks/stroop.js";
import { buildDigitSpanTimeline } from "./js/tasks/digitspan.js";
import { buildGoNoGoTimeline } from "./js/tasks/gonogo.js";
import { buildSessionFeedback, renderFeedbackPanelHTML } from "./js/sessionFeedback.js";
import {
  DEV_SKIP_PASSWORD,
  getNextTestStartIndex,
  skipToGlobalTrialIndex,
} from "./js/devSkip.js";

initLangFromStorage();

const participantId = createParticipantId();
const datastore = new Datastore();

function hideLanguageScreen() {
  const el = document.getElementById("lang-screen");
  if (el) el.hidden = true;
}

function blockMobile() {
  const target = document.getElementById("jspsych-target");
  if (!target) return;
  target.innerHTML = `<div class="screen-card mobile-block"><h1>${t("mobileBlockedTitle")}</h1><p>${t("mobileBlockedBody")}</p></div>`;
}

function debriefFilename(ext) {
  const d = new Date().toISOString().replace(/[:.]/g, "-");
  return `cognitive_${participantId}_${d}.${ext}`;
}

function showDevSkipBar(jsPsych, testMilestones) {
  const bar = document.getElementById("dev-skip-bar");
  const btn = document.getElementById("dev-skip-next-test");
  if (!bar || !btn) return;
  bar.hidden = false;
  document.body.classList.add("dev-skip-active");
  btn.onclick = () => {
    const p = window.prompt("Developer password (skip to next task):");
    if (p !== DEV_SKIP_PASSWORD) {
      if (p !== null && p !== "") window.alert("Incorrect password.");
      return;
    }
    let cur;
    try {
      cur = jsPsych.getProgress().current_trial_global;
    } catch {
      return;
    }
    const target = getNextTestStartIndex(testMilestones, cur);
    if (target == null) {
      window.alert("No further task to skip to.");
      return;
    }
    if (!Number.isFinite(target)) {
      return;
    }
    btn.disabled = true;
    skipToGlobalTrialIndex(jsPsych, target, {
      onDone: () => {
        btn.disabled = false;
      },
    });
  };
}

function hideDevSkipBar() {
  const bar = document.getElementById("dev-skip-bar");
  const btn = document.getElementById("dev-skip-next-test");
  if (btn) btn.onclick = null;
  if (bar) bar.hidden = true;
  document.body.classList.remove("dev-skip-active");
}

function runStudy() {
  const meta = buildSessionMetadata(participantId);
  meta.language_ui = getLang();
  meta.jspsych_version = "7.3.4";
  datastore.setSessionMeta(meta);

  const jsPsych = initJsPsych({
    display_element: "jspsych-target",
    experiment_width: Math.min(920, window.innerWidth - 40),
    default_iti: 0,
    on_finish: function () {
      hideDevSkipBar();
      datastore.finalizeSummaries();
      exitFullscreenBestEffort();
    },
  });

  const ctx = {
    jsPsych,
    datastore,
    participantId,
    getLang,
  };

  let withdrawListener;
  withdrawListener = function (e) {
    if (e.key !== "Escape") return;
    e.preventDefault();
    if (window.confirm(t("withdrawConfirm"))) {
      document.removeEventListener("keydown", withdrawListener, true);
      hideDevSkipBar();
      jsPsych.abortExperiment({ withdrawn: true, participant_id: participantId });
      window.alert(t("withdrewBody"));
    }
  };
  document.addEventListener("keydown", withdrawListener, true);

  const setupTrials = [
    {
      type: HtmlButtonResponse,
      stimulus: `<div class="screen-card"><h1>${t("consentTitle")}</h1><p>${t("consentBody")}</p><p class="muted">${t("withdrawHint")}</p><p><strong>${t("participantIdLabel")}:</strong> <code>${participantId}</code></p><p class="muted">${t("participantIdHint")}</p></div>`,
      choices: [t("consentAgree"), t("consentDecline")],
      on_finish: function (data) {
        if (data.response === 1) {
          document.removeEventListener("keydown", withdrawListener, true);
          hideDevSkipBar();
          alert(t("declined"));
          jsPsych.abortExperiment({ consent_declined: true, participant_id: participantId });
        }
      },
    },
    {
      type: HtmlKeyboardResponse,
      stimulus: `<div class="screen-card"><p>${t("fullscreenPrompt")}</p></div>`,
      choices: [" ", "Enter"],
      on_finish: function () {
        jsPsych.data.addProperties({
          participant_id: participantId,
          ...buildSessionMetadata(participantId),
          language_ui: getLang(),
          jspsych_version: "7.3.4",
        });
        requestFullscreenBestEffort();
      },
    },
  ];

  const srtTimeline = buildSRTTimeline(ctx);
  const breakBeforeStroop = {
    type: HtmlKeyboardResponse,
    stimulus: `<div class="screen-card"><h2>${t("breakTitle")}</h2><p>${t("breakBody")}</p><p class="muted">${t("blockProgress")} 2 / 4 — ${t("taskStroop")}</p></div>`,
    choices: [" ", "Enter"],
  };
  const stroopTimeline = buildStroopTimeline(ctx);
  const breakBeforeDigit = {
    type: HtmlKeyboardResponse,
    stimulus: `<div class="screen-card"><h2>${t("breakTitle")}</h2><p>${t("breakBody")}</p><p class="muted">${t("blockProgress")} 3 / 4 — ${t("taskDigit")}</p></div>`,
    choices: [" ", "Enter"],
  };
  const digitTimeline = buildDigitSpanTimeline(ctx);
  const breakBeforeGng = {
    type: HtmlKeyboardResponse,
    stimulus: `<div class="screen-card"><h2>${t("breakTitle")}</h2><p>${t("breakBody")}</p><p class="muted">${t("blockProgress")} 4 / 4 — ${t("taskCPT")}</p></div>`,
    choices: [" ", "Enter"],
  };
  const gonogoTimeline = buildGoNoGoTimeline(ctx);

  const idxSrt = setupTrials.length;
  const idxStroop = idxSrt + srtTimeline.length + 1;
  const idxDigit = idxStroop + stroopTimeline.length + 1;
  const idxGonogo = idxDigit + digitTimeline.length + 1;
  const idxDebrief = idxGonogo + gonogoTimeline.length;
  const testMilestones = [idxSrt, idxStroop, idxDigit, idxGonogo, idxDebrief];

  const timeline = [
    ...setupTrials,
    ...srtTimeline,
    breakBeforeStroop,
    ...stroopTimeline,
    breakBeforeDigit,
    ...digitTimeline,
    breakBeforeGng,
    ...gonogoTimeline,
    {
      type: HtmlKeyboardResponse,
      stimulus: `<div class="screen-card"><h1>${t("debriefTitle")}</h1><div id="feedback-mount" class="feedback-mount"></div><p>${t("debriefBody")}</p>
      <div class="actions">
        <button type="button" class="btn btn-primary" id="btn-csv">${t("downloadCsv")}</button>
        <button type="button" class="btn" id="btn-json">${t("downloadJson")}</button>
        <button type="button" class="btn" id="btn-sum">${t("downloadSummary")}</button>
      </div>
      <p class="muted">${t("continue")} — ${t("continueKeys")}</p></div>`,
      choices: [" ", "Enter"],
      on_load: function () {
        const csvBtn = document.getElementById("btn-csv");
        const jsonBtn = document.getElementById("btn-json");
        const sumBtn = document.getElementById("btn-sum");
        datastore.finalizeSummaries();
        const fb = buildSessionFeedback(datastore.summaries, getLang());
        datastore.feedbackReport = fb;
        const mount = document.getElementById("feedback-mount");
        if (mount) mount.innerHTML = renderFeedbackPanelHTML(fb, getLang());
        if (csvBtn)
          csvBtn.onclick = () =>
            datastore.download(
              debriefFilename("csv"),
              "text/csv;charset=utf-8",
              datastore.toHumanTrialsCSV(getLang())
            );
        if (jsonBtn)
          jsonBtn.onclick = () =>
            datastore.download(debriefFilename("json"), "application/json;charset=utf-8", datastore.toJSONString());
        if (sumBtn)
          sumBtn.onclick = () =>
            datastore.download(
              debriefFilename("summary.json"),
              "application/json;charset=utf-8",
              JSON.stringify(
                {
                  session: datastore.sessionMeta,
                  summaries: datastore.summaries,
                  feedback_report: datastore.feedbackReport,
                },
                null,
                2
              )
            );
      },
      on_finish: function () {
        hideDevSkipBar();
        document.removeEventListener("keydown", withdrawListener, true);
      },
    },
  ];

  showDevSkipBar(jsPsych, testMilestones);
  jsPsych.run(timeline);
}

function beginAfterLanguageChoice(lang) {
  setLang(lang);
  document.documentElement.lang = lang;
  hideLanguageScreen();
  if (isMobileOrTablet()) {
    blockMobile();
    return;
  }
  runStudy();
}

function main() {
  const pickEn = document.getElementById("pick-en");
  const pickTr = document.getElementById("pick-tr");
  if (pickEn) pickEn.onclick = () => beginAfterLanguageChoice("en");
  if (pickTr) pickTr.onclick = () => beginAfterLanguageChoice("tr");
}

main();
