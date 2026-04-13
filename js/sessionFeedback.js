/**
 * Session-end feedback: composite scores (0–100) per area + overall.
 * Norms are illustrative (typical young-adult lab ranges), not clinical diagnosis.
 */

/** Reference means/SDs for z-scores (lower RT / interference / errors = better where noted). */
const NORM = {
  srt_median_rt_ms: { mu: 305, sigma: 52 },
  stroop_interference_ms: { mu: 78, sigma: 42 },
  stroop_accuracy: { mu: 0.93, sigma: 0.07 },
  digit_forward_max: { mu: 6.4, sigma: 1.15 },
  digit_backward_max: { mu: 5.1, sigma: 1.1 },
  gng_commission_rate: { mu: 0.11, sigma: 0.09 },
  gng_omission_rate: { mu: 0.07, sigma: 0.07 },
};

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function zToScore(z) {
  if (z == null || !Number.isFinite(z)) return null;
  return clamp(Math.round(50 + 10 * z), 0, 100);
}

function safeZLowerIsBetter(raw, norm) {
  if (raw == null || !Number.isFinite(raw)) return null;
  return (norm.mu - raw) / norm.sigma;
}

function safeZHigherIsBetter(raw, norm) {
  if (raw == null || !Number.isFinite(raw)) return null;
  return (raw - norm.mu) / norm.sigma;
}

/**
 * @param {object} summaries - datastore.summaries after finalizeSummaries()
 * @param {"en"|"tr"} lang
 */
export function buildSessionFeedback(summaries, lang) {
  const S = summaries || {};
  const tr = lang === "tr";

  const zSpeed = safeZLowerIsBetter(S.SRT?.median_rt_ms, NORM.srt_median_rt_ms);

  const si = S.Stroop?.stroop_interference_ms;
  const accC = S.Stroop?.accuracy_congruent;
  const accI = S.Stroop?.accuracy_incongruent;
  let meanAcc = null;
  if (accC != null && accI != null) meanAcc = (accC + accI) / 2;
  else if (accC != null) meanAcc = accC;
  else if (accI != null) meanAcc = accI;
  const zStroopInt = si != null && Number.isFinite(si) ? safeZLowerIsBetter(si, NORM.stroop_interference_ms) : null;
  const zStroopAcc = meanAcc != null ? safeZHigherIsBetter(meanAcc, NORM.stroop_accuracy) : null;
  let zStroop = null;
  const stroopParts = [zStroopInt, zStroopAcc].filter((z) => z != null && Number.isFinite(z));
  if (stroopParts.length) zStroop = stroopParts.reduce((a, b) => a + b, 0) / stroopParts.length;

  const zDigF = safeZHigherIsBetter(S.DigitSpan?.forward_max_span, NORM.digit_forward_max);
  const zDigB = safeZHigherIsBetter(S.DigitSpan?.backward_max_span, NORM.digit_backward_max);
  let zMemory = null;
  const digParts = [zDigF, zDigB].filter((z) => z != null && Number.isFinite(z));
  if (digParts.length) zMemory = digParts.reduce((a, b) => a + b, 0) / digParts.length;

  const zComm = safeZLowerIsBetter(S.GoNoGo?.commission_rate, NORM.gng_commission_rate);
  const zOm = safeZLowerIsBetter(S.GoNoGo?.omission_rate, NORM.gng_omission_rate);
  let zControl = null;
  const gngParts = [zComm, zOm].filter((z) => z != null && Number.isFinite(z));
  if (gngParts.length) zControl = gngParts.reduce((a, b) => a + b, 0) / gngParts.length;

  const compositeParts = [zSpeed, zStroop, zMemory, zControl].filter((z) => z != null && Number.isFinite(z));
  const zOverall =
    compositeParts.length > 0 ? compositeParts.reduce((a, b) => a + b, 0) / compositeParts.length : null;

  const overallScore = zOverall != null ? zToScore(zOverall) : null;

  const domains = [
    {
      key: "speed",
      label: tr ? "Tepki hızı (basit RT)" : "Reaction speed (simple RT)",
      score: zToScore(zSpeed),
      z: zSpeed,
    },
    {
      key: "stroop",
      label: tr ? "Dikkat / çatışma (Stroop)" : "Attention / conflict (Stroop)",
      score: zToScore(zStroop),
      z: zStroop,
    },
    {
      key: "memory",
      label: tr ? "Çalışan bellek (rakam dizisi)" : "Working memory (digit span)",
      score: zToScore(zMemory),
      z: zMemory,
    },
    {
      key: "control",
      label: tr ? "Dürtü kontrolü (Git / Gitme)" : "Impulse control (Go / No-Go)",
      score: zToScore(zControl),
      z: zControl,
    },
  ];

  const mainParagraph = buildScoreComment(tr);

  return {
    version: 1,
    norm_note:
      tr
        ? "Skorlar araştırma amaçlı kabaca karşılaştırmadır; tıbbi tanı veya zeka ölçümü değildir."
        : "Scores are rough research comparisons—not a medical or IQ diagnosis.",
    overall: {
      score: overallScore,
      z: zOverall,
    },
    domains,
    mainParagraph,
    disclaimer:
      tr
        ? "Bu özet yalnızca genel geri bildirim içindir. Sonuçlar ruh sağlığı veya öğrenme güçlüğü tanısı için kullanılamaz."
        : "This summary is for general feedback only. It cannot diagnose learning or mental health conditions.",
  };
}

/** Short neutral line on what the scores mean (not tips—context for the numbers). */
function buildScoreComment(tr) {
  return tr
    ? "Aşağıdaki sayılar araştırma amaçlı kabaca bir karşılaştırmadır; günlük başarınızı veya kişiliğinizi ölçmez."
    : "The figures below are rough research comparisons—they do not measure your worth or everyday ability.";
}

/**
 * Escape text for HTML text content
 */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderFeedbackPanelHTML(feedback, lang) {
  if (!feedback) return "";
  const tr = lang === "tr";
  const h = (s) => esc(s);

  const overall = feedback.overall;
  const scoreLabel = tr ? "Genel skor (0–100)" : "Overall score (0–100)";
  const domainTitle = tr ? "Görevlere göre skor" : "Scores by task area";
  const what = tr ? "Özet skorlar" : "Summary scores";

  const rows = feedback.domains
    .map((d) => {
      const sc = d.score != null ? `${d.score}` : "—";
      return `<tr><td>${h(d.label)}</td><td class="num">${sc}</td></tr>`;
    })
    .join("");

  return `
    <div class="feedback-panel" role="region" aria-label="${h(what)}">
      <p class="feedback-disclaimer">${h(feedback.disclaimer)}</p>
      <p class="feedback-norm muted">${h(feedback.norm_note)}</p>
      <div class="feedback-hero">
        <div class="feedback-stat">
          <span class="feedback-stat-label">${h(scoreLabel)}</span>
          <span class="feedback-stat-value">${overall.score != null ? overall.score : "—"}</span>
        </div>
      </div>
      <p class="feedback-main">${h(feedback.mainParagraph)}</p>
      <h2 class="feedback-h2">${h(domainTitle)}</h2>
      <table class="feedback-table">
        <thead><tr><th>${tr ? "Alan" : "Area"}</th><th>${tr ? "Skor" : "Score"}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
