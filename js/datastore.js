/** Trial rows, summaries, CSV/JSON export */
import { coefficientOfVariation, mean, median, standardDeviation } from "./utils.js";

const ANTICIPATORY_MS = 150;

export class Datastore {
  constructor() {
    /** @type {object[]} */
    this.rows = [];
    this.sessionMeta = {};
    this.summaries = {};
    /** @type {object|null} session-end feedback (scores, tips); set in app after summaries */
    this.feedbackReport = null;
  }

  setSessionMeta(meta) {
    this.sessionMeta = { ...meta };
  }

  pushRow(row) {
    const base = {
      timestamp: new Date().toISOString(),
      ...row,
    };
    this.rows.push(base);
  }

  computeDataQuality() {
    const byTask = {};
    for (const r of this.rows) {
      const t = r.task_name || "unknown";
      if (!byTask[t]) byTask[t] = [];
      byTask[t].push(r);
    }

    const flags = [];
    const srt = byTask["SRT"]?.filter((x) => x.phase === "main") || [];
    const srtOmissions = srt.filter((x) => x.omission).length;
    const srtTotal = srt.length;
    if (srtTotal > 0 && srtOmissions / srtTotal > 0.3) {
      flags.push({ code: "high_omission_rate", task: "SRT", rate: srtOmissions / srtTotal });
    }

    return {
      anticipatory_threshold_ms: ANTICIPATORY_MS,
      flags,
    };
  }

  finalizeSummaries() {
    this.summaries = {
      SRT: summarizeSRT(this.rows),
      Stroop: summarizeStroop(this.rows),
      DigitSpan: summarizeDigitSpan(this.rows),
      GoNoGo: summarizeGoNoGo(this.rows),
      data_quality: this.computeDataQuality(),
    };
    return this.summaries;
  }

  toJSONString() {
    const out = {
      session: this.sessionMeta,
      summaries: this.summaries,
      trials: this.rows,
    };
    if (this.feedbackReport) out.feedback_report = this.feedbackReport;
    return JSON.stringify(out, null, 2);
  }

  toCSVString() {
    if (!this.rows.length) return "participant_id,task_name\n";
    const keys = Array.from(
      this.rows.reduce((set, row) => {
        Object.keys(row).forEach((k) => set.add(k));
        return set;
      }, new Set())
    );
    keys.sort();
    const esc = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [keys.join(",")];
    for (const row of this.rows) {
      lines.push(keys.map((k) => esc(row[k])).join(","));
    }
    return lines.join("\n");
  }

  /** Human-readable CSV; UTF-8 BOM for Excel */
  toHumanTrialsCSV(lang) {
    const tr = lang === "tr";
    const cols = [
      { k: "participant_id", h: tr ? "katilimci_kodu" : "participant_code" },
      { k: "timestamp", h: tr ? "kayit_zamani" : "record_time_utc" },
      { k: "task_name", h: tr ? "gorev" : "task" },
      { k: "phase", h: tr ? "faz" : "phase" },
      { k: "trial_number", h: tr ? "deneme_no" : "trial_number" },
      { k: "stimulus", h: tr ? "gosterilen_ekranda" : "stimulus_shown" },
      { k: "correct_response", h: tr ? "beklenen_dogru_yanit" : "expected_answer" },
      { k: "participant_response", h: tr ? "yazdiginiz_yanit" : "typed_response" },
      { k: "condition", h: tr ? "kosul" : "condition" },
      { k: "accuracy", h: tr ? "dogru_mu_0_1" : "correct_0_1" },
      { k: "reaction_time_ms", h: tr ? "tepki_suresi_ms" : "reaction_time_ms" },
      { k: "omission", h: tr ? "atlama_evet_hayir" : "omission" },
      { k: "anticipatory", h: tr ? "cok_erken_tepki" : "anticipatory" },
      { k: "commission", h: tr ? "nogo_yanlis_baslama" : "commission_false_alarm" },
      { k: "ink_color", h: tr ? "murekkep_rengi" : "ink_color" },
      { k: "subtask", h: tr ? "sayi_gorevi_ileri_geri" : "digit_subtask_fwd_bwd" },
      { k: "span_length", h: tr ? "rakam_sayisi_uzunluk" : "n_digits_span" },
      { k: "stim_duration_ms", h: tr ? "uyaran_gosterim_ms" : "stim_duration_ms" },
      { k: "soa_ms", h: tr ? "soa_ms" : "soa_ms" },
      { k: "fullscreen_active", h: tr ? "tam_ekran" : "fullscreen" },
    ];
    if (!this.rows.length) {
      return "\uFEFF" + cols.map((c) => c.h).join(",");
    }
    const esc = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [cols.map((c) => c.h).join(",")];
    for (const row of this.rows) {
      lines.push(cols.map((c) => esc(row[c.k])).join(","));
    }
    return "\uFEFF" + lines.join("\n");
  }

