/** Digit span forward/backward; adaptive; two failures at same length ends block */
import HtmlKeyboardResponse from "https://esm.sh/@jspsych/plugin-html-keyboard-response@2.1.0";
import CallFunctionPlugin from "https://esm.sh/@jspsych/plugin-call-function@2.1.0";
import { randomInt } from "../utils.js";

const MIN_LEN = 3;
const MAX_LEN = 9;

const TXT = {
  en: {
    title: "Digit Span",
    fwdInstruct: `Digits appear one per second. Then type them in the <strong>same order</strong> and press <kbd>Enter</kbd>.`,
    bwdInstruct: `Type the digits in <strong>reverse order</strong>, then press <kbd>Enter</kbd>.`,
    practiceFwd: "Practice forward (1 short sequence). Press Space or Enter to begin.",
    practiceBwd: "Practice backward (1 short sequence). Press Space or Enter to begin.",
    testFwd: "Forward span (adaptive). Press Space or Enter to begin.",
    testBwd: "Backward span (adaptive). Press Space or Enter to begin.",
    hintLongTask:
      "Two tries at each length (3–9 digits). If you miss both at one length, that block ends. Type digits only, then Enter. Progress shows length and try (1/2).",
    progressFwd: "Forward · length {L} · trial {a}/{m}",
    progressBwd: "Backward · length {L} · trial {a}/{m}",
    practiceTag: "(practice)",
    submitDigits: "Submit (Enter)",
  },
  tr: {
    title: "Sayı Uzunluğu",
    fwdInstruct: `Rakamlar saniyede bir gösterilir. Ardından <strong>aynı sırayla</strong> yazın ve <kbd>Enter</kbd> tuşuna basın.`,
    bwdInstruct: `Rakamları <strong>ters sırayla</strong> yazın ve <kbd>Enter</kbd> tuşuna basın.`,
    practiceFwd: "İleri alıştırma (1 kısa dizi). Başlamak için Boşluk veya Enter tuşuna basın.",
    practiceBwd: "Geri alıştırma (1 kısa dizi). Başlamak için Boşluk veya Enter tuşuna basın.",
    testFwd: "İleri aralık (uyarlanır). Başlamak için Boşluk veya Enter tuşuna basın.",
    testBwd: "Geri aralık (uyarlanır). Başlamak için Boşluk veya Enter tuşuna basın.",
    hintLongTask:
      "Her uzunlukta (3–9 rakam) 2 deneme var. Aynı uzunlukta iki kez hata yapılırsa o bölüm biter. Sadece rakamları yazıp Enter’a basın. Üstte uzunluk ve deneme (1/2) görünür.",
    progressFwd: "İleri · uzunluk {L} · deneme {a}/{m}",
    progressBwd: "Geri · uzunluk {L} · deneme {a}/{m}",
    practiceTag: "(alıştırma)",
    submitDigits: "Gönder (Enter)",
  },
};

function loc(lang, key) {
  return TXT[lang === "tr" ? "tr" : "en"][key];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomSequence(len) {
  const out = [];
  for (let i = 0; i < len; i++) {
    let d = randomInt(1, 9);
    if (i > 0 && d === out[i - 1]) d = (d % 9) + 1;
    out.push(d);
  }
  return out;
}

function normalizeResponse(s) {
  return String(s || "").replace(/\D/g, "");
}

function pushRow(ds, participantId, row) {
  ds.pushRow({
    participant_id: participantId,
    task_name: "DigitSpan",
    fullscreen_active: !!document.fullscreenElement,
    ...row,
  });
}

function mountStage(root, innerHtml) {
  root.innerHTML = `<div class="digit-span-stage">${innerHtml}</div>`;
}

function progressLine(lang, backward, L, attempt1based, phase, maxAttempts = 2) {
  const key = backward ? "progressBwd" : "progressFwd";
  let s = loc(lang, key)
    .replace("{L}", String(L))
    .replace("{a}", String(attempt1based))
    .replace("{m}", String(maxAttempts));
  if (phase === "practice") s += " " + loc(lang, "practiceTag");
  return s;
}

async function playSequence(root, seq, progressHtml) {
  const areaId = "digit-flash-area";
  mountStage(
    root,
    `<p class="digit-progress muted" aria-live="polite">${progressHtml}</p><div id="${areaId}" class="digit-flash-area"></div>`
  );
  const area = root.querySelector("#" + areaId);
  for (let i = 0; i < seq.length; i++) {
    const d = seq[i];
    if (area) area.innerHTML = `<div class="digit-flash" aria-label="digit">${d}</div><p class="digit-index muted">${i + 1}/${seq.length}</p>`;
    await sleep(1000);
  }
  if (area) area.innerHTML = '<p class="muted">+</p>';
  await sleep(750);
}

function readDigits(root, promptHtml, lang) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (val) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKey, true);
      resolve(val);
    };
    mountStage(
      root,
      `<form class="screen-card digit-entry-form" id="dsform" action="javascript:void 0">
        <p>${promptHtml}</p>
        <input name="digits" id="dsinp" type="text" inputmode="numeric" autocomplete="off" style="font-size:1.25rem;padding:0.35rem 0.5rem;width:min(22rem,90vw)" />
        <p class="actions" style="margin-top:0.75rem"><button type="submit" class="btn btn-primary">${loc(lang, "submitDigits")}</button></p>
      </form>`
    );
    const inp = document.getElementById("dsinp");
    const form = document.getElementById("dsform");
    if (inp) inp.focus();
    const onKey = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        finish(inp ? inp.value : "");
      }
    };
    document.addEventListener("keydown", onKey, true);
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const el = document.getElementById("dsinp");
        finish(el ? el.value : "");
      });
    }
  });
}

