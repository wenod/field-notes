const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const internationalPhonePattern = /\+\d{1,3}(?:[ .()-]*\d){7,14}\b/;

export const publicSafetyRules = [
  {
    name: "explicit sexual content",
    pattern: /\b(?:pussy|porn(?:ography|ographic)?|onlyfans|nudes?|blowjob|handjob|sex tape|masturbat(?:e|ion)|orgasms?|anal sex|xxx)\b/i,
  },
  {
    name: "sexual violence or exploitation",
    pattern: /\b(?:raped?|rapist|sexual assault|sexually assault(?:ed|ing)|sexual abuse|molest(?:ed|ation)|pedophil(?:e|ia)|child (?:sexual abuse|sex abuse)|sex traffick(?:ing|er)|revenge porn|nonconsensual)\b/i,
  },
  {
    name: "hateful or demeaning slur",
    pattern: /\b(?:nigger|kike|faggot|chink|retard(?:ed)?)\b/i,
  },
  {
    name: "dangerous or illegal instructions",
    pattern: /(?:\bmolotov cocktail\b|\b(?:how to|guide to|instructions? (?:for|to)|synthesi[sz]e|manufactur(?:e|ing)|build|make|deploy)\b[^.\n]{0,120}\b(?:bomb|explosive|meth(?:amphetamine)?|cocaine|heroin|fentanyl|psilocybin|bioweapon|ransomware|phishing kit|botnet)\b)/i,
  },
  {
    name: "actionable self-harm content",
    pattern: /\b(?:kill myself|end my life|suicide methods?|suicide instructions?|quantum suicide loophole)\b/i,
  },
  {
    name: "sensational medical misinformation",
    pattern: /\b(?:vaccines? cause|no benefits? to taking (?:a )?statin|statins?[^.\n]{0,80}(?:grave harm|cause)|low cholesterol (?:causes?|is causal for)|cholesterol[^.\n]{0,100}(?:protects? against cancer|prevents? dementia)|cancer[^.\n]{0,60}(?:cured?|dies?) in \d+ days?|permanent cure for (?:type \d )?diabetes|miracle cure|doctors? (?:do not|don't|won't) want you to know)\b/i,
  },
  {
    name: "anti-vaccine conspiracy or misinformation",
    pattern: /(?:\bvaccinat(?:ing|ion)\b[\s\S]{0,140}\bcrime against humanity\b|\bvaccines?\b[\s\S]{0,140}\b(?:autism|1,?135%|cover[- ]up|suppress(?:es|ing) (?:host )?immunity)\b|\bpolio (?:was not|wasn['’]t) actually eradicated\b|\bdocuments reveal pfizer knew\b|\bbill gates\b[\s\S]{0,220}\b(?:laboratory|mengele)\b|\bpfizer gangs\b)/i,
  },
  {
    name: "unsubstantiated miracle treatment or health claim",
    pattern: /(?:\bcomplete remission\b[\s\S]{0,140}\bfenbendazole\b|\bivermectin\b[\s\S]{0,280}\b(?:cancer|parasites? within the human body)\b|\breverse (?:your )?(?:brain age|aging)\b[\s\S]{0,100}\b(?:hours?|days?)\b|\bdestroy 100% of\b[\s\S]{0,120}\bcancer cells\b|\bmale pattern baldness\b[\s\S]{0,140}\b(?:lie|big pharma)\b|\b(?:russia|russian)(?: ministry of health)?\b[\s\S]{0,180}\bcancer vaccine\b|\bhead transplant (?:machine|system)\b|\bessential oils?\b[\s\S]{0,160}\b226% increase in cognitive\b|\bhigher your ldl\b[\s\S]{0,100}\blonger you live\b|\blowering ldl\b[\s\S]{0,140}\bshortens life\b)/i,
  },
  {
    name: "unsafe or unsupported lifestyle remedy",
    pattern: /(?:\bchinese medicine says\b|\bmalaysian warriors?\b[\s\S]{0,160}\b(?:testosterone|fatigue|stamina)\b|\banimal[- ]based diet\b[\s\S]{0,220}\b(?:no more|fixed my|cured)\b|\bmelatonin window\b[\s\S]{0,140}\b(?:magic|ruining|breaking them)\b|\breplace your medicine cabinet\b)/i,
  },
  {
    name: "unsafe automated health interpretation",
    pattern: /(?:\braw dna data\b[\s\S]{0,200}\bhealth related genes\b|\b(?:gpt|chatgpt|claude)\b[\s\S]{0,360}\b(?:doctors? missed|diagnose|treatment plan)\b)/i,
  },
  {
    name: "unsafe cancer-screening claim",
    pattern: /\b(?:mammograms?|breast screening)\b[\s\S]{0,180}\b(?:causing|cause) breast cancer\b/i,
  },
  {
    name: "sensitive biological generalization",
    pattern: /\b(?:gay men|lesbians?)\b[^.\n]{0,180}\b(?:finger ratio|testosterone exposure|older brothers)\b/i,
  },
  {
    name: "pseudoscientific physical or biological claim",
    pattern: /(?:\b(?:dogon|african tribe)\b[\s\S]{0,220}\b(?:sirius[- ]?b|originate from sirius)\b|\bliving 723 years\b|\bconsciousness\b[\s\S]{0,180}\bsuperluminal information transmission\b|\bquantum orchestra\b[\s\S]{0,180}\borganic carbon\b|\bwireless headphones?\b[\s\S]{0,180}\b(?:cysts?|lymphatic swellings?)\b|\bred light therapy\b[\s\S]{0,180}\b(?:ultimate anti-aging|supercharge their cells|superhuman energy)\b|\baetherial mechanics\b|\bvideos? will be proven 100% real\b[\s\S]{0,120}\bstar trek\b)/i,
  },
  {
    name: "climate-science misinformation",
    pattern: /(?:\bno global warming\b[\s\S]{0,180}\b(?:co2|hoax)\b|\bco2 warming is the biggest scientific hoax\b|\bthere is nothing like climate change\b|\bvolcan(?:o|os)\b[\s\S]{0,180}\bmore co2 than man\b|\btax volcanos\b[\s\S]{0,140}\beat bugs\b)/i,
  },
  {
    name: "doxxing or personal targeting",
    pattern: /(?:\b(?:doxx(?:ing|ed)?|contact (?:number|details) is|death threat|deserves? to die)\b|\bscamm(?:ing|er) people\b[^.\n]{0,180}\+\d{1,3}(?:[ .()-]*\d){7,14}\b)/i,
  },
  {
    name: "piracy or illicit downloads",
    pattern: /\b(?:z-library|z-lib(?:rary)?|warez|pirated downloads?|cracked software|torrent piracy)\b/i,
  },
];

export const offTopicPublicRules = [
  {
    name: "political or conflict news",
    pattern: /\b(?:hot war situation|sanctions on us|axis powers|war effort|uss indianapolis|japanese torpedo|strait of hormuz|israeli blockade|gaza metro|hamas political bureau|terror strikes?|pfizer gangs|palestinians and israelis|humanitarian aids? in 2022)\b/i,
  },
  {
    name: "culture or movie material",
    pattern: /\b(?:deleted scene|climax scene)\b[^.\n]{0,100}\b(?:movie|film|vaccine war)\b|\b(?:movie|film)\b[^.\n]{0,100}\b(?:deleted scene|climax scene)\b/i,
  },
  {
    name: "religious or legendary material",
    pattern: /(?:\bbrahma\b[\s\S]{0,160}\blord vishnu\b|\bshiva prabhakara siddha yogi\b|\bakbar\b[\s\S]{0,160}\bpoison(?:ed| pills?)\b)/i,
  },
  {
    name: "celebrity, scandal, or joke misclassified as science",
    pattern: /(?:\bstephen hawking\b[\s\S]{0,120}\bepstein island\b|\bepstein\b[\s\S]{0,140}\b(?:pedo|flight logs?)\b|\btragically passed away after collapsing on stage\b|\beconomics graduate\b[\s\S]{0,120}\bjoins nasa\b)/i,
  },
  {
    name: "sensational crime or current-affairs story",
    pattern: /(?:\b(?:fake doctors?|counterfeit degrees?)\b[^.\n]{0,180}\b(?:bust|racket|arrested)\b|\b(?:allegedly )?murdered\b|\bdismembered\b|\bsmothered to death\b|\bbody parts?\b[\s\S]{0,100}\brefrigerator\b|\brabies vaccine\b[^.\n]{0,120}\b(?:fake|scam)\b|\bamerican woman tests china(?:'s)? healthcare system\b)/i,
  },
  {
    name: "political or conspiratorial health commentary",
    pattern: /(?:\bbig pharma\b[^.\n]{0,180}\b(?:destroying|hiding|conspiracy|trade war|movement|blockades?)\b|\b(?:rfk jr|cdc)\b[^.\n]{0,160}\b(?:cover[- ]up|vaccines? increased autism)\b|\b(?:vaccine|medicine|health insurance)\b[^.\n]{0,100}\b(?:gst|government loan|fuel tax|socialized medicine)\b)/i,
  },
  {
    name: "politics, immigration, or finance misclassified as science",
    pattern: /(?:\bbhaktalibans?\b|\bnavagrahas?\b|\bwork permit\b[\s\S]{0,180}\b(?:employer|bakery|studied physics)\b|\bschengen visa\b|\bprobability of recession\b|\bgovernment data\b[\s\S]{0,160}\bgrowth rate\b|\bhealthcare budget\b|\bneet\b[\s\S]{0,160}\bukrain(?:e|ian)\b)/i,
  },
  {
    name: "history, business, or social material misclassified as science",
    pattern: /(?:\btoghrol tower\b|\bprofessors and experts giving lectures inside bars\b|\bphysics wallah\b|\bstartup(?:s)? spend to earn\b|\bspacex genius\b[\s\S]{0,140}\btumblr\b)/i,
  },
];

export const credentialPatterns = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];

export function safetyText(parts) {
  return parts.filter(Boolean).join(" \n ");
}

export function findPublicSafetyViolation(text) {
  for (const rule of publicSafetyRules) {
    if (rule.pattern.test(text) && !rule.allowWhen?.test(text)) return rule.name;
  }
  for (const rule of offTopicPublicRules) {
    if (rule.pattern.test(text)) return rule.name;
  }
  return null;
}

export function redactPublicContactDetails(value = "") {
  return String(value)
    .replace(new RegExp(emailPattern.source, "gi"), "[email removed]")
    .replace(new RegExp(internationalPhonePattern.source, "g"), "[phone number removed]");
}

export function containsDirectContactDetails(text) {
  return emailPattern.test(text) || internationalPhonePattern.test(text);
}
