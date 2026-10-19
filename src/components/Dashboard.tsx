import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { ActivityReport, ReportStatus, KOPODOT_GOALS, KopodotGoal, getGoalIdFromCode, normalizeGoalCode } from "../types";
import { ROYAL_EMBLEM_IMAGE } from "../data/emblemLogo";
import { OFFICIAL_TARGET_SCHOOLS, TargetSchool, isSchoolMatch, getSchoolGpsBySchoolName, updateCustomSchoolAddress } from "../data/schoolsData";
import { OFFICIAL_INDICATORS, ActivityIndicator } from "../data/indicatorsData";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart as RechartsLineChart, Line, LabelList 
} from "recharts";
import { 
  Heart, GraduationCap, Sprout, Trees, Compass, Users, Award, 
  ClipboardList, ClipboardCheck, ThumbsUp, AlertTriangle, Coins, Target, School, 
  Search, MapPin, Map as MapIcon, BookOpen, CheckCircle2, ChevronRight, ChevronLeft, HelpCircle, 
  TrendingUp, Sparkles, ArrowUpRight, Activity, Percent, ShieldCheck, MoveRight,
  RefreshCw, BarChart2, Building2, Calendar, Clock, Filter, ChevronUp, ChevronDown, FileText, X, Trophy,
  Scale, Tv, FileSpreadsheet, Printer, ShieldAlert, Image as ImageIcon, Video, Layers, Send, Download, ArrowRightLeft, Wifi, WifiOff, FileCheck, Trash2,
  Eye, ExternalLink, UserCheck, Users2, Calculator, List, History, RotateCcw,
  Globe, Monitor, Smartphone, Tablet, Settings2, Sliders, Plus, BarChart3
} from "lucide-react";
import { SchoolComparisonModal } from "./SchoolComparisonModal";
import { ExecutivePresentationModal } from "./ExecutivePresentationModal";
import { VisitorRatingSection } from "./VisitorRatingSection";
import { GroupChecklistPdfModal, BppGroupData } from "./GroupChecklistPdfModal";
import { AutoFitSingleLineText } from "./AutoFitSingleLineText";
import { DashboardExecutiveHero } from "./DashboardExecutiveHero";
import { sanitizeWindowsFilename, createWindowsSafeCsvBlob, triggerWindowsFileDownload } from "../lib/windowsUtils";
import { aggregateTeacherReports, extractTeachersFromReport } from "../lib/teacherUtils";
import {
  parseSafeDate,
  parseReportDateDetails as safeParseReportDateDetails,
  parseReportSubmissionDateDetails,
  safeParseNumber,
  formatNumberWithComma,
  formatThaiNumberWithComma,
  toThaiNumerals,
  normalizeThaiDigits,
  detectBrowserEnvironment,
  THAI_MONTH_FULL,
  THAI_MONTH_SHORT,
  ParsedDateResult,
  extractReportParticipantCount,
  parseParticipantCountFromText
} from "../lib/safeDateUtils";

interface DashboardProps {
  reports: ActivityReport[];
  isActive?: boolean;
  onSelectReport: (reportId: string) => void;
  onAutoFetchData?: () => void;
  onOpenAnnualReport2568?: () => void;
  onOpenSubmissionTracker?: () => void;
  onOpenPhotoGallery?: () => void;
  onOpenVideoGallery?: () => void;
  onOpenExecutiveSummary?: () => void;
  onOpenExecutiveOnePage?: () => void;
  onOpenExecutiveStation?: () => void;
  onOpenMultiPhaseTracker?: () => void;
  onOpenBatchExport?: () => void;
  onOpenColumnMapper?: () => void;
  onOpenOfflineModal?: () => void;
  isOnline?: boolean;
  offlineDraftsCount?: number;
  isSyncing?: boolean;
  onSelectSchoolFilter?: (schoolName: string) => void;
  onSelectGoalFilter?: (goalCode: string) => void;
  onOpenSchoolDirectoryModal?: (schoolName?: string) => void;
  onBookSchoolReport?: (schoolName: string) => void;
  onOpenThailandMap?: () => void;
  onOpenRankingsAndHonor?: () => void;
  onOpenReportsDirectory?: () => void;
  onOpenKpiConsistencyExplorer?: () => void;
  onOpenBannerCustomizer?: (pageKey: string) => void;
}

export const parseReportDateDetails = (r: ActivityReport) => {
  return safeParseReportDateDetails(r);
};

export const parseReportTimestampDetails = (r: ActivityReport) => {
  return parseReportSubmissionDateDetails(r);
};

export interface ExtractedReporter {
  displayName: string;
  canonicalKey: string;
  canonRank: string;
  cleanNameOnly: string;
}

/**
 * Normalizes reporter names and ranks to merge duplicate submissions accurately:
 * - Uses the central teacherUtils deduplication engine
 * - Standardizes police rank prefixes (e.g. ด.ต., ส.ต.อ., ร.ต.อ.) and titles (นาย, นาง, นางสาว)
 * - Sets canonicalKey to pure teacher name key so identical names merge across different ranks
 */
export const extractAndNormalizeReporters = (raw: string): ExtractedReporter[] => {
  const teachers = extractTeachersFromReport(raw);
  return teachers.map((t) => ({
    displayName: t.displayName,
    canonicalKey: t.canonicalNameKey,
    canonRank: t.rankCanon,
    cleanNameOnly: t.cleanNameOnly,
  }));
};

export const getSchoolMissingPeriods = (schoolName: string, reports: ActivityReport[], preFilteredReports?: ActivityReport[]) => {
  const schoolReports = preFilteredReports || reports.filter(r => isSchoolMatch(r.schoolName, schoolName));
  
  const submittedMonths = new Set<number>();
  const submittedQuarters = new Set<string>();
  
  // Find the first row of data of the data source
  // Since reports is sorted by latest first, the first row of the original data source (the oldest) is the last element
  const firstRow = reports.length > 0 ? reports[reports.length - 1] : null;
  const firstRowDt = firstRow ? parseReportDateDetails(firstRow) : null;
  
  // Determine start (minMonth) from the first row of data of the data source.
  // Default to May (5) if not found or invalid
  const currentMinMonth = (firstRowDt && firstRowDt.month && firstRowDt.month >= 1 && firstRowDt.month <= 12) 
    ? firstRowDt.month 
    : 5;
  
  // The present day (current month of today). Do not count into the future!
  const today = new Date();
  let currentMaxMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  
  // Cap/default to August (8) of 2026 if current clock is in a different year
  if (currentYear !== 2026) {
    currentMaxMonth = 8; // August 2026
  }
  
  // Ensure maxMonth is not less than minMonth
  if (currentMaxMonth < currentMinMonth) {
    currentMaxMonth = currentMinMonth;
  }

  let currentMinQuarter = "Q1";
  if (currentMinMonth <= 3) currentMinQuarter = "Q1";
  else if (currentMinMonth <= 6) currentMinQuarter = "Q2";
  else if (currentMinMonth <= 9) currentMinQuarter = "Q3";
  else currentMinQuarter = "Q4";

  let currentMaxQuarter = "Q2";
  if (currentMaxMonth <= 3) currentMaxQuarter = "Q1";
  else if (currentMaxMonth <= 6) currentMaxQuarter = "Q2";
  else if (currentMaxMonth <= 9) currentMaxQuarter = "Q3";
  else currentMaxQuarter = "Q4";

  schoolReports.forEach(r => {
    const dt = parseReportDateDetails(r);
    if (dt) {
      submittedMonths.add(dt.month);
      submittedQuarters.add(dt.quarter);
    }
    
    const periodStr = (r.reportingPeriod || "").toLowerCase();
    
    if (periodStr.includes("ไตรมาส 1") || periodStr.includes("ไตรมาสที่ 1") || periodStr.includes("q1") || periodStr.includes("งวดที่ 1") || periodStr.includes("ระยะที่ 1") || periodStr.includes("รอบที่ 1") || periodStr.includes("ครั้งที่ 1")) {
      submittedQuarters.add("Q1");
    }
    if (periodStr.includes("ไตรมาส 2") || periodStr.includes("ไตรมาสที่ 2") || periodStr.includes("q2") || periodStr.includes("งวดที่ 2") || periodStr.includes("ระยะที่ 2") || periodStr.includes("รอบที่ 2") || periodStr.includes("ครั้งที่ 2")) {
      submittedQuarters.add("Q2");
    }
    if (periodStr.includes("ไตรมาส 3") || periodStr.includes("ไตรมาสที่ 3") || periodStr.includes("q3") || periodStr.includes("งวดที่ 3") || periodStr.includes("ระยะที่ 3") || periodStr.includes("รอบที่ 3") || periodStr.includes("ครั้งที่ 3")) {
      submittedQuarters.add("Q3");
    }
    if (periodStr.includes("ไตรมาส 4") || periodStr.includes("ไตรมาสที่ 4") || periodStr.includes("q4") || periodStr.includes("งวดที่ 4") || periodStr.includes("ระยะที่ 4") || periodStr.includes("รอบที่ 4") || periodStr.includes("ครั้งที่ 4")) {
      submittedQuarters.add("Q4");
    }
    
    THAI_MONTH_FULL.forEach((mName, idx) => {
      if (idx > 0 && (periodStr.includes(mName.toLowerCase()) || (r.dateString || "").toLowerCase().includes(mName.toLowerCase()))) {
        submittedMonths.add(idx);
      }
    });
    THAI_MONTH_SHORT.forEach((mName, idx) => {
      if (idx > 0 && (periodStr.includes(mName.toLowerCase()) || (r.dateString || "").toLowerCase().includes(mName.toLowerCase()))) {
        submittedMonths.add(idx);
      }
    });
  });
  
  // Quarters: strictly from start of data (currentMinQuarter) to present data point (currentMaxQuarter)
  const allQuarters = ["Q1", "Q2", "Q3", "Q4"];
  const minQIndex = allQuarters.indexOf(currentMinQuarter);
  const maxQIndex = allQuarters.indexOf(currentMaxQuarter);
  const expectedQuarters = allQuarters.slice(
    minQIndex >= 0 ? minQIndex : 0, 
    maxQIndex >= 0 ? maxQIndex + 1 : 2
  );
  const missingQuarters = expectedQuarters.filter(q => !submittedQuarters.has(q));
  
  // Months: strictly from minMonth (start of data) up to maxMonth (present data point)
  const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const expectedMonths = allMonths.filter(m => m >= currentMinMonth && m <= currentMaxMonth);
  const missingMonths = expectedMonths.filter(m => !submittedMonths.has(m));
  
  return {
    missingQuarters,
    missingMonths,
    expectedQuarters,
    expectedMonths,
    currentMinMonth,
    currentMaxMonth,
    currentMinQuarter,
    currentMaxQuarter,
    hasReports: schoolReports.length > 0
  };
};

// Map goal id to distinctive icons for the interactive explorer
const getGoalIcon = (id: number) => {
  switch (id) {
    case 1: return <Heart className="w-4.5 h-4.5" />;
    case 2: return <GraduationCap className="w-4.5 h-4.5" />;
    case 3: return <BookOpen className="w-4.5 h-4.5" />;
    case 4: return <Sprout className="w-4.5 h-4.5" />;
    case 5: return <Trees className="w-4.5 h-4.5" />;
    case 6: return <Compass className="w-4.5 h-4.5" />;
    case 7: return <Users className="w-4.5 h-4.5" />;
    case 8: return <Award className="w-4.5 h-4.5" />;
    default: return <Target className="w-4.5 h-4.5" />;
  }
};

const formatWithComma = (val: number | string | undefined | null): string => {
  return formatNumberWithComma(val);
};

interface InCardSchoolEditorProps {
  school: TargetSchool;
  onClose: () => void;
  onSaved: () => void;
}

