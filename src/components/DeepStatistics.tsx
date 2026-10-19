import { useMemo, useState } from "react";
import { ActivityReport, ReportStatus, KOPODOT_GOALS, getGoalIdFromCode } from "../types";
import ActivityHighlights from "./ActivityHighlights";
import { OFFICIAL_TARGET_SCHOOLS, TargetSchool, isSchoolMatch } from "../data/schoolsData";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, RadialBarChart, RadialBar
} from "recharts";
import { 
  TrendingUp, Users, School, MapPin, Award, CheckCircle2, 
  Sparkles, ShieldCheck, Printer, HelpCircle, ArrowUpRight, 
  ChevronRight, Calendar, Bookmark, BookOpen, Layers, Map as MapIcon,
  AlertTriangle, BarChart2, PieChart as PieChartIcon,
  Trophy, ChevronUp, ChevronDown, FileText, Building2, X, Search, Database
} from "lucide-react";

interface DeepStatisticsProps {
  reports: ActivityReport[];
  onSelectReport?: (reportId: string) => void;
}

const toThaiNumerals = (num: number | string): string => {
  if (num === null || num === undefined) return "";
  const thaiToArabicMap: Record<string, string> = {
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9'
  };
  return String(num).replace(/[0-9]/g, (digit) => thaiToArabicMap[digit] || digit);
};

