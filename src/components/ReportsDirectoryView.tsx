import React, { useState, useMemo, useEffect } from "react";
import { 
  ActivityReport, 
  ReportStatus, 
  KOPODOT_GOALS, 
  getGoalIdFromCode 
} from "../types";
import { 
  OFFICIAL_TARGET_SCHOOLS, 
  isSchoolMatch, 
  getSchoolGpsBySchoolName 
} from "../data/schoolsData";
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Target, 
  Layers, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  School, 
  MapPin, 
  UserCheck, 
  Sparkles, 
  ThumbsUp, 
  ChevronRight, 
  X, 
  Download, 
  Printer, 
  ArrowUpDown, 
  LayoutGrid, 
  Table as TableIcon,
  List as ListIcon,
  Calendar,
  Users,
  Eye,
  RotateCcw,
  Compass,
  Pencil
} from "lucide-react";
import { 
  toThaiNumerals, 
  formatNumberWithComma,
  extractReportParticipantCount 
} from "../lib/safeDateUtils";
import { 
  createWindowsSafeCsvBlob, 
  triggerWindowsFileDownload, 
  sanitizeWindowsFilename 
} from "../lib/windowsUtils";
import { UniversalPageBanner } from "./UniversalPageBanner";

interface ReportsDirectoryViewProps {
  reports: ActivityReport[];
  onSelectReport: (reportId: string) => void;
  onEditReport?: (report: ActivityReport) => void;
  onOpenDashboard?: () => void;
  onOpenExecutiveOnePage?: () => void;
  onOpenBannerCustomizer?: (pageKey: string) => void;
  initialSearch?: string;
  initialGoalFilter?: string;
  initialGroupFilter?: string;
  initialStatusFilter?: string;
}

