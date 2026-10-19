/**
 * ระบบมาตรฐานการจัดการและนับคะแนนรายชื่อครู / ผู้รายงาน (Teacher Deduplication & Highest Rank Engine)
 * 
 * คุณสมบัติหลัก:
 * 1. นับคะแนนชื่อครูคนเดียวกันให้นับคะแนนรวมกัน (Merge duplicate teacher submissions and sum scores)
 * 2. หากยศต่างกัน ให้ใช้ยศสูงสุด (Select highest rank across all submissions: e.g. ด.ต. > ส.ต.อ., ร.ต.อ. > ร.ต.ท.)
 * 3. รองรับการระบุ "หญิง" (เช่น ส.ต.อ.หญิง, ด.ต.หญิง) อย่างถูกต้อง
 * 4. กรองข้อความ Placeholder ทั่วไป (เช่น "ครูผู้รับผิดชอบโครงการ", "ผู้รายงาน") ออกจากตารางทำเนียบครู
 */

import { ActivityReport } from "../types";

export interface TeacherRankTier {
  prefix: string;        // ข้อความคำนำหน้า เช่น "ว่าที่ พ.ต.อ.หญิง", "ส.ต.อ."
  canon: string;         // รูปยศมาตรฐานชาย เช่น "พ.ต.อ.", "ส.ต.อ."
  canonFemale: string;   // รูปยศมาตรฐานหญิง เช่น "พ.ต.อ.หญิง", "ส.ต.อ.หญิง"
  weight: number;        // ลำดับชั้นยศ (ค่ายิ่งสูง ยศยิ่งสูง)
  isFemalePrefix?: boolean;
}

