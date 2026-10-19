/**
 * Unified Google Sheet & CSV Parser for Kopodot System
 * Supports Dynamic Column Mapping (ColumnMappingConfig), 60-Column Google Form Layout,
 * 100% School Matching, and Official KPI Indicator Resolution.
 */

import { ActivityReport, ReportStatus, getGoalIdFromCode } from "../types";
import { OFFICIAL_TARGET_SCHOOLS, isSchoolMatch } from "../data/schoolsData";
import { ColumnMappingConfig, DEFAULT_COLUMN_MAPPING } from "../components/ColumnMapperModal";
import { findIndicatorForReport } from "./kopodotGoalsMapping";

/**
 * Character-by-character CSV Parser with full quote, newline, and comma escaping support.
 */
export const parseRawCSVRows = (text: string): string[][] => {
  const resultRows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        resultRows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      resultRows.push(currentRow);
    }
  }

  return resultRows;
};

/**
 * Parses Thai or Arabic numerals from text to integer
 */
export const parseThaiNumber = (text: string): number => {
  if (!text) return 1;
  const thDigits: Record<string, number> = { "๑": 1, "๒": 2, "๓": 3, "๔": 4, "๕": 5, "๖": 6, "๗": 7, "๘": 8, "๙": 9 };
  for (const char of text) {
    if (thDigits[char] !== undefined) return thDigits[char];
  }
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
};

/**
 * Cleans string for fuzzy header matching (removes emojis, symbols, whitespace)
 */
