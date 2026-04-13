/** UI strings (EN/TR); task copy lives in task modules */

const STRINGS = {
  en: {
    studyTitle: "Cognitive assessment (research)",
    langToggle: "Türkçe",
    participantIdLabel: "Participant code (write this on your form)",
    participantIdHint: "This short code is unique for this session.",
    blockLabel: "Testing block (auto)",
    blockMorning: "morning",
    blockAfternoon: "afternoon",
    mobileBlockedTitle: "Desktop or laptop required",
    mobileBlockedBody:
      "This study must be completed on a desktop or laptop with a physical keyboard. Please switch devices to continue.",
    consentTitle: "Informed consent",
    consentBody: `You are invited to take part in a research study on cognitive performance. Participation is voluntary. You may withdraw at any time by closing the browser or pressing Escape when prompted; partial data may still be saved up to that point.

Your responses are stored under an anonymous ID. Do not include your name in any text field.

By continuing, you confirm that you are between 16 and 21 years old (or meet your site's inclusion criteria) and agree to participate.`,
    consentAgree: "I agree and wish to continue",
    consentDecline: "I do not agree",
    withdrawHint: "You may press Escape during tasks to withdraw (you will be asked to confirm).",
    withdrawConfirm: "Withdraw from the study? Partial data may already be saved.",
    fullscreenPrompt:
      "The next screens will use fullscreen to reduce distractions. Press Space or Enter to enter fullscreen and continue.",
    blockProgress: "Task",
    of: "of",
    breakTitle: "Short break",
    breakBody: "Take a short break. Press Space or Enter when you are ready to continue.",
    debriefTitle: "Debriefing",
    debriefBody: `Thank you for participating. This study examines how sleep, screen use, stress, and caffeine relate to attention, speed, and memory on brief computer tasks.

If you have questions about this research, contact your principal investigator.`,
    downloadCsv: "Download CSV (trials, Excel-friendly)",
    downloadJson: "Download JSON (full session)",
    downloadSummary: "Download summary (JSON)",
    exportNote: "",
    declined: "You chose not to participate. You may close this window.",
    withdrewTitle: "Session ended",
    withdrewBody: "You withdrew from the study. Partial data may have been saved if trials were completed.",
    continue: "Continue",
    continueKeys: "Space or Enter",
    back: "Back",
    taskSRT: "Simple reaction time",
    taskStroop: "Stroop",
    taskDigit: "Digit span",
    taskCPT: "Go / No-Go",
  },
  tr: {
    studyTitle: "Bilişsel değerlendirme (araştırma)",
    langToggle: "English",
    participantIdLabel: "Katılımcı kodu (formunuza yazın)",
    participantIdHint: "Bu kısa kod bu oturuma özeldir.",
    blockLabel: "Ölçüm zamanı (otomatik)",
    blockMorning: "sabah",
    blockAfternoon: "öğleden sonra",
    mobileBlockedTitle: "Masaüstü veya dizüstü bilgisayar gerekli",
    mobileBlockedBody:
      "Bu çalışma, fiziksel klavyeli bir masaüstü veya dizüstü bilgisayarda tamamlanmalıdır. Devam etmek için lütfen cihazınızı değiştirin.",
    consentTitle: "Bilgilendirilmiş onay",
    consentBody: `Bu araştırmaya katılmanız istenmektedir; katılım gönüllülük esasına dayanır. İstediğiniz zaman tarayıcıyı kapatarak veya istendiğinde Escape tuşuna basarak çekilebilirsiniz; bu noktaya kadar kısmi veriler kaydedilmiş olabilir.

Yanıtlarınız anonim bir kimlikle saklanır. Herhangi bir metin alanına adınızı yazmayın.

Devam ederek, 16–21 yaş aralığında olduğunuzu (veya kurumunuzun ölçütlerini karşıladığınızı) ve katılmayı kabul ettiğinizi onaylarsınız.`,
    consentAgree: "Okudum, kabul ediyorum ve devam etmek istiyorum",
    consentDecline: "Kabul etmiyorum",
    withdrawHint: "Görevler sırasında çekilmek için Escape tuşuna basabilirsiniz (onay istenecektir).",
    withdrawConfirm: "Çalışmadan çekilmek istiyor musunuz? Kısmi veri zaten kaydedilmiş olabilir.",
    fullscreenPrompt:
      "Dikkat dağılımını azaltmak için sonraki ekranlar tam ekran kullanacaktır. Tam ekrana geçmek ve devam etmek için Boşluk veya Enter tuşuna basın.",
    blockProgress: "Görev",
    of: "/",
    breakTitle: "Kısa ara",
    breakBody: "Kısa bir ara verin. Devam etmeye hazır olduğunuzda Boşluk veya Enter tuşuna basın.",
    debriefTitle: "Bilgilendirme (son)",
    debriefBody: `Katılımınız için teşekkür ederiz. Bu çalışma, uyku, ekran süresi, stres ve kafeinin kısa bilgisayar görevlerinde dikkat, hız ve bellek üzerindeki olası etkilerini incelemektedir.

Araştırma hakkında sorularınız varsa baş araştırmacınızla iletişime geçin.`,
    downloadCsv: "CSV indir (denemeler, Excel için)",
    downloadJson: "JSON indir (tüm oturum)",
    downloadSummary: "Özet indir (JSON)",
    exportNote: "",
    declined: "Katılmayı seçtiniz. Bu pencereyi kapatabilirsiniz.",
    withdrewTitle: "Oturum sona erdi",
    withdrewBody: "Çalışmadan çekildiniz. Tamamlanan denemeler varsa kısmi veri kaydedilmiş olabilir.",
    continue: "Devam",
    continueKeys: "Boşluk veya Enter",
    back: "Geri",
    taskSRT: "Basit tepki süresi",
    taskStroop: "Stroop",
    taskDigit: "Sayı uzunluğu",
    taskCPT: "Git / Gitme",
  },
};

let currentLang = "en";

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (lang === "en" || lang === "tr") currentLang = lang;
  try {
    localStorage.setItem("cogstudy_lang", currentLang);
  } catch {
    /* ignore */
  }
}

export function initLangFromStorage() {
  try {
    const s = localStorage.getItem("cogstudy_lang");
    if (s === "en" || s === "tr") currentLang = s;
  } catch {
    /* ignore */
  }
}

export function t(key) {
  const table = STRINGS[currentLang] || STRINGS.en;
  return table[key] ?? STRINGS.en[key] ?? key;
}