// ลำดับชั้นยศตำรวจตระเวนชายแดน (ตชด.) และตำแหน่งครู เรียงจากยศสูงสุดลงมา
export const TEACHER_RANK_TIERS: TeacherRankTier[] = [
  // พลตำรวจเอก / พลตำรวจโท / พลตำรวจตรี
  { prefix: "พลตำรวจเอกหญิง", canon: "พล.ต.อ.", canonFemale: "พล.ต.อ.หญิง", weight: 130, isFemalePrefix: true },
  { prefix: "พลตำรวจเอก", canon: "พล.ต.อ.", canonFemale: "พล.ต.อ.หญิง", weight: 130 },
  { prefix: "พล.ต.อ.หญิง", canon: "พล.ต.อ.", canonFemale: "พล.ต.อ.หญิง", weight: 130, isFemalePrefix: true },
  { prefix: "พล.ต.อ.", canon: "พล.ต.อ.", canonFemale: "พล.ต.อ.หญิง", weight: 130 },

  { prefix: "พลตำรวจโทหญิง", canon: "พล.ต.ท.", canonFemale: "พล.ต.ท.หญิง", weight: 120, isFemalePrefix: true },
  { prefix: "พลตำรวจโท", canon: "พล.ต.ท.", canonFemale: "พล.ต.ท.หญิง", weight: 120 },
  { prefix: "พล.ต.ท.หญิง", canon: "พล.ต.ท.", canonFemale: "พล.ต.ท.หญิง", weight: 120, isFemalePrefix: true },
  { prefix: "พล.ต.ท.", canon: "พล.ต.ท.", canonFemale: "พล.ต.ท.หญิง", weight: 120 },

  { prefix: "พลตำรวจตรีหญิง", canon: "พล.ต.ต.", canonFemale: "พล.ต.ต.หญิง", weight: 110, isFemalePrefix: true },
  { prefix: "พลตำรวจตรี", canon: "พล.ต.ต.", canonFemale: "พล.ต.ต.หญิง", weight: 110 },
  { prefix: "พล.ต.ต.หญิง", canon: "พล.ต.ต.", canonFemale: "พล.ต.ต.หญิง", weight: 110, isFemalePrefix: true },
  { prefix: "พล.ต.ต.", canon: "พล.ต.ต.", canonFemale: "พล.ต.ต.หญิง", weight: 110 },

  // พันตำรวจเอก (สัญญาบัตร)
  { prefix: "ว่าที่ พันตำรวจเอกหญิง", canon: "ว่าที่ พ.ต.อ.", canonFemale: "ว่าที่ พ.ต.อ.หญิง", weight: 95, isFemalePrefix: true },
  { prefix: "ว่าที่ พันตำรวจเอก", canon: "ว่าที่ พ.ต.อ.", canonFemale: "ว่าที่ พ.ต.อ.หญิง", weight: 95 },
  { prefix: "ว่าที่ พ.ต.อ.หญิง", canon: "ว่าที่ พ.ต.อ.", canonFemale: "ว่าที่ พ.ต.อ.หญิง", weight: 95, isFemalePrefix: true },
  { prefix: "ว่าที่ พ.ต.อ.", canon: "ว่าที่ พ.ต.อ.", canonFemale: "ว่าที่ พ.ต.อ.หญิง", weight: 95 },
  { prefix: "พันตำรวจเอกหญิง", canon: "พ.ต.อ.", canonFemale: "พ.ต.อ.หญิง", weight: 100, isFemalePrefix: true },
  { prefix: "พันตำรวจเอก", canon: "พ.ต.อ.", canonFemale: "พ.ต.อ.หญิง", weight: 100 },
  { prefix: "พ.ต.อ.หญิง", canon: "พ.ต.อ.", canonFemale: "พ.ต.อ.หญิง", weight: 100, isFemalePrefix: true },
  { prefix: "พ.ต.อ.", canon: "พ.ต.อ.", canonFemale: "พ.ต.อ.หญิง", weight: 100 },

  // พันตำรวจโท
  { prefix: "ว่าที่ พันตำรวจโทหญิง", canon: "ว่าที่ พ.ต.ท.", canonFemale: "ว่าที่ พ.ต.ท.หญิง", weight: 85, isFemalePrefix: true },
  { prefix: "ว่าที่ พันตำรวจโท", canon: "ว่าที่ พ.ต.ท.", canonFemale: "ว่าที่ พ.ต.ท.หญิง", weight: 85 },
  { prefix: "ว่าที่ พ.ต.ท.หญิง", canon: "ว่าที่ พ.ต.ท.", canonFemale: "ว่าที่ พ.ต.ท.หญิง", weight: 85, isFemalePrefix: true },
  { prefix: "ว่าที่ พ.ต.ท.", canon: "ว่าที่ พ.ต.ท.", canonFemale: "ว่าที่ พ.ต.ท.หญิง", weight: 85 },
  { prefix: "พันตำรวจโทหญิง", canon: "พ.ต.ท.", canonFemale: "พ.ต.ท.หญิง", weight: 90, isFemalePrefix: true },
  { prefix: "พันตำรวจโท", canon: "พ.ต.ท.", canonFemale: "พ.ต.ท.หญิง", weight: 90 },
  { prefix: "พ.ต.ท.หญิง", canon: "พ.ต.ท.", canonFemale: "พ.ต.ท.หญิง", weight: 90, isFemalePrefix: true },
  { prefix: "พ.ต.ท.", canon: "พ.ต.ท.", canonFemale: "พ.ต.ท.หญิง", weight: 90 },

  // พันตำรวจตรี
  { prefix: "ว่าที่ พันตำรวจตรีหญิง", canon: "ว่าที่ พ.ต.ต.", canonFemale: "ว่าที่ พ.ต.ต.หญิง", weight: 75, isFemalePrefix: true },
  { prefix: "ว่าที่ พันตำรวจตรี", canon: "ว่าที่ พ.ต.ต.", canonFemale: "ว่าที่ พ.ต.ต.หญิง", weight: 75 },
  { prefix: "ว่าที่ พ.ต.ต.หญิง", canon: "ว่าที่ พ.ต.ต.", canonFemale: "ว่าที่ พ.ต.ต.หญิง", weight: 75, isFemalePrefix: true },
  { prefix: "ว่าที่ พ.ต.ต.", canon: "ว่าที่ พ.ต.ต.", canonFemale: "ว่าที่ พ.ต.ต.หญิง", weight: 75 },
  { prefix: "พันตำรวจตรีหญิง", canon: "พ.ต.ต.", canonFemale: "พ.ต.ต.หญิง", weight: 80, isFemalePrefix: true },
  { prefix: "พันตำรวจตรี", canon: "พ.ต.ต.", canonFemale: "พ.ต.ต.หญิง", weight: 80 },
  { prefix: "พ.ต.ต.หญิง", canon: "พ.ต.ต.", canonFemale: "พ.ต.ต.หญิง", weight: 80, isFemalePrefix: true },
  { prefix: "พ.ต.ต.", canon: "พ.ต.ต.", canonFemale: "พ.ต.ต.หญิง", weight: 80 },

  // ร้อยตำรวจเอก
  { prefix: "ว่าที่ ร้อยตำรวจเอกหญิง", canon: "ว่าที่ ร.ต.อ.", canonFemale: "ว่าที่ ร.ต.อ.หญิง", weight: 65, isFemalePrefix: true },
  { prefix: "ว่าที่ ร้อยตำรวจเอก", canon: "ว่าที่ ร.ต.อ.", canonFemale: "ว่าที่ ร.ต.อ.หญิง", weight: 65 },
  { prefix: "ว่าที่ ร.ต.อ.หญิง", canon: "ว่าที่ ร.ต.อ.", canonFemale: "ว่าที่ ร.ต.อ.หญิง", weight: 65, isFemalePrefix: true },
  { prefix: "ว่าที่ ร.ต.อ.", canon: "ว่าที่ ร.ต.อ.", canonFemale: "ว่าที่ ร.ต.อ.หญิง", weight: 65 },
  { prefix: "ร้อยตำรวจเอกหญิง", canon: "ร.ต.อ.", canonFemale: "ร.ต.อ.หญิง", weight: 70, isFemalePrefix: true },
  { prefix: "ร้อยตำรวจเอก", canon: "ร.ต.อ.", canonFemale: "ร.ต.อ.หญิง", weight: 70 },
  { prefix: "ร.ต.อ.หญิง", canon: "ร.ต.อ.", canonFemale: "ร.ต.อ.หญิง", weight: 70, isFemalePrefix: true },
  { prefix: "ร.ต.อ.", canon: "ร.ต.อ.", canonFemale: "ร.ต.อ.หญิง", weight: 70 },

  // ร้อยตำรวจโท
  { prefix: "ว่าที่ ร้อยตำรวจโทหญิง", canon: "ว่าที่ ร.ต.ท.", canonFemale: "ว่าที่ ร.ต.ท.หญิง", weight: 55, isFemalePrefix: true },
  { prefix: "ว่าที่ ร้อยตำรวจโท", canon: "ว่าที่ ร.ต.ท.", canonFemale: "ว่าที่ ร.ต.ท.หญิง", weight: 55 },
  { prefix: "ว่าที่ ร.ต.ท.หญิง", canon: "ว่าที่ ร.ต.ท.", canonFemale: "ว่าที่ ร.ต.ท.หญิง", weight: 55, isFemalePrefix: true },
  { prefix: "ว่าที่ ร.ต.ท.", canon: "ว่าที่ ร.ต.ท.", canonFemale: "ว่าที่ ร.ต.ท.หญิง", weight: 55 },
  { prefix: "ร้อยตำรวจโทหญิง", canon: "ร.ต.ท.", canonFemale: "ร.ต.ท.หญิง", weight: 60, isFemalePrefix: true },
  { prefix: "ร้อยตำรวจโท", canon: "ร.ต.ท.", canonFemale: "ร.ต.ท.หญิง", weight: 60 },
  { prefix: "ร.ต.ท.หญิง", canon: "ร.ต.ท.", canonFemale: "ร.ต.ท.หญิง", weight: 60, isFemalePrefix: true },
  { prefix: "ร.ต.ท.", canon: "ร.ต.ท.", canonFemale: "ร.ต.ท.หญิง", weight: 60 },

  // ร้อยตำรวจตรี
  { prefix: "ว่าที่ ร้อยตำรวจตรีหญิง", canon: "ว่าที่ ร.ต.ต.", canonFemale: "ว่าที่ ร.ต.ต.หญิง", weight: 45, isFemalePrefix: true },
  { prefix: "ว่าที่ ร้อยตำรวจตรี", canon: "ว่าที่ ร.ต.ต.", canonFemale: "ว่าที่ ร.ต.ต.หญิง", weight: 45 },
  { prefix: "ว่าที่ ร.ต.ต.หญิง", canon: "ว่าที่ ร.ต.ต.", canonFemale: "ว่าที่ ร.ต.ต.หญิง", weight: 45, isFemalePrefix: true },
  { prefix: "ว่าที่ ร.ต.ต.", canon: "ว่าที่ ร.ต.ต.", canonFemale: "ว่าที่ ร.ต.ต.หญิง", weight: 45 },
  { prefix: "ร้อยตำรวจตรีหญิง", canon: "ร.ต.ต.", canonFemale: "ร.ต.ต.หญิง", weight: 50, isFemalePrefix: true },
  { prefix: "ร้อยตำรวจตรี", canon: "ร.ต.ต.", canonFemale: "ร.ต.ต.หญิง", weight: 50 },
  { prefix: "ร.ต.ต.หญิง", canon: "ร.ต.ต.", canonFemale: "ร.ต.ต.หญิง", weight: 50, isFemalePrefix: true },
  { prefix: "ร.ต.ต.", canon: "ร.ต.ต.", canonFemale: "ร.ต.ต.หญิง", weight: 50 },

  // ดาบตำรวจ (ชั้นประทวนสูงสุด)
  { prefix: "ดาบตำรวจหญิง", canon: "ด.ต.", canonFemale: "ด.ต.หญิง", weight: 40, isFemalePrefix: true },
  { prefix: "ดาบตำรวจ", canon: "ด.ต.", canonFemale: "ด.ต.หญิง", weight: 40 },
  { prefix: "ด.ต.หญิง", canon: "ด.ต.", canonFemale: "ด.ต.หญิง", weight: 40, isFemalePrefix: true },
  { prefix: "ด.ต.", canon: "ด.ต.", canonFemale: "ด.ต.หญิง", weight: 40 },

  // จ่าสิบตำรวจ
  { prefix: "จ่าสิบตำรวจหญิง", canon: "จ.ส.ต.", canonFemale: "จ.ส.ต.หญิง", weight: 35, isFemalePrefix: true },
  { prefix: "จ่าสิบตำรวจ", canon: "จ.ส.ต.", canonFemale: "จ.ส.ต.หญิง", weight: 35 },
  { prefix: "จ.ส.ต.หญิง", canon: "จ.ส.ต.", canonFemale: "จ.ส.ต.หญิง", weight: 35, isFemalePrefix: true },
  { prefix: "จ.ส.ต.", canon: "จ.ส.ต.", canonFemale: "จ.ส.ต.หญิง", weight: 35 },

  // สิบตำรวจเอก
  { prefix: "สิบตำรวจเอกหญิง", canon: "ส.ต.อ.", canonFemale: "ส.ต.อ.หญิง", weight: 30, isFemalePrefix: true },
  { prefix: "สิบตำรวจเอก", canon: "ส.ต.อ.", canonFemale: "ส.ต.อ.หญิง", weight: 30 },
  { prefix: "ส.ต.อ.หญิง", canon: "ส.ต.อ.", canonFemale: "ส.ต.อ.หญิง", weight: 30, isFemalePrefix: true },
  { prefix: "ส.ต.อ.", canon: "ส.ต.อ.", canonFemale: "ส.ต.อ.หญิง", weight: 30 },

  // สิบตำรวจโท
  { prefix: "สิบตำรวจโทหญิง", canon: "ส.ต.ท.", canonFemale: "ส.ต.ท.หญิง", weight: 25, isFemalePrefix: true },
  { prefix: "สิบตำรวจโท", canon: "ส.ต.ท.", canonFemale: "ส.ต.ท.หญิง", weight: 25 },
  { prefix: "ส.ต.ท.หญิง", canon: "ส.ต.ท.", canonFemale: "ส.ต.ท.หญิง", weight: 25, isFemalePrefix: true },
  { prefix: "ส.ต.ท.", canon: "ส.ต.ท.", canonFemale: "ส.ต.ท.หญิง", weight: 25 },

  // สิบตำรวจตรี
  { prefix: "สิบตำรวจตรีหญิง", canon: "ส.ต.ต.", canonFemale: "ส.ต.ต.หญิง", weight: 20, isFemalePrefix: true },
  { prefix: "สิบตำรวจตรี", canon: "ส.ต.ต.", canonFemale: "ส.ต.ต.หญิง", weight: 20 },
  { prefix: "ส.ต.ต.หญิง", canon: "ส.ต.ต.", canonFemale: "ส.ต.ต.หญิง", weight: 20, isFemalePrefix: true },
  { prefix: "ส.ต.ต.", canon: "ส.ต.ต.", canonFemale: "ส.ต.ต.หญิง", weight: 20 },

  // พลตำรวจ
  { prefix: "พลตำรวจ", canon: "พลฯ", canonFemale: "พลฯ หญิง", weight: 15 },
  { prefix: "พลฯ", canon: "พลฯ", canonFemale: "พลฯ หญิง", weight: 15 },

  // ตำแหน่งทางการศึกษา / สถานศึกษา
  { prefix: "ครูใหญ่", canon: "ครูใหญ่", canonFemale: "ครูใหญ่", weight: 10 },
  { prefix: "ครูผู้สอน", canon: "ครูผู้สอน", canonFemale: "ครูผู้สอน", weight: 8 },
  { prefix: "คุณครู", canon: "ครู", canonFemale: "ครู", weight: 6 },
  { prefix: "ครู", canon: "ครู", canonFemale: "ครู", weight: 6 },

  // คำนำหน้านามบุคคลทั่วไป
  { prefix: "นางสาว", canon: "นางสาว", canonFemale: "นางสาว", weight: 4, isFemalePrefix: true },
  { prefix: "น.ส.", canon: "นางสาว", canonFemale: "นางสาว", weight: 4, isFemalePrefix: true },
  { prefix: "นาง", canon: "นาง", canonFemale: "นาง", weight: 4, isFemalePrefix: true },
  { prefix: "นาย", canon: "นาย", canonFemale: "นาย", weight: 4 },
];

