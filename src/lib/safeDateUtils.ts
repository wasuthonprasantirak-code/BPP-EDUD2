import { ActivityReport } from "../types";

export const THAI_MONTH_FULL = [
  "",
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export const THAI_MONTH_SHORT = [
  "",
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export const THAI_DIGITS_MAP: Record<string, string> = {
  "๐": "0", "๑": "1", "๒": "2", "๓": "3", "๔": "4",
  "๕": "5", "๖": "6", "๗": "7", "๘": "8", "๙": "9",
};

export const ARABIC_TO_THAI_MAP: Record<string, string> = {
  "0": "๐", "1": "๑", "2": "๒", "3": "๓", "4": "๔",
  "5": "๕", "6": "๖", "7": "๗", "8": "๘", "9": "๙",
};

/**
 * Normalizes Thai digits to standard Arabic digits (0-9)
 */
export function normalizeThaiDigits(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return "";
  const str = String(input);
  return str.replace(/[๐-๙]/g, (char) => THAI_DIGITS_MAP[char] || char);
}

/**
 * Converts input to Hindu-Arabic digits across the entire system UI.
 * (Except inside the A4 government report paper which maintains its dedicated Thai numeral formatting)
 */
export function toThaiNumerals(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return "";
  return normalizeThaiDigits(input);
}

/**
 * Converts standard Arabic digits to Thai digits (๐-๙) when specifically requested
 */
export function toStrictThaiNumerals(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return "";
  const str = String(input);
  return str.replace(/[0-9]/g, (char) => ARABIC_TO_THAI_MAP[char] || char);
}

/**
 * Safely parses any number input (numbers, strings with commas, Thai numerals)
 * Guaranteed to return a valid number without returning NaN.
 */
export function safeParseNumber(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === "") return fallback;
  if (typeof val === "number") {
    return isNaN(val) ? fallback : val;
  }
  const cleanStr = normalizeThaiDigits(val).replace(/,/g, "").trim();
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? fallback : Math.round(parsed);
}

/**
 * แปลงข้อความระบุจำนวนผู้เข้าร่วมกิจกรรมเป็นตัวเลขจำนวนเต็มอย่างแม่นยำ
 * รองรับข้อความหลากหลายรูปแบบ เช่น:
 * - ตัวเลขเดี่ยว: "106", "55", "7"
 * - ตัวเลขพร้อมหน่วย "คน": "153 คน", "40 คน", "107 คน"
 * - ตัวเลขแยกกลุ่มบวกกัน: "ครู 8 คน นักเรียน 35 คน" -> 43, "นักเรียน106 คน ครู 14 คน" -> 120
 * - ข้อความสรุปรวม: "นักเรียนชั้นป.4 จำนวน 10 คน ครูใหญ่ รวม 13 คน" -> 13
 * - ตัวเลขระบุช่วง: "8-10 คน" -> 10
 * - ข้อความมีชั้นเรียนปน: "นักเรียนตั้งแต่ชั้นอนุบาล ถึง ป.6 จำนวน 87 คน" -> 87 (ไม่ดึง 6 มารวม)
 * - คำผิด/ตัวเลขไทย: "1ึ7 คน" -> 17, "๒๕ คน" -> 25
 */
export function parseParticipantCountFromText(rawText: string | number | undefined | null): number {
  if (rawText === undefined || rawText === null) return 0;
  if (typeof rawText === "number") {
    return isNaN(rawText) || rawText < 0 ? 0 : Math.round(rawText);
  }
  let text = String(rawText).trim();
  if (!text || text === "-" || text === "ไม่มี") return 0;

  // แก้ไขคำผิดที่พบบ่อยและแปลงตัวเลขไทยเป็นอารบิก
  text = text.replace(/1ึ7/g, "17");
  text = normalizeThaiDigits(text);

  // กรณีเป็นตัวเลขล้วน (อาจมีจุลภาค)
  if (/^[0-9,]+$/.test(text)) {
    const n = parseInt(text.replace(/,/g, ""), 10);
    return isNaN(n) ? 0 : n;
  }

  // 1. ตรวจหาคำว่า "รวม ... คน" หรือ "ยอดรวม ... คน" ก่อนเป็นอันดับแรก
  const ruamMatch = text.match(/(?:รวม(?:ทั้งสิ้น|ยอด)?|มีผู้เข้าร่วม(?:งาน)?(?:รวม)?)\s*([0-9,]+)\s*คน/);
  if (ruamMatch && ruamMatch[1]) {
    const p = parseInt(ruamMatch[1].replace(/,/g, ""), 10);
    if (!isNaN(p) && p > 0) return p;
  }

  // 2. ตรวจหารูปแบบช่วงตัวเลข เช่น "8-10 คน" ให้ใช้ค่าสูงสุดของช่วง
  const rangeMatch = text.match(/([0-9]+)\s*[-–]\s*([0-9]+)\s*คน/);
  if (rangeMatch && rangeMatch[2]) {
    const p = parseInt(rangeMatch[2], 10);
    if (!isNaN(p) && p > 0) return p;
  }

  // 3. ตรวจหาจำนวนที่ลงท้ายด้วย "คน" ทุกจุด หากมีหลายกลุ่มให้นำมารวมกัน
  // เช่น "ครู 8 คน นักเรียน 35 คน" -> 8 + 35 = 43
  // e.g. "นักเรียน106 คน ครู 14 คน" -> 106 + 14 = 120
  const khonMatches = Array.from(text.matchAll(/(?:^|[^\d])([0-9,]+)\s*คน/g));
  if (khonMatches.length > 0) {
    let sum = 0;
    for (const m of khonMatches) {
      const n = parseInt(m[1].replace(/,/g, ""), 10);
      if (!isNaN(n) && n > 0 && n < 10000) sum += n;
    }
    if (sum > 0) return sum;
  }

  // 4. ตรวจหารูปแบบ "... คน" แบบเดี่ยว
  const singleKhon = text.match(/([0-9,]+)\s*คน/);
  if (singleKhon && singleKhon[1]) {
    const p = parseInt(singleKhon[1].replace(/,/g, ""), 10);
    if (!isNaN(p) && p > 0) return p;
  }

  // 5. หากไม่มีคำว่า "คน" ให้มองหาตัวเลขที่สมเหตุสมผลสำหรับกิจกรรม (เช่น "จำนวน 45", "ประมาณ 100")
  const numMatches = Array.from(text.matchAll(/(?:^|[^\d])([0-9,]+)(?:$|[^\d])/g));
  if (numMatches.length > 0) {
    const nums = numMatches
      .map(m => parseInt(m[1].replace(/,/g, ""), 10))
      .filter(n => !isNaN(n) && n > 0 && n < 5000);
    if (nums.length > 0) return nums[nums.length - 1];
  }

  return 0;
}

/**
 * ดึงและคำนวณจำนวนผู้เข้าร่วมกิจกรรมจากรายงานอย่างแม่นยำที่สุด
 * โดยนับจากจำนวนผู้เข้าร่วมที่ลงท้ายด้วยคำว่า "คน" ในหน้ารายงาน
 */
export function extractReportParticipantCount(report: Partial<ActivityReport> | undefined | null): number {
  if (!report) return 0;

  // 1. ตรวจสอบค่า participantsCount โดยตรง
  if (typeof report.participantsCount === "number" && !isNaN(report.participantsCount) && report.participantsCount > 0) {
    // ป้องกันกรณีตัวเลขผิดเพี้ยนจากการต่อสตริง เช่น 41013 หรือ 10614
    if (report.participantsCount < 5000) {
      return report.participantsCount;
    }
  }

  // 2. ดึงจากฟิลด์ต่างๆ ในหน้ารายงานที่ลงท้ายด้วยคำว่า "คน"
  const candidates = [
    report.quantitativeOutcome,
    report.details,
    report.targetGroup,
  ];

  for (const text of candidates) {
    if (!text || typeof text !== "string") continue;
    const parsed = parseParticipantCountFromText(text);
    if (parsed > 0) return parsed;
  }

  return safeParseNumber(report.participantsCount, 0);
}

/**
 * Formats a number with standard commas (e.g. 1,250)
 */
export function formatNumberWithComma(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "0";
  const num = safeParseNumber(val, 0);
  return num.toLocaleString("en-US");
}

/**
 * Formats a number with commas in standard Hindu-Arabic numerals (e.g. 1,250)
 * System-wide standard format across all dashboards, station views, and modules.
 */
export function formatThaiNumberWithComma(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "0";
  return formatNumberWithComma(val);
}

/**
 * Formats a number with commas and converts to Thai numerals (e.g. ๑,๒๕๐)
 * For official government memo / letterhead usage when explicitly required.
 */
export function formatStrictThaiNumberWithComma(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "๐";
  const str = formatNumberWithComma(val);
  return toStrictThaiNumerals(str);
}

export interface ParsedDateResult {
  day: number;
  month: number;
  yearBE: number;
  yearCE: number;
  academicYearBE: number;
  quarter: string;
  dateObj: Date;
  dayOfWeek: number;
  timestampNum: number;
  isoDateString: string;
  formattedThaiDate: string;
}

/**
 * Universal, cross-browser safe date parser compatible with Chrome, Safari (iOS/macOS),
 * LINE In-App Browser, Android WebViews, and Firefox.
 * Handles ISO strings with spaces, Thai Buddhist dates, text dates, slashes, and dashes.
 */
export function parseSafeDate(rawInput: any): Date | null {
  if (!rawInput) return null;
  if (rawInput instanceof Date) {
    return isNaN(rawInput.getTime()) ? null : rawInput;
  }
  if (typeof rawInput === "number") {
    const d = new Date(rawInput);
    return isNaN(d.getTime()) ? null : d;
  }

  let str = normalizeThaiDigits(String(rawInput)).trim();
  if (!str || str === "-" || str === "2569" || str === "2026") return null;

  // Replace space before time with 'T' for Safari WebKit compliance
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(str)) {
    str = str.replace(" ", "T");
  }

  // 1. Check if clean ISO string parses natively
  if (str.includes("T")) {
    const parsedTime = Date.parse(str);
    if (!isNaN(parsedTime)) {
      const d = new Date(parsedTime);
      if (d.getFullYear() > 2400) d.setFullYear(d.getFullYear() - 543);
      if (d.getFullYear() >= 2020 && d.getFullYear() <= 2035) return d;
    }
  }

  let cleanDate = str.split("T")[0].split(",")[0].trim();

  let day = NaN;
  let month = NaN;
  let year = NaN;

  // 2. Pattern: D/M/YYYY or DD/MM/YYYY or YYYY/MM/DD
  if (cleanDate.includes("/")) {
    const firstToken = cleanDate.split(" ")[0].trim();
    const parts = firstToken.split("/").map((p) => parseInt(p, 10)).filter((n) => !isNaN(n));
    if (parts.length === 3) {
      if (parts[0] > 1000) {
        year = parts[0];
        month = parts[1];
        day = parts[2];
      } else if (parts[2] > 1000) {
        day = parts[0];
        month = parts[1];
        year = parts[2];
      } else {
        day = parts[0];
        month = parts[1];
        year = parts[2];
      }
    }
  }

  // 3. Pattern: YYYY-MM-DD or DD-MM-YYYY
  if (isNaN(month) || isNaN(year) || isNaN(day)) {
    if (cleanDate.includes("-")) {
      const firstToken = cleanDate.split(" ")[0].trim();
      const parts = firstToken.split("-").map((p) => parseInt(p, 10)).filter((n) => !isNaN(n));
      if (parts.length === 3) {
        if (parts[0] > 1000) {
          year = parts[0];
          month = parts[1];
          day = parts[2];
        } else {
          day = parts[0];
          month = parts[1];
          year = parts[2];
        }
      }
    }
  }

  // 4. Pattern: Thai Month Name (e.g. 27 พฤษภาคม 2569, 15 ส.ค. 2568, วันศุกร์ที่ 21 สิงหาคม 2568)
  if (isNaN(month) || isNaN(year) || isNaN(day)) {
    for (let mIdx = 1; mIdx <= 12; mIdx++) {
      if (str.includes(THAI_MONTH_FULL[mIdx])) {
        month = mIdx;
        break;
      }
    }
    if (isNaN(month)) {
      for (let mIdx = 1; mIdx <= 12; mIdx++) {
        if (str.includes(THAI_MONTH_SHORT[mIdx])) {
          month = mIdx;
          break;
        }
      }
    }

    const yrMatch4 = str.match(/\b(25\d{2}|20\d{2})\b/);
    if (yrMatch4) {
      year = parseInt(yrMatch4[1], 10);
    } else {
      const yrMatch2 = str.match(/\b(6\d)\b/);
      if (yrMatch2) {
        year = 2500 + parseInt(yrMatch2[1], 10);
      }
    }

    const dayMatch = str.match(/(?:วันที่\s*|วัน\S+\s+)?([1-9]|[12]\d|3[01])\s*(?:[ก-๙]|\.|\/|-)/);
    if (dayMatch) {
      day = parseInt(dayMatch[1], 10);
    } else {
      const anyNum = str.match(/\b([1-9]|[12]\d|3[01])\b/);
      if (anyNum) day = parseInt(anyNum[1], 10);
    }
  }

  if (isNaN(month) || isNaN(year)) {
    // 5. Fallback: Parse with Date.parse
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      if (d.getFullYear() > 2400) d.setFullYear(d.getFullYear() - 543);
      if (d.getFullYear() >= 2020 && d.getFullYear() <= 2035) return d;
    }
    return null;
  }

  if (isNaN(day) || day < 1 || day > 31) day = 1;
  if (month < 1 || month > 12) return null;

  let yearCE = year;
  if (year > 2400) {
    yearCE = year - 543;
  } else if (year < 100) {
    yearCE = year >= 50 ? 2500 + year - 543 : 2000 + year;
  }

  if (yearCE < 2020 || yearCE > 2035) {
    yearCE = 2026;
  }

  const d = new Date(yearCE, month - 1, day, 12, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Parses all date attributes from an ActivityReport with full fallback and consistency.
 */
export function parseReportDateDetails(r: ActivityReport): ParsedDateResult | null {
  if (!r) return null;

  // Candidates in priority order
  const dateCandidates = [r.dateString, r.reportingPeriod, r.timestamp, r.lastUpdated, (r as any).createdAt];
  let parsedDate: Date | null = null;

  for (const cand of dateCandidates) {
    if (cand) {
      parsedDate = parseSafeDate(cand);
      if (parsedDate) break;
    }
  }

  // Fallback to Academic Year 2569 start date (May 2026)
  if (!parsedDate) {
    parsedDate = new Date(2026, 4, 15, 12, 0, 0);
  }

  const day = parsedDate.getDate();
  const month = parsedDate.getMonth() + 1;
  const yearCE = parsedDate.getFullYear();
  const yearBE = yearCE + 543;
  const academicYearBE = month >= 5 ? yearBE : yearBE - 1;
  const quarter = month <= 3 ? "Q1" : month <= 6 ? "Q2" : month <= 9 ? "Q3" : "Q4";
  const dayOfWeek = parsedDate.getDay();
  const timestampNum = parsedDate.getTime();
  const isoDateString = `${yearCE}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const formattedThaiDate = `${day} ${THAI_MONTH_FULL[month]} ${yearBE}`;

  return {
    day,
    month,
    yearBE,
    yearCE,
    academicYearBE,
    quarter,
    dateObj: parsedDate,
    dayOfWeek,
    timestampNum,
    isoDateString,
    formattedThaiDate,
  };
}

/**
 * Parses submission date and timestamp details prioritizing the actual submission time (วันเวลาที่ส่งรายงาน).
 * Prioritizes: timestamp > lastUpdated > createdAt > submittedAt > dateString > reportingPeriod
 */
export function parseReportSubmissionDateDetails(r: ActivityReport): ParsedDateResult | null {
  if (!r) return null;

  // Candidates in submission timestamp priority order
  const submissionCandidates = [
    r.timestamp, 
    r.lastUpdated, 
    (r as any).createdAt, 
    (r as any).submittedAt, 
    r.dateString, 
    r.reportingPeriod
  ];
  let parsedDate: Date | null = null;

  for (const cand of submissionCandidates) {
    if (cand) {
      parsedDate = parseSafeDate(cand);
      if (parsedDate) break;
    }
  }

  // Fallback to May 2026
  if (!parsedDate) {
    parsedDate = new Date(2026, 4, 15, 12, 0, 0);
  }

  const day = parsedDate.getDate();
  const month = parsedDate.getMonth() + 1;
  const yearCE = parsedDate.getFullYear();
  const yearBE = yearCE + 543;
  const academicYearBE = month >= 5 ? yearBE : yearBE - 1;
  const quarter = month <= 3 ? "Q1" : month <= 6 ? "Q2" : month <= 9 ? "Q3" : "Q4";
  const dayOfWeek = parsedDate.getDay();
  const timestampNum = parsedDate.getTime();
  const isoDateString = `${yearCE}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const formattedThaiDate = `${day} ${THAI_MONTH_FULL[month]} ${yearBE}`;

  return {
    day,
    month,
    yearBE,
    yearCE,
    academicYearBE,
    quarter,
    dateObj: parsedDate,
    dayOfWeek,
    timestampNum,
    isoDateString,
    formattedThaiDate,
  };
}

export function parseReportTimestampDetails(r: ActivityReport): ParsedDateResult | null {
  return parseReportSubmissionDateDetails(r);
}

/**
 * Robust cross-browser and environment detection
 * Specially identifies LINE In-App Browser, Safari, Chrome, Edge, Firefox, etc.
 */
export function detectBrowserEnvironment() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      browser: "Server Environment",
      os: "Server OS",
      device: "Desktop",
      isLine: false,
      isSafari: false,
      isChrome: false,
      isMobile: false,
    };
  }

  const ua = navigator.userAgent || "";

  // Device
  let device = "คอมพิวเตอร์ (Desktop)";
  let isMobile = false;
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    device = "แท็บเล็ต (Tablet)";
    isMobile = true;
  } else if (/mobile|iphone|ipod|android|blackberry|iemobile|kindle/i.test(ua)) {
    device = "โทรศัพท์มือถือ (Mobile)";
    isMobile = true;
  }

  // OS
  let os = "Windows / macOS";
  if (/windows/i.test(ua)) os = "Windows OS";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux OS";

  // Browser & In-App View
  const isLine = /Line\//i.test(ua);
  const isFacebook = /FBAV|FBAN|Instagram/i.test(ua);
  const isEdge = /edg/i.test(ua);
  const isFirefox = /firefox|fxios/i.test(ua);
  const isChrome = !isLine && !isFacebook && !isEdge && /chrome|crios/i.test(ua);
  const isSafari = !isLine && !isFacebook && !isChrome && !isEdge && /safari/i.test(ua);

  let browser = "Chrome / Web Browser";
  if (isLine) {
    browser = "LINE App (In-App Browser)";
  } else if (isFacebook) {
    browser = "In-App Browser (Social)";
  } else if (isEdge) {
    browser = "Microsoft Edge";
  } else if (isFirefox) {
    browser = "Mozilla Firefox";
  } else if (isChrome) {
    browser = "Google Chrome";
  } else if (isSafari) {
    browser = "Apple Safari";
  }

  return {
    browser,
    os,
    device,
    isLine,
    isSafari,
    isChrome,
    isMobile,
  };
}
