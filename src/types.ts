export enum ReportStatus {
  COMPLETED = "เสร็จสิ้น",
  IN_PROGRESS = "กำลังดำเนินการ",
  OVERDUE = "ล่าช้ากว่าแผน",
  DRAFT = "ร่างรายงาน"
}

export interface KopodotGoal {
  id: number;
  code: string;
  title: string;
  color: string;
  description: string;
}

export const KOPODOT_GOALS: KopodotGoal[] = [
  {
    id: 1,
    code: "ด้านที่ 1",
    title: "การเสริมสร้างสุขภาพของเด็กตั้งแต่ในครรภ์มารดา",
    color: "#E11D48", // Rose-600
    description: "โภชนาการและสุขภาพอนามัยของเด็กและเยาวชนได้รับการพัฒนาตามเกณฑ์มาตรฐาน สุขอนามัยส่วนบุคคล อาหาร 5 หมู่"
  },
  {
    id: 2,
    code: "ด้านที่ 2",
    title: "การเพิ่มโอกาสทางการศึกษา",
    color: "#2563EB", // Blue-600
    description: "เด็กและเยาวชนได้รับโอกาสในการศึกษาจนถึงระดับสูงสุดตามศักยภาพและความถนัด"
  },
  {
    id: 3,
    code: "ด้านที่ 3",
    title: "การเสริมสร้างศักยภาพของเด็กและเยาวชนทางวิชาการและทางจริยธรรม",
    color: "#4F46E5", // Indigo-600
    description: "เด็กและเยาวชนมีคุณภาพและความสมบูรณ์ทางวิชาการ อ่านออกเขียนได้ตามระดับชั้น และได้รับการปลูกฝังคุณธรรมจริยธรรม"
  },
  {
    id: 4,
    code: "ด้านที่ 4",
    title: "การเสริมสร้างศักยภาพของเด็กและเยาวชนทางการงานอาชีพ",
    color: "#9333EA", // Purple-600
    description: "ปฏิบัติการแปลงเกษตร ปลูกผัก เลี้ยงไก่ไข่ ปลา เพาะเห็ด เพื่ออาหารกลางวัน และฝึกทักษะงานอาชีพ"
  },
  {
    id: 5,
    code: "ด้านที่ 5",
    title: "การปลูกฝังจิตสำนึกและพัฒนาศักยภาพของเด็กและเยาวชนในการอนุรักษ์ทรัพยากรธรรมชาติและสิ่งแวดล้อม",
    color: "#10B981", // Emerald-600
    description: "งานสวนพฤกษศาสตร์โรงเรียน กิจกรรม 5 ส. คัดแยกขยะ ธนาคารขยะ การประหยัดพลังงานน้ำ-ไฟฟ้า"
  },
  {
    id: 6,
    code: "ด้านที่ 6",
    title: "การเสริมสร้างศักยภาพของเด็กและเยาวชนในการอนุรักษ์และสืบทอดวัฒนธรรมและภูมิปัญญาของท้องถิ่นและของชาติไทย",
    color: "#D97706", // Amber-600
    description: "มารยาทไทย ยิ้ม-ไหว้-ทักทาย การอนุรักษ์ภาษาถิ่น ดนตรี นาฏศิลป์ หัตถกรรมพื้นบ้าน"
  },
  {
    id: 7,
    code: "ด้านที่ 7",
    title: "การขยายการพัฒนาจากโรงเรียนสู่ชุมชน",
    color: "#0D9488", // Teal-600
    description: "การขยายกิจกรรมการพัฒนาจากโรงเรียนสู่ครัวเรือน และการดำเนินกิจกรรมสหกรณ์ออมทรัพย์"
  },
  {
    id: 8,
    code: "ด้านที่ 8",
    title: "การพัฒนาสถานศึกษาเป็นศูนย์บริการความรู้",
    color: "#0284C7", // Sky-600
    description: "สถานศึกษาเป็นศูนย์กลางการบริการน้ำดื่มสะอาด แหล่งสาธิตถ่ายทอดเทคโนโลยีและการเรียนรู้ของชุมชน"
  }
];

export interface ActivityReport {
  id: string;
  projectName: string;       // ชื่อโครงการหลัก
  activityName: string;      // ชื่อกิจกรรมย่อย
  goalCode: string;          // ด้านที่ 1 - 8
  kpiCode?: string;          // รหัสตัวชี้วัด เช่น KPI-14
  schoolName: string;        // โรงเรียน/หน่วยงาน
  reportingPeriod: string;   // งวดรายงาน (เช่น งวดที่ 1/2569)
  dateString: string;        // วันที่ดำเนินกิจกรรม (เช่น 15 มีนาคม 2569)
  location: string;          // สถานที่ดำเนินกิจกรรม
  
