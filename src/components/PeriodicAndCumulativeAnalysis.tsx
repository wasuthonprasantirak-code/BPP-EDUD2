import React, { useState, useMemo, useEffect } from "react";
import { ActivityReport, KOPODOT_GOALS } from "../types";
import { OFFICIAL_TARGET_SCHOOLS, isSchoolMatch } from "../data/schoolsData";
import {
  Calendar,
  CalendarDays,
  TrendingUp,
  BarChart3,
  Layers,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Users,
  Award,
  FileSpreadsheet,
  Building2,
  ChevronRight,
  Sparkles,
  Info,
  Copy,
  Check,
  FileText,
  Lightbulb,
  Compass,
  ShieldCheck
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { createWindowsSafeCsvBlob, triggerWindowsFileDownload, sanitizeWindowsFilename } from "../lib/windowsUtils";
import {
  parseSafeDate,
  safeParseNumber,
  formatNumberWithComma,
  formatThaiNumberWithComma,
  toThaiNumerals,
  normalizeThaiDigits,
  THAI_MONTH_FULL,
  THAI_MONTH_SHORT,
} from "../lib/safeDateUtils";

interface PeriodicAndCumulativeAnalysisProps {
  reports: ActivityReport[];
  selectedDivision: string;
  onSelectDivision: (div: string) => void;
  useArabicNumerals: boolean;
}

const THAI_MONTH_NAMES = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

// Helper to parse date from report
export function parseReportDate(report: ActivityReport): Date | null {
  const candidates = [report.dateString, report.timestamp, report.lastUpdated, (report as any).createdAt];
  for (const raw of candidates) {
    if (raw) {
      const d = parseSafeDate(raw);
      if (d) return d;
    }
  }
  return null;
}

// Division matching helper
function isDivisionMatch(groupName: string, divisionTarget: string): boolean {
  if (!groupName || !divisionTarget) return false;
  if (divisionTarget === "ALL") return true;
  const toArabic = (str: string) =>
    str.replace(/1/g, "1").replace(/2/g, "2").replace(/3/g, "3").replace(/4/g, "4").replace(/5/g, "5");
  const a = toArabic(groupName);
  const b = toArabic(divisionTarget);
  const numA = a.match(/2[1-4]/)?.[0];
  const numB = b.match(/2[1-4]/)?.[0];
  if (numA && numB) return numA === numB;
  return a.includes(b) || b.includes(a);
}

export const PeriodicAndCumulativeAnalysis: React.FC<PeriodicAndCumulativeAnalysisProps> = ({
  reports,
  selectedDivision: propSelectedDivision,
  onSelectDivision,
  useArabicNumerals: propUseArabicNumerals
}) => {
  const [subTab, setSubTab] = useState<"weekly" | "monthly" | "cumulative">("monthly");
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGoalFilter, setSelectedGoalFilter] = useState<string>("ALL");
  const [localDivision, setLocalDivision] = useState<string>(propSelectedDivision || "ALL");
  const [localArabic, setLocalArabic] = useState<boolean>(propUseArabicNumerals ?? true);

  useEffect(() => {
    if (propUseArabicNumerals !== undefined) {
      setLocalArabic(propUseArabicNumerals);
    }
  }, [propUseArabicNumerals]);

  const selectedDivision = propSelectedDivision !== undefined ? propSelectedDivision : localDivision;
  const useArabicNumerals = localArabic;

  const handleDivisionChange = (div: string) => {
    setLocalDivision(div);
    if (onSelectDivision) onSelectDivision(div);
  };

  // Format numbers to Thai digits or Arabic digits based on user preference
  const toTh = (num: number | string | undefined | null): string => {
    if (num === null || num === undefined) return "";
    let strVal: string;
    if (typeof num === "number") {
      strVal = useArabicNumerals ? num.toLocaleString("en-US") : num.toLocaleString("th-TH");
    } else {
      const trimmed = String(num).trim();
      const parsed = Number(trimmed.replace(/,/g, ""));
      if (!isNaN(parsed) && trimmed !== "" && !trimmed.startsWith("25") && !trimmed.startsWith("20") && !trimmed.includes("/") && !trimmed.includes("-") && !trimmed.includes(":")) {
        strVal = useArabicNumerals ? parsed.toLocaleString("en-US") : parsed.toLocaleString("th-TH");
      } else {
        strVal = String(num);
      }
    }
    if (useArabicNumerals) {
      const thToArabicMap: Record<string, string> = {
        '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
        '5': '5', '6': '6', '7': '7', '8': '8', '9': '9'
      };
      return strVal.replace(/[๐-๙]/g, (d) => thToArabicMap[d] || d);
    }
    const map: Record<string, string> = {
      "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
      "5": "5", "6": "6", "7": "7", "8": "8", "9": "9"
    };
    return strVal.replace(/[0-9]/g, (d) => map[d] || d);
  };

  const formatThNum = (num: number): string => {
    if (useArabicNumerals) {
      return new Intl.NumberFormat("en-US").format(num);
    }
    return new Intl.NumberFormat("th-TH").format(num);
  };

  // Filter reports by division
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (selectedDivision === "ALL") return true;
      const targetSchool = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(r.schoolName, s.name));
      if (targetSchool) {
        return isDivisionMatch(targetSchool.groupName, selectedDivision);
      }
      return isDivisionMatch(r.schoolName || "", selectedDivision);
    });
  }, [reports, selectedDivision]);

  // Target schools in selected scope
  const targetSchoolsInScope = useMemo(() => {
    if (selectedDivision === "ALL") return OFFICIAL_TARGET_SCHOOLS;
    return OFFICIAL_TARGET_SCHOOLS.filter((s) => isDivisionMatch(s.groupName, selectedDivision));
  }, [selectedDivision]);

  // Overall KPI metrics
  const totalReportsCount = filteredReports.length;
  const totalParticipantsCount = filteredReports.reduce((sum, r) => sum + (r.participantsCount || 0), 0);
  const activeSchoolsCount = targetSchoolsInScope.filter((s) =>
    filteredReports.some((r) => isSchoolMatch(r.schoolName, s.name))
  ).length;
  const coverageRate = targetSchoolsInScope.length > 0
    ? Math.min(Math.round((activeSchoolsCount / targetSchoolsInScope.length) * 100), 100)
    : 0;

  // =========================================================================
  // 1. WEEKLY DATA AGGREGATION
  // =========================================================================
  const weeklyData = useMemo(() => {
    // 1. Map all filtered reports with their parsed dates
    const parsedEntries = filteredReports.map((r) => {
      const d = parseReportDate(r) || new Date(2026, 4, 27); // Default to 27 May 2026
      return { report: r, date: d };
    });

    if (parsedEntries.length === 0) {
      // Provide default empty 4-week structure for clean UI
      const defaultWeeks = [1, 2, 3, 4].map((idx) => ({
        weekIndex: idx,
        weekLabel: `สัปดาห์ที่ ${toTh(idx)}`,
        shortLabel: `สัปดาห์ ${toTh(idx)}`,
        dateRangeText: "-",
        startDate: new Date(2026, 4, 1 + (idx - 1) * 7),
        endDate: new Date(2026, 4, 7 + (idx - 1) * 7),
        reportsCount: 0,
        participantsCount: 0,
        schools: new Set<string>(),
        avgParticipants: 0,
        reports: []
      }));

      return {
        weeks: defaultWeeks,
        chartSeries: defaultWeeks.map((w) => ({
          weekIndex: w.weekIndex,
          name: w.shortLabel,
          fullLabel: w.weekLabel,
          dateRange: w.dateRangeText,
          reports: 0,
          participants: 0,
          activeSchools: 0,
          avgParticipants: 0
        })),
        activeWeek: defaultWeeks[0],
        prevWeek: null,
        wowReportsGrowth: null,
        topSchoolsActiveWeek: []
      };
    }

    // 2. Bound weekly timeline strictly from May 1 of the cycle year up to the current week (today)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const cycleStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;

    // Anchor: Week 1 begins with the week containing May 1st (Sunday-Saturday cycle)
    const mayFirst = new Date(cycleStartYear, 4, 1, 0, 0, 0, 0);
    const mayDayOfWeek = mayFirst.getDay(); // 0 = Sun, 1 = Mon ...
    const startSunday = new Date(cycleStartYear, 4, 1 - mayDayOfWeek, 0, 0, 0, 0);

    // Current week boundary (Saturday 23:59:59.999 of the week containing today)
    const currentDayOfWeek = now.getDay();
    const currentWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - currentDayOfWeek), 23, 59, 59, 999);

    // 4. Generate consecutive 7-day intervals from May up to the current week ONLY
    const weeks: {
      weekIndex: number;
      weekLabel: string;
      shortLabel: string;
      dateRangeText: string;
      startDate: Date;
      endDate: Date;
      isCurrentWeek: boolean;
      reportsCount: number;
      participantsCount: number;
      schools: Set<string>;
      avgParticipants: number;
      reports: ActivityReport[];
    }[] = [];

    const cursor = new Date(startSunday);
    let index = 1;

    while (cursor.getTime() <= currentWeekEnd.getTime()) {
      const weekStart = new Date(cursor);
      const weekEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 6, 23, 59, 59, 999);

      const sDay = weekStart.getDate();
      const eDay = weekEnd.getDate();
      const sMonth = THAI_MONTH_SHORT[weekStart.getMonth()];
      const eMonth = THAI_MONTH_SHORT[weekEnd.getMonth()];

      const dateRangeText = sMonth === eMonth
        ? `${toTh(sDay)} - ${toTh(eDay)} ${sMonth}`
        : `${toTh(sDay)} ${sMonth} - ${toTh(eDay)} ${eMonth}`;

      const isCurrentWeek = now.getTime() >= weekStart.getTime() && now.getTime() <= weekEnd.getTime();

      weeks.push({
        weekIndex: index,
        weekLabel: `สัปดาห์ที่ ${toTh(index)} (${dateRangeText})`,
        shortLabel: `สัปดาห์ ${toTh(index)}`,
        dateRangeText,
        startDate: weekStart,
        endDate: weekEnd,
        isCurrentWeek,
        reportsCount: 0,
        participantsCount: 0,
        schools: new Set<string>(),
        avgParticipants: 0,
        reports: []
      });

      cursor.setDate(cursor.getDate() + 7);
      index++;
    }

    // 5. Populate every single report into its exact week bucket
    parsedEntries.forEach(({ report, date }) => {
      const t = date.getTime();
      const pCount = safeParseNumber(report.participantsCount, 0);
      let matched = false;
      for (const w of weeks) {
        if (t >= w.startDate.getTime() && t <= w.endDate.getTime()) {
          w.reportsCount += 1;
          w.participantsCount += pCount;
          w.schools.add(report.schoolName);
          w.reports.push(report);
          matched = true;
          break;
        }
      }
      if (!matched && weeks.length > 0) {
        // If report date is prior to May, assign to Week 1; if in future, assign to current week
        const targetWeek = t < weeks[0].startDate.getTime() ? weeks[0] : weeks[weeks.length - 1];
        targetWeek.reportsCount += 1;
        targetWeek.participantsCount += pCount;
        targetWeek.schools.add(report.schoolName);
        targetWeek.reports.push(report);
      }
    });

    // 6. Calculate averages
    weeks.forEach((w) => {
      w.avgParticipants = w.reportsCount > 0 ? Math.round(w.participantsCount / w.reportsCount) : 0;
    });

    // 7. Chart-ready series
    const chartSeries = weeks.map((w) => ({
      weekIndex: w.weekIndex,
      name: w.shortLabel,
      fullLabel: w.weekLabel,
      dateRange: w.dateRangeText,
      reports: w.reportsCount,
      participants: w.participantsCount,
      activeSchools: w.schools.size,
      avgParticipants: w.avgParticipants
    }));

    // 8. Determine inspected active week
    const nonZeroWeeks = weeks.filter((w) => w.reportsCount > 0);
    const latestActiveWeek = nonZeroWeeks.length > 0 ? nonZeroWeeks[nonZeroWeeks.length - 1] : weeks[weeks.length - 1];

    const inspectedWeek = selectedWeekIndex !== null
      ? weeks.find((w) => w.weekIndex === selectedWeekIndex) || latestActiveWeek
      : latestActiveWeek;

    const inspectedWeekIndexInList = weeks.findIndex((w) => w.weekIndex === inspectedWeek.weekIndex);
    const prevWeek = inspectedWeekIndexInList > 0 ? weeks[inspectedWeekIndexInList - 1] : null;

    const wowReportsGrowth = prevWeek && prevWeek.reportsCount > 0
      ? Math.round(((inspectedWeek.reportsCount - prevWeek.reportsCount) / prevWeek.reportsCount) * 100)
      : null;

    // 9. Top schools in the inspected week
    const schoolCountMap: Record<string, number> = {};
    inspectedWeek.reports.forEach((r) => {
      schoolCountMap[r.schoolName] = (schoolCountMap[r.schoolName] || 0) + 1;
    });
    const topSchoolsActiveWeek = Object.entries(schoolCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      weeks,
      chartSeries,
      activeWeek: inspectedWeek,
      prevWeek,
      wowReportsGrowth,
      topSchoolsActiveWeek
    };
  }, [filteredReports, selectedWeekIndex, toTh]);

  // =========================================================================
  // 2. MONTHLY DATA AGGREGATION (Starting from May to Current Month / Date)
  // =========================================================================
  const monthlyData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 = Jan, 4 = May, 8 = Sep

    // Academic / Project reporting cycle starts in May (month index 4)
    const cycleStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;

    // Generate monthly slots starting from May of cycleStartYear up to currentMonth of currentYear
    const months: Array<{
      key: string;
      year: number;
      yearBE: number;
      monthIndex: number;
      monthName: string;
      shortName: string;
      displayLabel: string;
      isCurrentMonth: boolean;
      reportsCount: number;
      participantsCount: number;
      schools: Set<string>;
      div21: number;
      div22: number;
      div23: number;
      div24: number;
      goalCounts: number[];
    }> = [];

    let curY = cycleStartYear;
    let curM = 4; // Start from May

    while (curY < currentYear || (curY === currentYear && curM <= currentMonth)) {
      const yearBE = curY + 543;
      const isCur = curY === currentYear && curM === currentMonth;
      months.push({
        key: `${curY}-${curM}`,
        year: curY,
        yearBE,
        monthIndex: curM,
        monthName: THAI_MONTH_NAMES[curM],
        shortName: THAI_MONTH_SHORT[curM],
        displayLabel: `${THAI_MONTH_NAMES[curM]} ${toTh(yearBE)}`,
        isCurrentMonth: isCur,
        reportsCount: 0,
        participantsCount: 0,
        schools: new Set<string>(),
        div21: 0,
        div22: 0,
        div23: 0,
        div24: 0,
        goalCounts: [0, 0, 0, 0, 0, 0, 0, 0]
      });

      curM++;
      if (curM > 11) {
        curM = 0;
        curY++;
      }
    }

    if (months.length === 0) {
      months.push({
        key: `${cycleStartYear}-4`,
        year: cycleStartYear,
        yearBE: cycleStartYear + 543,
        monthIndex: 4,
        monthName: THAI_MONTH_NAMES[4],
        shortName: THAI_MONTH_SHORT[4],
        displayLabel: `${THAI_MONTH_NAMES[4]} ${toTh(cycleStartYear + 543)}`,
        isCurrentMonth: true,
        reportsCount: 0,
        participantsCount: 0,
        schools: new Set<string>(),
        div21: 0,
        div22: 0,
        div23: 0,
        div24: 0,
        goalCounts: [0, 0, 0, 0, 0, 0, 0, 0]
      });
    }

    filteredReports.forEach((r) => {
      const d = parseReportDate(r) || new Date(cycleStartYear, 4, 27); // default May
      const rYear = d.getFullYear();
      const rMonth = d.getMonth();

      let slot = months.find((m) => m.year === rYear && m.monthIndex === rMonth);
      if (!slot) {
        slot = months.find((m) => m.monthIndex === rMonth) || months[months.length - 1];
      }

      if (slot) {
        slot.reportsCount += 1;
        slot.participantsCount += safeParseNumber(r.participantsCount, 0);
        slot.schools.add(r.schoolName);

        // Division breakdown
        const targetSchool = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(r.schoolName, s.name));
        const divName = targetSchool ? targetSchool.groupName : r.schoolName || "";
        if (isDivisionMatch(divName, "21")) slot.div21 += 1;
        else if (isDivisionMatch(divName, "22")) slot.div22 += 1;
        else if (isDivisionMatch(divName, "23")) slot.div23 += 1;
        else if (isDivisionMatch(divName, "24")) slot.div24 += 1;

        // Goal breakdown
        const gMatch = r.goalCode.match(/\b([1-8])\b/) || r.goalCode.match(/ด้านที่\s*([1-81-8])/);
        if (gMatch) {
          const toNum = (ch: string) => {
            const thaiMap: Record<string, number> = { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8 };
            return thaiMap[ch] || parseInt(ch, 10);
          };
          const gId = toNum(gMatch[1]);
          if (gId >= 1 && gId <= 8) {
            slot.goalCounts[gId - 1] += 1;
          }
        }
      }
    });

    const activeMonths = months.filter((m) => m.reportsCount > 0);

    const chartSeries = months.map((m) => ({
      name: m.shortName,
      fullName: m.displayLabel,
      reports: m.reportsCount,
      participants: m.participantsCount,
      activeSchools: m.schools.size,
      div21: m.div21,
      div22: m.div22,
      div23: m.div23,
      div24: m.div24
    }));

    return {
      months,
      activeMonths,
      chartSeries
    };
  }, [filteredReports, toTh]);

  // =========================================================================
  // 3. CUMULATIVE TOTAL AGGREGATION & 53 SCHOOLS LEDGER
  // =========================================================================
  const cumulativeData = useMemo(() => {
    // 1. Goal Accumulation Matrix (8 Developmental Goals)
    const goalMetrics = KOPODOT_GOALS.map((goal) => {
      const matchingReports = filteredReports.filter(
        (r) => r.goalCode.includes(`ด้านที่ ${goal.id}`) || r.goalCode.includes(`ด้านที่ ${toTh(goal.id)}`) || r.goalCode === `ด้านที่ ${goal.id}`
      );
      const totalGoalParticipants = matchingReports.reduce((sum, r) => sum + safeParseNumber(r.participantsCount, 0), 0);
      const distinctSchools = new Set(matchingReports.map((r) => r.schoolName)).size;
      const sharePercentage = totalReportsCount > 0 ? Math.round((matchingReports.length / totalReportsCount) * 100) : 0;

      return {
        ...goal,
        reportsCount: matchingReports.length,
        participantsCount: totalGoalParticipants,
        distinctSchools,
        sharePercentage
      };
    });

    // 2. 53-School Master Cumulative Ledger
    const schoolLedger = targetSchoolsInScope.map((school, index) => {
      const schoolReports = filteredReports.filter((r) => isSchoolMatch(r.schoolName, school.name));
      const reportsCount = schoolReports.length;
      const participantsCount = schoolReports.reduce((sum, r) => sum + safeParseNumber(r.participantsCount, 0), 0);

      // Goals covered by this school
      const coveredGoals = new Set<number>();
      schoolReports.forEach((r) => {
        for (let g = 1; g <= 8; g++) {
          if (r.goalCode.includes(`ด้านที่ ${g}`) || r.goalCode.includes(`ด้านที่ ${toTh(g)}`)) {
            coveredGoals.add(g);
          }
        }
      });

      // Latest activity report
      const latestReport = schoolReports.length > 0 ? schoolReports[0] : null;

      // Status determination
      let statusText = "ยังไม่มีรายงาน";
      let statusColor = "bg-rose-50 text-rose-700 border-rose-200";
      if (reportsCount >= 5 && coveredGoals.size >= 4) {
        statusText = "ดำเนินงานครบถ้วน";
        statusColor = "bg-emerald-50 text-emerald-700 border-emerald-300";
      } else if (reportsCount > 0) {
        statusText = "กำลังดำเนินการ";
        statusColor = "bg-amber-50 text-amber-700 border-amber-300";
      }

      return {
        index: index + 1,
        schoolName: school.name,
        groupName: school.groupName,
        province: school.province,
        reportsCount,
        participantsCount,
        coveredGoalsCount: coveredGoals.size,
        coveredGoalsArray: Array.from(coveredGoals).sort((a, b) => a - b),
        latestActivity: latestReport ? latestReport.activityName : "-",
        statusText,
        statusColor
      };
    });

    // Cumulative progression curve over time
    const sortedByDate = [...filteredReports].sort((a, b) => {
      const da = parseReportDate(a)?.getTime() || 0;
      const db = parseReportDate(b)?.getTime() || 0;
      return da - db;
    });

    let runningReports = 0;
    let runningParticipants = 0;
    const progressionMap: Record<string, { dateLabel: string; cumulativeReports: number; cumulativeParticipants: number }> = {};

    sortedByDate.forEach((r) => {
      const d = parseReportDate(r) || new Date(2026, 4, 27);
      const key = `${d.getDate()} ${THAI_MONTH_SHORT[d.getMonth()]}`;
      runningReports += 1;
      runningParticipants += r.participantsCount || 0;
      progressionMap[key] = {
        dateLabel: key,
        cumulativeReports: runningReports,
        cumulativeParticipants: runningParticipants
      };
    });

    const progressionSeries = Object.values(progressionMap);

    return {
      goalMetrics,
      schoolLedger,
      progressionSeries
    };
  }, [filteredReports, targetSchoolsInScope, totalReportsCount, toTh]);

  // Filtered School Ledger for table
  const filteredSchoolLedger = useMemo(() => {
    return cumulativeData.schoolLedger.filter((s) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = s.schoolName.toLowerCase().includes(q);
        const matchProv = s.province.toLowerCase().includes(q);
        const matchGroup = s.groupName.toLowerCase().includes(q);
        if (!matchName && !matchProv && !matchGroup) return false;
      }
      if (selectedGoalFilter !== "ALL") {
        const targetG = parseInt(selectedGoalFilter, 10);
        if (!s.coveredGoalsArray.includes(targetG)) return false;
      }
      return true;
    });
  }, [cumulativeData.schoolLedger, searchQuery, selectedGoalFilter]);

  // Handle Export CSV
  const handleExportCumulativeCsv = () => {
    const headers = [
      "ลำดับ",
      "ชื่อโรงเรียน",
      "กองกำกับการ (สังกัด)",
      "จังหวัด",
      "จำนวนรายงานสะสม (ฉบับ)",
      "จำนวนผู้เข้าร่วมสะสม (คน)",
      "จำนวนด้านที่ดำเนินการ (จาก 8 ด้าน)",
      "สถานะการดำเนินงาน",
      "กิจกรรมล่าสุด"
    ];

    const rows = filteredSchoolLedger.map((s) => [
      s.index,
      `"${s.schoolName}"`,
      `"${s.groupName}"`,
      `"${s.province}"`,
      s.reportsCount,
      s.participantsCount,
      `${s.coveredGoalsCount}/8`,
      `"${s.statusText}"`,
      `"${s.latestActivity.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = createWindowsSafeCsvBlob(csvContent);
    const filename = sanitizeWindowsFilename(
      `รายงานสะสม_${selectedDivision === "ALL" ? "บก.ตชด.ภาค2" : selectedDivision}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    triggerWindowsFileDownload(blob, filename);
  };

  // State for copying text in subtabs
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const handleCopyNarrative = (text: string, tabKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(tabKey);
    setTimeout(() => setCopiedTab(null), 2500);
  };

  // Detailed summary narrative: Weekly (สำหรับนำเสนอในที่ประชุม)
  const weeklyNarrative = useMemo(() => {
    const actW = weeklyData.activeWeek;
    const count = actW ? actW.reportsCount : 0;
    const schools = actW ? actW.schools.size : 0;
    const participants = actW ? actW.participantsCount : 0;
    const avgPart = count > 0 ? Math.round(participants / count) : 0;
    const growth = weeklyData.wowReportsGrowth;
    const targetCount = targetSchoolsInScope.length;
    const activePercent = targetCount > 0 ? Math.round((schools / targetCount) * 100) : 0;
    const topSc = weeklyData.topSchoolsActiveWeek;

    const momentumText = growth !== null
      ? growth >= 0
        ? `อัตราการส่งรายงานสัปดาห์นี้เติบโตเพิ่มขึ้น +${toTh(growth)}% เมื่อเทียบกับสัปดาห์ก่อนหน้า สะท้อนถึงอัตราเร่งและความกระตือรือร้นของสถานศึกษาในการดำเนินกิจกรรมตามแผนพัฒนาเด็กและเยาวชนฯ อย่างต่อเนื่อง มีการกระตุ้นการมีส่วนร่วมของนักเรียนและชุมชนอย่างเห็นได้ชัด`
        : `อัตราการส่งรายงานสัปดาห์นี้มีการปรับตัวลดลง -${toTh(Math.abs(growth))}% เมื่อเทียบกับสัปดาห์ก่อนหน้า ซึ่งเกิดจากปัจจัยความสอดคล้องกับตารางการเรียนการสอน ช่วงการสอบวัดผลตามหลักสูตร หรือภารกิจการจัดกิจกรรมภาคสนามและการตรวจเยี่ยมพื้นที่ ซึ่งฝ่ายบริหารควรติดตามเพื่อให้การบันทึกข้อมูลกลับเข้าสู่เกณฑ์ปกติในสัปดาห์ถัดไป`
      : "สัปดาห์นี้เป็นสัปดาห์เริ่มต้นของการรวบรวมข้อมูลรายงานรอบปัจจุบัน มีการบันทึกข้อมูลตั้งต้นอย่างเป็นระบบเพื่อใช้เป็นฐานข้อมูลเปรียบเทียบในรอบสัปดาห์ถัดไป";

    const topSchoolsText = topSc.length > 0
      ? topSc.map(([name, c], idx) => `อันดับที่ ${toTh(idx + 1)}: ${name} (${toTh(c)} ฉบับ)`).join(" • ")
      : "ยังไม่มีสถานศึกษาที่ส่งรายงานในรอบสัปดาห์นี้";

    const fullSummaryText = `[เอกสารสรุปผลการดำเนินงาน กพด. ฉบับที่ ${toTh(5)} ประจำสัปดาห์ เพื่อการประชุมผู้บริหาร]
หน่วยงาน: ${selectedDivision === "ALL" ? `กองบังคับการตำรวจตระเวนชายแดนภาค ${toTh(2)} (กก.ตชด. ${toTh(21)}, ${toTh(22)}, ${toTh(23)}, ${toTh(24)} รวม ${toTh(53)} โรงเรียน)` : selectedDivision}
ห้วงระยะเวลา: ${actW ? actW.weekLabel : "สัปดาห์ปัจจุบัน"}

${toTh(1)}. สรุปภาพรวมสถานการณ์และสถิติการดำเนินงาน (Key Highlights):
• ปริมาณรายงานที่ได้รับในรอบสัปดาห์: ${toTh(count)} ฉบับ
• จำนวนสถานศึกษาที่ขับเคลื่อนกิจกรรม: ${toTh(schools)} แห่ง จากเป้าหมาย ${toTh(targetCount)} แห่ง (คิดเป็น ${toTh(activePercent)}% ของสถานศึกษาในสังกัด)
• ยอดนักเรียน ครู และประชาชนผู้เข้าร่วมกิจกรรม: รวมทั้งสิ้น ${toTh(formatThNum(participants))} คน (เฉลี่ย ${toTh(formatThNum(avgPart))} คนต่อกิจกรรม)
• พลวัตเทียบสัปดาห์ก่อนหน้า (WoW Dynamic): ${momentumText}

${toTh(2)}. สถานศึกษาที่มีผลงานและการมีส่วนร่วมโดดเด่นประจำสัปดาห์:
• ${topSchoolsText}

${toTh(3)}. การประเมินสถานการณ์และการขับเคลื่อนกิจกรรมในพื้นที่:
• กิจกรรมส่วนใหญ่ในสัปดาห์นี้มุ่งเน้นด้านการเกษตรเพื่ออาหารกลางวัน การจัดการผลผลิตเข้าสู่สหกรณ์ และการส่งเสริมสุขภาพสุขอนามัยของนักเรียน
• สถานศึกษาหลายแห่งสามารถบูรณาการกิจกรรมตามพระราชดำริเข้ากับชั่วโมงเรียนตามหลักสูตรได้อย่างกลมกลืน

${toTh(4)}. ข้อเสนอแนะเชิงปฏิบัติการและข้อสั่งการสำหรับสัปดาห์ถัดไป (Actionable Directives):
${toTh(1)}) ให้ฝ่ายการศึกษาประจำกองกำกับการ ประสานงานและสนับสนุนครูผู้รับผิดชอบโครงการใน ${toTh(Math.max(targetCount - schools, 0))} โรงเรียนที่ยังไม่มีรายงานในสัปดาห์นี้ เพื่อร่วมวิเคราะห์และแก้ไขข้อขัดข้องด้านการบันทึกข้อมูล
${toTh(2)}) ส่งเสริมให้โรงเรียนที่มีผลงานต่อเนื่องแลกเปลี่ยนองค์ความรู้และสื่อการสอนร่วมกับโรงเรียนเครือข่ายใกล้เคียง
${toTh(3)}) เน้นย้ำให้ครูผู้สอนบันทึกภาพถ่ายเชิงประจักษ์และตัวชี้วัดผลผลิต (Output) ให้ครบถ้วนเพื่อใช้ประกอบการรายงานผลต่อผู้บังคับบัญชา`;

    return {
      overview: `ในรอบ${actW ? actW.weekLabel : "สัปดาห์ล่าสุด"} สถานศึกษาในสังกัด${selectedDivision === "ALL" ? ` กองบังคับการตำรวจตระเวนชายแดนภาค ${toTh(2)} (${toTh(4)} กองกำกับการ)` : ` ${selectedDivision}`} มีการขับเคลื่อนกิจกรรมและรายงานผลรวมทั้งสิ้น ${toTh(count)} ฉบับ จากสถานศึกษาที่ตื่นตัว ${toTh(schools)} แห่ง (คิดเป็นสัดส่วน ${toTh(activePercent)}% ของสถานศึกษาในความรับผิดชอบ ${toTh(targetCount)} แห่ง) โดยมียอดนักเรียน คณะครู บุคลากร และประชาชนในชุมชนเข้าร่วมกิจกรรมรวม ${toTh(formatThNum(participants))} คน เฉลี่ยประมาณ ${toTh(formatThNum(avgPart))} คนต่อกิจกรรม ซึ่งสะท้อนถึงการดำเนินงานที่มีความเคลื่อนไหวอย่างมีชีวิตชีวาในระดับพื้นที่`,
      momentum: momentumText,
      topSchools: topSchoolsText,
      recommendations: [
        `ติดตามและประสานงานกับโรงเรียนที่ยังไม่มีรายงานในสัปดาห์นี้ (${toTh(Math.max(targetCount - schools, 0))} แห่ง) เพื่อประเมินความพร้อมและแก้ไขข้อติดขัดด้านระบบการรายงาน`,
        `สนับสนุนการขยายผลและแลกเปลี่ยนแนวปฏิบัติที่ดี (Best Practices) จากสถานศึกษาที่มีกิจกรรมต่อเนื่องไปยังโรงเรียนเครือข่าย`,
        `รักษาความต่อเนื่องของการจัดกิจกรรมตามกรอบแผน กพด. ฉบับที่ ${toTh(5)} อย่างน้อย ${toTh(1)}-${toTh(2)} กิจกรรมต่อสัปดาห์ต่อโรงเรียน`,
        `กำชับการบันทึกยอดผู้เข้าร่วมและภาพถ่ายกิจกรรมตามความเป็นจริงเพื่อความถูกต้องแม่นยำของฐานข้อมูลเชิงประจักษ์`
      ],
      fullSummaryText
    };
  }, [weeklyData, targetSchoolsInScope, selectedDivision, toTh]);

  // Detailed summary narrative: Monthly (สำหรับนำเสนอในที่ประชุม)
  const monthlyNarrative = useMemo(() => {
    const monthsWithReports = monthlyData.activeMonths;
    const peakMonth = monthlyData.months.reduce((max, m) => m.reportsCount > max.reportsCount ? m : max, monthlyData.months[0]);
    const avgReports = monthsWithReports.length > 0 ? Math.round(totalReportsCount / monthsWithReports.length) : 0;
    const avgParts = monthsWithReports.length > 0 ? Math.round(totalParticipantsCount / monthsWithReports.length) : 0;

    const div21 = monthlyData.months.reduce((s, m) => s + m.div21, 0);
    const div22 = monthlyData.months.reduce((s, m) => s + m.div22, 0);
    const div23 = monthlyData.months.reduce((s, m) => s + m.div23, 0);
    const div24 = monthlyData.months.reduce((s, m) => s + m.div24, 0);

    const divRanking = [
      { name: `กก.ตชด. ${toTh(21)} (สุรินทร์/บุรีรัมย์)`, count: div21 },
      { name: `กก.ตชด. ${toTh(22)} (อุบลฯ/อำนาจเจริญ/ยโสธร/ศรีสะเกษ)`, count: div22 },
      { name: `กก.ตชด. ${toTh(23)} (สกลนคร/นครพนม/มุกดาหาร)`, count: div23 },
      { name: `กก.ตชด. ${toTh(24)} (อุดรธานี/หนองคาย/เลย/บึงกาฬ)`, count: div24 }
    ].sort((a, b) => b.count - a.count);

    const fullSummaryText = `[เอกสารสรุปผลการดำเนินงาน กพด. ฉบับที่ ${toTh(5)} รายเดือนและการกระจายตัวเชิงพื้นที่ ประจำปี ${toTh(2569)}]
หน่วยงาน: ${selectedDivision === "ALL" ? `บก.ตชด.ภาค ${toTh(2)} (${toTh(53)} โรงเรียน)` : selectedDivision}
ขอบเขตการประเมิน: ตลอดรอบปีการศึกษา ${toTh(2569)}

${toTh(1)}. สรุปภาพรวมและวงจรการจัดกิจกรรม (Activity Cycle & Trajectory):
• จำนวนเดือนที่มีการบันทึกรายงาน: ${toTh(monthsWithReports.length)} เดือน
• ปริมาณรายงานเฉลี่ย: ${toTh(avgReports)} ฉบับต่อเดือน
• ผู้เข้าร่วมกิจกรรมเฉลี่ย: ${toTh(formatThNum(avgParts))} คนต่อเดือน
• เดือนที่มีการดำเนินกิจกรรมสูงสุด (Peak Activity Month): ${peakMonth ? peakMonth.monthName : "-"} (รายงาน ${toTh(peakMonth ? peakMonth.reportsCount : 0)} ฉบับ, ผู้เข้าร่วม ${toTh(formatThNum(peakMonth ? peakMonth.participantsCount : 0))} คน) ซึ่งสอดคล้องกับช่วงฤดูกาลเพาะปลูกและการจัดกิจกรรมสัปดาห์วันสำคัญ

${toTh(2)}. ผลการดำเนินงานเปรียบเทียบ ${toTh(4)} กองกำกับการ (Cross-Division Balance):
${divRanking.map((d, i) => `• ลำดับที่ ${toTh(i + 1)} ${d.name}: ผลงาน ${toTh(d.count)} ฉบับ`).join("\n")}

${toTh(3)}. การวิเคราะห์ประสิทธิภาพและการมีส่วนร่วมของชุมชน:
• ผลงานรายงานกระจายตัวครอบคลุมทั้ง ${toTh(4)} กองกำกับการ โดยมีชุมชน ผู้ปกครอง และหน่วยงานภาคีในพื้นที่เข้าร่วมสนับสนุนกิจกรรมเกษตรเพื่ออาหารกลางวันและสหกรณ์นักเรียนอย่างต่อเนื่อง
• อัตราการมีส่วนร่วมเฉลี่ยสะท้อนว่ากิจกรรมโครงการพระราชดำริได้หยั่งรากลึกเป็นวิถีชีวิตของโรงเรียนและชุมชนชายแดน

${toTh(4)}. ข้อเสนอแนะเชิงบริหารและการเตรียมการรายเดือน (Monthly Executive Guidelines):
${toTh(1)}) วางแผนการจัดกิจกรรมให้สอดคล้องกับฤดูกาลเกษตรและปฏิทินการศึกษา เพื่อไม่ให้กระทบต่อการเตรียมตัวสอบของนักเรียน
${toTh(2)}) จัดสรรงบประมาณ เมล็ดพันธุ์ และปัจจัยการผลิตล่วงหน้าก่อนเข้าสู่เดือนที่มีปริมาณกิจกรรมหนาแน่น
${toTh(3)}) ใช้ช่วงเดือนที่มีกิจกรรมเบาบางเพื่อดำเนินการถอดบทเรียน (AAR) พัฒนาทักษะครู และบำรุงรักษาโครงสร้างพื้นฐาน`;

    return {
      overview: `ตลอดรอบปีการศึกษา ${toTh(2569)} การดำเนินงานของโรงเรียนตำรวจตระเวนชายแดนในสังกัด บก.ตชด.ภาค ${toTh(2)} มีการขับเคลื่อนกิจกรรมอย่างต่อเนื่องใน ${toTh(monthsWithReports.length)} เดือน โดยมีค่าเฉลี่ยรายงานรวม ${toTh(avgReports)} ฉบับต่อเดือน และยอดผู้ได้รับประโยชน์เฉลี่ย ${toTh(formatThNum(avgParts))} คนต่อเดือน ช่วงเวลาที่มีการจัดกิจกรรมหนาแน่นและส่งรายงานสูงสุด (Peak Activity Month) คือ ${peakMonth ? peakMonth.monthName : "-"} ซึ่งมียอดรายงาน ${toTh(peakMonth ? peakMonth.reportsCount : 0)} ฉบับ และยอดผู้เข้าร่วม ${toTh(formatThNum(peakMonth ? peakMonth.participantsCount : 0))} คน อันเป็นช่วงที่แปลงเกษตรให้ผลผลิตเต็มที่และมีการจัดกิจกรรมขยายผลสู่ชุมชนอย่างกว้างขวาง`,
      divisionComparison: `เมื่อจำแนกความก้าวหน้ารายกองกำกับการ พบการประสานพลังขับเคลื่อนอย่างสมดุลดังนี้: อันดับ ${toTh(1)} ได้แก่ ${divRanking[0].name} มีรายงานรวม ${toTh(divRanking[0].count)} ฉบับ, ตามด้วย ${divRanking[1].name} จำนวน ${toTh(divRanking[1].count)} ฉบับ, ${divRanking[2].name} จำนวน ${toTh(divRanking[2].count)} ฉบับ, และ ${divRanking[3].name} จำนวน ${toTh(divRanking[3].count)} ฉบับ ซึ่งแสดงถึงความพร้อมและความทุ่มเทของครูใหญ่และครู ตชด. ในทุกพื้นที่ชายแดนภาคตะวันออกเฉียงเหนือ`,
      recommendations: [
        `วางแผนล่วงหน้ารองรับฤดูกาลเพาะปลูกและสภาพภูมิอากาศในแต่ละพื้นที่ เพื่อให้การผลิตอาหารกลางวันมีความมั่นคงตลอดทั้งปี`,
        `จัดสรรทรัพยากร เมล็ดพันธุ์ ปุ๋ยอินทรีย์ และอุปกรณ์การเกษตรล่วงหน้าก่อนถึงช่วงเปิดภาคเรียนและฤดูเพาะปลูก`,
        `ส่งเสริมการบูรณาการกิจกรรมข้ามเดือน เช่น การเก็บเกี่ยวผลผลิตเข้าสู่สหกรณ์ และการแปรรูปถนอมอาหารเพื่อใช้ในเดือนถัดไป`,
        `ใช้ช่วงเวลาของเดือนที่มีกิจกรรมเบาบางเพื่อสรุปผลการดำเนินงาน ถอดบทเรียน (After Action Review) และประเมินพัฒนาการเด็กรายบุคคล`
      ],
      fullSummaryText
    };
  }, [monthlyData, totalReportsCount, totalParticipantsCount, selectedDivision, toTh]);

  // Detailed summary narrative: Cumulative (สำหรับนำเสนอในที่ประชุม)
  const cumulativeNarrative = useMemo(() => {
    const completedCount = cumulativeData.schoolLedger.filter((s) => s.statusText === "ดำเนินงานครบถ้วน").length;
    const inProgressCount = cumulativeData.schoolLedger.filter((s) => s.statusText === "กำลังดำเนินการ").length;
    const pendingCount = cumulativeData.schoolLedger.filter((s) => s.statusText === "ยังไม่มีรายงาน").length;

    const sortedGoals = [...cumulativeData.goalMetrics].sort((a, b) => b.reportsCount - a.reportsCount);
    const topGoals = sortedGoals.slice(0, 3);
    const leastGoals = sortedGoals.slice(-2);

    const fullSummaryText = `[รายงานผลสัมฤทธิ์สะสมภาพรวมเชิงยุทธศาสตร์ โครงการ กพด. ฉบับที่ ${toTh(5)} ประจำปี ${toTh(2569)}]
หน่วยงาน: ${selectedDivision === "ALL" ? `กองบังคับการตำรวจตระเวนชายแดนภาค ${toTh(2)} (${toTh(4)} กองกำกับการ รวม ${toTh(53)} โรงเรียน)` : selectedDivision}
วันที่สรุปข้อมูล: ${new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}

${toTh(1)}. สรุปผลสัมฤทธิ์สะสมภาพรวม (Executive Summary):
• ปริมาณรายงานสะสมทั้งสิ้น: ${toTh(formatThNum(totalReportsCount))} ฉบับ
• ยอดผู้ได้รับประโยชน์สะสมรวม: ${toTh(formatThNum(totalParticipantsCount))} คน-ครั้ง
• อัตราความครอบคลุมสถานศึกษา: ${toTh(activeSchoolsCount)} จาก ${toTh(targetSchoolsInScope.length)} โรงเรียน (คิดเป็น ${toTh(coverageRate)}%)
• สถานะความพร้อมของสถานศึกษา (School Readiness):
  - สถานศึกษาที่ "ดำเนินงานครบถ้วนรอบด้าน" (>= ${toTh(5)} ฉบับ, >= ${toTh(4)} ด้าน): ${toTh(completedCount)} แห่ง (${toTh(Math.round((completedCount / targetSchoolsInScope.length) * 100))}%)
  - สถานศึกษาที่ "กำลังดำเนินการต่อเนื่อง": ${toTh(inProgressCount)} แห่ง (${toTh(Math.round((inProgressCount / targetSchoolsInScope.length) * 100))}%)
  - สถานศึกษาที่ "ยังไม่มีรายงาน" (กลุ่มเป้าหมายเร่งรัด): ${toTh(pendingCount)} แห่ง (${toTh(Math.round((pendingCount / targetSchoolsInScope.length) * 100))}%)

${toTh(2)}. สรุปความก้าวหน้าจำแนกตาม ${toTh(8)} มิติการพัฒนาพระราชดำริ (กพด. ฉบับที่ ${toTh(5)}):
• ${toTh(3)} ด้านที่มีผลงานโดดเด่นสูงสุด:
  ${toTh(1)}) ด้านที่ ${toTh(topGoals[0]?.id)} ${topGoals[0]?.title}: ${toTh(topGoals[0]?.reportsCount)} ฉบับ (สัดส่วน ${toTh(topGoals[0]?.sharePercentage)}%, ครอบคลุม ${toTh(topGoals[0]?.distinctSchools)} รร.)
  ${toTh(2)}) ด้านที่ ${toTh(topGoals[1]?.id)} ${topGoals[1]?.title}: ${toTh(topGoals[1]?.reportsCount)} ฉบับ (สัดส่วน ${toTh(topGoals[1]?.sharePercentage)}%, ครอบคลุม ${toTh(topGoals[1]?.distinctSchools)} รร.)
  ${toTh(3)}) ด้านที่ ${toTh(topGoals[2]?.id)} ${topGoals[2]?.title}: ${toTh(topGoals[2]?.reportsCount)} ฉบับ (สัดส่วน ${toTh(topGoals[2]?.sharePercentage)}%, ครอบคลุม ${toTh(topGoals[2]?.distinctSchools)} รร.)
• ด้านที่ควรได้รับการส่งเสริมเพิ่มเติมเพื่อความสมดุลรอบด้าน:
  - ${leastGoals.map(g => `ด้านที่ ${toTh(g.id)} ${g.title} (${toTh(g.reportsCount)} ฉบับ, ${toTh(g.distinctSchools)} รร.)`).join("\n  - ")}

${toTh(3)}. ผลกระทบเชิงประจักษ์และการพัฒนาคุณภาพชีวิต (Impact Assessment):
• นักเรียนได้รับสารอาหารครบถ้วนตามเกณฑ์โภชนาการ ส่งผลให้มีพัฒนาการสมวัยและลดภาวะทุพโภชนาการ
• มีการฝึกทักษะอาชีพและระบบสหกรณ์นักเรียนที่เชื่อมโยงผลผลิตการเกษตรเข้าสู่โรงอาหารอย่างโปร่งใส
• โรงเรียนทำหน้าที่เป็นศูนย์กลางการเรียนรู้และถ่ายทอดเทคโนโลยีการเกษตรสู่เกษตรกรในชุมชนโดยรอบ

${toTh(4)}. ข้อเสนอแนะเชิงยุทธศาสตร์สำหรับผู้บังคับบัญชา (Strategic Directives):
${toTh(1)}) มอบหมายฝ่ายการศึกษา กก.ตชด. และครูนิเทศก์ ลงพื้นที่ตรวจเยี่ยมและสนับสนุน ${toTh(pendingCount)} โรงเรียนที่ยังไม่มีรายงาน เพื่อดันให้อัตราความครอบคลุมแตะ ${toTh(100)}%
${toTh(2)}) ขยายผลรูปแบบความสำเร็จของ ${toTh(completedCount)} โรงเรียนต้นแบบ ให้เป็นแหล่งเรียนรู้ศึกษาดูงานภายในสังกัด
${toTh(3)}) ส่งเสริมการเชื่อมโยง ${toTh(8)} ด้านการพัฒนาให้เป็นระบบนิเวศการเรียนรู้เดียวกัน โดยเฉพาะการนำสหกรณ์และการอนุรักษ์พันธุกรรมพืชมาเสริมด้านเกษตรอาหารกลางวัน
${toTh(4)}) พัฒนาระบบจัดเก็บข้อมูลดิจิทัลและสร้างคลังความรู้ (Knowledge Hub) สำหรับครู ตชด. รุ่นใหม่อย่างยั่งยืน`;

    return {
      overview: `ผลการขับเคลื่อนการดำเนินงานตามแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดารตามพระราชดำริ สมเด็จพระกนิษฐาธิราชเจ้า กรมสมเด็จพระเทพรัตนราชสุดา ฯ สยามบรมราชกุมารี (กพด.) ฉบับที่ ${toTh(5)} สะสมรวมทั้งสิ้น ${toTh(formatThNum(totalReportsCount))} ฉบับ สร้างประโยชน์แก่นักเรียน คณะครู และประชาชนในถิ่นทุรกันดารสะสม ${toTh(formatThNum(totalParticipantsCount))} คน-ครั้ง โดยมีสถานศึกษาเข้าร่วมรายงานแล้ว ${toTh(activeSchoolsCount)} แห่ง จากเป้าหมายทั้งหมด ${toTh(targetSchoolsInScope.length)} แห่ง (คิดเป็นอัตราความครอบคลุม ${toTh(coverageRate)}%) ซึ่งแสดงถึงความมุ่งมั่นและความก้าวหน้าอย่างเป็นรูปธรรมในการพัฒนาคุณภาพชีวิตเด็กและเยาวชนชายแดน`,
      schoolStatusBreakdown: `จากการประเมินสถานะความก้าวหน้ารายโรงเรียน พบว่า มีสถานศึกษาที่ "ดำเนินงานครบถ้วนรอบด้าน" (ส่งรายงานตั้งแต่ ${toTh(5)} ฉบับและครอบคลุมอย่างน้อย ${toTh(4)} ด้านขึ้นไป) จำนวน ${toTh(completedCount)} แห่ง (คิดเป็น ${toTh(Math.round((completedCount / targetSchoolsInScope.length) * 100))}%), สถานศึกษาที่ "กำลังดำเนินการต่อเนื่อง" จำนวน ${toTh(inProgressCount)} แห่ง, และสถานศึกษาที่ "ยังไม่มีรายงาน" จำนวน ${toTh(pendingCount)} แห่ง ซึ่งฝ่ายกำกับดูแลควรมุ่งเน้นการตรวจเยี่ยมเชิงรุกเพื่อยกระดับสถานศึกษาในกลุ่มที่สองและสามขึ้นสู่มาตรฐานครบถ้วน`,
      goalsSynthesis: `ในมิติ ${toTh(8)} ด้านการพัฒนา พบว่าด้านที่มีผลสัมฤทธิ์สะสมสูงสุด ${toTh(3)} อันดับแรก ได้แก่ ด้านที่ ${toTh(topGoals[0]?.id)} ${topGoals[0]?.title} (${toTh(topGoals[0]?.reportsCount)} ฉบับ, คิดเป็น ${toTh(topGoals[0]?.sharePercentage)}%), ด้านที่ ${toTh(topGoals[1]?.id)} ${topGoals[1]?.title} (${toTh(topGoals[1]?.reportsCount)} ฉบับ), และด้านที่ ${toTh(topGoals[2]?.id)} ${topGoals[2]?.title} (${toTh(topGoals[2]?.reportsCount)} ฉบับ) ขณะที่ด้านที่ยังต้องการการขับเคลื่อนเพิ่มเติมเพื่อสร้างความสมดุลรอบด้าน ได้แก่ ${leastGoals.map(g => `ด้านที่ ${toTh(g.id)} ${g.title}`).join(" และ ")} ซึ่งฝ่ายบริหารสามารถจัดกิจกรรมรณรงค์เฉพาะด้านเพื่อหนุนเสริมได้`,
      impact: `ผลลัพธ์เชิงประจักษ์สะท้อนชัดเจนว่าโรงเรียนตำรวจตระเวนชายแดนทำหน้าที่เป็น "ศูนย์กลางแห่งการเรียนรู้และการพัฒนาคุณภาพชีวิต" อย่างแท้จริง โดยไม่เพียงส่งเสริมด้านวิชาการ แต่ยังสร้างความมั่นคงทางอาหาร ส่งเสริมสุขภาวะที่ดี และบ่มเพาะทักษะชีวิตแก่เยาวชน ให้เติบโตเป็นกำลังสำคัญในการปกป้องและพัฒนาผืนแผ่นดินไทยตามแนวพระราชดำริอย่างยั่งยืน`,
      recommendations: [
        `มอบหมายครูนิเทศก์และฝ่ายการศึกษาประจำกองกำกับการ เข้าตรวจเยี่ยมและสนับสนุน ${toTh(pendingCount)} โรงเรียนที่ยังไม่มีรายงาน เพื่อดันให้แตะเป้าหมาย ${toTh(100)}% ครบทุกแห่ง`,
        `จัดทำแผนบูรณาการระหว่างด้านเกษตรเพื่ออาหารกลางวัน กับด้านสหกรณ์นักเรียนและด้านการอนุรักษ์ทรัพยากรธรรมชาติ เพื่อให้เกิดห่วงโซ่การเรียนรู้ครบวงจร`,
        `เผยแพร่เกียรติประวัติและผลงานของ ${toTh(completedCount)} สถานศึกษาที่มีผลงานครบถ้วน เพื่อเป็นแบบอย่าง (Model School) แก่โรงเรียนอื่นๆ ในสังกัดภาค ${toTh(2)}`,
        `จัดสรรงบประมาณสนับสนุนโครงการพระราชดำริเพิ่มเติมในด้านที่ยังมีสัดส่วนรายงานน้อย เพื่อให้เกิดความสมดุลครบทั้ง ${toTh(8)} มิติการพัฒนา`,
        `ส่งเสริมการใช้ข้อมูลสถิติเชิงประจักษ์นี้ในการวางแผนยุทธศาสตร์ประจำปีงบประมาณถัดไปร่วมกับหน่วยงานภาคีภายนอก`
      ],
      fullSummaryText
    };
  }, [cumulativeData, totalReportsCount, totalParticipantsCount, activeSchoolsCount, targetSchoolsInScope, coverageRate, toTh]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 space-y-6">
      
      {/* Navigation Sub-Tabs & Filter Header */}
      <div className="app-card-surface bg-white p-4 border-slate-200/90 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0 shadow-2xs">
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                ระบบวิเคราะห์ข้อมูลรอบระยะเวลาและรายงานสะสม
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500">
              วิเคราะห์เจาะลึกแนวโน้มการดำเนินกิจกรรม: รายสัปดาห์ (Weekly), รายเดือน (Monthly), และบัญชีรายงานสะสมรายโรงเรียน {toTh(53)} แห่ง
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSubTab("weekly")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  subTab === "weekly"
                    ? "bg-white text-indigo-900 shadow-2xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>รายสัปดาห์</span>
              </button>

              <button
                type="button"
                onClick={() => setSubTab("monthly")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  subTab === "monthly"
                    ? "bg-white text-indigo-900 shadow-2xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                <span>รายเดือน</span>
              </button>

              <button
                type="button"
                onClick={() => setSubTab("cumulative")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  subTab === "cumulative"
                    ? "bg-white text-indigo-900 shadow-2xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>รายงานสะสม</span>
              </button>
            </div>

            {/* Numeral format toggle */}
            <button
              type="button"
              onClick={() => setLocalArabic(!useArabicNumerals)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
              title={useArabicNumerals ? "สลับเป็นตัวเลขไทย (1, 2, 3)" : "สลับเป็นเลขอารบิกสากล (1, 2, 3)"}
            >
              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono font-black text-[11px]">
                {useArabicNumerals ? "123" : "123"}
              </span>
              <span>{useArabicNumerals ? "เลขสากล" : "เลขไทย"}</span>
            </button>
          </div>
        </div>

        {/* Division Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="typo-app-subtext text-slate-500 font-bold mr-1">เลือกสังกัด:</span>
          {[
            { id: "ALL", label: `ทุกสังกัด (${toTh(53)} รร.)` },
            { id: "กองกำกับการตำรวจตระเวนชายแดนที่ 21", label: `กก.ตชด. ${toTh(21)}` },
            { id: "กองกำกับการตำรวจตระเวนชายแดนที่ 22", label: `กก.ตชด. ${toTh(22)}` },
            { id: "กองกำกับการตำรวจตระเวนชายแดนที่ 23", label: `กก.ตชด. ${toTh(23)}` },
            { id: "กองกำกับการตำรวจตระเวนชายแดนที่ 24", label: `กก.ตชด. ${toTh(24)}` }
          ].map((div) => {
            const isMatch = isDivisionMatch(div.id, selectedDivision);
            return (
              <button
                key={div.id}
                type="button"
                onClick={() => handleDivisionChange(div.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isMatch
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {div.label}
              </button>
            );
          })}
        </div>

        {/* Global Metric Cards Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 space-y-1">
            <span className="typo-app-subtext text-slate-500 block">รายงานในขอบเขต</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-slate-900">{toTh(formatThNum(totalReportsCount))}</span>
              <span className="text-[11px] text-slate-500 font-medium">ฉบับ</span>
            </div>
          </div>

          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 space-y-1">
            <span className="typo-app-subtext text-slate-500 block">ผู้เข้าร่วมกิจกรรมรวม</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-indigo-900">{toTh(formatThNum(totalParticipantsCount))}</span>
              <span className="text-[11px] text-slate-500 font-medium">คน</span>
            </div>
          </div>

          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 space-y-1">
            <span className="typo-app-subtext text-slate-500 block">โรงเรียนที่รายงานแล้ว</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-emerald-700">{toTh(activeSchoolsCount)}</span>
              <span className="text-[11px] text-slate-500 font-medium">/ {toTh(targetSchoolsInScope.length)} รร.</span>
            </div>
          </div>

          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 space-y-1">
            <span className="typo-app-subtext text-slate-500 block">อัตราความครอบคลุม</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-amber-700">{toTh(coverageRate)}%</span>
              <span className="text-[11px] text-slate-500 font-medium">ของเป้าหมาย</span>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* VIEW 1: WEEKLY ANALYSIS (การวิเคราะห์รายสัปดาห์) */}
      {/* =================================================================== */}
      {subTab === "weekly" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          
          {/* Weekly Chart Card */}
          <div className="app-card-surface bg-white p-3.5 sm:p-4 border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                  <span>แนวโน้มการดำเนินกิจกรรมรายสัปดาห์ (Weekly Activity Trend)</span>
                </h3>
                <p className="text-[10.5px] sm:text-[11px] text-slate-500">
                  เปรียบเทียบจำนวนรายงานที่ได้รับและยอดผู้เข้าร่วมกิจกรรมในแต่ละรอบ {toTh(7)} วัน
                </p>
              </div>

              {weeklyData.wowReportsGrowth !== null && (
                <div className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 shrink-0 ${
                  weeklyData.wowReportsGrowth >= 0
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-rose-50 text-rose-800 border-rose-300"
                }`}>
                  {weeklyData.wowReportsGrowth >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-rose-600" />
                  )}
                  <span>
                    สัปดาห์ล่าสุด {weeklyData.wowReportsGrowth >= 0 ? "+" : ""}{toTh(weeklyData.wowReportsGrowth)}% จากสัปดาห์ก่อน
                  </span>
                </div>
              )}
            </div>

            {/* Recharts Dual Axis Chart */}
            <div className="h-64 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weeklyData.chartSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10.5} tickLine={false} />
                  {/* Left YAxis for reports */}
                  <YAxis
                    yAxisId="left"
                    stroke="#4f46e5"
                    fontSize={10.5}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  {/* Right YAxis for participants */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#f59e0b"
                    fontSize={10.5}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                      fontSize: "11px"
                    }}
                    formatter={(value: any, name: any) => [
                      `${toTh(formatThNum(Number(value)))} ${name === "reports" ? "ฉบับ" : name === "participants" ? "คน" : "รร."}`,
                      name === "reports" ? "จำนวนรายงาน" : name === "participants" ? "ยอดผู้เข้าร่วม" : "โรงเรียนที่ส่ง"
                    ]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]?.payload?.fullLabel) {
                        return payload[0].payload.fullLabel;
                      }
                      return label;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={30}
                    formatter={(val) => (
                      <span className="text-[11px] font-semibold text-slate-700">
                        {val === "reports" ? "จำนวนรายงาน (ฉบับ - แกนซ้าย)" : "ยอดผู้เข้าร่วม (คน - แกนขวา)"}
                      </span>
                    )}
                  />
                  <Bar yAxisId="left" dataKey="reports" name="reports" fill="#4f46e5" radius={[5, 5, 0, 0]} maxBarSize={30} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="participants"
                    name="participants"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#f59e0b", strokeWidth: 1.5, stroke: "#ffffff" }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Breakdown Table & Top Schools Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            
            {/* Weekly Summary Table */}
            <div className="lg:col-span-2 app-card-surface bg-white p-3.5 sm:p-4 border-slate-200/90 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>รายละเอียดการรายงานจำแนกตามสัปดาห์</span>
                  </h4>
                  {selectedWeekIndex !== null && (
                    <button
                      onClick={() => setSelectedWeekIndex(null)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline"
                    >
                      (กลับสู่สัปดาห์ล่าสุด)
                    </button>
                  )}
                </div>
                <span className="text-[10.5px] text-slate-400">
                  รวม {toTh(weeklyData.weeks.length)} รอบสัปดาห์
                </span>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-[10.5px] sm:text-xs text-left border-collapse table-fixed min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/80">
                      <th className="py-2 px-1.5 sm:px-3 font-bold w-[35%]">รอบสัปดาห์</th>
                      <th className="py-2 px-1 font-bold text-center whitespace-nowrap w-[13%]">รายงาน</th>
                      <th className="py-2 px-1 font-bold text-center whitespace-nowrap w-[13%]">รร. ที่ส่ง</th>
                      <th className="py-2 px-1 font-bold text-right whitespace-nowrap w-[14%]">ผู้เข้าร่วมรวม</th>
                      <th className="py-2 px-1 font-bold text-right whitespace-nowrap w-[13%]">เฉลี่ย/กิจกรรม</th>
                      <th className="py-2 px-1 font-bold text-center whitespace-nowrap w-[12%]">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {weeklyData.weeks.map((w) => {
                      const isSelected = weeklyData.activeWeek?.weekIndex === w.weekIndex;
                      return (
                        <tr
                          key={w.weekIndex}
                          onClick={() => setSelectedWeekIndex(w.weekIndex)}
                          className={`cursor-pointer transition ${
                            isSelected ? "bg-indigo-50/70 font-semibold" : "hover:bg-slate-50/60"
                          }`}
                        >
                          <td className="py-2 px-3 font-medium text-slate-900 flex items-center gap-1.5 flex-wrap min-w-[180px]">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              isSelected ? "bg-indigo-600 ring-2 ring-indigo-200" : w.reportsCount > 0 ? "bg-emerald-500" : "bg-slate-300"
                            }`} />
                            <span className={isSelected ? "text-indigo-950 font-bold" : ""}>{w.weekLabel}</span>
                            {w.isCurrentWeek && (
                              <span className="px-1.5 py-0.2 text-[9.5px] font-black bg-indigo-600 text-white rounded-md shadow-2xs">
                                สัปดาห์ปัจจุบัน
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap w-20">
                            <span className="inline-flex items-baseline justify-center gap-1 font-bold text-indigo-900">
                              <span className="tabular-nums">{toTh(w.reportsCount)}</span>
                              <span className="text-[11px] font-medium text-slate-500">ฉบับ</span>
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap w-20">
                            <span className="inline-flex items-baseline justify-center gap-1 font-medium text-slate-700">
                              <span className="tabular-nums font-bold text-slate-900">{toTh(w.schools.size)}</span>
                              <span className="text-[11px] font-medium text-slate-500">แห่ง</span>
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-slate-800 whitespace-nowrap w-24">
                            <span className="inline-flex items-baseline justify-end gap-1">
                              <span className="tabular-nums">{toTh(formatThNum(w.participantsCount))}</span>
                              <span className="text-[11px] font-medium text-slate-500">คน</span>
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right text-slate-600 whitespace-nowrap w-24">
                            {w.reportsCount > 0 ? (
                              <span className="inline-flex items-baseline justify-end gap-1">
                                <span className="tabular-nums font-medium text-slate-700">{toTh(formatThNum(w.avgParticipants))}</span>
                                <span className="text-[11px] font-medium text-slate-500">คน</span>
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="py-2 px-2 text-center w-20 whitespace-nowrap">
                            {w.reportsCount > 0 ? (
                              <span className="px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                มีรายงาน
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-full text-[9.5px] font-medium bg-slate-100 text-slate-400">
                                ไม่มีข้อมูล
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Active Schools this Week Card */}
            <div className="app-card-surface bg-white p-3.5 sm:p-4 border-slate-200/90 shadow-2xs space-y-2.5">
              <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>โรงเรียนส่งรายงานสูงสุด</span>
                  </h4>
                  <p className="text-[10px] sm:text-[10.5px] text-slate-500 mt-0.5">
                    ประจำ{weeklyData.activeWeek?.shortLabel || "สัปดาห์ล่าสุด"}
                  </p>
                </div>
                {weeklyData.activeWeek && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-bold">
                    {weeklyData.activeWeek.shortLabel}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {weeklyData.topSchoolsActiveWeek.length > 0 ? (
                  weeklyData.topSchoolsActiveWeek.map(([schoolName, count], idx) => (
                    <div
                      key={schoolName}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2 hover:bg-white transition shadow-2xs"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                          idx === 0 ? "bg-amber-100 text-amber-800 border border-amber-300" :
                          idx === 1 ? "bg-slate-200 text-slate-800" :
                          idx === 2 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {toTh(idx + 1)}
                        </span>
                        <span className="text-[11px] sm:text-xs text-slate-800 font-semibold truncate block">
                          {schoolName}
                        </span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 font-black text-[11px] shrink-0">
                        {toTh(count)} ฉบับ
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-5 text-slate-400 text-[11px]">
                    ไม่มีข้อมูลกิจกรรมในสัปดาห์นี้
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Detailed Weekly Executive Narrative & Actionable Briefing */}
          <div className="app-card-surface bg-white p-3.5 sm:p-5 border-slate-200/90 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0 shadow-2xs">
                    <FileText className="w-3 h-3" />
                  </div>
                  <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 flex items-center gap-1">
                    <span>บทสรุปวิเคราะห์ผลการดำเนินงานรายสัปดาห์ (Weekly Executive Briefing)</span>
                  </h4>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500">
                  สังเคราะห์พลวัต สถิติการมีส่วนร่วม และข้อเสนอแนะเชิงปฏิบัติการ ประจำ{weeklyData.activeWeek?.weekLabel || "สัปดาห์ล่าสุด"}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] sm:text-[10.5px] font-bold">
                  {weeklyData.activeWeek?.shortLabel || "สัปดาห์ล่าสุด"}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyNarrative(weeklyNarrative.fullSummaryText, "weekly")}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer active:scale-95"
                  title="คัดลอกข้อความสรุปรายสัปดาห์"
                >
                  {copiedTab === "weekly" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>คัดลอกสรุปสัปดาห์</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Narrative 4 Structured Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              
              {/* Block 1: Overview */}
              <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-950 font-bold text-[11px] sm:text-xs">
                  <Clock className="w-3 h-3 text-indigo-600 shrink-0" />
                  <span>{toTh(1)}. สรุปภาพรวมสถานการณ์รอบสัปดาห์ล่าสุด</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-[10.5px] sm:text-[11px] font-normal">
                  {weeklyNarrative.overview}
                </p>
              </div>

              {/* Block 2: Momentum */}
              <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px] sm:text-xs">
                  <TrendingUp className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>{toTh(2)}. พลวัตและแนวโน้มเทียบสัปดาห์ก่อนหน้า (WoW Momentum)</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-[10.5px] sm:text-[11px] font-normal">
                  {weeklyNarrative.momentum}
                </p>
              </div>

              {/* Block 3: Top Schools Spotlight */}
              <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px] sm:text-xs">
                  <Award className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>{toTh(3)}. สถานศึกษาที่มีบทบาทนำและผลงานเด่น</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-[10.5px] sm:text-[11px] font-normal">
                  {weeklyNarrative.topSchools}
                </p>
              </div>

              {/* Block 4: Actionable Directives */}
              <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px] sm:text-xs">
                  <Lightbulb className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>{toTh(4)}. ข้อเสนอแนะเชิงปฏิบัติการสำหรับสัปดาห์ถัดไป</span>
                </div>
                <ul className="space-y-0.5 text-slate-700 text-[10.5px] sm:text-[11px] leading-relaxed">
                  {weeklyNarrative.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 2: MONTHLY ANALYSIS (การวิเคราะห์รายเดือน) */}
      {/* =================================================================== */}
      {subTab === "monthly" && (
        <div className="space-y-5 animate-in fade-in duration-300">
          
          {/* Monthly Area Chart */}
          <div className="app-card-surface bg-white p-4 sm:p-6 border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="typo-app-chart-title text-slate-900 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-emerald-600" />
                  <span>การกระจายตัวของรายงานรายเดือน (Monthly Submission Volume)</span>
                </h3>
                <p className="typo-app-subtext text-slate-500">
                  สถิติรายงานและยอดผู้เข้าร่วมสะสมจำแนกตามเดือนตลอดปีการศึกษา {toTh(2569)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  เฉลี่ย {toTh(Math.round(totalReportsCount / 12))} ฉบับ/เดือน
                </span>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData.chartSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px"
                    }}
                    formatter={(value: any, name: any) => [
                      `${toTh(formatThNum(Number(value)))} ${name === "reports" ? "ฉบับ" : "คน"}`,
                      name === "reports" ? "จำนวนรายงาน" : "ผู้เข้าร่วม"
                    ]}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(val) => (
                      <span className="text-xs font-semibold text-slate-700">
                        {val === "reports" ? "รายงานรายเดือน (ฉบับ)" : "ยอดผู้เข้าร่วม (คน)"}
                      </span>
                    )}
                  />
                  <Area type="monotone" dataKey="reports" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorReports)" />
                  <Line type="monotone" dataKey="participants" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Division Cross-tabulation Matrix (ตารางไขว้ 4 กองกำกับการ x แต่ละเดือน) */}
          <div className="app-card-surface bg-white p-4 sm:p-5 border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h4 className="typo-app-h3 text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>ตารางเปรียบเทียบการส่งรายงาน {toTh(4)} กองกำกับการ รายเดือน (Cross-Tabulation Matrix)</span>
                </h4>
                <p className="typo-app-subtext text-slate-500">
                  กก.ตชด. {toTh(21)} (สุรินทร์-บุรีรัมย์), กก.ตชด. {toTh(22)} (อุบลฯ), กก.ตชด. {toTh(23)} (สกลนคร), กก.ตชด. {toTh(24)} (อุดรธานี)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse table-auto">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-700 bg-slate-100/70">
                    <th className="py-2.5 px-3 font-bold min-w-[140px] w-auto">เดือน</th>
                    <th className="py-2.5 px-2 font-bold text-center w-20 whitespace-nowrap">กก.ตชด. {toTh(21)}</th>
                    <th className="py-2.5 px-2 font-bold text-center w-20 whitespace-nowrap">กก.ตชด. {toTh(22)}</th>
                    <th className="py-2.5 px-2 font-bold text-center w-20 whitespace-nowrap">กก.ตชด. {toTh(23)}</th>
                    <th className="py-2.5 px-2 font-bold text-center w-20 whitespace-nowrap">กก.ตชด. {toTh(24)}</th>
                    <th className="py-2.5 px-2 font-bold text-center bg-indigo-50/60 text-indigo-950 w-24 whitespace-nowrap">รวมทั้งสิ้น</th>
                    <th className="py-2.5 px-3 font-bold text-right w-28 whitespace-nowrap">ผู้เข้าร่วม (คน)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyData.months.map((m) => {
                    const rowTotal = m.div21 + m.div22 + m.div23 + m.div24;
                    return (
                      <tr key={m.key} className={`transition ${m.isCurrentMonth ? "bg-indigo-50/50 font-semibold" : "hover:bg-slate-50/70"}`}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-1.5 min-w-[140px]">
                          <span>{m.displayLabel}</span>
                          {m.isCurrentMonth && (
                            <span className="px-1.5 py-0.5 text-[9.5px] font-black bg-indigo-600 text-white rounded-md shadow-2xs">
                              ปัจจุบัน
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center font-medium text-slate-700 w-20 whitespace-nowrap">
                          {toTh(m.div21)}
                        </td>
                        <td className="py-2.5 px-2 text-center font-medium text-slate-700 w-20 whitespace-nowrap">
                          {toTh(m.div22)}
                        </td>
                        <td className="py-2.5 px-2 text-center font-medium text-slate-700 w-20 whitespace-nowrap">
                          {toTh(m.div23)}
                        </td>
                        <td className="py-2.5 px-2 text-center font-medium text-slate-700 w-20 whitespace-nowrap">
                          {toTh(m.div24)}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold bg-indigo-50/40 text-indigo-900 w-24 whitespace-nowrap">
                          {toTh(rowTotal)} ฉบับ
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-800 w-28 whitespace-nowrap">
                          {toTh(formatThNum(m.participantsCount))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 font-black bg-slate-100/90 text-slate-900 text-xs">
                    <td className="py-3 px-3">รวมตลอดปีการศึกษา</td>
                    <td className="py-3 px-3 text-center text-blue-900">
                      {toTh(monthlyData.months.reduce((s, m) => s + m.div21, 0))}
                    </td>
                    <td className="py-3 px-3 text-center text-emerald-900">
                      {toTh(monthlyData.months.reduce((s, m) => s + m.div22, 0))}
                    </td>
                    <td className="py-3 px-3 text-center text-amber-900">
                      {toTh(monthlyData.months.reduce((s, m) => s + m.div23, 0))}
                    </td>
                    <td className="py-3 px-3 text-center text-purple-900">
                      {toTh(monthlyData.months.reduce((s, m) => s + m.div24, 0))}
                    </td>
                    <td className="py-3 px-3 text-center bg-indigo-100 text-indigo-950 font-black">
                      {toTh(totalReportsCount)} ฉบับ
                    </td>
                    <td className="py-3 px-3 text-right text-slate-900">
                      {toTh(formatThNum(totalParticipantsCount))} คน
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Detailed Monthly Executive Narrative & Cross-Division Synthesis */}
          <div className="app-card-surface bg-white p-3.5 sm:p-5 border-slate-200/90 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 shadow-2xs">
                    <FileText className="w-3 h-3" />
                  </div>
                  <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 flex items-center gap-1">
                    <span>บทสรุปวิเคราะห์แนวโน้มรายเดือนและการกระจายตัวเชิงพื้นที่ (Monthly Executive Synthesis)</span>
                  </h4>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500">
                  สังเคราะห์สถิติรายเดือน การกระจายตัวข้าม {toTh(4)} กองกำกับการ และข้อเสนอแนะเชิงบริหาร ประจำปีการศึกษา {toTh(2569)}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] sm:text-[10.5px] font-bold">
                  เฉลี่ย {toTh(Math.round(totalReportsCount / Math.max(monthlyData.activeMonths.length, 1)))} ฉบับ/เดือน
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyNarrative(monthlyNarrative.fullSummaryText, "monthly")}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer active:scale-95"
                  title="คัดลอกข้อความสรุปรายเดือน"
                >
                  {copiedTab === "monthly" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>คัดลอกสรุปรายเดือน</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Narrative 4 Structured Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              
              {/* Block 1: Monthly Cycle & Peak */}
              <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-[11px] sm:text-xs">
                  <CalendarDays className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>{toTh(1)}. วงจรการจัดกิจกรรมและช่วงเวลาดำเนินงานสูงสุด (Activity Cycle)</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-[10.5px] sm:text-[11px] font-normal">
                  {monthlyNarrative.overview}
                </p>
              </div>

              {/* Block 2: Cross-Division Balance */}
              <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px] sm:text-xs">
                  <Building2 className="w-3 h-3 text-indigo-600 shrink-0" />
                  <span>{toTh(2)}. การเปรียบเทียบและความสมดุล {toTh(4)} กองกำกับการ (Cross-Division Breakdown)</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-[10.5px] sm:text-[11px] font-normal">
                  {monthlyNarrative.divisionComparison}
                </p>
              </div>

              {/* Block 3: Monthly Throughput Metric */}
              <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px] sm:text-xs">
                  <Users className="w-3 h-3 text-blue-600 shrink-0" />
                  <span>{toTh(3)}. ผลผลิตเฉลี่ยและการมีส่วนร่วมของชุมชน</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-[10.5px] sm:text-[11px] font-normal">
                  การรายงานในแต่ละเดือนมียอดผู้เข้าร่วมเฉลี่ย {toTh(formatThNum(Math.round(totalParticipantsCount / Math.max(monthlyData.activeMonths.length, 1))))} คนต่อเดือน ซึ่งสะท้อนถึงการจัดกิจกรรมที่มีการมีส่วนร่วมของนักเรียนร่วมกับคณะครูและชุมชนโดยรอบอย่างสม่ำเสมอ กิจกรรมส่วนใหญ่สามารถดำเนินไปได้อย่างต่อเนื่องตามเป้าหมายของแผนพัฒนาฯ
                </p>
              </div>

              {/* Block 4: Monthly Planning Guidelines */}
              <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px] sm:text-xs">
                  <Compass className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>{toTh(4)}. ข้อเสนอแนะเชิงบริหารและการเตรียมการรายเดือน</span>
                </div>
                <ul className="space-y-0.5 text-slate-700 text-[10.5px] sm:text-[11px] leading-relaxed">
                  {monthlyNarrative.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 3: CUMULATIVE TOTAL ANALYSIS (รายงานสะสมทั้งหมด) */}
      {/* =================================================================== */}
      {subTab === "cumulative" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          
          {/* Cumulative Growth Chart */}
          <div className="app-card-surface bg-white p-3.5 sm:p-4 border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                  <span>เส้นโค้งการเติบโตสะสมตลอดปี (Cumulative Progression Curve)</span>
                </h3>
                <p className="text-[10.5px] sm:text-[11px] text-slate-500">
                  กราฟแสดงการเพิ่มขึ้นสะสมของรายงานและยอดผู้เข้าร่วมกิจกรรมทั้ง {toTh(53)} โรงเรียน
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportCumulativeCsv}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-2xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ส่งออกรายงานสะสม (CSV / Excel)</span>
              </button>
            </div>

            <div className="h-60 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeData.progressionSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="dateLabel" stroke="#64748b" fontSize={10.5} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10.5} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      fontSize: "11px"
                    }}
                    formatter={(value: any, name: any) => [
                      `${toTh(formatThNum(Number(value)))} ${name === "cumulativeReports" ? "ฉบับ" : "คน"}`,
                      name === "cumulativeReports" ? "รายงานสะสม" : "ผู้เข้าร่วมสะสม"
                    ]}
                  />
                  <Legend
                    verticalAlign="top"
                    height={30}
                    formatter={(val) => (
                      <span className="text-[11px] font-semibold text-slate-700">
                        {val === "cumulativeReports" ? "รายงานสะสม (ฉบับ)" : "ผู้เข้าร่วมสะสม (คน)"}
                      </span>
                    )}
                  />
                  <Line type="monotone" dataKey="cumulativeReports" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3.5, fill: "#4f46e5" }} />
                  <Line type="monotone" dataKey="cumulativeParticipants" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 8 Goals Cumulative Progress Grid */}
          <div className="app-card-surface bg-white p-3.5 sm:p-4 border-slate-200/90 shadow-2xs space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>ผลการดำเนินงานสะสม {toTh(8)} ด้านการพัฒนา กพด. ฉบับที่ {toTh(5)}</span>
              </h4>
              <p className="text-[10px] sm:text-[10.5px] text-slate-500">
                สัดส่วนรายงานสะสม จำนวนโรงเรียนที่ครอบคลุม และยอดผู้เข้าร่วมจำแนกตามเป้าหมายหลัก
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {cumulativeData.goalMetrics.map((goal) => (
                <div
                  key={goal.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition space-y-1.5 text-left"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="px-1.5 py-0.2 rounded text-[10px] font-black text-white"
                      style={{ backgroundColor: goal.color }}
                    >
                      ด้านที่ {toTh(goal.id)}
                    </span>
                    <span className="text-[10.5px] font-extrabold text-slate-600">
                      {toTh(goal.sharePercentage)}%
                    </span>
                  </div>

                  <p className="text-[11px] font-bold text-slate-800 line-clamp-2 h-7 leading-snug">
                    {goal.title}
                  </p>

                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${goal.sharePercentage}%`, backgroundColor: goal.color }}
                    />
                  </div>

                  <div className="flex justify-between text-[10.5px] text-slate-600 pt-0.5 font-medium">
                    <span>สะสม {toTh(goal.reportsCount)} ฉบับ</span>
                    <span>{toTh(goal.distinctSchools)}/{toTh(targetSchoolsInScope.length)} รร.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 53-School Master Cumulative Ledger Table */}
          <div className="app-card-surface bg-white p-3.5 sm:p-4 border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>สมุดทะเบียนรายงานสะสมรายโรงเรียน (Comprehensive 53-School Ledger)</span>
                </h4>
                <p className="text-[10px] sm:text-[10.5px] text-slate-500">
                  ตรวจสอบความก้าวหน้าสะสม จำนวนด้านที่จัดกิจกรรม และสถานะการดำเนินงานรายโรงเรียน
                </p>
              </div>

              {/* Table Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาชื่อโรงเรียน/จังหวัด..."
                    className="pl-7 pr-2.5 py-1 rounded-lg border border-slate-200 text-[11px] bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44 shadow-2xs"
                  />
                </div>

                <select
                  value={selectedGoalFilter}
                  onChange={(e) => setSelectedGoalFilter(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] bg-slate-50 focus:bg-white font-medium text-slate-700 shadow-2xs"
                >
                  <option value="ALL">ทุกด้าน ({toTh(1)} - {toTh(8)})</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                    <option key={g} value={String(g)}>มีด้านที่ {toTh(g)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* School Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-[10.5px] sm:text-xs text-left border-collapse table-fixed min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 bg-slate-50/80">
                    <th className="py-2 px-1 font-bold text-center w-[5%] whitespace-nowrap">ที่</th>
                    <th className="py-2 px-2 font-bold w-[33%]">ชื่อสถานศึกษา</th>
                    <th className="py-2 px-1 font-bold text-center w-[14%] whitespace-nowrap">กองกำกับการ</th>
                    <th className="py-2 px-1 font-bold text-center w-[11%] whitespace-nowrap">รายงานสะสม</th>
                    <th className="py-2 px-1 font-bold text-right w-[12%] whitespace-nowrap">ผู้เข้าร่วมรวม</th>
                    <th className="py-2 px-1 font-bold text-center w-[15%] whitespace-nowrap">ด้านที่รายงาน ({toTh(1)}-{toTh(8)})</th>
                    <th className="py-2 px-1 font-bold text-center w-[10%] whitespace-nowrap">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchoolLedger.length > 0 ? (
                    filteredSchoolLedger.map((s) => (
                      <tr key={s.schoolName} className="hover:bg-slate-50/70 transition">
                        <td className="py-2 px-2 text-center font-bold text-slate-400 w-10 whitespace-nowrap">
                          {toTh(s.index)}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 min-w-[220px]">
                          {s.schoolName}
                          <span className="block text-[9.5px] text-slate-500 font-normal">{s.province}</span>
                        </td>
                        <td className="py-2 px-2 text-center text-slate-600 font-medium w-24 whitespace-nowrap">
                          {s.groupName.replace("กองกำกับการตำรวจตระเวนชายแดนที่ ", "กก.ตชด. ")}
                        </td>
                        <td className="py-2 px-2 text-center font-extrabold text-indigo-900 w-20 whitespace-nowrap">
                          {toTh(s.reportsCount)} ฉบับ
                        </td>
                        <td className="py-2 px-2 text-right font-medium text-slate-800 w-24 whitespace-nowrap">
                          {toTh(formatThNum(s.participantsCount))} คน
                        </td>
                        <td className="py-2 px-2 text-center w-36 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-0.5">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => {
                              const hasGoal = s.coveredGoalsArray.includes(g);
                              return (
                                <span
                                  key={g}
                                  className={`w-3.5 h-3.5 rounded-xs text-[8.5px] font-black flex items-center justify-center ${
                                    hasGoal
                                      ? "bg-indigo-600 text-white shadow-2xs"
                                      : "bg-slate-100 text-slate-300"
                                  }`}
                                  title={`ด้านที่ ${g}`}
                                >
                                  {toTh(g)}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center w-20 whitespace-nowrap">
                          <span className={`px-2 py-0.2 rounded-full text-[9.5px] font-bold border whitespace-nowrap ${s.statusColor}`}>
                            {s.statusText}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                        ไม่พบข้อมูลสถานศึกษาตามเงื่อนไขที่ระบุ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Comprehensive Cumulative All-Time Executive Synthesis & Strategic Directives */}
          <div className="app-card-surface bg-white p-3.5 sm:p-5 border-slate-200/90 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0 shadow-2xs">
                    <FileText className="w-3 h-3" />
                  </div>
                  <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 flex items-center gap-1">
                    <span>บทสรุปผลสัมฤทธิ์สะสมภาพรวมเชิงยุทธศาสตร์ {toTh(53)} โรงเรียน (Strategic Cumulative Assessment)</span>
                  </h4>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500">
                  สังเคราะห์ผลสัมฤทธิ์สะสม {toTh(8)} ด้านการพัฒนา ความครอบคลุมสถานศึกษา และข้อเสนอแนะเชิงนโยบาย กพด. ฉบับที่ {toTh(5)}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] sm:text-[10.5px] font-bold">
                  ครอบคลุม {toTh(coverageRate)}% ({toTh(activeSchoolsCount)}/{toTh(targetSchoolsInScope.length)} รร.)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyNarrative(cumulativeNarrative.fullSummaryText, "cumulative")}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer active:scale-95"
                  title="คัดลอกข้อความสรุปสะสมทั้งหมด"
                >
                  {copiedTab === "cumulative" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>คัดลอกสรุปสะสม</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Narrative 4 Structured Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              
              {/* Block 1: Executive Overview */}
              <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-950 font-bold text-[11px] sm:text-xs">
                  <CheckCircle2 className="w-3 h-3 text-indigo-600 shrink-0" />
                  <span>{toTh(1)}. สรุปผลสัมฤทธิ์และความครอบคลุมสะสมภาพรวม</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-[10.5px] sm:text-[11px] font-normal">
                  {cumulativeNarrative.overview}
                </p>
              </div>

              {/* Block 2: School Readiness Breakdown */}
              <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px] sm:text-xs">
                  <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                  <span>{toTh(2)}. สถานะความก้าวหน้าและการจำแนกกลุ่มสถานศึกษา</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-[10.5px] sm:text-[11px] font-normal">
                  {cumulativeNarrative.schoolStatusBreakdown}
                </p>
              </div>

              {/* Block 3: 8 Goals Synthesis */}
              <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px] sm:text-xs">
                  <Award className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>{toTh(3)}. ผลสัมฤทธิ์จำแนกตาม {toTh(8)} มิติการพัฒนาพระราชดำริ</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-[10.5px] sm:text-[11px] font-normal">
                  {cumulativeNarrative.goalsSynthesis}
                </p>
              </div>

              {/* Block 4: Impact Analysis */}
              <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px] sm:text-xs">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>{toTh(4)}. ผลกระทบต่อคุณภาพชีวิตนักเรียนและชุมชน (Impact Analysis)</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-[10.5px] sm:text-[11px] font-normal">
                  {cumulativeNarrative.impact}
                </p>
              </div>

            </div>

            {/* Strategic Directives Callout Bar */}
            <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
              <div className="flex items-center gap-1.5 text-indigo-950 font-bold text-[11px] sm:text-xs">
                <Lightbulb className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                <span>{toTh(5)}. ข้อเสนอแนะเชิงยุทธศาสตร์สำหรับผู้บังคับบัญชา (Strategic Command Directives)</span>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 text-slate-800 text-[10.5px] sm:text-[11px] leading-relaxed">
                {cumulativeNarrative.recommendations.map((rec, i) => (
                  <li key={i} className="p-2 rounded-lg bg-white border border-indigo-100/80 shadow-2xs space-y-1">
                    <span className="inline-block px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900 text-[9.5px] font-black">
                      ประเด็นที่ {toTh(i + 1)}
                    </span>
                    <p className="text-slate-700 leading-snug">{rec}</p>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
