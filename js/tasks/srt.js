/** SRT: fixation → circle → Space; one CallFunction per trial */
import HtmlKeyboardResponse from "https://esm.sh/@jspsych/plugin-html-keyboard-response@2.1.0";
import CallFunctionPlugin from "https://esm.sh/@jspsych/plugin-call-function@2.1.0";
import { randomChoice } from "../utils.js";

let srtSpaceHeld = false;
let srtSpaceTrackingInstalled = false;

function installSrtSpaceTracking() {
  if (srtSpaceTrackingInstalled) return;
  srtSpaceTrackingInstalled = true;
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.code === "Space" || e.key === " ") srtSpaceHeld = true;
    },
    true
  );
  window.addEventListener(
    "keyup",
    (e) => {
      if (e.code === "Space" || e.key === " ") srtSpaceHeld = false;
    },
    true
  );
}

function waitUntilSpaceReleased(maxWaitMs) {
  installSrtSpaceTracking();
  return new Promise((resolve) => {
    if (!srtSpaceHeld) {
      resolve();
      return;
    }
    const t0 = performance.now();
    function tick() {
      if (!srtSpaceHeld || performance.now() - t0 >= maxWaitMs) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function waitForSpaceOnce(tDisplay, timeoutMs) {
  return new Promise((resolve) => {
    function onDown(e) {
      if (e.repeat) return;
      if (e.code !== "Space" && e.key !== " ") return;
      const rt = performance.now() - tDisplay;
      cleanup();
      resolve({ response: " ", rt });
    }
    function cleanup() {
      window.removeEventListener("keydown", onDown, true);
      clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      cleanup();
      resolve({ response: null, rt: null });
    }, timeoutMs);
    window.addEventListener("keydown", onDown, true);
  });
}

const PRACTICE_N = 4;
const MAIN_N = 24;
const RESPONSE_DEADLINE_MS = 4500;
const ITI_MS = 900;
const FOREPERIODS_MS = [350, 500, 700, 950, 1250, 1600, 2000, 2400, 2800];

const TXT = {
  en: {
    title: "Simple Reaction Time",
    instruct: `A fixation cross (+) will appear, then a <strong>green circle</strong>. Press the <kbd>Space</kbd> bar as quickly as possible when you see the circle.

Do not press before the circle appears. If you are too early, that trial may count as invalid.

<strong>Important:</strong> release Space after each press. Do not hold Space down between trials — that can cause mistaken responses.`,
    practiceStart: "Practice (4 trials). Press Space or Enter to begin.",
    mainStart: "Main task (24 trials). Press Space or Enter to begin.",
  },
  tr: {
    title: "Basit Tepki Süresi",
    instruct: `Önce bir sabitleme işareti (+), ardından <strong>yeşil bir daire</strong> göreceksiniz. Daireyi görür görmez mümkün olduğunca hızlı şekilde <kbd>Boşluk</kbd> tuşuna basın.

Daire görünmeden önce basmayın; çok erken yanıtlar geçersiz sayılabilir.

<strong>Önemli:</strong> Her basıştan sonra Boşluğu bırakın. Denemeler arasında tuşa basılı tutmayın — yanlış kayıtlara yol açabilir.`,
    practiceStart: "Alıştırma (4 deneme). Başlamak için Boşluk veya Enter tuşuna basın.",
    mainStart: "Ana görev (24 deneme). Başlamak için Boşluk veya Enter tuşuna basın.",
  },
};

function loc(lang, key) {
  return TXT[lang === "tr" ? "tr" : "en"][key];
}

function pushTrial(ds, participantId, phase, trialNumber, data) {
  ds.pushRow({
    participant_id: participantId,
    task_name: "SRT",
    trial_number: trialNumber,
    phase,
    stimulus: "green_circle",
    condition: "simple_rt",
    correct_response: "space",
    participant_response: data.response === " " || data.response === "space" ? "space" : data.response ?? "",
    accuracy: data.accuracy,
    reaction_time_ms: data.rt ?? null,
    omission: !!data.omission,
    anticipatory: !!data.anticipatory,
    commission: false,
    fullscreen_active: !!document.fullscreenElement,
  });
}

export function buildSRTTimeline(ctx) {
  const { jsPsych, datastore: ds, participantId, getLang } = ctx;
  const timeline = [];
  installSrtSpaceTracking();

  const instruct = {
    type: HtmlKeyboardResponse,
    stimulus: () =>
      `<div class="screen-card"><h1>${loc(getLang(), "title")}</h1><p>${loc(getLang(), "instruct")}</p><p class="muted">${loc(getLang(), "practiceStart")}</p></div>`,
    choices: [" ", "Enter"],
  };
  timeline.push(instruct);

  const makeBlock = (phase, nTrials, startTrialNum) => {
    const trials = [];
    for (let i = 0; i < nTrials; i++) {
      const fixationMs = randomChoice(FOREPERIODS_MS);
      const trialIndex = i + 1;
      trials.push({
        type: CallFunctionPlugin,
        async: true,
        data: { phase, subpart: "srt_trial_bundle", trial_index: trialIndex },
        func: function (done) {
          const root = jsPsych.getDisplayElement();
          (async () => {
            root.innerHTML = '<div class="fixation">+</div>';
            await sleep(fixationMs);
            root.innerHTML = '<div class="srt-stim" aria-label="target"></div>';
            const tDisplay = performance.now();
            const result = await waitForSpaceOnce(tDisplay, RESPONSE_DEADLINE_MS);
            const rt = result.rt;
            const responded = result.response != null;
            const omission = !responded;
            const anticipatory = responded && rt !== null && rt < 150;
            const accuracy = responded && !anticipatory ? 1 : 0;
            pushTrial(ds, participantId, phase, startTrialNum + i, {
              response: result.response,
              rt,
              omission,
              anticipatory,
              accuracy,
            });
            await waitUntilSpaceReleased(700);
            root.innerHTML = "";
            await sleep(ITI_MS);
            done({
              phase,
              trial_index: trialIndex,
              rt,
              omission,
              anticipatory,
              accuracy,
              responded,
            });
          })().catch(() => done({ phase, trial_index: trialIndex, error: true }));
        },
      });
    }
    return trials;
  };

  timeline.push(...makeBlock("practice", PRACTICE_N, 1));

  timeline.push({
    type: HtmlKeyboardResponse,
    stimulus: () =>
      `<div class="screen-card"><h1>${loc(getLang(), "title")}</h1><p>${loc(getLang(), "mainStart")}</p></div>`,
    choices: [" ", "Enter"],
  });

  timeline.push(...makeBlock("main", MAIN_N, PRACTICE_N + 1));

  return timeline;
}
