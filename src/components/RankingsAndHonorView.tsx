import React, { useState, useMemo } from "react";
import { 
  Trophy, 
  Users, 
  Award, 
  School, 
  BarChart2, 
  Search, 
  X, 
  ChevronRight, 
  ChevronLeft,
  Filter, 
  FileText, 
  CheckCircle2, 
  ExternalLink,
  Layers,
  Sparkles,
  ArrowUpDown,
  BookOpen,
  Calendar
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell 
} from "recharts";
import { ActivityReport } from "../types";
import { OFFICIAL_TARGET_SCHOOLS, isSchoolMatch } from "../data/schoolsData";
import { aggregateTeacherReports, extractTeachersFromReport } from "../lib/teacherUtils";
import { 
  parseReportDateDetails, 
  toThaiNumerals, 
  formatNumberWithComma, 
  formatThaiNumberWithComma 
} from "../lib/safeDateUtils";

interface RankingsAndHonorViewProps {
  reports: ActivityReport[];
  onSelectReport?: (report: ActivityReport) => void;
  onNavigateToDocument?: (id: string) => void;
  onOpenDashboard?: () => void;
  onSelectSchoolFilter?: (schoolName: string) => void;
}

export const RankingsAndHonorView: React.FC<RankingsAndHonorViewProps> = ({
  reports,
  onSelectReport,
  onNavigateToDocument,
  onOpenDashboard,
  onSelectSchoolFilter,
}) => {
  // Global View Filters
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("all");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [useThaiDigits, setUseThaiDigits] = useState<boolean>(false);

  // Teacher Section State
  const [isReportersInlineOpen, setIsReportersInlineOpen] = useState<boolean>(true);
  const [reporterSearch, setReporterSearch] = useState<string>("");
  const [reporterPage, setReporterPage] = useState<number>(1);
  const [selectedTeacherModal, setSelectedTeacherModal] = useState<string | null>(null);

  // School Section State
  const [isSchoolsInlineOpen, setIsSchoolsInlineOpen] = useState<boolean>(true);
  const [schoolViewMode, setSchoolViewMode] = useState<"list" | "chart">("list");
  const [schoolChartFilter, setSchoolChartFilter] = useState<"top10" | "top20" | "by_group">("top10");
  const [schoolSearch, setSchoolSearch] = useState<string>("");
  const [schoolPage, setSchoolPage] = useState<number>(1);
  const [selectedSchoolModal, setSelectedSchoolModal] = useState<string | null>(null);

  // 53 Schools Complete Table Modal / View
  const [showFullTableModal, setShowFullTableModal] = useState<boolean>(false);
  const [rankingTableSearch, setRankingTableSearch] = useState<string>("");
  const [rankingTableGroup, setRankingTableGroup] = useState<string>("all");
  const [rankingTableSort, setRankingTableSort] = useState<"count" | "original">("count");

  // Number helper with comma thousands separator
  const numFmt = (val: number | string): string => {
    if (val === undefined || val === null || val === "") return useThaiDigits ? "๐" : "0";
    const cleanStr = String(val).replace(/,/g, "").trim();
    const n = parseFloat(cleanStr);
    if (isNaN(n)) return String(val);
    return useThaiDigits ? formatThaiNumberWithComma(n) : formatNumberWithComma(n);
  };

  // 1. Filtered Reports based on selected criteria
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // Academic Year Filter
      if (selectedAcademicYear !== "all") {
        const dt = parseReportDateDetails(r);
        const year = dt?.academicYearBE ? String(dt.academicYearBE) : String(dt?.yearBE || "");
        if (year !== selectedAcademicYear) return false;
      }

      // Quarter Filter
      if (selectedQuarter !== "all") {
        const dt = parseReportDateDetails(r);
        if (dt?.quarter !== selectedQuarter) return false;
      }

      // Group (กก.ตชด.) Filter
      if (selectedGroup !== "all") {
        const matched = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(r.schoolName, s.name));
        if (!matched || !matched.groupName.includes(selectedGroup)) return false;
      }

      return true;
    });
  }, [reports, selectedAcademicYear, selectedQuarter, selectedGroup]);

  // 2. Aggregate Teachers (Cleaned and normalized names)
  const topReportersList = useMemo(() => {
    return aggregateTeacherReports(filteredReports);
  }, [filteredReports]);

  // 3. High-Precision School Reports Aggregation & Official Ranking Engine
  const {
    schoolRankings,
    schoolCountLookup,
    schoolReportsMap,
    topSchoolFrequencyList,
    topHonorSchools,
    totalCountedReports,
  } = useMemo(() => {
    const countMap: Record<string, number> = {};
    const reportsMap: Record<string, ActivityReport[]> = {};

    OFFICIAL_TARGET_SCHOOLS.forEach((s) => {
      countMap[s.name] = 0;
      reportsMap[s.name] = [];
    });

    let totalCounted = 0;

    // Distribute each filtered report to its authoritative official school with multi-tier matching
    filteredReports.forEach((r) => {
      const rawName = (r.schoolName || "").trim();
      if (!rawName) return;

      // Tier 1: Exact Name Match
      let matched = OFFICIAL_TARGET_SCHOOLS.find((s) => s.name === rawName);

      // Tier 2: Normalized / Cleaned String Match via isSchoolMatch
      if (!matched) {
        matched = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(rawName, s.name));
      }

      if (matched) {
        countMap[matched.name] = (countMap[matched.name] || 0) + 1;
        reportsMap[matched.name].push(r);
        totalCounted++;
      } else {
        // Fallback for custom or raw school name
        countMap[rawName] = (countMap[rawName] || 0) + 1;
        if (!reportsMap[rawName]) reportsMap[rawName] = [];
        reportsMap[rawName].push(r);
        totalCounted++;
      }
    });

    // Build base school items and calculate true score percentage of total reports
    const sortedByCount = OFFICIAL_TARGET_SCHOOLS.map((s, originalIdx) => {
      const count = countMap[s.name] || 0;
      const pct = totalCounted > 0 ? (count / totalCounted) * 100 : 0;
      return {
        ...s,
        count,
        officialSeq: originalIdx + 1,
        percentageOfTotal: pct,
        reports: reportsMap[s.name] || [],
        officialRank: 1,
        isTied: false,
      };
    }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "th"));

    // Standard Competition Ranking (1224 ranking) with tie handling
    let currentRank = 1;
    for (let i = 0; i < sortedByCount.length; i++) {
      if (i > 0 && sortedByCount[i].count < sortedByCount[i - 1].count) {
        currentRank = i + 1;
      }
      sortedByCount[i].officialRank = currentRank;
    }

    // Flag ties (schools having the same report count)
    for (let i = 0; i < sortedByCount.length; i++) {
      const hasTie = sortedByCount.some(
        (other, j) => j !== i && other.count === sortedByCount[i].count && other.count > 0
      );
      sortedByCount[i].isTied = hasTie;
    }

    // Top 3 Outstanding Schools
    const top3 = [
      sortedByCount[0] || { name: "ไม่มีข้อมูล", count: 0 },
      sortedByCount[1] || { name: "ไม่มีข้อมูล", count: 0 },
      sortedByCount[2] || { name: "ไม่มีข้อมูล", count: 0 },
    ];

    // Final sorting based on rankingTableSort ("count" | "original")
    const finalRankings = [...sortedByCount];
    if (rankingTableSort === "original") {
      finalRankings.sort((a, b) => a.officialSeq - b.officialSeq);
    }

    // Top frequency list (only schools that have count > 0)
    const activeFrequency = sortedByCount
      .filter((s) => s.count > 0)
      .map((s) => ({
        name: s.name,
        count: s.count,
        groupName: s.groupName,
        province: s.province,
        district: s.district,
      }));

    return {
      schoolRankings: finalRankings,
      schoolCountLookup: countMap,
      schoolReportsMap: reportsMap,
      topSchoolFrequencyList: activeFrequency,
      topHonorSchools: top3,
      totalCountedReports: totalCounted,
    };
  }, [filteredReports, rankingTableSort]);

  // 5. Chart Data for School Frequency Graph
  const schoolFreqChartData = useMemo(() => {
    if (schoolChartFilter === "by_group") {
      const groupMap: Record<string, { shortName: string; fullName: string; count: number }> = {
        "21": { shortName: "กก.ตชด.21", fullName: "กก.ตชด.21 (สุรินทร์/บุรีรัมย์/ศรีสะเกษ)", count: 0 },
        "22": { shortName: "กก.ตชด.22", fullName: "กก.ตชด.22 (อุบลฯ/อำนาจเจริญ/ยโสธร)", count: 0 },
        "23": { shortName: "กก.ตชด.23", fullName: "กก.ตชด.23 (สกลนคร/นครพนม/มุกดาหาร)", count: 0 },
        "24": { shortName: "กก.ตชด.24", fullName: "กก.ตชด.24 (อุดรฯ/เลย/หนองคาย/บึงกาฬ)", count: 0 },
      };
      filteredReports.forEach((r) => {
        const sch = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(r.schoolName, s.name));
        if (sch) {
          if (sch.groupName.includes("21")) groupMap["21"].count++;
          else if (sch.groupName.includes("22")) groupMap["22"].count++;
          else if (sch.groupName.includes("23")) groupMap["23"].count++;
          else if (sch.groupName.includes("24")) groupMap["24"].count++;
        }
      });
      return Object.values(groupMap);
    }
    const limit = schoolChartFilter === "top20" ? 20 : 10;
    return topSchoolFrequencyList.slice(0, limit).map((s) => {
      let shortName = s.name
        .replace("โรงเรียนตำรวจตระเวนชายแดน", "ตชด.")
        .replace("ศูนย์การเรียนรู้ตำรวจตระเวนชายแดน", "ศกร.ตชด.")
        .replace("โรงเรียน", "");
      if (shortName.length > 15) {
        shortName = shortName.substring(0, 14) + "...";
      }
      return {
        shortName,
        fullName: s.name,
        count: s.count,
      };
    });
  }, [topSchoolFrequencyList, schoolChartFilter, filteredReports]);

  // Selected teacher's reports
  const teacherSelectedReports = useMemo(() => {
    if (!selectedTeacherModal) return [];
    return reports.filter((r) => {
      const teachers = extractTeachersFromReport(r.reportedBy || "");
      return teachers.some((t) => (t.cleanNameOnly || t.displayName || "").includes(selectedTeacherModal)) ||
             (r.reportedBy && r.reportedBy.includes(selectedTeacherModal));
    });
  }, [reports, selectedTeacherModal]);

  // Selected school's reports (exact reports matching this school's score)
  const schoolSelectedReports = useMemo(() => {
    if (!selectedSchoolModal) return [];
    return schoolReportsMap[selectedSchoolModal] || [];
  }, [schoolReportsMap, selectedSchoolModal]);

  // Dynamic font sizing for podium names to ensure long school & teacher names display completely and correctly
  const getPodiumNameClass = (name: string, isGold: boolean = false) => {
    const len = (name || "").length;
    if (len > 30) {
      return isGold
        ? "font-black text-amber-950 text-[10px] sm:text-[11px] leading-tight text-center break-words line-clamp-3"
        : "font-bold text-slate-800 text-[9.5px] sm:text-[10px] leading-tight text-center break-words line-clamp-3";
    }
    if (len > 18) {
      return isGold
        ? "font-black text-amber-950 text-[11px] sm:text-xs leading-snug text-center break-words line-clamp-3"
        : "font-bold text-slate-800 text-[10.5px] sm:text-[11px] leading-snug text-center break-words line-clamp-3";
    }
    return isGold
      ? "font-black text-amber-950 text-xs sm:text-[13px] leading-snug text-center break-words line-clamp-2"
      : "font-bold text-slate-800 text-[11px] sm:text-xs leading-snug text-center break-words line-clamp-2";
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* 1. Executive Summary Metrics Counters Bar */}
      <div className="app-card-surface bg-gradient-to-r from-amber-500/10 via-amber-100/30 to-slate-50 border border-amber-200/90 shadow-2xs p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200/70 shadow-2xs">
            <p className="text-slate-500 text-[11px] font-bold">รายงานที่ประมวลผล</p>
            <p className="text-xl font-black text-amber-950 mt-0.5">
              {numFmt(filteredReports.length)} <span className="text-xs font-semibold text-slate-500">ฉบับ</span>
            </p>
          </div>
          <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200/70 shadow-2xs">
            <p className="text-slate-500 text-[11px] font-bold">โรงเรียนที่ส่งรายงาน</p>
            <p className="text-xl font-black text-amber-950 mt-0.5">
              {numFmt(topSchoolFrequencyList.length)} <span className="text-xs font-semibold text-slate-500">/ {numFmt(53)} แห่ง</span>
            </p>
          </div>
          <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200/70 shadow-2xs">
            <p className="text-slate-500 text-[11px] font-bold">ครูผู้จัดทำรายงาน</p>
            <p className="text-xl font-black text-indigo-950 mt-0.5">
              {numFmt(topReportersList.length)} <span className="text-xs font-semibold text-slate-500">ท่าน</span>
            </p>
          </div>
          <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200/70 shadow-2xs">
            <p className="text-slate-500 text-[11px] font-bold">อันดับ ๑ โรงเรียนส่งสูงสุด</p>
            <p className="text-xs font-black text-amber-900 truncate mt-1" title={topHonorSchools[0]?.name}>
              {topHonorSchools[0]?.name || "-"}
            </p>
            <span className="text-[10.5px] font-bold text-amber-700">
              ({numFmt(topHonorSchools[0]?.count || 0)} รายการ)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Global Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs flex flex-col gap-3.5">
        {/* Row 1: Filter Bar Title & Table Modal / Reset Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100">
              <Filter className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-xs sm:text-sm">ตัวกรองช่วงเวลาและสังกัด</span>
              <span className="hidden sm:inline text-[11px] text-slate-500 font-normal ml-2">
                (คัดกรองผลคะแนนและอันดับเกียรติคุณ)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setUseThaiDigits((prev) => !prev)}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              title="สลับรูปแบบตัวเลข (อารบิก / ไทย พร้อมเครื่องหมายจุลภาค)"
            >
              <span>{useThaiDigits ? "แสดงเลขไทย (๑,๒๓๔)" : "แสดงเลขอารบิก (1,234)"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFullTableModal(true)}
              className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:border-amber-400 active:scale-95"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span>ตารางจัดลำดับทั้งหมด ({numFmt(schoolRankings.length)} โรงเรียน)</span>
            </button>

            {(selectedAcademicYear !== "all" || selectedQuarter !== "all" || selectedGroup !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedAcademicYear("all");
                  setSelectedQuarter("all");
                  setSelectedGroup("all");
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Dropdown Filter Controls in 3-column desktop grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Year Filter */}
          <div className="flex flex-col gap-1.5 bg-slate-50/90 hover:bg-slate-100/70 transition-colors p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-xs font-bold shrink-0">ปีการศึกษา:</span>
            </div>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full text-xs px-2.5 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-2xs transition"
            >
              <option value="all">ทุกปีการศึกษา</option>
              <option value="2569">ปีการศึกษา ๒๕๖๙</option>
              <option value="2568">ปีการศึกษา ๒๕๖๘</option>
              <option value="2567">ปีการศึกษา ๒๕๖๗</option>
            </select>
          </div>

          {/* Quarter Filter */}
          <div className="flex flex-col gap-1.5 bg-slate-50/90 hover:bg-slate-100/70 transition-colors p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-xs font-bold shrink-0">ไตรมาส:</span>
            </div>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="w-full text-xs px-2.5 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-2xs transition"
            >
              <option value="all">ทุกไตรมาส</option>
              <option value="Q1">ไตรมาส ๑ (ต.ค.–ธ.ค.)</option>
              <option value="Q2">ไตรมาส ๒ (ม.ค.–มี.ค.)</option>
              <option value="Q3">ไตรมาส ๓ (เม.ย.–มิ.ย.)</option>
              <option value="Q4">ไตรมาส ๔ (ก.ค.–ก.ย.)</option>
            </select>
          </div>

          {/* Group Filter */}
          <div className="flex flex-col gap-1.5 bg-slate-50/90 hover:bg-slate-100/70 transition-colors p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-700">
              <School className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-xs font-bold shrink-0">สังกัดกองกำกับการ:</span>
            </div>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full text-xs px-2.5 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-2xs transition truncate"
            >
              <option value="all">ทุกกองกำกับการ (กก.ตชด. 21-24)</option>
              <option value="21">กก.ตชด.21 (สุรินทร์/บุรีรัมย์/ศรีสะเกษ)</option>
              <option value="22">กก.ตชด.22 (อุบลฯ/อำนาจเจริญ/ยโสธร)</option>
              <option value="23">กก.ตชด.23 (สกลนคร/นครพนม/มุกดาหาร)</option>
              <option value="24">กก.ตชด.24 (อุดรฯ/เลย/หนองคาย/บึงกาฬ)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Main 2-Column Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ==================== Column 1: ผู้รายงานกิจกรรมสูงสุด (ทำเนียบครู) ==================== */}
        <div className="app-card-surface space-y-5 bg-gradient-to-b from-white to-slate-50/60 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Column Header */}
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-3.5 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-indigo-100 text-indigo-800 rounded-xl border border-indigo-200 shrink-0">
                  <Users className="w-5 h-5 text-indigo-700" />
                </div>
                <div className="min-w-0">
                  <h3 className="typo-app-h3 text-slate-900 font-extrabold flex items-center gap-2">
                    <span>ผู้รายงานกิจกรรมสูงสุด (ทำเนียบครู)</span>
                  </h3>
                  <p className="typo-app-subtext">คุณครูและผู้รับผิดชอบโครงการที่ร่วมส่งรายงาน กพด.</p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-indigo-900 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 shrink-0">
                รวม {numFmt(topReportersList.length)} ท่าน
              </span>
            </div>

            {/* Top 3 Podiums */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 pt-2 items-end">
              {/* Silver - อันดับ 2 */}
              {topReportersList[1] && (
                <div
                  onClick={() => setSelectedTeacherModal(topReportersList[1].cleanName)}
                  className="bg-gradient-to-b from-slate-100 via-slate-50/80 to-white rounded-2xl p-3 border-2 border-slate-300 shadow-xs hover:border-slate-400 text-center flex flex-col justify-between col-span-1 transition-all duration-200 min-h-[140px] cursor-pointer hover:shadow-sm active:scale-[0.98]"
                  title={`คลิกเพื่อดูรายงานทั้งหมดของ ${topReportersList[1].name} (${numFmt(topReportersList[1].count)} รายการ)`}
                >
                  <div className="bg-slate-700 text-white font-black text-[11px] py-0.5 px-2 rounded-md shadow-2xs inline-flex items-center justify-center gap-1 mx-auto whitespace-nowrap">
                    <span>🥈 อันดับ ๒</span>
                  </div>
                  <div className="my-2 overflow-hidden flex-1 flex flex-col items-center justify-center min-h-[44px]">
                    <p className={getPodiumNameClass(topReportersList[1].name, false)} title={topReportersList[1].name}>
                      {topReportersList[1].name}
                    </p>
                    {topReportersList[1].schoolName && (
                      <p className="text-[10px] text-slate-500 font-medium truncate max-w-full mt-0.5 leading-tight" title={topReportersList[1].schoolName}>
                        {topReportersList[1].schoolName}
                      </p>
                    )}
                  </div>
                  <span className="bg-slate-200/90 text-slate-800 font-extrabold text-xs py-1 px-2 rounded-lg border border-slate-300/80 whitespace-nowrap">
                    {numFmt(topReportersList[1].count)} รายการ
                  </span>
                </div>
              )}

              {/* Gold - อันดับ 1 (Most Prominent Podium) */}
              {topReportersList[0] && (
                <div
                  onClick={() => setSelectedTeacherModal(topReportersList[0].cleanName)}
                  className="bg-gradient-to-b from-amber-100/95 via-amber-50/70 to-white rounded-2xl p-3.5 border-2 border-amber-500 shadow-md ring-2 ring-amber-400/30 text-center flex flex-col justify-between col-span-1 transition-all duration-200 min-h-[165px] -translate-y-1 relative z-10 cursor-pointer hover:shadow-lg active:scale-[0.98]"
                  title={`คลิกเพื่อดูรายงานทั้งหมดของ ${topReportersList[0].name} (${numFmt(topReportersList[0].count)} รายการ)`}
                >
                  <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white font-black text-xs py-1 px-2 rounded-lg shadow-xs inline-flex items-center justify-center gap-1 mx-auto whitespace-nowrap">
                    <span>🥇 อันดับ ๑</span>
                  </div>
                  <div className="my-2 overflow-hidden flex-1 flex flex-col items-center justify-center min-h-[44px]">
                    <p className={getPodiumNameClass(topReportersList[0].name, true)} title={topReportersList[0].name}>
                      {topReportersList[0].name}
                    </p>
                    {topReportersList[0].schoolName && (
                      <p className="text-[10px] text-amber-900/80 font-semibold truncate max-w-full mt-0.5 leading-tight" title={topReportersList[0].schoolName}>
                        {topReportersList[0].schoolName}
                      </p>
                    )}
                  </div>
                  <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-xs py-1 px-2 rounded-lg shadow-2xs whitespace-nowrap">
                    {numFmt(topReportersList[0].count)} รายการ
                  </span>
                </div>
              )}

              {/* Bronze - อันดับ 3 */}
              {topReportersList[2] && (
                <div
                  onClick={() => setSelectedTeacherModal(topReportersList[2].cleanName)}
                  className="bg-gradient-to-b from-orange-100/80 via-amber-50/50 to-white rounded-2xl p-3 border-2 border-amber-600/70 shadow-xs hover:border-amber-600 text-center flex flex-col justify-between col-span-1 transition-all duration-200 min-h-[135px] cursor-pointer hover:shadow-sm active:scale-[0.98]"
                  title={`คลิกเพื่อดูรายงานทั้งหมดของ ${topReportersList[2].name} (${numFmt(topReportersList[2].count)} รายการ)`}
                >
                  <div className="bg-amber-800 text-white font-black text-[11px] py-0.5 px-2 rounded-md shadow-2xs inline-flex items-center justify-center gap-1 mx-auto whitespace-nowrap">
                    <span>🥉 อันดับ ๓</span>
                  </div>
                  <div className="my-2 overflow-hidden flex-1 flex flex-col items-center justify-center min-h-[44px]">
                    <p className={getPodiumNameClass(topReportersList[2].name, false)} title={topReportersList[2].name}>
                      {topReportersList[2].name}
                    </p>
                    {topReportersList[2].schoolName && (
                      <p className="text-[10px] text-slate-500 font-medium truncate max-w-full mt-0.5 leading-tight" title={topReportersList[2].schoolName}>
                        {topReportersList[2].schoolName}
                      </p>
                    )}
                  </div>
                  <span className="bg-amber-100 text-amber-950 font-extrabold text-xs py-1 px-2 rounded-lg border border-amber-300/80 whitespace-nowrap">
                    {numFmt(topReportersList[2].count)} รายการ
                  </span>
                </div>
              )}
            </div>

            {/* Top 4-10 Podiums / Collapsible Directory List */}
            {!isReportersInlineOpen ? (
              <div className="space-y-2 pt-2">
                {topReportersList.slice(3, 8).map((item, idx) => (
                  <div
                    key={item.canonicalNameKey || item.name}
                    onClick={() => setSelectedTeacherModal(item.cleanName)}
                    className="flex items-center justify-between text-xs font-bold p-2.5 bg-white rounded-xl border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition cursor-pointer active:scale-[0.99]"
                    title={`คลิกเพื่อดูรายงานทั้งหมดของ ${item.name} (${numFmt(item.count)} รายการ)`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-900 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-200">
                        {numFmt(idx + 4)}
                      </span>
                      <div className="min-w-0">
                        <span className="text-slate-800 font-bold truncate block" title={item.name}>
                          {item.name}
                        </span>
                        {item.schoolName && (
                          <span className="text-[10.5px] text-slate-500 font-normal truncate block">
                            {item.schoolName}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 shrink-0 text-xs whitespace-nowrap">
                      {numFmt(item.count)} รายการ
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* Full Directory with Search & Pagination */
              <div className="space-y-3 pt-2 bg-white p-4 rounded-2xl border border-indigo-200/90 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>ค้นหาและตรวจสอบรายชื่อครูทั้งหมด</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsReportersInlineOpen(false)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    ย่อตาราง
                  </button>
                </div>

                {/* Inline Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={reporterSearch}
                    onChange={(e) => {
                      setReporterSearch(e.target.value);
                      setReporterPage(1);
                    }}
                    placeholder="พิมพ์ชื่อครู หรือชื่อโรงเรียนเพื่อค้นหา..."
                    className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-400 font-medium"
                  />
                  {reporterSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setReporterSearch("");
                        setReporterPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Paginated List */}
                {(() => {
                  const filtered = topReportersList.filter((r) => {
                    if (!reporterSearch.trim()) return true;
                    const q = reporterSearch.toLowerCase().trim();
                    return (
                      r.name.toLowerCase().includes(q) ||
                      (r.schoolName || "").toLowerCase().includes(q)
                    );
                  });
                  const perPage = 7;
                  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
                  const currentP = Math.min(reporterPage, totalPages);
                  const paginated = filtered.slice((currentP - 1) * perPage, currentP * perPage);

                  return (
                    <div className="space-y-2">
                      {paginated.length > 0 ? (
                        paginated.map((item, idx) => {
                          const rank = (currentP - 1) * perPage + idx + 1;
                          return (
                            <div
                              key={`inline-${item.name}-${rank}`}
                              onClick={() => setSelectedTeacherModal(item.cleanName)}
                              className="flex items-center justify-between text-xs p-2 bg-slate-50 hover:bg-indigo-50/70 rounded-xl border border-slate-200/80 transition cursor-pointer active:scale-[0.99]"
                              title={`คลิกเพื่อดูรายงานทั้งหมดของ ${item.name} (${numFmt(item.count)} รายการ)`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                                <span className={`w-5 h-5 rounded-full font-black text-[11px] flex items-center justify-center shrink-0 ${
                                  rank === 1 ? "bg-amber-500 text-white" :
                                  rank === 2 ? "bg-slate-600 text-white" :
                                  rank === 3 ? "bg-amber-700 text-white" :
                                  "bg-indigo-50 text-indigo-900 border border-indigo-200"
                                }`}>
                                  {numFmt(rank)}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-slate-800 font-bold truncate text-xs" title={item.name}>
                                    {item.name}
                                  </p>
                                  {item.schoolName && (
                                    <p className="text-[10px] text-slate-500 font-normal truncate" title={item.schoolName}>
                                      {item.schoolName}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100 shrink-0 text-xs whitespace-nowrap">
                                {numFmt(item.count)} รายการ
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-6 text-center text-slate-400 text-xs">
                          ไม่พบรายชื่อครูที่ตรงกับคำค้นหา
                        </div>
                      )}

                      {/* Pagination Controls */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold text-slate-600">
                        <span>
                          หน้า {numFmt(currentP)} / {numFmt(totalPages)} (รวม {numFmt(filtered.length)} ท่าน)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={currentP <= 1}
                            onClick={() => setReporterPage((p) => Math.max(1, p - 1))}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs"
                          >
                            ก่อนหน้า
                          </button>
                          <button
                            type="button"
                            disabled={currentP >= totalPages}
                            onClick={() => setReporterPage((p) => Math.min(totalPages, p + 1))}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs"
                          >
                            ถัดไป
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Toggle Action */}
          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsReportersInlineOpen(!isReportersInlineOpen)}
              className="w-full py-2.5 px-4 bg-white hover:bg-indigo-50/80 text-indigo-950 border border-indigo-200/90 hover:border-indigo-300 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-between shadow-2xs group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform shrink-0" />
                <span className="truncate">{isReportersInlineOpen ? "ย่อรายชื่อครู (ซ่อนตารางค้นหา)" : "แสดงรายชื่อครูทั้งหมดและตารางค้นหา"}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-indigo-600 font-black shrink-0">
                <span>{numFmt(topReportersList.length)} ท่าน</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${isReportersInlineOpen ? "rotate-90" : "group-hover:translate-x-0.5"}`} />
              </div>
            </button>
          </div>
        </div>


        {/* ==================== Column 2: โรงเรียนดีเด่นส่งรายงานสูงสุด (ทำเนียบโรงเรียน & กราฟ) ==================== */}
        <div className="app-card-surface space-y-5 bg-gradient-to-b from-white to-amber-50/30 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Column Header */}
            <div className="flex items-center justify-between border-b border-amber-200/70 pb-3.5 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-xl border border-amber-200 shrink-0">
                  <Award className="w-5 h-5 text-amber-700" />
                </div>
                <div className="min-w-0">
                  <h3 className="typo-app-h3 text-slate-900 font-extrabold flex items-center gap-2">
                    <span>โรงเรียนดีเด่นส่งรายงานสูงสุด</span>
                  </h3>
                  <p className="typo-app-subtext">สถานศึกษาที่มีความถี่ในการส่งรายงานสม่ำเสมอสูงสุด</p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-amber-900 bg-amber-100/80 px-3 py-1 rounded-full border border-amber-200 shrink-0">
                รวม {numFmt(topSchoolFrequencyList.length)} แห่ง
              </span>
            </div>

            {/* Top 3 Podiums */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 pt-2 items-end">
              {/* Silver - อันดับ 2 */}
              {topHonorSchools[1] && (
                <div 
                  onClick={() => setSelectedSchoolModal(topHonorSchools[1].name)}
                  className="bg-gradient-to-b from-slate-100 via-slate-50/80 to-white rounded-2xl p-3 border-2 border-slate-300 shadow-xs hover:border-slate-400 text-center flex flex-col justify-between col-span-1 transition-all duration-200 min-h-[140px] cursor-pointer hover:shadow-sm active:scale-[0.98]"
                  title={`คลิกเพื่อดูรายงานทั้งหมดของ ${topHonorSchools[1].name}`}
                >
                  <div className="bg-slate-700 text-white font-black text-[11px] py-0.5 px-2 rounded-md shadow-2xs inline-flex items-center justify-center gap-1 mx-auto whitespace-nowrap">
                    <span>🥈 อันดับ ๒</span>
                  </div>
                  <div className="my-2 overflow-hidden flex-1 flex flex-col items-center justify-center min-h-[44px]">
                    <p className={getPodiumNameClass(topHonorSchools[1].name, false)} title={topHonorSchools[1].name}>
                      {topHonorSchools[1].name}
                    </p>
                  </div>
                  <span className="bg-slate-200/90 text-slate-800 font-extrabold text-xs py-1 px-2 rounded-lg border border-slate-300/80 whitespace-nowrap">
                    {numFmt(topHonorSchools[1].count)} รายการ
                  </span>
                </div>
              )}

              {/* Gold - อันดับ 1 (Most Prominent Podium) */}
              {topHonorSchools[0] && (
                <div 
                  onClick={() => setSelectedSchoolModal(topHonorSchools[0].name)}
                  className="bg-gradient-to-b from-amber-100/95 via-amber-50/70 to-white rounded-2xl p-3.5 border-2 border-amber-500 shadow-md ring-2 ring-amber-400/30 text-center flex flex-col justify-between col-span-1 transition-all duration-200 min-h-[165px] -translate-y-1 relative z-10 cursor-pointer hover:shadow-lg active:scale-[0.98]"
                  title={`คลิกเพื่อดูรายงานทั้งหมดของ ${topHonorSchools[0].name}`}
                >
                  <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white font-black text-xs py-1 px-2 rounded-lg shadow-xs inline-flex items-center justify-center gap-1 mx-auto whitespace-nowrap">
                    <span>🥇 อันดับ ๑</span>
                  </div>
                  <div className="my-2 overflow-hidden flex-1 flex flex-col items-center justify-center min-h-[44px]">
                    <p className={getPodiumNameClass(topHonorSchools[0].name, true)} title={topHonorSchools[0].name}>
                      {topHonorSchools[0].name}
                    </p>
                  </div>
                  <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-xs py-1 px-2 rounded-lg shadow-2xs whitespace-nowrap">
                    {numFmt(topHonorSchools[0].count)} รายการ
                  </span>
                </div>
              )}

              {/* Bronze - อันดับ 3 */}
              {topHonorSchools[2] && (
                <div 
                  onClick={() => setSelectedSchoolModal(topHonorSchools[2].name)}
                  className="bg-gradient-to-b from-orange-100/80 via-amber-50/50 to-white rounded-2xl p-3 border-2 border-amber-600/70 shadow-xs hover:border-amber-600 text-center flex flex-col justify-between col-span-1 transition-all duration-200 min-h-[135px] cursor-pointer hover:shadow-sm active:scale-[0.98]"
                  title={`คลิกเพื่อดูรายงานทั้งหมดของ ${topHonorSchools[2].name}`}
                >
                  <div className="bg-amber-800 text-white font-black text-[11px] py-0.5 px-2 rounded-md shadow-2xs inline-flex items-center justify-center gap-1 mx-auto whitespace-nowrap">
                    <span>🥉 อันดับ ๓</span>
                  </div>
                  <div className="my-2 overflow-hidden flex-1 flex flex-col items-center justify-center min-h-[44px]">
                    <p className={getPodiumNameClass(topHonorSchools[2].name, false)} title={topHonorSchools[2].name}>
                      {topHonorSchools[2].name}
                    </p>
                  </div>
                  <span className="bg-amber-100 text-amber-950 font-extrabold text-xs py-1 px-2 rounded-lg border border-amber-300/80 whitespace-nowrap">
                    {numFmt(topHonorSchools[2].count)} รายการ
                  </span>
                </div>
              )}
            </div>

            {/* Top 4-10 Podiums / Collapsible Directory List & Chart */}
            {!isSchoolsInlineOpen ? (
              <div className="space-y-2 pt-2">
                {topSchoolFrequencyList.slice(3, 8).map((item, idx) => (
                  <div 
                    key={item.name} 
                    onClick={() => setSelectedSchoolModal(item.name)}
                    className="flex items-center justify-between text-xs font-bold p-2.5 bg-white rounded-xl border border-amber-100 hover:border-amber-300 hover:bg-amber-50/40 transition cursor-pointer active:scale-[0.99]"
                    title={`คลิกเพื่อดูรายงานของ ${item.name}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-900 font-black text-xs flex items-center justify-center shrink-0 border border-amber-200">
                        {numFmt(idx + 4)}
                      </span>
                      <span className="text-slate-800 font-bold truncate" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <span className="font-black text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shrink-0 text-xs whitespace-nowrap">
                      {numFmt(item.count)} รายการ
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* Inline School Directory & Frequency: แสดงผลรายชื่อโรงเรียนและกราฟสถิติ */
              <div className="space-y-3 pt-2 bg-white p-4 rounded-2xl border border-amber-200/90 shadow-2xs">
                {/* Header & Mode Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-amber-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSchoolViewMode("list")}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        schoolViewMode === "list"
                          ? "bg-amber-500 text-white shadow-2xs"
                          : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/80"
                      }`}
                    >
                      <School className="w-3.5 h-3.5" />
                      <span>รายชื่อโรงเรียน</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchoolViewMode("chart")}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        schoolViewMode === "chart"
                          ? "bg-amber-500 text-white shadow-2xs"
                          : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/80"
                      }`}
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>กราฟสถิติ</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {schoolViewMode === "chart" && (
                      <select
                        value={schoolChartFilter}
                        onChange={(e) => setSchoolChartFilter(e.target.value as "top10" | "top20" | "by_group")}
                        className="text-xs px-2.5 py-1 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900 font-bold focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                      >
                        <option value="top10">๑๐ อันดับแรก (Top 10)</option>
                        <option value="top20">๒๐ อันดับแรก (Top 20)</option>
                        <option value="by_group">แยกตาม กก.ตชด. (21-24)</option>
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsSchoolsInlineOpen(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer ml-1"
                    >
                      ย่อตาราง
                    </button>
                  </div>
                </div>

                {schoolViewMode === "list" ? (
                  /* List View */
                  <div className="space-y-2.5">
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อโรงเรียน สังกัด หรือจังหวัด..."
                        value={schoolSearch}
                        onChange={(e) => {
                          setSchoolSearch(e.target.value);
                          setSchoolPage(1);
                        }}
                        className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 font-medium"
                      />
                      {schoolSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setSchoolSearch("");
                            setSchoolPage(1);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Paginated School Items */}
                    {(() => {
                      const filtered = topSchoolFrequencyList.filter((s) => {
                        if (!schoolSearch.trim()) return true;
                        const q = schoolSearch.toLowerCase().trim();
                        return (
                          s.name.toLowerCase().includes(q) ||
                          (s.groupName || "").toLowerCase().includes(q) ||
                          (s.province || "").toLowerCase().includes(q)
                        );
                      });
                      const perPage = 7;
                      const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
                      const currentP = Math.min(schoolPage, totalPages);
                      const paginated = filtered.slice((currentP - 1) * perPage, currentP * perPage);

                      return (
                        <div className="space-y-2">
                          {paginated.length > 0 ? (
                            paginated.map((item, idx) => {
                              const rank = (currentP - 1) * perPage + idx + 1;
                              return (
                                <div
                                  key={`inline-sch-${item.name}-${rank}`}
                                  onClick={() => setSelectedSchoolModal(item.name)}
                                  className="flex items-center justify-between text-xs p-2 bg-slate-50 hover:bg-amber-50/70 rounded-xl border border-slate-200/80 transition cursor-pointer active:scale-[0.99]"
                                  title={`คลิกเพื่อดูรายงานของ ${item.name}`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                                    <span className={`w-5 h-5 rounded-full font-black text-[11px] flex items-center justify-center shrink-0 ${
                                      rank === 1 ? "bg-amber-500 text-white" :
                                      rank === 2 ? "bg-slate-600 text-white" :
                                      rank === 3 ? "bg-amber-700 text-white" :
                                      "bg-amber-50 text-amber-950 border border-amber-200"
                                    }`}>
                                      {numFmt(rank)}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-slate-800 font-bold truncate text-xs" title={item.name}>
                                        {item.name}
                                      </p>
                                      {(item.groupName || item.province) && (
                                        <p className="text-[10px] text-slate-500 font-normal truncate">
                                          {item.groupName ? `กก.ตชด.${item.groupName.replace("กองกำกับการตำรวจตระเวนชายแดนที่", "").replace("กก.ตชด.", "").trim()}` : ""}
                                          {item.groupName && item.province ? " • " : ""}
                                          {item.province ? `จ.${item.province}` : ""}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <span className="font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200 shrink-0 text-xs whitespace-nowrap">
                                    {numFmt(item.count)} รายการ
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-6 text-center text-slate-400 text-xs">
                              ไม่พบรายชื่อโรงเรียนที่ตรงกับคำค้นหา
                            </div>
                          )}

                          {/* Pagination */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold text-slate-600">
                            <span>
                              หน้า {numFmt(currentP)} / {numFmt(totalPages)} (รวม {numFmt(filtered.length)} แห่ง)
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={currentP <= 1}
                                onClick={() => setSchoolPage((p) => Math.max(1, p - 1))}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs"
                              >
                                ก่อนหน้า
                              </button>
                              <button
                                type="button"
                                disabled={currentP >= totalPages}
                                onClick={() => setSchoolPage((p) => Math.min(totalPages, p + 1))}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs"
                              >
                                ถัดไป
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* Bar Chart View */
                  <div className="h-[280px] w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={schoolFreqChartData}
                        layout={schoolChartFilter === "by_group" ? "horizontal" : "vertical"}
                        margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#FEF3C7" />
                        {schoolChartFilter === "by_group" ? (
                          <>
                            <XAxis dataKey="shortName" stroke="#78350F" fontSize={11} tickLine={false} fontWeight={600} />
                            <YAxis stroke="#78350F" fontSize={11} tickLine={false} fontWeight={600} tickFormatter={(val) => numFmt(val)} />
                          </>
                        ) : (
                          <>
                            <XAxis type="number" stroke="#78350F" fontSize={11} tickLine={false} fontWeight={600} tickFormatter={(val) => numFmt(val)} />
                            <YAxis type="category" dataKey="shortName" stroke="#78350F" fontSize={10} tickLine={false} fontWeight={600} width={105} />
                          </>
                        )}
                        <Tooltip
                          formatter={(value) => [`${numFmt(Number(value))} รายการ`, "จำนวนที่ส่ง"]}
                          labelFormatter={(label, items) => {
                            if (items && items[0] && items[0].payload) {
                              return items[0].payload.fullName || label;
                            }
                            return label;
                          }}
                          contentStyle={{ backgroundColor: "#0f172a", color: "#f8fafc", borderRadius: "12px", border: "1px solid #1e293b", fontSize: "11px", padding: "6px 10px", fontWeight: "bold" }}
                        />
                        <Bar dataKey="count" fill="#F59E0B" radius={schoolChartFilter === "by_group" ? [6, 6, 0, 0] : [0, 6, 6, 0]}>
                          {schoolFreqChartData.map((_entry, index) => (
                            <Cell key={`cell-freq-${index}`} fill={index === 0 ? "#D97706" : index === 1 ? "#F59E0B" : index === 2 ? "#B45309" : "#FBBF24"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Toggle Action */}
          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSchoolsInlineOpen(!isSchoolsInlineOpen)}
              className="w-full py-2.5 px-4 bg-white hover:bg-amber-100/80 text-amber-950 border border-amber-200/90 hover:border-amber-300 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-between shadow-2xs group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <School className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform shrink-0" />
                <span className="truncate">{isSchoolsInlineOpen ? "ย่อรายชื่อโรงเรียน (ซ่อนตารางค้นหา)" : "แสดงรายชื่อโรงเรียนทั้งหมดและกราฟสถิติ"}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-amber-800 font-black shrink-0">
                <span>{numFmt(topSchoolFrequencyList.length)} แห่ง</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${isSchoolsInlineOpen ? "rotate-90" : "group-hover:translate-x-0.5"}`} />
              </div>
            </button>
          </div>
        </div>

      </div>

      {/* 4. Complete 53 School Target Rankings Inline Section */}
      <div className="app-card-surface space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shadow-2xs border border-amber-200 shrink-0">
              <Trophy className="w-5 h-5 text-amber-700" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="typo-app-h2 text-xl font-extrabold text-slate-900 tracking-tight">
                ตารางจัดลำดับเป้าหมาย ๕๓ โรงเรียน ตชด. แบบสมบูรณ์
              </h2>
              <p className="typo-app-subtext text-[9.5px]" style={{ fontSize: "9.5px" }}>
                สถิติการส่งรายงานสะสมจำแนกตามรายโรงเรียน สังกัด กก.ตชด. ๒๑, ๒๒, ๒๓ และ ๒๔
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-500">เรียงตาม:</span>
            <select
              value={rankingTableSort}
              onChange={(e) => setRankingTableSort(e.target.value as "count" | "original")}
              className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-pointer"
            >
              <option value="count">จำนวนรายงาน (มากไปน้อย)</option>
              <option value="original">รหัสโรงเรียน / กองกำกับการ</option>
            </select>
          </div>
        </div>

        {/* Table Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาชื่อโรงเรียน จังหวัด หรืออำเภอ..."
              value={rankingTableSearch}
              onChange={(e) => setRankingTableSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-400 font-medium"
            />
            {rankingTableSearch && (
              <button
                type="button"
                onClick={() => setRankingTableSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={rankingTableGroup}
            onChange={(e) => setRankingTableGroup(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-pointer shrink-0"
          >
            <option value="all">ทุก กก.ตชด. (21-24)</option>
            <option value="21">เฉพาะ กก.ตชด.21</option>
            <option value="22">เฉพาะ กก.ตชด.22</option>
            <option value="23">เฉพาะ กก.ตชด.23</option>
            <option value="24">เฉพาะ กก.ตชด.24</option>
          </select>
        </div>

        {/* Table Container */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse table-fixed min-w-[760px]">
              <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200 text-[11px] sm:text-xs">
                <tr>
                  <th className="py-2.5 px-1.5 text-center w-[6%] min-w-[56px] whitespace-nowrap">
                    {rankingTableSort === "count" ? "อันดับ" : "ลำดับ"}
                  </th>
                  <th className="py-2.5 px-3 w-[32%] min-w-[220px]">ชื่อโรงเรียน ตชด.</th>
                  <th className="py-2.5 px-2 text-center w-[11%] min-w-[95px] whitespace-nowrap">สังกัด</th>
                  <th className="py-2.5 px-2 w-[16%] min-w-[150px] whitespace-nowrap">จังหวัด / อำเภอ</th>
                  <th className="py-2.5 px-2 text-center w-[11%] min-w-[95px] whitespace-nowrap">จำนวนรายงาน</th>
                  <th className="py-2.5 px-2 text-center w-[11%] min-w-[105px] whitespace-nowrap">สัดส่วน</th>
                  <th className="py-2.5 px-2 text-center w-[13%] min-w-[135px] whitespace-nowrap">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const filtered = schoolRankings.filter((s) => {
                    const matchQ = !rankingTableSearch.trim() || 
                      s.name.toLowerCase().includes(rankingTableSearch.toLowerCase()) ||
                      s.province.toLowerCase().includes(rankingTableSearch.toLowerCase()) ||
                      s.district.toLowerCase().includes(rankingTableSearch.toLowerCase());
                    const matchG = rankingTableGroup === "all" || s.groupName.includes(rankingTableGroup);
                    return matchQ && matchG;
                  });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          ไม่พบข้อมูลโรงเรียนที่ตรงกับเงื่อนไขการค้นหา
                        </td>
                      </tr>
                    );
                  }

                  const maxCount = Math.max(1, ...schoolRankings.map((s) => s.count));

                  return filtered.map((s) => {
                    const barWidth = Math.min(100, Math.round((s.count / maxCount) * 100));
                    const pctText = s.count > 0 && s.percentageOfTotal < 0.1 
                      ? "<0.1%" 
                      : `${numFmt(s.percentageOfTotal.toFixed(1))}%`;

                    return (
                      <tr 
                        key={s.id}
                        className="hover:bg-amber-50/40 transition-colors"
                      >
                        <td className="py-2.5 px-1.5 text-center font-black whitespace-nowrap">
                          {rankingTableSort === "count" ? (
                            s.officialRank === 1 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white shadow-2xs text-[11px]" title="อันดับที่ 1">
                                🥇
                              </span>
                            ) : s.officialRank === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-500 text-white shadow-2xs text-[11px]" title="อันดับที่ 2">
                                🥈
                              </span>
                            ) : s.officialRank === 3 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white shadow-2xs text-[11px]" title="อันดับที่ 3">
                                🥉
                              </span>
                            ) : (
                              <div className="flex flex-col items-center leading-none">
                                <span className="text-slate-700 font-bold text-xs">{numFmt(s.officialRank)}</span>
                                {s.isTied && (
                                  <span className="text-[8.5px] font-semibold text-amber-700">ร่วม</span>
                                )}
                              </div>
                            )
                          ) : (
                            <span className="text-slate-600 font-bold text-xs">{numFmt(s.officialSeq)}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 min-w-0">
                          <button
                            type="button"
                            onClick={() => setSelectedSchoolModal(s.name)}
                            className="text-left hover:text-amber-700 hover:underline cursor-pointer flex items-center gap-1.5 max-w-full"
                          >
                            <School className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="truncate">{s.name}</span>
                          </button>
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-600 font-medium whitespace-nowrap">
                          {(() => {
                            const raw = s.groupName || "";
                            const cleaned = raw.replace("กองกำกับการตำรวจตระเวนชายแดนที่", "").replace("กก.ตชด.", "").trim();
                            return cleaned ? `กก.ตชด.${cleaned}` : "-";
                          })()}
                        </td>
                        <td className="py-2.5 px-2 text-slate-600 font-medium whitespace-nowrap">
                          จ.{s.province} อ.{s.district}
                        </td>
                        <td className="py-2.5 px-2 text-center font-black whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                            s.count > 0 
                              ? "bg-amber-100 text-amber-950 border border-amber-200" 
                              : "bg-slate-100 text-slate-400"
                          }`}>
                            {numFmt(s.count)} ฉบับ
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <div 
                            className="flex items-center gap-1.5 max-w-[110px] mx-auto"
                            title={`คิดเป็นสัดส่วน ${s.percentageOfTotal.toFixed(2)}% ของรายงานทั้งหมดที่ประมวลผล (${numFmt(totalCountedReports)} ฉบับ)`}
                          >
                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-amber-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-600 w-8 text-right font-mono">
                              {pctText}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedSchoolModal(s.name)}
                              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition cursor-pointer active:scale-95"
                              title="ดูประวัติรายงานของโรงเรียนนี้"
                            >
                              ดูรายงาน
                            </button>
                            {onSelectSchoolFilter && (
                              <button
                                type="button"
                                onClick={() => onSelectSchoolFilter(s.name)}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold transition cursor-pointer active:scale-95"
                                title="เปิดเอกสารรายงาน A4 ของโรงเรียนนี้"
                              >
                                เอกสาร A4
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
              <tfoot className="bg-gradient-to-r from-amber-50/70 via-slate-50 to-amber-50/70 border-t-2 border-amber-200/80 font-bold text-slate-800 text-[11px] sm:text-xs">
                {(() => {
                  const filtered = schoolRankings.filter((s) => {
                    const matchQ = !rankingTableSearch.trim() || 
                      s.name.toLowerCase().includes(rankingTableSearch.toLowerCase()) ||
                      s.province.toLowerCase().includes(rankingTableSearch.toLowerCase()) ||
                      s.district.toLowerCase().includes(rankingTableSearch.toLowerCase());
                    const matchG = rankingTableGroup === "all" || s.groupName.includes(rankingTableGroup);
                    return matchQ && matchG;
                  });
                  const sumCount = filtered.reduce((acc, curr) => acc + curr.count, 0);
                  const sumPct = filtered.reduce((acc, curr) => acc + curr.percentageOfTotal, 0);

                  return (
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right">
                        <span className="font-extrabold text-slate-800">
                          รวมผลคะแนนตามตัวกรอง ({numFmt(filtered.length)} จาก {numFmt(53)} โรงเรียน):
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-black text-amber-950 whitespace-nowrap">
                        <span className="bg-amber-200/90 text-amber-950 px-2.5 py-0.5 rounded-lg border border-amber-300 font-black">
                          {numFmt(sumCount)} ฉบับ
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-black text-slate-700 whitespace-nowrap">
                        <span className="bg-white px-2 py-0.5 rounded-lg border border-slate-200 font-bold text-[10.5px]">
                          {sumPct >= 99.9 ? "100%" : `${numFmt(sumPct.toFixed(1))}%`}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          ✓ เที่ยงตรง 100%
                        </span>
                      </td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ==================== Modal 1: Teacher Inspection Modal ==================== */}
      {selectedTeacherModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity cursor-pointer" 
            onClick={() => setSelectedTeacherModal(null)}
          />
          <div className="bg-white rounded-3xl border border-indigo-200 shadow-2xl overflow-hidden max-w-3xl w-full relative z-10 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-indigo-500/30 rounded-xl border border-indigo-400/40 text-indigo-200 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-white truncate" title={selectedTeacherModal}>
                    ทำเนียบรายงานของคุณครู: {selectedTeacherModal}
                  </h3>
                  <p className="text-xs text-indigo-200">
                    รายงานที่ส่งทั้งหมดจำนวน {numFmt(teacherSelectedReports.length)} ฉบับ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeacherModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {teacherSelectedReports.length > 0 ? (
                teacherSelectedReports.map((r, i) => (
                  <div 
                    key={r.id || `tr-${i}`}
                    className="p-4 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-200/90 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10.5px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                          ฉบับที่ {numFmt(i + 1)}
                        </span>
                        <span className="text-[10.5px] font-semibold text-slate-500">
                          {r.dateString || r.timestamp || "ไม่ระบุวันที่"}
                        </span>
                        <span className="text-[10.5px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {r.schoolName}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1" title={r.activityName}>
                        {r.activityName}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-1">
                        โครงการ: {r.projectName || "-"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onSelectReport && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectReport(r);
                            setSelectedTeacherModal(null);
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
                        >
                          ดูรายละเอียด
                        </button>
                      )}
                      {onNavigateToDocument && (
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateToDocument(r.id);
                            setSelectedTeacherModal(null);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>เปิด A4</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  ไม่พบรายการรายงานที่บันทึกไว้ในชื่อนี้
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTeacherModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Modal 2: School Inspection Modal ==================== */}
      {selectedSchoolModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity cursor-pointer" 
            onClick={() => setSelectedSchoolModal(null)}
          />
          <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl overflow-hidden max-w-3xl w-full relative z-10 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-amber-500/30 rounded-xl border border-amber-400/40 text-amber-200 shrink-0">
                  <School className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-white truncate" title={selectedSchoolModal}>
                    ทำเนียบรายงานของ: {selectedSchoolModal}
                  </h3>
                  <p className="text-xs text-amber-200">
                    รายงานทั้งหมดจำนวน {numFmt(schoolSelectedReports.length)} ฉบับ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSchoolModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {schoolSelectedReports.length > 0 ? (
                schoolSelectedReports.map((r, i) => (
                  <div 
                    key={r.id || `sch-rep-${i}`}
                    className="p-4 bg-slate-50 hover:bg-amber-50/50 rounded-2xl border border-slate-200/90 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10.5px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                          ฉบับที่ {numFmt(i + 1)}
                        </span>
                        <span className="text-[10.5px] font-semibold text-slate-500">
                          {r.dateString || r.timestamp || "ไม่ระบุวันที่"}
                        </span>
                        {r.reportedBy && (
                          <span className="text-[10.5px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            ผู้รายงาน: {r.reportedBy}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1" title={r.activityName}>
                        {r.activityName}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-1">
                        โครงการ: {r.projectName || "-"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onSelectReport && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectReport(r);
                            setSelectedSchoolModal(null);
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-950 border border-amber-200 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
                        >
                          ดูรายละเอียด
                        </button>
                      )}
                      {onNavigateToDocument && (
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateToDocument(r.id);
                            setSelectedSchoolModal(null);
                          }}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>เปิด A4</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  ยังไม่มีรายงานที่บันทึกไว้สำหรับโรงเรียนนี้
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {onSelectSchoolFilter && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectSchoolFilter(selectedSchoolModal);
                    setSelectedSchoolModal(null);
                  }}
                  className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  กรองเอกสารรายงาน A4 ทั้งหมดของโรงเรียนนี้
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedSchoolModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer ml-auto"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Modal 3: Complete 53 School Rankings Modal ==================== */}
      {showFullTableModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity cursor-pointer" 
            onClick={() => setShowFullTableModal(false)}
          />
          <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl overflow-hidden max-w-4xl w-full relative z-10 flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-amber-500/30 rounded-xl border border-amber-400/40 text-amber-200 shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-white truncate">
                    ตารางจัดลำดับอัตโนมัติ (53 โรงเรียน ตชด.)
                  </h3>
                  <p className="text-xs text-amber-200">
                    เรียงตามจำนวนรายงานที่ส่ง สังกัด บก.ตชด.ภาค 2
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFullTableModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Table */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs table-auto border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-2 text-center w-12 whitespace-nowrap">อันดับ</th>
                      <th className="py-2.5 px-3 min-w-[200px] w-auto">ชื่อโรงเรียน</th>
                      <th className="py-2.5 px-2 text-center w-24 whitespace-nowrap">สังกัด</th>
                      <th className="py-2.5 px-2 w-28 whitespace-nowrap">จังหวัด</th>
                      <th className="py-2.5 px-2 text-center w-24 whitespace-nowrap">จำนวนที่ส่ง</th>
                      <th className="py-2.5 px-2 text-center w-20 whitespace-nowrap">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {schoolRankings.map((s, idx) => (
                      <tr key={`full-modal-${s.id}`} className="hover:bg-amber-50/50">
                        <td className="py-2 px-2 text-center font-black w-12 whitespace-nowrap">
                          {s.officialRank === 1 ? "🥇" : s.officialRank === 2 ? "🥈" : s.officialRank === 3 ? "🥉" : numFmt(s.officialRank)}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 min-w-[200px]">{s.name}</td>
                        <td className="py-2 px-2 text-center text-slate-600 whitespace-nowrap">
                          กก.ตชด.{s.groupName.replace("กองกำกับการตำรวจตระเวนชายแดนที่", "").replace("กก.ตชด.", "").trim()}
                        </td>
                        <td className="py-2 px-2 text-slate-500 w-28 whitespace-nowrap">จ.{s.province}</td>
                        <td className="py-2 px-2 text-center font-bold w-24 whitespace-nowrap">
                          <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200">
                            {numFmt(s.count)} รายการ
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center w-20 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSchoolModal(s.name);
                              setShowFullTableModal(false);
                            }}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            ดูรายงาน
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFullTableModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RankingsAndHonorView;