const cleanHeaderKey = (header: string): string => {
  return (header || "")
    .replace(/^[^\wก-๙]+/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
};

/**
 * Parses participant count from text with intelligent extraction
 */
export const parseParticipantCount = (text: string): number => {
  if (!text) return 0;
  // Match "X คน" or "รวม X คน"
  const peopleMatch = text.match(/(\d[\d,]*)\s*คน/);
  if (peopleMatch) {
    const n = parseInt(peopleMatch[1].replace(/,/g, ""), 10);
    if (!isNaN(n) && n > 0) return n;
  }
  // Match standalone number
  const numMatch = text.replace(/,/g, "").match(/\d+/);
  if (numMatch) {
    const n = parseInt(numMatch[0], 10);
    if (!isNaN(n) && n > 0 && n < 10000) return n;
  }
  return 0;
};

/**
 * Clean phone numbers and unwanted prefixes from reporter name
 */
export const cleanReporterName = (raw: string): string => {
  if (!raw) return "";
  return raw
    .replace(/0\d{1,2}[- ]?\d{3}[- ]?\d{4}/g, "") // remove phone numbers
    .replace(/โทร\.?|เบอร์โทร\.?|Tel:?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Main parseCSV function supporting dynamic ColumnMappingConfig and Google Form layout
 */
export const parseCSV = (text: string, customMapping?: ColumnMappingConfig): ActivityReport[] => {
  const resultRows = parseRawCSVRows(text);
  if (resultRows.length < 2) return [];

  const headers = resultRows[0];
  const isGoogleFormFormat = headers.some(
    (h) => h.includes("โรงเรียน") || h.includes("สังกัด") || h.includes("เป้าหมายหลัก") || h.includes("ประทับเวลา")
  );

  // Retrieve saved mapping if available
  let activeMapping: ColumnMappingConfig = customMapping || DEFAULT_COLUMN_MAPPING;
  if (!customMapping && typeof window !== "undefined" && window.localStorage) {
    try {
      const saved = localStorage.getItem("kopodot_column_mapping_schema");
      if (saved) {
        activeMapping = { ...DEFAULT_COLUMN_MAPPING, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
  }

  // Build header index map
  const headerIndexMap = new Map<string, number>();
  headers.forEach((h, idx) => {
    const trimmed = h.trim();
    headerIndexMap.set(trimmed, idx);
    headerIndexMap.set(cleanHeaderKey(trimmed), idx);
  });

  // Helper to find column index by config name, falling back to default or fuzzy match
  const findColIdx = (configName: string, fallbackIdx: number): number => {
    if (headerIndexMap.has(configName.trim())) {
      return headerIndexMap.get(configName.trim())!;
    }
    const cleanKey = cleanHeaderKey(configName);
    if (headerIndexMap.has(cleanKey)) {
      return headerIndexMap.get(cleanKey)!;
    }
    // Search among headers
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].includes(configName.trim()) || configName.trim().includes(headers[i].trim())) {
        return i;
      }
    }
    return fallbackIdx < headers.length ? fallbackIdx : -1;
  };

  // Resolve column indices
  const schoolIdx = findColIdx(activeMapping.schoolNameCol, 5);
  const activityIdx = findColIdx(activeMapping.activityNameCol, 9);
  const goalIdx = findColIdx(activeMapping.goalCol, 7);
  const dateStrIdx = findColIdx(activeMapping.dateStrCol, 2);
  const timestampIdx = findColIdx(activeMapping.timestampCol, 0);
  const affiliationIdx = findColIdx(activeMapping.affiliationCol, 4);
  const detailsIdx = findColIdx(activeMapping.detailsCol, 17);
  const participantsIdx = findColIdx(activeMapping.participantsCountCol, 18);
  const targetGroupIdx = findColIdx(activeMapping.targetGroupCol, 6);
  const imageIdx = findColIdx(activeMapping.imageUrlCol, 19);
  const videoIdx = findColIdx(activeMapping.videoUrlCol, 20);
  const problemsIdx = findColIdx(activeMapping.problemsCol, 21);
  const reportedByIdx = findColIdx(activeMapping.reportedByCol, 22);

  const parsedReports: ActivityReport[] = [];

  for (let i = 1; i < resultRows.length; i++) {
    const columns = resultRows[i];
    if (columns.length < 2 || (!columns[0] && !columns[schoolIdx] && !columns[detailsIdx])) continue;

    if (isGoogleFormFormat) {
      const timestamp = (timestampIdx >= 0 ? columns[timestampIdx] : columns[0]) || "";
      const dateStr = (dateStrIdx >= 0 ? columns[dateStrIdx] : columns[2]) || "";
      const affiliation = (affiliationIdx >= 0 ? columns[affiliationIdx] : columns[4]) || "";
      const rawSchoolName = (schoolIdx >= 0 ? columns[schoolIdx] : columns[5]) || "";
      const gradeLevel = (targetGroupIdx >= 0 ? columns[targetGroupIdx] : columns[6]) || "";
      const mainGoal = (goalIdx >= 0 ? columns[goalIdx] : columns[7]) || "";

      // 1. Goal ID Determination
      let goalId = 1;
      // Check activity columns 9-16 (Goal 1-8 activities)
      for (let g = 1; g <= 8; g++) {
        const colIdx = 8 + g;
        if (colIdx < columns.length && columns[colIdx] && columns[colIdx].trim() && columns[colIdx].trim() !== "-") {
          goalId = g;
          break;
        }
      }
      if (goalId === 1 && mainGoal) {
        const p = parseThaiNumber(mainGoal);
        if (p >= 1 && p <= 8) goalId = p;
      }
      if (goalId === 1) {
        // Check sub-goal columns 23-30
        for (let g = 1; g <= 8; g++) {
          const subColIdx = 22 + g;
          if (subColIdx < columns.length && columns[subColIdx] && columns[subColIdx].trim() && columns[subColIdx].trim() !== "-") {
            goalId = g;
            break;
          }
        }
      }

      // 2. Activity Name
      let activityName = "";
      const colIdxForGoal = 8 + goalId;
      if (colIdxForGoal < columns.length && columns[colIdxForGoal] && columns[colIdxForGoal].trim() && columns[colIdxForGoal].trim() !== "-") {
        activityName = columns[colIdxForGoal].trim();
      } else {
        for (let g = 9; g <= 16; g++) {
          if (g < columns.length && columns[g] && columns[g].trim() && columns[g].trim() !== "-") {
            activityName = columns[g].trim();
            break;
          }
        }
      }
      if (!activityName && activityIdx >= 0 && columns[activityIdx] && columns[activityIdx].trim()) {
        activityName = columns[activityIdx].trim();
      }
      if (!activityName) {
        const det = detailsIdx >= 0 ? columns[detailsIdx] : columns[17];
        activityName = det ? det.split("\n")[0].substring(0, 80).trim() : "กิจกรรมพัฒนาเด็กและเยาวชน (กพด.)";
      }

      const details = (detailsIdx >= 0 ? columns[detailsIdx] : columns[17]) || "";
      
      // 3. Participants Count
      let participantsCount = parseParticipantCount(participantsIdx >= 0 ? columns[participantsIdx] : columns[18]);
      if (participantsCount <= 0 && details) {
        participantsCount = parseParticipantCount(details);
      }
      if (participantsCount <= 0 && gradeLevel) {
        participantsCount = parseParticipantCount(gradeLevel);
      }
      if (participantsCount <= 0) {
        participantsCount = 50; // Standard default baseline
      }

      const imageUrl = (imageIdx >= 0 ? columns[imageIdx] : columns[19]) || "";
      const rawVideoUrl = (videoIdx >= 0 ? columns[videoIdx] : columns[20]) || "";
      const problems = (problemsIdx >= 0 ? columns[problemsIdx] : columns[21]) || "";
      const rawReportedBy = (reportedByIdx >= 0 ? columns[reportedByIdx] : columns[22]) || "";
      const reportedBy = cleanReporterName(rawReportedBy);

      // 4. Sub-goal & KPI Indicator lookup from columns 23-30 and 51-58
      const subGoalCol = 22 + goalId;
      const subGoalText = subGoalCol < columns.length ? columns[subGoalCol] || "" : "";
      const kpiIndicatorCol = 50 + goalId;
      const kpiIndicatorText = kpiIndicatorCol < columns.length ? columns[kpiIndicatorCol] || "" : "";

      // 5. School Name Normalization & 100% Matching
      let schoolName = rawSchoolName.trim();
      if (schoolName) {
        if (schoolName.includes("ซำปะโต") || schoolName.includes("ชำปะโต")) schoolName = "รร.ตชด.บ้านซำปะโต";
        else if (schoolName.includes("จินดาภา")) schoolName = "รร.ตชด.ศ.พญ.จินดาพาฯ";
        else if (schoolName.startsWith("รร.ตขด.")) schoolName = schoolName.replace("รร.ตขด.", "รร.ตชด.");
        else if (!schoolName.startsWith("รร.") && !schoolName.startsWith("ศกร.") && !schoolName.startsWith("โรงเรียน")) {
          schoolName = `รร.ตชด.${schoolName}`;
        }
      } else {
        schoolName = "รร.ตชด.บ้านโคกแสลง";
      }

      const matchedOfficial = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(schoolName, s.name));
      if (matchedOfficial) {
        schoolName = matchedOfficial.name;
      }

      // 6. Match Official KPI Indicator
      const tempReportInfo = {
        goalCode: `ด้านที่ ${goalId}`,
        kpiCode: kpiIndicatorText || "",
        activityName,
        details: `${details} ${subGoalText} ${kpiIndicatorText}`,
        objectives: `เพื่อดำเนินกิจกรรม${activityName} ตาม${mainGoal || "แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด.) ฉบับที่ 5"} ${subGoalText}`,
      };
      const autoMatchedKpi = findIndicatorForReport(tempReportInfo, goalId);

      let reportPosition = "ครูผู้รับผิดชอบ";
      if (reportedBy.includes("ครูใหญ่")) reportPosition = "ครูใหญ่";
      else if (reportedBy.includes("ผอ.")) reportPosition = "ผู้อำนวยการโรงเรียน";

      parsedReports.push({
        id: `REP-SHEET-${String(i).padStart(4, "0")}`,
        projectName: "",
        activityName: activityName,
        goalCode: `ด้านที่ ${goalId}`,
        kpiCode: autoMatchedKpi ? autoMatchedKpi.id : (kpiIndicatorText ? `KPI-${goalId}` : ""),
        schoolName: schoolName,
        reportingPeriod: "ปีการศึกษา 2569",
        dateString: dateStr || timestamp || "2569",
        location: affiliation ? `${affiliation} (${schoolName})` : "โรงเรียนตำรวจตระเวนชายแดน",
        targetGroup: gradeLevel ? `นักเรียนชั้น ${gradeLevel}` : "นักเรียนและชุมชน",
        participantsCount: participantsCount,
        objectives: `เพื่อดำเนินกิจกรรม${activityName} ตาม${mainGoal || "แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด.) ฉบับที่ 5"}`,
        details: (details && details.trim() !== "-" && details.trim() !== "") ? details.trim() : `การดำเนินกิจกรรม ${activityName} ในพื้นที่โรงเรียน เพื่อส่งเสริมพัฒนาการและการเรียนรู้ของนักเรียน`,
        quantitativeOutcome: `จัดกิจกรรมสำเร็จจำนวน 1 ครั้ง มีผู้เข้าร่วมงานรวม ${participantsCount} คน มีเอกสารสรุปผลประเมินครบถ้วน`,
        qualitativeOutcome: `นักเรียนและผู้เข้าร่วมกิจกรรมมีความรู้ ทักษะ และพัฒนาการตามเป้าหมายของโครงการ`,
        problems: problems || "ไม่มีปัญหาอุปสรรคสำคัญ",
        suggestions: "ควรสนับสนุนและต่อยอดกิจกรรมอย่างต่อเนื่อง",
        reportedBy: reportedBy || "ครูผู้รับผิดชอบโครงการ",
        reportPosition: reportPosition,
        approverName: "ผู้บังคับการตำรวจตระเวนชายแดน",
        approverPosition: "ผู้บังคับบัญชา",
        status: ReportStatus.COMPLETED,
        timestamp: timestamp || "",
        lastUpdated: timestamp || new Date().toISOString(),
        imageUrl: imageUrl,
        videoUrl: rawVideoUrl || (imageUrl.includes("youtube.com") || imageUrl.includes("youtu.be") || imageUrl.includes("vimeo.com") ? imageUrl : ""),
        subGoalText: subGoalText,
        kpiIndicatorText: kpiIndicatorText
      });
    } else {
      // Plain format or custom headers
      const rec: Record<string, string> = {};
      headers.forEach((header, idx) => {
        rec[header] = columns[idx] || "";
      });

      let csvSchool = (rec.schoolName || rec["ชื่อโรงเรียน"] || "").trim();
      if (csvSchool.includes("ซำปะโต") || csvSchool.includes("ชำปะโต")) csvSchool = "รร.ตชด.บ้านซำปะโต";
      else if (csvSchool.includes("จินดาภา")) csvSchool = "รร.ตชด.ศ.พญ.จินดาพาฯ";
      else if (csvSchool.startsWith("รร.ตขด.")) csvSchool = csvSchool.replace("รร.ตขด.", "รร.ตชด.");

      const matchedCsv = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(csvSchool, s.name));
      if (matchedCsv) {
        csvSchool = matchedCsv.name;
      } else if (!csvSchool) {
        csvSchool = OFFICIAL_TARGET_SCHOOLS[0].name;
      }

      parsedReports.push({
        id: rec.id || `REP-CSV-${String(i).padStart(3, "0")}`,
        projectName: rec.projectName || "",
        activityName: rec.activityName || rec["ชื่อกิจกรรม"] || "กิจกรรมรายงาน",
        goalCode: rec.goalCode || rec["เป้าหมายหลัก"] || "ด้านที่ 1",
        schoolName: csvSchool,
        reportingPeriod: rec.reportingPeriod || "ปีการศึกษา 2569",
        dateString: rec.dateString || rec["วันที่"] || "2569",
        location: rec.location || rec["สังกัด"] || "สถานศึกษา",
        targetGroup: rec.targetGroup || rec["กลุ่มเป้าหมาย"] || "นักเรียนและชุมชน",
        participantsCount: parseParticipantCount(rec.participantsCount || rec["จำนวนผู้เข้าร่วม"] || rec.details) || 50,
        objectives: rec.objectives || "วัตถุประสงค์โครงการ...",
        details: rec.details || `การดำเนินกิจกรรม ${rec.activityName || "พัฒนาเด็กและเยาวชน"} ในพื้นที่โรงเรียน`,
        quantitativeOutcome: rec.quantitativeOutcome || "จัดกิจกรรมสำเร็จตามเป้าหมาย",
        qualitativeOutcome: rec.qualitativeOutcome || "ผู้เรียนพัฒนาทักษะเชิงบวก",
        problems: rec.problems || "-",
        suggestions: rec.suggestions || "-",
        reportedBy: cleanReporterName(rec.reportedBy || rec["ผู้รายงาน"] || "ครูผู้รายงาน"),
        reportPosition: rec.reportPosition || "ครูผู้รับผิดชอบ",
        approverName: rec.approverName || "ผู้อำนวยการ",
        approverPosition: rec.approverPosition || "ผู้อำนวยการโรงเรียน",
        status: (rec.status as ReportStatus) || ReportStatus.COMPLETED,
        timestamp: rec.timestamp || rec["ประทับเวลา"] || rec["Timestamp"] || rec.lastUpdated || "",
        lastUpdated: rec.lastUpdated || new Date().toISOString(),
        imageUrl: rec.imageUrl && !rec.imageUrl.includes("unsplash.com") ? rec.imageUrl : "",
        videoUrl: rec.videoUrl || rec.video || ""
      });
    }
  }

  return parsedReports;
};