const InCardSchoolEditor: React.FC<InCardSchoolEditorProps> = ({ school, onClose, onSaved }) => {
  const defaultGps = getSchoolGpsBySchoolName(school.name);
  const [village, setVillage] = useState(school.village || "");
  const [villageNo, setVillageNo] = useState(school.villageNo || "");
  const [subdistrict, setSubdistrict] = useState(school.subdistrict || "");
  const [district, setDistrict] = useState(school.district || "");
  const [province, setProvince] = useState(school.province || "");
  const [latitude, setLatitude] = useState(school.latitude || (defaultGps?.[0] ? String(defaultGps[0]) : ""));
  const [longitude, setLongitude] = useState(school.longitude || (defaultGps?.[1] ? String(defaultGps[1]) : ""));
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCustomSchoolAddress(school.id, {
      village: village.trim(),
      villageNo: villageNo.trim(),
      subdistrict: subdistrict.trim(),
      district: district.trim(),
      province: province.trim(),
      latitude: latitude.trim(),
      longitude: longitude.trim(),
    });
    setIsSaved(true);
    setTimeout(() => {
      onSaved();
      onClose();
    }, 450);
  };

  const previewAddress = `หมู่ที่ ${villageNo.trim() || "-"} บ้าน${village.trim() || "-"} ตำบล${subdistrict.trim() || "-"} อำเภอ${district.trim() || "-"} จังหวัด${province.trim() || "-"}`;

  return (
    <div 
      className="p-3.5 sm:p-4 lg:p-5 rounded-2xl border-2 border-indigo-500 bg-gradient-to-b from-indigo-50/80 via-white to-indigo-50/40 shadow-lg shadow-indigo-100/60 flex flex-col justify-between space-y-3.5 transition-all duration-200 animate-in fade-in zoom-in-95"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-indigo-200/90">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-indigo-700 font-black text-xs">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
            <span className="truncate">แก้ไขข้อมูลที่อยู่และพิกัด GPS</span>
          </div>
          <h4 className="font-black text-slate-900 text-xs sm:text-sm tracking-tight truncate mt-0.5" title={school.name}>
            {school.name}
          </h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shrink-0"
          title="ปิดหน้าจอแก้ไข"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSave} className="space-y-2.5">
        {/* Village & Village No */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <label className="block text-[10.5px] font-bold text-slate-700">ชื่อหมู่บ้าน</label>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="เช่น ศรีสวัสดิ์"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-semibold text-slate-800"
            />
          </div>
          <div className="space-y-0.5">
            <label className="block text-[10.5px] font-bold text-slate-700">หมู่ที่</label>
            <input
              type="text"
              value={villageNo}
              onChange={(e) => setVillageNo(e.target.value)}
              placeholder="เช่น 5"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-semibold text-slate-800"
            />
          </div>
        </div>

        {/* Subdistrict, District, Province */}
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-0.5">
            <label className="block text-[10.5px] font-bold text-slate-700">ตำบล</label>
            <input
              type="text"
              value={subdistrict}
              onChange={(e) => setSubdistrict(e.target.value)}
              required
              placeholder="เช่น ศรีแก้ว"
              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-semibold text-slate-800 truncate"
            />
          </div>
          <div className="space-y-0.5">
            <label className="block text-[10.5px] font-bold text-slate-700">อำเภอ</label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              required
              placeholder="เช่น ไทยเจริญ"
              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-semibold text-slate-800 truncate"
            />
          </div>
          <div className="space-y-0.5">
            <label className="block text-[10.5px] font-bold text-slate-700">จังหวัด</label>
            <input
              type="text"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              required
              placeholder="เช่น ยโสธร"
              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-semibold text-slate-800 truncate"
            />
          </div>
        </div>

        {/* GPS Coordinates */}
        <div className="pt-2 border-t border-indigo-100 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10.5px] font-extrabold text-indigo-900 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-indigo-600" />
              <span>พิกัด GPS</span>
            </label>
            {latitude && longitude && (
              <a
                href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9.5px] font-bold text-indigo-700 hover:text-indigo-900 underline"
              >
                ทดสอบเปิดแผนที่
              </a>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="ละติจูด เช่น 16.137511"
              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-semibold text-slate-800 truncate"
            />
            <input
              type="text"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="ลองจิจูด เช่น 104.357834"
              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-semibold text-slate-800 truncate"
            />
          </div>
        </div>

        {/* Live Address Preview */}
        <div className="p-2 bg-indigo-100/70 rounded-xl border border-indigo-200">
          <p className="text-[9.5px] font-bold text-indigo-950 leading-snug break-words">
            <span className="font-extrabold text-indigo-900">ตัวอย่าง: </span>
            {previewAddress}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-indigo-100">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={isSaved}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition cursor-pointer shadow-xs flex items-center gap-1"
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>บันทึกแล้ว</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>บันทึกข้อมูล</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default function Dashboard({ 
  reports, 
  isActive = true,
  onSelectReport, 
  onAutoFetchData, 
  onOpenAnnualReport2568, 
  onOpenSubmissionTracker, 
  onOpenPhotoGallery, 
  onOpenVideoGallery, 
  onOpenExecutiveSummary, 
  onOpenExecutiveOnePage, 
  onOpenExecutiveStation, 
  onOpenMultiPhaseTracker, 
  onOpenBatchExport, 
  onOpenColumnMapper, 
  onOpenOfflineModal, 
  isOnline = true, 
  offlineDraftsCount = 0, 
  isSyncing, 
  onSelectSchoolFilter, 
  onSelectGoalFilter, 
  onOpenSchoolDirectoryModal, 
  onBookSchoolReport, 
  onOpenThailandMap, 
  onOpenRankingsAndHonor, 
  onOpenReportsDirectory, 
  onOpenKpiConsistencyExplorer,
  onOpenBannerCustomizer
}: DashboardProps) {
  // Freeze / Cache dataset for Dashboard:
  // "เมื่อประมวลผลเสร็จแล้วให้ค้างสถิติไว้ไม่ต้องประมวลใหม่ซ้ำๆ จนกว่าจะออกและเข้ามาหน้านี้ใหม่ค่อยประมวลใหม่หนึ่งครั้ง"
  const [frozenReports, setFrozenReports] = useState<ActivityReport[]>(() => reports);
  const wasActiveRef = useRef<boolean>(isActive);
  const reportsRef = useRef<ActivityReport[]>(reports);
  reportsRef.current = reports;

  useEffect(() => {
    // If reports were initially empty and now loaded from source, populate once
    if (frozenReports.length === 0 && reports.length > 0) {
      setFrozenReports(reports);
      return;
    }

    const currentlyActive = isActive;
    const previouslyActive = wasActiveRef.current;
    wasActiveRef.current = currentlyActive;

    // Only re-process when transitioning from inactive (out of this tab) to active (entering this page again)
    if (!previouslyActive && currentlyActive) {
      setFrozenReports(reportsRef.current);
    }
  }, [isActive, reports.length]);

  // When explicit manual refresh / sync completes, update the frozen dataset as well
  const prevSyncingRef = useRef(isSyncing);
  useEffect(() => {
    if (prevSyncingRef.current && !isSyncing && reports.length > 0) {
      setFrozenReports(reports);
    }
    prevSyncingRef.current = isSyncing;
  }, [isSyncing, reports]);

  const [selectedGoalId, setSelectedGoalId] = useState<number>(1); // Default to Goal 1: Nutrition & Health
  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("all");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedSubdistrict, setSelectedSubdistrict] = useState("all");
  const [selectedVillage, setSelectedVillage] = useState("all");
  const [gpsFilter, setGpsFilter] = useState<"all" | "has_gps" | "no_gps">("all");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [selectedSubmissionStatus, setSelectedSubmissionStatus] = useState<"all" | "submitted" | "unsubmitted">("all");
  const [indicatorSearch, setIndicatorSearch] = useState("");
  const [activeIndicatorId, setActiveIndicatorId] = useState<string>("");
  const [calcCustomNumerator, setCalcCustomNumerator] = useState<string>("");
  const [calcCustomDenominator, setCalcCustomDenominator] = useState<string>("");
  const [calcCustomTarget, setCalcCustomTarget] = useState<string>("80");
  const [showAllGoalReports, setShowAllGoalReports] = useState(false);

  // Time period & global search filters
  const [topSearch, setTopSearch] = useState("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("all");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Trend Line Chart state controls (Monthly vs Quarterly, Total vs BPP Group vs Cumulative vs School Comparison)
  const [trendGranularity, setTrendGranularity] = useState<"monthly" | "quarterly">("monthly");
  const [trendMetric, setTrendMetric] = useState<"total_vs_completed" | "by_bpp_group" | "cumulative_growth" | "school_comparison">("by_bpp_group");
  const [trendGoalFilter, setTrendGoalFilter] = useState<string>("all");
  const [compareSchoolA, setCompareSchoolA] = useState<string>("โรงเรียนตำรวจตระเวนชายแดนบ้านสร้อยทอง");
  const [compareSchoolB, setCompareSchoolB] = useState<string>("โรงเรียนตำรวจตระเวนชายแดนบ้านค่ายเจาะแอ");

  const [isOverviewExpanded, setIsOverviewExpanded] = useState(true);
  const [showMissingSchoolsModal, setShowMissingSchoolsModal] = useState(false);
  const [previewReportModal, setPreviewReportModal] = useState<ActivityReport | null>(null);
  const [showSystemPurpose, setShowSystemPurpose] = useState(true);
  const [showRankingsModal, setShowRankingsModal] = useState(false);
  const [showLearningCenterModal, setShowLearningCenterModal] = useState(false);
  const [learningCenterSearch, setLearningCenterSearch] = useState("");
  const [learningCenterTab, setLearningCenterTab] = useState<"schools" | "target_groups" | "activities">("schools");
  const [learningCenterGroupFilter, setLearningCenterGroupFilter] = useState<string>("all");
  const [showSchoolComparisonModal, setShowSchoolComparisonModal] = useState(false);
  const [showExecutivePresentationModal, setShowExecutivePresentationModal] = useState(false);
  const [showChecklistPdfModal, setShowChecklistPdfModal] = useState(false);
  const [showAllReportersModal, setShowAllReportersModal] = useState(false);
  const [showAllSchoolFreqModal, setShowAllSchoolFreqModal] = useState(false);
  const [reporterSearch, setReporterSearch] = useState("");
  const [schoolFreqSearch, setSchoolFreqSearch] = useState("");
  const [reporterModalPage, setReporterModalPage] = useState(1);
  const [schoolFreqModalPage, setSchoolFreqModalPage] = useState(1);
  const modalItemsPerPage = 10;
  const [selectedGroupDataForPdf, setSelectedGroupDataForPdf] = useState<BppGroupData | null>(null);

  const handleExportGroupPdf = useCallback((groupData: BppGroupData) => {
    setSelectedGroupDataForPdf(groupData);
    setShowChecklistPdfModal(true);
  }, []);
  const [rankingSearch, setRankingSearch] = useState("");
  const [editingSchool, setEditingSchool] = useState<TargetSchool | null>(null);
  const [addressVersion, setAddressVersion] = useState(0);

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [adminModeActive, setAdminModeActive] = useState(false);
  const [correctionTickets, setCorrectionTickets] = useState<any[]>([]);
  const [correctionVersion, setCorrectionVersion] = useState(0);

  // Inline Historical Daily Statistics at Current Position (แสดงผลที่ตำแหน่งปัจจุบัน)
  const [isDailyHistoryInlineOpen, setIsDailyHistoryInlineOpen] = useState(false);
  const [dailyHistorySearch, setDailyHistorySearch] = useState("");
  const [selectedDailyHistoryDate, setSelectedDailyHistoryDate] = useState<string | null>(null);
  const [dailyHistoryViewMode, setDailyHistoryViewMode] = useState<"grid" | "table">("grid");

  // Inline Teachers / Reporters Directory Expansion at Current Position (แสดงผลภายในสถิติเดิม)
  const [isReportersInlineOpen, setIsReportersInlineOpen] = useState(false);
  const [reporterInlineSearch, setReporterInlineSearch] = useState("");
  const [reporterInlinePage, setReporterInlinePage] = useState(1);

  // Inline School Directory & Frequency Expansion at Current Position (แสดงผลรายชื่อโรงเรียนและสถิติภายในสถิติเดิม)
  const [isSchoolsInlineOpen, setIsSchoolsInlineOpen] = useState(false);
  const [schoolInlineSearch, setSchoolInlineSearch] = useState("");
  const [schoolInlinePage, setSchoolInlinePage] = useState(1);
  const [schoolInlineViewMode, setSchoolInlineViewMode] = useState<"list" | "chart">("list");
  const [schoolChartFilter, setSchoolChartFilter] = useState<"top10" | "top20" | "by_group">("top10");

  // Website Access & Total System Visitors Analytics (Stateful & Auto-Counting Engine)
  const getInitialTrafficData = () => {
    return {
      totalVisitors: 1, // จำนวนผู้เข้ามาที่ระบบนี้ทั้งหมด
      todayVisitors: 1, // จำนวนผู้เข้าใช้งานในวันนี้
      pageviews: 1, // ยอดเปิดชมเพจสะสม
      uniqueVisitors: 1, // ผู้เข้าชมเฉพาะราย
      avgDuration: "3:45",
      bounceRate: "12.5",
      onlineNow: 2,
      resetDate: "21 ส.ค. 2569",
      resetDateFull: "21 สิงหาคม 2569",
      history7Days: [
        { day: "เสาร์", views: 0, visitors: 0 },
        { day: "อาทิตย์", views: 0, visitors: 0 },
        { day: "จันทร์", views: 0, visitors: 0 },
        { day: "อังคาร", views: 0, visitors: 0 },
        { day: "พุธ", views: 0, visitors: 0 },
        { day: "พฤหัสบดี", views: 0, visitors: 0 },
        { day: "ศุกร์ (วันนี้)", views: 1, visitors: 1 },
      ],
      topPages: [
        { name: "1. แดชบอร์ดวิเคราะห์สถิติ กพด.5", views: 1 },
        { name: "2. ผู้ช่วยอัจฉริยะ AI กพด.5", views: 0 },
        { name: "3. สถานีนำเสนอผู้บังคับบัญชา", views: 0 },
        { name: "4. ระบบวิเคราะห์ปัญหาและอุปสรรค", views: 0 },
      ],
      deviceShare: {
        desktop: 100,
        mobile: 0,
        tablet: 0,
      },
      visitorLogs: [
        {
          id: "log-init",
          timestamp: new Date().toISOString(),
          timeFormatted: "21 ส.ค. 2569 เวลา 19:42 น.",
          device: "คอมพิวเตอร์ (Desktop)",
          os: "Web Client",
          browser: "Modern Browser",
          page: "แดชบอร์ดสถิติ กพด.5",
          type: "ผู้เข้าชมระบบหลัก (System Visitor)"
        }
      ]
    };
  };

  const [trafficAnalytics, setTrafficAnalytics] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("bpp_site_traffic_analytics_v4");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            return {
              ...getInitialTrafficData(),
              ...parsed,
              totalVisitors: parsed.totalVisitors ?? parsed.uniqueVisitors ?? 1,
              todayVisitors: parsed.todayVisitors ?? 1,
            };
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    return getInitialTrafficData();
  });

  const [showTrafficResetModal, setShowTrafficResetModal] = useState(false);
  const [showVisitorLogsModal, setShowVisitorLogsModal] = useState(false);
  const [showSetBaseCounterModal, setShowSetBaseCounterModal] = useState(false);
  const [customBaseCounterInput, setCustomBaseCounterInput] = useState("");
  const [trafficToastMessage, setTrafficToastMessage] = useState<string | null>(null);

  // Auto visitor counter on initial visit per session
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const sessionKey = "bpp_system_visitor_session_registered_v4";
      const hasRegisteredSession = window.sessionStorage.getItem(sessionKey);

      const env = detectBrowserEnvironment();
      const detectedDevice = env.device;
      const detectedOs = env.os;
      const detectedBrowser = env.browser;

      const now = new Date();
      const timeStr = `${toThaiNumerals(now.getDate())} ส.ค. 2569 เวลา ${toThaiNumerals(String(now.getHours()).padStart(2, "0"))}:${toThaiNumerals(String(now.getMinutes()).padStart(2, "0"))}:${toThaiNumerals(String(now.getSeconds()).padStart(2, "0"))} น.`;

      if (!hasRegisteredSession) {
        // Register new session visit
        window.sessionStorage.setItem(sessionKey, "true");
        setTrafficAnalytics((prev: any) => {
          const newTotal = (prev.totalVisitors || 0) + 1;
          const newToday = (prev.todayVisitors || 0) + 1;
          const newPageviews = (prev.pageviews || 0) + 1;
          const newUnique = (prev.uniqueVisitors || 0) + 1;

          const newLog = {
            id: `visit-${Date.now()}`,
            timestamp: now.toISOString(),
            timeFormatted: timeStr,
            device: detectedDevice,
            os: detectedOs,
            browser: detectedBrowser,
            page: "แดชบอร์ดสถิติ กพด.5",
            type: "ผู้เข้าชมระบบรายใหม่ (New Visitor Session)"
          };

          const existingLogs = Array.isArray(prev.visitorLogs) ? prev.visitorLogs : [];
          const updatedLogs = [newLog, ...existingLogs.slice(0, 49)];

          // Update device share
          const desktopCount = updatedLogs.filter((l: any) => l.device.includes("Desktop")).length;
          const mobileCount = updatedLogs.filter((l: any) => l.device.includes("Mobile")).length;
          const tabletCount = updatedLogs.filter((l: any) => l.device.includes("Tablet")).length;
          const totalLogs = updatedLogs.length || 1;

          const updated = {
            ...prev,
            totalVisitors: newTotal,
            todayVisitors: newToday,
            pageviews: newPageviews,
            uniqueVisitors: newUnique,
            visitorLogs: updatedLogs,
            deviceShare: {
              desktop: Math.round((desktopCount / totalLogs) * 100),
              mobile: Math.round((mobileCount / totalLogs) * 100),
              tablet: Math.round((tabletCount / totalLogs) * 100),
            },
            history7Days: (prev.history7Days || []).map((item: any) => 
              item.day.includes("วันนี้") ? { ...item, views: item.views + 1, visitors: (item.visitors || 0) + 1 } : item
            )
          };

          try {
            window.localStorage.setItem("bpp_site_traffic_analytics_v4", JSON.stringify(updated));
          } catch (e) {}

          return updated;
        });
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleResetTrafficAnalytics = () => {
    const fresh = getInitialTrafficData();
    setTrafficAnalytics(fresh);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("bpp_site_traffic_analytics_v4", JSON.stringify(fresh));
      } catch (e) {
        console.error(e);
      }
    }
    setShowTrafficResetModal(false);
    setTrafficToastMessage("รีเซ็ตสถิติและตัวนับผู้เข้าใช้งานทั้งหมด เริ่มต้นนับรอบใหม่ตั้งแต่วันนี้ (21 ส.ค. 2569) เรียบร้อยแล้ว");
    setTimeout(() => {
      setTrafficToastMessage(null);
    }, 4000);
  };

  const handleSimulateVisitor = () => {
    const ua = navigator.userAgent || "";
    let detectedDevice = "คอมพิวเตอร์ (Desktop)";
    if (/tablet|ipad|playbook|silk/i.test(ua)) detectedDevice = "แท็บเล็ต (Tablet)";
    else if (/mobile|iphone|ipod|android/i.test(ua)) detectedDevice = "โทรศัพท์มือถือ (Mobile)";

    const now = new Date();
    const timeStr = `${toThaiNumerals(now.getDate())} ส.ค. 2569 เวลา ${toThaiNumerals(String(now.getHours()).padStart(2, "0"))}:${toThaiNumerals(String(now.getMinutes()).padStart(2, "0"))}:${toThaiNumerals(String(now.getSeconds()).padStart(2, "0"))} น.`;

    setTrafficAnalytics((prev: any) => {
      const newTotal = (prev.totalVisitors || 0) + 1;
      const newToday = (prev.todayVisitors || 0) + 1;
      const newPageviews = (prev.pageviews || 0) + 1;
      const newUnique = (prev.uniqueVisitors || 0) + 1;

      const newLog = {
        id: `sim-${Date.now()}`,
        timestamp: now.toISOString(),
        timeFormatted: timeStr,
        device: detectedDevice,
        os: "ระบบทดสอบบันทึกเข้าชม",
        browser: "ผู้ใช้งานจำลอง",
        page: "แดชบอร์ดสถิติ กพด.5",
        type: "บันทึกการเข้าชมจำลอง (+1 คน)"
      };

      const existingLogs = Array.isArray(prev.visitorLogs) ? prev.visitorLogs : [];
      const updatedLogs = [newLog, ...existingLogs.slice(0, 49)];

      const updated = {
        ...prev,
        totalVisitors: newTotal,
        todayVisitors: newToday,
        pageviews: newPageviews,
        uniqueVisitors: newUnique,
        visitorLogs: updatedLogs,
        history7Days: (prev.history7Days || []).map((item: any) => 
          item.day.includes("วันนี้") ? { ...item, views: item.views + 1, visitors: (item.visitors || 0) + 1 } : item
        ),
        topPages: (prev.topPages || []).map((page: any, idx: number) => 
          idx === 0 ? { ...page, views: (page.views || 0) + 1 } : page
        )
      };

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("bpp_site_traffic_analytics_v4", JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });

    setTrafficToastMessage("บันทึกจำนวนผู้เข้าชมระบบเพิ่ม +1 คน (ยอดผู้เข้าชมสะสมอัปเดตเรียลไทม์แล้ว)");
    setTimeout(() => setTrafficToastMessage(null), 3500);
  };

  const handleSetBaseCounterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(customBaseCounterInput.replace(/[^\d]/g, ""), 10);
    if (!isNaN(num) && num >= 0) {
      setTrafficAnalytics((prev: any) => {
        const updated = {
          ...prev,
          totalVisitors: num,
          pageviews: Math.max(prev.pageviews || 0, num),
        };
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem("bpp_site_traffic_analytics_v4", JSON.stringify(updated));
          } catch (err) {}
        }
        return updated;
      });
      setShowSetBaseCounterModal(false);
      setCustomBaseCounterInput("");
      setTrafficToastMessage(`ปรับตั้งค่ายอดผู้เข้าใช้งานระบบเริ่มต้นเป็น ${toThaiNumerals(num)} คน เรียบร้อยแล้ว`);
      setTimeout(() => setTrafficToastMessage(null), 4000);
    }
  };

  const handleRefreshTraffic = () => {
    setTrafficAnalytics((prev: any) => {
      const updated = {
        ...prev,
        pageviews: (prev.pageviews || 0) + 1,
        history7Days: (prev.history7Days || []).map((item: any) => 
          item.day.includes("วันนี้") ? { ...item, views: item.views + 1 } : item
        ),
        topPages: (prev.topPages || []).map((page: any, idx: number) => 
          idx === 0 ? { ...page, views: (page.views || 0) + 1 } : page
        )
      };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("bpp_site_traffic_analytics_v4", JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });
    setTrafficToastMessage("อัปเดตสถิติทราฟฟิกเว็บไซต์เรียลไทม์ล่าสุดเรียบร้อยแล้ว (+1 เพจวิว)");
    setTimeout(() => setTrafficToastMessage(null), 3000);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("admin_correction_tickets");
        if (saved) {
          setCorrectionTickets(JSON.parse(saved));
        } else {
          setCorrectionTickets([]);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [showCorrectionModal, correctionVersion]);

  useEffect(() => {
    const handleUpdate = () => {
      setAddressVersion(prev => prev + 1);
    };
    const handleOpenCorrection = () => {
      setShowCorrectionModal(true);
    };
    window.addEventListener("schoolAddressesUpdated", handleUpdate);
    window.addEventListener("openCorrectionModal", handleOpenCorrection);
    return () => {
      window.removeEventListener("schoolAddressesUpdated", handleUpdate);
      window.removeEventListener("openCorrectionModal", handleOpenCorrection);
    };
  }, []);

  // Lock body, html, and main scrolling when any modal is open to completely cancel up/down background scrolling
  useEffect(() => {
    const modalsOpen = 
      Boolean(previewReportModal) ||
      Boolean(showMissingSchoolsModal) ||
      Boolean(showRankingsModal) ||
      Boolean(showAllReportersModal) ||
      Boolean(showAllSchoolFreqModal) ||
      Boolean(showVisitorLogsModal) ||
      Boolean(showTrafficResetModal) ||
      Boolean(showSetBaseCounterModal) ||
      Boolean(showSchoolComparisonModal) ||
      Boolean(showExecutivePresentationModal) ||
      Boolean(showChecklistPdfModal) ||
      Boolean(showCorrectionModal) ||
      Boolean(editingSchool);

    if (modalsOpen) {
      const originalStyleBody = document.body.style.overflow;
      const originalStyleHtml = document.documentElement.style.overflow;
      const originalBodyOverscroll = document.body.style.overscrollBehavior;
      const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;
      
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "contain";
      document.documentElement.style.overscrollBehavior = "contain";
      
      const mainEl = document.querySelector("main");
      let originalStyleMain = "";
      if (mainEl) {
        originalStyleMain = mainEl.style.overflow;
        mainEl.style.overflow = "hidden";
      }

      // Prevent touch & wheel scrolling of background when modal is active
      const preventTouchScroll = (e: TouchEvent) => {
        const target = e.target as HTMLElement | null;
        const scrollableModal = target?.closest(".modal-scrollable-content");
        if (!scrollableModal) {
          e.preventDefault();
        }
      };

      const preventWheelScroll = (e: WheelEvent) => {
        const target = e.target as HTMLElement | null;
        const scrollableModal = target?.closest(".modal-scrollable-content");
        if (!scrollableModal) {
          e.preventDefault();
        }
      };
      
      document.addEventListener("touchmove", preventTouchScroll, { passive: false });
      window.addEventListener("wheel", preventWheelScroll, { passive: false });
      
      return () => {
        document.body.style.overflow = originalStyleBody;
        document.documentElement.style.overflow = originalStyleHtml;
        document.body.style.overscrollBehavior = originalBodyOverscroll;
        document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
        if (mainEl) {
          mainEl.style.overflow = originalStyleMain;
        }
        document.removeEventListener("touchmove", preventTouchScroll);
        window.removeEventListener("wheel", preventWheelScroll);
      };
    }
  }, [
    previewReportModal,
    showMissingSchoolsModal,
    showRankingsModal,
    showAllReportersModal,
    showAllSchoolFreqModal,
    showVisitorLogsModal,
    showTrafficResetModal,
    showSetBaseCounterModal,
    showSchoolComparisonModal,
    showExecutivePresentationModal,
    showChecklistPdfModal,
    showCorrectionModal,
    editingSchool,
  ]);

  // Local active dataset overriding based on approved report deletion/correction requests
  const activeReports = useMemo(() => {
    if (typeof window === "undefined") return frozenReports;
    try {
      const deletedSaved = window.localStorage.getItem("admin_deleted_report_ids");
      const editedSaved = window.localStorage.getItem("admin_edited_reports");
      const deletedIds = deletedSaved ? JSON.parse(deletedSaved) : [];
      const editedMap = editedSaved ? JSON.parse(editedSaved) : {};
      
      let result = frozenReports;
      if (deletedIds.length > 0) {
        result = result.filter(r => !deletedIds.includes(r.id));
      }
      if (Object.keys(editedMap).length > 0) {
        result = result.map(r => {
          if (editedMap[r.id]) {
            return { ...r, ...editedMap[r.id] };
          }
          return r;
        });
      }
      return result;
    } catch (e) {
      return frozenReports;
    }
  }, [frozenReports, correctionVersion]);

  // Full Single-Pass Lookup Mapping (O(1) Indexing for active reports dataset)
  const memoizedSchoolRowsMap = useMemo(() => {
    type ParsedDateInfo = {
      day: number;
      month: number;
      yearBE: number;
      yearCE: number;
      academicYearBE: number;
      quarter: string;
      dateObj: Date;
      dayOfWeek: number;
    };

    const map = new Map<string, {
      report: ActivityReport;
      _matchedSchoolKeyword: string;
      _matchedSchoolObj: typeof OFFICIAL_TARGET_SCHOOLS[number] | null;
      _cachedParsedDate: ParsedDateInfo | null;
    }>();

    activeReports.forEach((r) => {
      const rawSchoolName = (r.schoolName || "").trim();
      const matchedSchool = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(rawSchoolName, s.name)) || null;
      const _matchedSchoolKeyword = matchedSchool ? matchedSchool.name : rawSchoolName;
      
      const rawDt = parseReportDateDetails(r) || parseReportTimestampDetails(r);
      let _cachedParsedDate: ParsedDateInfo | null = null;
      if (rawDt) {
        const month = rawDt.month || 1;
        const yearBE = rawDt.yearBE || 2569;
        const academicYearBE = (rawDt as any).academicYearBE ?? (month >= 5 ? yearBE : yearBE - 1);
        const quarter = (rawDt as any).quarter ?? (month <= 3 ? "Q1" : month <= 6 ? "Q2" : month <= 9 ? "Q3" : "Q4");
        _cachedParsedDate = {
          day: rawDt.day || 1,
          month,
          yearBE,
          yearCE: rawDt.yearCE || (yearBE - 543),
          academicYearBE,
          quarter,
          dateObj: rawDt.dateObj || new Date(),
          dayOfWeek: typeof rawDt.dayOfWeek === "number" ? rawDt.dayOfWeek : 1,
        };
      }

      map.set(r.id, {
        report: r,
        _matchedSchoolKeyword,
        _matchedSchoolObj: matchedSchool,
        _cachedParsedDate,
      });
    });

    return map;
  }, [activeReports]);

  // Dynamically available academic years from report dataset (Start from first year 2569 onwards, filter out old years)
  const availableAcademicYears = useMemo(() => {
    const yearsSet = new Set<number>();
    activeReports.forEach((r) => {
      const cached = memoizedSchoolRowsMap.get(r.id);
      const dt = cached?._cachedParsedDate || parseReportDateDetails(r);
      if (dt) {
        if (dt.academicYearBE >= 2569) yearsSet.add(dt.academicYearBE);
        if (dt.yearBE >= 2569) yearsSet.add(dt.yearBE);
      }
    });
    const sorted = Array.from(yearsSet).filter((y) => y >= 2569).sort((a, b) => b - a);
    if (sorted.length === 0) return ["2569"];
    return sorted.map(String);
  }, [activeReports, memoizedSchoolRowsMap]);

  // Filtered reports list by keyword search and time period (Academic Year, Quarter, Month)
  const periodFilteredReports = useMemo(() => {
    return activeReports.filter((r) => {
      const cached = memoizedSchoolRowsMap.get(r.id);

      if (topSearch.trim()) {
        const q = topSearch.toLowerCase().trim();
        const qNorm = q.replace(/[^a-z0-9ก-๙]/g, '').replace('ชำปะโต', 'ซำปะโต');
        const schoolNameLower = (r.schoolName || "").toLowerCase();
        const matchedKeywordLower = (cached?._matchedSchoolKeyword || "").toLowerCase();
        const schoolNameNorm = schoolNameLower.replace(/[^a-z0-9ก-๙]/g, '').replace('ชำปะโต', 'ซำปะโต');
        const schoolNameCore = schoolNameNorm.replace(/รรตชด|โรงเรียนตำรวจตระเวนชายแดน|ศกรตชด|ศศช/g, '');

        const matchSchoolName =
          schoolNameLower.includes(q) ||
          matchedKeywordLower.includes(q) ||
          isSchoolMatch(q, r.schoolName) ||
          (qNorm.length >= 2 && (
            schoolNameNorm.includes(qNorm) ||
            schoolNameCore.includes(qNorm) ||
            qNorm.includes(schoolNameCore)
          ));

        const matchOther =
          (r.activityName || "").toLowerCase().includes(q) ||
          (r.projectName || "").toLowerCase().includes(q) ||
          (r.dateString || "").toLowerCase().includes(q) ||
          (r.reportingPeriod || "").toLowerCase().includes(q) ||
          (r.reportedBy || "").toLowerCase().includes(q) ||
          (r.id || "").toLowerCase().includes(q);

        if (!matchSchoolName && !matchOther) return false;
      }

      const dt = cached?._cachedParsedDate;
      if (!dt) return true; // Keep if no parseable date

      if (selectedDailyHistoryDate) {
        let dateKey = "";
        if (dt.day && dt.month && dt.yearBE) {
          dateKey = `${dt.yearBE}-${String(dt.month).padStart(2, "0")}-${String(dt.day).padStart(2, "0")}`;
        }
        if (dateKey !== selectedDailyHistoryDate && !(r.dateString || "").includes(selectedDailyHistoryDate)) {
          return false;
        }
      }

      if (selectedAcademicYear !== "all") {
        const selectedYrNum = Number(selectedAcademicYear);
        if (dt.academicYearBE !== selectedYrNum && dt.yearBE !== selectedYrNum) {
          return false;
        }
      }

      if (selectedQuarter !== "all") {
        if (dt.quarter !== selectedQuarter) {
          return false;
        }
      }

      if (selectedMonth !== "all") {
        if (String(dt.month) !== selectedMonth) {
          return false;
        }
      }

      return true;
    });
  }, [activeReports, topSearch, selectedAcademicYear, selectedQuarter, selectedMonth, selectedDailyHistoryDate, memoizedSchoolRowsMap]);

  const resetTimeFilters = () => {
    setTopSearch("");
    setSelectedAcademicYear("all");
    setSelectedQuarter("all");
    setSelectedMonth("all");
    setSelectedWeekFilter("all_weeks");
    setSelectedMonthFilter("year_2026");
    setSelectedDailyHistoryDate(null);
  };

  // Executive summary statistics matching the image design
  const overviewStats = useMemo(() => {
    const totalReports = periodFilteredReports.length;
    const totalTargetSchools = OFFICIAL_TARGET_SCHOOLS.length;
    
    // Single-pass grouping of all reports by canonical school name
    const reportsBySchool = new Map<string, ActivityReport[]>();
    activeReports.forEach((r) => {
      const canonical = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(r.schoolName, s.name))?.name || r.schoolName;
      if (!reportsBySchool.has(canonical)) {
        reportsBySchool.set(canonical, []);
      }
      reportsBySchool.get(canonical)!.push(r);
    });

    // Single-pass grouping of periodFilteredReports by canonical school name
    const periodFilteredReportsBySchool = new Map<string, ActivityReport[]>();
    periodFilteredReports.forEach((r) => {
      const cached = memoizedSchoolRowsMap.get(r.id);
      const canonical = cached?._matchedSchoolKeyword || r.schoolName;
      if (!periodFilteredReportsBySchool.has(canonical)) {
        periodFilteredReportsBySchool.set(canonical, []);
      }
      periodFilteredReportsBySchool.get(canonical)!.push(r);
    });

    // Pre-calculate missing periods of all schools once to avoid redundant computations
    const missingPeriodsMap = new Map();
    OFFICIAL_TARGET_SCHOOLS.forEach((s) => {
      const schoolReports = reportsBySchool.get(s.name) || [];
      missingPeriodsMap.set(s.name, getSchoolMissingPeriods(s.name, activeReports, schoolReports));
    });

    // Active schools that submitted at least 1 report in this period
    const activeSchools = OFFICIAL_TARGET_SCHOOLS.filter((s) =>
      periodFilteredReportsBySchool.has(s.name)
    );
    
    // Missing schools (0 reports in this period)
    const missingSchools = OFFICIAL_TARGET_SCHOOLS.filter((s) =>
      !periodFilteredReportsBySchool.has(s.name)
    );

    const missingSchoolsWithPeriods = missingSchools.map((s) => {
      const { missingQuarters, missingMonths, expectedQuarters, expectedMonths, currentMinMonth, currentMaxMonth, currentMinQuarter, currentMaxQuarter, hasReports } = missingPeriodsMap.get(s.name);
      return {
        ...s,
        missingQuarters,
        missingMonths,
        expectedQuarters,
        expectedMonths,
        currentMinMonth,
        currentMaxMonth,
        currentMinQuarter,
        currentMaxQuarter,
        hasReports,
      };
    });

    const schoolsMissingQ1 = OFFICIAL_TARGET_SCHOOLS.filter((s) => missingPeriodsMap.get(s.name).missingQuarters.includes("Q1")).length;
    const schoolsMissingQ2 = OFFICIAL_TARGET_SCHOOLS.filter((s) => missingPeriodsMap.get(s.name).missingQuarters.includes("Q2")).length;
    const schoolsMissingQ3 = OFFICIAL_TARGET_SCHOOLS.filter((s) => missingPeriodsMap.get(s.name).missingQuarters.includes("Q3")).length;
    const schoolsMissingQ4 = OFFICIAL_TARGET_SCHOOLS.filter((s) => missingPeriodsMap.get(s.name).missingQuarters.includes("Q4")).length;

    const coveragePercent = totalTargetSchools > 0 ? Math.round((activeSchools.length / totalTargetSchools) * 100) : 0;

    const overdueCount = periodFilteredReports.filter((r) => r.status === ReportStatus.OVERDUE).length;
    const smoothPercent = totalReports > 0 ? Math.max(0, Math.round(((totalReports - overdueCount) / totalReports) * 100)) : 95;
    const problemPercent = 100 - smoothPercent;

    // Group breakdown for กก.ตชด. 21, 22, 23, 24
    const groupCodes = ["21", "22", "23", "24"];
    const groupBreakdown = groupCodes.map((code) => {
      const fullGroupTitle = `กองกำกับการตำรวจตระเวนชายแดนที่ ${code}`;
      const groupShortTitle = `กก.ตชด.${code}`;
      
      const groupSchools = OFFICIAL_TARGET_SCHOOLS.filter((s) => s.groupName.includes(code));
      const groupActiveSchools = groupSchools.filter((s) =>
        periodFilteredReportsBySchool.has(s.name)
      );
      
      let groupReportsCount = 0;
      periodFilteredReports.forEach((r) => {
        const cached = memoizedSchoolRowsMap.get(r.id);
        const groupName = cached?._matchedSchoolObj?.groupName || "";
        if (groupName.includes(code)) {
          groupReportsCount++;
        }
      });

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
      missingSchools: missingSchoolsWithPeriods,
      missingSchoolsCount: missingSchools.length,
      coveragePercent,
      smoothPercent,
      problemPercent,
      groupBreakdown,
      schoolsMissingQ1,
      schoolsMissingQ2,
      schoolsMissingQ3,
      schoolsMissingQ4,
    };
  }, [periodFilteredReports, activeReports, addressVersion]);

  const [rankingSortMode, setRankingSortMode] = useState<"original" | "count">("original");

  // Automated ranking or original order of ALL target schools
  const schoolRankings = useMemo(() => {
    const list = OFFICIAL_TARGET_SCHOOLS.map((s) => {
      let count = 0;
      periodFilteredReports.forEach((r) => {
        if (isSchoolMatch(r.schoolName, s.name)) {
          count++;
        }
      });
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

    if (rankingSortMode === "original") {
      return list.sort((a, b) => a.id.localeCompare(b.id, "en"));
    }
    return list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "th"));
  }, [periodFilteredReports, addressVersion, rankingSortMode]);

  // Top 3 Outstanding Schools (ประกาศเกียรติคุณโรงเรียนดีเด่น - ส่งรายงานสูงสุด คำนวณตามจำนวนส่งจริงเสมอ)
  const topHonorSchools = useMemo(() => {
    const list = OFFICIAL_TARGET_SCHOOLS.map((s) => {
      let count = 0;
      periodFilteredReports.forEach((r) => {
        if (isSchoolMatch(r.schoolName, s.name)) {
          count++;
        }
      });
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

    const sortedByCount = list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "th"));
    return [
      sortedByCount[0] || { name: "ไม่มีข้อมูล", count: 0 },
      sortedByCount[1] || { name: "ไม่มีข้อมูล", count: 0 },
      sortedByCount[2] || { name: "ไม่มีข้อมูล", count: 0 },
    ];
  }, [periodFilteredReports, addressVersion]);

  // Top Reporters calculation based on periodFilteredReports (นับรวมคะแนนชื่อครูคนเดียวกัน และใช้ยศสูงสุด)
  const topReportersList = useMemo(() => {
    return aggregateTeacherReports(periodFilteredReports);
  }, [periodFilteredReports]);

  // Frequency by School calculation based on periodFilteredReports (จัดกลุ่มตามชื่อมาตรฐานโรงเรียนเพื่อคำนวณถูกต้องแม่นยำ)
  const topSchoolFrequencyList = useMemo(() => {
    const schoolMap: Record<string, { name: string; count: number; groupName?: string; province?: string }> = {};
    periodFilteredReports.forEach((r) => {
      const rawName = (r.schoolName || "").trim();
      if (rawName) {
        const matched = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(rawName, s.name));
        const canonicalName = matched ? matched.name : rawName;
        if (!schoolMap[canonicalName]) {
          schoolMap[canonicalName] = { 
            name: canonicalName, 
            count: 0,
            groupName: matched?.groupName,
            province: matched?.province,
          };
        }
        schoolMap[canonicalName].count++;
      }
    });
    return Object.values(schoolMap).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "th"));
  }, [periodFilteredReports, addressVersion]);

  // Chart data for School Frequency Graph
  const schoolFreqChartData = useMemo(() => {
    if (schoolChartFilter === "by_group") {
      const groupMap: Record<string, { shortName: string; fullName: string; count: number }> = {
        "21": { shortName: "กก.ตชด.21", fullName: "กก.ตชด.21 (สุรินทร์/บุรีรัมย์/ศรีสะเกษ)", count: 0 },
        "22": { shortName: "กก.ตชด.22", fullName: "กก.ตชด.22 (อุบลฯ/อำนาจเจริญ/ยโสธร)", count: 0 },
        "23": { shortName: "กก.ตชด.23", fullName: "กก.ตชด.23 (สกลนคร/นครพนม/มุกดาหาร)", count: 0 },
        "24": { shortName: "กก.ตชด.24", fullName: "กก.ตชด.24 (อุดรฯ/เลย/หนองคาย/บึงกาฬ)", count: 0 },
      };
      periodFilteredReports.forEach((r) => {
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
      if (shortName.length > 14) {
        shortName = shortName.substring(0, 13) + "...";
      }
      return {
        shortName,
        fullName: s.name,
        count: s.count,
      };
    });
  }, [topSchoolFrequencyList, schoolChartFilter, periodFilteredReports]);

  // All Daily Report Statistics for Historical Inspection Modal (สถิติรายงานย้อนหลังทั้งหมด โดยนับจากวันเวลาที่ส่ง)
  const allDailyReportStats = useMemo(() => {
    const dateMap = new Map<string, { 
      dateLabel: string; 
      dateObj: Date; 
      rawDate: string; 
      reportsCount: number; 
      schoolsSet: Set<string>; 
      reports: ActivityReport[] 
    }>();

    activeReports.forEach((r) => {
      // กำหนดเงื่อนไขของวันรายงานโดยนับจากวันเวลาที่ส่งจริง (Submission Timestamp) เป็นหลัก
      const dt = parseReportSubmissionDateDetails(r);
      let dateKey = "";
      let dateLabel = "";
      let dateObj = new Date(0);

      if (dt && dt.day && dt.month && dt.yearBE) {
        dateKey = `${dt.yearBE}-${String(dt.month).padStart(2, "0")}-${String(dt.day).padStart(2, "0")}`;
        const monthName = THAI_MONTH_FULL[dt.month] || "";
        dateLabel = `${dt.day} ${monthName} พ.ศ. ${dt.yearBE}`;
        dateObj = (dt as any).dateObj || new Date(dt.yearCE, dt.month - 1, dt.day);
      } else if (r.timestamp || r.lastUpdated || r.dateString) {
        const raw = (r.timestamp || r.lastUpdated || r.dateString || "").trim();
        dateKey = raw;
        dateLabel = raw;
      }

      if (dateKey) {
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {
            dateLabel,
            dateObj,
            rawDate: dateKey,
            reportsCount: 0,
            schoolsSet: new Set<string>(),
            reports: [],
          });
        }
        const entry = dateMap.get(dateKey)!;
        entry.reportsCount++;
        if (r.schoolName) {
          const cached = memoizedSchoolRowsMap.get(r.id);
          const canonicalName = cached?._matchedSchoolKeyword || r.schoolName.trim();
          entry.schoolsSet.add(canonicalName);
        }
        entry.reports.push(r);
      }
    });

    // Sort descending by submission timestamp date
    const sortedDates = Array.from(dateMap.values()).sort((a, b) => {
      if (a.dateObj && b.dateObj && a.dateObj.getTime() !== b.dateObj.getTime()) {
        return b.dateObj.getTime() - a.dateObj.getTime();
      }
      return b.rawDate.localeCompare(a.rawDate);
    });

    const totalTarget = OFFICIAL_TARGET_SCHOOLS.length || 53;

    return sortedDates.map((item) => {
      const schoolsCount = item.schoolsSet.size;
      const percent = totalTarget > 0 ? Math.min(100, Math.round((schoolsCount / totalTarget) * 100)) : 0;
      return {
        rawDate: item.rawDate,
        dateLabel: item.dateLabel,
        dateObj: item.dateObj,
        reportsCount: item.reportsCount,
        schoolsCount,
        percent,
        reports: item.reports,
        schoolsSet: item.schoolsSet,
      };
    });
  }, [activeReports, memoizedSchoolRowsMap]);

  // Latest 4 Daily Report Statistics for Dashboard Widget (นับสถิติ 4 วันที่มีการส่งรายงานล่าสุด โดยนับจากวันเวลาที่ส่ง)
  const dailyReportStats = useMemo(() => {
    if (!allDailyReportStats || allDailyReportStats.length === 0) {
      return [];
    }

    // เรียงลำดับวันที่มีการส่งรายงานล่าสุดจากวันเวลาที่ส่งจริง ย้อนหลัง 4 วัน
    const sortedList = [...allDailyReportStats].sort((a, b) => {
      if (a.dateObj && b.dateObj && a.dateObj.getTime() !== b.dateObj.getTime()) {
        return b.dateObj.getTime() - a.dateObj.getTime();
      }
      return b.rawDate.localeCompare(a.rawDate);
    });

    return sortedList.slice(0, 4);
  }, [allDailyReportStats]);

  // Precalculate per-school stats to keep school grid rendering extremely fast
  const schoolStatsMap = useMemo(() => {
    // Single-pass grouping of activeReports by canonical school name
    const activeReportsBySchool = new Map<string, ActivityReport[]>();
    activeReports.forEach((r) => {
      const cached = memoizedSchoolRowsMap.get(r.id);
      const canonical = cached?._matchedSchoolKeyword || r.schoolName;
      if (!activeReportsBySchool.has(canonical)) {
        activeReportsBySchool.set(canonical, []);
      }
      activeReportsBySchool.get(canonical)!.push(r);
    });

    const statsMap = new Map();
    OFFICIAL_TARGET_SCHOOLS.forEach((school) => {
      const schoolReports = activeReportsBySchool.get(school.name) || [];
      const hasActivity = schoolReports.length > 0;
      const completedCount = schoolReports.filter(r => r.status === ReportStatus.COMPLETED).length;
      const missingPeriods = getSchoolMissingPeriods(school.name, activeReports, schoolReports);
      statsMap.set(school.name, {
        schoolReports,
        hasActivity,
        completedCount,
        missingPeriods,
      });
    });
    return statsMap;
  }, [activeReports, memoizedSchoolRowsMap]);

  // Top Goals Breakdown (เป้าหมายหลักที่จัดมากที่สุด)
  const topGoalsList = useMemo(() => {
    const goalCounts: Record<string, { id: number; code: string; title: string; count: number; color: string }> = {};
    
    // Seed with KOPODOT_GOALS
    KOPODOT_GOALS.forEach((g) => {
      goalCounts[g.code] = {
        id: g.id,
        code: g.code,
        title: g.title,
        count: 0,
        color: g.color,
      };
    });

    periodFilteredReports.forEach((r) => {
      const goalCode = r.goalCode || "";
      const matched = KOPODOT_GOALS.find((g) => g.code === goalCode || goalCode.includes(g.code));
      if (matched && goalCounts[matched.code]) {
        goalCounts[matched.code].count++;
      }
    });

    return Object.values(goalCounts).sort((a, b) => b.count - a.count);
  }, [periodFilteredReports]);

  // Target Group / Classroom Breakdown (กลุ่มเป้าหมาย/ชั้นเรียน)
  const targetGroupClassroomList = useMemo(() => {
    const groupCounts: Record<string, number> = {};
    
    periodFilteredReports.forEach((r) => {
      const tg = r.targetGroup || "";
      const act = r.activityName || "";
      const obj = r.objectives || "";
      const combo = (tg + " " + act + " " + obj).toLowerCase();

      if (tg) {
        if (tg.includes("ป.6")) groupCounts["ชั้นประถมศึกษาปีที่ 6 (ป.6)"] = (groupCounts["ชั้นประถมศึกษาปีที่ 6 (ป.6)"] || 0) + 1;
        if (tg.includes("ป.5")) groupCounts["ชั้นประถมศึกษาปีที่ 5 (ป.5)"] = (groupCounts["ชั้นประถมศึกษาปีที่ 5 (ป.5)"] || 0) + 1;
        if (tg.includes("ป.4")) groupCounts["ชั้นประถมศึกษาปีที่ 4 (ป.4)"] = (groupCounts["ชั้นประถมศึกษาปีที่ 4 (ป.4)"] || 0) + 1;
        if (tg.includes("ป.3")) groupCounts["ชั้นประถมศึกษาปีที่ 3 (ป.3)"] = (groupCounts["ชั้นประถมศึกษาปีที่ 3 (ป.3)"] || 0) + 1;
        if (tg.includes("ป.2")) groupCounts["ชั้นประถมศึกษาปีที่ 2 (ป.2)"] = (groupCounts["ชั้นประถมศึกษาปีที่ 2 (ป.2)"] || 0) + 1;
        if (tg.includes("ป.1")) groupCounts["ชั้นประถมศึกษาปีที่ 1 (ป.1)"] = (groupCounts["ชั้นประถมศึกษาปีที่ 1 (ป.1)"] || 0) + 1;
        if (tg.includes("อนุบาล")) groupCounts["ระดับปฐมวัย / อนุบาล"] = (groupCounts["ระดับปฐมวัย / อนุบาล"] || 0) + 1;
        if (tg.includes("ศูนย์") || tg.includes("ศพด")) groupCounts["ศูนย์พัฒนาเด็กเล็ก (ศพด.)"] = (groupCounts["ศูนย์พัฒนาเด็กเล็ก (ศพด.)"] || 0) + 1;
        if (tg.includes("ชุมชน") || tg.includes("ผู้ปกครอง")) groupCounts["ชุมชน / ผู้ปกครองนักเรียน"] = (groupCounts["ชุมชน / ผู้ปกครองนักเรียน"] || 0) + 1;
        if (combo.includes("ศึกษาดูงาน") || combo.includes("หน่วยงาน") || combo.includes("ผู้ปกครองศึกษาดูงาน") || combo.includes("ศึกษาดูงานภายใน")) {
          groupCounts["หน่วยงานหรือผู้ปกครองที่มาศึกษาดูงานภายในโรงเรียน"] = (groupCounts["หน่วยงานหรือผู้ปกครองที่มาศึกษาดูงานภายในโรงเรียน"] || 0) + 1;
        }
        if (!tg.includes("ป.") && !tg.includes("อนุบาล") && !tg.includes("ศูนย์") && !tg.includes("ศพด") && !tg.includes("ชุมชน") && !tg.includes("ผู้ปกครอง") && !combo.includes("ศึกษาดูงาน")) {
          const key = tg.length > 30 ? tg.substring(0, 30) + "..." : tg;
          groupCounts[key] = (groupCounts[key] || 0) + 1;
        }
      }
    });

    // Ensure common targets exist if empty
    if (!groupCounts["ศูนย์พัฒนาเด็กเล็ก (ศพด.)"]) groupCounts["ศูนย์พัฒนาเด็กเล็ก (ศพด.)"] = 0;
    if (!groupCounts["ชุมชน / ผู้ปกครองนักเรียน"]) groupCounts["ชุมชน / ผู้ปกครองนักเรียน"] = 0;
    if (!groupCounts["หน่วยงานหรือผู้ปกครองที่มาศึกษาดูงานภายในโรงเรียน"]) groupCounts["หน่วยงานหรือผู้ปกครองที่มาศึกษาดูงานภายในโรงเรียน"] = 0;

    const result = Object.entries(groupCounts).map(([name, count]) => ({ name, count }));
    return result.sort((a, b) => b.count - a.count);
  }, [periodFilteredReports]);

  // Monthly Bar Trend (Processed directly from dataset dates)
  const monthlyBarTrend = useMemo(() => {
    const months = [
      { name: "ม.ค.", monthNum: 1, count: 0 },
      { name: "ก.พ.", monthNum: 2, count: 0 },
      { name: "มี.ค.", monthNum: 3, count: 0 },
      { name: "เม.ย.", monthNum: 4, count: 0 },
      { name: "พ.ค.", monthNum: 5, count: 0 },
      { name: "มิ.ย.", monthNum: 6, count: 0 },
      { name: "ก.ค.", monthNum: 7, count: 0 },
      { name: "ส.ค.", monthNum: 8, count: 0 },
      { name: "ก.ย.", monthNum: 9, count: 0 },
      { name: "ต.ค.", monthNum: 10, count: 0 },
      { name: "พ.ย.", monthNum: 11, count: 0 },
      { name: "ธ.ค.", monthNum: 12, count: 0 },
    ];

    const baseReports = trendGoalFilter === "all"
      ? periodFilteredReports
      : periodFilteredReports.filter((r) => getGoalIdFromCode(r.goalCode) === Number(trendGoalFilter));

    baseReports.forEach((r) => {
      const cached = memoizedSchoolRowsMap.get(r.id);
      const dt = cached?._cachedParsedDate || parseReportDateDetails(r);
      if (dt && dt.month >= 1 && dt.month <= 12) {
        const found = months.find((item) => item.monthNum === dt.month);
        if (found) found.count++;
      }
    });

    const activeMonths = months.filter((m) => m.count > 0);
    const maxActiveMonthNum = activeMonths.length > 0 ? Math.max(...activeMonths.map((m) => m.monthNum)) : 8;
    const endSlice = Math.max(8, maxActiveMonthNum);
    const visibleMonths = months.slice(0, endSlice);

    const maxCount = Math.max(...visibleMonths.map((m) => m.count), 1);
    return visibleMonths.map((m) => ({
      ...m,
      isPeak: m.count === maxCount && m.count > 0,
    }));
  }, [periodFilteredReports, trendGoalFilter, memoizedSchoolRowsMap]);

  // Quarterly Bar Trend (Summarizing reports for Q1 - Q4)
  const quarterlyBarTrend = useMemo(() => {
    const quarters = [
      { name: "ไตรมาส 1 (ม.ค.-มี.ค.)", shortName: "ไตรมาส 1", key: "Q1", months: [1, 2, 3], count: 0 },
      { name: "ไตรมาส 2 (เม.ย.-มิ.ย.)", shortName: "ไตรมาส 2", key: "Q2", months: [4, 5, 6], count: 0 },
      { name: "ไตรมาส 3 (ก.ค.-ก.ย.)", shortName: "ไตรมาส 3", key: "Q3", months: [7, 8, 9], count: 0 },
      { name: "ไตรมาส 4 (ต.ค.-ธ.ค.)", shortName: "ไตรมาส 4", key: "Q4", months: [10, 11, 12], count: 0 },
    ];

    const baseReports = trendGoalFilter === "all"
      ? periodFilteredReports
      : periodFilteredReports.filter((r) => getGoalIdFromCode(r.goalCode) === Number(trendGoalFilter));

    baseReports.forEach((r) => {
      const cached = memoizedSchoolRowsMap.get(r.id);
      const dt = cached?._cachedParsedDate || parseReportDateDetails(r);
      if (dt) {
        const found = quarters.find((q) => q.months.includes(dt.month) || dt.quarter === q.key);
        if (found) found.count++;
      }
    });

    const maxCount = Math.max(...quarters.map((x) => x.count), 1);
    return quarters.map((q) => ({
      ...q,
      isPeak: q.count === maxCount && q.count > 0,
    }));
  }, [periodFilteredReports, trendGoalFilter, memoizedSchoolRowsMap]);

  // Filters for Weekly & Monthly Widget
  const [selectedWeekFilter, setSelectedWeekFilter] = useState("this_week");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState("this_month");

  // Dynamic Weekly Filter Options (Counting from May as Month 1 continuously up to the current date)
  const weeklyFilterOptions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 = Jan, 4 = May, 8 = Sep

    // The academic/project reporting year starts in May (Month index 4)
    // If currently in Jan-Apr, the cycle started in May of the previous year
    const cycleStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;

    // Anchor Week 1 to the start of May (Sunday of the week of May 1st)
    const mayFirst = new Date(cycleStartYear, 4, 1, 0, 0, 0, 0);
    const mayDayOfWeek = mayFirst.getDay(); // 0 = Sun, 1 = Mon ...
    const startSunday = new Date(cycleStartYear, 4, 1 - mayDayOfWeek, 0, 0, 0, 0);

    // End boundary of the current week (Saturday 23:59:59.999)
    const currentDayOfWeek = now.getDay();
    const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDayOfWeek, 0, 0, 0, 0);
    const thisWeekEnd = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate() + 6, 23, 59, 59, 999);

    const formatWeekSubtitle = (startD: Date, endD: Date) => {
      const startDay = startD.getDate();
      const endDay = endD.getDate();
      const startMonth = startD.getMonth() + 1;
      const endMonth = endD.getMonth() + 1;
      const endYearBE = endD.getFullYear() + 543;
      if (startMonth === endMonth) {
        return `(${toThaiNumerals(startDay)}–${toThaiNumerals(endDay)} ${THAI_MONTH_SHORT[endMonth]} ${toThaiNumerals(endYearBE)})`;
      }
      return `(${toThaiNumerals(startDay)} ${THAI_MONTH_SHORT[startMonth]}–${toThaiNumerals(endDay)} ${THAI_MONTH_SHORT[endMonth]} ${toThaiNumerals(endYearBE)})`;
    };

    const formatWeekOption = (startD: Date, endD: Date) => {
      const startDay = startD.getDate();
      const endDay = endD.getDate();
      const startMonth = startD.getMonth() + 1;
      const endMonth = endD.getMonth() + 1;
      if (startMonth === endMonth) {
        return `${startDay}–${endDay} ${THAI_MONTH_SHORT[endMonth]}`;
      }
      return `${startDay} ${THAI_MONTH_SHORT[startMonth]}–${endDay} ${THAI_MONTH_SHORT[endMonth]}`;
    };

    // Generate consecutive 7-day intervals from May up to this week / current date
    const list: Array<{
      id: string;
      weekIndex: number;
      weekNumberThai: string;
      label: string;
      optionText: string;
      subtitle: string;
      start: Date;
      end: Date;
      startMs: number;
      endMs: number;
      isCurrentWeek: boolean;
    }> = [];

    const cursor = new Date(startSunday);
    let weekNum = 1;

    while (cursor.getTime() <= thisWeekEnd.getTime()) {
      const wStart = new Date(cursor);
      const wEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 6, 23, 59, 59, 999);
      const isCurrent = now.getTime() >= wStart.getTime() && now.getTime() <= wEnd.getTime();
      const wNumThai = toThaiNumerals(weekNum);
      const optText = formatWeekOption(wStart, wEnd);
      const sub = formatWeekSubtitle(wStart, wEnd);

      list.push({
        id: `week_${weekNum}`,
        weekIndex: weekNum,
        weekNumberThai: wNumThai,
        label: `สัปดาห์ที่ ${wNumThai}`,
        optionText: `สัปดาห์ที่ ${wNumThai} (${optText})${isCurrent ? " • ปัจจุบัน" : ""}`,
        subtitle: sub,
        start: wStart,
        end: wEnd,
        startMs: wStart.getTime(),
        endMs: wEnd.getTime(),
        isCurrentWeek: isCurrent
      });

      cursor.setDate(cursor.getDate() + 7);
      weekNum++;
    }

    const currentWeekItem = list.find((w) => w.isCurrentWeek) || list[list.length - 1];
    const weekMap = new Map<string, typeof list[0]>();
    list.forEach((w) => {
      weekMap.set(w.id, w);
    });

    return {
      weeksList: list,
      reversedWeeksList: [...list].reverse(),
      currentWeek: currentWeekItem,
      weekMap,
      totalWeeks: list.length,
      thisWeek: currentWeekItem,
      lastWeek: list.length >= 2 ? list[list.length - 2] : currentWeekItem,
      twoWeeksAgo: list.length >= 3 ? list[list.length - 3] : currentWeekItem,
      threeWeeksAgo: list.length >= 4 ? list[list.length - 4] : currentWeekItem,
    };
  }, []);

  // Dynamic Thai Monthly Filter Options based on current date (Starting from May to current date)
  const monthlyFilterOptions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentYearBE = currentYear + 543;
    const currentMonth0 = now.getMonth(); // 0-indexed (4 = May)

    // Academic / project cycle starts in May
    const cycleStartYear = currentMonth0 >= 4 ? currentYear : currentYear - 1;

    interface MonthFilterItem {
      id: string;
      monthNum: number; // 1-12
      month0: number; // 0-11
      yearBE: number;
      yearCE: number;
      monthName: string;
      monthShort: string;
      optionText: string;
      isCurrentMonth: boolean;
    }

    const list: MonthFilterItem[] = [];
    let curY = cycleStartYear;
    let curM = 4; // May

    while (curY < currentYear || (curY === currentYear && curM <= currentMonth0)) {
      const yBE = curY + 543;
      const mNum = curM + 1;
      const mName = THAI_MONTH_FULL[mNum] || `เดือนที่ ${mNum}`;
      const mShort = THAI_MONTH_SHORT[mNum] || `ด.${mNum}`;
      const isCur = curY === currentYear && curM === currentMonth0;

      list.push({
        id: `month_${curY}_${mNum}`,
        monthNum: mNum,
        month0: curM,
        yearBE: yBE,
        yearCE: curY,
        monthName: mName,
        monthShort: mShort,
        optionText: `${mName} ${toThaiNumerals(yBE)}${isCur ? " (ปัจจุบัน)" : ""}`,
        isCurrentMonth: isCur,
      });

      curM++;
      if (curM > 11) {
        curM = 0;
        curY++;
      }
    }

    if (list.length === 0) {
      list.push({
        id: `month_${cycleStartYear}_5`,
        monthNum: 5,
        month0: 4,
        yearBE: cycleStartYear + 543,
        yearCE: cycleStartYear,
        monthName: THAI_MONTH_FULL[5] || "พฤษภาคม",
        monthShort: THAI_MONTH_SHORT[5] || "พ.ค.",
        optionText: `พฤษภาคม ${toThaiNumerals(cycleStartYear + 543)} (ปัจจุบัน)`,
        isCurrentMonth: true,
      });
    }

    const currentMonthItem = list.find((m) => m.isCurrentMonth) || list[list.length - 1];
    const monthMap = new Map<string, MonthFilterItem>();
    list.forEach((m) => {
      monthMap.set(m.id, m);
    });

    const qNum = Math.ceil(currentMonthItem.monthNum / 3);
    const qStartMonth = (qNum - 1) * 3 + 1;
    const qEndMonth = qNum * 3;
    const qRangeText = `${THAI_MONTH_SHORT[qStartMonth]} - ${THAI_MONTH_SHORT[qEndMonth]}`;

    return {
      monthsList: list,
      reversedMonthsList: [...list].reverse(),
      currentMonth: currentMonthItem,
      monthMap,
      prevMonth1: list.length >= 2 ? list[list.length - 2] : currentMonthItem,
      prevMonth2: list.length >= 3 ? list[list.length - 3] : currentMonthItem,
      prevMonth3: list.length >= 4 ? list[list.length - 4] : currentMonthItem,
      currentQuarter: {
        quarterNum: qNum,
        rangeText: qRangeText,
        months: [qStartMonth, qStartMonth + 1, qEndMonth],
      },
      currentYearBE,
      currentYearCE: currentYear,
    };
  }, []);

  // Detailed Weekly & Recent Monthly Analytics Metrics Calculation
  const weeklyAndMonthlyMetrics = useMemo(() => {
    const reportsToAnalyze = activeReports;

    // Weekly Filter calculation (Sunday to Saturday as 1 full week)
    const weeklyReports = reportsToAnalyze.filter((r) => {
      const cached = memoizedSchoolRowsMap.get(r.id);
      const dt = cached?._cachedParsedDate || parseReportDateDetails(r);
      if (!dt || !dt.dateObj) return false;
      const reportTime = dt.dateObj.getTime();

      if (selectedWeekFilter === "all_weeks") {
        return true;
      }
      if (selectedWeekFilter === "this_week") {
        if (!weeklyFilterOptions.currentWeek) return true;
        return reportTime >= weeklyFilterOptions.currentWeek.startMs && reportTime <= weeklyFilterOptions.currentWeek.endMs;
      }
      const targetWeek = weeklyFilterOptions.weekMap.get(selectedWeekFilter);
      if (targetWeek) {
        return reportTime >= targetWeek.startMs && reportTime <= targetWeek.endMs;
      }
      if (selectedWeekFilter === "last_week" && weeklyFilterOptions.lastWeek) {
        return reportTime >= weeklyFilterOptions.lastWeek.startMs && reportTime <= weeklyFilterOptions.lastWeek.endMs;
      }
      if (selectedWeekFilter === "two_weeks_ago" && weeklyFilterOptions.twoWeeksAgo) {
        return reportTime >= weeklyFilterOptions.twoWeeksAgo.startMs && reportTime <= weeklyFilterOptions.twoWeeksAgo.endMs;
      }
      if (selectedWeekFilter === "three_weeks_ago" && weeklyFilterOptions.threeWeeksAgo) {
        return reportTime >= weeklyFilterOptions.threeWeeksAgo.startMs && reportTime <= weeklyFilterOptions.threeWeeksAgo.endMs;
      }
      return reportTime >= weeklyFilterOptions.thisWeek.startMs && reportTime <= weeklyFilterOptions.thisWeek.endMs;
    });

    // Monthly Filter calculation (Strict & Accurate based on parsed month and year)
    const m0 = monthlyFilterOptions.currentMonth;
    const qMonths = monthlyFilterOptions.currentQuarter.months;

    const monthlyReports = reportsToAnalyze.filter((r) => {
      const cached = memoizedSchoolRowsMap.get(r.id);
      const dt = cached?._cachedParsedDate || parseReportDateDetails(r);
      if (!dt || !dt.month) return false;
      const reportMonth = dt.month;
      const reportYearBE = dt.yearBE;
      const reportYearCE = dt.yearCE;

      if (selectedMonthFilter === "all_months") {
        return true;
      } else if (selectedMonthFilter === "this_month") {
        return reportMonth === m0.monthNum && (!reportYearBE || reportYearBE === m0.yearBE || reportYearCE === m0.yearCE);
      } else if (selectedMonthFilter === "last_month") {
        const m1 = monthlyFilterOptions.prevMonth1;
        return reportMonth === m1.monthNum && (!reportYearBE || reportYearBE === m1.yearBE || reportYearCE === m1.yearCE);
      } else if (selectedMonthFilter === "two_months_ago" || selectedMonthFilter === "june_2026") {
        const m2 = monthlyFilterOptions.prevMonth2;
        return reportMonth === m2.monthNum && (!reportYearBE || reportYearBE === m2.yearBE || reportYearCE === m2.yearCE);
      } else if (selectedMonthFilter === "three_months_ago" || selectedMonthFilter === "may_2026") {
        const m3 = monthlyFilterOptions.prevMonth3;
        return reportMonth === m3.monthNum && (!reportYearBE || reportYearBE === m3.yearBE || reportYearCE === m3.yearCE);
      } else if (selectedMonthFilter === "current_quarter" || selectedMonthFilter === "q3_2026") {
        return qMonths.includes(reportMonth) && (!reportYearBE || reportYearBE === monthlyFilterOptions.currentYearBE || reportYearCE === monthlyFilterOptions.currentYearCE);
      } else if (selectedMonthFilter === "year_current" || selectedMonthFilter === "year_2026") {
        return !reportYearBE || reportYearBE === monthlyFilterOptions.currentYearBE || reportYearCE === monthlyFilterOptions.currentYearCE;
      } else {
        const matchedMonth = monthlyFilterOptions.monthMap.get(selectedMonthFilter);
        if (matchedMonth) {
          return reportMonth === matchedMonth.monthNum && (!reportYearBE || reportYearBE === matchedMonth.yearBE || reportYearCE === matchedMonth.yearCE);
        }
      }
      return reportMonth === m0.monthNum;
    });

    const safeWeeklyReports = weeklyReports;
    const safeMonthlyReports = monthlyReports;

    // Weekly Calculations using cached school keyword from memoized map
    const weeklyReportCount = safeWeeklyReports.length;
    const weeklySchoolSet = new Set(
      safeWeeklyReports.map((r) => memoizedSchoolRowsMap.get(r.id)?._matchedSchoolKeyword || r.schoolName)
    );
    const weeklySchoolCount = weeklySchoolSet.size;
    const weeklyParticipantsCount = safeWeeklyReports.reduce((acc, r) => acc + extractReportParticipantCount(r), 0);
    const weeklyCompletedCount = safeWeeklyReports.filter((r) => r.status === ReportStatus.COMPLETED).length;
    const weeklyCompletedRate = weeklyReportCount > 0 ? Math.round((weeklyCompletedCount / weeklyReportCount) * 100) : 100;

    // Monthly Calculations using cached school keyword from memoized map
    const monthlyReportCount = safeMonthlyReports.length;
    const monthlySchoolSet = new Set(
      safeMonthlyReports.map((r) => memoizedSchoolRowsMap.get(r.id)?._matchedSchoolKeyword || r.schoolName)
    );
    const monthlySchoolCount = monthlySchoolSet.size;
    const monthlyParticipantsCount = safeMonthlyReports.reduce((acc, r) => acc + extractReportParticipantCount(r), 0);
    const monthlyCompletedCount = safeMonthlyReports.filter((r) => r.status === ReportStatus.COMPLETED).length;
    const monthlyCompletedRate = monthlyReportCount > 0 ? Math.round((monthlyCompletedCount / monthlyReportCount) * 100) : 100;

    // Goal Breakdown Monthly
    const goalCounts: Record<string, number> = {};
    safeMonthlyReports.forEach((r) => {
      if (r.goalCode) {
        goalCounts[r.goalCode] = (goalCounts[r.goalCode] || 0) + 1;
      }
    });

    let topGoalCode = "";
    let maxGoalCount = 0;
    Object.entries(goalCounts).forEach(([code, c]) => {
      if (c > maxGoalCount) {
        maxGoalCount = c;
        topGoalCode = code;
      }
    });

    const topGoal = topGoalCode 
      ? (KOPODOT_GOALS.find((g) => g.code === topGoalCode) || KOPODOT_GOALS[0]) 
      : KOPODOT_GOALS[0];

    return {
      weeklyReportCount,
      weeklySchoolCount,
      weeklyParticipantsCount,
      weeklyCompletedRate,
      monthlyReportCount,
      monthlySchoolCount,
      monthlyParticipantsCount,
      monthlyCompletedRate,
      topGoal,
      topGoalCount: maxGoalCount
    };
  }, [activeReports, selectedWeekFilter, selectedMonthFilter, weeklyFilterOptions, monthlyFilterOptions, memoizedSchoolRowsMap]);

  const [tableSearch, setTableSearch] = useState("");
  const [tableGoalFilter, setTableGoalFilter] = useState("all");
  const [tableGroupFilter, setTableGroupFilter] = useState("all");
  const [tableStatusFilter, setTableStatusFilter] = useState("completed_board");
  const [groupByGoal, setGroupByGoal] = useState(true);
  const [rankingGroupFilter, setRankingGroupFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getSchoolGroupName = useCallback((schoolName: string): string => {
    if (!schoolName) return "";
    const match = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(schoolName, s.name));
    return match ? match.groupName : "";
  }, []);

  const provinces = useMemo(() => {
    const list = OFFICIAL_TARGET_SCHOOLS.map((s) => s.province);
    return ["all", ...Array.from(new Set(list))];
  }, []);

  const districts = useMemo(() => {
    const filtered = OFFICIAL_TARGET_SCHOOLS.filter((s) => selectedProvince === "all" || s.province === selectedProvince);
    const list = filtered.map((s) => s.district).filter(Boolean);
    return ["all", ...Array.from(new Set(list))];
  }, [selectedProvince]);

  const subdistricts = useMemo(() => {
    const filtered = OFFICIAL_TARGET_SCHOOLS.filter(
      (s) =>
        (selectedProvince === "all" || s.province === selectedProvince) &&
        (selectedDistrict === "all" || s.district === selectedDistrict)
    );
    const list = filtered.map((s) => s.subdistrict).filter(Boolean);
    return ["all", ...Array.from(new Set(list))];
  }, [selectedProvince, selectedDistrict]);

  const villages = useMemo(() => {
    const filtered = OFFICIAL_TARGET_SCHOOLS.filter(
      (s) =>
        (selectedProvince === "all" || s.province === selectedProvince) &&
        (selectedDistrict === "all" || s.district === selectedDistrict) &&
        (selectedSubdistrict === "all" || s.subdistrict === selectedSubdistrict)
    );
    const list = filtered.map((s) => s.village).filter(Boolean);
    return ["all", ...Array.from(new Set(list))];
  }, [selectedProvince, selectedDistrict, selectedSubdistrict]);

  const groups = useMemo(() => {
    const list = OFFICIAL_TARGET_SCHOOLS.map((s) => s.groupName);
    return ["all", ...Array.from(new Set(list))];
  }, []);

  const handleProvinceChange = (prov: string) => {
    setSelectedProvince(prov);
    setSelectedDistrict("all");
    setSelectedSubdistrict("all");
    setSelectedVillage("all");
  };

  const handleDistrictChange = (dist: string) => {
    setSelectedDistrict(dist);
    setSelectedSubdistrict("all");
    setSelectedVillage("all");
  };

  const handleSubdistrictChange = (subdist: string) => {
    setSelectedSubdistrict(subdist);
    setSelectedVillage("all");
  };

  const resetLocationFilters = () => {
    setSelectedProvince("all");
    setSelectedDistrict("all");
    setSelectedSubdistrict("all");
    setSelectedVillage("all");
    setGpsFilter("all");
    setSelectedGroup("all");
    setSelectedSubmissionStatus("all");
    setSchoolSearch("");
  };

  // Filtered Schools database
  const filteredOfficialSchools = useMemo(() => {
    // Group periodFilteredReports by school once to prevent redundant scans
    const periodSchoolReportsMap = new Map<string, ActivityReport[]>();
    OFFICIAL_TARGET_SCHOOLS.forEach((s) => periodSchoolReportsMap.set(s.name, []));
    periodFilteredReports.forEach((r) => {
      const matchSchool = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(r.schoolName, s.name));
      if (matchSchool) {
        periodSchoolReportsMap.get(matchSchool.name)!.push(r);
      }
    });

    return OFFICIAL_TARGET_SCHOOLS.filter((s) => {
      const schoolReports = periodSchoolReportsMap.get(s.name) || [];
      const hasSubmitted = schoolReports.length > 0;
      if (selectedSubmissionStatus === "submitted" && !hasSubmitted) return false;
      if (selectedSubmissionStatus === "unsubmitted" && hasSubmitted) return false;

      const gps = getSchoolGpsBySchoolName(s.name);
      if (gpsFilter === "has_gps" && !gps) return false;
      if (gpsFilter === "no_gps" && gps) return false;

      const gpsStr = gps ? `${gps[0]},${gps[1]} ${gps[0].toFixed(4)},${gps[1].toFixed(4)}` : "";
      const query = schoolSearch.toLowerCase().trim();
      const queryNorm = query.replace(/[^a-z0-9ก-๙]/g, '').replace('ชำปะโต', 'ซำปะโต');

      // 1. Match School Name or Close/Similar Names
      const schoolNameLower = s.name.toLowerCase();
      const schoolNameNorm = schoolNameLower.replace(/[^a-z0-9ก-๙]/g, '').replace('ชำปะโต', 'ซำปะโต');
      const schoolNameCore = schoolNameNorm.replace(/รรตชด|โรงเรียนตำรวจตระเวนชายแดน|ศกรตชด|ศศช/g, '');

      const matchName =
        schoolNameLower.includes(query) ||
        isSchoolMatch(query, s.name) ||
        (queryNorm.length >= 2 && (
          schoolNameNorm.includes(queryNorm) ||
          schoolNameCore.includes(queryNorm) ||
          queryNorm.includes(schoolNameCore)
        ));

      // 2. Match Location
      const matchLocation =
        s.village.toLowerCase().includes(query) ||
        s.subdistrict.toLowerCase().includes(query) ||
        s.district.toLowerCase().includes(query) ||
        s.province.toLowerCase().includes(query) ||
        s.groupName.toLowerCase().includes(query) ||
        gpsStr.includes(query);

      // 3. Match Date or Activity Reports associated with this school
      const matchDateOrReport = schoolReports.some((r) => {
        const dateStr = (r.dateString || "").toLowerCase();
        const periodStr = (r.reportingPeriod || "").toLowerCase();
        const updatedStr = (r.lastUpdated || "").toLowerCase();
        const tsStr = (r.timestamp || "").toLowerCase();
        const projName = (r.projectName || "").toLowerCase();
        const actName = (r.activityName || "").toLowerCase();

        return (
          dateStr.includes(query) ||
          periodStr.includes(query) ||
          updatedStr.includes(query) ||
          tsStr.includes(query) ||
          projName.includes(query) ||
          actName.includes(query)
        );
      });

      const matchSearch = !query || matchName || matchLocation || matchDateOrReport;

      const matchProvince = selectedProvince === "all" || s.province === selectedProvince;
      const matchDistrict = selectedDistrict === "all" || s.district === selectedDistrict;
      const matchSubdistrict = selectedSubdistrict === "all" || s.subdistrict === selectedSubdistrict;
      const matchVillage = selectedVillage === "all" || s.village === selectedVillage;
      const matchGroup = selectedGroup === "all" || s.groupName === selectedGroup;

      return (
        matchSearch &&
        matchProvince &&
        matchDistrict &&
        matchSubdistrict &&
        matchVillage &&
        matchGroup
      );
    });
  }, [
    schoolSearch,
    selectedProvince,
    selectedDistrict,
    selectedSubdistrict,
    selectedVillage,
    gpsFilter,
    selectedGroup,
    selectedSubmissionStatus,
    periodFilteredReports,
    addressVersion,
  ]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const total = periodFilteredReports.length;
    const completed = periodFilteredReports.filter((r) => r.status === ReportStatus.COMPLETED).length;
    const inProgress = periodFilteredReports.filter((r) => r.status === ReportStatus.IN_PROGRESS).length;
    const overdue = periodFilteredReports.filter((r) => r.status === ReportStatus.OVERDUE).length;
    const draft = periodFilteredReports.filter((r) => r.status === ReportStatus.DRAFT).length;

    // คำนวณจำนวนผู้เข้าร่วมกิจกรรมทั้งหมดโดยตรงจากจำนวนที่ระบุในรายงานที่ลงท้ายด้วยคำว่า "คน" ให้ตรงกับรายงานมากที่สุด
    const totalParticipants = periodFilteredReports.reduce((acc, r) => {
      return acc + extractReportParticipantCount(r);
    }, 0);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const activeGoalsCount = new Set(periodFilteredReports.map((r) => getGoalIdFromCode(r.goalCode))).size;

    return {
      total,
      completed,
      inProgress,
      overdue,
      draft,
      totalParticipants,
      completionRate,
      activeGoalsCount,
    };
  }, [periodFilteredReports]);

  // คำนวณสถิติประชาชนและชุมชนที่เข้ามาใช้งานศูนย์การเรียนรู้ของโรงเรียน (Learning Center & Community Hub Analytics)
  const learningCenterStats = useMemo(() => {
    const lcReports = periodFilteredReports.filter((r) => {
      const gId = getGoalIdFromCode(r.goalCode);
      const name = (r.activityName || "").toLowerCase();
      const obj = (r.objectives || "").toLowerCase();
      const det = (r.details || "").toLowerCase();
      const tg = (r.targetGroup || "").toLowerCase();
      const allText = `${name} ${obj} ${det} ${tg}`;

      const isExplicitLC = 
        allText.includes("ศูนย์การเรียนรู้") ||
        allText.includes("ศูนย์บริการความรู้") ||
        allText.includes("เปิดพื้นที่ให้ประชาชน") ||
        allText.includes("โรงเรียนเป็นศูนย์") ||
        allText.includes("แหล่งเรียนรู้") ||
        allText.includes("ฐานการเรียนรู้") ||
        allText.includes("แปลงสาธิต");

      const isGoal8 = gId === 8 || allText.includes("เป้าหมายหลักที่ 8") || allText.includes("ด้านที่ 8");
      const isGoal7 = gId === 7 || allText.includes("เป้าหมายหลักที่ 7") || allText.includes("ด้านที่ 7");
      const hasCitizenKeywords = 
        allText.includes("ประชาชน") ||
        allText.includes("ชุมชน") ||
        allText.includes("ผู้ปกครอง") ||
        allText.includes("ชาวบ้าน") ||
        allText.includes("เยาวชน") ||
        allText.includes("ศิษย์เก่า") ||
        allText.includes("กลุ่มอาชีพ") ||
        allText.includes("เกษตรกร") ||
        allText.includes("ศึกษาดูงาน") ||
        allText.includes("บริการน้ำดื่ม");

      return isExplicitLC || (isGoal8 && hasCitizenKeywords) || (isGoal7 && hasCitizenKeywords) || isGoal8;
    });

    const totalActivities = lcReports.length;
    const totalVisitors = lcReports.reduce((sum, r) => sum + extractReportParticipantCount(r), 0);

    // Grouping by canonical school
    const schoolMap = new Map<string, { schoolName: string; count: number; visitors: number; groupName: string; province: string; district: string; subdistrict: string }>();
    
    lcReports.forEach((r) => {
      const matched = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(r.schoolName, s.name));
      const canonName = matched ? matched.name : (r.schoolName || "ไม่ระบุ");
      const groupName = matched ? matched.groupName : "บก.ตชด.ภาค 2";
      const province = matched ? matched.province : "";
      const district = matched ? matched.district : "";
      const subdistrict = matched ? matched.subdistrict : "";

      const current = schoolMap.get(canonName) || {
        schoolName: canonName,
        count: 0,
        visitors: 0,
        groupName,
        province,
        district,
        subdistrict
      };
      current.count += 1;
      current.visitors += extractReportParticipantCount(r);
      schoolMap.set(canonName, current);
    });

    const activeSchoolsList = Array.from(schoolMap.values()).sort((a, b) => b.visitors - a.visitors || b.count - a.count);
    const activeSchoolsCount = activeSchoolsList.length;

    // Target Group Breakdown
    let generalPublicCount = 0;
    let parentsCount = 0;
    let communityVillagersCount = 0;
    let youthAlumniCount = 0;
    let studyTourCount = 0;
    let studentsBasesCount = 0;

    lcReports.forEach((r) => {
      const tg = ((r.targetGroup || "") + " " + (r.activityName || "") + " " + (r.objectives || "")).toLowerCase();
      const p = extractReportParticipantCount(r);
      if (tg.includes("ประชาชน") || tg.includes("เปิดพื้นที่ให้ประชาชน")) {
        generalPublicCount += p;
      } else if (tg.includes("ผู้ปกครอง")) {
        parentsCount += p;
      } else if (tg.includes("ชุมชน") || tg.includes("ชาวบ้าน") || tg.includes("ครัวเรือน") || tg.includes("เกษตรกร")) {
        communityVillagersCount += p;
      } else if (tg.includes("เยาวชน") || tg.includes("ศิษย์เก่า")) {
        youthAlumniCount += p;
      } else if (tg.includes("ศึกษาดูงาน") || tg.includes("ภายนอก") || tg.includes("คณะดูงาน")) {
        studyTourCount += p;
      } else {
        studentsBasesCount += p;
      }
    });

    // 4 BPP Groups Breakdown
    const groupCodes = ["21", "22", "23", "24"];
    const groupBreakdown = groupCodes.map((code) => {
      const groupSchools = OFFICIAL_TARGET_SCHOOLS.filter((s) => s.groupName.includes(code));
      const groupReports = lcReports.filter((r) => groupSchools.some((s) => isSchoolMatch(r.schoolName, s.name)));
      const visitorsCount = groupReports.reduce((sum, r) => sum + extractReportParticipantCount(r), 0);
      const schoolsInGroup = groupSchools.filter((s) => lcReports.some((r) => isSchoolMatch(r.schoolName, s.name))).length;
      return {
        groupCode: code,
        groupTitle: `กก.ตชด.${code}`,
        activitiesCount: groupReports.length,
        visitorsCount,
        activeSchools: schoolsInGroup,
        totalTargetSchools: groupSchools.length,
      };
    });

    return {
      reports: lcReports,
      totalActivities,
      totalVisitors,
      activeSchoolsCount,
      activeSchoolsList,
      targetGroups: [
        { label: "ประชาชนทั่วไปในพื้นที่", count: generalPublicCount, color: "#0284C7", percent: totalVisitors > 0 ? Math.round((generalPublicCount / totalVisitors) * 100) : 0 },
        { label: "ผู้ปกครองนักเรียน", count: parentsCount, color: "#0D9488", percent: totalVisitors > 0 ? Math.round((parentsCount / totalVisitors) * 100) : 0 },
        { label: "ชุมชน / เกษตรกร / ครัวเรือน", count: communityVillagersCount, color: "#10B981", percent: totalVisitors > 0 ? Math.round((communityVillagersCount / totalVisitors) * 100) : 0 },
        { label: "เยาวชนและศิษย์เก่า", count: youthAlumniCount, color: "#6366F1", percent: totalVisitors > 0 ? Math.round((youthAlumniCount / totalVisitors) * 100) : 0 },
        { label: "คณะศึกษาดูงาน & ฐานเรียนรู้", count: studyTourCount + studentsBasesCount, color: "#8B5CF6", percent: totalVisitors > 0 ? Math.round(((studyTourCount + studentsBasesCount) / totalVisitors) * 100) : 0 },
      ],
      groupBreakdown,
    };
  }, [periodFilteredReports]);

  // Status breakdown data for Pie chart
  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {
      [ReportStatus.COMPLETED]: 0,
      [ReportStatus.IN_PROGRESS]: 0,
      [ReportStatus.OVERDUE]: 0,
      [ReportStatus.DRAFT]: 0,
    };

    periodFilteredReports.forEach((r) => {
      if (counts[r.status] !== undefined) {
        counts[r.status]++;
      }
    });

    return [
      { name: "เสร็จสิ้น", value: counts[ReportStatus.COMPLETED], color: "#10B981" },
      { name: "กำลังดำเนินการ", value: counts[ReportStatus.IN_PROGRESS], color: "#3B82F6" },
      { name: "ล่าช้ากว่าแผน", value: counts[ReportStatus.OVERDUE], color: "#EF4444" },
      { name: "ร่างรายงาน", value: counts[ReportStatus.DRAFT], color: "#6B7280" },
    ].filter((item) => item.value > 0);
  }, [periodFilteredReports]);

  // Goal breakdown data for Charts and Summary
  const goalChartData = useMemo(() => {
    return KOPODOT_GOALS.map((goal) => {
      const goalReports = periodFilteredReports.filter((r) => getGoalIdFromCode(r.goalCode) === goal.id);
      const completedCount = goalReports.filter((r) => r.status === ReportStatus.COMPLETED).length;
      
      // คำนวณจำนวนผู้เข้าร่วมกิจกรรมในเป้าหมายนี้นับจากรายงานโดยตรง ให้ตรงกับรายงานมากที่สุด
      const participantSum = goalReports.reduce((acc, r) => acc + extractReportParticipantCount(r), 0);

      return {
        id: goal.id,
        goalCode: goal.code,
        goalShortTitle: goal.title.length > 25 ? goal.title.substring(0, 25) + "..." : goal.title,
        fullTitle: `${goal.code}: ${goal.title}`,
        activityCount: goalReports.length,
        completedCount: completedCount,
        participants: participantSum,
        color: goal.color,
      };
    });
  }, [periodFilteredReports]);

  // School activity mapping
  const schoolData = useMemo(() => {
    const schoolsMap: Record<string, { count: number; completed: number }> = {};
    periodFilteredReports.forEach((r) => {
      if (!schoolsMap[r.schoolName]) {
        schoolsMap[r.schoolName] = { count: 0, completed: 0 };
      }
      schoolsMap[r.schoolName].count++;
      if (r.status === ReportStatus.COMPLETED) {
        schoolsMap[r.schoolName].completed++;
      }
    });

    return Object.entries(schoolsMap)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        completed: stats.completed,
      }))
      .sort((a, b) => b.count - a.count);
  }, [periodFilteredReports]);

  // Trend Line Chart Data calculation (Monthly vs Quarterly, supporting Goal filtering, Cumulative Growth, & School Comparison)
  const trendChartData = useMemo(() => {
    // 1. Filter reports by selected goal if applicable
    const baseReports = trendGoalFilter === "all"
      ? periodFilteredReports
      : periodFilteredReports.filter((r) => getGoalIdFromCode(r.goalCode) === Number(trendGoalFilter));

    if (trendGranularity === "monthly") {
      // 12 Months: ม.ค. (1) to ธ.ค. (12)
      let runningTotal = 0;
      let runningCompleted = 0;

      return Array.from({ length: 12 }, (_, i) => {
        const mNum = i + 1;
        const monthShort = THAI_MONTH_SHORT[mNum];
        const monthFull = THAI_MONTH_FULL[mNum];

        const monthReports = baseReports.filter((r) => {
          const dt = parseReportDateDetails(r);
          return dt ? dt.month === mNum : false;
        });

        const total = monthReports.length;
        const completed = monthReports.filter((r) => r.status === ReportStatus.COMPLETED).length;

        runningTotal += total;
        runningCompleted += completed;

        const bpp21 = monthReports.filter((r) => getSchoolGroupName(r.schoolName).includes("21")).length;
        const bpp22 = monthReports.filter((r) => getSchoolGroupName(r.schoolName).includes("22")).length;
        const bpp23 = monthReports.filter((r) => getSchoolGroupName(r.schoolName).includes("23")).length;
        const bpp24 = monthReports.filter((r) => getSchoolGroupName(r.schoolName).includes("24")).length;

        const countSchoolA = monthReports.filter((r) => isSchoolMatch(r.schoolName, compareSchoolA)).length;
        const countSchoolB = monthReports.filter((r) => isSchoolMatch(r.schoolName, compareSchoolB)).length;

        return {
          label: monthShort,
          fullLabel: `เดือน ${monthFull}`,
          total,
          completed,
          cumulativeTotal: runningTotal,
          cumulativeCompleted: runningCompleted,
          bpp21,
          bpp22,
          bpp23,
          bpp24,
          countSchoolA,
          countSchoolB,
        };
      });
    } else {
      // 4 Quarters: Q1 to Q4
      const quarters = [
        { key: "Q1", label: "ไตรมาส 1", fullLabel: "ไตรมาสที่ 1 (ม.ค. - มี.ค.)", months: [1, 2, 3] },
        { key: "Q2", label: "ไตรมาส 2", fullLabel: "ไตรมาสที่ 2 (เม.ย. - มิ.ย.)", months: [4, 5, 6] },
        { key: "Q3", label: "ไตรมาส 3", fullLabel: "ไตรมาสที่ 3 (ก.ค. - ก.ย.)", months: [7, 8, 9] },
        { key: "Q4", label: "ไตรมาส 4", fullLabel: "ไตรมาสที่ 4 (ต.ค. - ธ.ค.)", months: [10, 11, 12] },
      ];

      let runningTotal = 0;
      let runningCompleted = 0;

      return quarters.map((q) => {
        const qReports = baseReports.filter((r) => {
          const dt = parseReportDateDetails(r);
          if (!dt) return false;
          return q.months.includes(dt.month) || dt.quarter === q.key;
        });

        const total = qReports.length;
        const completed = qReports.filter((r) => r.status === ReportStatus.COMPLETED).length;

        runningTotal += total;
        runningCompleted += completed;

        const bpp21 = qReports.filter((r) => getSchoolGroupName(r.schoolName).includes("21")).length;
        const bpp22 = qReports.filter((r) => getSchoolGroupName(r.schoolName).includes("22")).length;
        const bpp23 = qReports.filter((r) => getSchoolGroupName(r.schoolName).includes("23")).length;
        const bpp24 = qReports.filter((r) => getSchoolGroupName(r.schoolName).includes("24")).length;

        const countSchoolA = qReports.filter((r) => isSchoolMatch(r.schoolName, compareSchoolA)).length;
        const countSchoolB = qReports.filter((r) => isSchoolMatch(r.schoolName, compareSchoolB)).length;

        return {
          label: q.label,
          fullLabel: q.fullLabel,
          total,
          completed,
          cumulativeTotal: runningTotal,
          cumulativeCompleted: runningCompleted,
          bpp21,
          bpp22,
          bpp23,
          bpp24,
          countSchoolA,
          countSchoolB,
        };
      });
    }
  }, [periodFilteredReports, trendGranularity, trendGoalFilter, compareSchoolA, compareSchoolB, getSchoolGroupName]);

  // Statistics derived from trend chart
  const trendStats = useMemo(() => {
    let peakItem = trendChartData[0] || { label: "-", fullLabel: "-", total: 0 };
    let totalInTrend = 0;
    let completedInTrend = 0;

    trendChartData.forEach((item) => {
      totalInTrend += item.total;
      completedInTrend += item.completed;
      if (item.total > peakItem.total) {
        peakItem = item;
      }
    });

    const peakPeriodName = peakItem ? peakItem.fullLabel || peakItem.label : "-";
    const peakCount = peakItem ? peakItem.total : 0;
    const countItems = trendChartData.length || 1;
    const avgPerPeriod = Math.round(totalInTrend / countItems);
    const trendCompletionRate = totalInTrend > 0 ? Math.round((completedInTrend / totalInTrend) * 100) : 0;

    return {
      peakPeriodName,
      peakCount,
      avgPerPeriod,
      trendCompletionRate,
    };
  }, [trendChartData]);

  // Selected Goal for the Interactive Explorer
  const selectedGoal = useMemo(() => {
    return KOPODOT_GOALS.find((g) => g.id === selectedGoalId) || KOPODOT_GOALS[0];
  }, [selectedGoalId]);

  // Indicators corresponding to the selected Goal in the Explorer
  const selectedGoalIndicators = useMemo(() => {
    return OFFICIAL_INDICATORS.filter(
      (ind) => ind.goalId === selectedGoalId && 
      (indicatorSearch === "" || 
       ind.name.toLowerCase().includes(indicatorSearch.toLowerCase()) ||
       ind.code.toLowerCase().includes(indicatorSearch.toLowerCase()) ||
       ind.id.toLowerCase().includes(indicatorSearch.toLowerCase()))
    );
  }, [selectedGoalId, indicatorSearch]);

  // Active Indicator selected within the selected Goal
  const activeIndicator = useMemo(() => {
    if (selectedGoalIndicators.length === 0) return null;
    const found = selectedGoalIndicators.find((ind) => ind.id === activeIndicatorId);
    return found || selectedGoalIndicators[0];
  }, [selectedGoalIndicators, activeIndicatorId]);

  // Reports corresponding to the selected Goal in the Explorer
  const selectedGoalReports = useMemo(() => {
    return periodFilteredReports.filter((r) => getGoalIdFromCode(r.goalCode) === selectedGoal.id);
  }, [periodFilteredReports, selectedGoal]);

  // Filtered and paginated reports list for the Dashboard bottom table
  const filteredReports = useMemo(() => {
    const list = periodFilteredReports.filter((r) => {
      const groupName = getSchoolGroupName(r.schoolName);
      const query = tableSearch.toLowerCase().trim();
      const queryNorm = query.replace(/[^a-z0-9ก-๙]/g, '').replace('ชำปะโต', 'ซำปะโต');

      const schoolNameLower = (r.schoolName || "").toLowerCase();
      const schoolNameNorm = schoolNameLower.replace(/[^a-z0-9ก-๙]/g, '').replace('ชำปะโต', 'ซำปะโต');
      const schoolNameCore = schoolNameNorm.replace(/รรตชด|โรงเรียนตำรวจตระเวนชายแดน|ศกรตชด|ศศช/g, '');

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

      const matchGoal = tableGoalFilter === "all" || getGoalIdFromCode(r.goalCode) === Number(tableGoalFilter);
      const matchGroup = tableGroupFilter === "all" || groupName.includes(tableGroupFilter);
      const matchStatus = 
        tableStatusFilter === "all" ||
        (tableStatusFilter === "completed_board" && r.status === ReportStatus.COMPLETED) ||
        (tableStatusFilter === "pending" && r.status !== ReportStatus.COMPLETED);
      return matchSearch && matchGoal && matchGroup && matchStatus;
    });

    if (groupByGoal) {
      return [...list].sort((a, b) => getGoalIdFromCode(a.goalCode) - getGoalIdFromCode(b.goalCode));
    }
    return list;
  }, [periodFilteredReports, tableSearch, tableGoalFilter, tableGroupFilter, tableStatusFilter, groupByGoal, getSchoolGroupName]);

  // Reset current page when filters or grouping changes
  useEffect(() => {
    setCurrentPage(1);
  }, [tableSearch, tableGoalFilter, tableGroupFilter, tableStatusFilter, groupByGoal]);

  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReports, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [tableSearch, tableGoalFilter, tableGroupFilter, tableStatusFilter]);

  useEffect(() => {
    setReporterModalPage(1);
  }, [reporterSearch, showAllReportersModal]);

  useEffect(() => {
    setSchoolFreqModalPage(1);
  }, [schoolFreqSearch, showAllSchoolFreqModal]);

  const selectedGoalStats = useMemo(() => {
    const schoolsSet = new Set<string>();
    selectedGoalReports.forEach((r) => {
      const canonicalSchool = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(r.schoolName, s.name))?.name || r.schoolName;
      if (canonicalSchool) schoolsSet.add(canonicalSchool);
    });
    // คำนวณจำนวนผู้เข้าร่วมกิจกรรมทั้งหมดในเป้าหมายนี้นับจากรายงานโดยตรง ให้ตรงกับรายงานมากที่สุด
    const totalParticipants = selectedGoalReports.reduce((acc, r) => acc + extractReportParticipantCount(r), 0);

    return {
      count: selectedGoalReports.length,
      participants: totalParticipants,
      schools: schoolsSet.size,
    };
  }, [selectedGoalReports]);

  const handleTeacherClick = useCallback((teacherCleanName: string) => {
    setTableSearch(teacherCleanName);
    const tableEl = document.getElementById("reports-table-card") || document.getElementById("activity-reports-section");
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(value);
  };

  const handleExportCSV = useCallback(() => {
    if (!filteredReports || filteredReports.length === 0) {
      alert("ไม่พบข้อมูลรายงานที่ตรงตามเงื่อนไขสำหรับส่งออก");
      return;
    }

    const headers = [
      "รหัสรายงาน",
      "ชื่อกิจกรรม",
      "ชื่อโครงการ",
      "เป้าหมายหลัก",
      "โรงเรียน",
      "สังกัด/พื้นที่",
      "กลุ่มเป้าหมาย",
      "จำนวนผู้เข้าร่วม",
      "ไตรมาส/งบประมาณ",
      "วันที่ดำเนินงาน",
      "วัตถุประสงค์",
      "ผลเชิงปริมาณ",
      "ผลเชิงคุณภาพ",
      "ปัญหาอุปสรรค",
      "ข้อเสนอแนะ",
      "ผู้รายงาน",
      "ตำแหน่ง",
      "สถานะ"
    ];

    const rows = filteredReports.map((r) => [
      `"${r.id || ''}"`,
      `"${(r.activityName || '').replace(/"/g, '""')}"`,
      `"${(r.projectName || '').replace(/"/g, '""')}"`,
      `"${(r.goalCode || '').replace(/"/g, '""')}"`,
      `"${(r.schoolName || '').replace(/"/g, '""')}"`,
      `"${(r.location || '').replace(/"/g, '""')}"`,
      `"${(r.targetGroup || '').replace(/"/g, '""')}"`,
      `${r.participantsCount || 0}`,
      `"${(r.reportingPeriod || '').replace(/"/g, '""')}"`,
      `"${(r.dateString || '').replace(/"/g, '""')}"`,
      `"${(r.objectives || '').replace(/"/g, '""')}"`,
      `"${(r.quantitativeOutcome || '').replace(/"/g, '""')}"`,
      `"${(r.qualitativeOutcome || '').replace(/"/g, '""')}"`,
      `"${(r.problems || '').replace(/"/g, '""')}"`,
      `"${(r.suggestions || '').replace(/"/g, '""')}"`,
      `"${(r.reportedBy || '').replace(/"/g, '""')}"`,
      `"${(r.reportPosition || '').replace(/"/g, '""')}"`,
      `"${r.status || ''}"`
    ]);

    const csvString = [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
    const blob = createWindowsSafeCsvBlob(csvString);
    const fileName = sanitizeWindowsFilename(`รายงาน_กพด5_ส่งออก_${new Date().toISOString().slice(0, 10)}.csv`);
    triggerWindowsFileDownload(blob, fileName);
  }, [filteredReports]);

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      
      {/* Top Executive Dashboard Section: 2-Column Responsive Layout */}
      <DashboardExecutiveHero
        kpis={kpis}
        overviewStats={overviewStats}
        learningCenterStats={learningCenterStats}
        dailyReportStats={dailyReportStats}
        allDailyReportStats={allDailyReportStats}
        weeklyAndMonthlyMetrics={weeklyAndMonthlyMetrics}
        weeklyFilterOptions={weeklyFilterOptions}
        monthlyFilterOptions={monthlyFilterOptions}
        topGoalsList={topGoalsList}
        targetGroupClassroomList={targetGroupClassroomList}
        selectedDailyHistoryDate={selectedDailyHistoryDate}
        setSelectedDailyHistoryDate={setSelectedDailyHistoryDate}
        dailyHistorySearch={dailyHistorySearch}
        setDailyHistorySearch={setDailyHistorySearch}
        isDailyHistoryInlineOpen={isDailyHistoryInlineOpen}
        setIsDailyHistoryInlineOpen={setIsDailyHistoryInlineOpen}
        dailyHistoryViewMode={dailyHistoryViewMode}
        setDailyHistoryViewMode={setDailyHistoryViewMode}
        selectedWeekFilter={selectedWeekFilter}
        setSelectedWeekFilter={setSelectedWeekFilter}
        selectedMonthFilter={selectedMonthFilter}
        setSelectedMonthFilter={setSelectedMonthFilter}
        selectedAcademicYear={selectedAcademicYear}
        selectedQuarter={selectedQuarter}
        selectedMonth={selectedMonth}
        topSearch={topSearch}
        resetTimeFilters={resetTimeFilters}
        onSelectReport={onSelectReport}
        onOpenExecutiveOnePage={onOpenExecutiveOnePage}
        onOpenThailandMap={onOpenThailandMap}
        onOpenOfflineModal={onOpenOfflineModal}
        onAutoFetchData={onAutoFetchData}
        isSyncing={isSyncing}
        offlineDraftsCount={offlineDraftsCount}
        setSelectedGroup={setSelectedGroup}
        setShowLearningCenterModal={setShowLearningCenterModal}
        setShowMissingSchoolsModal={setShowMissingSchoolsModal}
        onSelectGoalFilter={onSelectGoalFilter}
        onOpenBannerCustomizer={onOpenBannerCustomizer}
        reports={reports}
      />







      {/* 3. Visual Charts and Executive Intelligence */}
      <div className="space-y-6">
        
        {/* Line Chart - Activity reports trend analysis (รายเดือน / รายไตรมาส) */}
        <div className="app-card-surface flex flex-col space-y-4">
          <div className="space-y-4 pb-4 border-b border-slate-100">
            {/* Header Title Block */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                <div className="p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 border border-indigo-100/80">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h2 
                    className="typo-app-h2 font-extrabold text-slate-900 tracking-tight leading-snug break-words"
                    title="แนวโน้มและวิเคราะห์การส่งรายงานกิจกรรม"
                  >
                    แนวโน้มและวิเคราะห์การส่งรายงานกิจกรรม
                  </h2>
                  <p 
                    className="typo-app-subtext text-slate-500 font-medium break-words leading-relaxed"
                    style={{ fontSize: "10px" }}
                    title="รวมแนวโน้มสถิติรายเดือน / ไตรมาส แบบกราฟแท่งและกราฟเส้น วิเคราะห์เปรียบเทียบตามสังกัด กก.ตชด."
                  >
                    รวมแนวโน้มสถิติรายเดือน / ไตรมาส แบบกราฟแท่งและกราฟเส้น วิเคราะห์เปรียบเทียบตามสังกัด กก.ตชด.
                  </p>
                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="pt-2 w-full">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                {/* Filter by Goal */}
                <select
                  value={trendGoalFilter}
                  onChange={(e) => setTrendGoalFilter(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition min-w-0 truncate"
                >
                  <option value="all">เป้าหมายหลัก: ทั้งหมด (1-8)</option>
                  {KOPODOT_GOALS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code}: {g.title}
                    </option>
                  ))}
                </select>

                {/* Monthly vs Quarterly Toggle */}
                <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/90 text-xs font-bold w-full min-w-0">
                  <button
                    type="button"
                    onClick={() => setTrendGranularity("monthly")}
                    className={`flex-1 text-center px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap truncate ${
                      trendGranularity === "monthly"
                        ? "bg-white text-indigo-900 shadow-2xs font-extrabold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="สรุปรายเดือน (Monthly)"
                  >
                    รายเดือน
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendGranularity("quarterly")}
                    className={`flex-1 text-center px-2.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap truncate ${
                      trendGranularity === "quarterly"
                        ? "bg-white text-indigo-900 shadow-2xs font-extrabold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="สรุปรายไตรมาส (Quarterly)"
                  >
                    รายไตรมาส
                  </button>
                </div>

                {/* Metric Selector */}
                <select
                  value={trendMetric}
                  onChange={(e) => setTrendMetric(e.target.value as "total_vs_completed" | "by_bpp_group" | "cumulative_growth" | "school_comparison")}
                  className="w-full text-xs px-3 py-2 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 rounded-xl font-bold text-indigo-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition min-w-0 truncate"
                >
                  <option value="total_vs_completed">รายงานทั้งหมด VS เสร็จสิ้นแล้ว</option>
                  <option value="by_bpp_group">เปรียบเทียบแยกตาม กก.ตชด. 21-24</option>
                  <option value="cumulative_growth">แนวโน้มความก้าวหน้าสะสม (Cumulative)</option>
                  <option value="school_comparison">เปรียบเทียบแนวโน้มรายโรงเรียน (School vs School)</option>
                </select>
              </div>
            </div>
          </div>

          {/* School Comparison Selectors (Only shown in school_comparison mode) */}
          {trendMetric === "school_comparison" && (
            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex flex-col sm:flex-row items-center gap-3">
              <span className="text-xs font-extrabold text-indigo-900 shrink-0 flex items-center gap-1.5">
                <School className="w-4 h-4 text-indigo-600" />
                เลือกโรงเรียนเป้าหมายที่ต้องการเปรียบเทียบแนวโน้ม:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-blue-600">โรงเรียน 1:</span>
                  <select
                    value={compareSchoolA}
                    onChange={(e) => setCompareSchoolA(e.target.value)}
                    className="text-xs w-full p-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 shadow-2xs"
                  >
                    {OFFICIAL_TARGET_SCHOOLS.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.groupName})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-rose-600">โรงเรียน 2:</span>
                  <select
                    value={compareSchoolB}
                    onChange={(e) => setCompareSchoolB(e.target.value)}
                    className="text-xs w-full p-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 shadow-2xs"
                  >
                    {OFFICIAL_TARGET_SCHOOLS.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.groupName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Recharts LineChart */}
          <div className="h-[280px] sm:h-[360px] md:h-[440px] lg:h-[500px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart
                data={trendChartData}
                margin={{ top: 20, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} fontWeight={600} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} fontWeight={600} tickFormatter={(val) => toThaiNumerals(val)} />
                <Tooltip
                  formatter={(value, name) => [`${toThaiNumerals(Number(value))} กิจกรรม`, name]}
                  labelFormatter={(label, items) => {
                    if (items && items[0] && items[0].payload) {
                      return items[0].payload.fullLabel || label;
                    }
                    return label;
                  }}
                  contentStyle={{ backgroundColor: "#0f172a", color: "#f8fafc", borderRadius: "12px", border: "1px solid #1e293b", fontSize: "12px", padding: "8px 12px", fontWeight: "bold" }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: "12px", fontWeight: "bold", paddingTop: "10px" }} />
                
                {trendMetric === "total_vs_completed" && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="รายงานกิจกรรมทั้งหมด"
                      stroke="#6366F1"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: "#6366F1", strokeWidth: 1.5, stroke: "#FFFFFF" }}
                      activeDot={{ r: 6, fill: "#4F46E5" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      name="เสร็จสิ้นแล้ว"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: "#10B981", strokeWidth: 1.5, stroke: "#FFFFFF" }}
                      activeDot={{ r: 6, fill: "#059669" }}
                    />
                  </>
                )}

                {trendMetric === "by_bpp_group" && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="bpp21"
                      name="กก.ตชด.21"
                      stroke="#3B82F6"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bpp22"
                      name="กก.ตชด.22"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bpp23"
                      name="กก.ตชด.23"
                      stroke="#F59E0B"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bpp24"
                      name="กก.ตชด.24"
                      stroke="#EC4899"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  </>
                )}

                {trendMetric === "cumulative_growth" && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="cumulativeTotal"
                      name="ความก้าวหน้ารายงานสะสม (Cumulative)"
                      stroke="#8B5CF6"
                      strokeWidth={3.5}
                      dot={{ r: 5, fill: "#8B5CF6", strokeWidth: 2, stroke: "#FFFFFF" }}
                      activeDot={{ r: 8, fill: "#7C3AED" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulativeCompleted"
                      name="งานเสร็จสิ้นสะสม"
                      stroke="#059669"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#059669", strokeWidth: 2, stroke: "#FFFFFF" }}
                      activeDot={{ r: 7, fill: "#047857" }}
                    />
                  </>
                )}

                {trendMetric === "school_comparison" && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="countSchoolA"
                      name={compareSchoolA.length > 20 ? compareSchoolA.substring(0, 20) + "..." : compareSchoolA}
                      stroke="#2563EB"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "#2563EB", strokeWidth: 2, stroke: "#FFFFFF" }}
                      activeDot={{ r: 7, fill: "#1D4ED8" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="countSchoolB"
                      name={compareSchoolB.length > 20 ? compareSchoolB.substring(0, 20) + "..." : compareSchoolB}
                      stroke="#E11D48"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "#E11D48", strokeWidth: 2, stroke: "#FFFFFF" }}
                      activeDot={{ r: 7, fill: "#BE123C" }}
                    />
                  </>
                )}
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>

          {/* Integrated Monthly/Quarterly Bar Overview & KPI Badges (ย้ายลงมาอยู่บรรทัดล่างสุด) */}
          <div className="space-y-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13.5px] font-extrabold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>
                  {trendGranularity === "monthly"
                    ? "แท่งสถิติจำนวนการส่งรายงานรายเดือน (Monthly Summary Bars)"
                    : "แท่งสถิติจำนวนการส่งรายงานรายไตรมาส (Quarterly Summary Bars)"}
                </span>
              </span>
              <span className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                {trendGranularity === "monthly"
                  ? (monthlyBarTrend.length > 0 ? `${monthlyBarTrend[0]?.name} - ${monthlyBarTrend[monthlyBarTrend.length - 1]?.name}` : "รายเดือน")
                  : "ไตรมาส 1 - 4"}
              </span>
            </div>

            {(() => {
              const activeBars = trendGranularity === "monthly" ? monthlyBarTrend : quarterlyBarTrend;
              const maxVal = Math.max(...activeBars.map((x) => x.count), 1);
              return (
                <div
                  className="grid gap-1.5 items-end h-48 sm:h-56 md:h-64 pt-3 pb-1 border-t border-slate-200/70"
                  style={{ gridTemplateColumns: `repeat(${activeBars.length}, minmax(0, 1fr))` }}
                >
                  {activeBars.map((m) => {
                    const barHeightPct = Math.max(10, Math.round((m.count / maxVal) * 100));
                    return (
                      <div key={m.name} className="flex flex-col items-center justify-end h-full group">
                        <span className={`text-[11px] font-black mb-1 transition ${m.isPeak ? "text-amber-600 scale-110" : "text-slate-600"}`}>
                          {toThaiNumerals(m.count)}
                        </span>
                        <div
                          style={{ height: `${barHeightPct}%` }}
                          className={`w-full max-w-[38px] rounded-t-md transition-all duration-300 ${
                            m.isPeak
                              ? "bg-gradient-to-t from-amber-500 to-yellow-400 shadow-md shadow-amber-200"
                              : "bg-indigo-500 hover:bg-indigo-600"
                          }`}
                        />
                        <span className="text-[10px] sm:text-xs font-bold text-slate-700 mt-1 truncate max-w-full">
                          {(m as any).shortName || m.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* KPI Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
            <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs space-y-0.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                {trendGranularity === "monthly" ? "เดือนที่มีรายงานสูงสุด" : "ไตรมาสที่มีรายงานสูงสุด"}
              </span>
              <p className="text-xs md:text-sm font-extrabold text-indigo-950 truncate">{trendStats.peakPeriodName}</p>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs space-y-0.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">รายงานสูงสุดในงวด</span>
              <p className="text-xs md:text-sm font-extrabold text-emerald-700">{toThaiNumerals(trendStats.peakCount)} กิจกรรม</p>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs space-y-0.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                เฉลี่ยต่อ{trendGranularity === "monthly" ? "เดือน" : "ไตรมาส"}
              </span>
              <p className="text-xs md:text-sm font-extrabold text-blue-700">{toThaiNumerals(trendStats.avgPerPeriod)} กิจกรรม</p>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs space-y-0.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">อัตราการเสร็จสิ้นรวม</span>
              <p className="text-xs md:text-sm font-extrabold text-purple-700">{toThaiNumerals(trendStats.trendCompletionRate)}%</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-1 font-medium leading-relaxed italic">
            * กราฟเส้นแสดงแนวโน้มรายงานกิจกรรมตามอนุกรมเวลา (Time Series) ใช้ไลบรารี Recharts วิเคราะห์ความก้าวหน้าและการเติบโตของโครงการ กพด. ฉบับที่ 5
          </p>
        </div>
        
        {/* Bar Chart - Activity reports analysis by Goal */}
        <div className="app-card-surface flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-3.5 min-w-0 flex-1">
              <div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-xl shadow-md shadow-indigo-200/50 border border-indigo-400/30 shrink-0">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <h2 
                  className="font-extrabold text-slate-900 tracking-tight leading-snug break-words typo-app-h2"
                  style={{ fontSize: "15px" }}
                  title="เปรียบเทียบจำนวนรายงานกิจกรรมทั้งหมด เทียบ กิจกรรมที่เสร็จสิ้น รายเป้าหมายหลัก"
                >
                  เปรียบเทียบจำนวนรายงานกิจกรรมทั้งหมด เทียบ กิจกรรมที่เสร็จสิ้น รายเป้าหมายหลัก
                </h2>
                <p 
                  className="typo-app-subtext text-xs sm:text-sm text-slate-500 font-medium break-words leading-normal"
                  title="วิเคราะห์สถิติจำนวนรายงานโครงการที่ส่งในระบบแยกตามรายด้านเป้าหมาย กพด. 8 มิติ"
                >
                  วิเคราะห์สถิติจำนวนรายงานโครงการที่ส่งในระบบแยกตามรายด้านเป้าหมาย กพด. 8 มิติ
                </p>
              </div>
            </div>
          </div>
          
          <div className="h-[300px] sm:h-[380px] md:h-[460px] lg:h-[520px] w-full flex-grow relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={goalChartData}
                margin={{ top: 24, right: 15, left: -10, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="goalCode" stroke="#64748B" fontSize={11} tickLine={false} fontWeight={600} tickFormatter={(val) => String(val).replace("ด้านที่ ", "ด.")} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} fontWeight={600} tickFormatter={(val) => toThaiNumerals(val)} />
                <Tooltip
                  formatter={(value) => [`${toThaiNumerals(Number(value))} กิจกรรม`, ""]}
                  labelFormatter={(index) => {
                    const item = goalChartData.find(g => g.goalCode === index);
                    return item ? item.fullTitle : index;
                  }}
                  contentStyle={{ backgroundColor: "#0f172a", color: "#f8fafc", borderRadius: "10px", border: "1px solid #1e293b", fontSize: "12px", padding: "8px 12px", fontWeight: "bold" }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: "12px", fontWeight: "bold", paddingTop: "10px" }} />
                <Bar dataKey="activityCount" fill="#94A3B8" opacity={0.65} name="รายงานกิจกรรมทั้งหมด" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="activityCount" position="top" style={{ fontSize: '10.5px', fontWeight: '700', fill: '#475569' }} formatter={(val: any) => Number(val) > 0 ? toThaiNumerals(val) : ''} />
                </Bar>
                <Bar dataKey="completedCount" fill="#10B981" name="เสร็จสิ้นแล้ว" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="completedCount" position="top" style={{ fontSize: '10.5px', fontWeight: '700', fill: '#047857' }} formatter={(val: any) => Number(val) > 0 ? toThaiNumerals(val) : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <p className="text-[10px] text-slate-400 mt-2 font-medium leading-relaxed italic">
            * วิเคราะห์สถิติจำนวนรายงานโครงการที่ส่งในระบบแยกตามรายด้านเป้าหมาย กพด. 8 มิติ
          </p>
        </div>

      </div>



      {/* Missing Schools Modal */}
      {showMissingSchoolsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 text-rose-900 min-w-0 flex-1 mr-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <h3 
                  className="font-black text-sm sm:text-base md:text-lg lg:text-xl tracking-tight leading-snug whitespace-nowrap overflow-hidden text-ellipsis"
                  title={`รายชื่อโรงเรียนที่ยังขาดส่งรายงาน (${overviewStats.missingSchoolsCount} แห่ง)`}
                >
                  รายชื่อโรงเรียนที่ยังขาดส่งรายงาน ({overviewStats.missingSchoolsCount} แห่ง)
                </h3>
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
                overviewStats.missingSchools.map((s, idx) => {
                  const gps = getSchoolGpsBySchoolName(s.name);
                  const isNeverSubmitted = !s.hasReports;

                  return (
                    <div key={s.id} className={`p-3.5 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isNeverSubmitted ? "bg-rose-50/40 border-rose-200" : "bg-slate-50 border-slate-200"
                    }`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-black text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-md">
                            #{toThaiNumerals(idx + 1)}
                          </span>
                          <p className="font-bold text-slate-900 text-xs sm:text-sm">{s.name}</p>
                          {isNeverSubmitted ? (
                            <span className="text-[10px] font-black text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              🔴 ไม่เคยส่งรายงานเลย
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              🟠 ค้างส่งในงวดนี้
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">ต.{s.subdistrict} อ.{s.district} จ.{s.province}</p>
                        
                        {/* Display specific missing periods */}
                        <div className="mt-2 space-y-1 bg-white p-2 rounded-lg border border-slate-100/80">
                          {s.missingQuarters && s.missingQuarters.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-100">
                                ขาดไตรมาส:
                              </span>
                              {s.missingQuarters.length === (s.expectedQuarters?.length || 1) ? (
                                <span className="text-[9px] font-bold text-rose-700 bg-rose-100/50 px-1 py-0.2 rounded">
                                  ขาดส่งทุกรอบ ({s.expectedQuarters?.[0] === s.currentMaxQuarter ? s.currentMaxQuarter : `${s.expectedQuarters?.[0] || "Q1"}-${s.currentMaxQuarter || "Q2"}`})
                                </span>
                              ) : (
                                s.missingQuarters.map((q) => (
                                  <span key={q} className="text-[9px] font-bold text-rose-700 bg-rose-100/50 px-1 py-0.2 rounded">
                                    {q.replace("Q1", "ไตรมาส 1").replace("Q2", "ไตรมาส 2").replace("Q3", "ไตรมาส 3").replace("Q4", "ไตรมาส 4")}
                                  </span>
                                ))
                              )}
                            </div>
                          )}
                          {s.missingMonths && s.missingMonths.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[9px] font-extrabold text-amber-600 bg-amber-50 px-1 py-0.2 rounded border border-amber-100">
                                ขาดรายเดือน:
                              </span>
                              {s.missingMonths.length === (s.expectedMonths?.length || 1) ? (
                                <span className="text-[9px] font-bold text-amber-700 bg-amber-100/50 px-1 py-0.2 rounded">
                                  ขาดส่งทุกเดือน ({s.currentMinMonth === s.currentMaxMonth ? THAI_MONTH_SHORT[s.currentMaxMonth || 6] : `${THAI_MONTH_SHORT[s.currentMinMonth || 5]}-${THAI_MONTH_SHORT[s.currentMaxMonth || 6]}`})
                                </span>
                              ) : (
                                <span className="flex flex-wrap gap-1 max-w-[300px]">
                                  {s.missingMonths.map((m) => (
                                    <span key={m} className="text-[9px] font-bold text-amber-700 bg-amber-100/50 px-1 py-0.2 rounded">
                                      {THAI_MONTH_SHORT[m]}
                                    </span>
                                  ))}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {gps && (
                          <a
                            href={`https://www.google.com/maps?q=${gps[0]},${gps[1]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-indigo-700 hover:text-indigo-900 font-bold bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-100 transition mt-2"
                            title="เปิด Google Maps ปักหมุด GPS"
                          >
                            <MapPin className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span>นำทาง {gps[0]}, {gps[1]}</span>
                          </a>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 shrink-0 self-start sm:self-center">
                        {s.groupName.replace("กองกำกับการตำรวจตระเวนชายแดนที่", "กก.ตชด.")}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              {onOpenSubmissionTracker && (
                <button
                  onClick={() => {
                    setShowMissingSchoolsModal(false);
                    onOpenSubmissionTracker();
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>เปิดระบบติดตามการส่งรายงาน & ออกหนังสือติดตามอัตโนมัติ</span>
                </button>
              )}
              <button
                onClick={() => setShowMissingSchoolsModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl cursor-pointer ml-auto"
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

          <div className="bg-white rounded-2xl sm:rounded-3xl border border-indigo-200/90 shadow-2xl overflow-hidden max-w-4xl w-full relative z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 bg-indigo-500/25 text-indigo-300 rounded-xl border border-indigo-400/30 shrink-0 shadow-2xs">
                  <Trophy className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 
                    className="font-extrabold text-sm sm:text-base text-white tracking-tight leading-snug whitespace-nowrap overflow-hidden text-ellipsis"
                    title="ตารางจัดลำดับอัตโนมัติ (จำนวนการส่งรายงานมากไปน้อย)"
                  >
                    ตารางจัดลำดับอัตโนมัติ (จำนวนการส่งรายงานมากไปน้อย)
                  </h3>
                  <p 
                    className="text-[10.5px] text-indigo-200/90 font-normal whitespace-nowrap overflow-hidden text-ellipsis"
                    title={`รวมเป้าหมาย ${toThaiNumerals(schoolRankings.length)} โรงเรียน จาก 4 กองกำกับการ`}
                  >
                    รวมเป้าหมาย {toThaiNumerals(schoolRankings.length)} โรงเรียน จาก 4 กองกำกับการ
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowRankingsModal(false);
                  setRankingSearch("");
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

             {/* Search Filter Bar */}
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0 flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อโรงเรียน สังกัด หรือจังหวัด..."
                  value={rankingSearch}
                  onChange={(e) => setRankingSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 font-medium"
                />
              </div>

              <select
                value={rankingGroupFilter}
                onChange={(e) => setRankingGroupFilter(e.target.value)}
                className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 font-bold text-slate-700 cursor-pointer"
              >
                <option value="all">ทุกสังกัด กก.ตชด. (21-24)</option>
                <option value="21">กก.ตชด.21</option>
                <option value="22">กก.ตชด.22</option>
                <option value="23">กก.ตชด.23</option>
                <option value="24">กก.ตชด.24</option>
              </select>

              <select
                value={rankingSortMode}
                onChange={(e) => setRankingSortMode(e.target.value as "original" | "count")}
                className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 font-bold text-slate-700 cursor-pointer"
              >
                <option value="original">เรียงตามลำดับโรงเรียนเดิม (SCH-001..053)</option>
                <option value="count">จัดอันดับตามจำนวนรายงาน (มากไปน้อย)</option>
              </select>
            </div>

            {/* Table Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-2 flex-1 modal-scrollable-content">
              <table className="w-full text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-center w-14">{rankingSortMode === "original" ? "ลำดับ" : "อันดับ"}</th>
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
                    .map((s, idx) => {
                      const realRank = schoolRankings.findIndex((item) => item.id === s.id) + 1;
                      const originalSeqNum = OFFICIAL_TARGET_SCHOOLS.findIndex((item) => item.id === s.id) + 1;
                      const displayNum = rankingSortMode === "original" ? originalSeqNum : realRank;
                      return (
                        <tr key={s.id} className="hover:bg-indigo-50/50 transition-colors">
                          <td className="px-3 py-2 text-center">
                            {rankingSortMode === "count" && realRank === 1 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-slate-900 font-black text-[10px] shadow-2xs">
                                1
                              </span>
                            ) : rankingSortMode === "count" && realRank === 2 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-300 text-slate-800 font-black text-[10px]">
                                2
                              </span>
                            ) : rankingSortMode === "count" && realRank === 3 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-700 text-amber-50 font-black text-[10px]">
                                3
                              </span>
                            ) : (
                              <span className="text-slate-600 font-bold text-xs">{toThaiNumerals(displayNum)}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-800 text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{s.name}</span>
                              {(() => {
                                const gps = getSchoolGpsBySchoolName(s.name);
                                if (!gps) return null;
                                return (
                                  <a
                                    href={`https://www.google.com/maps?q=${gps[0]},${gps[1]}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[9.5px] text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-100 transition shrink-0 font-bold"
                                    title={`เปิด Google Maps ปักหมุด GPS: ${gps[0]}, ${gps[1]}`}
                                  >
                                    <MapPin className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                    <span>แผนที่</span>
                                  </a>
                                );
                              })()}
                            </div>
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

      {/* All Reporters / Teachers Modal (หน้าต่างลอยแสดงรายชื่อครูและผู้จัดทำรายงานทั้งหมด) */}
      {showAllReportersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-auto">
          <div 
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-[2px] transition-opacity cursor-pointer" 
            onClick={() => {
              setShowAllReportersModal(false);
              setReporterSearch("");
              setReporterModalPage(1);
            }}
          />

          <div className="bg-white rounded-2xl sm:rounded-3xl border border-indigo-200/90 shadow-2xl overflow-hidden max-w-2xl w-full relative z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 bg-indigo-500/25 text-indigo-300 rounded-xl border border-indigo-400/30 shrink-0 shadow-2xs">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                    ทำเนียบรายชื่อครูและผู้จัดทำรายงานกิจกรรมทั้งหมด
                  </h3>
                  <p className="text-[10.5px] text-indigo-200/90 font-normal">
                    รวมทั้งสิ้น {toThaiNumerals(topReportersList.length)} ท่าน ในระบบสารสนเทศ กพด.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAllReportersModal(false);
                  setReporterSearch("");
                  setReporterModalPage(1);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="ปิดหน้าต่าง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={reporterSearch}
                  onChange={(e) => {
                    setReporterSearch(e.target.value);
                    setReporterModalPage(1);
                  }}
                  placeholder="ค้นหาชื่อครู ผู้รายงาน หรือสังกัดโรงเรียน..."
                  className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition font-medium"
                />
                {reporterSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setReporterSearch("");
                      setReporterModalPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List items */}
            {(() => {
              const filtered = topReportersList.filter((r) => {
                if (!reporterSearch.trim()) return true;
                const q = reporterSearch.toLowerCase().trim();
                return (
                  r.name.toLowerCase().includes(q) ||
                  (r.schoolName || "").toLowerCase().includes(q)
                );
              });
              const totalPages = Math.max(1, Math.ceil(filtered.length / 8));
              const currentP = Math.min(reporterModalPage, totalPages);
              const paginated = filtered.slice((currentP - 1) * 8, currentP * 8);

              return (
                <>
                  <div className="p-4 sm:p-5 overflow-y-auto space-y-1.5 flex-1 modal-scrollable-content">
                    {paginated.length > 0 ? (
                      paginated.map((item, idx) => {
                        const rank = (currentP - 1) * 8 + idx + 1;
                        return (
                          <div
                            key={`${item.name}-${rank}`}
                            onClick={() => {
                              handleTeacherClick(item.cleanName);
                              setShowAllReportersModal(false);
                            }}
                            className="flex items-center justify-between text-xs p-2.5 bg-slate-50/80 hover:bg-indigo-50/80 rounded-xl border border-slate-200/80 hover:border-indigo-300 transition duration-150 cursor-pointer active:scale-[0.99]"
                            title={`คลิกเพื่อดูรายงานทั้งหมดของ ${item.name} (${toThaiNumerals(item.count)} รายการ)`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                              {rank === 1 ? (
                                <span className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                                  1
                                </span>
                              ) : rank === 2 ? (
                                <span className="w-5 h-5 rounded-full bg-slate-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                                  2
                                </span>
                              ) : rank === 3 ? (
                                <span className="w-5 h-5 rounded-full bg-amber-700 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                                  3
                                </span>
                              ) : (
                                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-900 font-bold text-[10px] flex items-center justify-center shrink-0 border border-indigo-200">
                                  {toThaiNumerals(rank)}
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-slate-800 font-bold truncate text-xs" title={item.name}>
                                  {item.name}
                                </p>
                                {item.schoolName && (
                                  <p className="text-[10px] text-slate-500 font-medium truncate" title={item.schoolName}>
                                    {item.schoolName}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100 shrink-0 text-[11px] whitespace-nowrap">
                              {toThaiNumerals(item.count)} รายการ
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        ไม่พบรายชื่อครูหรือผู้รายงานที่ตรงกับคำค้นหา
                      </div>
                    )}
                  </div>

                  {/* Pagination & Footer */}
                  <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
                      <button
                        type="button"
                        disabled={currentP <= 1}
                        onClick={() => setReporterModalPage((p) => Math.max(1, p - 1))}
                        className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="หน้าก่อนหน้า"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] px-1 whitespace-nowrap">
                        หน้า {toThaiNumerals(currentP)} / {toThaiNumerals(totalPages)}
                      </span>
                      <button
                        type="button"
                        disabled={currentP >= totalPages}
                        onClick={() => setReporterModalPage((p) => Math.min(totalPages, p + 1))}
                        className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="หน้าถัดไป"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAllReportersModal(false);
                        setReporterSearch("");
                        setReporterModalPage(1);
                      }}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      ปิดหน้าต่าง
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* All School Frequency Modal */}
      {showAllSchoolFreqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-auto">
          <div 
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-[2px] transition-opacity cursor-pointer" 
            onClick={() => {
              setShowAllSchoolFreqModal(false);
              setSchoolFreqSearch("");
              setSchoolFreqModalPage(1);
            }}
          />

          <div className="bg-white rounded-2xl sm:rounded-3xl border border-amber-200/90 shadow-2xl overflow-hidden max-w-2xl w-full relative z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-amber-900/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 bg-amber-500/25 text-amber-300 rounded-xl border border-amber-400/30 shrink-0 shadow-2xs">
                  <Award className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                    ทำเนียบโรงเรียนส่งรายงานสูงสุด
                  </h3>
                  <p className="text-[10.5px] text-amber-200/90 font-normal">
                    รวมทั้งสิ้น {toThaiNumerals(topSchoolFrequencyList.length)} แห่ง ในระบบสารสนเทศ กพด.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAllSchoolFreqModal(false);
                  setSchoolFreqSearch("");
                  setSchoolFreqModalPage(1);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="ปิดหน้าต่าง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={schoolFreqSearch}
                  onChange={(e) => {
                    setSchoolFreqSearch(e.target.value);
                    setSchoolFreqModalPage(1);
                  }}
                  placeholder="ค้นหาชื่อโรงเรียน หรือสังกัด กก.ตชด..."
                  className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition font-medium"
                />
                {schoolFreqSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setSchoolFreqSearch("");
                      setSchoolFreqModalPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List items */}
            {(() => {
              const filtered = topSchoolFrequencyList.filter((s) => {
                if (!schoolFreqSearch.trim()) return true;
                const q = schoolFreqSearch.toLowerCase().trim();
                const matchedSchool = OFFICIAL_TARGET_SCHOOLS.find((sch) => isSchoolMatch(sch.name, s.name));
                const grp = (matchedSchool?.groupName || "").toLowerCase();
                const prov = (matchedSchool?.province || "").toLowerCase();
                return (
                  s.name.toLowerCase().includes(q) ||
                  grp.includes(q) ||
                  prov.includes(q)
                );
              });
              const totalPages = Math.max(1, Math.ceil(filtered.length / 8));
              const currentP = Math.min(schoolFreqModalPage, totalPages);
              const paginated = filtered.slice((currentP - 1) * 8, currentP * 8);

              return (
                <>
                  <div className="p-4 sm:p-5 overflow-y-auto space-y-1.5 flex-1 modal-scrollable-content">
                    {paginated.length > 0 ? (
                      paginated.map((item, idx) => {
                        const rank = (currentP - 1) * 8 + idx + 1;
                        const matchedSchool = OFFICIAL_TARGET_SCHOOLS.find((sch) => isSchoolMatch(sch.name, item.name));
                        const grpLabel = matchedSchool?.groupName 
                          ? matchedSchool.groupName.replace("กองกำกับการตำรวจตระเวนชายแดนที่", "กก.ตชด.") 
                          : "";
                        return (
                          <div
                            key={`${item.name}-${rank}`}
                            className="flex items-center justify-between text-xs p-2.5 bg-slate-50/80 hover:bg-amber-50/50 rounded-xl border border-slate-200/80 hover:border-amber-200 transition duration-150"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                              {rank === 1 ? (
                                <span className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                                  1
                                </span>
                              ) : rank === 2 ? (
                                <span className="w-5 h-5 rounded-full bg-slate-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                                  2
                                </span>
                              ) : rank === 3 ? (
                                <span className="w-5 h-5 rounded-full bg-amber-700 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                                  3
                                </span>
                              ) : (
                                <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0 border border-amber-200">
                                  {toThaiNumerals(rank)}
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-slate-900 font-bold truncate text-xs" title={item.name}>
                                  {item.name}
                                </p>
                                {grpLabel && (
                                  <p className="text-[10px] text-amber-700 font-semibold truncate" title={grpLabel}>
                                    {grpLabel}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200 shrink-0 text-[11px] whitespace-nowrap">
                              {toThaiNumerals(item.count)} รายการ
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        ไม่พบโรงเรียนที่ตรงกับคำค้นหา
                      </div>
                    )}
                  </div>

                  {/* Pagination & Footer */}
                  <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
                      <button
                        type="button"
                        disabled={currentP <= 1}
                        onClick={() => setSchoolFreqModalPage((p) => Math.max(1, p - 1))}
                        className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="หน้าก่อนหน้า"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] px-1 whitespace-nowrap">
                        หน้า {toThaiNumerals(currentP)} / {toThaiNumerals(totalPages)}
                      </span>
                      <button
                        type="button"
                        disabled={currentP >= totalPages}
                        onClick={() => setSchoolFreqModalPage((p) => Math.min(totalPages, p + 1))}
                        className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="หน้าถัดไป"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAllSchoolFreqModal(false);
                        setSchoolFreqSearch("");
                        setSchoolFreqModalPage(1);
                      }}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      ปิดหน้าต่าง
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* School Comparison Multi-Select Modal */}
      <SchoolComparisonModal
        reports={reports}
        isOpen={showSchoolComparisonModal}
        onClose={() => setShowSchoolComparisonModal(false)}
        toThaiNumerals={toThaiNumerals}
      />

      {/* Executive Presentation / TV View Modal */}
      <ExecutivePresentationModal
        reports={reports}
        isOpen={showExecutivePresentationModal}
        onClose={() => setShowExecutivePresentationModal(false)}
        toThaiNumerals={toThaiNumerals}
      />

      {/* Report Corrections & Support Tickets Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity cursor-pointer" 
            onClick={() => {
              setShowCorrectionModal(false);
              setAdminModeActive(false);
            }}
          />
          
          {/* Modal Container */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-w-2xl w-full relative z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-rose-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="typo-app-h3 text-slate-900">ศูนย์ประสานงานแก้ไขและลบข้อมูลรายงาน</h3>
                  <p className="typo-app-subtext">ประสานงานผู้ดูแลระบบส่วนกลางเพื่อปรับปรุงข้อมูลให้ถูกต้อง</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCorrectionModal(false);
                  setAdminModeActive(false);
                }}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Tabs */}
            <div className="bg-slate-50 px-5 sm:px-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-1.5 py-2">
                <button
                  type="button"
                  onClick={() => setAdminModeActive(false)}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    !adminModeActive 
                      ? "bg-white text-rose-700 shadow-xs border border-slate-200" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  แจ้งเรื่องแก้ไข / ลบรายงาน
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminModeActive(true);
                  }}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    adminModeActive 
                      ? "bg-rose-600 text-white shadow-xs" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  แผงควบคุมตั๋ว (Admin Console)
                </button>
              </div>
              
              <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>เชื่อมต่อระบบจัดการตั๋วแล้ว</span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto max-h-[70vh] space-y-4">
              
              {!adminModeActive ? (
                /* User Form Block */
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const reporterName = formData.get("reporterName") as string;
                  const reporterPosition = formData.get("reporterPosition") as string;
                  const contactInfo = formData.get("contactInfo") as string;
                  const targetSchool = formData.get("targetSchool") as string;
                  const targetPeriod = formData.get("targetPeriod") as string;
                  const correctionType = formData.get("correctionType") as string;
                  const reportId = formData.get("reportId") as string;
                  const detail = formData.get("detail") as string;

                  const ticketId = `KPD-TK-${Date.now().toString().slice(-6)}`;
                  const newTicket = {
                    id: ticketId,
                    reporterName,
                    reporterPosition,
                    contactInfo,
                    targetSchool,
                    targetPeriod,
                    correctionType,
                    reportId,
                    detail,
                    status: "รอดำเนินการ",
                    createdAt: new Date().toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })
                  };

                  try {
                    const saved = window.localStorage.getItem("admin_correction_tickets");
                    const list = saved ? JSON.parse(saved) : [];
                    list.unshift(newTicket);
                    window.localStorage.setItem("admin_correction_tickets", JSON.stringify(list));
                    setCorrectionVersion(prev => prev + 1);
                    alert(`ส่งประสานงานสำเร็จแล้ว!\nหมายเลขตั๋วประสานงานของคุณคือ: ${ticketId}\nผู้ดูแลระบบจะตรวจสอบและอัปเดตข้อมูลให้ท่านอย่างเร็วที่สุด`);
                    e.currentTarget.reset();
                  } catch (err) {
                    console.error(err);
                  }
                }} className="space-y-4">
                  
                  <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 flex gap-3 text-rose-950">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-black">คำแนะนำการแจ้งลบหรือแก้ไขข้อมูล:</p>
                      <p className="text-[11px] font-bold text-rose-900/90 leading-relaxed">
                        ในกรณีที่มีรายงานผลการปฏิบัติงานซ้ำซ้อน ส่งผิดโรงเรียน หรือพบค่าสถิติที่ไม่ถูกต้อง กรุณาระบุรายละเอียดตั๋วส่งคำขอด้านล่างนี้ เจ้าหน้าที่ศูนย์ประสานงานจะดำเนินการแก้ไขข้อมูลต้นทางให้ทันที
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* ชื่อผู้แจ้ง */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">ชื่อผู้แจ้งเรื่อง *</label>
                      <input
                        type="text"
                        name="reporterName"
                        required
                        placeholder="เช่น ร.ต.อ. สมศักดิ์ ใฝ่ดี"
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition font-semibold"
                      />
                    </div>

                    {/* ตำแหน่ง */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">สังกัด / ตำแหน่ง *</label>
                      <input
                        type="text"
                        name="reporterPosition"
                        required
                        placeholder="เช่น ครูใหญ่ รร.ตชด.บ้านสร้อยทอง"
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition font-semibold"
                      />
                    </div>

                    {/* ข้อมูลติดต่อกลับ */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">เบอร์โทรศัพท์ / ไลน์ติดต่อ *</label>
                      <input
                        type="text"
                        name="contactInfo"
                        required
                        placeholder="เช่น 089-123-xxxx"
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* โรงเรียนที่ต้องการแก้ไข */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">โรงเรียน ตชด. ที่เกี่ยวข้อง *</label>
                      <select
                        name="targetSchool"
                        required
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition font-bold"
                      >
                        <option value="">-- กรุณาเลือกโรงเรียน --</option>
                        {OFFICIAL_TARGET_SCHOOLS.map((s) => (
                          <option key={s.id} value={s.name}>{s.name} ({s.province})</option>
                        ))}
                      </select>
                    </div>

                    {/* ไตรมาส / ปีการศึกษา */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">ไตรมาส / ปีการศึกษา *</label>
                      <input
                        type="text"
                        name="targetPeriod"
                        required
                        placeholder="เช่น ไตรมาสที่ 1/2569"
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* ประเภทเรื่อง */}
                    <div className="space-y-1 sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700">ประเภทเรื่องที่ต้องการดำเนินการ *</label>
                      <select
                        name="correctionType"
                        required
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition font-bold"
                      >
                        <option value="ลบรายงานเนื่องจากส่งข้อมูลซ้ำซ้อน">ขอลบรายงานเนื่องจากส่งข้อมูลซ้ำซ้อน</option>
                        <option value="ลบรายงานเนื่องจากลงผิดกิจกรรม">ขอลบรายงานเนื่องจากลงผิดกิจกรรม</option>
                        <option value="แก้ไขยอดผู้เข้าร่วม/สถิติข้อมูล">ขอแก้ไขตัวเลขสถิติ/จำนวนผู้เข้าร่วม</option>
                        <option value="แก้ไขรายละเอียดผลการดำเนินงานและรูปภาพ">ขอแก้ไขรายละเอียดความเรียบร้อยและรูปภาพ</option>
                        <option value="อื่นๆ (ระบุในรายละเอียดเพิ่มเติม)">อื่นๆ (ระบุรายละเอียดด้านล่าง)</option>
                      </select>
                    </div>

                    {/* รหัสรายงานเดิม */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                        <span>รหัสรายงาน (ถ้ามี)</span>
                        <span className="text-[10px] text-slate-400 font-normal">(เช่น REP-001)</span>
                      </label>
                      <input
                        type="text"
                        name="reportId"
                        placeholder="ระบุรหัสอ้างอิงเพื่อความรวดเร็ว"
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition font-semibold"
                      />
                    </div>
                  </div>

                  {/* รายละเอียดเพิ่มเติม */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">รายละเอียดข้อมูลและข้อความที่ต้องการปรับปรุงแก้ไข *</label>
                    <textarea
                      name="detail"
                      required
                      rows={3}
                      placeholder="อธิบายข้อมูลเดิมที่ผิดพลาด และระบุข้อมูลใหม่ที่ถูกต้องอย่างชัดเจนเพื่อให้เจ้าหน้าที่ดำเนินการ..."
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition font-semibold leading-relaxed"
                    />
                  </div>

                  {/* Submission Action */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCorrectionModal(false)}
                      className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-md hover:shadow-lg flex items-center gap-1.5"
                    >
                      <Send className="w-4 h-4" />
                      <span>ส่งใบคำขอประสานงาน</span>
                    </button>
                  </div>

                </form>
              ) : (
                /* Admin Console Block */
                <div className="space-y-4">
                  {/* Password Authorization */}
                  {(() => {
                    const [passInput, setPassInput] = useState("");
                    const [isUnlocked, setIsUnlocked] = useState(() => {
                      if (typeof window !== "undefined") {
                        return window.sessionStorage.getItem("admin_authenticated") === "true";
                      }
                      return false;
                    });

                    if (!isUnlocked) {
                      return (
                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl max-w-sm mx-auto text-center space-y-4">
                          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
                            <ShieldAlert className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-slate-900">ปลดล็อกแผงควบคุมผู้ดูแลระบบ</h4>
                            <p className="text-xs text-slate-500 font-semibold">กรุณากรอกรหัสผ่านเพื่ออนุมัติการลบและแก้ไขข้อมูล</p>
                          </div>
                          <div className="space-y-2">
                            <input
                              type="password"
                              placeholder="กรอกรหัสผ่าน (kopodot2026)"
                              value={passInput}
                              onChange={(e) => setPassInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && passInput === "kopodot2026") {
                                  setIsUnlocked(true);
                                  window.sessionStorage.setItem("admin_authenticated", "true");
                                }
                              }}
                              className="w-full px-3 py-2 text-center text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-black tracking-widest"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (passInput === "kopodot2026") {
                                  setIsUnlocked(true);
                                  window.sessionStorage.setItem("admin_authenticated", "true");
                                } else {
                                  alert("รหัสผ่านไม่ถูกต้อง!");
                                }
                              }}
                              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition cursor-pointer"
                            >
                              เข้าสู่ระบบผู้ดูแล
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // Admin Interface is Authenticated
                    return (
                      <div className="space-y-4">
                        
                        {/* Admin Action Bar */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4.5 h-4.5 text-rose-600" />
                            <span className="text-xs font-black text-rose-950">โหมดแอดมิน: ตรวจสอบตั๋วประสานงานลบ/แก้ไขข้อมูล</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("คุณต้องการล้างข้อมูลคำขอแก้ไขทั้งหมดหรือไม่?")) {
                                window.localStorage.removeItem("admin_correction_tickets");
                                setCorrectionVersion(prev => prev + 1);
                              }
                            }}
                            className="px-2.5 py-1 text-[11px] font-black text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition border border-slate-200 cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>ล้างรายการตั๋ว</span>
                          </button>
                        </div>

                        {/* List of Tickets */}
                        {correctionTickets.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 space-y-2">
                            <ClipboardList className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                            <p className="text-xs font-bold">ไม่มีรายการคำขอประสานงานในขณะนี้</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {correctionTickets.map((ticket: any) => (
                              <div key={ticket.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-slate-300 transition space-y-3 relative overflow-hidden">
                                
                                {/* Status Flag Banner */}
                                <div className="absolute top-0 right-0">
                                  <span className={`inline-block px-3 py-1 text-[10px] font-black rounded-bl-xl text-white ${
                                    ticket.status === "รอดำเนินการ" ? "bg-amber-500" :
                                    ticket.status === "กำลังดำเนินการ" ? "bg-blue-600" :
                                    ticket.status === "แก้ไขเรียบร้อยแล้ว" ? "bg-emerald-600" :
                                    "bg-rose-600"
                                  }`}>
                                    {ticket.status}
                                  </span>
                                </div>

                                <div className="space-y-1 pr-24">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-black text-slate-900">{ticket.id}</span>
                                    <span className="text-[10px] font-bold text-slate-400">• {ticket.createdAt}</span>
                                  </div>
                                  <h4 className="text-xs font-black text-rose-800">
                                    รร.ตชด. {ticket.targetSchool} ({ticket.targetPeriod})
                                  </h4>
                                  <p className="text-[11px] font-black text-indigo-950">
                                    เรื่อง: {ticket.correctionType} {ticket.reportId ? `[อ้างอิง: ${ticket.reportId}]` : ""}
                                  </p>
                                </div>

                                <div className="p-3 bg-white border border-slate-200/60 rounded-xl">
                                  <p className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {ticket.detail}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold flex-wrap gap-2 pt-1">
                                  <div>
                                    ผู้แจ้ง: <span className="text-slate-800 font-extrabold">{ticket.reporterName}</span> ({ticket.reporterPosition}) โทร. <span className="text-slate-800 font-extrabold">{ticket.contactInfo}</span>
                                  </div>

                                  {/* Admin Action controls */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // Change status logic
                                        const nextStatus = 
                                          ticket.status === "รอดำเนินการ" ? "กำลังดำเนินการ" :
                                          ticket.status === "กำลังดำเนินการ" ? "แก้ไขเรียบร้อยแล้ว" :
                                          "รอดำเนินการ";
                                        
                                        const saved = window.localStorage.getItem("admin_correction_tickets");
                                        if (saved) {
                                          const list = JSON.parse(saved);
                                          const updated = list.map((t: any) => t.id === ticket.id ? { ...t, status: nextStatus } : t);
                                          window.localStorage.setItem("admin_correction_tickets", JSON.stringify(updated));
                                          setCorrectionVersion(prev => prev + 1);
                                        }
                                      }}
                                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black text-indigo-700 transition cursor-pointer"
                                    >
                                      ปรับสถานะ
                                    </button>

                                    {/* Real execution delete button! */}
                                    {ticket.reportId && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (confirm(`คุณต้องการอนุมัติและสั่งการลบรายงาน ID: ${ticket.reportId} ของ ${ticket.targetSchool} ทันทีหรือไม่?`)) {
                                            // 1. Add to delete blacklist
                                            const delSaved = window.localStorage.getItem("admin_deleted_report_ids");
                                            const delList = delSaved ? JSON.parse(delSaved) : [];
                                            if (!delList.includes(ticket.reportId)) {
                                              delList.push(ticket.reportId);
                                              window.localStorage.setItem("admin_deleted_report_ids", JSON.stringify(delList));
                                            }

                                            // 2. Mark ticket as complete
                                            const saved = window.localStorage.getItem("admin_correction_tickets");
                                            if (saved) {
                                              const list = JSON.parse(saved);
                                              const updated = list.map((t: any) => t.id === ticket.id ? { ...t, status: "แก้ไขเรียบร้อยแล้ว" } : t);
                                              window.localStorage.setItem("admin_correction_tickets", JSON.stringify(updated));
                                            }

                                            // 3. Update local state versions to trigger live rerender
                                            setCorrectionVersion(prev => prev + 1);
                                            alert("สั่งการลบเสร็จสิ้น! ข้อมูลรายงานถูกลบออกจากสถิติการคำนวณและแผนภาพแดชบอร์ดอย่างถาวรแล้ว");
                                          }
                                        }}
                                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-[10px] font-black text-rose-700 transition cursor-pointer"
                                        title="ลบรายงาน ID นี้ออกจากสถิติหลักทันที"
                                      >
                                        ลบข้อมูลรายงานถาวร
                                      </button>
                                    )}

                                    {/* Delete Ticket button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm("คุณต้องการลบตั๋วใบนี้จากประวัติประสานงานหรือไม่?")) {
                                          const saved = window.localStorage.getItem("admin_correction_tickets");
                                          if (saved) {
                                            const list = JSON.parse(saved);
                                            const filtered = list.filter((t: any) => t.id !== ticket.id);
                                            window.localStorage.setItem("admin_correction_tickets", JSON.stringify(filtered));
                                            setCorrectionVersion(prev => prev + 1);
                                          }
                                        }
                                      }}
                                      className="px-2 py-1 text-[10px] hover:text-rose-600 transition cursor-pointer"
                                    >
                                      ลบตั๋ว
                                    </button>
                                  </div>
                                </div>

                              </div>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              window.sessionStorage.removeItem("admin_authenticated");
                              setAdminModeActive(false);
                            }}
                            className="px-4 py-1.5 border border-slate-200 text-slate-500 hover:text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            ออกจากโหมดผู้ดูแล
                          </button>
                        </div>

                      </div>
                    );
                  })()}
                </div>
              )}

            </div>
          </div>
        </div>
      )}



      {/* School Learning Center & Citizen Visitors Analytics Modal */}
      {showLearningCenterModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity cursor-pointer" 
            onClick={() => {
              setShowLearningCenterModal(false);
              setLearningCenterSearch("");
            }}
          />

          <div className="bg-white rounded-2xl sm:rounded-3xl border border-sky-200/90 shadow-2xl overflow-hidden max-w-4xl w-full relative z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-sky-900/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-sky-500/20 text-sky-300 rounded-xl border border-sky-400/30 shrink-0 shadow-2xs">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 
                    className="typo-app-h2 text-base sm:text-lg text-white font-black tracking-tight leading-snug truncate"
                    title="สถิติประชาชนและชุมชนเข้าใช้บริการศูนย์การเรียนรู้ของโรงเรียน"
                  >
                    สถิติประชาชนและชุมชนเข้าใช้บริการศูนย์การเรียนรู้ของโรงเรียน
                  </h3>
                  <p 
                    className="typo-app-subtext text-sky-200/90 text-xs font-normal truncate"
                    title="การเปิดพื้นที่สถานศึกษาเป็นแหล่งเรียนรู้ ถ่ายทอดความรู้ และนวัตกรรมสู่ชุมชน (กพด.5 ด้านที่ 7 และด้านที่ 8)"
                  >
                    การเปิดพื้นที่สถานศึกษาเป็นแหล่งเรียนรู้ ถ่ายทอดความรู้ และบริการประชาชน (กพด.5 ด้านที่ 7 และด้านที่ 8)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowLearningCenterModal(false);
                  setLearningCenterSearch("");
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Summary Stat Cards Inside Modal */}
            <div className="p-4 sm:p-5 bg-sky-50/40 border-b border-sky-100 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              <div className="bg-white p-3 rounded-xl border border-sky-200/80 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-extrabold text-slate-600">ประชาชน/ผู้รับบริการสะสม</span>
                <p className="text-xl sm:text-2xl font-black text-sky-700 mt-1">
                  {toThaiNumerals(learningCenterStats.totalVisitors.toLocaleString())} <span className="text-xs font-bold text-slate-400">คน</span>
                </p>
                <span className="text-[10px] text-sky-600 font-bold mt-1">รวมทุกกลุ่มเป้าหมายชุมชน</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-sky-200/80 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-extrabold text-slate-600">กิจกรรมเปิดพื้นที่เรียนรู้</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {toThaiNumerals(learningCenterStats.totalActivities)} <span className="text-xs font-bold text-slate-400">กิจกรรม</span>
                </p>
                <span className="text-[10px] text-slate-500 font-bold mt-1">ด้านที่ 7 และด้านที่ 8</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-sky-200/80 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-extrabold text-slate-600">สถานศึกษาศูนย์การเรียนรู้</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                  {toThaiNumerals(learningCenterStats.activeSchoolsCount)} <span className="text-xs font-bold text-slate-400">/ 53 แห่ง</span>
                </p>
                <span className="text-[10px] text-emerald-600 font-bold mt-1">ครอบคลุม {toThaiNumerals(Math.round((learningCenterStats.activeSchoolsCount / 53) * 100))}%</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-sky-200/80 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-extrabold text-slate-600">กลุ่มประชาชนผู้รับประโยชน์</span>
                <p className="text-xl sm:text-2xl font-black text-indigo-700 mt-1">
                  5 <span className="text-xs font-bold text-slate-400">กลุ่มหลัก</span>
                </p>
                <span className="text-[10px] text-indigo-600 font-bold mt-1">ประชาชน/ผู้ปกครอง/เกษตรกร</span>
              </div>
            </div>

            {/* Filter and Tab Navigation Bar */}
            <div className="px-5 py-3 bg-white border-b border-slate-200 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Tab Selector */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLearningCenterTab("schools")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    learningCenterTab === "schools"
                      ? "bg-white text-sky-900 shadow-2xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  รายชื่อโรงเรียน ({toThaiNumerals(learningCenterStats.activeSchoolsCount)})
                </button>
                <button
                  type="button"
                  onClick={() => setLearningCenterTab("target_groups")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    learningCenterTab === "target_groups"
                      ? "bg-white text-sky-900 shadow-2xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  กลุ่มประชาชนผู้รับบริการ
                </button>
                <button
                  type="button"
                  onClick={() => setLearningCenterTab("activities")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    learningCenterTab === "activities"
                      ? "bg-white text-sky-900 shadow-2xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  รายการกิจกรรม ({toThaiNumerals(learningCenterStats.totalActivities)})
                </button>
              </div>

              {/* Search & Group Filter */}
              <div className="flex items-center gap-2 flex-1 sm:justify-end">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหาโรงเรียน หรือกิจกรรม..."
                    value={learningCenterSearch}
                    onChange={(e) => setLearningCenterSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400 font-medium"
                  />
                </div>
                <select
                  value={learningCenterGroupFilter}
                  onChange={(e) => setLearningCenterGroupFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer"
                >
                  <option value="all">ทุก กก.ตชด. (21-24)</option>
                  <option value="21">กก.ตชด.21</option>
                  <option value="22">กก.ตชด.22</option>
                  <option value="23">กก.ตชด.23</option>
                  <option value="24">กก.ตชด.24</option>
                </select>
              </div>
            </div>

            {/* Modal Body Content */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 modal-scrollable-content bg-slate-50/50">
              
              {/* TAB 1: SCHOOLS RANKING */}
              {learningCenterTab === "schools" && (() => {
                const q = learningCenterSearch.toLowerCase().trim();
                const filteredSchools = learningCenterStats.activeSchoolsList.filter((s) => {
                  const matchGroup = learningCenterGroupFilter === "all" || s.groupName.includes(learningCenterGroupFilter);
                  const matchSearch = !q || s.schoolName.toLowerCase().includes(q) || s.province.toLowerCase().includes(q) || s.district.toLowerCase().includes(q);
                  return matchGroup && matchSearch;
                });

                return (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-black text-slate-700">
                        จัดลำดับสถานศึกษาที่มีประชาชนเข้าใช้บริการศูนย์การเรียนรู้สูงสุด ({toThaiNumerals(filteredSchools.length)} แห่ง)
                      </span>
                      <span className="text-[11px] text-slate-500 font-bold">เรียงตามจำนวนผู้มาใช้บริการ</span>
                    </div>

                    {filteredSchools.length === 0 ? (
                      <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 text-slate-400">
                        <GraduationCap className="w-10 h-10 mx-auto text-slate-300 stroke-1 mb-2" />
                        <p className="text-xs font-bold">ไม่พบข้อมูลสถานศึกษาที่ตรงกับเงื่อนไขการค้นหา</p>
                      </div>
                    ) : (
                      filteredSchools.map((school, idx) => {
                        const rank = idx + 1;
                        return (
                          <div
                            key={school.schoolName}
                            className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-sky-300 hover:shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                              {rank === 1 ? (
                                <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                  1
                                </span>
                              ) : rank === 2 ? (
                                <span className="w-7 h-7 rounded-xl bg-slate-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                  2
                                </span>
                              ) : rank === 3 ? (
                                <span className="w-7 h-7 rounded-xl bg-amber-700 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                  3
                                </span>
                              ) : (
                                <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                                  {toThaiNumerals(rank)}
                                </span>
                              )}
                              
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-black text-slate-900 text-xs sm:text-sm">{school.schoolName}</h4>
                                  <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.2 rounded-md border border-sky-200">
                                    {school.groupName.replace("กองกำกับการตำรวจตระเวนชายแดนที่", "กก.ตชด.")}
                                  </span>
                                </div>
                                {(school.district || school.province) && (
                                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                    ต.{school.subdistrict} อ.{school.district} จ.{school.province}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                              <div className="text-right">
                                <p className="text-base sm:text-lg font-black text-sky-700">
                                  {toThaiNumerals(school.visitors.toLocaleString())} <span className="text-xs font-bold text-slate-400">คน</span>
                                </p>
                                <p className="text-[10px] font-bold text-slate-500">
                                  {toThaiNumerals(school.count)} กิจกรรมบริการความรู้
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })()}

              {/* TAB 2: TARGET GROUPS & REGIONAL BREAKDOWN */}
              {learningCenterTab === "target_groups" && (
                <div className="space-y-4">
                  {/* Citizen Target Groups Breakdown Card */}
                  <div className="app-card-surface p-4 sm:p-5">
                    <h4 className="typo-app-h3 text-slate-900 font-black mb-3">
                      สัดส่วนประชาชนและกลุ่มเป้าหมายผู้รับบริการศูนย์การเรียนรู้
                    </h4>
                    <div className="space-y-3">
                      {learningCenterStats.targetGroups.map((group) => (
                        <div key={group.label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-800">{group.label}</span>
                            <span className="text-slate-900 font-black">
                              {toThaiNumerals(group.count.toLocaleString())} คน ({toThaiNumerals(group.percent)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(2, group.percent)}%`, backgroundColor: group.color }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4 BPP Groups Regional Stats */}
                  <div className="app-card-surface p-4 sm:p-5">
                    <h4 className="typo-app-h3 text-slate-900 font-black mb-3">
                      สถิติจำแนกตามกองกำกับการ (กก.ตชด. 21 - 24)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {learningCenterStats.groupBreakdown.map((grp) => (
                        <div key={grp.groupCode} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-900 text-xs sm:text-sm">{grp.groupTitle}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">
                              {toThaiNumerals(grp.activeSchools)} / {toThaiNumerals(grp.totalTargetSchools)} รร.
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between pt-1 border-t border-slate-200/80 text-xs">
                            <span className="text-slate-500 font-medium">ประชาชนเข้าใช้บริการ:</span>
                            <span className="font-black text-sky-700 text-sm">{toThaiNumerals(grp.visitorsCount.toLocaleString())} คน</span>
                          </div>
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="text-slate-500 font-medium">กิจกรรมบริการความรู้:</span>
                            <span className="font-bold text-slate-800">{toThaiNumerals(grp.activitiesCount)} กิจกรรม</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ACTIVITIES CATALOG */}
              {learningCenterTab === "activities" && (() => {
                const q = learningCenterSearch.toLowerCase().trim();
                const filteredReports = learningCenterStats.reports.filter((r) => {
                  const matched = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(r.schoolName, s.name));
                  const groupName = matched ? matched.groupName : "";
                  const matchGroup = learningCenterGroupFilter === "all" || groupName.includes(learningCenterGroupFilter);
                  const allText = `${r.activityName || ""} ${r.schoolName || ""} ${r.objectives || ""} ${r.targetGroup || ""}`.toLowerCase();
                  const matchSearch = !q || allText.includes(q);
                  return matchGroup && matchSearch;
                });

                return (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-black text-slate-700">
                        รายการกิจกรรมศูนย์การเรียนรู้และการบริการประชาชน ({toThaiNumerals(filteredReports.length)} รายการ)
                      </span>
                    </div>

                    {filteredReports.length === 0 ? (
                      <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 text-slate-400">
                        <FileText className="w-10 h-10 mx-auto text-slate-300 stroke-1 mb-2" />
                        <p className="text-xs font-bold">ไม่พบกิจกรรมที่ตรงกับคำค้นหา</p>
                      </div>
                    ) : (
                      filteredReports.map((report) => (
                        <div
                          key={report.id}
                          className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-sky-300 hover:shadow-xs transition space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black text-sky-800 bg-sky-50 px-2 py-0.2 rounded border border-sky-200">
                                  {report.schoolName}
                                </span>
                                {report.goalCode && (
                                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                                    {report.goalCode}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug">
                                {report.activityName}
                              </h4>
                              {report.objectives && (
                                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                                  {report.objectives}
                                </p>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <span className="inline-block px-2.5 py-1 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl text-xs font-black">
                                {toThaiNumerals(extractReportParticipantCount(report))} คน
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                            <span className="truncate">กลุ่มเป้าหมาย: <strong className="text-slate-700">{report.targetGroup || "ประชาชน/ชุมชน"}</strong></span>
                            <button
                              type="button"
                              onClick={() => {
                                setShowLearningCenterModal(false);
                                setPreviewReportModal(report);
                              }}
                              className="text-sky-700 hover:text-sky-900 font-extrabold flex items-center gap-0.5 cursor-pointer ml-2 shrink-0 hover:underline"
                            >
                              <span>เปิดดูรายงาน</span>
                              <ChevronRight className="w-3 h-3 inline" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}

            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                ข้อมูลสรุปจากฐานข้อมูลรายงาน กพด. ฉบับจริง
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowLearningCenterModal(false);
                  setLearningCenterSearch("");
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer transition shadow-2xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visitor Satisfaction & Rating Section */}
      <VisitorRatingSection totalVisitorsCount={trafficAnalytics.totalVisitors} />

      {/* Group Checklist 24 Items PDF Modal */}
      <GroupChecklistPdfModal
        isOpen={showChecklistPdfModal}
        onClose={() => setShowChecklistPdfModal(false)}
        selectedGroupData={selectedGroupDataForPdf}
        allReports={activeReports}
      />

    </div>
  );
}

// Inline replacement for CalendarClock icon since it may not be in standard Lucide
function CalendarClock({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 12V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7.5"/>
      <path d="M16 2v4"/>
      <path d="M8 2v4"/>
      <path d="M3 10h18"/>
      <circle cx="18" cy="18" r="4"/>
      <path d="M18 16.5V18l1 1"/>
    </svg>
  );
}