/**
 * คำหรือข้อความ Placeholder ที่ไม่ใช่ชื่อครูคนจริงๆ
 */
const GENERIC_PLACEHOLDER_REGEX = /^(?:ครูผู้รับผิดชอบโครงการ|ผู้รับผิดชอบโครงการ|ครูผู้รับผิดชอบกิจกรรม|ผู้รับผิดชอบกิจกรรม|ครูผู้รับผิดชอบ|ผู้รับผิดชอบ|ผู้รายงานผล|ผู้รายงาน|เจ้าหน้าที่|ตชด\.|ครู\s*ตชด\.|ครูประจำชั้น|ไม่ระบุ|-)$/i;

export interface ExtractedTeacherInfo {
  displayName: string;
  cleanNameOnly: string;
  canonicalNameKey: string;
  rankCanon: string;
  rankWeight: number;
  isFemale: boolean;
}

/**
 * วิเคราะห์และแยกคำนำหน้า ยศ และชื่อ-สกุลบริสุทธิ์ของครู 1 คน
 */
export const parseSingleTeacherToken = (token: string): ExtractedTeacherInfo | null => {
  if (!token || typeof token !== "string") return null;

  // 1. ลบอักขระพิเศษล่องหน
  let cleaned = token.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();

  // 2. ลบเบอร์โทรศัพท์ และข้อความในวงเล็บ
  cleaned = cleaned
    .replace(/(?:\(|\[)?(?:โทร\.?|เบอร์โทร\.?|tel\.?|phone)?\s*0[0-9-]{8,12}(?:\)|\])?/gi, "")
    .replace(/\s*0[0-9-]{8,12}\s*$/, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s*(?:รร\.ตชด\.|โรงเรียนตำรวจตระเวนชายแดน|ศกร\.ตชด\.|ศศช\.)[^\s,]*/gi, "")
    .replace(/^[-\s.:,;"]+|[-\s.:,;"]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // ปรับรูปแบบจุดย่อที่มีช่องว่างคั่น เช่น "ด. ต." -> "ด.ต.", "ส. ต. อ." -> "ส.ต.อ." และ "ส.ต.อ. หญิง" -> "ส.ต.อ.หญิง"
  cleaned = cleaned
    .replace(/([ก-๙]\.)\s+([ก-๙]\.)/g, "$1$2")
    .replace(/([ก-๙]\.)\s+([ก-๙]\.)/g, "$1$2")
    .replace(/([ก-๙]\.)\s*หญิง/g, "$1หญิง")
    .replace(/ว่าที่\s+/g, "ว่าที่ ")
    .trim();

  if (!cleaned || cleaned === "-" || cleaned === "ไม่ระบุ") return null;
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://") || cleaned.includes("drive.google.com")) {
    return null;
  }

  // 3. กรองคำ placeholder ทั่วไป
  if (GENERIC_PLACEHOLDER_REGEX.test(cleaned)) {
    return null;
  }

  // 4. ตรวจสอบเพศหญิงเบื้องต้น (จากคำว่า "หญิง", "นางสาว", "น.ส.", "นาง")
  let isFemale = /(?:หญิง|นางสาว|น\.ส\.|นาง)/.test(cleaned);

  // 5. จับคู่ยศ / คำนำหน้า จากตารางลำดับชั้น แบบวนซ้ำเพื่อรองรับคำนำหน้าที่ซ้อนกัน เช่น "ครู ด.ต. นาย สมชาย"
  let matchedRankCanon = "";
  let matchedRankWeight = 0;
  let cleanNameOnly = cleaned;

  let foundPrefix = true;
  while (foundPrefix && cleanNameOnly.length > 0) {
    foundPrefix = false;
    for (const tier of TEACHER_RANK_TIERS) {
      if (cleanNameOnly.startsWith(tier.prefix)) {
        if (tier.weight > matchedRankWeight) {
          matchedRankCanon = tier.canon;
          matchedRankWeight = tier.weight;
        }
        if (tier.isFemalePrefix) isFemale = true;
        cleanNameOnly = cleanNameOnly.substring(tier.prefix.length).trim();
        foundPrefix = true;
        break;
      }
    }
    cleanNameOnly = cleanNameOnly.replace(/^[-\s.:,;"]+/, "").trim();
  }

  // ลบเครื่องหมายวรรคตอนด้านหน้าและหลังชื่อสกุลที่เหลือ
  cleanNameOnly = cleanNameOnly.replace(/^[-\s.:,;"]+|[-\s.:,;"]+$/g, "").trim();

  // หากไม่มีชื่อเลย เหลือแต่ยศ เช่นพิมพ์ว่า "ด.ต." หรือ "ครู" โดดๆ
  if (!cleanNameOnly || cleanNameOnly.length < 2) {
    return null;
  }

  // กรองอีกครั้งหากชื่อที่เหลือเป็นคำ placeholder
  if (GENERIC_PLACEHOLDER_REGEX.test(cleanNameOnly)) {
    return null;
  }

  // สร้าง Canonical Key จากชื่อ-สกุลบริสุทธิ์ (ตัดคำนำหน้าทั่วไปที่อาจตกค้าง ตัดช่องว่างทั้งหมด และทำเป็นตัวพิมพ์เล็ก)
  // เพื่อให้ "ส.ต.อ. สมชาย ใจดี", "นายสมชาย ใจดี" และ "ด.ต. สมชาย ใจดี" ได้คีย์ "สมชายใจดี" ตรงกัน 100%
  const canonicalNameKey = cleanNameOnly
    .replace(/^(?:นาย|นางสาว|นาง|น\.ส\.|ครู)\s*/, "")
    .replace(/[\s\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase();

  // กำหนดชื่อแสดงผลเริ่มต้น (ถ้ามียศ ให้แสดงยศ + ชื่อ)
  let effectiveRank = matchedRankCanon;
  if (effectiveRank) {
    const tierMatch = TEACHER_RANK_TIERS.find((t) => t.canon === effectiveRank);
    if (isFemale && tierMatch?.canonFemale) {
      effectiveRank = tierMatch.canonFemale;
    }
  }
  const displayName = effectiveRank ? `${effectiveRank} ${cleanNameOnly}`.trim() : cleanNameOnly;

  return {
    displayName,
    cleanNameOnly,
    canonicalNameKey,
    rankCanon: matchedRankCanon,
    rankWeight: matchedRankWeight,
    isFemale,
  };
};

/**
 * แยกรายชื่อครูจากฟิลด์ reportedBy ของรายงาน (รองรับกรณีมีครูหลายท่านในรายงานเดียว เช่น คั่นด้วย , หรือ และ)
 */
export const extractTeachersFromReport = (raw: string): ExtractedTeacherInfo[] => {
  if (!raw || typeof raw !== "string") return [];
  const text = raw.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  if (!text || text === "-" || text === "ไม่ระบุ" || text.startsWith("http") || text.includes("drive.google.com")) {
    return [];
  }

  // แยกหลายชื่อถ้าคั่นด้วย จุลภาค, จุดคู่, บรรทัดใหม่ หรือคำว่า "และ", "/", "&"
  const tokens = text
    .split(/(?:,|\n|;|\s+และ\s+|\s*\/\s*|\s*&\s*)/)
    .map((s) => s.trim())
    .filter(Boolean);

  return tokens
    .map((token) => parseSingleTeacherToken(token))
    .filter((t): t is ExtractedTeacherInfo => Boolean(t));
};

export interface AggregatedTeacherItem {
  name: string;                // ชื่อแสดงผลที่รวมยศสูงสุดแล้ว
  cleanName: string;           // ชื่อ-สกุลบริสุทธิ์
  count: number;               // คะแนน / จำนวนครั้งที่ส่งรายงานรวมกัน
  schoolName?: string;         // โรงเรียนสังกัดหลัก
  schoolNames: string[];       // รายชื่อโรงเรียนทั้งหมดที่มีการส่งรายงาน
  totalParticipants: number;   // จำนวนผู้เข้าร่วมกิจกรรมรวมทั้งหมด
  highestRank: string;         // รูปยศสูงสุดที่ได้รับ
  highestWeight: number;       // คะแนนลำดับชั้นยศสูงสุด
  isFemale: boolean;           // เป็นสตรีหรือไม่
  canonicalNameKey: string;    // คีย์มาตรฐานสำหรับค้นหา / จับคู่
}

/**
 * ประมวลผลและรวมคะแนนครูคนเดียวกัน พร้อมอัปเกรดเป็นยศสูงสุดอัตโนมัติ
 * 
 * Logic:
 * 1. ครูที่มีชื่อ-สกุลเดียวกัน (canonicalNameKey ตรงกัน) จะถูกรวมคะแนน (count) เข้าด้วยกันเป็นคนเดียว
 * 2. หากมีบันทึกยศที่ต่างกันในแต่ละรายงาน ระบบจะเปรียบเทียบ rankWeight และเลือกยศสูงสุด (highestRank) เสมอ
 * 3. หากมีรายงานใดที่ระบุคำนำหน้าหรือยศสตรี ("หญิง", "นางสาว", "นาง") จะคงความเป็นยศสตรีไว้ในยศสูงสุด
 */
export const aggregateTeacherReports = (reports: ActivityReport[]): AggregatedTeacherItem[] => {
  const teacherMap: Record<
    string,
    {
      cleanName: string;
      count: number;
      schoolNames: Set<string>;
      schoolCounts: Record<string, number>;
      totalParticipants: number;
      highestRankCanon: string;
      highestWeight: number;
      isFemale: boolean;
      canonicalNameKey: string;
    }
  > = {};

  reports.forEach((r) => {
    const raw = (r.reportedBy || "").trim();
    if (!raw) return;

    const extracted = extractTeachersFromReport(raw);
    const school = r.schoolName ? r.schoolName.trim() : "";
    const participants = Number(r.participantsCount) || 0;

    // เที่ยงตรง: ป้องกันการนับคะแนนซ้ำ (Duplicate Count) สำหรับครูคนเดิมในรายงานฉบับเดียวกัน
    const seenTeacherKeysInReport = new Set<string>();

    extracted.forEach((rep) => {
      const key = rep.canonicalNameKey;
      if (!key) return;
      if (seenTeacherKeysInReport.has(key)) return;
      seenTeacherKeysInReport.add(key);

      if (!teacherMap[key]) {
        teacherMap[key] = {
          cleanName: rep.cleanNameOnly,
          count: 0,
          schoolNames: new Set(),
          schoolCounts: {},
          totalParticipants: 0,
          highestRankCanon: rep.rankCanon,
          highestWeight: rep.rankWeight,
          isFemale: rep.isFemale,
          canonicalNameKey: key,
        };
      }

      const entry = teacherMap[key];
      // 1. นับคะแนนรวมกัน
      entry.count += 1;
      entry.totalParticipants += participants;

      if (school) {
        entry.schoolNames.add(school);
        entry.schoolCounts[school] = (entry.schoolCounts[school] || 0) + 1;
      }

      // ตรวจจับเพศหญิง
      if (rep.isFemale) {
        entry.isFemale = true;
      }

      // รักษาชื่อที่สมบูรณ์ที่สุด (กรณีมีบันทึกชื่อย่อและชื่อเต็ม)
      if (rep.cleanNameOnly.length > entry.cleanName.length) {
        entry.cleanName = rep.cleanNameOnly;
      }

      // 2. หากยศต่าง ให้นับยศสูงสุด (Highest Rank Selection)
      if (rep.rankWeight > entry.highestWeight) {
        entry.highestWeight = rep.rankWeight;
        entry.highestRankCanon = rep.rankCanon;
      }
    });
  });

  // แปลงกลับเป็นรายการที่จัดรูปแบบชื่อเสร็จสมบูรณ์ และเรียงลำดับตามคะแนนสูงสุด
  const list: AggregatedTeacherItem[] = Object.values(teacherMap).map((entry) => {
    // หาโรงเรียนที่มีการส่งรายงานมากที่สุดเป็นสังกัดหลัก
    let primarySchool = "";
    let maxScCount = 0;
    Object.entries(entry.schoolCounts).forEach(([sc, cnt]) => {
      if (cnt > maxScCount) {
        maxScCount = cnt;
        primarySchool = sc;
      }
    });
    if (!primarySchool && entry.schoolNames.size > 0) {
      primarySchool = Array.from(entry.schoolNames)[0];
    }

    // กำหนดยศสูงสุดที่สมบูรณ์ (คำนึงถึงเพศ)
    let finalRank = entry.highestRankCanon;
    if (finalRank) {
      const tierMatch = TEACHER_RANK_TIERS.find((t) => t.canon === finalRank);
      if (entry.isFemale && tierMatch?.canonFemale) {
        finalRank = tierMatch.canonFemale;
      }
    }

    const finalDisplayName = finalRank ? `${finalRank} ${entry.cleanName}`.trim() : entry.cleanName;

    return {
      name: finalDisplayName,
      cleanName: entry.cleanName,
      count: entry.count,
      schoolName: primarySchool || undefined,
      schoolNames: Array.from(entry.schoolNames),
      totalParticipants: entry.totalParticipants,
      highestRank: finalRank,
      highestWeight: entry.highestWeight,
      isFemale: entry.isFemale,
      canonicalNameKey: entry.canonicalNameKey,
    };
  });

  // จัดเรียงตามคะแนนรายงานสูงสุด (อันดับ ๑, ๒, ๓, ...)
  return list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "th"));
};
