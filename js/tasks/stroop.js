/**
 * Stroop color-word task: congruent vs incongruent; keys D F J K mapped to four ink colors.
 */
import HtmlKeyboardResponse from "https://esm.sh/@jspsych/plugin-html-keyboard-response@2.1.0";

const WORDS = ["RED", "BLUE", "GREEN", "YELLOW"];
/** Ink colors (CSS) — must match response keys order */
const COLORS = [
  { name: "red", css: "#c0392b", key: "f" },
  { name: "blue", css: "#2980b9", key: "d" },
  { name: "green", css: "#27ae60", key: "j" },
  { name: "yellow", css: "#f39c12", key: "k" },
];

const TXT = {
  en: {
    title: "Color–Word Task (Stroop)",
    instruct: `You will see a color word. Ignore the <em>word meaning</em> and choose the <strong>ink color</strong> using keys:

${COLORS.map((c) => `<kbd>${c.key.toUpperCase()}</kbd> = ${c.name}`).join(" &nbsp; ")}

Respond as quickly and accurately as possible.`,
    practiceStart: "Practice (4 trials). Press Space or Enter to begin.",
    mainStart: "Main task (24 trials). Press Space or Enter to begin.",
  },
  tr: {
    title: "Renk–Kelime Görevi (Stroop)",
    instruct: `Renkli bir kelime göreceksiniz. <em>Kelimenin anlamını</em> değil, <strong>mürekkep rengini</strong> seçin:

${COLORS.map((c) => `<kbd>${c.key.toUpperCase()}</kbd> = ${c.name}`).join(" &nbsp; ")}

Mümkün olduğunca hızlı ve doğru yanıt verin.`,
    practiceStart: "Alıştırma (4 deneme). Başlamak için Boşluk veya Enter tuşuna basın.",
    mainStart: "Ana görev (24 deneme). Başlamak için Boşluk veya Enter tuşuna basın.",
  },
};

function loc(lang, key) {
  return TXT[lang === "tr" ? "tr" : "en"][key];
}

function buildTrialList(nCongruent, nIncongruent) {
  const list = [];
  for (let i = 0; i < nCongruent; i++) {
    const idx = Math.floor(Math.random() * COLORS.length);
    const w = WORDS[idx];
    const ink = COLORS[idx];
    list.push({
      word: w,
      ink: ink,
      condition: "congruent",
      correct_key: ink.key,
    });
  }
  for (let i = 0; i < nIncongruent; i++) {
    let wi = Math.floor(Math.random() * WORDS.length);
    let ci = Math.floor(Math.random() * COLORS.length);
    while (wi === ci) {
      wi = Math.floor(Math.random() * WORDS.length);
      ci = Math.floor(Math.random() * COLORS.length);
    }
    const w = WORDS[wi];
    const ink = COLORS[ci];
    list.push({
      word: w,
      ink: ink,
      condition: "incongruent",
      correct_key: ink.key,
    });
  }
  return list.sort(() => Math.random() - 0.5);
}

function pushRow(ds, participantId, phase, trialNumber, spec, data) {
  const resp = (data.response || "").toLowerCase();
  const correct = resp === spec.correct_key;
  const rt = data.rt ?? null;
  ds.pushRow({
    participant_id: participantId,
    task_name: "Stroop",
    trial_number: trialNumber,
    phase,
    stimulus: spec.word,
    condition: spec.condition,
    ink_color: spec.ink.name,
    correct_response: spec.correct_key,
    participant_response: resp || "",
    accuracy: correct ? 1 : 0,
    reaction_time_ms: rt,
    omission: data.response == null,
    commission: false,
    fullscreen_active: !!document.fullscreenElement,
  });
}

export function buildStroopTimeline(ctx) {
  const { datastore: ds, participantId, getLang } = ctx;
  const timeline = [];

  timeline.push({
    type: HtmlKeyboardResponse,
    stimulus: () =>
      `<div class="screen-card"><h1>${loc(getLang(), "title")}</h1><p>${loc(getLang(), "instruct")}</p><p class="muted">${loc(getLang(), "practiceStart")}</p></div>`,
    choices: [" ", "Enter"],
  });

  const practiceList = buildTrialList(2, 2);
  for (let i = 0; i < practiceList.length; i++) {
    const spec = practiceList[i];
    const trialIdx = i + 1;
    timeline.push({
      type: HtmlKeyboardResponse,
      stimulus: `<div class="stroop-word" style="color:${spec.ink.css}">${spec.word}</div>`,
      choices: COLORS.map((c) => c.key),
      trial_duration: null,
      response_ends_trial: true,
      data: { phase: "practice" },
      on_finish: function (data) {
        pushRow(ds, participantId, "practice", trialIdx, spec, data);
      },
    });
    timeline.push({
      type: HtmlKeyboardResponse,
      stimulus: "",
      choices: "NO_KEYS",
      trial_duration: 850,
      response_ends_trial: false,
      data: { phase: "practice", blank: true },
    });
  }

  timeline.push({
    type: HtmlKeyboardResponse,
    stimulus: () =>
      `<div class="screen-card"><h1>${loc(getLang(), "title")}</h1><p>${loc(getLang(), "mainStart")}</p></div>`,
    choices: [" ", "Enter"],
  });

  const mainList = buildTrialList(12, 12);
  for (let i = 0; i < mainList.length; i++) {
    const spec = mainList[i];
    const trialIdx = i + 1;
    timeline.push({
      type: HtmlKeyboardResponse,
      stimulus: `<div class="stroop-word" style="color:${spec.ink.css}">${spec.word}</div>`,
      choices: COLORS.map((c) => c.key),
      trial_duration: null,
      response_ends_trial: true,
      data: { phase: "main" },
      on_finish: function (data) {
        pushRow(ds, participantId, "main", trialIdx, spec, data);
      },
    });
    timeline.push({
      type: HtmlKeyboardResponse,
      stimulus: "",
      choices: "NO_KEYS",
      trial_duration: 850,
      response_ends_trial: false,
      data: { phase: "main", blank: true },
    });
  }

  return timeline;
}
