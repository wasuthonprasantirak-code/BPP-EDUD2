import React, { useState, useMemo } from "react";
import { ActivityReport } from "../types";
import { 
  Calendar, FileText, Building2, GraduationCap, CheckCircle2, 
  Map as MapIcon, ArrowRightLeft, Sparkles, TrendingUp, BarChart2,
  Award, Users, ChevronRight, ChevronUp, History, Search, X, 
  ShieldCheck, RefreshCw, Layers, AlertTriangle, QrCode, Maximize2, ExternalLink
} from "lucide-react";
import { AutoFitSingleLineText } from "./AutoFitSingleLineText";
import { ReportQrCodeModal } from "./ReportQrCodeModal";
import { DashboardFullBanner } from "./DashboardFullBanner";

const formatWithComma = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === "") return "0";
  const num = typeof val === "string" ? parseFloat(val.replace(/,/g, "")) : val;
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-US");
};

export interface DashboardExecutiveHeroProps {
  kpis: {
    total: number;
    totalParticipants: number;
    completed: number;
    completionRate: number;
    inProgress: number;
    overdue: number;
    draft: number;
  };
  overviewStats: {
    activeSchoolsCount: number;
    totalTargetSchools: number;
    coveragePercent: number;
    smoothPercent: number;
    problemPercent: number;
    missingSchoolsCount: number;
    totalReports: number;
    groupBreakdown: Array<{
      code: string;
      groupShortTitle: string;
      fullGroupTitle: string;
      totalSchools: number;
      activeSchools: number;
      totalReports: number;
      progressPercent: number;
    }>;
  };
  learningCenterStats: {
    totalVisitors: number;
    totalActivities: number;
    activeSchoolsCount: number;
  };
  dailyReportStats: Array<{
    rawDate: string;
    dateLabel: string;
    reportsCount: number;
    schoolsCount: number;
    percent: number;
    reports?: ActivityReport[];
  }>;
  allDailyReportStats: Array<{
    rawDate: string;
    dateLabel: string;
    reportsCount: number;
    schoolsCount: number;
    percent: number;
    reports?: ActivityReport[];
  }>;
  weeklyAndMonthlyMetrics: {
    weeklyReportCount: number;
    weeklySchoolCount: number;
    weeklyParticipantsCount: number;
    weeklyCompletedRate: number;
    monthlyReportCount: number;
    monthlySchoolCount: number;
    monthlyParticipantsCount: number;
    topGoal: {
      code: string;
      title: string;
    };
  };
  weeklyFilterOptions: {
    currentWeek: {
      id: string;
      label: string;
      subtitle: string;
      optionText: string;
      isCurrentWeek?: boolean;
    };
    totalWeeks: number;
    reversedWeeksList: Array<{
      id: string;
      optionText: string;
    }>;
    weekMap: Map<string, any>;
  };
  monthlyFilterOptions: {
    currentMonth: {
      monthName: string;
      yearBE: number;
    };
    currentQuarter: {
      quarterNum: number;
      rangeText: string;
    };
    currentYearBE: number;
    monthsList: any[];
    reversedMonthsList: Array<{
      id: string;
      optionText: string;
    }>;
    monthMap: Map<string, any>;
  };
  topGoalsList: Array<{
    code: string;
    title: string;
    count: number;
  }>;
  targetGroupClassroomList: Array<{
    name: string;
    count: number;
  }>;
  selectedDailyHistoryDate: string | null;
  setSelectedDailyHistoryDate: React.Dispatch<React.SetStateAction<string | null>>;
  dailyHistorySearch: string;
  setDailyHistorySearch: React.Dispatch<React.SetStateAction<string>>;
  isDailyHistoryInlineOpen: boolean;
  setIsDailyHistoryInlineOpen: React.Dispatch<React.SetStateAction<boolean>>;
  dailyHistoryViewMode: "grid" | "table";
  setDailyHistoryViewMode: React.Dispatch<React.SetStateAction<"grid" | "table">>;
  selectedWeekFilter: string;
  setSelectedWeekFilter: (val: string) => void;
  selectedMonthFilter: string;
  setSelectedMonthFilter: (val: string) => void;
  selectedAcademicYear: string;
  selectedQuarter: string;
  selectedMonth: string;
  topSearch: string;
  resetTimeFilters: () => void;
  onSelectReport: (reportId: string) => void;
  onOpenExecutiveOnePage?: () => void;
  onOpenThailandMap?: () => void;
  onOpenOfflineModal?: () => void;
  onAutoFetchData?: () => void;
  isSyncing?: boolean;
  offlineDraftsCount?: number;
  setSelectedGroup: (groupTitle: string) => void;
  setShowLearningCenterModal: (show: boolean) => void;
  setShowMissingSchoolsModal: (show: boolean) => void;
  onSelectGoalFilter?: (goalCode: string) => void;
  onOpenBannerCustomizer?: (pageKey: string) => void;
  reports?: ActivityReport[];
}

