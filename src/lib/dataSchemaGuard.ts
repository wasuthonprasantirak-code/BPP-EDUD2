/**
 * Data Schema Guard & Validation Engine for Google Sheets & SAR Imports
 * Guards against sheet column header renaming, invalid row types, and SAR import anomalies.
 */

import { ActivityReport } from "../types";
import { OFFICIAL_TARGET_SCHOOLS, isSchoolMatch } from "../data/schoolsData";
import { ColumnMappingConfig, DEFAULT_COLUMN_MAPPING } from "../components/ColumnMapperModal";

export interface ColumnValidationResult {
  isValid: boolean;
  confidenceScore: number; // 0 - 100%
  headerCount: number;
  missingRequiredColumns: string[];
  matchedColumnsCount: number;
  warnings: string[];
  suggestedMapping: ColumnMappingConfig;
}

export interface RowValidationResult {
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  warnings: string[];
  anomalies: { rowIndex: number; issue: string; schoolName?: string }[];
}

export interface FullSchemaGuardReport {
  timestamp: string;
  sourceType: "Google Sheets Live" | "CSV File Upload" | "SAR Document Import";
  columnValidation: ColumnValidationResult;
  rowValidation: RowValidationResult;
}

// Common aliases for headers in case users or Google Forms rename them in Google Sheets
const COLUMN_ALIASES: Record<keyof ColumnMappingConfig, string[]> = {
  timestampCol: ["ประทับเวลา", "Timestamp", "เวลาลงทะเบียน", "วันเวลาที่กรอก"],
  dateStrCol: ["วันที่จัดกิจกรรม", "วันที่ดำเนินงาน", "วันที่จัด", "วัน/เดือน/ปี", "Date"],
  schoolNameCol: ["ชื่อโรงเรียน", "โรงเรียน", "สถานศึกษา", "ชื่อ รร.ตชด.", "ชื่อสถานศึกษา", "School"],
  affiliationCol: ["สังกัด กก.ตชด.", "สังกัด", "กก.ตชด.", "สังกัด กองกำกับการ", "Affiliation"],
  goalCol: ["เป้าหมายหลักตามแผน กพด.ฉบับที่ 5", "เป้าหมายหลัก", "ด้านที่", "เป้าหมาย กพด.", "แผนพัฒนาเด็กและเยาวชน", "Goal"],
  activityNameCol: ["ชื่อกิจกรรมที่จัด", "ชื่อกิจกรรม", "ชื่อโครงการ/กิจกรรม", "กิจกรรม", "Project/Activity"],
  detailsCol: ["สรุปรายละเอียดการจัดกิจกรรม", "รายละเอียดกิจกรรม", "สรุปรายละเอียด", "การดำเนินงาน", "Details"],
  participantsCountCol: ["จำนวนผู้เข้าร่วมกิจกรรม (คน)", "จำนวนผู้เข้าร่วม", "จำนวนคน", "ผู้เข้าร่วม (คน)", "Participants"],
  targetGroupCol: ["ระดับชั้น/กลุ่มเป้าหมาย", "กลุ่มเป้าหมาย", "ระดับชั้น", "ผู้เข้าร่วม"],
  imageUrlCol: ["ลิงก์รูปภาพประกอบกิจกรรม (Google Drive)", "ลิงก์รูปภาพ", "รูปภาพ", "ภาพประกอบ", "Image Link"],
  videoUrlCol: ["ลิงก์วิดีโอประกอบกิจกรรม (YouTube/Drive)", "ลิงก์วิดีโอ", "คลิปวิดีโอ", "Video Link"],
  problemsCol: ["ปัญหา อุปสรรค และข้อเสนอแนะ", "ปัญหาอุปสรรค", "ปัญหา/อุปสรรค", "ข้อเสนอแนะ", "Problems"],
  reportedByCol: ["ชื่อ-สกุล ผู้รายงาน", "ผู้รายงาน", "ชื่อผู้รายงาน", "ครูผู้รับผิดชอบ", "Reported By"],
  quantitativeOutcomeCol: ["ผลสัมฤทธิ์เชิงปริมาณ", "ผลเชิงปริมาณ", "เชิงปริมาณ", "Quantitative Outcome"],
  qualitativeOutcomeCol: ["ผลสัมฤทธิ์เชิงคุณภาพ", "ผลเชิงคุณภาพ", "เชิงคุณภาพ", "Qualitative Outcome"]
};

export class DataSchemaGuard {

