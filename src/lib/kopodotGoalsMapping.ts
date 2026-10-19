import { ActivityReport, getGoalIdFromCode, KOPODOT_GOALS } from "../types";
import { OFFICIAL_INDICATORS, ActivityIndicator } from "../data/indicatorsData";

export const toThaiNumerals = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return "";
  const thToArabicMap: Record<string, string> = {
    '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
    '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9'
  };
  return String(val).replace(/[๐-๙]/g, (digit) => thToArabicMap[digit] || digit);
};

/**
 * Parses indicator ID or number from activity text, e.g. "(ช 9)", "(ช 11 )", "(ช14)", "(ช 15)", "(ช.1-2)", "(ช21)", "KPI-14", "ตัวชี้วัดที่ 14"
 */
export const extractIndicatorNumbersFromText = (text: string): number[] => {
  if (!text) return [];
  const results: number[] = [];

  // Match pattern like (ช 9), (ช 11 ), (ช14), (ช.1-2), (ช 6-8)
  const bracketMatches = text.matchAll(/\(ช\s*\.?\s*(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s*\)/gi);
  for (const m of bracketMatches) {
    const start = parseInt(m[1], 10);
    if (!isNaN(start) && start >= 1 && start <= 34) {
      results.push(start);
      if (m[2]) {
        const end = parseInt(m[2], 10);
        if (!isNaN(end) && end >= start && end <= 34) {
          for (let k = start + 1; k <= end; k++) {
            results.push(k);
          }
        }
      }
    }
  }

  // Match pattern like ตัวชี้วัดที่ 9, ตัวชี้วัด 14, ช.9, ช 14
  const codeMatches = text.matchAll(/(?:ตัวชี้วัดที่|ตัวชี้วัด|ช\s*\.?)\s*(\d{1,2})/gi);
  for (const m of codeMatches) {
    const num = parseInt(m[1], 10);
    if (!isNaN(num) && num >= 1 && num <= 34 && !results.includes(num)) {
      results.push(num);
    }
  }

  // Match pattern like KPI-09, KPI 14
  const kpiMatches = text.matchAll(/KPI-?\s*(\d{1,2})/gi);
  for (const m of kpiMatches) {
    const num = parseInt(m[1], 10);
    if (!isNaN(num) && num >= 1 && num <= 34 && !results.includes(num)) {
      results.push(num);
    }
  }

  return results;
};

/**
 * Finds the primary official indicator for a given activity report by inspecting kpiCode, activityName, projectName, and details.
 */
export const findIndicatorForReport = (
  report: Partial<Pick<ActivityReport, "goalCode" | "kpiCode" | "activityName" | "projectName" | "details" | "objectives">>,
  fallbackGoalId?: number
): ActivityIndicator | null => {
  const goalId = fallbackGoalId || getGoalIdFromCode(report.goalCode || "1");
  const goalIndicators = OFFICIAL_INDICATORS.filter((ind) => ind.goalId === goalId);

  // 1. Explicit kpiCode property on the report
  if (report.kpiCode && report.kpiCode.trim()) {
    const tokens = report.kpiCode.split(",").map((t) => t.trim());
    for (const token of tokens) {
      const matchedInGoal = goalIndicators.find(
        (ind) =>
          ind.id.toLowerCase() === token.toLowerCase() ||
          ind.code.replace(/[^\d]/g, "") === token.replace(/[^\d]/g, "") ||
          ind.name.toLowerCase().includes(token.toLowerCase())
      );
      if (matchedInGoal) return matchedInGoal;

      const matchedGlobal = OFFICIAL_INDICATORS.find(
        (ind) =>
          ind.id.toLowerCase() === token.toLowerCase() ||
          ind.code.replace(/[^\d]/g, "") === token.replace(/[^\d]/g, "") ||
          ind.name.toLowerCase().includes(token.toLowerCase())
      );
      if (matchedGlobal) return matchedGlobal;
    }
  }

  // 2. Extract numeric indicator hints from activityName, projectName, details
  const combinedText = `${report.activityName || ""} ${report.projectName || ""} ${report.objectives || ""} ${report.details || ""}`;
  const extractedNums = extractIndicatorNumbersFromText(combinedText);
  if (extractedNums.length > 0) {
    // Prefer the first one that matches the report's goal
    for (const num of extractedNums) {
      const matchInGoal = goalIndicators.find(
        (ind) => ind.id === `KPI-${String(num).padStart(2, "0")}` || parseInt(ind.code.replace(/[^\d]/g, ""), 10) === num
      );
      if (matchInGoal) return matchInGoal;
    }
    // Otherwise return matching global indicator
    const firstNum = extractedNums[0];
    const matchGlobal = OFFICIAL_INDICATORS.find(
      (ind) => ind.id === `KPI-${String(firstNum).padStart(2, "0")}` || parseInt(ind.code.replace(/[^\d]/g, ""), 10) === firstNum
    );
    if (matchGlobal) return matchGlobal;
  }

  // 3. Keyword semantic matching
  const act = `${report.activityName || ""} ${report.projectName || ""}`.toLowerCase();
  
  if (act.includes("ไอโอดีน")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-11") || null;
  }
  if (act.includes("แปรงฟัน") || act.includes("ล้างมือ") || act.includes("สุขลักษณะ") || act.includes("๗ ขั้นตอน") || act.includes("7 ขั้นตอน")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-15") || null;
  }
  if (act.includes("บริโภคอาหาร") || act.includes("อาหาร ๕ หมู่") || act.includes("อาหาร 5 หมู่") || act.includes("ธงโภชนาการ")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-14") || null;
  }
  if (act.includes("เลือกรับประทาน") || act.includes("ตัดสินใจเลือก") || act.includes("คุณค่าทางโภชนาการ")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-09") || null;
  }
  if (act.includes("สมรรถภาพทางกาย") || act.includes("ทดสอบสมรรถภาพ")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-10") || null;
  }
  if (act.includes("ชั่งน้ำหนัก") || act.includes("ส่วนสูง") || act.includes("ผอม") || act.includes("ทุพโภชนาการ")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-08") || null;
  }
  if (act.includes("หนอนพยาธิ") || act.includes("ตรวจอุจจาระ")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-13") || null;
  }
  if (act.includes("วัคซีน") || act.includes("โรคติดต่อ")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-12") || null;
  }
  if (act.includes("หญิงตั้งครรภ์") || act.includes("ทารกแรกเกิด") || act.includes("ฝากครรภ์")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-01") || null;
  }
  if (act.includes("พระราชานุเคราะห์") || act.includes("นักเรียนทุน")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-18") || null;
  }
  if (act.includes("ภาษาไทย") || act.includes("อ่านออกเขียนได้") || act.includes("คัดลายมือ") || act.includes("แจกลูกสะกดคำ")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-21") || null;
  }
  if (act.includes("วิทยาศาสตร์") || act.includes("สะเต็ม") || act.includes("stem")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-22") || null;
  }
  if (act.includes("คณิตศาสตร์") || act.includes("คิดเลขเร็ว") || act.includes("สูตรคูณ")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-23") || null;
  }
  if (act.includes("ภาษาอังกฤษ") || act.includes("english")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-24") || null;
  }
  if (act.includes("คุณธรรม") || act.includes("จริยธรรม") || act.includes("จิตสาธารณะ") || act.includes("วินัย") || act.includes("สวดมนต์")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-25") || null;
  }
  if (act.includes("คอมพิวเตอร์") || act.includes("ict") || act.includes("เทคโนโลยีสารสนเทศ") || act.includes("ดิจิทัล")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-26") || null;
  }
  if (act.includes("เกษตรเพื่ออาหารกลางวัน") || act.includes("แปลงผัก") || act.includes("ไก่ไข่") || act.includes("เพาะเห็ด") || act.includes("บ่อปลา") || act.includes("ผลผลิตการเกษตร")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-27") || null;
  }
  if (act.includes("วิชาเกษตร") || act.includes("ปุ๋ยหมัก") || act.includes("น้ำหมักชีวภาพ")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-28") || null;
  }
  if (act.includes("วิชาชีพ") || act.includes("แปรรูปผลผลิต") || act.includes("งานช่าง") || act.includes("คหกรรม") || act.includes("ฝึกทักษะอาชีพ")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-29") || null;
  }
  if (act.includes("สหกรณ์") || act.includes("ออมทรัพย์") || act.includes("ร้านค้าสหกรณ์") || act.includes("บันทึกบัญชี") || act.includes("บัญชีครัวเรือน")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-30") || null;
  }
  if (act.includes("สิ่งแวดล้อม") || act.includes("สวนพฤกษศาสตร์") || act.includes("ธนาคารขยะ") || act.includes("คัดแยกขยะ") || act.includes("๕ ส.") || act.includes("5 ส.") || act.includes("อนุรักษ์ธรรมชาติ")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-31") || null;
  }
  if (act.includes("วัฒนธรรม") || act.includes("ภูมิปัญญา") || act.includes("ดนตรีไทย") || act.includes("นาฏศิลป์") || act.includes("มารยาทไทย") || act.includes("ทอผ้า")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-32") || null;
  }
  if (act.includes("สู่ชุมชน") || act.includes("สู่ครัวเรือน") || act.includes("ขยายผลสู่ชุมชน")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-33") || null;
  }
  if (act.includes("ศูนย์บริการความรู้") || act.includes("ศึกษาดูงาน") || act.includes("แหล่งเรียนรู้") || act.includes("น้ำดื่มสะอาด")) {
    return OFFICIAL_INDICATORS.find((ind) => ind.id === "KPI-34") || null;
  }

  // 4. Fallback to first indicator of goal
  return goalIndicators.length > 0 ? goalIndicators[0] : null;
};

/**
 * Returns accurate SubGoal (เป้าหมายย่อย) and Objective (เป้าหมายตามวัตถุประสงค์)
 * strictly mapped to Plan 5 (กพด. ฉบับที่ ๕ พ.ศ. ๒๕๖๐ - ๒๕๖๙)
 */
export const getGoalsContext = (
  goalCode: string,
  indicator?: ActivityIndicator | null,
  activityName?: string
): { subGoal: string; objective: string } => {
  const goalId = getGoalIdFromCode(goalCode || "1");
  const kpiNum = indicator ? parseInt(indicator.code.replace(/[^\d]/g, ""), 10) : 0;

  // Specific mapping by Indicator (กพด. ฉบับที่ 5)
  if (kpiNum >= 1 && kpiNum <= 4) {
    return {
      subGoal: "เป้าหมายที่ ๑.๑ เด็กแรกเกิดถึง ๓ ปีบริบูรณ์มีโภชนาการและพัฒนาการสมวัย",
      objective: "เป้าหมายที่ ๑ เด็กแรกเกิดถึง ๓ ปีบริบูรณ์มีโภชนาการและพัฒนาการสมวัย และได้รับการดูแลสุขภาพอย่างเหมาะสม"
    };
  }
  if (kpiNum >= 5 && kpiNum <= 7) {
    return {
      subGoal: "เป้าหมายที่ ๑.๒ เด็กปฐมวัย (๓–๕ ปี) มีโภชนาการและพัฒนาการสมวัย",
      objective: "เป้าหมายที่ ๒ เด็กปฐมวัยและนักเรียนมีน้ำหนัก ส่วนสูง และมีพัฒนาการตามเกณฑ์มาตรฐาน"
    };
  }
  if (kpiNum >= 8 && kpiNum <= 10) {
    return {
      subGoal: "เป้าหมายที่ ๑.๓ นักเรียนมีภาวะโภชนาการดี เจริญเติบโตตามวัย และมีสมรรถภาพทางกายตามเกณฑ์",
      objective: "เป้าหมายที่ ๒ เด็กปฐมวัยและนักเรียนมีน้ำหนัก ส่วนสูง และมีพัฒนาการตามเกณฑ์มาตรฐาน"
    };
  }
  if (kpiNum >= 11 && kpiNum <= 13) {
    return {
      subGoal: "เป้าหมายที่ ๑.๔ ปลอดจากโรคที่ป้องกันได้ด้วยวัคซีน โรคขาดสารไอโอดีน หนอนพยาธิ และโรคติดต่อในโรงเรียน",
      objective: "เป้าหมายที่ ๓ เด็กและเยาวชนปลอดภัยจากโรคติดต่อและปัญหาสุขภาพอนามัยที่สำคัญ"
    };
  }
  if (kpiNum >= 14 && kpiNum <= 15) {
    return {
      subGoal: "เป้าหมายที่ ๑.๕ นักเรียนมีพฤติกรรมการบริโภคอาหารที่ถูกต้องและมีสุขลักษณะนิสัยที่พึงประสงค์",
      objective: "เป้าหมายที่ ๔ นักเรียนมีสุขนิสัยและพฤติกรรมอนามัยที่ดีตามเกณฑ์มาตรฐานสุขศึกษา"
    };
  }
  if (kpiNum === 16 || kpiNum === 17) {
    return {
      subGoal: "เป้าหมายที่ ๒.๑ เด็กวัยเรียนทุกคนรวมถึงเด็กพิการและด้อยโอกาสได้รับการศึกษาขั้นพื้นฐานอย่างทั่วถึง",
      objective: "เป้าหมายที่ ๑ เด็กและเยาวชนในถิ่นทุรกันดารเข้าถึงการศึกษาขั้นพื้นฐานอย่างเสมอภาคและมีคุณภาพ"
    };
  }
  if (kpiNum >= 18 && kpiNum <= 20) {
    return {
      subGoal: "เป้าหมายที่ 2.2 นักเรียนในพระราชานุเคราะห์ได้รับการสนับสนุนการศึกษาจนถึงระดับสูงสุดตามศักยภาพและมีจิตสาธารณะ",
      objective: "เป้าหมายที่ 2 ส่งเสริมนักเรียนทุนพระราชทานให้สำเร็จการศึกษาและมีจิตสำนึกรับใช้สังคม"
    };
  }
  if (kpiNum >= 21 && kpiNum <= 24) {
    return {
      subGoal: "เป้าหมายที่ 3.1 นักเรียนมีความรู้และทักษะที่จำเป็นในกลุ่มสาระวิชาการหลัก (ภาษาไทย วิทยาศาสตร์ คณิตศาสตร์ ภาษาอังกฤษ)",
      objective: "เป้าหมายที่ 1 เด็กและเยาวชนมีความรู้และทักษะที่จำเป็นในวิชาภาษาไทย คณิตศาสตร์ และวิทยาศาสตร์เพิ่มขึ้น (รายงานผลเฉพาะโรงเรียนในสังกัดกองบัญชาการตำรวจตระเวนชายแดน)"
    };
  }
  if (kpiNum === 25) {
    return {
      subGoal: "เป้าหมายที่ 3.2 นักเรียนได้รับการปลูกฝังคุณธรรม จริยธรรม มีระเบียบวินัย และคุณลักษณะอันพึงประสงค์",
      objective: "เป้าหมายที่ 2 เด็กและเยาวชนมีคุณธรรม จริยธรรม ซื่อสัตย์สุจริต และมีจิตสาธารณะ"
    };
  }
  if (kpiNum === 26) {
    return {
      subGoal: "เป้าหมายที่ 3.3 นักเรียนมีสมรรถนะและทักษะในการใช้เทคโนโลยีสารสนเทศและการสื่อสารอย่างสร้างสรรค์",
      objective: "เป้าหมายที่ 3 ส่งเสริมการรู้เท่าทันสื่อและทักษะดิจิทัลเพื่อการเรียนรู้ตลอดชีวิต"
    };
  }
  if (kpiNum === 27) {
    return {
      subGoal: "เป้าหมายที่ 4.1 โรงเรียนผลิตอาหารเกษตรปลอดภัยได้เพียงพอกับความต้องการบริโภคของนักเรียน",
      objective: "เป้าหมายที่ 1 สนับสนุนโครงการเกษตรเพื่ออาหารกลางวันและสร้างความมั่นคงทางอาหารในสถานศึกษา"
    };
  }
  if (kpiNum === 28) {
    return {
      subGoal: "เป้าหมายที่ 4.2 นักเรียนมีความรู้ ทักษะ และเจตคติที่ดีต่อวิชาเกษตรกรรมตามแนวทางเศรษฐกิจพอเพียง",
      objective: "เป้าหมายที่ 2 นักเรียนได้รับการฝึกทักษะการเกษตรแบบพึ่งตนเองและสามารถนำไปปฏิบัติจริงได้"
    };
  }
  if (kpiNum === 29) {
    return {
      subGoal: "เป้าหมายที่ 4.3 นักเรียนมีความรู้และทักษะวิชาชีพพื้นฐานที่จำเป็นต่อการดำรงชีวิตและการประกอบอาชีพ",
      objective: "เป้าหมายที่ 3 พัฒนาศักยภาพด้านทักษะอาชีพ หัตถกรรม และการแปรรูปผลผลิตอย่างครบวงจร"
    };
  }
  if (kpiNum === 30) {
    return {
      subGoal: "เป้าหมายที่ 4.4 นักเรียนมีความรู้ความเข้าใจในหลักการสหกรณ์ การทำบัญชี และมีนิสัยรักการออม",
      objective: "เป้าหมายที่ 4 ส่งเสริมกิจกรรมสหกรณ์นักเรียนและการออมทรัพย์เพื่อการพึ่งพาตนเอง"
    };
  }
  if (kpiNum === 31) {
    return {
      subGoal: "เป้าหมายที่ 5.1 เด็กและเยาวชนมีจิตสำนึกและร่วมมือในการอนุรักษ์ทรัพยากรธรรมชาติ ป่าไม้ ดิน น้ำ และสิ่งแวดล้อม",
      objective: "เป้าหมายที่ 1 เกิดกระบวนการเรียนรู้และการมีส่วนร่วมในการอนุรักษ์ทรัพยากรธรรมชาติและพลังงานทดแทนอย่างยั่งยืน"
    };
  }
  if (kpiNum === 32) {
    return {
      subGoal: "เป้าหมายที่ 6.1 เด็กและเยาวชนมีความภาคภูมิใจและร่วมสืบทอดมรดกทางวัฒนธรรมและภูมิปัญญาท้องถิ่นรวมทั้งภาษาไทย",
      objective: "เป้าหมายที่ 1 มีความรอบรู้และเห็นคุณค่า วัฒนธรรมวิถีชุมชน และภาษาไทยอย่างถูกต้อง"
    };
  }
  if (kpiNum === 33) {
    return {
      subGoal: "เป้าหมายที่ 7.1 ขยายผลกิจกรรมการพัฒนาจากสถานศึกษาสู่ครัวเรือนเพื่อความมั่นคงทางอาหารและสุขภาวะที่ดี",
      objective: "เป้าหมายที่ 1 ส่งเสริมการมีส่วนร่วมและการถ่ายทอดเทคโนโลยีที่เหมาะสมจากโรงเรียนสู่ชุมชนอย่างบูรณาการ"
    };
  }
  if (kpiNum === 34) {
    return {
      subGoal: "เป้าหมายที่ 8.1 สถานศึกษาพัฒนาเป็นแหล่งเรียนรู้ ศูนย์สาธิต และให้บริการทางวิชาการแก่ชุมชนและเครือข่าย",
      objective: "เป้าหมายที่ 1 พัฒนาโรงเรียนให้มีความพร้อมในการเป็นศูนย์บริการความรู้และศูนย์กลางการพัฒนาท้องถิ่น"
    };
  }

  // Fallback by Goal ID (1 to 8)
  switch (goalId) {
    case 1: {
      const act = (activityName || "").toLowerCase();
      if (act.includes("แปรงฟัน") || act.includes("ล้างมือ") || act.includes("สุขลักษณะ") || act.includes("บริโภคอาหาร")) {
        return {
          subGoal: "เป้าหมายที่ 1.5 นักเรียนมีพฤติกรรมการบริโภคอาหารที่ถูกต้องและมีสุขลักษณะนิสัยที่พึงประสงค์",
          objective: "เป้าหมายที่ 4 นักเรียนมีสุขนิสัยและพฤติกรรมอนามัยที่ดีตามเกณฑ์มาตรฐานสุขศึกษา"
        };
      }
      if (act.includes("ไอโอดีน") || act.includes("หนอนพยาธิ") || act.includes("วัคซีน")) {
        return {
          subGoal: "เป้าหมายที่ 1.4 ปลอดจากโรคที่ป้องกันได้ด้วยวัคซีน โรคขาดสารไอโอดีน หนอนพยาธิ และโรคติดต่อในโรงเรียน",
          objective: "เป้าหมายที่ 3 เด็กและเยาวชนปลอดภัยจากโรคติดต่อและปัญหาสุขภาพอนามัยที่สำคัญ"
        };
      }
      if (act.includes("เลือกรับประทาน") || act.includes("สมรรถภาพ") || act.includes("ชั่งน้ำหนัก")) {
        return {
          subGoal: "เป้าหมายที่ 1.3 นักเรียนมีภาวะโภชนาการดี เจริญเติบโตตามวัย และมีสมรรถภาพทางกายตามเกณฑ์",
          objective: "เป้าหมายที่ 2 เด็กปฐมวัยและนักเรียนมีน้ำหนัก ส่วนสูง และมีพัฒนาการตามเกณฑ์มาตรฐาน"
        };
      }
      return {
        subGoal: "เป้าหมายที่ 1.1 เด็กแรกเกิดถึง 3 ปีบริบูรณ์มีโภชนาการและพัฒนาการสมวัย",
        objective: "เป้าหมายที่ 1 เด็กและเยาวชนมีสุขภาพแข็งแรง มีน้ำหนัก ส่วนสูง และมีพัฒนาการตามเกณฑ์มาตรฐาน"
      };
    }
    case 2:
      return {
        subGoal: "เป้าหมายที่ 2.1 เด็กวัยเรียนทุกคนรวมถึงเด็กพิการและด้อยโอกาสได้รับการศึกษาขั้นพื้นฐานอย่างทั่วถึง",
        objective: "เป้าหมายที่ 1 เด็กและเยาวชนเข้าถึงการศึกษาและการเรียนรู้ตลอดชีวิตที่มีคุณภาพ"
      };
    case 3:
      return {
        subGoal: "เป้าหมายที่ 3.1 นักเรียนมีความรู้และทักษะที่จำเป็นในกลุ่มสาระวิชาการหลัก (ภาษาไทย วิทยาศาสตร์ คณิตศาสตร์ ภาษาอังกฤษ)",
        objective: "เป้าหมายที่ 1 เด็กและเยาวชนมีความรู้และทักษะที่จำเป็นในวิชาภาษาไทย คณิตศาสตร์ และวิทยาศาสตร์เพิ่มขึ้น (รายงานผลเฉพาะโรงเรียนในสังกัดกองบัญชาการตำรวจตระเวนชายแดน)"
      };
    case 4:
      return {
        subGoal: "เป้าหมายที่ 4.1 โรงเรียนผลิตอาหารเกษตรปลอดภัยได้เพียงพอกับความต้องการบริโภคของนักเรียน",
        objective: "เป้าหมายที่ 1 นักเรียนพัฒนาศักยภาพด้านทักษะอาชีพและการสหกรณ์อย่างครบวงจร"
      };
    case 5:
      return {
        subGoal: "เป้าหมายที่ 5.1 เด็กและเยาวชนมีจิตสำนึกและร่วมมือในการอนุรักษ์ทรัพยากรธรรมชาติ ป่าไม้ ดิน น้ำ และสิ่งแวดล้อม",
        objective: "เป้าหมายที่ 1 เกิดกระบวนการเรียนรู้และการมีส่วนร่วมในการอนุรักษ์ทรัพยากรธรรมชาติและพลังงานทดแทนอย่างยั่งยืน"
      };
    case 6:
      return {
        subGoal: "เป้าหมายที่ 6.1 เด็กและเยาวชนมีความภาคภูมิใจและร่วมสืบทอดมรดกทางวัฒนธรรมและภูมิปัญญาท้องถิ่นรวมทั้งภาษาไทย",
        objective: "เป้าหมายที่ 1 มีความรอบรู้และเห็นคุณค่า วัฒนธรรมวิถีชุมชน และภาษาไทยอย่างถูกต้อง"
      };
    case 7:
      return {
        subGoal: "เป้าหมายที่ 7.1 ขยายผลกิจกรรมการพัฒนาจากสถานศึกษาสู่ครัวเรือนเพื่อความมั่นคงทางอาหารและสุขภาวะที่ดี",
        objective: "เป้าหมายที่ 1 ส่งเสริมการมีส่วนร่วมและสุขภาวะของคนในชุมชนท้องถิ่นอย่างบูรณาการ"
      };
    case 8:
      return {
        subGoal: "เป้าหมายที่ 8.1 สถานศึกษาพัฒนาเป็นแหล่งเรียนรู้ ศูนย์สาธิต และให้บริการทางวิชาการแก่ชุมชนและเครือข่าย",
        objective: "เป้าหมายที่ 1 โรงเรียนมีความมั่นคงและเป็นศูนย์กลางแห่งการเรียนรู้ของเครือข่าย"
      };
    default:
      return {
        subGoal: "เป้าหมายที่ 3.1 นักเรียนมีความรู้และทักษะที่จำเป็นในกลุ่มสาระวิชาการหลัก (ภาษาไทย วิทยาศาสตร์ คณิตศาสตร์ ภาษาอังกฤษ)",
        objective: "เป้าหมายที่ 1 เด็กและเยาวชนมีความรู้และทักษะที่จำเป็นในวิชาภาษาไทย คณิตศาสตร์ และวิทยาศาสตร์เพิ่มขึ้น"
      };
  }
};