  download(filename, mime, body) {
    const blob = new Blob([body], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}

function summarizeSRT(rows) {
  const main = rows.filter((r) => r.task_name === "SRT" && r.phase === "main");
  const rts = main
    .filter(
      (r) =>
        !r.omission &&
        Number.isFinite(r.reaction_time_ms) &&
        r.reaction_time_ms >= ANTICIPATORY_MS
    )
    .map((r) => r.reaction_time_ms);
  const omissions = main.filter((r) => r.omission).length;
  const anticipatory = main.filter(
    (r) => Number.isFinite(r.reaction_time_ms) && r.reaction_time_ms < ANTICIPATORY_MS
  ).length;
  return {
    median_rt_ms: median(rts),
    sd_rt_ms: standardDeviation(rts),
    cv_rt: coefficientOfVariation(rts),
    omissions: omissions,
    anticipatory_responses: anticipatory,
    n_trials: main.length,
    n_valid_rt: rts.length,
  };
}

function summarizeStroop(rows) {
  const main = rows.filter((r) => r.task_name === "Stroop" && r.phase === "main");
  const cong = main.filter((r) => r.condition === "congruent");
  const incong = main.filter((r) => r.condition === "incongruent");
  const rtCong = cong
    .filter(
      (r) =>
        (r.accuracy === 1 || r.accuracy === true) &&
        Number.isFinite(r.reaction_time_ms) &&
        r.reaction_time_ms >= ANTICIPATORY_MS
    )
    .map((r) => r.reaction_time_ms);
  const rtIncong = incong
    .filter(
      (r) =>
        (r.accuracy === 1 || r.accuracy === true) &&
        Number.isFinite(r.reaction_time_ms) &&
        r.reaction_time_ms >= ANTICIPATORY_MS
    )
    .map((r) => r.reaction_time_ms);
  const medC = median(rtCong);
  const medI = median(rtIncong);
  const accC = cong.length ? cong.filter((r) => r.accuracy === 1 || r.accuracy === true).length / cong.length : null;
  const accI = incong.length
    ? incong.filter((r) => r.accuracy === 1 || r.accuracy === true).length / incong.length
    : null;
  return {
    median_rt_congruent_ms: medC,
    median_rt_incongruent_ms: medI,
    stroop_interference_ms:
      medC !== null && medI !== null ? medI - medC : null,
    accuracy_congruent: accC,
    accuracy_incongruent: accI,
    n_congruent: cong.length,
    n_incongruent: incong.length,
  };
}

function summarizeDigitSpan(rows) {
  const fwd = rows.filter((r) => r.task_name === "DigitSpan" && r.subtask === "forward" && r.phase === "main");
  const bwd = rows.filter((r) => r.task_name === "DigitSpan" && r.subtask === "backward" && r.phase === "main");
  const fwdOk = fwd.filter((r) => r.accuracy === 1 || r.accuracy === true);
  const bwdOk = bwd.filter((r) => r.accuracy === 1 || r.accuracy === true);
  return {
    forward_max_span: maxOf(fwdOk.map((r) => r.span_length).filter((x) => Number.isFinite(x))),
    forward_correct_sequences: fwdOk.length,
    backward_max_span: maxOf(bwdOk.map((r) => r.span_length).filter((x) => Number.isFinite(x))),
    backward_correct_sequences: bwdOk.length,
  };
}

function maxOf(arr) {
  if (!arr.length) return null;
  return Math.max(...arr);
}

function summarizeGoNoGo(rows) {
  const main = rows.filter((r) => r.task_name === "GoNoGo" && r.phase === "main");
  const go = main.filter((r) => r.condition === "go");
  const nogo = main.filter((r) => r.condition === "nogo");
  const goRts = go
    .filter(
      (r) =>
        !r.omission &&
        Number.isFinite(r.reaction_time_ms) &&
        r.reaction_time_ms >= ANTICIPATORY_MS
    )
    .map((r) => r.reaction_time_ms);
  const omissions = go.filter((r) => r.omission).length;
  const commissions = nogo.filter((r) => r.commission).length;
  return {
    mean_rt_go_ms: mean(goRts),
    median_rt_go_ms: median(goRts),
    sd_rt_go_ms: standardDeviation(goRts),
    rt_variability_sd_ms: standardDeviation(goRts),
    omission_rate: go.length ? omissions / go.length : null,
    commission_rate: nogo.length ? commissions / nogo.length : null,
    omissions: omissions,
    commissions: commissions,
    n_go: go.length,
    n_nogo: nogo.length,
  };
}

export { ANTICIPATORY_MS };