async function runDigitSpanBlock(ctx, opts) {
  const { jsPsych, datastore: ds, participantId, getLang, trialCounter } = ctx;
  const root = jsPsych.getDisplayElement();
  if (!root) return;

  const backward = opts.backward;
  const phase = opts.phase;
  const subtask = backward ? "backward" : "forward";
  const promptHtml = backward ? loc(getLang(), "bwdInstruct") : loc(getLang(), "fwdInstruct");
  const progressDenom = opts.progressDenom ?? (opts.fixedLength != null ? 1 : 2);

  const runOne = async (L, attempt1based) => {
    const seq = randomSequence(L);
    const expected = backward ? [...seq].reverse().join("") : seq.join("");
    const label = progressLine(getLang(), backward, L, attempt1based, phase, progressDenom);
    await playSequence(root, seq, label);
    const raw = await readDigits(root, promptHtml, getLang());
    const resp = normalizeResponse(raw);
    const correct = resp === expected;
    const tn = trialCounter.n++;
    pushRow(ds, participantId, {
      trial_number: tn,
      phase,
      subtask,
      span_length: L,
      stimulus: seq.join(""),
      condition: subtask,
      correct_response: expected,
      participant_response: resp,
      accuracy: correct ? 1 : 0,
      reaction_time_ms: null,
      omission: resp.length === 0,
      commission: false,
    });
    return correct;
  };

  if (opts.fixedLength != null) {
    await runOne(opts.fixedLength, 1);
    return;
  }

  for (let L = MIN_LEN; L <= MAX_LEN; L++) {
    let fails = 0;
    for (let a = 0; a < 2; a++) {
      const ok = await runOne(L, a + 1);
      if (!ok) fails++;
      if (fails >= 2) return;
    }
  }
}

function clearDigitSpanDisplay(jsPsych) {
  const el = jsPsych.getDisplayElement();
  if (el) el.innerHTML = "";
}

export function buildDigitSpanTimeline(ctx) {
  const { getLang } = ctx;
  const trialCounter = { n: 1 };
  const blockCtx = { ...ctx, trialCounter };
  const timeline = [];

  timeline.push({
    type: HtmlKeyboardResponse,
    stimulus: () =>
      `<div class="screen-card"><h1>${loc(getLang(), "title")}</h1><p>${loc(getLang(), "fwdInstruct")}</p><p class="muted">${loc(getLang(), "hintLongTask")}</p><p class="muted">${loc(getLang(), "practiceFwd")}</p></div>`,
    choices: [" ", "Enter"],
  });

  timeline.push({
    type: CallFunctionPlugin,
    async: true,
    func: function (done) {
      const j = blockCtx.jsPsych;
      runDigitSpanBlock(blockCtx, { backward: false, phase: "practice", fixedLength: 3 })
        .then(() => {
          clearDigitSpanDisplay(j);
          done();
        })
        .catch(() => {
          clearDigitSpanDisplay(j);
          done();
        });
    },
  });

  timeline.push({
    type: HtmlKeyboardResponse,
    stimulus: () =>
      `<div class="screen-card"><h1>${loc(getLang(), "title")}</h1><p>${loc(getLang(), "bwdInstruct")}</p><p class="muted">${loc(getLang(), "practiceBwd")}</p></div>`,
    choices: [" ", "Enter"],
  });

  timeline.push({
    type: CallFunctionPlugin,
    async: true,
    func: function (done) {
      const j = blockCtx.jsPsych;
      runDigitSpanBlock(blockCtx, { backward: true, phase: "practice", fixedLength: 3 })
        .then(() => {
          clearDigitSpanDisplay(j);
          done();
        })
        .catch(() => {
          clearDigitSpanDisplay(j);
          done();
        });
    },
  });

  timeline.push({
    type: HtmlKeyboardResponse,
    stimulus: () =>
      `<div class="screen-card"><h1>${loc(getLang(), "title")}</h1><p class="muted">${loc(getLang(), "hintLongTask")}</p><p class="muted">${loc(getLang(), "testFwd")}</p></div>`,
    choices: [" ", "Enter"],
  });

  timeline.push({
    type: CallFunctionPlugin,
    async: true,
    func: function (done) {
      const j = blockCtx.jsPsych;
      runDigitSpanBlock(blockCtx, { backward: false, phase: "main" })
        .then(() => {
          clearDigitSpanDisplay(j);
          done();
        })
        .catch(() => {
          clearDigitSpanDisplay(j);
          done();
        });
    },
  });

  timeline.push({
    type: HtmlKeyboardResponse,
    stimulus: () =>
      `<div class="screen-card"><h1>${loc(getLang(), "title")}</h1><p>${loc(getLang(), "bwdInstruct")}</p><p class="muted">${loc(getLang(), "hintLongTask")}</p><p class="muted">${loc(getLang(), "testBwd")}</p></div>`,
    choices: [" ", "Enter"],
  });

  timeline.push({
    type: CallFunctionPlugin,
    async: true,
    func: function (done) {
      const j = blockCtx.jsPsych;
      runDigitSpanBlock(blockCtx, { backward: true, phase: "main" })
        .then(() => {
          clearDigitSpanDisplay(j);
          done();
        })
        .catch(() => {
          clearDigitSpanDisplay(j);
          done();
        });
    },
  });

  return timeline;
}