  /**
   * Validates Column Headers from CSV / Google Sheet against standard schema
   */
  static validateHeaders(headers: string[]): ColumnValidationResult {
    const cleanHeaders = headers.map(h => h.trim().replace(/^"/, "").replace(/"$/, ""));
    const warnings: string[] = [];
    const missingRequiredColumns: string[] = [];
    let matchedCount = 0;

    const suggestedMapping: ColumnMappingConfig = { ...DEFAULT_COLUMN_MAPPING };

    // Required key fields
    const requiredKeys: (keyof ColumnMappingConfig)[] = ["schoolNameCol", "activityNameCol", "goalCol"];

    (Object.keys(DEFAULT_COLUMN_MAPPING) as (keyof ColumnMappingConfig)[]).forEach((key) => {
      const defaultName = DEFAULT_COLUMN_MAPPING[key];
      const aliases = COLUMN_ALIASES[key] || [defaultName];

      // Direct match
      let exactMatch = cleanHeaders.find(h => h === defaultName);

      if (!exactMatch) {
        // Alias match
        exactMatch = cleanHeaders.find(h => aliases.some(alias => h.toLowerCase().includes(alias.toLowerCase())));
      }

      if (exactMatch) {
        suggestedMapping[key] = exactMatch;
        matchedCount++;
        if (exactMatch !== defaultName) {
          warnings.push(`คอลัมน์ '${exactMatch}' ถูกจับคู่อัตโนมัติเป็นฟิลด์มาตรฐาน '${key}' (${defaultName})`);
        }
      } else {
        if (requiredKeys.includes(key)) {
          missingRequiredColumns.push(defaultName);
          warnings.push(`⚠️ ไม่เทียบคอลัมน์บังคับ: ไม่พบ '${defaultName}' ในสเปรดชีตที่นำเข้า`);
        }
      }
    });

    const isRequiredValid = missingRequiredColumns.length === 0;
    const totalKeys = Object.keys(DEFAULT_COLUMN_MAPPING).length;
    const confidenceScore = Math.min(100, Math.round((matchedCount / totalKeys) * 100));

    return {
      isValid: isRequiredValid,
      confidenceScore,
      headerCount: cleanHeaders.length,
      missingRequiredColumns,
      matchedColumnsCount: matchedCount,
      warnings,
      suggestedMapping
    };
  }

  /**
   * Validates parsed data rows for anomalies (missing critical fields, unknown schools, invalid goals)
   */
  static validateRows(reports: ActivityReport[]): RowValidationResult {
    const totalRows = reports.length;
    let validCount = 0;
    const warnings: string[] = [];
    const anomalies: { rowIndex: number; issue: string; schoolName?: string }[] = [];

    reports.forEach((report, index) => {
      let isRowValid = true;
      const rowNum = index + 1;

      // 1. Check School Name
      if (!report.schoolName || report.schoolName.trim().length === 0) {
        anomalies.push({ rowIndex: rowNum, issue: "ไม่ระบุชื่อโรงเรียนเป้าหมาย" });
        isRowValid = false;
      } else {
        const match = OFFICIAL_TARGET_SCHOOLS.find(s => isSchoolMatch(report.schoolName, s.name));
        if (!match) {
          anomalies.push({ rowIndex: rowNum, issue: `ชื่อโรงเรียน '${report.schoolName}' ไม่ตรงกับรายชื่อ รร.ตชด. 53 แห่ง`, schoolName: report.schoolName });
        }
      }

      // 2. Check Goal Code
      if (!report.goalCode) {
        anomalies.push({ rowIndex: rowNum, issue: "ไม่ระบุเป้าหมายหลัก กพด.5 (ด้านที่ 1-8)" });
        isRowValid = false;
      } else if (!report.goalCode.includes("ด้านที่")) {
        anomalies.push({ rowIndex: rowNum, issue: `รูปแบบเป้าหมาย '${report.goalCode}' ไม่ตรงกับรูปแบบ 'ด้านที่ X'` });
      }

      // 3. Check Activity Name
      if (!report.activityName || report.activityName.trim().length === 0) {
        anomalies.push({ rowIndex: rowNum, issue: "ไม่ระบุชื่อกิจกรรมพัฒนา" });
        isRowValid = false;
      }

      // 4. Check Participants Count numeric check
      if (typeof report.participantsCount !== "number" || isNaN(report.participantsCount)) {
        anomalies.push({ rowIndex: rowNum, issue: "จำนวนผู้เข้าร่วมไม่ใช่ตัวเลขมาตรฐาน" });
      }

      if (isRowValid) {
        validCount++;
      }
    });

    if (anomalies.length > 0) {
      warnings.push(`พบจุดที่ต้องตรวจสอบในข้อมูลจำนวน ${anomalies.length} รายการ (จากทั้งหมด ${totalRows} แถว)`);
    }

    return {
      totalRows,
      validRowsCount: validCount,
      invalidRowsCount: totalRows - validCount,
      warnings,
      anomalies
    };
  }

  /**
   * Run full schema and data guard validation
   */
  static runFullGuard(
    csvText: string,
    reports: ActivityReport[],
    sourceType: "Google Sheets Live" | "CSV File Upload" | "SAR Document Import" = "Google Sheets Live"
  ): FullSchemaGuardReport {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    const headers = lines.length > 0 ? lines[0].split(",") : [];

    const columnValidation = this.validateHeaders(headers);
    const rowValidation = this.validateRows(reports);

    return {
      timestamp: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " น.",
      sourceType,
      columnValidation,
      rowValidation
    };
  }
}
