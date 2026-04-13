const PARTICIPANT_CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** 6-char participant code for logs/forms */
export function createParticipantId() {
  const n = 6;
  const buf = new Uint8Array(n);
  try {
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(buf);
    else throw new Error("no crypto");
  } catch {
    for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  let s = "";
  for (let i = 0; i < n; i++) s += PARTICIPANT_CODE_CHARS[buf[i] % PARTICIPANT_CODE_CHARS.length];
  return s;
}

export function isMobileOrTablet() {
  const ua = navigator.userAgent || "";
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const narrow = window.innerWidth < 900;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  return uaMobile || (coarsePointer && narrow);
}

export function getBrowserName() {
  const ua = navigator.userAgent || "";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "Chrome";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  return "Other";
}

export function getDeviceType() {
  const ua = navigator.userAgent || "";
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  if (isMobileOrTablet()) return "mobile";
  return "desktop_laptop";
}

export function getTestingBlock() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : "afternoon";
}

export function buildSessionMetadata(participantId) {
  return {
    participant_id: participantId,
    session_start_iso: new Date().toISOString(),
    testing_block: getTestingBlock(),
    device_type: getDeviceType(),
    browser: getBrowserName(),
    user_agent: navigator.userAgent,
    screen_width: window.screen?.width,
    screen_height: window.screen?.height,
    window_inner_width: window.innerWidth,
    window_inner_height: window.innerHeight,
    language_ui: (typeof document !== "undefined" && document.documentElement.lang) || "en",
  };
}

export function requestFullscreenBestEffort() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (typeof req === "function") {
    return req.call(el).catch(() => {});
  }
  return Promise.resolve();
}

export function exitFullscreenBestEffort() {
  if (document.fullscreenElement && document.exitFullscreen) {
    return document.exitFullscreen().catch(() => {});
  }
  return Promise.resolve();
}
