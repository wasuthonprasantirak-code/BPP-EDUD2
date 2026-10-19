import { ActivityReport, ReportStatus } from "../types";
import { OFFICIAL_TARGET_SCHOOLS, isSchoolMatch } from "../data/schoolsData";
import { db, isFirebaseEnabled, isFirestoreQuotaExceeded, handleFirestoreError, OperationType } from "./firebase";
import { doc, writeBatch } from "firebase/firestore";
import { SystemAggregates, calculateSystemAggregates } from "./aggregatesEngine";

export interface PeriodSummary {
  periodKey: string;
  periodType: "week" | "month" | "quarter" | "year";
  periodName: string;
  totalReports: number;
  completedReports: number;
  schoolsSubmittedCount: number;
  divisionCounts: Record<string, number>;
  goalCounts: Record<number, number>;
  updatedAt: string;
}

const SYSTEM_AGGREGATES_COLLECTION = "system_aggregates";

function getDivisionCode(groupName?: string): string {
  if (!groupName) return "กก.ตชด.22";
  if (groupName.includes("21")) return "กก.ตชด.21";
  if (groupName.includes("22")) return "กก.ตชด.22";
  if (groupName.includes("23")) return "กก.ตชด.23";
  if (groupName.includes("24")) return "กก.ตชด.24";
  return "กก.ตชด.22";
}

/**
 * Helper to compute periodic summaries (Weekly, Monthly, Yearly)
 */
export function computePeriodicSummaries(reports: ActivityReport[]): {
  weekly: Record<string, PeriodSummary>;
  monthly: Record<string, PeriodSummary>;
  yearly: Record<string, PeriodSummary>;
} {
  const weekly: Record<string, PeriodSummary> = {};
  const monthly: Record<string, PeriodSummary> = {};
  const yearly: Record<string, PeriodSummary> = {};

  reports.forEach((r) => {
    const rawDate = r.dateString || r.lastUpdated || r.timestamp;
    if (!rawDate) return;

    const dateObj = new Date(rawDate);
    const isValidDate = !isNaN(dateObj.getTime());
    const year = isValidDate ? dateObj.getFullYear() : 2026;
    const month = isValidDate ? dateObj.getMonth() + 1 : 9;
    
    // Month Key: e.g., "month_2026_09"
    const monthKey = `month_${year}_${month.toString().padStart(2, "0")}`;
    const yearKey = `year_${year}`;

    // Compute Division
    const rawSchool = (r.schoolName || "").trim();
    const matched = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(rawSchool, s.name));
    const division = getDivisionCode(matched?.groupName);

    // Compute Goal
    let gNum = 1;
    if (r.goalCode) {
      const match = r.goalCode.match(/\d+/);
      if (match) gNum = parseInt(match[0], 10);
    }

    const isDone = !r.status || r.status === ReportStatus.COMPLETED;

    // 1. Monthly Summary Accumulator
    if (!monthly[monthKey]) {
      monthly[monthKey] = {
        periodKey: monthKey,
        periodType: "month",
        periodName: `ประจำเดือน ${month}/${year + 543}`,
        totalReports: 0,
        completedReports: 0,
        schoolsSubmittedCount: 0,
        divisionCounts: { "กก.ตชด.21": 0, "กก.ตชด.22": 0, "กก.ตชด.23": 0, "กก.ตชด.24": 0 },
        goalCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
        updatedAt: new Date().toISOString(),
      };
    }
    monthly[monthKey].totalReports++;
    if (isDone) monthly[monthKey].completedReports++;
    monthly[monthKey].divisionCounts[division] = (monthly[monthKey].divisionCounts[division] || 0) + 1;
    if (gNum >= 1 && gNum <= 8) {
      monthly[monthKey].goalCounts[gNum] = (monthly[monthKey].goalCounts[gNum] || 0) + 1;
    }

    // 2. Yearly Summary Accumulator
    if (!yearly[yearKey]) {
      yearly[yearKey] = {
        periodKey: yearKey,
        periodType: "year",
        periodName: `ประจำปี พ.ศ. ${year + 543}`,
        totalReports: 0,
        completedReports: 0,
        schoolsSubmittedCount: 0,
        divisionCounts: { "กก.ตชด.21": 0, "กก.ตชด.22": 0, "กก.ตชด.23": 0, "กก.ตชด.24": 0 },
        goalCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
        updatedAt: new Date().toISOString(),
      };
    }
    yearly[yearKey].totalReports++;
    if (isDone) yearly[yearKey].completedReports++;
    yearly[yearKey].divisionCounts[division] = (yearly[yearKey].divisionCounts[division] || 0) + 1;
    if (gNum >= 1 && gNum <= 8) {
      yearly[yearKey].goalCounts[gNum] = (yearly[yearKey].goalCounts[gNum] || 0) + 1;
    }
  });

  return { weekly, monthly, yearly };
}

/**
 * Real-time Batch Writer for Periodic Aggregates
 * Writes KPI summary documents in atomic batches to Firestore collection /system_aggregates/
 */
export async function executeBatchAggregateSync(reports: ActivityReport[]): Promise<{
  success: boolean;
  documentsUpdated: number;
}> {
  if (!isFirebaseEnabled || !db || isFirestoreQuotaExceeded || reports.length === 0) {
    return { success: false, documentsUpdated: 0 };
  }

  try {
    const batch = writeBatch(db);
    let updateCount = 0;

    // 1. Root KPI Summary Document
    const rootKPI: SystemAggregates = calculateSystemAggregates(reports);
    const rootDocRef = doc(db, SYSTEM_AGGREGATES_COLLECTION, "dashboard_summary_kpi");
    batch.set(rootDocRef, {
      ...rootKPI,
      syncedAt: new Date().toISOString(),
    }, { merge: true });
    updateCount++;

    // 2. Periodic Breakdowns (Monthly & Yearly)
    const { monthly, yearly } = computePeriodicSummaries(reports);

    // Batch write latest monthly documents (limit to recent months to prevent write spikes)
    Object.values(monthly).slice(-6).forEach((mSummary) => {
      const mDocRef = doc(db, SYSTEM_AGGREGATES_COLLECTION, mSummary.periodKey);
      batch.set(mDocRef, mSummary, { merge: true });
      updateCount++;
    });

    // Batch write yearly documents
    Object.values(yearly).forEach((ySummary) => {
      const yDocRef = doc(db, SYSTEM_AGGREGATES_COLLECTION, ySummary.periodKey);
      batch.set(yDocRef, ySummary, { merge: true });
      updateCount++;
    });

    // Atomic commit
    await batch.commit();
    console.log(`[BatchWriter] Successfully synchronized ${updateCount} aggregate docs to Firestore in a single atomic batch.`);
    return { success: true, documentsUpdated: updateCount };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, SYSTEM_AGGREGATES_COLLECTION);
    return { success: false, documentsUpdated: 0 };
  }
}