export const DashboardExecutiveHero: React.FC<DashboardExecutiveHeroProps> = ({
  kpis,
  overviewStats,
  learningCenterStats,
  dailyReportStats,
  allDailyReportStats,
  weeklyAndMonthlyMetrics,
  weeklyFilterOptions,
  monthlyFilterOptions,
  topGoalsList,
  targetGroupClassroomList,
  selectedDailyHistoryDate,
  setSelectedDailyHistoryDate,
  dailyHistorySearch,
  setDailyHistorySearch,
  isDailyHistoryInlineOpen,
  setIsDailyHistoryInlineOpen,
  selectedWeekFilter,
  setSelectedWeekFilter,
  selectedMonthFilter,
  setSelectedMonthFilter,
  selectedAcademicYear,
  selectedQuarter,
  selectedMonth,
  topSearch,
  resetTimeFilters,
  onSelectReport,
  onOpenExecutiveOnePage,
  onOpenThailandMap,
  onOpenOfflineModal,
  onAutoFetchData,
  isSyncing = false,
  offlineDraftsCount = 0,
  setSelectedGroup,
  setShowLearningCenterModal,
  setShowMissingSchoolsModal,
  onSelectGoalFilter,
  onOpenBannerCustomizer,
  reports = [],
}) => {
  const [showQrModal, setShowQrModal] = useState(false);
  const [analyticsActiveTab, setAnalyticsActiveTab] = useState<"weekly" | "monthly" | "both">("both");

  // Ensure topGoalsList has all 8 goals for perfect card height symmetry
  const paddedTopGoalsList = useMemo(() => {
    const list = [...topGoalsList];
    const ALL_8_GOALS = [
      { code: "ด้านที่ 1", title: "โภชนาการและสุขภาพอนามัย", count: 0 },
      { code: "ด้านที่ 2", title: "การบริหารและบริการวิชาการ", count: 0 },
      { code: "ด้านที่ 3", title: "การศึกษาขั้นพื้นฐาน", count: 0 },
      { code: "ด้านที่ 4", title: "อาชีวศึกษาและฝึกอาชีพ", count: 0 },
      { code: "ด้านที่ 5", title: "อนุรักษ์วัฒนธรรมและภูมิปัญญา", count: 0 },
      { code: "ด้านที่ 6", title: "อนุรักษ์ทรัพยากรธรรมชาติ", count: 0 },
      { code: "ด้านที่ 7", title: "การพัฒนาชุมชนและโครงสร้าง", count: 0 },
      { code: "ด้านที่ 8", title: "สถาบันและองค์กรชุมชน", count: 0 },
    ];
    const existingCodes = new Set(list.map(g => g.code));
    for (const defGoal of ALL_8_GOALS) {
      if (list.length >= 8) break;
      if (!existingCodes.has(defGoal.code)) {
        list.push(defGoal);
        existingCodes.add(defGoal.code);
      }
    }
    return list.slice(0, 8);
  }, [topGoalsList]);

  // Ensure targetGroupClassroomList has exactly 8 items matching topGoalsList height
  const paddedTargetGroupList = useMemo(() => {
    const list = [...targetGroupClassroomList];
    const DEFAULT_TARGET_GROUPS = [
      { name: "นักเรียนระดับประถมศึกษา", count: 0 },
      { name: "นักเรียนระดับมัธยมศึกษา / ปฐมวัย", count: 0 },
      { name: "ครูและบุคลากรทางการศึกษา", count: 0 },
      { name: "ผู้ปกครองและเกษตรกรในพื้นที่", count: 0 },
      { name: "ชุมชนและประชาชนรอบโรงเรียน", count: 0 },
      { name: "คณะกรรมการสถานศึกษาขั้นพื้นฐาน", count: 0 },
      { name: "กลุ่มศิษย์เก่าและเยาวชน ตชด.", count: 0 },
      { name: "หน่วยงานภาคีและจิตอาสา", count: 0 },
    ];
    const existingNames = new Set(list.map(i => i.name));
    for (const defGroup of DEFAULT_TARGET_GROUPS) {
      if (list.length >= 8) break;
      if (!existingNames.has(defGroup.name)) {
        list.push(defGroup);
        existingNames.add(defGroup.name);
      }
    }
    return list.slice(0, 8);
  }, [targetGroupClassroomList]);

  return (
    <div className="space-y-4 sm:space-y-5 w-full">
      {/* 1. Grand Royal Patronage Plan Full Banner (รูปแบบที่ 1: แบนเนอร์ภาพเดี่ยวเต็มผืนด้านบนสุด) */}
      <DashboardFullBanner
        overviewStats={overviewStats}
        kpis={kpis}
        onOpenQrModal={() => setShowQrModal(true)}
        onOpenCustomizer={onOpenBannerCustomizer}
        reports={reports}
        dailyReportStats={dailyReportStats}
      />

      {/* Main 2-Column Responsive Dashboard Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch w-full">
        {/* ========================================================================= */}
        {/* LEFT / MAIN COLUMN (GIS Map, 4 Stat Cards, Police Groups, Goals) */}
        {/* ========================================================================= */}
        <div className="xl:col-span-7 2xl:col-span-8 min-w-0 w-full space-y-4 sm:space-y-5 flex flex-col justify-start h-full">
          
          {/* 2. Interactive GIS Regional Map Tab CTA Card (Moved up to top row) */}
        <div 
          id="gis-map-cta-card"
          className="hidden sm:flex app-card-surface flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-blue-50/40 via-white to-indigo-50/40 hover:to-indigo-50/70 transition-all duration-300 p-4 sm:p-5"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <MapIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 
                className="typo-app-h3 text-slate-950 font-black leading-snug text-[19.8125px]"
                style={{ fontSize: "19.8125px" }}
              >
                แผนที่ภูมิสารสนเทศ (GIS) 53 โรงเรียน ตชด.
              </h3>
              <p 
                id="gis-map-subtext"
                className="hidden sm:block text-slate-500 mt-0.5 leading-relaxed text-[11px] sm:!text-[9.5px] md:!text-[9.5px] lg:!text-[13.5px]"
              >
                <span>วิเคราะห์ที่ตั้งโรงเรียน พิกัด ละติจูด ลองจิจูด ความสูงเหนือน้ำทะเล และสถานะความคืบหน้ารายโครงการ ตชด. ด้วยระบบแผนที่เชิงโต้ตอบแบบเรียลไทม์</span>
              </p>
            </div>
          </div>
          {onOpenThailandMap && (
            <button
              type="button"
              onClick={onOpenThailandMap}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-[13px] shadow-sm hover:shadow-md active:scale-98 transition-all shrink-0 cursor-pointer"
            >
              <MapIcon className="w-4 h-4" />
              <span>เปิดระบบแผนที่สารสนเทศ GIS เต็มรูปแบบ</span>
              <ArrowRightLeft className="w-3.5 h-3.5 opacity-80" />
            </button>
          )}
        </div>

        {/* 3. 4 Stat Metric Cards in 1 Row - Balanced across Mobile, Tablet (4 cols), and Desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-3.5 items-stretch">
          {/* Card 1: รายงานทั้งหมด */}
          <div className="app-card-surface p-3 sm:p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">รายงานทั้งหมด</span>
              <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600">
                <FileText className="w-4 h-4 shrink-0" />
              </div>
            </div>
            <div className="my-2 space-y-0.5">
              <p className="text-base sm:text-lg font-black text-indigo-700 tracking-tight">
                {formatWithComma(kpis.total)} <span className="text-[11px] sm:text-xs font-extrabold text-slate-400">รายงาน</span>
              </p>
              <p className="text-[11px] font-bold text-slate-500 truncate" title={`ผู้เข้าร่วม ${formatWithComma(kpis.totalParticipants)} คน`}>
                ผู้เข้าร่วม {formatWithComma(kpis.totalParticipants)} คน
              </p>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-indigo-600 border-t border-slate-100 pt-1.5">
              <span className="truncate">รวมทุกเป้าหมายโครงการ</span>
              <span className="text-indigo-700 font-extrabold shrink-0">ครบ 100%</span>
            </div>
          </div>

          {/* Card 2: ความครอบคลุม */}
          <div className="app-card-surface p-3 sm:p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">ความครอบคลุม</span>
              <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600">
                <Building2 className="w-4 h-4 shrink-0" />
              </div>
            </div>
            <div className="my-2 space-y-1">
              <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {overviewStats.activeSchoolsCount}
                <span className="text-slate-400 font-extrabold text-[11px] sm:text-xs"> / {overviewStats.totalTargetSchools} แห่ง</span>
              </p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${overviewStats.coveragePercent}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-extrabold text-emerald-600 border-t border-slate-100 pt-1.5">
              <span>{overviewStats.coveragePercent}% สำเร็จ</span>
              <span className="text-slate-400 font-medium">เป้าหมาย 100%</span>
            </div>
          </div>

          {/* Card 3: ศูนย์การเรียนรู้ชุมชน */}
          <div 
            onClick={() => setShowLearningCenterModal(true)}
            className="app-card-surface p-3 sm:p-3.5 flex flex-col justify-between cursor-pointer hover:border-sky-300 hover:shadow-md transition-all group relative overflow-hidden"
            title="คลิกเพื่อดูสถิติประชาชนที่เข้ามาใช้งานศูนย์การเรียนรู้ของโรงเรียนโดยละเอียด"
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider group-hover:text-sky-700 transition">
                ศูนย์การเรียนรู้ชุมชน
              </span>
              <div className="p-1 rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-100 group-hover:text-sky-700 transition">
                <GraduationCap className="w-4 h-4 shrink-0" />
              </div>
            </div>
            <div className="my-2 space-y-0.5">
              <p className="text-base sm:text-lg font-black text-sky-700 tracking-tight flex items-baseline gap-1">
                {learningCenterStats.totalVisitors.toLocaleString()}
                <span className="text-[11px] sm:text-xs font-extrabold text-slate-400">คน</span>
              </p>
              <p className="text-[11px] font-bold text-slate-500 truncate" title={`${learningCenterStats.totalActivities} กิจกรรม (${learningCenterStats.activeSchoolsCount} รร.)`}>
                {formatWithComma(learningCenterStats.totalActivities)} กิจกรรม (ใน {learningCenterStats.activeSchoolsCount} รร.)
              </p>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-sky-600 border-t border-slate-100 pt-1.5">
              <span className="truncate">ประชาชนเข้าใช้บริการ</span>
              <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-extrabold flex items-center gap-0.5 shrink-0">
                ดูสถิติ <ChevronRight className="w-2.5 h-2.5 inline" />
              </span>
            </div>
          </div>

          {/* Card 4: รับรองผลแล้ว */}
          <div className="app-card-surface p-3 sm:p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">รับรองผลแล้ว</span>
              <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              </div>
            </div>
            <div className="my-2 space-y-0.5">
              <p className="text-base sm:text-lg font-black text-emerald-600 tracking-tight">
                {formatWithComma(kpis.completed)} <span className="text-[11px] sm:text-xs font-extrabold text-slate-400">รายงาน</span>
              </p>
              <p className="text-[11px] font-bold text-slate-500 truncate">
                อัตราสำเร็จ {kpis.completionRate}% (ราบรื่น)
              </p>
            </div>
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold border-t border-slate-100 pt-1.5">
              <span className="text-slate-500 truncate">รอตรวจ {formatWithComma(kpis.inProgress + kpis.overdue + kpis.draft)} รายงาน</span>
              <span className="text-emerald-600 font-extrabold truncate">ติดขัด {overviewStats.problemPercent}%</span>
            </div>
          </div>

          {/* Warning Banner if any school is missing */}
          {overviewStats.missingSchoolsCount > 0 && (
            <div className="col-span-1 sm:col-span-2 lg:col-span-4 bg-rose-50/85 border border-rose-200/90 p-3 sm:p-4 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-rose-900 text-xs uppercase tracking-wider">สถานะยังไม่ส่งรายงาน</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-800">
                      ต้องติดตาม {overviewStats.missingSchoolsCount} แห่ง
                    </span>
                  </div>
                  <p className="text-rose-700 font-medium mt-0.5 text-xs">
                    เร่งรัดติดตามการส่งรายงานในสังกัด 4 กองกำกับการ เพื่อให้บรรลุเป้าหมายครบ 100%
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMissingSchoolsModal(true)}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1.5 self-end sm:self-auto"
              >
                <span>ดูรายชื่อโรงเรียนที่ยังไม่ส่ง</span>
                <span className="bg-rose-700 px-1.5 py-0.5 rounded-md text-[10px]">{overviewStats.missingSchoolsCount}</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. Progress of Police Groups (กก.ตชด. 21 - 24) & Sync/Refresh Hub - 2 Columns Layout */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 min-w-0">
                <h2 className="typo-app-h2 font-extrabold text-slate-900 leading-tight">
                  ความคืบหน้าการส่งรายงาน
                </h2>
                <span className="typo-app-subtext text-slate-500 font-medium">
                  (จำแนกตาม 4 กองกำกับการ กก.ตชด. 21 - 24 และกลุ่มภาพรวม)
                </span>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 shrink-0">
              รวม 53 โรงเรียน
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Cards 1-4: The 4 BPP Groups */}
            {overviewStats.groupBreakdown.map((group) => {
              const colorTheme = 
                group.code === "21" ? { border: "border-indigo-200/90", bg: "bg-indigo-50/40 hover:bg-indigo-50/70", text: "text-indigo-950", badge: "bg-indigo-100/90 text-indigo-900 border border-indigo-200", bar: "bg-indigo-600", provs: "สุรินทร์, บุรีรัมย์, ชัยภูมิ, โคราช" } :
                group.code === "22" ? { border: "border-sky-200/90", bg: "bg-sky-50/40 hover:bg-sky-50/70", text: "text-sky-950", badge: "bg-sky-100/90 text-sky-900 border border-sky-200", bar: "bg-sky-600", provs: "อุบลฯ, อำนาจฯ, ศรีสะเกษ, ยโสธร" } :
                group.code === "23" ? { border: "border-teal-200/90", bg: "bg-teal-50/40 hover:bg-teal-50/70", text: "text-teal-950", badge: "bg-teal-100/90 text-teal-900 border border-teal-200", bar: "bg-teal-600", provs: "สกลนคร, มุกดาหาร, นครพนม" } :
                { border: "border-amber-200/90", bg: "bg-amber-50/40 hover:bg-amber-50/70", text: "text-amber-950", badge: "bg-amber-100/90 text-amber-900 border border-amber-200", bar: "bg-amber-600", provs: "อุดรธานี, เลย, หนองคาย, บึงกาฬ" };

              return (
                <div 
                  key={group.code} 
                  className={`p-3.5 sm:p-4 rounded-2xl border ${colorTheme.border} ${colorTheme.bg} hover:shadow-xs transition duration-200 flex flex-col justify-between space-y-3`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 style={{ fontSize: "16px" }} className={`font-black ${colorTheme.text} truncate text-sm sm:text-base`}>
                          {group.groupShortTitle}
                        </h3>
                      </div>
                      <span className={`text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shrink-0 ${colorTheme.badge}`}>
                        {group.progressPercent}%
                      </span>
                    </div>
                    <AutoFitSingleLineText 
                      className="text-slate-500 font-bold mt-1 text-xs" 
                      maxFontSize={12} 
                      minFontSize={7} 
                      title={colorTheme.provs}
                    >
                      {colorTheme.provs}
                    </AutoFitSingleLineText>
                  </div>

                  <div className="space-y-1.5 bg-white/60 p-2.5 rounded-xl border border-black/5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 gap-1.5 min-w-0">
                      <span className="whitespace-nowrap truncate min-w-0">ส่งแล้ว {group.activeSchools}/{group.totalSchools} โรงเรียน</span>
                      <span className="text-[11px] text-slate-500 font-semibold whitespace-nowrap shrink-0">
                        (ขาด {group.totalSchools - group.activeSchools})
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${colorTheme.bar}`} 
                        style={{ width: `${group.progressPercent}%` }} 
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/70 gap-2 text-xs">
                    <span className="font-extrabold text-slate-700 truncate whitespace-nowrap">
                      รายงาน <span style={{ fontSize: "15.5px" }} className="text-indigo-700 font-black">{group.totalReports}</span> ครั้ง
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGroup(group.fullGroupTitle);
                        const targetEl = document.getElementById("target-schools-section");
                        if (targetEl) targetEl.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="text-[11px] font-extrabold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer flex items-center gap-0.5 whitespace-nowrap ml-auto"
                    >
                      <span>ดูโรงเรียน</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Card 5: กลุ่มภาพรวม บก.ตชด.ภาค 2 */}
            <div className="p-3.5 sm:p-4 rounded-2xl border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50/80 hover:shadow-xs transition duration-200 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    <h3 style={{ fontSize: "16px" }} className="font-black text-emerald-950 text-sm sm:text-base truncate">
                      กลุ่มภาพรวม บก.ตชด.ภาค 2
                    </h3>
                  </div>
                  <span className="text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-200/90 text-emerald-900 border border-emerald-300 shrink-0 whitespace-nowrap">
                    {overviewStats.coveragePercent}%
                  </span>
                </div>
                <AutoFitSingleLineText 
                  className="text-emerald-800 font-bold mt-1 text-xs" 
                  maxFontSize={12} 
                  minFontSize={7}
                >
                  ครบ 4 กองกำกับการ รวม 53 โรงเรียน
                </AutoFitSingleLineText>
              </div>

              <div className="space-y-1.5 bg-white/60 p-2.5 rounded-xl border border-emerald-200/50">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 gap-1.5 min-w-0">
                  <span className="whitespace-nowrap truncate">ส่งแล้ว {overviewStats.activeSchoolsCount}/53 โรงเรียน</span>
                  <span className="text-[11px] font-bold text-emerald-700 whitespace-nowrap shrink-0">
                    {overviewStats.missingSchoolsCount > 0 ? `ขาด ${overviewStats.missingSchoolsCount} แห่ง` : "ครบ 100%"}
                  </span>
                </div>
                <div className="w-full bg-emerald-200/80 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500" 
                    style={{ width: `${overviewStats.coveragePercent}%` }} 
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-emerald-200/80 text-xs gap-2">
                <span className="font-extrabold text-emerald-950 truncate whitespace-nowrap">
                  รายงานสะสม <span style={{ fontSize: "14.5px" }} className="text-emerald-700 font-black">{overviewStats.totalReports}</span> ครั้ง
                </span>
                <button
                  type="button"
                  onClick={() => setShowMissingSchoolsModal(true)}
                  className="text-[11px] font-extrabold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer flex items-center gap-0.5 whitespace-nowrap ml-auto"
                >
                  <span>ตรวจรายชื่อ</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Card 6: กลุ่มรีเฟรช & ซิงค์ข้อมูล */}
            <div className="p-3.5 sm:p-4 rounded-2xl border border-indigo-200/90 bg-indigo-50/40 hover:bg-indigo-50/70 hover:shadow-xs transition duration-200 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <RefreshCw className="w-4 h-4 text-indigo-700 shrink-0" />
                    <h3 style={{ fontSize: "16px" }} className="font-black text-indigo-950 text-sm sm:text-base truncate">
                      กลุ่มรีเฟรช & ซิงก์ข้อมูล
                    </h3>
                  </div>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                    ออนไลน์
                  </span>
                </div>
                <p className="text-slate-500 font-medium text-xs mt-1 truncate" title="ค้างสถิติไว้สำหรับการใช้งาน ไม่ประมวลผลซ้ำๆ จนกว่าจะออกจากหน้านี้และเข้ามาใหม่จะประมวลผลใหม่หนึ่งครั้ง">
                  ค้างสถิติคงที่สำหรับการใช้งาน (ประมวลผลใหม่เมื่อเข้าหน้านี้ใหม่)
                </p>
              </div>

              <div className="flex items-center gap-2">
                {onAutoFetchData && (
                  <button
                    type="button"
                    onClick={onAutoFetchData}
                    disabled={isSyncing}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-extrabold text-xs shadow-2xs transition active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    title="คลิกเพื่อดึงข้อมูลอัปเดตล่าสุดจาก Google Sheets ทันที"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    <span>{isSyncing ? "กำลังดึงข้อมูล..." : "รีเฟรชดึงข้อมูล"}</span>
                  </button>
                )}

                {onOpenOfflineModal && (
                  <button
                    type="button"
                    onClick={onOpenOfflineModal}
                    className="py-2 px-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer shrink-0 shadow-2xs"
                    title="เปิดศูนย์ข้อมูลออฟไลน์และแคช"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-indigo-100 text-[11px] text-slate-600">
                <span>แบบร่างออฟไลน์: <strong className="text-slate-900 font-black">{offlineDraftsCount}</strong> ฉบับ</span>
                <span className="text-emerald-700 font-bold">พร้อมใช้งาน</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Top Goals & Target Group Classrooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch flex-1 mt-0">
          {/* Top Goals (แสดงครบทั้ง 8 ด้าน) */}
          <div className="app-card-surface bg-slate-50/80 border border-slate-200 p-4 sm:p-4.5 rounded-2xl flex flex-col justify-between h-full flex-1 space-y-3 min-h-[460px]">
            <div className="flex items-center justify-between gap-2 min-w-0 h-7 pb-1 border-b border-slate-200/60">
              <h3 className="typo-app-h3 flex items-center gap-1.5 min-w-0 text-sm sm:text-base">
                <Award className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="break-words font-extrabold">เป้าหมายหลัก 8 ด้าน</span>
              </h3>
              <span className="text-[10px] sm:text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 shrink-0">
                ครบทั้ง 8 ด้าน
              </span>
            </div>
            <div className="space-y-2 flex-1 flex flex-col justify-between pt-1">
              {paddedTopGoalsList.map((goal, idx) => (
                <div 
                  key={goal.code} 
                  onClick={() => {
                    if (onSelectGoalFilter) {
                      onSelectGoalFilter(goal.code);
                    }
                  }}
                  className="min-h-[42px] py-1.5 flex items-center justify-between text-xs font-bold bg-white px-3 rounded-xl border border-slate-100 hover:border-indigo-400 hover:bg-indigo-50/70 hover:shadow-xs transition cursor-pointer group gap-2 flex-1"
                  title={`คลิกเพื่อเด้งไปหน้ารายงาน A4 แสดงเฉพาะ ${goal.code}`}
                >
                  <span className="text-slate-800 group-hover:text-indigo-950 font-bold pr-1 min-w-0 flex-1 leading-snug break-words text-xs truncate">
                    <span className="font-black text-indigo-900 mr-1">{idx + 1}. {goal.code}:</span>
                    <span>{goal.title}</span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0 whitespace-nowrap self-center">
                    <span className="font-black text-indigo-700 bg-indigo-50 group-hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-100 text-xs transition">
                      {goal.count}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Target Group Classrooms */}
          <div className="app-card-surface bg-slate-50/80 border border-slate-200 p-4 sm:p-4.5 rounded-2xl flex flex-col justify-between h-full flex-1 space-y-3">
            <div className="flex items-center justify-between gap-2 min-w-0 h-7 pb-1 border-b border-slate-200/60">
              <h3 className="typo-app-h3 flex items-center gap-1.5 min-w-0 text-sm sm:text-base">
                <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="break-words font-extrabold">กลุ่มเป้าหมาย</span>
              </h3>
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 shrink-0">
                รวมผู้เข้าร่วม {formatWithComma(kpis.totalParticipants)} คน
              </span>
            </div>
            <div className="space-y-2 flex-1 flex flex-col justify-between pt-1">
              {paddedTargetGroupList.map((item, idx) => (
                <div 
                  key={item.name} 
                  className="min-h-[42px] py-1.5 flex items-center justify-between text-xs font-bold bg-white px-3 rounded-xl border border-slate-100 gap-2 flex-1"
                >
                  <span className="text-slate-800 font-black pr-1 min-w-0 flex-1 leading-snug break-words text-xs truncate">
                    {idx + 1}. {item.name}
                  </span>
                  <span className="font-black text-emerald-700 shrink-0 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 text-xs self-center whitespace-nowrap">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT SIDEBAR COLUMN (Daily Submission Stats, Weekly & Monthly Analytics) */}
      {/* ========================================================================= */}
      <div className="xl:col-span-5 2xl:col-span-4 min-w-0 w-full space-y-4 sm:space-y-5 flex flex-col justify-between h-full">
        
        {/* 1. Daily Submission Statistics (4-Day Rolling Overview) */}
        <div id="daily-submissions-card-section" className="app-card-surface space-y-3.5 p-4 sm:p-5 flex-1 flex flex-col">
          <div className="border-b border-slate-100 pb-3 space-y-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 
                  className="typo-app-h3 text-base sm:text-lg md:text-[21px] font-black text-slate-900 tracking-tight leading-snug whitespace-normal break-words"
                >
                  สถิติการส่งรายงานประจำวัน (4 วันล่าสุด)
                </h3>
              </div>
            </div>

            {/* บรรทัดที่สอง: ปุ่มตรวจดูย้อนหลัง */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setIsDailyHistoryInlineOpen(!isDailyHistoryInlineOpen)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-[11.5px] font-extrabold transition-all border border-slate-200/80 cursor-pointer shadow-2xs active:scale-[0.99]"
                title={isDailyHistoryInlineOpen ? "คลิกเพื่อย่อกลับเป็น 4 วันล่าสุด" : "คลิกเพื่อดูสถิติย้อนหลังทั้งหมด"}
              >
                {isDailyHistoryInlineOpen ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                    <span>ย่อกลับ</span>
                  </>
                ) : (
                  <>
                    <History className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ตรวจดูย้อนหลัง</span>
                    <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] bg-indigo-600 text-white rounded-full font-extrabold ml-0.5">
                      {allDailyReportStats.length}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          <p 
            style={{ fontSize: "12px", width: "444px", maxWidth: "100%" }}
            className="typo-app-subtext text-slate-500 font-medium leading-relaxed"
          >
            ข้อมูลเปรียบเทียบการส่งรายงาน 4 วันที่มีการส่งล่าสุด (นับจากวันเวลาที่ส่งรายงานจริง)
          </p>

          {/* Dynamic Display: Collapsed (4 Recent Days) vs Expanded */}
          {!isDailyHistoryInlineOpen ? (
            /* 4 Daily Cards Stack - Responsive grid on tablet portrait, vertical column on desktop sidebar */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 flex-1 overflow-y-auto pr-0.5 custom-scrollbar">
              {dailyReportStats.map((stat, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (stat.reports && stat.reports.length > 0 && stat.reports[0].id) {
                      onSelectReport(stat.reports[0].id);
                    }
                  }}
                  className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 p-2.5 space-y-1.5 cursor-pointer hover:border-emerald-300 hover:bg-slate-50/50"
                  title="คลิกเพื่อดูรายงานประจำวันนี้"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 text-slate-800 font-bold text-xs truncate">
                      <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate text-[11px] sm:text-[9px] lg:text-[11px] xl:text-xs">{stat.dateLabel}</span>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/60 text-[11px] font-black shrink-0">
                      {stat.reportsCount} รายงาน
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                    <span className="text-slate-500">ส่งแล้ว:</span>
                    <span className="font-bold text-slate-800">{stat.schoolsCount} รร. ({stat.percent}%)</span>
                  </div>

                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${stat.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Expanded Search & List */
            <div className="space-y-3 pt-1">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={dailyHistorySearch}
                  onChange={(e) => setDailyHistorySearch(e.target.value)}
                  placeholder="ค้นหาวันที่ เช่น สิงหาคม หรือ 2569..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder:text-slate-400"
                />
                {dailyHistorySearch && (
                  <button
                    type="button"
                    onClick={() => setDailyHistorySearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                {(() => {
                  const filtered = allDailyReportStats.filter((item) => {
                    if (!dailyHistorySearch.trim()) return true;
                    return item.dateLabel.toLowerCase().includes(dailyHistorySearch.toLowerCase().trim());
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-500">
                        ไม่พบข้อมูลวันที่ "{dailyHistorySearch}"
                      </div>
                    );
                  }

                  return filtered.map((stat, idx) => {
                    const isSelected = selectedDailyHistoryDate === stat.rawDate;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedDailyHistoryDate(prev => prev === stat.rawDate ? null : stat.rawDate);
                        }}
                        className={`rounded-xl border transition-all p-2.5 space-y-1.5 cursor-pointer text-left text-xs ${
                          isSelected
                            ? "bg-indigo-50 border-indigo-500 shadow-xs ring-1 ring-indigo-500/20"
                            : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-bold text-slate-800 truncate text-[11px] sm:text-[9px] lg:text-[11px] xl:text-xs">{stat.dateLabel}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-black shrink-0 ${
                            isSelected ? "bg-indigo-600 text-white" : "bg-blue-50 text-blue-600 border border-blue-200/60"
                          }`}>
                            {stat.reportsCount} รายงาน
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-600">
                          <span>ส่งแล้ว: {stat.schoolsCount} รร. ({stat.percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isSelected ? "bg-indigo-600" : "bg-emerald-500"}`}
                            style={{ width: `${stat.percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>

        {/* 2. Weekly & Recent Monthly Statistics Analytics Card Widget */}
        <div id="weekly-monthly-analytics-widget" className="app-card-surface p-0 overflow-hidden space-y-0 mt-auto shadow-xs border border-slate-200/90 rounded-2xl">
          {/* Header with Title & Tab Switcher */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white px-3.5 py-3 sm:px-4 sm:py-3.5 border-b border-indigo-950 flex flex-col gap-2.5 rounded-t-2xl">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-800/90 text-amber-300 flex items-center justify-center shrink-0 border border-indigo-700/60 shadow-xs">
                <BarChart2 className="w-4 h-4 text-amber-300" />
              </div>
              <div id="weekly-monthly-stats-header-title-box" className="min-w-0 flex-1 p-1.5 rounded-xl bg-white/5 border border-white/10">
                <h3 className="font-black text-white tracking-tight leading-snug text-[15px] sm:text-[16px]">
                  สถิติประจำสัปดาห์ & ประจำเดือน
                </h3>
                <p className="text-[11.5px] text-indigo-200/90 font-medium leading-tight mt-0.5">
                  สรุปผลการดำเนินงานประมวลผลย้อนหลัง
                </p>
              </div>
            </div>

            {/* Segmented View Mode Switcher (ย้ายมาไว้บรรทัดล่างสุดของกล่องหัวข้อ) */}
            <div className="flex items-center justify-between pt-1.5 border-t border-indigo-800/50">
              <span className="text-[11.5px] font-bold text-indigo-200/90">รูปแบบการแสดงผล:</span>
              <div className="inline-flex p-0.5 bg-indigo-950/90 rounded-xl border border-indigo-700/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setAnalyticsActiveTab("weekly")}
                  className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    analyticsActiveTab === "weekly"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-indigo-200 hover:text-white"
                  }`}
                >
                  สัปดาห์
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsActiveTab("monthly")}
                  className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    analyticsActiveTab === "monthly"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-indigo-200 hover:text-white"
                  }`}
                >
                  เดือน
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsActiveTab("both")}
                  className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    analyticsActiveTab === "both"
                      ? "bg-slate-700 text-white shadow-xs"
                      : "text-indigo-200 hover:text-white"
                  }`}
                >
                  ดูทั้งคู่
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 space-y-3">
            {/* Card 1: สถิติประจำสัปดาห์ */}
            {(analyticsActiveTab === "weekly" || analyticsActiveTab === "both") && (
              <div className="bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/30 text-slate-900 rounded-2xl p-3.5 sm:p-4 border border-indigo-100/90 shadow-2xs space-y-3 relative overflow-hidden transition-all duration-200">
                <div className="flex flex-col gap-1.5 border-b border-indigo-100/80 pb-2.5 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200/60 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                      สถิติประจำสัปดาห์
                    </h3>
                  </div>

                  <div className="pl-9 -mt-0.5 min-w-0">
                    <p className="text-xs text-slate-500 font-medium leading-tight">
                      {selectedWeekFilter === "all_weeks" ? (
                        <span className="font-semibold text-slate-700">ภาพรวมสัปดาห์สะสมทั้งหมด</span>
                      ) : (
                        (() => {
                          const cur = selectedWeekFilter === "this_week"
                            ? weeklyFilterOptions.currentWeek
                            : (weeklyFilterOptions.weekMap.get(selectedWeekFilter) || weeklyFilterOptions.currentWeek);
                          return cur ? (
                            <>
                              <span className="font-semibold text-slate-700">{cur.label} {cur.isCurrentWeek ? "(รอบปัจจุบัน)" : ""}</span>
                              <span className="text-slate-500 ml-1 font-normal">{cur.subtitle}</span>
                            </>
                          ) : null;
                        })()
                      )}
                    </p>
                  </div>

                  <div className="pt-1 w-full">
                    <select
                      value={selectedWeekFilter}
                      onChange={(e) => setSelectedWeekFilter(e.target.value)}
                      className="bg-white text-slate-800 border border-slate-200 text-xs font-extrabold px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-2xs w-full"
                    >
                      <option value="this_week">
                        ⭐ สัปดาห์ปัจจุบัน ({weeklyFilterOptions.currentWeek.optionText})
                      </option>
                      <option value="all_weeks">
                        📊 สะสมทุกสัปดาห์ ({weeklyFilterOptions.totalWeeks} สัปดาห์)
                      </option>
                      {weeklyFilterOptions.reversedWeeksList.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.optionText}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2x2 Grid Stats */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-white rounded-xl p-2.5 border border-indigo-100/80 shadow-2xs flex flex-col justify-between">
                    <p className="text-[11px] text-slate-500 font-bold">ส่งรายงานแล้ว</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-base sm:text-lg font-black text-indigo-700 tracking-tight">
                        {formatWithComma(weeklyAndMonthlyMetrics.weeklyReportCount)}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">ฉบับ</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-2.5 border border-indigo-100/80 shadow-2xs flex flex-col justify-between">
                    <p className="text-[11px] text-slate-500 font-bold">สถานศึกษาที่ส่ง</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        {weeklyAndMonthlyMetrics.weeklySchoolCount}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">/ 53 รร.</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-2.5 border border-amber-100/80 shadow-2xs flex flex-col justify-between">
                    <p className="text-[11px] text-slate-500 font-bold">ผู้เข้าร่วมกิจกรรม</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-base sm:text-lg font-black text-amber-600 tracking-tight">
                        {formatWithComma(weeklyAndMonthlyMetrics.weeklyParticipantsCount)}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">คน</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-2.5 border border-emerald-100/80 shadow-2xs flex flex-col justify-between">
                    <p className="text-[11px] text-slate-500 font-bold">อัตราการรับรองผล</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-base sm:text-lg font-black text-emerald-600 tracking-tight">
                        {weeklyAndMonthlyMetrics.weeklyCompletedRate}%
                      </span>
                      <span className="text-[10.5px] font-bold text-emerald-600/80">สมบูรณ์</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-indigo-100/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>สถานะ: การรายงานขับเคลื่อนต่อเนื่อง</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    เรียบร้อย
                  </span>
                </div>
              </div>
            )}

            {/* Card 2: สถิติประจำเดือน */}
            {(analyticsActiveTab === "monthly" || analyticsActiveTab === "both") && (
              <div className="bg-gradient-to-br from-amber-50/50 via-white to-slate-50/60 text-slate-900 rounded-2xl p-3.5 sm:p-4 border border-amber-200/60 shadow-2xs space-y-3 relative overflow-hidden transition-all duration-200">
                <div className="flex flex-col gap-1.5 border-b border-amber-100/80 pb-2.5 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 border border-amber-200/60 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                      สถิติประจำเดือน
                    </h3>
                  </div>

                  <div className="pl-9 -mt-0.5 min-w-0">
                    <p className="text-xs text-slate-500 font-medium leading-tight truncate">
                      {selectedMonthFilter === "all_months" ? (
                        <span className="font-semibold text-slate-700">ภาพรวมสะสมทุกเดือน</span>
                      ) : selectedMonthFilter === "this_month" ? (
                        <span className="font-semibold text-slate-700">ประจำเดือน{monthlyFilterOptions.currentMonth.monthName} พ.ศ. {monthlyFilterOptions.currentMonth.yearBE} (เดือนปัจจุบัน)</span>
                      ) : (
                        (() => {
                          const matched = monthlyFilterOptions.monthMap.get(selectedMonthFilter);
                          return matched ? (
                            <span className="font-semibold text-slate-700">ประจำเดือน{matched.monthName} พ.ศ. {matched.yearBE}</span>
                          ) : (
                            <span className="font-semibold text-slate-700">ประจำเดือน{monthlyFilterOptions.currentMonth.monthName} พ.ศ. {monthlyFilterOptions.currentMonth.yearBE}</span>
                          );
                        })()
                      )}
                    </p>
                  </div>

                  <div className="pt-1 w-full">
                    <select
                      value={selectedMonthFilter}
                      onChange={(e) => setSelectedMonthFilter(e.target.value)}
                      className="bg-white text-slate-800 border border-slate-200 text-xs font-extrabold px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer shadow-2xs w-full"
                    >
                      <option value="this_month">
                        ⭐ เดือนปัจจุบัน ({monthlyFilterOptions.currentMonth.monthName} {monthlyFilterOptions.currentMonth.yearBE})
                      </option>
                      <option value="all_months">
                        📊 สะสมทุกเดือน (รวม {monthlyFilterOptions.monthsList.length} เดือน)
                      </option>
                      {monthlyFilterOptions.reversedMonthsList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.optionText}
                        </option>
                      ))}
                      <option value="current_quarter">
                        ไตรมาส {monthlyFilterOptions.currentQuarter.quarterNum} ({monthlyFilterOptions.currentQuarter.rangeText})
                      </option>
                      <option value="year_current">
                        สะสมตลอดปี {monthlyFilterOptions.currentYearBE}
                      </option>
                    </select>
                  </div>
                </div>

                {/* 2x2 Grid Stats */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-white rounded-xl p-2.5 border border-amber-100/80 shadow-2xs flex flex-col justify-between">
                    <p className="text-[11px] text-slate-500 font-bold">รายงานประจำเดือน</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        {formatWithComma(weeklyAndMonthlyMetrics.monthlyReportCount)}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">ฉบับ</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-2.5 border border-amber-100/80 shadow-2xs flex flex-col justify-between">
                    <p className="text-[11px] text-slate-500 font-bold">สถานศึกษาที่ส่ง</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        {weeklyAndMonthlyMetrics.monthlySchoolCount}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">/ 53 รร.</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-2.5 border border-amber-100/80 shadow-2xs flex flex-col justify-between">
                    <p className="text-[11px] text-slate-500 font-bold">ผู้เข้าร่วมสะสม</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-base sm:text-lg font-black text-amber-600 tracking-tight">
                        {formatWithComma(weeklyAndMonthlyMetrics.monthlyParticipantsCount)}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">คน</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-2.5 border border-indigo-100/80 shadow-2xs flex flex-col justify-between">
                    <p className="text-[11px] text-slate-500 font-bold">เป้าหมายเด่น</p>
                    <p className="text-xs font-extrabold text-indigo-700 mt-1 truncate" title={weeklyAndMonthlyMetrics.monthlyReportCount > 0 ? `${weeklyAndMonthlyMetrics.topGoal.code}: ${weeklyAndMonthlyMetrics.topGoal.title}` : "ไม่มีรายงาน"}>
                      {weeklyAndMonthlyMetrics.monthlyReportCount > 0 
                        ? `${weeklyAndMonthlyMetrics.topGoal.code}: ${weeklyAndMonthlyMetrics.topGoal.title}`
                        : "ไม่มีรายงาน"}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-100/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>ความครอบคลุม: ประมวลผลระดับ บก.ตชด.ภาค 2</span>
                  <span className="text-amber-600 font-bold flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    ตรงเป้าหมาย
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Modal: คิวอาร์โค้ดสำหรับสแกนเพื่อเขียนรายงาน */}
    <ReportQrCodeModal 
      isOpen={showQrModal} 
      onClose={() => setShowQrModal(false)} 
    />
  </div>
);
};