  // ผู้ร่วมกิจกรรม
  targetGroup: string;       // กลุ่มเป้าหมาย (เช่น นักเรียนชั้นประถม, ผู้ปกครอง)
  participantsCount: number; // จำนวนผู้เข้าร่วมทั้งหมด (คน)
  citizensCount?: number;    // จำนวนประชาชน (คน)
  
  // ผลการดำเนินงาน
  objectives: string;        // วัตถุประสงค์โครงการ
  details: string;           // รายละเอียดและลำดับขั้นตอนดำเนินกิจกรรม
  quantitativeOutcome: string;// ผลผลิตเชิงปริมาณ
  qualitativeOutcome: string; // ผลลัพธ์เชิงคุณภาพ
  problems: string;          // ปัญหาและอุปสรรคที่พบ
  suggestions: string;       // แนวทางแก้ไขและข้อเสนอแนะ
  
  // เมทาดาตาและการอนุมัติ
  reportedBy: string;        // ชื่อผู้รายงานผล
  reportPosition: string;    // ตำแหน่งผู้รายงาน
  approverName: string;      // ชื่อผู้อนุมัติ/ผู้ตรวจ (เช่น ผู้อำนวยการโรงเรียน)
  approverPosition: string;  // ตำแหน่งผู้อนุมัติ
  verifiedBy?: string;       // ผู้ตรวจรายงาน (ถ้ามี)
  verifiedPosition?: string; // ตำแหน่งผู้ตรวจ (ถ้ามี)
  executiveComment?: string; // ข้อคิดเห็นของผู้ตรวจ / ผู้บังคับบัญชา
  approverSignatureUrl?: string; // ลายเซ็นดิจิทัลของผู้ตรวจ/ครูใหญ่ (Base64 PNG)
  reporterSignatureUrl?: string; // ลายเซ็นดิจิทัลของผู้รายงาน/ครูผู้รับผิดชอบ (Base64 PNG)
  status: ReportStatus;      // สถานะ
  lastUpdated: string;       // วันที่อัปเดตล่าสุด
  
  // ลิงก์รูปภาพและวิดีโอกิจกรรม
  imageUrl?: string;         // ลิงก์รูปภาพกิจกรรม
  videoUrl?: string;         // ลิงก์วิดีโอ/คลิปกิจกรรม (ถ้ามี)
  timestamp?: string;        // ประทับเวลาจาก Google Forms
  gradeLevel?: string;       // ระดับชั้น (ถ้ามี)
  subGoalText?: string;      // เป้าหมายย่อยจาก Google Form
  kpiIndicatorText?: string; // ตัวชี้วัดจาก Google Form
}

export interface GoogleSheetsConfig {
  sheetUrl: string;
  isSynced: boolean;
  lastSyncedAt?: string;
  columnMapping: {
    projectName: string;
    activityName: string;
    goalCode: string;
    schoolName: string;
    participantsCount: string;
    status: string;
  };
}

export interface GeminiAnalysisResult {
  mappedGoalCode: string;
  goalExplanation: string;
  bureaucraticSummary: string;
  strengths: string[];
  suggestions: string[];
  confidenceScore: number;
}

export function getGoalIdFromCode(goalCode: string | undefined | null): number {
  if (!goalCode) return 1;
  const match = goalCode.match(/\d+/);
  if (match) {
    const val = parseInt(match[0], 10);
    if (val >= 1 && val <= 8) return val;
  }
  // Try mapping common Thai numbers
  const thDigits: Record<string, number> = { "๑": 1, "๒": 2, "๓": 3, "๔": 4, "๕": 5, "๖": 6, "๗": 7, "๘": 8, "๙": 9 };
  for (const char of goalCode) {
    if (thDigits[char] !== undefined) {
      const val = thDigits[char];
      if (val >= 1 && val <= 8) return val;
    }
  }
  return 1; // Fallback default
}

export function normalizeGoalCode(goalCode: string | undefined | null): string {
  const id = getGoalIdFromCode(goalCode);
  return `ด้านที่ ${id}`;
}

export function formatNumberWithComma(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "0";
  const strVal = String(val).trim();
  const parsed = Number(strVal.replace(/,/g, ""));
  if (!isNaN(parsed)) {
    return parsed.toLocaleString("th-TH");
  }
  return strVal;
}

export function toThaiNumerals(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return "";
  const numStr = String(num);
  const thaiToArabicMap: Record<string, string> = {
    '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
    '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9'
  };
  return numStr.replace(/[๐-๙]/g, (d) => thaiToArabicMap[d] || d);
}

