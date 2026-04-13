/**
 * Dev-only: jump to the first trial of the *next* task block (one block per button press).
 * Uses a bounded number of finishTrial calls (targetIndex - currentIndex) — never the whole timeline.
 */

const DEV_SKIP_PASSWORD = "KHAS";

let devSkipRunning = false;

/** Delay between finishTrial calls so jsPsych (incl. async CallFunction) can advance cleanly. */
const MS_BETWEEN_SKIPS = 52;

/**
 * @param {object} jsPsych
 * @param {number} targetGlobalIndex - first trial index of the next segment (from milestones)
 * @param {object} [opts]
 * @param {() => void} [opts.onDone] - always invoked when the skip sequence ends (success, error, or early exit)
 */
export function skipToGlobalTrialIndex(jsPsych, targetGlobalIndex, opts = {}) {
  const onDone = typeof opts.onDone === "function" ? opts.onDone : () => {};

  if (devSkipRunning) {
    return;
  }

  if (!Number.isFinite(targetGlobalIndex)) {
    onDone();
    return;
  }

  let cur;
  try {
    cur = jsPsych.getProgress().current_trial_global;
  } catch {
    onDone();
    return;
  }

  if (targetGlobalIndex <= cur) {
    onDone();
    return;
  }

  /** Exact number of trials to finish to land on `targetGlobalIndex`. */
  const maxFinishes = targetGlobalIndex - cur;
  if (maxFinishes <= 0 || maxFinishes > 600) {
    onDone();
    return;
  }

  devSkipRunning = true;
  let finishes = 0;

  function finishSequence() {
    devSkipRunning = false;
    onDone();
  }

  function tick() {
    if (finishes >= maxFinishes) {
      finishSequence();
      return;
    }

    let before;
    try {
      before = jsPsych.getProgress().current_trial_global;
    } catch {
      finishSequence();
      return;
    }

    if (before >= targetGlobalIndex) {
      finishSequence();
      return;
    }

    try {
      jsPsych.finishTrial({ dev_skip_to_next_task: true });
      finishes++;
    } catch {
      finishSequence();
      return;
    }

    if (finishes >= maxFinishes) {
      finishSequence();
      return;
    }

    setTimeout(tick, MS_BETWEEN_SKIPS);
  }

  tick();
}

/**
 * @param {number[]} milestones - global indices of first trial of each segment (SRT, Stroop, …)
 * @param {number} currentGlobal
 * @returns {number|null}
 */
export function getNextTestStartIndex(milestones, currentGlobal) {
  if (!Number.isFinite(currentGlobal)) return null;
  const next = milestones.find((m) => Number.isFinite(m) && m > currentGlobal);
  return next !== undefined ? next : null;
}

export { DEV_SKIP_PASSWORD };
