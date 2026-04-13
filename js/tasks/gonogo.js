/** Go/No-Go: Space for letters except X */
import HtmlKeyboardResponse from "https://esm.sh/@jspsych/plugin-html-keyboard-response@2.1.0";
import { randomInt } from "../utils.js";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const PRACTICE_N = 4;
const MAIN_N = 48;
const NOGO_P = 0.22;
const SOA_MS = 1500;

const TXT = {
  en: {
    title: "Go / No-Go",
    instruct: `You will see letters one at a time. Press <kbd>Space</kbd> as quickly as you can for every letter <strong>except</strong> <strong>X</strong>.

When the letter is <strong>X</strong>, do <em>not</em> press anything.

Each letter appears briefly; you may respond until the next letter.`,
    practiceStart: "Practice (4 trials). Press Space or Enter to begin.",
    mainStart: "Main task (48 trials). Press Space or Enter to begin.",
  },
  tr: {
    title: "Git / Gitme",
    instruct: `Tek tek harfler göreceksiniz. <strong>X</strong> dışındaki her harfte mümkün olduğunca hızlı <kbd>Boşluk</kbd> tuşuna basın.

Harf <strong>X</strong> olduğunda hiçbir tuşa basmayın.

Her harf kısa süre görünür; bir sonraki harfe kadar yanıt verebilirsiniz.`,
    practiceStart: "Alıştırma (4 deneme). Başlamak için Boşluk veya Enter tuşuna basın.",
    mainStart: "Ana görev (48 deneme). Başlamak için Boşluk veya Enter tuşuna basın.",
  },
};

function loc(lang, key) {
  return TXT[lang === "tr" ? "tr" : "en"][key];
}

function buildCptList(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const isNogo = Math.random() < NOGO_P;
    const letter = isNogo ? "X" : LETTERS.filter((l) => l !== "X")[randomInt(0, 24)];
    const stimDur = randomInt(280, 420);
    out.push({ letter, isNogo, stimDur, soa: SOA_MS });
  }
  return out;
}

function pushRow(ds, participantId, phase, trialNumber, spec, data) {
  const responded = data.response === " " || data.response === "space";
  const rt = data.rt ?? null;
  let omission = false;
  let commission = false;
  let accuracy = 0;
  let anticipatory = false;
  if (spec.isNogo) {
    commission = responded;
    accuracy = !responded ? 1 : 0;
  } else {
    omission = !responded;
    accuracy = responded ? 1 : 0;
    anticipatory = responded && rt !== null && rt < 150;
  }
  ds.pushRow({
    participant_id: participantId,
    task_name: "GoNoGo",
    trial_number: trialNumber,
    phase,
    stimulus: spec.letter,
    condition: spec.isNogo ? "nogo" : "go",
    correct_response: spec.isNogo ? "none" : "space",
    participant_response: responded ? "space" : "",
    accuracy,
    reaction_time_ms: rt,
    omission,
    commission,
    anticipatory,
    stim_duration_ms: spec.stimDur,
    soa_ms: spec.soa,
    fullscreen_active: !!document.fullscreenElement,
  });
}

export function buildGoNoGoTimeline(ctx) {
  const { datastore: ds, participantId, getLang } = ctx;
  const timeline = [];

  timeline.push({
    type: HtmlKeyboardResponse,
    stimulus: () =>
      `<div class="screen-card"><h1>${loc(getLang(), "title")}</h1><p>${loc(getLang(), "instruct")}</p><p class="muted">${loc(getLang(), "practiceStart")}</p></div>`,
    choices: [" ", "Enter"],
  });

  const practiceList = buildCptList(PRACTICE_N);
  for (let i = 0; i < practiceList.length; i++) {
    const spec = practiceList[i];
    const trialIdx = i + 1;
    const sid = `cpt-go-practice-${trialIdx}`;
    timeline.push({
      type: HtmlKeyboardResponse,
      stimulus: `<div class="cpt-letter" id="${sid}">${spec.letter}</div>`,
      choices: [" "],
      trial_duration: spec.soa,
      response_ends_trial: false,
      data: { phase: "practice" },
      on_load: function () {
        const hideAfter = spec.stimDur;
        window.setTimeout(() => {
          const el = document.getElementById(sid);
          if (el) el.textContent = "";
        }, hideAfter);
      },
      on_finish: function (data) {
        pushRow(ds, participantId, "practice", trialIdx, spec, data);
      },
    });
  }

  timeline.push({
    type: HtmlKeyboardResponse,
    stimulus: () =>
      `<div class="screen-card"><h1>${loc(getLang(), "title")}</h1><p>${loc(getLang(), "mainStart")}</p></div>`,
    choices: [" ", "Enter"],
  });

  const mainList = buildCptList(MAIN_N);
  for (let i = 0; i < mainList.length; i++) {
    const spec = mainList[i];
    const trialIdx = i + 1;
    const sid = `cpt-go-main-${trialIdx}`;
    timeline.push({
      type: HtmlKeyboardResponse,
      stimulus: `<div class="cpt-letter" id="${sid}">${spec.letter}</div>`,
      choices: [" "],
      trial_duration: spec.soa,
      response_ends_trial: false,
      data: { phase: "main" },
      on_load: function () {
        const hideAfter = spec.stimDur;
        window.setTimeout(() => {
          const el = document.getElementById(sid);
          if (el) el.textContent = "";
        }, hideAfter);
      },
      on_finish: function (data) {
        pushRow(ds, participantId, "main", trialIdx, spec, data);
      },
    });
  }

  return timeline;
}
