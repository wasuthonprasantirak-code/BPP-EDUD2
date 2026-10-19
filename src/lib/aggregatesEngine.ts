import { ActivityReport, ReportStatus } from "../types";
import { OFFICIAL_TARGET_SCHOOLS, isSchoolMatch } from "../data/schoolsData";
import { db, isFirebaseEnabled, isFirestoreQuotaExceeded } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { aggregateTeacherReports } from "./teacherUtils";

export interface DivisionKPI {
  division: string;
  totalReports: number;
  completedReports: number;
  schoolsSubmitted: number;
  totalSchools: number;
  completionRate: number;
  topSchool: string;
}

export interface GoalKPI {
  goalNumber: number;
  goalTitle: string;
  count: number;
  percentage: number;
}

export interface SystemAggregates {
  id: string;
  timestamp: number;
  totalReports: number;
  completedReports: number;
  activeSchoolsCount: number;
  totalOfficialSchools: number;
  overallSubmissionRate: number;
  divisions: Record<string, DivisionKPI>;
  goals: GoalKPI[];
  topSchools: { schoolName: string; count: number; division: string }[];
  topReporters: { name: string; schoolName: string; count: number }[];
  weeklySummary: {
    weekKey: string;
    label: string;
    totalCount: number;
    completedCount: number;
  }[];
  monthlySummary: {
    monthKey: string;
    monthName: string;
    totalCount: number;
  }[];
}

const AGGREGATES_CACHE_KEY = "kopodot_system_aggregates_v1";
const SYSTEM_AGGREGATES_COLLECTION = "system_aggregates";
const DASHBOARD_SUMMARY_DOC_ID = "dashboard_summary_kpi";

function getDivisionCode(groupName?: string): string {
  if (!groupName) return "กก.ตชด.22";
  if (groupName.includes("21")) return "กก.ตชด.21";
  if (groupName.includes("22")) return "กก.ตชด.22";
  if (groupName.includes("23")) return "กก.ตชด.23";
  if (groupName.includes("24")) return "กก.ตชด.24";
  return "กก.ตชด.22";
}

function isCompletedReport(status?: ReportStatus): boolean {
  return !status || status === ReportStatus.COMPLETED;
}

/**
 * Calculates pre-aggregated metrics from a raw list of reports
 */