export function ReportsDirectoryView({
  reports,
  onSelectReport,
  onOpenDashboard,
  onOpenExecutiveOnePage,
  onOpenBannerCustomizer,
  initialSearch = "",
  initialGoalFilter = "all",
  initialGroupFilter = "all",
  initialStatusFilter = "all"
}: ReportsDirectoryViewProps) {
  // Filter states
  const [searchTerm, setSearchTerm] = useState<string>(initialSearch);
  const [groupFilter, setGroupFilter] = useState<string>(initialGroupFilter);
  const [goalFilter, setGoalFilter] = useState<string>(initialGoalFilter);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "goal" | "school" | "participants">("latest");
  const [groupByGoal, setGroupByGoal] = useState<boolean>(false);
  const [viewLayout, setViewLayout] = useState<"table" | "cards" | "compact">("table");

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);

  // Modal Quick Preview
  const [previewReportModal, setPreviewReportModal] = useState<ActivityReport | null>(null);

  // Helper to get school BPP Group Name
  const getSchoolGroupName = (schoolName: string): string => {
    if (!schoolName) return "";
    const canonical = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(schoolName, s.name));
    return canonical?.groupName || "";
  };

  // Filtered and sorted reports calculation
  const filteredReports = useMemo(() => {
    let list = reports.filter((r) => {
      const groupName = getSchoolGroupName(r.schoolName);
      const query = searchTerm.toLowerCase().trim();
      const queryNorm = query.replace(/[^a-z0-9ก-๙]/g, "").replace("ชำปะโต", "ซำปะโต");

      const schoolNameLower = (r.schoolName || "").toLowerCase();
      const schoolNameNorm = schoolNameLower.replace(/[^a-z0-9ก-๙]/g, "").replace("ชำปะโต", "ซำปะโต");
      const schoolNameCore = schoolNameNorm.replace(/รรตชด|โรงเรียนตำรวจตระเวนชายแดน|ศกรตชด|ศศช/g, "");

      const matchSchoolName =
        schoolNameLower.includes(query) ||
        isSchoolMatch(query, r.schoolName) ||
        (queryNorm.length >= 2 && (
          schoolNameNorm.includes(queryNorm) ||
          schoolNameCore.includes(queryNorm) ||
          queryNorm.includes(schoolNameCore)
        ));

      const queryCleanTeacher = query
        .replace(/(?:ว่าที่\s*)?(?:พล|พ|ร|ด|จ|ส)\.[ตจส]\.[อตทพ]\.?(?:หญิง)?|ดาบตำรวจ(?:หญิง)?|สิบตำรวจ(?:เอก|โท|ตรี)(?:หญิง)?|ร้อยตำรวจ(?:เอก|โท|ตรี)(?:หญิง)?|พันตำรวจ(?:เอก|โท|ตรี)(?:หญิง)?|ครูใหญ่|ครูผู้สอน|คุณครู|ครู|นางสาว|น\.ส\.|นาง|นาย/gi, "")
        .replace(/[\s\u200B-\u200D\uFEFF]/g, "")
        .toLowerCase();

      const reportedByClean = (r.reportedBy || "")
        .replace(/[\s\u200B-\u200D\uFEFF]/g, "")
        .toLowerCase();

      const matchReporter =
        (r.reportedBy || "").toLowerCase().includes(query) ||
        (queryCleanTeacher.length >= 3 && reportedByClean.includes(queryCleanTeacher));

      const matchDate =
        (r.dateString || "").toLowerCase().includes(query) ||
        (r.reportingPeriod || "").toLowerCase().includes(query) ||
        (r.lastUpdated || "").toLowerCase().includes(query) ||
        (r.timestamp || "").toLowerCase().includes(query);

      const matchSearch =
        !query ||
        r.activityName.toLowerCase().includes(query) ||
        r.projectName.toLowerCase().includes(query) ||
        matchReporter ||
        r.id.toLowerCase().includes(query) ||
        groupName.toLowerCase().includes(query) ||
        matchSchoolName ||
        matchDate;

      const matchGoal = goalFilter === "all" || getGoalIdFromCode(r.goalCode) === Number(goalFilter);
      const matchGroup = groupFilter === "all" || groupName.includes(groupFilter);
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "completed" && r.status === ReportStatus.COMPLETED) ||
        (statusFilter === "in_progress" && r.status === ReportStatus.IN_PROGRESS) ||
        (statusFilter === "overdue" && r.status === ReportStatus.OVERDUE) ||
        (statusFilter === "draft" && (r.status === ReportStatus.DRAFT || !r.status));

      return matchSearch && matchGoal && matchGroup && matchStatus;
    });

    // Sort order
    if (groupByGoal) {
      list = [...list].sort((a, b) => getGoalIdFromCode(a.goalCode) - getGoalIdFromCode(b.goalCode));
    } else if (sortBy === "oldest") {
      list = [...list].reverse();
    } else if (sortBy === "goal") {
      list = [...list].sort((a, b) => getGoalIdFromCode(a.goalCode) - getGoalIdFromCode(b.goalCode));
    } else if (sortBy === "school") {
      list = [...list].sort((a, b) => (a.schoolName || "").localeCompare(b.schoolName || "", "th"));
    } else if (sortBy === "participants") {
      list = [...list].sort((a, b) => extractReportParticipantCount(b) - extractReportParticipantCount(a));
    }

    return list;
  }, [reports, searchTerm, goalFilter, groupFilter, statusFilter, sortBy, groupByGoal]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, goalFilter, groupFilter, statusFilter, sortBy, groupByGoal, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / itemsPerPage));
  const paginatedReports = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredReports, currentPage, itemsPerPage]);

  // Status counts
  const totalCount = reports.length;
  const completedCount = reports.filter((r) => r.status === ReportStatus.COMPLETED).length;
  const inProgressCount = reports.filter((r) => r.status === ReportStatus.IN_PROGRESS || (!r.status && r.status !== ReportStatus.COMPLETED)).length;
  const overdueCount = reports.filter((r) => r.status === ReportStatus.OVERDUE).length;

  const hasActiveFilters = searchTerm !== "" || goalFilter !== "all" || groupFilter !== "all" || statusFilter !== "all";

  const handleResetFilters = () => {
    setSearchTerm("");
    setGoalFilter("all");
    setGroupFilter("all");
    setStatusFilter("all");
    setSortBy("latest");
    setGroupByGoal(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredReports || filteredReports.length === 0) {
      alert("ไม่พบข้อมูลรายงานตามเงื่อนไขสำหรับส่งออก");
      return;
    }

    const headers = [
      "รหัสรายงาน",
      "ชื่อกิจกรรม",
      "ชื่อโครงการ",
      "เป้าหมายหลัก",
      "โรงเรียน",
      "สังกัด กก.ตชด.",
      "กลุ่มเป้าหมาย",
      "จำนวนผู้เข้าร่วม (คน)",
      "วันที่ดำเนินงาน",
      "วัตถุประสงค์",
      "ผลผลิตเชิงปริมาณ",
      "ผลลัพธ์เชิงคุณภาพ",
      "ปัญหาและอุปสรรค",
      "ข้อเสนอแนะ",
      "ผู้จัดทำรายงาน",
      "ตำแหน่งผู้จัดทำ",
      "ผู้รับรองรายงาน",
      "สถานะ"
    ];

    const rows = filteredReports.map((r) => [
      `"${r.id || ""}"`,
      `"${(r.activityName || "").replace(/"/g, '""')}"`,
      `"${(r.projectName || "").replace(/"/g, '""')}"`,
      `"${(r.goalCode || "").replace(/"/g, '""')}"`,
      `"${(r.schoolName || "").replace(/"/g, '""')}"`,
      `"${(getSchoolGroupName(r.schoolName) || "").replace(/"/g, '""')}"`,
      `"${(r.targetGroup || "").replace(/"/g, '""')}"`,
      `"${extractReportParticipantCount(r)}"`,
      `"${(r.dateString || "").replace(/"/g, '""')}"`,
      `"${(r.objectives || "").replace(/"/g, '""')}"`,
      `"${(r.quantitativeOutcome || "").replace(/"/g, '""')}"`,
      `"${(r.qualitativeOutcome || "").replace(/"/g, '""')}"`,
      `"${(r.problems || "").replace(/"/g, '""')}"`,
      `"${(r.suggestions || "").replace(/"/g, '""')}"`,
      `"${(r.reportedBy || "").replace(/"/g, '""')}"`,
      `"${(r.reportPosition || "").replace(/"/g, '""')}"`,
      `"${(r.verifiedBy || "").replace(/"/g, '""')}"`,
      `"${(r.status || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = createWindowsSafeCsvBlob(csvContent);
    triggerWindowsFileDownload(blob, sanitizeWindowsFilename(`รายงานกิจกรรม_กพด5_ตชดภาค2_${new Date().toISOString().slice(0, 10)}.csv`));
  };

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      {/* 0. Top Panoramic Banner (Configurable Per-Page) */}
      <UniversalPageBanner
        pageKey="reportsDirectory"
        onOpenCustomizer={onOpenBannerCustomizer}
      />

      {/* Comprehensive Filter Toolbar & Quick Status Badges */}
      <div className="app-card-surface space-y-3.5 p-4 sm:p-5">
        {/* Quick Status Metric Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-indigo-600" />
              <span>สรุปสถานะรายงาน</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="bg-indigo-50/90 text-indigo-900 text-xs font-bold px-2.5 py-1 rounded-xl border border-indigo-200/80 inline-flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              <span>ทั้งหมด <strong className="font-black text-indigo-700">{toThaiNumerals(totalCount)}</strong> รายการ</span>
            </div>
            <div className="bg-emerald-50 text-emerald-900 text-xs font-bold px-2.5 py-1 rounded-xl border border-emerald-200/80 inline-flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>เสร็จสิ้น <strong className="font-black text-emerald-700">{toThaiNumerals(completedCount)}</strong></span>
            </div>
            <div className="bg-amber-50 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-xl border border-amber-200/80 inline-flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>กำลังดำเนินการ <strong className="font-black text-amber-700">{toThaiNumerals(inProgressCount)}</strong></span>
            </div>
            {overdueCount > 0 && (
              <div className="bg-rose-50 text-rose-900 text-xs font-bold px-2.5 py-1 rounded-xl border border-rose-200/80 inline-flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>ล่าช้า <strong className="font-black text-rose-700">{toThaiNumerals(overdueCount)}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 w-full pt-1">
          {/* Search Input */}
          <div className="relative w-full min-w-0 md:col-span-2">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อโรงเรียน, กิจกรรม, โครงการ, ผู้รายงาน, วันที่..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-10 pr-8 py-2.5 bg-slate-50/90 hover:bg-slate-100/80 focus:bg-white border border-slate-200/90 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold transition placeholder:text-slate-400 text-slate-900 shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer transition"
                title="ล้างคำค้นหา"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* BPP Division Filter */}
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 bg-slate-50/90 hover:bg-slate-100/80 focus:bg-white border border-slate-200/90 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-700 cursor-pointer transition min-w-0 truncate shadow-2xs"
          >
            <option value="all">📍 สังกัด กก.ตชด. ทั้งหมด (21-24)</option>
            <option value="21">กก.ตชด.21 (สุรินทร์/บุรีรัมย์/ชัยภูมิ/โคราช)</option>
            <option value="22">กก.ตชด.22 (อุบลฯ/อำนาจฯ/ศรีสะเกษ/ยโสธร)</option>
            <option value="23">กก.ตชด.23 (สกลนคร/มุกดาหาร/นครพนม)</option>
            <option value="24">กก.ตชด.24 (อุดรธานี/เลย/หนองคาย/บึงกาฬ)</option>
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full text-xs px-3.5 py-2.5 bg-slate-50/90 hover:bg-slate-100/80 focus:bg-white border border-slate-200/90 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-700 cursor-pointer transition min-w-0 truncate shadow-2xs"
          >
            <option value="latest">⏱️ เรียงลำดับ: ล่าสุดก่อน</option>
            <option value="oldest">⏱️ เรียงลำดับ: เก่าสุดก่อน</option>
            <option value="goal">🎯 เรียงลำดับ: ตามเป้าหมาย (1-8)</option>
            <option value="school">🏫 เรียงลำดับ: ตามชื่อสถานศึกษา (ก-ฮ)</option>
            <option value="participants">👥 เรียงลำดับ: ตามจำนวนผู้เข้าร่วม</option>
          </select>
        </div>

        {/* 3. Goal Quick-Filter Chips Bar */}
        <div className="pt-2 space-y-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
              <Target className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="whitespace-nowrap">ตัวกรองเป้าหมาย กพด. (8 มิติการพัฒนา):</span>
            </div>
          </div>

          {/* Scrollable Goal Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-300 no-print">
            <button
              type="button"
              onClick={() => setGoalFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all duration-150 cursor-pointer inline-flex items-center gap-1.5 ${
                goalFilter === "all"
                  ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/30"
                  : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>ทั้งหมด (8 ด้าน)</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${goalFilter === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                {toThaiNumerals(reports.length)}
              </span>
            </button>

            {KOPODOT_GOALS.map((goal) => {
              const goalCount = reports.filter((r) => getGoalIdFromCode(r.goalCode) === goal.id).length;
              const isSelected = goalFilter === String(goal.id);
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => setGoalFilter(String(goal.id))}
                  className={`px-3 py-1.5 rounded-xl text-xs shrink-0 transition-all duration-150 cursor-pointer inline-flex items-center gap-1.5 ${
                    isSelected
                      ? "text-white shadow-xs font-black ring-2 ring-indigo-500/30"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border border-slate-200/90"
                  }`}
                  style={{
                    backgroundColor: isSelected ? goal.color : undefined,
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                    style={{ backgroundColor: goal.color }}
                  ></span>
                  <span className="whitespace-nowrap">
                    ด้านที่ {toThaiNumerals(goal.id)}: {goal.title.substring(0, 16)}...
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full shrink-0 ${
                      isSelected ? "bg-white/25 text-white" : "bg-slate-200/80 text-slate-700"
                    }`}
                  >
                    {toThaiNumerals(goalCount)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Status Segmented Bar & View Mode Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/70 no-print shadow-inner-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full md:w-auto py-0.5">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap text-center ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">ทั้งหมด ({toThaiNumerals(totalCount)})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap text-center ${
                statusFilter === "completed"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-emerald-800 hover:bg-emerald-100/60"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">รับรองแล้ว ({toThaiNumerals(completedCount)})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("in_progress")}
              className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap text-center ${
                statusFilter === "in_progress"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-amber-800 hover:bg-amber-100/60"
              }`}
            >
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">กำลังดำเนินการ ({toThaiNumerals(inProgressCount)})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("overdue")}
              className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap text-center ${
                statusFilter === "overdue"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-rose-800 hover:bg-rose-100/60"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">ล่าช้า ({toThaiNumerals(overdueCount)})</span>
            </button>
          </div>

          {/* View Mode Buttons & Result Counters */}
          <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
            <div className="bg-white p-1 rounded-xl flex items-center gap-1 border border-slate-200/90 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewLayout("table")}
                className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewLayout === "table" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-800"
                }`}
                title="มุมมองตารางมาตรฐาน"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewLayout("cards")}
                className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewLayout === "cards" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-800"
                }`}
                title="มุมมองการ์ด"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <span className="text-xs font-bold text-slate-600 px-2 py-1">
              ผลลัพธ์: <span className="text-indigo-700 font-black">{toThaiNumerals(filteredReports.length)}</span> รายการ
            </span>
          </div>
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 bg-indigo-50/90 border border-indigo-200/80 rounded-xl text-xs">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="p-1 bg-indigo-600 text-white rounded-lg shrink-0">
                <Filter className="w-3.5 h-3.5" />
              </span>
              <span className="text-slate-700 font-medium">ตัวกรองที่เลือก:</span>
              {searchTerm && (
                <span className="bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-md text-[11px]">
                  คำค้น: "{searchTerm}"
                </span>
              )}
              {groupFilter !== "all" && (
                <span className="bg-purple-600 text-white font-bold px-2 py-0.5 rounded-md text-[11px]">
                  กก.ตชด.{groupFilter}
                </span>
              )}
              {goalFilter !== "all" && (
                <span className="bg-amber-600 text-white font-bold px-2 py-0.5 rounded-md text-[11px]">
                  เป้าหมายด้านที่ {goalFilter}
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-md text-[11px]">
                  สถานะ: {statusFilter}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-white hover:bg-rose-50 border border-rose-200 transition cursor-pointer shrink-0 shadow-2xs"
            >
              <X className="w-3 h-3" />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          </div>
        )}

        {/* 5. Main Content: Table or Cards View */}
        {viewLayout === "table" ? (
          <div className="w-full rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-x-auto">
            <table className="w-full text-xs divide-y divide-slate-200/90 table-fixed min-w-0 w-full">
              <thead className="bg-slate-50 text-slate-700 font-extrabold text-[10px] sm:text-xs uppercase tracking-wider border-b border-slate-200/90">
                <tr>
                  <th className="px-1.5 sm:px-2.5 py-2 text-left whitespace-nowrap w-[7%] text-slate-600">รหัส</th>
                  <th className="px-2 sm:px-3 py-2 text-left w-[30%] text-slate-700">กิจกรรม / โครงการ</th>
                  <th className="px-2 sm:px-3 py-2 text-center whitespace-nowrap w-[15%] text-slate-700">เป้าหมาย กพด.</th>
                  <th className="px-2 sm:px-3 py-2 text-left w-[21%] text-slate-700">สถานศึกษา &amp; สังกัด</th>
                  <th className="px-1.5 sm:px-2 py-2 pr-6 sm:pr-8 text-center whitespace-nowrap w-[12%] text-slate-700">สถานะ</th>
                  <th className="px-1.5 sm:px-2.5 py-2 text-center whitespace-nowrap w-[15%] text-slate-700">การกระทำ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedReports.map((report, idx) => {
                  const goal = KOPODOT_GOALS.find((g) => g.id === getGoalIdFromCode(report.goalCode));
                  const grp = getSchoolGroupName(report.schoolName);
                  const shortGrp = grp ? grp.replace("กองกำกับการตำรวจตระเวนชายแดนที่", "กก.ตชด.") : "";

                  return (
                    <tr
                      key={report.id}
                      onClick={() => setPreviewReportModal(report)}
                      className={`group hover:bg-indigo-50/50 transition-colors duration-150 cursor-pointer ${
                        idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                      }`}
                    >
                      <td className="px-2 sm:px-2.5 py-2 font-mono text-[10px] sm:text-[11px] font-bold text-slate-600 whitespace-nowrap align-middle">
                        <span
                          className="bg-slate-100 group-hover:bg-indigo-100/70 group-hover:text-indigo-800 px-1.5 py-0.5 rounded-md border border-slate-200/70 group-hover:border-indigo-200 inline-block font-mono shadow-2xs text-[10px] sm:text-[11px] transition-colors"
                          title={report.id}
                        >
                          {report.id.replace("REP-SHEET-", "#")}
                        </span>
                      </td>

                      <td className="px-2 sm:px-3 py-2 align-middle min-w-0">
                        <div
                          className="font-bold text-slate-900 group-hover:text-indigo-900 text-[11px] sm:text-xs leading-snug truncate transition-colors"
                          title={report.activityName}
                        >
                          {report.activityName}
                        </div>
                        <div
                          className="text-[9.5px] sm:text-[11px] text-slate-500 font-medium leading-tight truncate mt-0.5"
                          title={report.projectName}
                        >
                          {report.projectName}
                        </div>
                      </td>

                      <td className="px-1 sm:px-2 py-2 text-xs whitespace-nowrap text-center align-middle">
                        <span
                          className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-black text-white shadow-2xs text-[9.5px] sm:text-[10.5px] tracking-tight"
                          style={{ backgroundColor: goal?.color || "#64748B" }}
                          title={`เป้าหมายที่ ${goal?.id || ""}: ${goal?.title || ""}`}
                        >
                          {report.goalCode}
                        </span>
                      </td>

                      <td className="px-2 sm:px-3 py-2 text-slate-600 text-xs align-middle min-w-0" title={report.schoolName}>
                        <div className="font-extrabold text-slate-900 text-[11px] sm:text-xs leading-snug truncate">
                          {report.schoolName}
                        </div>
                        {shortGrp && (
                          <span className="inline-block mt-0.5 text-[9px] sm:text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100/80 whitespace-nowrap">
                            {shortGrp}
                          </span>
                        )}
                      </td>

                      <td className="px-1.5 sm:px-2 py-2 pr-6 sm:pr-8 text-center whitespace-nowrap align-middle">
                        {report.status === ReportStatus.COMPLETED ? (
                          <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10.5px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200/90 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>เสร็จสิ้น</span>
                          </span>
                        ) : report.status === ReportStatus.IN_PROGRESS ? (
                          <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10.5px] font-black text-blue-800 bg-blue-50 border border-blue-200/90 shadow-2xs">
                            <Activity className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>ดำเนินการ</span>
                          </span>
                        ) : report.status === ReportStatus.OVERDUE ? (
                          <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10.5px] font-black text-rose-800 bg-rose-50 border border-rose-200/90 shadow-2xs">
                            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>ล่าช้า</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10.5px] font-black text-slate-700 bg-slate-100 border border-slate-200/90 shadow-2xs">
                            <span>ร่าง</span>
                          </span>
                        )}
                      </td>

                      <td className="px-2 sm:px-2.5 py-2 text-center whitespace-nowrap align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onSelectReport(report.id)}
                            className="inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-xs font-black text-indigo-700 bg-indigo-50/95 hover:bg-indigo-700 hover:text-white border border-indigo-200/90 transition-all duration-150 cursor-pointer shadow-2xs active:scale-95"
                            title="เปิดดูและแก้ไขรายงาน"
                          >
                            <Pencil className="w-3 h-3 shrink-0 text-indigo-600 group-hover:text-white" />
                            <span className="hidden sm:inline">ดูรายงาน A4</span>
                            <span className="inline sm:hidden">แก้ไข</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {paginatedReports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 font-semibold bg-slate-50/40">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Search className="w-7 h-7 text-slate-300" />
                        <p className="text-sm font-bold text-slate-500">ไม่พบรายงานกิจกรรมที่ตรงตามเงื่อนไข</p>
                        <p className="text-xs text-slate-400">ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองเป้าหมายและสังกัดใหม่</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Cards View Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {paginatedReports.map((report) => {
              const goal = KOPODOT_GOALS.find((g) => g.id === getGoalIdFromCode(report.goalCode));
              const grp = getSchoolGroupName(report.schoolName);
              const shortGrp = grp ? grp.replace("กองกำกับการตำรวจตระเวนชายแดนที่", "กก.ตชด.") : "";

              return (
                <div
                  key={report.id}
                  onClick={() => setPreviewReportModal(report)}
                  className="bg-white rounded-2xl border border-slate-200/95 p-4 space-y-3 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all duration-150 active:bg-slate-50 cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/60 shadow-2xs">
                        {report.id.replace("REP-SHEET-", "#")}
                      </span>
                      <div>
                        {report.status === ReportStatus.COMPLETED ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200/90 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>เสร็จสิ้น</span>
                          </span>
                        ) : report.status === ReportStatus.IN_PROGRESS ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black text-blue-800 bg-blue-50 border border-blue-200/90 shadow-2xs">
                            <Activity className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>ดำเนินการ</span>
                          </span>
                        ) : report.status === ReportStatus.OVERDUE ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black text-rose-800 bg-rose-50 border border-rose-200/90 shadow-2xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>ล่าช้า</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black text-slate-700 bg-slate-100 border border-slate-200/90 shadow-2xs">
                            <span>ร่าง</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="space-y-1">
                      <div className="font-extrabold text-slate-900 text-sm leading-snug">
                        {report.activityName}
                      </div>
                      <div className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                        {report.projectName}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-100 max-w-full">
                        <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{report.schoolName}</span>
                      </div>
                      {shortGrp && (
                        <span className="inline-block text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-xl border border-indigo-100/80 whitespace-nowrap">
                          {shortGrp}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                    <span
                      className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-full font-black text-white shadow-2xs text-[10px] tracking-tight whitespace-nowrap shrink-0 max-w-[50%] truncate"
                      style={{ backgroundColor: goal?.color || "#64748B" }}
                    >
                      เป้าหมาย {goal ? `ด้านที่ ${goal.id}` : report.goalCode}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onSelectReport(report.id)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/90 transition shadow-2xs active:scale-95 h-9 shrink-0 whitespace-nowrap"
                        title="เปิดดูและแก้ไขรายงาน"
                      >
                        <Pencil className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                        <span className="hidden sm:inline">ดูรายงาน A4</span>
                        <span className="inline sm:hidden">แก้ไข</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 6. Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">แสดงหน้าละ:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200/90 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value={15}>15 รายการ</option>
                <option value={20}>20 รายการ</option>
                <option value={50}>50 รายการ</option>
                <option value={100}>100 รายการ</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/90 rounded-xl disabled:opacity-40 disabled:hover:bg-slate-50 disabled:hover:text-slate-600 transition-all cursor-pointer font-extrabold shadow-2xs active:scale-95"
              >
                ← ย้อนกลับ
              </button>

              <span className="text-slate-500">
                หน้า <span className="text-indigo-700 font-black">{toThaiNumerals(currentPage)}</span> จาก{" "}
                <span className="text-slate-900 font-black">{toThaiNumerals(totalPages)}</span>
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/90 rounded-xl disabled:opacity-40 disabled:hover:bg-slate-50 disabled:hover:text-slate-600 transition-all cursor-pointer font-extrabold shadow-2xs active:scale-95"
              >
                ถัดไป →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. Floating Quick Preview Modal */}
      {previewReportModal && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-hidden animate-in fade-in duration-200"
          onClick={() => setPreviewReportModal(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-3xl overflow-hidden max-h-[88vh] sm:max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const goal = KOPODOT_GOALS.find((g) => g.id === getGoalIdFromCode(previewReportModal.goalCode));
              const grp = getSchoolGroupName(previewReportModal.schoolName);
              const shortGrp = grp ? grp.replace("กองกำกับการตำรวจตระเวนชายแดนที่", "กก.ตชด.") : "";
              const gps = getSchoolGpsBySchoolName(previewReportModal.schoolName);

              return (
                <>
                  {/* Modal Header */}
                  <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-900/40 flex items-start justify-between gap-3 shrink-0">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-white/15 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg border border-white/20">
                          {previewReportModal.id.replace("REP-SHEET-", "#")}
                        </span>
                        <span
                          className="px-2.5 py-0.5 rounded-full text-white text-xs font-black shadow-xs"
                          style={{ backgroundColor: goal?.color || "#4F46E5" }}
                        >
                          {previewReportModal.goalCode} : {goal?.title ? goal.title.substring(0, 24) + "..." : ""}
                        </span>
                        {previewReportModal.status === ReportStatus.COMPLETED ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>เสร็จสิ้นสมบูรณ์</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-400/30">
                            <Activity className="w-3.5 h-3.5 text-amber-400" />
                            <span>{previewReportModal.status || "กำลังดำเนินการ"}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug break-words">
                        {previewReportModal.activityName}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 font-medium truncate">
                        โครงการ: {previewReportModal.projectName}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPreviewReportModal(null)}
                      className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                      title="ปิดหน้าต่างลอย"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-700">
                    {/* Key Info Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/80">
                      <div className="space-y-0.5">
                        <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider block">สถานศึกษา</span>
                        <p className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">{previewReportModal.schoolName}</p>
                        {shortGrp && <span className="text-[10px] font-bold text-indigo-700">{shortGrp}</span>}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider block">วันที่ดำเนินงาน</span>
                        <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">{previewReportModal.dateString || "-"}</p>
                        <span className="text-[10px] font-medium text-slate-500">{previewReportModal.reportingPeriod || "งวดปกติ"}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider block">สถานที่</span>
                        <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight truncate">{previewReportModal.location || previewReportModal.schoolName}</p>
                        <span className="text-[10px] font-medium text-slate-500 truncate block">สังกัด บก.ตชด.ภาค 2</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider block">กลุ่มเป้าหมาย/ผู้ร่วม</span>
                        <p className="text-xs sm:text-sm font-black text-indigo-900 leading-tight">
                          {extractReportParticipantCount(previewReportModal) > 0 ? `${toThaiNumerals(extractReportParticipantCount(previewReportModal))} คน` : "-"}
                        </p>
                        <span className="text-[10px] font-medium text-slate-500 truncate block">{previewReportModal.targetGroup || "นักเรียนและบุคลากร"}</span>
                      </div>
                    </div>

                    {/* Section 1: Objectives & Steps */}
                    <div className="space-y-3.5">
                      <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/90 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-black text-indigo-950">
                          <Target className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>วัตถุประสงค์ของกิจกรรม</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                          {previewReportModal.objectives || "ไม่มีข้อมูลวัตถุประสงค์ระบุไว้"}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                          <ClipboardList className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>ลำดับขั้นตอนและรายละเอียดการดำเนินกิจกรรม</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                          {previewReportModal.details || "ไม่มีข้อมูลรายละเอียดกิจกรรมระบุไว้"}
                        </p>
                      </div>
                    </div>

                    {/* Section 2: Outcomes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>ผลผลิตเชิงปริมาณ</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                          {previewReportModal.quantitativeOutcome || "เป็นไปตามเป้าหมายจำนวนผู้เข้าร่วม"}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-200/80 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-black text-sky-950">
                          <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                          <span>ผลลัพธ์เชิงคุณภาพ</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                          {previewReportModal.qualitativeOutcome || "ผู้เข้าร่วมได้รับความรู้และทักษะตามเป้าหมายของแผน"}
                        </p>
                      </div>
                    </div>

                    {/* Section 3: Problems & Suggestions */}
                    {(previewReportModal.problems || previewReportModal.suggestions) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {previewReportModal.problems && (
                          <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-black text-rose-950">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>ปัญหาและอุปสรรค</span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">
                              {previewReportModal.problems}
                            </p>
                          </div>
                        )}
                        {previewReportModal.suggestions && (
                          <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                              <ThumbsUp className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>ข้อเสนอแนะแนวทางแก้ไข</span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">
                              {previewReportModal.suggestions}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Section 4: GPS & Navigation if available */}
                    {gps && (
                      <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold text-indigo-900">
                            พิกัดภูมิศาสตร์: {gps[0]}, {gps[1]}
                          </span>
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${gps[0]},${gps[1]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
                        >
                          เปิดแผนที่ GPS
                        </a>
                      </div>
                    )}

                    {/* Section 5: Officers */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-100/70 border border-slate-200/80">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white text-indigo-600 flex items-center justify-center border border-slate-200 shrink-0 shadow-2xs">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider block">ผู้จัดทำรายงาน</span>
                          <p className="text-xs font-bold text-slate-900 truncate">{previewReportModal.reportedBy || "ครูผู้รับผิดชอบโครงการ"}</p>
                          <p className="text-[10px] text-slate-500 truncate">{previewReportModal.reportPosition || "ครูผู้สอน / ผู้รับผิดชอบกิจกรรม"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white text-emerald-600 flex items-center justify-center border border-slate-200 shrink-0 shadow-2xs">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider block">ผู้ตรวจสอบและรับรอง</span>
                          <p className="text-xs font-bold text-slate-900 truncate">{previewReportModal.verifiedBy || "ครูใหญ่ประจำสถานศึกษา"}</p>
                          <p className="text-[10px] text-slate-500 truncate">{previewReportModal.verifiedPosition || "ครูใหญ่ รร.ตชด."}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200/90 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewReportModal(null)}
                      className="px-4 py-2 text-xs font-extrabold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200/90 rounded-xl transition-all cursor-pointer shadow-2xs"
                    >
                      ปิดหน้าต่าง
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const targetId = previewReportModal.id;
                        setPreviewReportModal(null);
                        onSelectReport(targetId);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white text-xs font-black rounded-xl shadow-md hover:shadow-indigo-200/60 hover:from-indigo-700 hover:to-indigo-900 transition-all cursor-pointer active:scale-95 border border-indigo-500/30"
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      <span>เปิดดูรายงานฉบับสมบูรณ์ (A4 Document)</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
