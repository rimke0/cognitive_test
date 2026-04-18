/**
 * Stroop color-word task: congruent vs incongruent.
 *
 * English mapping:
 *   R = Red, B = Blue, G = Green, Y = Yellow
 * Turkish mapping:
 *   K = Kırmızı, M = Mavi, Y = Yeşil, S = Sarı
 */
import HtmlKeyboardResponse from "https://esm.sh/@jspsych/plugin-html-keyboard-response@2.1.0";

function getStroopConfig(lang) {
  if (lang === "tr") {
    return {
      words: ["KIRMIZI", "MAVI", "YESIL", "SARI"],
      colors: [
        { name: "red", label: "Kırmızı", css: "#c0392b", key: "k" },
        { name: "blue", label: "Mavi", css: "#2980b9", key: "m" },
        { name: "green", label: "Yeşil", css: "#27ae60", key: "y" },
        { name: "yellow", label: "Sarı", css: "#f39c12", key: "s" },
      ],
    };
  }

  return {
    words: ["RED", "BLUE", "GREEN", "YELLOW"],
    colors: [
      { name: "red", label: "Red", css: "#c0392b", key: "r" },
      { name: "blue", label: "Blue", css: "#2980b9", key: "b" },
      { name: "green", label: "Green", css: "#27ae60", key: "g" },
      { name: "yellow", label: "Yellow", css: "#f39c12", key: "y" },
    ],
  };
}

function getTexts(lang) {
  const cfg = getStroopConfig(lang);
  const keyGuide = cfg.colors
    .map((c) => `<kbd>${c.key.toUpperCase()}</kbd> = ${c.label}`)
    .join(" &nbsp; ");

  return {
    title: lang === "tr" ? "Renk–Kelime Görevi (Stroop)" : "Color–Word Task (Stroop)",
    instruct:
      lang === "tr"
        ? `Renkli bir kelime göreceksiniz. <em>Kelimenin anlamını</em> değil, <strong>mürekkep rengini</strong> seçin:<br><br>${keyGuide}<br><br>Mümkün olduğunca hızlı ve doğru yanıt verin.`
        : `You will see a color word. Ignore the <em>word meaning</em> and choose the <strong>ink color</strong> using keys:<br><br>${keyGuide}<br><br>Respond as quickly and accurately as possible.`,
    practiceStart:
      lang === "tr"
        ? "Alıştırma (4 deneme). Başlamak için Boşluk veya Enter tuşuna basın."
        : "Practice (4 trials). Press Space or Enter to begin.",
    mainStart:
      lang === "tr"
        ? "Ana görev (24 deneme). Başlamak için Boşluk veya Enter tuşuna basın."
        : "Main task (24 trials). Press Space or Enter to begin.",
  };
}

function buildTrialList(words, colors, nCongruent, nIncongruent) {
  const list = [];

  for (let i = 0; i < nCongruent; i++) {
    const idx = Math.floor(Math.random() * colors.length);
    const w = words[idx];
    const ink = colors[idx];
    list.push({
      word: w,
      ink,
      condition: "congruent",
      correct_key: ink.key,
    });
  }

  for (let i = 0; i < nIncongruent; i++) {
    let wi = Math.floor(Math.random() * words.length);
    let ci = Math.floor(Math.random() * colors.length);

    while (wi === ci) {
      wi = Math.floor(Math.random() * words.length);
      ci = Math.floor(Math.random() * colors.length);
    }

    const w = words[wi];
    const ink = colors[ci];
    list.push({
      word: w,
      ink,
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

  const lang = getLang();
  const cfg = getStroopConfig(lang);
  const txt = getTexts(lang);

  timeline.push({
    type: HtmlKeyboardResponse,
    stimulus: () =>
      `<div class="screen-card"><h1>${txt.title}</h1><p>${txt.instruct}</p><p class="muted">${txt.practiceStart}</p></div>`,
    choices: [" ", "Enter"],
  });

  const practiceList = buildTrialList(cfg.words, cfg.colors, 2, 2);
  for (let i = 0; i < practiceList.length; i++) {
    const spec = practiceList[i];
    const trialIdx = i + 1;
    timeline.push({
      type: HtmlKeyboardResponse,
      stimulus: `<div class="stroop-word" style="color:${spec.ink.css}">${spec.word}</div>`,
      choices: cfg.colors.map((c) => c.key),
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
      `<div class="screen-card"><h1>${txt.title}</h1><p>${txt.mainStart}</p></div>`,
    choices: [" ", "Enter"],
  });

  const mainList = buildTrialList(cfg.words, cfg.colors, 12, 12);
  for (let i = 0; i < mainList.length; i++) {
    const spec = mainList[i];
    const trialIdx = i + 1;
    timeline.push({
      type: HtmlKeyboardResponse,
      stimulus: `<div class="stroop-word" style="color:${spec.ink.css}">${spec.word}</div>`,
      choices: cfg.colors.map((c) => c.key),
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