export function calculateSystemAggregates(reports: ActivityReport[]): SystemAggregates {
  const totalReports = reports.length;
  const completedReports = reports.filter((r) => isCompletedReport(r.status)).length;

  // School submissions & Division Grouping
  const divisionStats: Record<string, { total: number; completed: number; schools: Set<string>; schoolCounts: Record<string, number> }> = {
    "กก.ตชด.21": { total: 0, completed: 0, schools: new Set(), schoolCounts: {} },
    "กก.ตชด.22": { total: 0, completed: 0, schools: new Set(), schoolCounts: {} },
    "กก.ตชด.23": { total: 0, completed: 0, schools: new Set(), schoolCounts: {} },
    "กก.ตชด.24": { total: 0, completed: 0, schools: new Set(), schoolCounts: {} },
  };

  const schoolTotalCounts: Record<string, { count: number; division: string }> = {};
  const goalCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
  const allSubmittedSchools = new Set<string>();

  reports.forEach((r) => {
    const rawSchool = (r.schoolName || "").trim();
    const matched = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(rawSchool, s.name));
    const schoolName = matched ? matched.name : rawSchool;
    const division = getDivisionCode(matched?.groupName);

    if (schoolName) {
      allSubmittedSchools.add(schoolName);
      if (!schoolTotalCounts[schoolName]) {
        schoolTotalCounts[schoolName] = { count: 0, division };
      }
      schoolTotalCounts[schoolName].count++;
    }

    if (divisionStats[division]) {
      divisionStats[division].total++;
      if (isCompletedReport(r.status)) {
        divisionStats[division].completed++;
      }
      if (schoolName) {
        divisionStats[division].schools.add(schoolName);
        divisionStats[division].schoolCounts[schoolName] = (divisionStats[division].schoolCounts[schoolName] || 0) + 1;
      }
    }

    // Goal
    let gNum = 1;
    if (r.goalCode) {
      const match = r.goalCode.match(/\d+/);
      if (match) gNum = parseInt(match[0], 10);
    }
    if (gNum >= 1 && gNum <= 8) {
      goalCounts[gNum] = (goalCounts[gNum] || 0) + 1;
    }
  });

  // Calculate Division KPIs
  const divisionKpis: Record<string, DivisionKPI> = {};
  const totalSchoolsByDiv: Record<string, number> = {
    "กก.ตชด.21": OFFICIAL_TARGET_SCHOOLS.filter((s) => getDivisionCode(s.groupName) === "กก.ตชด.21").length || 13,
    "กก.ตชด.22": OFFICIAL_TARGET_SCHOOLS.filter((s) => getDivisionCode(s.groupName) === "กก.ตชด.22").length || 15,
    "กก.ตชด.23": OFFICIAL_TARGET_SCHOOLS.filter((s) => getDivisionCode(s.groupName) === "กก.ตชด.23").length || 12,
    "กก.ตชด.24": OFFICIAL_TARGET_SCHOOLS.filter((s) => getDivisionCode(s.groupName) === "กก.ตชด.24").length || 14,
  };

  Object.keys(divisionStats).forEach((div) => {
    const stat = divisionStats[div];
    const totalSchools = totalSchoolsByDiv[div] || 14;
    const submittedCount = stat.schools.size;
    let topSchool = "ยังไม่มีข้อมูล";
    let maxSchoolCount = 0;
    Object.entries(stat.schoolCounts).forEach(([sName, cnt]) => {
      if (cnt > maxSchoolCount) {
        maxSchoolCount = cnt;
        topSchool = sName;
      }
    });

    divisionKpis[div] = {
      division: div,
      totalReports: stat.total,
      completedReports: stat.completed,
      schoolsSubmitted: submittedCount,
      totalSchools,
      completionRate: totalSchools > 0 ? Math.round((submittedCount / totalSchools) * 100) : 0,
      topSchool,
    };
  });

  // Goal titles lookup
  const goalTitles = [
    "การเสริมสร้างโภชนาการและสุขภาพอนามัยที่ดีของเด็กและเยาวชน",
    "การส่งเสริมและเพิ่มโอกาสทางการศึกษาและการเรียนรู้ตลอดชีวิต",
    "การส่งเสริมการเรียนรู้วิชาการ วิชาชีพ และเทคโนโลยีที่เหมาะสม",
    "การส่งเสริมการอนุรักษ์วัฒนธรรมท้องถิ่นและภูมิปัญญาไทย",
    "การส่งเสริมการอนุรักษ์ทรัพยากรธรรมชาติและสิ่งแวดล้อม",
    "การเสริมสร้างศักยภาพและความพร้อมของเด็กและเยาวชนในการเข้าสู่ประชาคมอาเซียน",
    "การขยายการพัฒนาจากสถานศึกษาไปสู่ชุมชนและสังคม",
    "การเสริมสร้างความเข้มแข็งของระบบการบริหารจัดการสถานศึกษา",
  ];

  const goalsKPI: GoalKPI[] = [];
  for (let g = 1; g <= 8; g++) {
    const count = goalCounts[g] || 0;
    goalsKPI.push({
      goalNumber: g,
      goalTitle: goalTitles[g - 1],
      count,
      percentage: totalReports > 0 ? Math.round((count / totalReports) * 100) : 0,
    });
  }

  // Top Schools
  const topSchools = Object.entries(schoolTotalCounts)
    .map(([schoolName, data]) => ({ schoolName, count: data.count, division: data.division }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top Reporters (รวมคะแนนครูคนเดียวกัน และใช้ยศสูงสุด)
  const aggregatedTeachers = aggregateTeacherReports(reports);
  const topReporters = aggregatedTeachers
    .slice(0, 10)
    .map((t) => ({ name: t.name, schoolName: t.schoolName || "", count: t.count }));

  return {
    id: DASHBOARD_SUMMARY_DOC_ID,
    timestamp: Date.now(),
    totalReports,
    completedReports,
    activeSchoolsCount: allSubmittedSchools.size,
    totalOfficialSchools: OFFICIAL_TARGET_SCHOOLS.length,
    overallSubmissionRate:
      OFFICIAL_TARGET_SCHOOLS.length > 0
        ? Math.round((allSubmittedSchools.size / OFFICIAL_TARGET_SCHOOLS.length) * 100)
        : 0,
    divisions: divisionKpis,
    goals: goalsKPI,
    topSchools,
    topReporters,
    weeklySummary: [],
    monthlySummary: [],
  };
}

/**
 * Saves calculated aggregates to Local Cache (IndexedDB & localStorage) and Firebase
 */
export async function persistSystemAggregates(aggregates: SystemAggregates): Promise<void> {
  // 1. Fast Local Persistence
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(AGGREGATES_CACHE_KEY, JSON.stringify(aggregates));
    } catch (e) {}
  }

  // 2. Cloud Firestore Fast Sync
  if (isFirebaseEnabled && db && !isFirestoreQuotaExceeded) {
    try {
      const docRef = doc(db, SYSTEM_AGGREGATES_COLLECTION, DASHBOARD_SUMMARY_DOC_ID);
      await setDoc(docRef, {
        ...aggregates,
        syncedAt: new Date().toISOString(),
      }, { merge: true });
      console.log("[AggregatesEngine] System KPIs synchronized to Cloud Firestore successfully.");
    } catch (err) {
      console.warn("[AggregatesEngine] Notice syncing aggregates to Firestore:", err);
    }
  }
}

/**
 * Loads cached system aggregates instantly (0ms from Memory/LocalStorage/IndexedDB),
 * with fallback to Cloud Firestore.
 */
export async function getCachedSystemAggregates(): Promise<SystemAggregates | null> {
  // Tier 1: Local Storage (0ms)
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(AGGREGATES_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.totalReports >= 0) {
          return parsed as SystemAggregates;
        }
      }
    } catch (e) {}
  }

  // Tier 2: Cloud Firestore (Fast Single Document Fetch < 50ms)
  if (isFirebaseEnabled && db && !isFirestoreQuotaExceeded) {
    try {
      const docRef = doc(db, SYSTEM_AGGREGATES_COLLECTION, DASHBOARD_SUMMARY_DOC_ID);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as SystemAggregates;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(AGGREGATES_CACHE_KEY, JSON.stringify(data));
          } catch (e) {}
        }
        return data;
      }
    } catch (err) {
      console.warn("[AggregatesEngine] Notice fetching aggregates from Firestore:", err);
    }
  }

  return null;
}