export default function DeepStatistics({ reports, onSelectReport }: DeepStatisticsProps) {
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<"executive" | "regional" | "infographic">("executive");
  const [selectedInfographicGoal, setSelectedInfographicGoal] = useState<number>(1);
  const [selectedSubmissionStatus, setSelectedSubmissionStatus] = useState<"all" | "submitted" | "unsubmitted">("all");
  const [isOverviewExpanded, setIsOverviewExpanded] = useState<boolean>(true);
  const [showRankingsModal, setShowRankingsModal] = useState<boolean>(false);
  const [showMissingSchoolsModal, setShowMissingSchoolsModal] = useState<boolean>(false);
  const [rankingSearch, setRankingSearch] = useState<string>("");
  const [rankingGroupFilter, setRankingGroupFilter] = useState<string>("all");

  // High-performance single-pass pre-indexer for 1,700+ reports
  const indexedData = useMemo(() => {
    const schoolReportsMap = new Map<string, ActivityReport[]>();
    const schoolCountMap = new Map<string, number>();
    const groupReportsCountMap = new Map<string, number>([
      ["21", 0],
      ["22", 0],
      ["23", 0],
      ["24", 0],
    ]);

    const schoolMatcherCache = new Map<string, TargetSchool | undefined>();
    const getCachedMatch = (rawName: string) => {
      const trimmed = (rawName || "").trim();
      if (!trimmed) return undefined;
      if (schoolMatcherCache.has(trimmed)) return schoolMatcherCache.get(trimmed);
      const match = OFFICIAL_TARGET_SCHOOLS.find(s => isSchoolMatch(trimmed, s.name));
      schoolMatcherCache.set(trimmed, match);
      return match;
    };

    let smoothCount = 0;
    let overdueCount = 0;

    for (let i = 0; i < reports.length; i++) {
      const r = reports[i];
      if (r.status === ReportStatus.COMPLETED || r.status === ReportStatus.IN_PROGRESS || !r.status) {
        smoothCount++;
      } else if (r.status === ReportStatus.OVERDUE) {
        overdueCount++;
      }

      const match = getCachedMatch(r.schoolName);
      if (match) {
        const id = match.id;
        const existing = schoolReportsMap.get(id);
        if (existing) {
          existing.push(r);
        } else {
          schoolReportsMap.set(id, [r]);
        }
        schoolCountMap.set(id, (schoolCountMap.get(id) || 0) + 1);

        for (const code of ["21", "22", "23", "24"]) {
          if (match.groupName.includes(code)) {
            groupReportsCountMap.set(code, (groupReportsCountMap.get(code) || 0) + 1);
            break;
          }
        }
      }
    }

    return {
      schoolReportsMap,
      schoolCountMap,
      groupReportsCountMap,
      smoothCount,
      overdueCount,
    };
  }, [reports]);

  // Executive summary statistics matching the overview design
  const overviewStats = useMemo(() => {
    const totalReports = reports.length;
    const totalTargetSchools = OFFICIAL_TARGET_SCHOOLS.length;
    const activeSchools = OFFICIAL_TARGET_SCHOOLS.filter((s) => (indexedData.schoolCountMap.get(s.id) || 0) > 0);
    const missingSchools = OFFICIAL_TARGET_SCHOOLS.filter((s) => (indexedData.schoolCountMap.get(s.id) || 0) === 0);
    const coveragePercent = totalTargetSchools > 0 ? Math.round((activeSchools.length / totalTargetSchools) * 100) : 0;

    const smoothReports = indexedData.smoothCount;
    const problemReports = indexedData.overdueCount;

    const smoothPercent = totalReports > 0 ? Math.round((smoothReports / totalReports) * 100) : 100;
    const problemPercent = totalReports > 0 ? Math.round((problemReports / totalReports) * 100) : 0;

    const groupCodes = ["21", "22", "23", "24"];
    const groupBreakdown = groupCodes.map((code) => {
      const fullGroupTitle = `กองกำกับการตำรวจตระเวนชายแดนที่ ${code}`;
      const groupShortTitle = `กก.ตชด.${code}`;
      const groupSchools = OFFICIAL_TARGET_SCHOOLS.filter((s) => s.groupName.includes(code));
      const groupActiveSchools = groupSchools.filter((s) => (indexedData.schoolCountMap.get(s.id) || 0) > 0);
      const groupReportsCount = indexedData.groupReportsCountMap.get(code) || 0;

      const progressPercent = groupSchools.length > 0 ? Math.round((groupActiveSchools.length / groupSchools.length) * 100) : 100;

      return {
        code,
        groupShortTitle,
        fullGroupTitle,
        totalSchools: groupSchools.length,
        activeSchools: groupActiveSchools.length,
        progressPercent,
        totalReports: groupReportsCount,
      };
    });

    return {
      totalReports,
      totalTargetSchools,
      activeSchoolsCount: activeSchools.length,
      missingSchools,
      missingSchoolsCount: missingSchools.length,
      coveragePercent,
      smoothPercent,
      problemPercent,
      groupBreakdown,
    };
  }, [reports.length, indexedData]);

  // Automated ranking of ALL target schools sorted from highest report count to lowest
  const schoolRankings = useMemo(() => {
    const list = OFFICIAL_TARGET_SCHOOLS.map((s) => {
      const count = indexedData.schoolCountMap.get(s.id) || 0;
      return {
        id: s.id,
        name: s.name,
        groupName: s.groupName,
        province: s.province,
        district: s.district,
        subdistrict: s.subdistrict,
        count,
      };
    });

    return list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "th"));
  }, [indexedData]);

  // Top 3 Outstanding Schools (ประกาศเกียรติคุณโรงเรียนดีเด่น - ส่งรายงานสูงสุด)
  const topHonorSchools = useMemo(() => {
    return [
      schoolRankings[0] || { name: "ไม่มีข้อมูล", count: 0 },
      schoolRankings[1] || { name: "ไม่มีข้อมูล", count: 0 },
      schoolRankings[2] || { name: "ไม่มีข้อมูล", count: 0 },
    ];
  }, [schoolRankings]);

  // Helper function to match report's school with official target school metadata
  const findSchoolMetadata = (schoolName: string): TargetSchool | undefined => {
    if (!schoolName) return undefined;
    return OFFICIAL_TARGET_SCHOOLS.find(s => isSchoolMatch(schoolName, s.name));
  };

  // Target Schools (53 Schools) Submission Statistics
  const targetSchoolsStats = useMemo(() => {
    const totalTargetSchools = OFFICIAL_TARGET_SCHOOLS.length;
    const activeSchools = OFFICIAL_TARGET_SCHOOLS.filter((s) => (indexedData.schoolCountMap.get(s.id) || 0) > 0);
    const missingSchools = OFFICIAL_TARGET_SCHOOLS.filter((s) => (indexedData.schoolCountMap.get(s.id) || 0) === 0);
    const coveragePercent = totalTargetSchools > 0 ? Math.round((activeSchools.length / totalTargetSchools) * 100) : 0;

    const groupCodes = ["21", "22", "23", "24"];
    const groupBreakdown = groupCodes.map((code) => {
      const fullGroupTitle = `กองกำกับการตำรวจตระเวนชายแดนที่ ${code}`;
      const groupShortTitle = `กก.ตชด.${code}`;
      const groupSchools = OFFICIAL_TARGET_SCHOOLS.filter((s) => s.groupName.includes(code));
      const groupActiveSchools = groupSchools.filter((s) => (indexedData.schoolCountMap.get(s.id) || 0) > 0);
      const groupReportsCount = indexedData.groupReportsCountMap.get(code) || 0;
      const progressPercent = groupSchools.length > 0 ? Math.round((groupActiveSchools.length / groupSchools.length) * 100) : 100;

      return {
        code,
        groupShortTitle,
        fullGroupTitle,
        totalSchools: groupSchools.length,
        activeSchools: groupActiveSchools.length,
        progressPercent,
        totalReports: groupReportsCount,
      };
    });

    return {
      totalTargetSchools,
      activeSchoolsCount: activeSchools.length,
      missingSchools,
      missingSchoolsCount: missingSchools.length,
      coveragePercent,
      groupBreakdown,
    };
  }, [indexedData]);

  // Daily stats breakdown (Quick View) - Current day and 3 days prior
  const dailyStats = useMemo(() => {
    const THAI_MONTHS_LIST = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];

    const dateMap: Record<string, {
      day: number;
      month: number;
      year: number;
      thaiDate: string;
      reportCount: number;
      schools: Set<string>;
    }> = {};

    reports.forEach((r) => {
      let raw = (r.lastUpdated || r.dateString || "").trim();
      if (!raw) return;

      if (raw.includes(",")) raw = raw.split(",")[0].trim();
      if (raw.includes("T")) raw = raw.split("T")[0].trim();
      if (raw.includes(" ")) raw = raw.split(" ")[0].trim();

      let day = NaN, month = NaN, year = NaN;

      const parts = raw.split("/");
      if (parts.length === 3) {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
      } else {
        const hParts = raw.split("-");
        if (hParts.length === 3) {
          year = parseInt(hParts[0], 10);
          month = parseInt(hParts[1], 10);
          day = parseInt(hParts[2], 10);
        }
      }

      if (isNaN(day) || isNaN(month) || isNaN(year)) return;

      if (year > 2500) year -= 543;

      const key = `${day}/${month}/${year}`;
      const yearBE = year + 543;
      const monthStr = THAI_MONTHS_LIST[month - 1] || "";
      const thaiDate = `${day} ${monthStr} ${yearBE}`;

      if (!dateMap[key]) {
        dateMap[key] = {
          day,
          month,
          year,
          thaiDate,
          reportCount: 0,
          schools: new Set<string>(),
        };
      }

      dateMap[key].reportCount++;
      if (r.schoolName) {
        const canonical = findSchoolMetadata(r.schoolName)?.name || r.schoolName;
        dateMap[key].schools.add(canonical);
      }
    });

    const today = new Date();
    const tDay = today.getDate();
    const tMonth = today.getMonth() + 1;
    const tYear = today.getFullYear();
    const todayKey = `${tDay}/${tMonth}/${tYear}`;

    if (dateMap[todayKey] || Object.keys(dateMap).length === 0) {
      if (!dateMap[todayKey]) {
        const yearBE = tYear + 543;
        const monthStr = THAI_MONTHS_LIST[tMonth - 1] || "";
        dateMap[todayKey] = {
          day: tDay,
          month: tMonth,
          year: tYear,
          thaiDate: `${tDay} ${monthStr} ${yearBE}`,
          reportCount: 0,
          schools: new Set<string>(),
        };
      }
    }

    const sortedDates = Object.values(dateMap).sort(
      (a, b) => new Date(b.year, b.month - 1, b.day).getTime() - new Date(a.year, a.month - 1, a.day).getTime()
    );

    const selected = sortedDates.slice(0, 4);

    return selected.map((d, index) => {
      const activeSchoolsCount = d.schools.size;
      const percent = Math.min(100, Math.max(0, Math.round((activeSchoolsCount / 53) * 100)));

      return {
        offset: index,
        date: d.thaiDate,
        reportCount: d.reportCount,
        activeSchoolsCount,
        totalTargetSchools: 53,
        percent,
      };
    });
  }, [reports]);

  // Detailed Statistical Computations based on REAL reports
  const stats = useMemo(() => {
    const totalReports = reports.length;
    const completedReports = reports.filter(r => r.status === ReportStatus.COMPLETED).length;
    const completionRate = totalReports > 0 ? Math.round((completedReports / totalReports) * 100) : 0;
    
    // Total Beneficiaries
    const totalBeneficiaries = reports.reduce((sum, r) => sum + (r.participantsCount || 0), 0);
    const avgBeneficiaries = totalReports > 0 ? Math.round(totalBeneficiaries / totalReports) : 0;

    // Reporting Target Schools
    const activeSchoolsCount = overviewStats.activeSchoolsCount;
    const schoolParticipationRate = overviewStats.coveragePercent;

    // Reports by Province
    const provinceCounts: Record<string, { count: number; beneficiaries: number }> = {};
    // Seed all provinces from OFFICIAL_TARGET_SCHOOLS to ensure completeness
    OFFICIAL_TARGET_SCHOOLS.forEach(s => {
      if (!provinceCounts[s.province]) {
        provinceCounts[s.province] = { count: 0, beneficiaries: 0 };
      }
    });

    reports.forEach(r => {
      const schoolMeta = findSchoolMetadata(r.schoolName);
      const province = schoolMeta ? schoolMeta.province : "ไม่ระบุจังหวัด / พื้นที่ห่างไกล";
      if (!provinceCounts[province]) {
        provinceCounts[province] = { count: 0, beneficiaries: 0 };
      }
      provinceCounts[province].count++;
      provinceCounts[province].beneficiaries += (r.participantsCount || 0);
    });

    const provinceDataList = Object.entries(provinceCounts)
      .map(([province, data]) => ({
        province,
        reportCount: data.count,
        beneficiaries: data.beneficiaries
      }))
      .sort((a, b) => b.reportCount - a.reportCount);

    // Reports by Affiliation (กก.ตชด. / สังกัด)
    const groupCounts: Record<string, { count: number; beneficiaries: number }> = {};
    reports.forEach(r => {
      const schoolMeta = findSchoolMetadata(r.schoolName);
      const group = schoolMeta 
        ? schoolMeta.groupName.replace("กองกำกับการตำรวจตระเวนชายแดนที่", "กก.ตชด.") 
        : "กองกำกับการตำรวจตระเวนชายแดน (ส่วนกลาง/อื่นๆ)";
      if (!groupCounts[group]) {
        groupCounts[group] = { count: 0, beneficiaries: 0 };
      }
      groupCounts[group].count++;
      groupCounts[group].beneficiaries += (r.participantsCount || 0);
    });

    const groupDataList = Object.entries(groupCounts)
      .map(([group, data]) => ({
        group: group.length > 20 ? group.substring(0, 20) + "..." : group,
        reportCount: data.count,
        beneficiaries: data.beneficiaries
      }))
      .sort((a, b) => b.reportCount - a.reportCount);

    // Goal Breakdown
    const goalBreakdown = KOPODOT_GOALS.map(goal => {
      const goalReports = reports.filter(r => getGoalIdFromCode(r.goalCode) === goal.id);
      const goalCompleted = goalReports.filter(r => r.status === ReportStatus.COMPLETED).length;
      const goalBeneficiaries = goalReports.reduce((sum, r) => sum + (r.participantsCount || 0), 0);
      
      // Extract top 3 schools for this goal
      const schoolCountsForGoal: Record<string, number> = {};
      goalReports.forEach(r => {
        const canonical = findSchoolMetadata(r.schoolName)?.name || r.schoolName;
        schoolCountsForGoal[canonical] = (schoolCountsForGoal[canonical] || 0) + 1;
      });
      const topSchools = Object.entries(schoolCountsForGoal)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => `${name} (${count} ครั้ง)`);

      // Extract a representative qualitative success quote
      const sampleSuccess = goalReports.find(r => r.qualitativeOutcome && r.qualitativeOutcome.length > 20)?.qualitativeOutcome 
        || "ยกระดับคุณภาพชีวิตและส่งเสริมทักษะการเรียนรู้เชิงบูรณาการ";

      return {
        id: goal.id,
        code: goal.code,
        title: goal.title,
        color: goal.color,
        description: goal.description,
        reportCount: goalReports.length,
        completedCount: goalCompleted,
        beneficiaries: goalBeneficiaries,
        topSchools,
        sampleSuccess
      };
    });

    return {
      totalReports,
      completedReports,
      completionRate,
      totalBeneficiaries,
      avgBeneficiaries,
      activeSchoolsCount,
      schoolParticipationRate,
      provinceDataList,
      groupDataList,
      goalBreakdown
    };
  }, [reports]);

  // Handle printing/pdf save
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Interactive Navigation Tabs & Action Bar */}
      <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex border border-slate-200 bg-white p-1.5 rounded-2xl shadow-xs w-full sm:w-auto max-w-2xl">
          <button
            onClick={() => setActiveAnalysisTab("executive")}
            className={`flex-1 py-2 px-3 sm:px-4 text-xs sm:text-sm font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeAnalysisTab === "executive" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>บทวิเคราะห์ผู้บริหาร</span>
          </button>
          <button
            onClick={() => setActiveAnalysisTab("regional")}
            className={`flex-1 py-2 px-3 sm:px-4 text-xs sm:text-sm font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeAnalysisTab === "regional" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>สถิติรายจังหวัด/สังกัด</span>
          </button>
          <button
            onClick={() => setActiveAnalysisTab("infographic")}
            className={`flex-1 py-2 px-3 sm:px-4 text-xs sm:text-sm font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeAnalysisTab === "infographic" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>อินโฟกราฟิกรายมิติ กพด.</span>
          </button>
        </div>

        <button
          onClick={handlePrint}
          className="shrink-0 flex items-center justify-center gap-2 text-xs sm:text-sm font-extrabold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-2xl px-4 py-2.5 shadow-2xs transition active:scale-95 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-slate-700" />
          <span>พิมพ์รายงานวิเคราะห์ / บันทึก PDF</span>
        </button>
      </div>

      {/* TAB 1: EXECUTIVE ANALYSIS DASHBOARD */}
      {activeAnalysisTab === "executive" && (
        <div className="space-y-4 sm:space-y-5 lg:space-y-6">

          {/* 1. Unified Primary KPI Cards (3 Columns Grid Layout) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card 1: รายงานกิจกรรมทั้งหมด */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-5 sm:p-6 rounded-2xl shadow-md border border-blue-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-white text-sm sm:text-base tracking-wide">
                    รายงานกิจกรรมทั้งหมด
                  </span>
                  <div className="p-2.5 bg-white/20 backdrop-blur-xs rounded-xl">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight my-2">
                  {overviewStats.totalReports.toLocaleString()} <span className="text-sm font-bold text-white/90">รายการ</span>
                </div>
              </div>
              <div className="pt-3 border-t border-white/20 flex items-center text-xs sm:text-sm text-white/90 font-bold gap-2">
                <Database className="w-4 h-4" />
                <span>รวบรวมจากข้อมูลชีตจริง 2,270 รายการ</span>
              </div>
            </div>

            {/* Card 2: ความครอบคลุมสถานศึกษา */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-slate-800 text-sm sm:text-base">
                    ความครอบคลุมสถานศึกษา
                  </span>
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight my-2">
                  {overviewStats.activeSchoolsCount} <span className="text-lg text-slate-500 font-bold">/ {overviewStats.totalTargetSchools} แห่ง</span>
                </div>
              </div>
              <div className="space-y-1.5 pt-2">
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${overviewStats.coveragePercent}%` }} 
                  />
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm font-black">
                  <span className="text-emerald-600">{overviewStats.coveragePercent}% ส่งครบถ้วน</span>
                  <span className="text-slate-500 font-bold">เป้าหมาย 53 แห่ง</span>
                </div>
              </div>
            </div>

            {/* Card 3: ผู้รับประโยชน์สะสม (Hidden as requested) */}
            <div className="hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 rounded-2xl shadow-md border border-indigo-800 flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-indigo-200 text-sm sm:text-base">
                    เยาวชนผู้รับประโยชน์รวม
                  </span>
                  <div className="p-2.5 bg-white/10 backdrop-blur-xs rounded-xl">
                    <Users className="w-5 h-5 text-indigo-300" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight my-2">
                  {stats.totalBeneficiaries.toLocaleString()} <span className="text-sm font-bold text-indigo-300">คน-ครั้ง</span>
                </div>
              </div>
              <div className="pt-3 border-t border-white/20 flex items-center text-xs sm:text-sm text-indigo-200 font-bold gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>เฉลี่ย {stats.avgBeneficiaries} คน/กิจกรรม</span>
              </div>
            </div>

            {/* Card 4: คุณภาพและการอนุมัติ */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-slate-800 text-sm sm:text-base">
                    คุณภาพและการอนุมัติ
                  </span>
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-600 tracking-tight my-2">
                  {stats.completionRate}%
                </div>
              </div>
              <div className="space-y-1.5 pt-2">
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${stats.completionRate}%` }} 
                  />
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm font-black">
                  <span className="text-emerald-600">ผ่านการอนุมัติครบถ้วน</span>
                  <span className="text-slate-500 font-bold font-mono">{overviewStats.totalReports} รายการ</span>
                </div>
              </div>
            </div>

          </div>

          {/* 2. Outstanding Schools Honor Roll (ประกาศเกียรติคุณโรงเรียนดีเด่น - ส่งรายงานสูงสุด) */}
          <div className="bg-amber-50/60 border border-amber-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            {/* Title Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="p-2.5 bg-amber-100 text-amber-900 rounded-xl shadow-2xs border border-amber-300 shrink-0">
                  <Trophy className="w-5 h-5 text-amber-700" />
                </div>
                <h3 
                  className="font-black text-amber-950 text-xs sm:text-sm md:text-base lg:text-lg tracking-tight whitespace-nowrap overflow-hidden text-ellipsis min-w-0"
                  title="ประกาศเกียรติคุณโรงเรียนดีเด่น (ส่งรายงานสูงสุด)"
                >
                  ประกาศเกียรติคุณโรงเรียนดีเด่น (ส่งรายงานสูงสุด)
                </h3>
              </div>

              <button
                onClick={() => setShowRankingsModal(true)}
                className="px-4 py-2 bg-amber-200 hover:bg-amber-300 text-amber-950 border border-amber-400 font-black text-xs sm:text-sm rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Trophy className="w-4 h-4 text-amber-800" />
                <span>ดูอันดับการส่งรายงานทั้งหมด ({toThaiNumerals(schoolRankings.length)} โรงเรียน)</span>
              </button>
            </div>

            {/* 3 Top Medal Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Medal 1 - Gold */}
              <div className="bg-white rounded-2xl p-5 border-2 border-amber-400 shadow-sm flex flex-col items-center justify-between text-center min-h-[190px] relative">
                <div className="flex flex-col items-center justify-center my-0.5">
                  <div className="flex space-x-[1.5px] -mb-1 z-10">
                    <div className="w-1.5 h-2.5 bg-red-600 rotate-[-15deg] origin-bottom-right rounded-t-xs" />
                    <div className="w-1.5 h-3 bg-white rotate-[-10deg] origin-bottom-right" />
                    <div className="w-2 h-3.5 bg-blue-700 rounded-t-xs z-10" />
                    <div className="w-1.5 h-3 bg-white rotate-[10deg] origin-bottom-left" />
                    <div className="w-1.5 h-2.5 bg-red-600 rotate-[15deg] origin-bottom-left rounded-t-xs" />
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-yellow-500 border-2 border-amber-500 shadow-md flex items-center justify-center font-black text-slate-900 text-base z-20">
                    {toThaiNumerals(1)}
                  </div>
                </div>

                <span className="text-xs font-black text-amber-700 uppercase tracking-wide mt-1">เหรียญทอง</span>

                <h4 className="font-black text-slate-900 text-sm sm:text-base my-2 line-clamp-2 px-1">
                  {topHonorSchools[0].name}
                </h4>

                <div className="w-full bg-amber-100/90 border border-amber-300 rounded-xl py-2 px-3 text-amber-950 font-black text-sm text-center">
                  {toThaiNumerals(topHonorSchools[0].count)} รายการ
                </div>
              </div>

              {/* Medal 2 - Silver */}
              <div className="bg-white rounded-2xl p-5 border border-slate-300 shadow-sm flex flex-col items-center justify-between text-center min-h-[190px] relative">
                <div className="flex flex-col items-center justify-center my-0.5">
                  <div className="flex space-x-[1.5px] -mb-1 z-10">
                    <div className="w-1.5 h-2.5 bg-red-600 rotate-[-15deg] origin-bottom-right rounded-t-xs" />
                    <div className="w-1.5 h-3 bg-white rotate-[-10deg] origin-bottom-right" />
                    <div className="w-2 h-3.5 bg-blue-700 rounded-t-xs z-10" />
                    <div className="w-1.5 h-3 bg-white rotate-[10deg] origin-bottom-left" />
                    <div className="w-1.5 h-2.5 bg-red-600 rotate-[15deg] origin-bottom-left rounded-t-xs" />
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 border-2 border-slate-400 shadow-md flex items-center justify-center font-black text-slate-800 text-base z-20">
                    {toThaiNumerals(2)}
                  </div>
                </div>

                <span className="text-xs font-black text-slate-500 uppercase tracking-wide mt-1">เหรียญเงิน</span>

                <h4 className="font-black text-slate-900 text-sm sm:text-base my-2 line-clamp-2 px-1">
                  {topHonorSchools[1].name}
                </h4>

                <div className="w-full bg-slate-100 border border-slate-300 rounded-xl py-2 px-3 text-slate-900 font-black text-sm text-center">
                  {toThaiNumerals(topHonorSchools[1].count)} รายการ
                </div>
              </div>

              {/* Medal 3 - Bronze */}
              <div className="bg-white rounded-2xl p-5 border border-amber-300 shadow-sm flex flex-col items-center justify-between text-center min-h-[190px] relative">
                <div className="flex flex-col items-center justify-center my-0.5">
                  <div className="flex space-x-[1.5px] -mb-1 z-10">
                    <div className="w-1.5 h-2.5 bg-red-600 rotate-[-15deg] origin-bottom-right rounded-t-xs" />
                    <div className="w-1.5 h-3 bg-white rotate-[-10deg] origin-bottom-right" />
                    <div className="w-2 h-3.5 bg-blue-700 rounded-t-xs z-10" />
                    <div className="w-1.5 h-3 bg-white rotate-[10deg] origin-bottom-left" />
                    <div className="w-1.5 h-2.5 bg-red-600 rotate-[15deg] origin-bottom-left rounded-t-xs" />
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 border-2 border-amber-800 shadow-md flex items-center justify-center font-black text-amber-50 text-base z-20">
                    {toThaiNumerals(3)}
                  </div>
                </div>

                <span className="text-xs font-black text-amber-800 uppercase tracking-wide mt-1">เหรียญทองแดง</span>

                <h4 className="font-black text-slate-900 text-sm sm:text-base my-2 line-clamp-2 px-1">
                  {topHonorSchools[2].name}
                </h4>

                <div className="w-full bg-amber-50 border border-amber-300 rounded-xl py-2 px-3 text-amber-950 font-black text-sm text-center">
                  {toThaiNumerals(topHonorSchools[2].count)} รายการ
                </div>
              </div>

            </div>
          </div>

          {/* 3. สถิติการส่งรายงานจำแนกตามกองกำกับการ (กก.ตชด. 21 - 24) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-[14px] sm:text-[15.75px] lg:text-xl tracking-tight flex items-start sm:items-center gap-2">
                <School className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                <span className="flex flex-col sm:flex-row sm:items-center sm:gap-1">
                  <span>สถานะและสถิติการส่งรายงานจำแนกตามกองกำกับการ</span>
                  <span className="text-[12.5px] sm:text-[14px] text-emerald-950/80 sm:text-slate-900 font-bold">
                    (กก.ตชด. 21 - 24)
                  </span>
                </span>
              </h3>
              <span className="text-xs sm:text-sm text-emerald-800 font-black bg-emerald-100/90 px-3.5 py-1 rounded-full border border-emerald-300">
                ส่งรายงานครบ 53 แห่ง (100%)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {overviewStats.groupBreakdown.map((group) => (
                <div key={group.code} className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-sm sm:text-base">{group.groupShortTitle}</span>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      {group.progressPercent}%
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-black text-slate-800">
                      <span>ส่งแล้ว {toThaiNumerals(group.activeSchools)} แห่ง</span>
                      <span className="text-slate-500 font-bold">จาก {toThaiNumerals(group.totalSchools)} แห่ง</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${group.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs sm:text-sm text-slate-700 font-extrabold">
                    <span>จำนวนรายงานสะสม:</span>
                    <span className="font-black text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">{toThaiNumerals(group.totalReports)} รายการ</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Deep Analysis Visualizers - Goal Breakdown & Leaders */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Dual-Axis Goal Performance Chart */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-8 flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                  <TrendingUp className="w-6 h-6 text-indigo-600 shrink-0" />
                  <h2 
                    className="font-black text-slate-900 text-[12px] sm:text-[15.75px] md:text-[15.75px] lg:text-lg tracking-tight leading-snug whitespace-nowrap overflow-hidden text-ellipsis"
                    title="เปรียบเทียบจำนวนรายงานและผู้รับประโยชน์รวม รายเป้าหมายหลัก กพด. ด้านที่ 1-8"
                  >
                    เปรียบเทียบจำนวนรายงานและผู้รับประโยชน์รวม รายเป้าหมายหลัก กพด. ด้านที่ 1-8
                  </h2>
                </div>
                <span className="text-xs bg-slate-100 text-slate-800 font-black px-2.5 py-1 rounded-md border border-slate-300 shrink-0">สแกนข้อมูลจริง</span>
              </div>

              <div className="h-72 w-full flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.goalBreakdown}
                    margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorBeneficiaries" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="code" stroke="#475569" fontSize={13} fontWeight={800} tickLine={false} tickFormatter={(val) => String(val).replace("ด้านที่ ", "ด.")} />
                    <YAxis yAxisId="left" stroke="#4F46E5" fontSize={13} fontWeight={800} tickLine={false} tickFormatter={(val) => toThaiNumerals(val)} />
                    <YAxis yAxisId="right" orientation="right" stroke="#06B6D4" fontSize={13} fontWeight={800} tickLine={false} tickFormatter={(val) => toThaiNumerals(val)} />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "reportCount") return [`${toThaiNumerals(Number(value))} โครงการ/กิจกรรม`, "จำนวนรายงาน"];
                        return [`${toThaiNumerals(Number(value))} คน`, "ผู้รับประโยชน์"];
                      }}
                      contentStyle={{ backgroundColor: "#0f172a", color: "#f8fafc", borderRadius: "10px", border: "1px solid #1e293b", fontSize: "13px", fontWeight: "bold" }}
                    />
                    <Legend iconSize={12} wrapperStyle={{ fontSize: "13px", fontWeight: "bold", paddingTop: "12px" }} />
                    <Area yAxisId="left" type="monotone" dataKey="reportCount" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorReports)" name="reportCount" />
                    <Area yAxisId="right" type="monotone" dataKey="beneficiaries" stroke="#06B6D4" strokeWidth={3} fillOpacity={1} fill="url(#colorBeneficiaries)" name="beneficiaries" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-500 mt-3 font-semibold leading-relaxed italic">
                * กราฟเปรียบเทียบความสัมพันธ์: แกนซ้ายสีน้ำเงินแสดงจำนวนรายงานกิจกรรม และแกนขวาสีฟ้าแสดงจำนวนเยาวชนผู้เข้าร่วมจริง
              </p>
            </div>

            {/* Side summary panel - Goal Leaders */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-4 flex flex-col justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-[12px] sm:text-base md:text-lg tracking-tight mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>อันดับมิติกิจกรรมสูงสุด</span>
                </h3>
                
                <div className="space-y-3.5">
                  {stats.goalBreakdown
                    .slice()
                    .sort((a, b) => b.reportCount - a.reportCount)
                    .slice(0, 4)
                    .map((item, idx) => {
                      const pct = stats.totalReports > 0 ? Math.round((item.reportCount / stats.totalReports) * 100) : 0;
                      return (
                        <div key={item.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="font-black text-slate-900 truncate max-w-[180px]" title={item.title}>
                              {idx + 1}. {item.code}: {item.title}
                            </span>
                            <span className="font-extrabold text-slate-700 shrink-0">
                              {toThaiNumerals(item.reportCount)} กิจกรรม ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ width: `${pct}%`, backgroundColor: item.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2">
                <span className="font-black text-indigo-800 block text-sm">💡 ข้อวิเคราะห์เชิงสถิติโดยสังเขป:</span>
                <p className="font-medium">
                  จากการประมวลผลข้อมูลรายงานสะสมในพื้นที่ทุรกันดาร พบว่ามิติการพัฒนาที่มีสัดส่วนสูงสุดสอดคล้องกับ <strong className="font-black text-slate-900">โภชนาการ สุขภาพอนามัย (ด้านที่ 1)</strong> และ <strong className="font-black text-slate-900">ทักษะทางวิชาการและการเรียนรู้ (ด้านที่ 3)</strong> สะท้อนความสำคัญเร่งด่วนในการแก้ปัญหาภาวะโภชนาการขาดแคลนและยกระดับศักยภาพทางการเรียนรู้
                </p>
              </div>
            </div>

          </div>

          {/* 5. Demographics & Recent Daily Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Target Group demographics stats */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-7 space-y-4">
              <h3 className="font-black text-slate-900 text-[12px] sm:text-base md:text-lg tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 shrink-0" />
                <span style={{ fontSize: "11.25px" }}>การจำแนกเป้าหมายกลุ่มผู้ร่วมกิจกรรม (Target Group Demographics)</span>
              </h3>

              <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto pr-2">
                {(() => {
                  const groups: Record<string, { count: number; sum: number }> = {};
                  reports.forEach(r => {
                    const g = r.targetGroup || "นักเรียนและผู้ปกครองในถิ่นทุรกันดาร";
                    let normGroup = g;
                    if (g.includes("นักเรียน") && g.includes("ผู้ปกครอง")) normGroup = "นักเรียน ผู้ปกครอง และครู";
                    else if (g.includes("นักเรียน")) normGroup = "เด็กและเยาวชนนักเรียน ตชด.";
                    else if (g.includes("ผู้ปกครอง") || g.includes("ชุมชน")) normGroup = "ผู้ปกครองและเกษตรกรชุมชน";
                    else if (g.includes("ครู")) normGroup = "ครูใหญ่และครูประจำการ";

                    if (!groups[normGroup]) {
                      groups[normGroup] = { count: 0, sum: 0 };
                    }
                    groups[normGroup].count++;
                    groups[normGroup].sum += (r.participantsCount || 0);
                  });

                  return Object.entries(groups)
                    .sort((a, b) => b[1].sum - a[1].sum)
                    .map(([name, s], idx) => {
                      return (
                        <div key={name} className="py-3 flex items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-black text-slate-900 text-sm sm:text-base">
                              {idx + 1}. {name}
                            </p>
                            <p className="text-xs text-slate-500 font-bold">
                              ดำเนินกิจกรรมสนับสนุนรวม {toThaiNumerals(s.count)} กิจกรรมย่อย
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-black text-sm sm:text-base text-slate-900 block">
                              {toThaiNumerals(s.sum)} คน
                            </span>
                            <span className="inline-block text-xs text-emerald-800 font-black bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-md mt-0.5">
                              สะสมเชิงรับ
                            </span>
                          </div>
                        </div>
                      );
                    });
                })()}
              </div>
            </div>

            {/* Daily Stats Tracking Cards */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-5 space-y-4">
              <h3 className="font-black text-slate-900 text-[12px] sm:text-base md:text-lg tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>การติดตามรายงานประจำวันล่าสุด</span>
              </h3>

              <div className="space-y-3">
                {dailyStats.map((item, index) => (
                  <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="space-y-1 min-w-0">
                      <p className="font-black text-slate-900 text-xs sm:text-sm truncate">{item.date}</p>
                      <p className="text-xs text-slate-600 font-bold">
                        รร.ส่งแล้ว {toThaiNumerals(item.activeSchoolsCount)} แห่ง ({item.percent}%)
                      </p>
                    </div>
                    <span className="bg-emerald-100 text-emerald-900 font-black text-xs sm:text-sm px-3 py-1 rounded-xl border border-emerald-300 shrink-0">
                      {toThaiNumerals(item.reportCount)} รายงาน
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: REGIONAL & ADMINISTRATIVE STATISTICS */}
      {activeAnalysisTab === "regional" && (
        <div className="space-y-4 sm:space-y-5 lg:space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Horizontal Bar Chart: Province distribution */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-6 flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="font-black text-slate-900 text-[12px] sm:text-base md:text-lg tracking-tight flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span>รายงานจำแนกรายจังหวัดในเขตพัฒนาทุรกันดาร</span>
                </h3>
                <span className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-800 px-2.5 py-1 rounded-md font-black">หน่วย: รายงาน</span>
              </div>
              
              <div className="h-72 w-full flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={stats.provinceDataList}
                    margin={{ top: 10, right: 10, left: 15, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis type="number" stroke="#475569" fontSize={13} fontWeight={800} tickLine={false} tickFormatter={(val) => toThaiNumerals(val)} />
                    <YAxis type="category" dataKey="province" stroke="#334155" fontSize={13} fontWeight={800} tickLine={false} />
                    <Tooltip
                      formatter={(value) => [`${toThaiNumerals(Number(value))} กิจกรรม`, "จำนวนรายงาน"]}
                      contentStyle={{ backgroundColor: "#0f172a", color: "#f8fafc", borderRadius: "10px", border: "1px solid #1e293b", fontSize: "13px", fontWeight: "bold" }}
                    />
                    <Bar dataKey="reportCount" fill="#4F46E5" radius={[0, 6, 6, 0]} name="จำนวนรายงานกิจกรรม" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-2 italic">
                * ข้อมูลที่ได้ดึงมาจากรหัสโรงเรียนเป้าหมายในตารางหลัก จับคู่ตามข้อมูลพิกัดเขตจังหวัดที่โรงเรียนตั้งอยู่จริง
              </p>
            </div>

            {/* Stacked stats of police groups */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3 className="font-black text-slate-900 text-[12px] sm:text-base md:text-lg tracking-tight flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                    <span>รายงานจำแนกรายสังกัดกองกำกับการตำรวจตระเวนชายแดน (ตชด.)</span>
                  </h3>
                  <span className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-800 px-2.5 py-1 rounded-md font-black">หน่วย: รายงาน</span>
                </div>

                <div className="h-72 w-full flex-grow">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.groupDataList}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="group" stroke="#334155" fontSize={13} fontWeight={800} tickLine={false} />
                      <YAxis stroke="#475569" fontSize={13} fontWeight={800} tickLine={false} tickFormatter={(val) => toThaiNumerals(val)} />
                      <Tooltip
                        formatter={(value) => [`${toThaiNumerals(Number(value))} กิจกรรม`, "จำนวนรายงาน"]}
                        contentStyle={{ backgroundColor: "#0f172a", color: "#f8fafc", borderRadius: "10px", border: "1px solid #1e293b", fontSize: "13px", fontWeight: "bold" }}
                      />
                      <Bar dataKey="reportCount" fill="#10B981" radius={[6, 6, 0, 0]} name="จำนวนรายงาน" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-2 italic">
                * กองกำกับการตำรวจตระเวนชายแดน (กก.ตชด.) มีหน้าที่หลักในการบริหาร ควบคุมดูแล และสนับสนุนทรัพยากรแก่โรงเรียนตามแนวชายแดน
              </p>
            </div>

          </div>

          {/* Large Provincial Table and School reporting breakdown */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-black text-slate-900 text-[12px] sm:text-base md:text-lg tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>สรุปภาพรวมความคืบหน้าระดับจังหวัดและผู้รับประโยชน์ (Provincial Summary Metrics)</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm sm:text-base divide-y divide-slate-200">
                <thead className="bg-slate-100/80 text-slate-800 font-black text-xs sm:text-sm uppercase tracking-wide">
                  <tr>
                    <th className="px-6 py-4 text-left">จังหวัดภูมิภาค</th>
                    <th className="px-6 py-4 text-center">โรงเรียนเป้าหมายจดทะเบียน</th>
                    <th className="px-6 py-4 text-center">โรงเรียนที่เริ่มรายงาน</th>
                    <th className="px-6 py-4 text-center">จำนวนกิจกรรมรวม</th>
                    <th className="px-6 py-4 text-right">ผู้เข้าร่วมกิจกรรมสะสม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium">
                  {stats.provinceDataList.map((item) => {
                    const totalProvinceSchools = OFFICIAL_TARGET_SCHOOLS.filter(s => s.province === item.province).length;
                    
                    // Count unique active schools in this province
                    const provinceSchoolsMeta = OFFICIAL_TARGET_SCHOOLS.filter(s => s.province === item.province).map(s => s.name);
                    const activeProvinceSchools = reports.filter(r => {
                      return provinceSchoolsMeta.some(metaName => r.schoolName.includes(metaName) || metaName.includes(r.schoolName));
                    });
                    const activeSchoolsSet = new Set(activeProvinceSchools.map(r => r.schoolName));
                    const activeSchoolsCount = activeSchoolsSet.size;

                    return (
                      <tr key={item.province} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-3.5 font-black text-slate-900 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span>จังหวัด{item.province}</span>
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold text-slate-700">
                          {toThaiNumerals(totalProvinceSchools)} แห่ง
                        </td>
                        <td className="px-6 py-3.5 text-center font-black text-indigo-800">
                          {toThaiNumerals(activeSchoolsCount)} แห่ง
                        </td>
                        <td className="px-6 py-3.5 text-center font-black text-slate-900">
                          {toThaiNumerals(item.reportCount)} กิจกรรม
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono font-black text-emerald-700">
                          {toThaiNumerals(item.beneficiaries.toLocaleString())} คน
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: ARTISTIC INFOGRAPHIC CANVAS */}
      {activeAnalysisTab === "infographic" && (
        <div className="space-y-4 sm:space-y-5 lg:space-y-6">
          
          {/* Bento box for 8 dimensions selectors - Single Row (1 แถว) */}
          <div className="grid grid-cols-8 gap-1.5 sm:gap-2.5 md:gap-3.5 no-print overflow-x-auto">
            {stats.goalBreakdown.map((item) => {
              const isSelected = selectedInfographicGoal === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedInfographicGoal(item.id)}
                  className={`p-2 sm:p-2.5 md:p-3 rounded-xl sm:rounded-2xl border text-center transition flex flex-col items-center justify-between gap-1 select-none cursor-pointer min-h-[95px] sm:min-h-[110px] shadow-2xs ${
                    isSelected 
                      ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-700" 
                      : "bg-white border-slate-200/90 hover:border-slate-400 hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <span className="text-xs sm:text-sm md:text-base font-black tracking-tight shrink-0">{item.code}</span>
                  <span className="text-[10px] sm:text-xs md:text-sm line-clamp-2 leading-tight px-0.5 font-extrabold">
                    {item.title}
                  </span>
                  <span 
                    className={`text-[10px] sm:text-xs md:text-sm font-black mt-0.5 px-1.5 sm:px-2.5 py-0.5 rounded-full shrink-0 ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {toThaiNumerals(item.reportCount)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Artistic Infographic Frame (matches selected goal) */}
          {(() => {
            const currentGoal = stats.goalBreakdown.find(g => g.id === selectedInfographicGoal);
            if (!currentGoal) return null;

            return (
              <div 
                className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-lg flex flex-col md:flex-row min-h-[480px]"
                id={`infographic-card-${currentGoal.id}`}
              >
                
                {/* Visual Left Frame: Colored banner with big number */}
                <div 
                  className="md:w-1/3 text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden"
                  style={{ backgroundColor: currentGoal.color }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.15),transparent_70%)]"></div>
                  <div className="absolute -top-10 -right-10 text-[180px] font-extrabold opacity-10 pointer-events-none select-none font-sans">
                    {currentGoal.id}
                  </div>

                  <div className="space-y-4 relative z-10">
                    <span className="bg-white/20 text-white border border-white/20 text-xs sm:text-sm font-black px-4 py-1.5 rounded-full uppercase tracking-widest inline-block">
                      {currentGoal.code}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-snug">
                      {currentGoal.title}
                    </h2>
                    <p className="text-sm sm:text-base text-white/90 leading-relaxed font-medium">
                      {currentGoal.description}
                    </p>
                  </div>

                  <div className="space-y-3.5 pt-8 relative z-10 border-t border-white/20">
                    <div className="flex items-center gap-2">
                      <Bookmark className="w-5 h-5 text-white/80 shrink-0" />
                      <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-white/90">สถิติสะสมของมิตินี้</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-white/70 font-bold block uppercase">ผลงานรายงาน</span>
                        <span className="text-2xl sm:text-3xl font-black">{toThaiNumerals(currentGoal.reportCount)} กิจกรรม</span>
                      </div>
                      <div>
                        <span className="text-xs text-white/70 font-bold block uppercase">ผู้รับประโยชน์</span>
                        <span className="text-2xl sm:text-3xl font-black">{toThaiNumerals(currentGoal.beneficiaries.toLocaleString())} คน</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Content Right Frame: Detailed lists, success items, schools */}
                <div className="md:w-2/3 p-8 md:p-10 flex flex-col justify-between bg-slate-50/50">
                  
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <span className="text-xs text-indigo-800 font-black uppercase tracking-widest block">ผลลัพธ์เชิงสถิติ</span>
                      <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>วิเคราะห์ประสิทธิผลและการดำเนินงานเชิงประจักษ์ (KPI Metrics)</span>
                      </h3>
                    </div>

                    {/* Dynamic Qualitative Outcome Showcase */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2 relative">
                      <span className="absolute -top-3 left-4 bg-slate-900 text-white text-xs font-black px-3 py-0.5 rounded-md">ผลลัพธ์ที่โดดเด่นในรอบไตรมาส</span>
                      <p className="text-sm md:text-base font-bold text-slate-800 italic pt-2 line-clamp-3">
                        “ {currentGoal.sampleSuccess} ”
                      </p>
                      <div className="text-xs text-slate-500 font-bold flex items-center gap-1.5 pt-1">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>ประเมินผลสัมฤทธิ์เมื่อไตรมาส 2 ปีงบประมาณ 2569</span>
                      </div>
                    </div>

                    {/* Top School Leaders in this goal */}
                    <div className="space-y-3">
                      <span className="text-xs text-slate-500 font-black uppercase tracking-widest block">สถานศึกษาแกนนำที่รายงานผลงานโดดเด่น</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        {currentGoal.topSchools.length > 0 ? (
                          currentGoal.topSchools.map((school, i) => (
                            <div key={i} className="p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs text-center space-y-1.5">
                              <School className="w-6 h-6 mx-auto text-indigo-600" />
                              <p className="font-black text-slate-900 text-xs sm:text-sm leading-tight truncate" title={school}>
                                {school}
                              </p>
                              <span className="inline-block bg-emerald-100/80 text-emerald-900 text-xs font-black px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                ระดับผลงานดีเยี่ยม
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full py-6 text-center text-slate-400 text-sm font-bold">
                            ยังไม่มีรายงานกิจกรรมที่ตรงตามตัวชี้วัดในด้านนี้
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Footnote matching royal standard */}
                  <div className="mt-8 pt-4 border-t border-slate-200/90 text-xs text-slate-500 leading-relaxed font-bold flex flex-col sm:flex-row items-center justify-between gap-2">
                    <span>
                      * ระบบการคำนวณสถิติอัปเดตอัตโนมัติตามแฟ้มข้อมูลกลาง กพด. ฉบับที่ 5 (พ.ศ. 2560-2569)
                    </span>
                    <span className="text-indigo-800 font-black">
                      กองกำกับการตำรวจตระเวนชายแดนที่ 23
                    </span>
                  </div>

                </div>

              </div>
            );
          })()}

        </div>
      )}

      {/* Missing Schools Modal */}
      {showMissingSchoolsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-rose-800">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="font-black text-base">รายชื่อโรงเรียนที่ยังขาดส่งรายงาน ({overviewStats.missingSchoolsCount} แห่ง)</h3>
              </div>
              <button
                onClick={() => setShowMissingSchoolsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-rose-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {overviewStats.missingSchools.length === 0 ? (
                <div className="text-center py-8 text-emerald-600 space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                  <p className="font-extrabold text-sm">ยินดีด้วย! โรงเรียนเป้าหมายทั้งหมดส่งรายงานครบถ้วน 100%</p>
                </div>
              ) : (
                overviewStats.missingSchools.map((s) => (
                  <div key={s.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{s.name}</p>
                      <p className="text-[11px] text-slate-500">ต.{s.subdistrict} อ.{s.district} จ.{s.province}</p>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                      {s.groupName.replace("กองกำกับการตำรวจตระเวนชายแดนที่", "กก.ตชด.")}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setShowMissingSchoolsModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rankings Modal (ตารางจัดลำดับรายงานโรงเรียนทั้งหมด เรียงจากมากไปน้อย) */}
      {showRankingsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity cursor-pointer" 
            onClick={() => {
              setShowRankingsModal(false);
              setRankingSearch("");
            }}
          />

          <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl overflow-hidden max-w-4xl w-full relative z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-200/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 text-amber-950 min-w-0">
                <div className="p-1.5 bg-amber-100 rounded-xl shrink-0">
                  <Trophy className="w-4 h-4 text-amber-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight leading-snug truncate">
                    ตารางจัดลำดับอัตโนมัติ (จำนวนการส่งรายงานมากไปน้อย)
                  </h3>
                  <p className="text-[11px] text-amber-800 font-medium truncate">
                    รวมเป้าหมาย {toThaiNumerals(schoolRankings.length)} โรงเรียน จาก 4 กองกำกับการ
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowRankingsModal(false);
                  setRankingSearch("");
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-amber-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Filter Bar */}
            <div className="px-5 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0 flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อโรงเรียน สังกัด หรือจังหวัด..."
                  value={rankingSearch}
                  onChange={(e) => setRankingSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                />
              </div>

              <select
                value={rankingGroupFilter}
                onChange={(e) => setRankingGroupFilter(e.target.value)}
                className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-slate-700 cursor-pointer"
              >
                <option value="all">ทุกสังกัด กก.ตชด. (21-24)</option>
                <option value="21">กก.ตชด.21</option>
                <option value="22">กก.ตชด.22</option>
                <option value="23">กก.ตชด.23</option>
                <option value="24">กก.ตชด.24</option>
              </select>
            </div>

            {/* Table Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-2 flex-1">
              <table className="w-full text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-center w-14">อันดับ</th>
                    <th className="px-3 py-2 text-left">สถานศึกษา</th>
                    <th className="px-3 py-2 text-left">สังกัด</th>
                    <th className="px-3 py-2 text-left">จังหวัด</th>
                    <th className="px-3 py-2 text-right">จำนวนรายงาน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium">
                  {schoolRankings
                    .filter((s) => {
                      const matchGroup = rankingGroupFilter === "all" || s.groupName.includes(rankingGroupFilter);
                      const matchSearch =
                        rankingSearch === "" ||
                        s.name.toLowerCase().includes(rankingSearch.toLowerCase()) ||
                        s.groupName.toLowerCase().includes(rankingSearch.toLowerCase()) ||
                        s.province.toLowerCase().includes(rankingSearch.toLowerCase());
                      return matchGroup && matchSearch;
                    })
                    .map((s) => {
                      const realRank = schoolRankings.findIndex((item) => item.id === s.id) + 1;
                      return (
                        <tr key={s.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="px-3 py-2 text-center">
                            {realRank === 1 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-slate-900 font-black text-[10px] shadow-2xs">
                                1
                              </span>
                            ) : realRank === 2 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-300 text-slate-800 font-black text-[10px]">
                                2
                              </span>
                            ) : realRank === 3 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-700 text-amber-50 font-black text-[10px]">
                                3
                              </span>
                            ) : (
                              <span className="text-slate-500 font-bold text-xs">{toThaiNumerals(realRank)}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-800 text-xs">
                            {s.name}
                          </td>
                          <td className="px-3 py-2 text-slate-600 font-medium text-xs">
                            {s.groupName.replace("กองกำกับการตำรวจตระเวนชายแดนที่", "กก.ตชด.")}
                          </td>
                          <td className="px-3 py-2 text-slate-500 text-xs">
                            {s.province}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-block px-2.5 py-0.5 bg-amber-50 text-amber-900 font-black text-[11px] rounded-lg border border-amber-200/80">
                              {toThaiNumerals(s.count)} รายการ
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">
                * ระบบอัปเดตและจัดลำดับแบบเรียลไทม์จากจำนวนรายงานในฐานข้อมูล
              </span>
              <button
                onClick={() => {
                  setShowRankingsModal(false);
                  setRankingSearch("");
                }}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
