import { useState, useMemo, useRef, useEffect } from "react";
import { ActivityReport, KOPODOT_GOALS, ReportStatus, getGoalIdFromCode } from "../types";
import { 
  OFFICIAL_TARGET_SCHOOLS, 
  TargetSchool, 
  isSchoolMatch, 
  getPrincipalBySchoolName,
  getSchoolGpsBySchoolName,
  updateCustomSchoolAddress
} from "../data/schoolsData";
import { parseReportDateDetails } from "./Dashboard";
import { 
  AlertTriangle, CheckCircle2, Clock, X, FileText, Search, Filter, 
  Send, Sparkles, Printer, Download, Copy, Check, School, ShieldAlert, 
  Calendar, Layers, MapPin, ChevronLeft, ChevronRight, RefreshCw, FileCheck, BarChart3,
  Zap, Share2, LayoutGrid, Table, Plus, ArrowUpRight, Building2, Loader2
} from "lucide-react";
import { safeHtml2Canvas } from "../lib/html2canvasFix";
import jsPDF from "jspdf";
import { ROYAL_EMBLEM_IMAGE } from "../data/emblemLogo";
import { sanitizeWindowsFilename, triggerCrossPlatformDownload, getAdaptiveCanvasScale, isMobileOrTablet } from "../lib/windowsUtils";

interface SubmissionTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: ActivityReport[];
  isEmbedded?: boolean;
  onSelectSchoolFilter?: (schoolName: string) => void;
  onBookSchoolReport?: (schoolName: string) => void;
  onSelectReport?: (reportId: string) => void;
}

// Helper to convert numbers to Thai numerals for official feel
const toThaiNumerals = (num: number | string): string => {
  if (num === null || num === undefined) return "";
  const thaiToArabicMap: Record<string, string> = {
    '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
    '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9'
  };
  return String(num).replace(/[๐-๙]/g, (digit) => thaiToArabicMap[digit] || digit);
};

const THAI_MONTHS_FULL = [
  "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const THAI_MONTH_SHORT = [
  "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

const formatThaiDateToday = (): string => {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear() + 543;
  return `${toThaiNumerals(day)} ${THAI_MONTHS_FULL[month]} พ.ศ. ${toThaiNumerals(year)}`;
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

      <form onSubmit={handleSave} className="space-y-2.5">
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

        <div className="p-2 bg-indigo-100/70 rounded-xl border border-indigo-200">
          <p className="text-[9.5px] font-bold text-indigo-950 leading-snug break-words">
            <span className="font-extrabold text-indigo-900">ตัวอย่าง: </span>
            {previewAddress}
          </p>
        </div>

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

export default function SubmissionTrackerModal({ 
  isOpen, 
  onClose, 
  reports, 
  isEmbedded = false,
  onSelectSchoolFilter,
  onBookSchoolReport,
  onSelectReport
}: SubmissionTrackerModalProps) {
  useEffect(() => {
    if (isOpen && !isEmbedded) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, isEmbedded]);

  if (!isOpen && !isEmbedded) return null;

  // Determine available dataset months & quarters (from start of dataset up to present data)
  const datasetPeriods = useMemo(() => {
    // Find the first row of data of the data source
    // Since reports is sorted by latest first, the first row of the original data source (the oldest) is the last element
    const firstRow = reports.length > 0 ? reports[reports.length - 1] : null;
    const firstRowDt = firstRow ? parseReportDateDetails(firstRow) : null;
    
    // Determine start (minM) from the first row of data of the data source
    // Default to May (5) if not found or invalid
    const minM = (firstRowDt && firstRowDt.month && firstRowDt.month >= 1 && firstRowDt.month <= 12) 
      ? firstRowDt.month 
      : 5;
    
    // The present day (current month of today). Do not count into the future!
    const today = new Date();
    let maxM = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    // Cap/default to August (8) of 2026 if current clock is in a different year
    if (currentYear !== 2026) {
      maxM = 8; // August 2026
    }
    
    // Ensure maxM is not less than minM
    if (maxM < minM) {
      maxM = minM;
    }

    const months: number[] = [];
    for (let m = minM; m <= maxM; m++) {
      months.push(m);
    }

    let minQ = "Q1";
    if (minM <= 3) minQ = "Q1";
    else if (minM <= 6) minQ = "Q2";
    else if (minM <= 9) minQ = "Q3";
    else minQ = "Q4";

    let maxQ = "Q2";
    if (maxM <= 3) maxQ = "Q1";
    else if (maxM <= 6) maxQ = "Q2";
    else if (maxM <= 9) maxQ = "Q3";
    else maxQ = "Q4";

    const allQ = ["Q1", "Q2", "Q3", "Q4"];
    const minQIdx = allQ.indexOf(minQ);
    const maxQIdx = allQ.indexOf(maxQ);
    const quarters = allQ.slice(minQIdx >= 0 ? minQIdx : 0, maxQIdx >= 0 ? maxQIdx + 1 : 2);

    return { months, quarters, minM, maxM, minQ, maxQ };
  }, [reports]);

  // Filter States
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("quarterly"); // monthly, quarterly
  const [selectedMonth, setSelectedMonth] = useState<number>(datasetPeriods.maxM);
  const [selectedQuarter, setSelectedQuarter] = useState<string>(datasetPeriods.maxQ);
  const [statusFilter, setStatusFilter] = useState<"all" | "submitted" | "missing" | "never_submitted" | "missing_in_period">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [exportStatus, setExportStatus] = useState<{
    isExporting: boolean;
    progress: number;
    message: string;
  }>({
    isExporting: false,
    progress: 0,
    message: "",
  });

  // Location Cascading Filters (Cards Mode)
  const [selectedProvince, setSelectedProvince] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [selectedSubdistrict, setSelectedSubdistrict] = useState<string>("all");
  const [selectedVillage, setSelectedVillage] = useState<string>("all");
  const [gpsFilter, setGpsFilter] = useState<"all" | "has_gps" | "no_gps">("all");
  const [editingSchool, setEditingSchool] = useState<TargetSchool | null>(null);
  const [addressVersion, setAddressVersion] = useState<number>(0);

  // Dynamic Location Options
  const provinces = useMemo(() => {
    const set = new Set<string>();
    OFFICIAL_TARGET_SCHOOLS.forEach((s) => set.add(s.province));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b, "th"))];
  }, [addressVersion]);

  const districts = useMemo(() => {
    const set = new Set<string>();
    OFFICIAL_TARGET_SCHOOLS.forEach((s) => {
      if (selectedProvince === "all" || s.province === selectedProvince) {
        set.add(s.district);
      }
    });
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b, "th"))];
  }, [selectedProvince, addressVersion]);

  const subdistricts = useMemo(() => {
    const set = new Set<string>();
    OFFICIAL_TARGET_SCHOOLS.forEach((s) => {
      const matchProv = selectedProvince === "all" || s.province === selectedProvince;
      const matchDist = selectedDistrict === "all" || s.district === selectedDistrict;
      if (matchProv && matchDist) {
        set.add(s.subdistrict);
      }
    });
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b, "th"))];
  }, [selectedProvince, selectedDistrict, addressVersion]);

  const villages = useMemo(() => {
    const set = new Set<string>();
    OFFICIAL_TARGET_SCHOOLS.forEach((s) => {
      const matchProv = selectedProvince === "all" || s.province === selectedProvince;
      const matchDist = selectedDistrict === "all" || s.district === selectedDistrict;
      const matchSub = selectedSubdistrict === "all" || s.subdistrict === selectedSubdistrict;
      if (matchProv && matchDist && matchSub && s.village && s.village !== "-") {
        set.add(s.village);
      }
    });
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b, "th"))];
  }, [selectedProvince, selectedDistrict, selectedSubdistrict, addressVersion]);

  const handleProvinceChange = (val: string) => {
    setSelectedProvince(val);
    setSelectedDistrict("all");
    setSelectedSubdistrict("all");
    setSelectedVillage("all");
  };

  const handleDistrictChange = (val: string) => {
    setSelectedDistrict(val);
    setSelectedSubdistrict("all");
    setSelectedVillage("all");
  };

  const handleSubdistrictChange = (val: string) => {
    setSelectedSubdistrict(val);
    setSelectedVillage("all");
  };

  const resetLocationFilters = () => {
    setSelectedProvince("all");
    setSelectedDistrict("all");
    setSelectedSubdistrict("all");
    setSelectedVillage("all");
    setSelectedGroup("all");
    setGpsFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
  };

  useEffect(() => {
    const handleAddrUpdate = () => setAddressVersion((v) => v + 1);
    window.addEventListener("schoolAddressesUpdated", handleAddrUpdate);
    return () => window.removeEventListener("schoolAddressesUpdated", handleAddrUpdate);
  }, []);

  useEffect(() => {
    if (!datasetPeriods.months.includes(selectedMonth)) {
      setSelectedMonth(datasetPeriods.maxM);
    }
    if (!datasetPeriods.quarters.includes(selectedQuarter)) {
      setSelectedQuarter(datasetPeriods.maxQ);
    }
  }, [datasetPeriods]);

  // Selected Schools for Notice Generation
  const [selectedSchoolNames, setSelectedSchoolNames] = useState<string[]>([]);
  const [showNoticePreview, setShowNoticePreview] = useState<boolean>(false);
  
  // Custom Notice Form Fields
  const [noticeDeadlineDate, setNoticeDeadlineDate] = useState<string>("15 สิงหาคม 2569");
  const [signatoryName, setSignatoryName] = useState<string>("พันตำรวจเอก สุริยา ลาภเจริญ");
  const [signatoryPosition, setSignatoryPosition] = useState<string>("ผู้กำกับการกองกำกับการตำรวจตระเวนชายแดนที่ ๒๑");
  const [customMemoSubject, setCustomMemoSubject] = useState<string>("");
  const [customMemoBody, setCustomMemoBody] = useState<string>("");
  const [isAiPolishing, setIsAiPolishing] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Automated LINE Group Reminder State
  const [showLineReminderModal, setShowLineReminderModal] = useState<boolean>(false);
  const [isLineCopied, setIsLineCopied] = useState<boolean>(false);

  const noticePrintRef = useRef<HTMLDivElement>(null);

  // Filter Target Schools based on region, location & search
  const filteredSchoolsList = useMemo(() => {
    return OFFICIAL_TARGET_SCHOOLS.filter((school) => {
      // Province filter
      if (selectedProvince !== "all" && school.province !== selectedProvince) return false;
      // District filter
      if (selectedDistrict !== "all" && school.district !== selectedDistrict) return false;
      // Subdistrict filter
      if (selectedSubdistrict !== "all" && school.subdistrict !== selectedSubdistrict) return false;
      // Village filter
      if (selectedVillage !== "all" && school.village !== selectedVillage) return false;
      // GPS Filter
      if (gpsFilter !== "all") {
        const gps = getSchoolGpsBySchoolName(school.name);
        if (gpsFilter === "has_gps" && !gps) return false;
        if (gpsFilter === "no_gps" && gps) return false;
      }
      // Group filter
      if (selectedGroup !== "all") {
        if (!school.groupName.includes(selectedGroup)) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = school.name.toLowerCase().includes(q);
        const matchProv = school.province.toLowerCase().includes(q);
        const matchDist = school.district.toLowerCase().includes(q);
        const matchSub = school.subdistrict.toLowerCase().includes(q);
        const matchVill = school.village.toLowerCase().includes(q);
        const matchGroup = school.groupName.toLowerCase().includes(q);
        if (!matchName && !matchProv && !matchDist && !matchSub && !matchVill && !matchGroup) return false;
      }
      return true;
    });
  }, [selectedProvince, selectedDistrict, selectedSubdistrict, selectedVillage, gpsFilter, selectedGroup, searchQuery, addressVersion]);

  // Map each school to its submission data in the selected period
  const schoolSubmissionData = useMemo(() => {
    return filteredSchoolsList.map((school) => {
      // Filter reports belonging to this school
      const schoolReports = reports.filter((r) => isSchoolMatch(r.schoolName, school.name));

      // Filter reports in the chosen period
      const periodReports = schoolReports.filter((r) => {
        const dt = parseReportDateDetails(r);
        if (!dt) return true; // If date unknown, consider active
        if (selectedPeriod === "monthly") {
          return dt.month === selectedMonth;
        } else {
          return dt.quarter === selectedQuarter;
        }
      });

      const hasSubmitted = periodReports.length > 0;
      const totalReportCount = schoolReports.length;
      const neverSubmitted = totalReportCount === 0;

      // Find missing goals (out of 8 goals)
      const submittedGoalIds = new Set(
        periodReports.map((r) => getGoalIdFromCode(r.goalCode)).filter(Boolean)
      );
      const missingGoalIds = [1, 2, 3, 4, 5, 6, 7, 8].filter((id) => !submittedGoalIds.has(id));

      const lastReport = schoolReports[0]; // Reports are already sorted latest first in App

      return {
        school,
        hasSubmitted,
        neverSubmitted,
        periodReportCount: periodReports.length,
        totalReportCount,
        lastSubmittedDate: lastReport ? lastReport.dateString : "-",
        missingGoalIds,
        submittedGoalCount: submittedGoalIds.size,
      };
    });
  }, [filteredSchoolsList, reports, selectedPeriod, selectedMonth, selectedQuarter]);

  // Apply Status Filter (Submitted vs Missing vs Never Submitted vs Missing in Period)
  const displayedSubmissions = useMemo(() => {
    return schoolSubmissionData.filter((item) => {
      if (statusFilter === "submitted") return item.hasSubmitted;
      if (statusFilter === "missing") return !item.hasSubmitted;
      if (statusFilter === "never_submitted") return item.neverSubmitted;
      if (statusFilter === "missing_in_period") return !item.hasSubmitted && !item.neverSubmitted;
      return true;
    });
  }, [schoolSubmissionData, statusFilter]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGroup, searchQuery, statusFilter, selectedPeriod, selectedMonth, selectedQuarter, pageSize]);

  const totalPages = Math.ceil(displayedSubmissions.length / (pageSize || 1)) || 1;

  const paginatedSubmissions = useMemo(() => {
    if (pageSize === 0) return displayedSubmissions; // Show all
    const startIdx = (currentPage - 1) * pageSize;
    return displayedSubmissions.slice(startIdx, startIdx + pageSize);
  }, [displayedSubmissions, currentPage, pageSize]);

  // Overall KPIs
  const stats = useMemo(() => {
    const total = schoolSubmissionData.length;
    const submitted = schoolSubmissionData.filter((s) => s.hasSubmitted).length;
    const missing = total - submitted;
    const neverSubmitted = schoolSubmissionData.filter((s) => s.neverSubmitted).length;
    const missingInPeriod = schoolSubmissionData.filter((s) => !s.hasSubmitted && !s.neverSubmitted).length;
    const rate = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return { total, submitted, missing, neverSubmitted, missingInPeriod, rate };
  }, [schoolSubmissionData]);

  // Toggle school selection for notice
  const handleToggleSelectSchool = (schoolName: string) => {
    setSelectedSchoolNames((prev) =>
      prev.includes(schoolName) ? prev.filter((n) => n !== schoolName) : [...prev, schoolName]
    );
  };

  const handleSelectAllMissing = () => {
    const missingNames = schoolSubmissionData.filter((s) => !s.hasSubmitted).map((s) => s.school.name);
    if (selectedSchoolNames.length === missingNames.length) {
      setSelectedSchoolNames([]);
    } else {
      setSelectedSchoolNames(missingNames);
    }
  };

  const handleSelectNeverSubmitted = () => {
    const neverSubmittedNames = schoolSubmissionData.filter((s) => s.neverSubmitted).map((s) => s.school.name);
    setSelectedSchoolNames(neverSubmittedNames);
  };

  const handleSelectMissingInPeriod = () => {
    const missingInPeriodNames = schoolSubmissionData.filter((s) => !s.hasSubmitted && !s.neverSubmitted).map((s) => s.school.name);
    setSelectedSchoolNames(missingInPeriodNames);
  };

  // Get selected target schools objects
  const selectedSchoolObjects = useMemo(() => {
    return OFFICIAL_TARGET_SCHOOLS.filter((s) => selectedSchoolNames.includes(s.name));
  }, [selectedSchoolNames]);

  // Derived notice metadata
  const currentPeriodText = useMemo(() => {
    if (selectedPeriod === "monthly") {
      return `ประจำเดือน ${THAI_MONTHS_FULL[selectedMonth]}`;
    } else {
      const qText = selectedQuarter === "Q1" ? "๑ (ม.ค. - มี.ค.)"
        : selectedQuarter === "Q2" ? "๒ (เม.ย. - มิ.ย.)"
        : selectedQuarter === "Q3" ? "๓ (ก.ค. - ก.ย.)"
        : "๔ (ต.ค. - ธ.ค.)";
      return `ประจำไตรมาสที่ ${qText}`;
    }
  }, [selectedPeriod, selectedMonth, selectedQuarter]);

  // Generate Automated LINE Reminder Message Text
  const lineReminderText = useMemo(() => {
    const missingSchools = OFFICIAL_TARGET_SCHOOLS.filter((s) => {
      const isFilterMatch = selectedGroup === "ALL" || s.groupName === selectedGroup;
      if (!isFilterMatch) return false;
      const data = schoolSubmissionData.find((item) => item.school.name === s.name);
      return data ? !data.hasSubmitted : true;
    });

    const groupedByDivision: Record<string, string[]> = {};
    missingSchools.forEach((s) => {
      const divName = s.groupName.replace("กองกำกับการตำรวจตระเวนชายแดนที่", "กก.ตชด.");
      if (!groupedByDivision[divName]) groupedByDivision[divName] = [];
      groupedByDivision[divName].push(s.name);
    });

    let msg = `🚨 [แจ้งเตือนสรุปค้างส่งรายงาน] ระบบติดตาม กพด. ฉบับที่ 5\n`;
    msg += `📌 ${currentPeriodText}\n`;
    msg += `📊 ส่งแล้ว ${toThaiNumerals(stats.submitted)}/53 แห่ง | ค้างส่ง ${toThaiNumerals(missingSchools.length)} แห่ง\n`;
    msg += `-----------------------------------\n`;

    if (missingSchools.length === 0) {
      msg += `🎉 ทุกโรงเรียน ตชด. ในสังกัด ได้จัดส่งรายงานครบถ้วนแล้ว\n`;
    } else {
      Object.entries(groupedByDivision).forEach(([div, names]) => {
        msg += `🔴 ${div} (ค้างส่ง ${toThaiNumerals(names.length)} แห่ง):\n`;
        names.forEach((name, i) => {
          msg += `   ${toThaiNumerals(i + 1)}. ${name}\n`;
        });
      });
      msg += `-----------------------------------\n`;
      msg += `⏰ โปรดบันทึกรายงานภายในวันที่: ${toThaiNumerals(noticeDeadlineDate)}\n`;
      msg += `🔗 ลิงก์บันทึกรายงาน: ${typeof window !== "undefined" ? window.location.origin : "https://bpp-kopodot5.org"}\n`;
      msg += `🙏 งานส่งเสริมการศึกษา กองกำกับการตำรวจตระเวนชายแดน ขอขอบคุณครับ`;
    }

    return msg;
  }, [schoolSubmissionData, selectedGroup, selectedPeriod, selectedMonth, selectedQuarter, currentPeriodText, stats, noticeDeadlineDate]);

  const handleCopyLineReminder = () => {
    navigator.clipboard.writeText(lineReminderText);
    setIsLineCopied(true);
    setTimeout(() => setIsLineCopied(false), 2000);
  };

  const defaultNoticeSubject = `ติดตามรายงานผลการดำเนินงานตามแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด. ฉบับที่ ๕) ${currentPeriodText}`;

  // Generate Notice content
  const memoSubjectText = customMemoSubject || defaultNoticeSubject;

  // Function to trigger AI polish
  const handleAiPolishNotice = async () => {
    setIsAiPolishing(true);
    try {
      const response = await fetch("/api/gemini/analyze-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: "หนังสือติดตามรายงาน กพด. ฉบับที่ 5",
          activityName: memoSubjectText,
          objectives: `ติดตามการรายงานผลของโรงเรียน ตชด. ที่ยังไม่ได้จัดส่งรายงาน ${currentPeriodText}`,
          details: `รายชื่อโรงเรียนที่ค้างส่ง: ${selectedSchoolObjects.map(s => s.name).join(", ")}`,
          quantitativeOutcome: `จำนวนโรงเรียนที่ค้างส่ง ${selectedSchoolObjects.length} แห่ง`,
          qualitativeOutcome: `เพื่อให้การขับเคลื่อนโครงการตามพระราชดำริฯ เป็นไปด้วยความเรียบร้อยและมีข้อมูลความก้าวหน้าที่สมบูรณ์`,
          problems: "โรงเรียนยังไม่ได้บันทึกข้อมูลรายงานกิจกรรมลงในระบบติดตามฯ",
          suggestions: `ขอให้จัดส่งรายงานภายในวันที่ ${noticeDeadlineDate}`
        })
      });

      if (response.ok) {
        const json = await response.json();
        if (json.polishedSummary) {
          setCustomMemoBody(json.polishedSummary);
        }
      }
    } catch (err) {
      console.warn("AI polish failed:", err);
    } finally {
      setIsAiPolishing(false);
    }
  };

  // Copy notice text to clipboard
  const handleCopyNoticeText = () => {
    if (!noticePrintRef.current) return;
    const text = noticePrintRef.current.innerText;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Print Notice A4
  const handlePrintNotice = () => {
    window.print();
  };

  // Export PDF
  const handleExportPdf = async () => {
    if (!noticePrintRef.current) return;
    const isMobile = isMobileOrTablet();
    setExportStatus({
      isExporting: true,
      progress: 25,
      message: isMobile 
        ? "กำลังจัดเตรียมหนังสือติดตามสำหรับ iPad / สมาร์ทโฟน..." 
        : "กำลังจัดเตรียมหนังสือติดตามรายงาน...",
    });

    try {
      const adaptiveScale = getAdaptiveCanvasScale(2);
      setExportStatus((prev) => ({
        ...prev,
        progress: 60,
        message: "กำลังเรนเดอร์เอกสาร A4 ความละเอียดสูง...",
      }));

      const canvas = await safeHtml2Canvas(noticePrintRef.current, { 
        scale: adaptiveScale, 
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      setExportStatus((prev) => ({
        ...prev,
        progress: 85,
        message: "กำลังประกอบไฟล์ PDF...",
      }));

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

      const fileName = sanitizeWindowsFilename(`หนังสือติดตามรายงาน_ตชด_${selectedPeriod}.pdf`);

      setExportStatus((prev) => ({
        ...prev,
        progress: 95,
        message: isMobile ? "กำลังเปิดกล่องบันทึก/แชร์ไฟล์ PDF..." : "กำลังบันทึกไฟล์...",
      }));

      const pdfBlob = pdf.output("blob");
      await triggerCrossPlatformDownload(pdfBlob, fileName, {
        mimeType: "application/pdf",
        title: fileName,
      });

      setExportStatus({
        isExporting: true,
        progress: 100,
        message: isMobile 
          ? "ส่งออก PDF สำเร็จ! (เลือกบันทึกไปยังไฟล์หรือแชร์)" 
          : "ดาวน์โหลดหนังสือติดตามรายงาน PDF สำเร็จ!",
      });

      setTimeout(() => {
        setExportStatus({ isExporting: false, progress: 0, message: "" });
      }, 2800);
    } catch (e) {
      console.error("Failed to generate PDF", e);
      setExportStatus({
        isExporting: true,
        progress: 100,
        message: "เกิดข้อผิดพลาดในการสร้างไฟล์ PDF",
      });
      setTimeout(() => {
        setExportStatus({ isExporting: false, progress: 0, message: "" });
      }, 3000);
    }
  };

  const mainTrackerContent = (
    <>
      <div className={`bg-white w-full ${isEmbedded ? "rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col" : "max-w-full lg:max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col mx-auto"}`}>
        
        {/* Action Header Bar with Controls */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-3 sm:p-4 text-white shrink-0 shadow-md border-b border-indigo-500/20">
          {/* Background Decorative Watermark (Official Royal / BPP Emblem) */}
          <div className="absolute -right-8 -bottom-10 w-48 sm:w-64 h-48 sm:h-64 pointer-events-none select-none opacity-[0.09] transition-opacity duration-300">
            <img
              src={ROYAL_EMBLEM_IMAGE}
              alt="ลายน้ำตราสัญลักษณ์"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            />
          </div>

          {/* Background Grid Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none"></div>

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-indigo-950/80 rounded-xl border border-indigo-500/30 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "table"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-indigo-200 hover:text-white"
                }`}
                title="แสดงผลแบบตารางราชการ"
              >
                <Table className="w-3.5 h-3.5" />
                <span>ตารางสรุป</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-indigo-200 hover:text-white"
                }`}
                title="แสดงผลแบบการ์ดสถานศึกษาและพิกัด GPS"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>การ์ดสถานศึกษา (๕๓ แห่ง)</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowLineReminderModal(true)}
                className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-950/40 flex items-center gap-1.5 transition cursor-pointer active:scale-95 border border-emerald-400/30"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>📱 แจ้งเตือนเข้า LINE กลุ่ม</span>
              </button>

              <button
                type="button"
                onClick={() => setShowNoticePreview(true)}
                className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-950/40 flex items-center gap-1.5 transition cursor-pointer active:scale-95 border border-indigo-400/30"
              >
                <FileText className="w-4 h-4 text-amber-300" />
                <span>ร่างหนังสือติดตาม</span>
              </button>

              {!isEmbedded && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer shrink-0 ml-1"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body Scroll Area */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5 flex-1 bg-slate-50/60 max-w-full">
          
          {/* Controls & Filter Section (Redesigned World-Class Surface) */}
          <div className="app-card-surface space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="typo-app-h3 text-slate-900 leading-tight">ตัวกรองและเงื่อนไขการประเมิน</h3>
                  <p className="typo-app-subtext">กำหนดสังกัด กก.ตชด. และรอบเวลาประเมินการส่งรายงาน</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              {/* 1. BPP Group */}
              <div className="space-y-1.5">
                <label className="typo-app-subtext font-bold text-slate-700 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>สังกัด กก.ตชด.</span>
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full typo-app-body text-xs p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
                >
                  <option value="all">ทุกสังกัด กก.ตชด. (21-24)</option>
                  <option value="21">กก.ตชด.21 (สุรินทร์/บุรีรัมย์/ชัยภูมิ/โคราช)</option>
                  <option value="22">กก.ตชด.22 (อุบลฯ/อำนาจฯ/ศรีสะเกษ/ยโสธร)</option>
                  <option value="23">กก.ตชด.23 (สกลนคร/มุกดาหาร/นครพนม)</option>
                  <option value="24">กก.ตชด.24 (อุดรธานี/เลย/หนองคาย/บึงกาฬ)</option>
                </select>
              </div>

              {/* 2. Period Granularity */}
              <div className="space-y-1.5">
                <label className="typo-app-subtext font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>รอบประเมิน</span>
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSelectedPeriod("monthly")}
                    className={`text-xs py-1.5 font-bold rounded-lg cursor-pointer transition ${
                      selectedPeriod === "monthly" ? "bg-white text-indigo-950 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    รายเดือน
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPeriod("quarterly")}
                    className={`text-xs py-1.5 font-bold rounded-lg cursor-pointer transition ${
                      selectedPeriod === "quarterly" ? "bg-white text-indigo-950 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    รายไตรมาส
                  </button>
                </div>
              </div>

              {/* 3. Specific Month / Quarter Selection */}
              <div className="space-y-1.5">
                <label className="typo-app-subtext font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>{selectedPeriod === "monthly" ? "ระบุเดือนที่ประเมิน" : "ระบุไตรมาสที่ประเมิน"}</span>
                </label>
                {selectedPeriod === "monthly" ? (
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full typo-app-body text-xs p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
                  >
                    {datasetPeriods.months.map((m) => (
                      <option key={m} value={m}>
                        เดือน{THAI_MONTHS_FULL[m]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(e.target.value)}
                    className="w-full typo-app-body text-xs p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
                  >
                    {datasetPeriods.quarters.map((q) => (
                      <option key={q} value={q}>
                        {q === "Q1" && "ไตรมาสที่ 1 (ม.ค. - มี.ค.)"}
                        {q === "Q2" && "ไตรมาสที่ 2 (เม.ย. - มิ.ย.)"}
                        {q === "Q3" && "ไตรมาสที่ 3 (ก.ค. - ก.ย.)"}
                        {q === "Q4" && "ไตรมาสที่ 4 (ต.ค. - ธ.ค.)"}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 4. Search Bar */}
              <div className="space-y-1.5">
                <label className="typo-app-subtext font-bold text-slate-700 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>ค้นหาโรงเรียน / จังหวัด</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="พิมพ์ชื่อโรงเรียน หรือ จังหวัด..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full typo-app-body text-xs pl-8.5 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

            </div>

            {/* Location Cascading Filters */}
            <div className="pt-3 border-t border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="typo-app-subtext font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ตัวกรองเชิงพื้นที่และพิกัด GPS (จังหวัด, อำเภอ, ตำบล, หมู่บ้าน)</span>
                </span>
                {(selectedProvince !== "all" || selectedDistrict !== "all" || selectedSubdistrict !== "all" || selectedVillage !== "all" || gpsFilter !== "all" || statusFilter !== "all") && (
                  <button
                    type="button"
                    onClick={resetLocationFilters}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                  >
                    ล้างตัวกรองทั้งหมด
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                <div>
                  <label className="text-[10.5px] font-bold text-slate-600 block mb-0.5">จังหวัด</label>
                  <select
                    value={selectedProvince}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="all">ทุกจังหวัด ({provinces.length - 1})</option>
                    {provinces.filter((p) => p !== "all").map((prov) => (
                      <option key={prov} value={prov}>จ.{prov}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10.5px] font-bold text-slate-600 block mb-0.5">อำเภอ</label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="all">ทุกอำเภอ</option>
                    {districts.filter((d) => d !== "all").map((dist) => (
                      <option key={dist} value={dist}>อ.{dist}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10.5px] font-bold text-slate-600 block mb-0.5">ตำบล</label>
                  <select
                    value={selectedSubdistrict}
                    onChange={(e) => handleSubdistrictChange(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="all">ทุกตำบล</option>
                    {subdistricts.filter((s) => s !== "all").map((sub) => (
                      <option key={sub} value={sub}>ต.{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10.5px] font-bold text-slate-600 block mb-0.5">หมู่บ้าน</label>
                  <select
                    value={selectedVillage}
                    onChange={(e) => setSelectedVillage(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="all">ทุกหมู่บ้าน</option>
                    {villages.filter((v) => v !== "all").map((vill) => (
                      <option key={vill} value={vill}>บ.{vill}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10.5px] font-bold text-slate-600 block mb-0.5">สถานะพิกัด GPS</label>
                  <select
                    value={gpsFilter}
                    onChange={(e) => setGpsFilter(e.target.value as any)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="has_gps">มีพิกัด GPS แล้ว</option>
                    <option value="no_gps">ยังไม่มีพิกัด</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Statistics Bar (Enhanced Visual Logic & Status Glow) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Target Schools */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="typo-app-subtext font-bold uppercase tracking-wider text-slate-500">เป้าหมายทั้งหมด</span>
                <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <School className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{toThaiNumerals(stats.total)} <span className="text-xs font-bold text-slate-400">แห่ง</span></p>
                <p className="typo-app-subtext mt-0.5 text-slate-500">รร.ตชด. ภาค 2</p>
              </div>
            </div>
            
            {/* Submitted in Period */}
            <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-white p-4 rounded-2xl border border-emerald-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="typo-app-subtext font-bold uppercase tracking-wider text-emerald-800">ส่งแล้วงวดนี้</span>
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-700 tracking-tight">{toThaiNumerals(stats.submitted)} <span className="text-xs font-bold text-emerald-600/70">แห่ง</span></p>
                <p className="typo-app-subtext mt-0.5 text-emerald-700 font-semibold">ส่งรายงานครบถ้วน</p>
              </div>
            </div>

            {/* Never Submitted */}
            <div className="bg-gradient-to-br from-rose-500/10 via-rose-50 to-white p-4 rounded-2xl border border-rose-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="typo-app-subtext font-bold uppercase tracking-wider text-rose-900">ไม่เคยส่งเลย</span>
                <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <p className="text-2xl font-black text-rose-700 tracking-tight">{toThaiNumerals(stats.neverSubmitted)} <span className="text-xs font-bold text-rose-600/70">แห่ง</span></p>
                <p className="typo-app-subtext mt-0.5 text-rose-700 font-semibold">ต้องเร่งรัดด่วนที่สุด</p>
              </div>
            </div>

            {/* Missing In Period */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-white p-4 rounded-2xl border border-amber-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="typo-app-subtext font-bold uppercase tracking-wider text-amber-900">ค้างส่งเฉพาะงวดนี้</span>
                <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <p className="text-2xl font-black text-amber-800 tracking-tight">{toThaiNumerals(stats.missingInPeriod)} <span className="text-xs font-bold text-amber-600/70">แห่ง</span></p>
                <p className="typo-app-subtext mt-0.5 text-amber-800 font-semibold">เคยส่งแต่ค้างงวดนี้</p>
              </div>
            </div>

            {/* Overall Rate */}
            <div className="bg-gradient-to-br from-indigo-500/10 via-indigo-50 to-white p-4 rounded-2xl border border-indigo-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 col-span-2 sm:col-span-1 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="typo-app-subtext font-bold uppercase tracking-wider text-indigo-900">อัตราการส่งรายงาน</span>
                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <BarChart3 className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <p className="text-2xl font-black text-indigo-950 tracking-tight">{toThaiNumerals(stats.rate)}<span className="text-sm font-bold text-indigo-600">%</span></p>
                <div className="w-full bg-indigo-200/70 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, stats.rate))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Conditional View: Table vs Cards Grid */}
          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedSubmissions.map(({ school, hasSubmitted, neverSubmitted, periodReportCount, totalReportCount, lastSubmittedDate, missingGoalIds, submittedGoalCount }) => {
                const isEditing = editingSchool?.id === school.id;
                const gps = getSchoolGpsBySchoolName(school.name);
                
                return (
                  <div 
                    key={school.id} 
                    className={`app-card-surface flex flex-col justify-between space-y-4 transition duration-200 ${
                      hasSubmitted 
                        ? "border-emerald-200/90 hover:border-emerald-300" 
                        : neverSubmitted 
                          ? "border-rose-200/90 hover:border-rose-300" 
                          : "border-slate-200/90 hover:border-indigo-300"
                    }`}
                  >
                    {isEditing ? (
                      <InCardSchoolEditor 
                        school={school} 
                        onClose={() => setEditingSchool(null)} 
                        onSaved={() => {
                          setAddressVersion(v => v + 1);
                          const event = new CustomEvent("schoolAddressesUpdated");
                          window.dispatchEvent(event);
                        }}
                      />
                    ) : (
                      <>
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-indigo-600 block mb-0.5">
                              {school.groupName}
                            </span>
                            <h4 
                              className="font-extrabold text-slate-900 text-sm tracking-tight hover:text-indigo-600 cursor-pointer transition truncate"
                              onClick={() => onSelectSchoolFilter?.(school.name)}
                              title="คลิกเพื่อกรองเฉพาะโรงเรียนนี้"
                            >
                              {school.name}
                            </h4>
                          </div>
                          <div className="shrink-0">
                            {hasSubmitted ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>ส่งแล้ว</span>
                              </span>
                            ) : neverSubmitted ? (
                              <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                                <ShieldAlert className="w-3 h-3 text-rose-600" />
                                <span>ไม่เคยส่งเลย</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>ค้างงวดนี้</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Address & GPS */}
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-slate-500">
                            <span className="font-bold">ที่ตั้ง / สังกัดเชิงพื้นที่:</span>
                            <button
                              type="button"
                              onClick={() => setEditingSchool(school)}
                              className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                            >
                              แก้ไขที่อยู่/พิกัด
                            </button>
                          </div>
                          <p className="text-slate-700 font-medium leading-relaxed bg-slate-50 p-2 rounded-xl border border-slate-100">
                            บ้าน{school.village || "-"} หมู่ที่ {school.villageNo || "-"} ต.{school.subdistrict} อ.{school.district} จ.{school.province}
                          </p>
                          
                          <div className="flex items-center justify-between pt-1">
                            <span className="font-bold text-slate-500">พิกัดแผนที่:</span>
                            {gps ? (
                              <a
                                href={`https://www.google.com/maps?q=${gps[0]},${gps[1]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 underline"
                              >
                                <MapPin className="w-3 h-3 text-indigo-500" />
                                <span>ดูแผนที่ ({gps[0].toFixed(4)}, {gps[1].toFixed(4)})</span>
                              </a>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                ยังไม่มีพิกัด GPS
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Submission Progress */}
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-500">ความก้าวหน้าการส่ง:</span>
                            <span className="font-extrabold text-slate-800">
                              รวม {toThaiNumerals(totalReportCount)} รายงาน
                            </span>
                          </div>
                          
                          {/* Missing goal IDs */}
                          {missingGoalIds.length > 0 ? (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-rose-600 block">
                                เป้าหมายที่ขาดส่งงวดนี้ ({missingGoalIds.length}/๘):
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {missingGoalIds.map(id => (
                                  <span key={id} className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-100 text-rose-700">
                                    เป้าฯ {toThaiNumerals(id)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 p-1 rounded-lg border border-emerald-100 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>ส่งครบถ้วนทั้ง ๘ เป้าหมายกิจกรรมแล้ว</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onBookSchoolReport?.(school.name)}
                            className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>บันทึกข้อมูล</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSchoolNames([school.name]);
                              setShowNoticePreview(true);
                            }}
                            className="py-1.5 px-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-500" />
                            <span>ทวงงาน</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {displayedSubmissions.length === 0 && (
                <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                  <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-extrabold text-sm text-slate-800">ไม่พบโรงเรียนตามตัวเลือกพิกัดหรือผลกรองภูมิภาค</p>
                </div>
              )}
            </div>
          ) : (
            /* Table Header & Selection Action Bar (Redesigned World-Class Surface) */
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden max-w-full">
              <div className="p-3.5 sm:p-4 bg-slate-50/90 border-b border-slate-200/90 flex flex-col lg:flex-row lg:items-center justify-between gap-3 flex-wrap">
              
              {/* Tab Filter buttons */}
              <div className="flex flex-wrap items-center p-1 bg-slate-200/70 rounded-xl text-xs font-bold gap-1 max-w-full overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                    statusFilter === "all" ? "bg-white text-slate-900 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ทั้งหมด ({toThaiNumerals(stats.total)})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter("missing")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    statusFilter === "missing" ? "bg-rose-700 text-white shadow-2xs font-extrabold" : "text-rose-900 hover:bg-rose-100"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>ค้างส่งทั้งหมด ({toThaiNumerals(stats.missing)})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter("never_submitted")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    statusFilter === "never_submitted" ? "bg-rose-600 text-white shadow-2xs font-extrabold" : "text-rose-800 hover:bg-rose-100"
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>ไม่เคยส่งเลย ({toThaiNumerals(stats.neverSubmitted)})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter("missing_in_period")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    statusFilter === "missing_in_period" ? "bg-amber-600 text-white shadow-2xs font-extrabold" : "text-amber-900 hover:bg-amber-100"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>ค้างส่งเฉพาะงวด ({toThaiNumerals(stats.missingInPeriod)})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter("submitted")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    statusFilter === "submitted" ? "bg-emerald-600 text-white shadow-2xs font-extrabold" : "text-emerald-800 hover:bg-emerald-100"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>ส่งแล้ว ({toThaiNumerals(stats.submitted)})</span>
                </button>
              </div>

              {/* Batch Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSelectNeverSubmitted}
                    title="เลือกเฉพาะโรงเรียนที่ไม่เคยส่งเลย"
                    className="typo-app-subtext font-bold px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100/90 text-rose-800 rounded-lg border border-rose-200/90 cursor-pointer transition whitespace-nowrap active:scale-95"
                  >
                    เลือกไม่เคยส่ง ({toThaiNumerals(stats.neverSubmitted)})
                  </button>

                  <button
                    type="button"
                    onClick={handleSelectMissingInPeriod}
                    title="เลือกเฉพาะโรงเรียนที่ค้างส่งงวดนี้"
                    className="typo-app-subtext font-bold px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100/90 text-amber-900 rounded-lg border border-amber-200/90 cursor-pointer transition whitespace-nowrap active:scale-95"
                  >
                    เลือกค้างงวดนี้ ({toThaiNumerals(stats.missingInPeriod)})
                  </button>

                  <button
                    type="button"
                    onClick={handleSelectAllMissing}
                    className="typo-app-subtext font-bold px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/90 text-slate-700 rounded-lg border border-slate-300 cursor-pointer transition whitespace-nowrap active:scale-95"
                  >
                    {selectedSchoolNames.length > 0 ? "ยกเลิกการเลือก" : "เลือกค้างทั้งหมด"}
                  </button>
                </div>

                <button
                  type="button"
                  disabled={selectedSchoolNames.length === 0}
                  onClick={() => setShowNoticePreview(true)}
                  className="typo-app-body text-xs px-3.5 sm:px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:from-slate-200 disabled:to-slate-300 text-white disabled:text-slate-500 font-bold rounded-xl shadow-md shadow-indigo-950/20 disabled:shadow-none cursor-pointer transition flex items-center gap-1.5 disabled:cursor-not-allowed whitespace-nowrap active:scale-95 border border-indigo-400/30 disabled:border-transparent"
                >
                  <FileText className="w-4 h-4 text-amber-300 disabled:text-slate-400 shrink-0" />
                  <span>ออกหนังสือติดตาม ({toThaiNumerals(selectedSchoolNames.length)} แห่ง)</span>
                </button>
              </div>
            </div>

            {/* School Submission List Table */}
            <div className="overflow-x-auto w-full max-w-full">
              <table className="w-full min-w-full md:min-w-0 text-left text-xs border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider text-[10px] sm:text-xs">
                    <th className="p-1.5 sm:p-2.5 w-[4%] text-center shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedSchoolNames.length > 0 && selectedSchoolNames.length === schoolSubmissionData.filter(s => !s.hasSubmitted).length}
                        onChange={handleSelectAllMissing}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-1.5 sm:p-2.5 w-[5%] text-center">ลำดับ</th>
                    <th className="p-1.5 sm:p-2.5 w-[31%]">โรงเรียน ตชด. เป้าหมาย</th>
                    <th className="p-1.5 sm:p-2.5 w-[16%]">สังกัด / จังหวัด</th>
                    <th className="p-1.5 sm:p-2.5 text-center w-[18%]">เงื่อนไข / สถานะการส่ง</th>
                    <th className="p-1.5 sm:p-2.5 text-center w-[10%]">จำนวนกิจกรรม</th>
                    <th className="p-1.5 sm:p-2.5 w-[10%]">ส่งล่าสุดเมื่อ</th>
                    <th className="p-1.5 sm:p-2.5 text-center w-[6%]">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 font-medium text-slate-800 typo-app-body">
                  {paginatedSubmissions.map(({ school, hasSubmitted, neverSubmitted, periodReportCount, totalReportCount, lastSubmittedDate }, idx) => {
                    const isSelected = selectedSchoolNames.includes(school.name);
                    const rowIndex = (currentPage - 1) * (pageSize || displayedSubmissions.length) + idx + 1;

                    return (
                      <tr 
                        key={school.id}
                        className={`hover:bg-slate-50/80 transition ${
                          isSelected ? "bg-indigo-50/50" : neverSubmitted ? "bg-rose-50/30" : !hasSubmitted ? "bg-amber-50/20" : ""
                        }`}
                      >
                        <td className="p-1.5 sm:p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectSchool(school.name)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-1.5 sm:p-2.5 text-center font-bold text-slate-500 text-xs">
                          {toThaiNumerals(rowIndex)}
                        </td>
                        <td className="p-1.5 sm:p-2.5 min-w-0">
                          <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 leading-snug">
                            <School className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="truncate">{school.name}</span>
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                            ครูใหญ่: {getPrincipalBySchoolName(school.name)}
                          </div>
                        </td>
                        <td className="p-1.5 sm:p-2.5 min-w-0">
                          <span className="font-bold text-indigo-900 block truncate text-xs">
                            {school.groupName.replace("กองกำกับการตำรวจตระเวนชายแดนที่", "กก.ตชด.")}
                          </span>
                          <span className="text-slate-500 text-[10px] sm:text-[11px]">จ.{school.province}</span>
                        </td>
                        <td className="p-1.5 sm:p-2.5 text-center">
                          {hasSubmitted ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300/80 whitespace-nowrap">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>ส่งรายงานแล้ว</span>
                              </span>
                              <span className="text-[10px] text-emerald-700 font-bold">
                                ส่งในงวดนี้ {toThaiNumerals(periodReportCount)} งาน
                              </span>
                            </div>
                          ) : neverSubmitted ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-900 border border-rose-300/90 whitespace-nowrap">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>ไม่เคยส่งเลย</span>
                              </span>
                              <span className="text-[10px] text-rose-600 font-extrabold">
                                ไม่มีประวัติรายงานในระบบ
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300/90 whitespace-nowrap">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>ค้างส่ง{selectedPeriod === "monthly" ? "รายเดือน" : "รายไตรมาส"}</span>
                              </span>
                              <span className="text-[10px] text-amber-800 font-bold">
                                ค้างงวด{selectedPeriod === "monthly" ? `เดือน${THAI_MONTHS_FULL[selectedMonth]}` : `ไตรมาส ${selectedQuarter}`}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 sm:p-3 text-center">
                          <span className={`font-black text-sm ${periodReportCount > 0 ? "text-indigo-900" : neverSubmitted ? "text-rose-600" : "text-amber-700"}`}>
                            {toThaiNumerals(periodReportCount)}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium whitespace-nowrap">
                            {neverSubmitted ? "(ยังไม่มีประวัติ)" : `(รวมประวัติ ${toThaiNumerals(totalReportCount)} งาน)`}
                          </span>
                        </td>
                        <td className="p-2.5 sm:p-3 font-semibold text-[11px] whitespace-nowrap">
                          {neverSubmitted ? (
                            <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">ไม่เคยส่งเลย</span>
                          ) : (
                            <span className="text-slate-600">{lastSubmittedDate || "-"}</span>
                          )}
                        </td>
                        <td className="p-2.5 sm:p-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSchoolNames([school.name]);
                              setShowNoticePreview(true);
                            }}
                            className="text-[11px] px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-extrabold rounded-lg border border-indigo-200 cursor-pointer transition inline-flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>ออกหนังสือ</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {displayedSubmissions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        <School className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-xs">ไม่พบข้อมูลโรงเรียนตามเงื่อนไขที่เลือก</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            {displayedSubmissions.length > 0 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-medium flex-wrap">
                <div className="flex flex-wrap items-center gap-2">
                  <span>แสดงผล</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-white border border-slate-300 font-bold rounded-lg px-2.5 py-1 text-slate-800"
                  >
                    <option value={10}>10 โรงเรียน/หน้า</option>
                    <option value={20}>20 โรงเรียน/หน้า</option>
                    <option value={50}>50 โรงเรียน/หน้า</option>
                    <option value={100}>100 โรงเรียน/หน้า</option>
                    <option value={0}>แสดงทั้งหมด ({displayedSubmissions.length})</option>
                  </select>
                  <span className="whitespace-nowrap">
                    {pageSize > 0 ? (
                      <>
                        โรงเรียนที่ <strong className="text-slate-900">{((currentPage - 1) * pageSize) + 1}</strong> ถึง{" "}
                        <strong className="text-slate-900">{Math.min(currentPage * pageSize, displayedSubmissions.length)}</strong> จากทั้งหมด{" "}
                        <strong className="text-slate-900">{displayedSubmissions.length}</strong> แห่ง
                      </>
                    ) : (
                      <>แสดงทั้งหมด {displayedSubmissions.length} แห่ง</>
                    )}
                  </span>
                </div>

                {pageSize > 0 && totalPages > 1 && (
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                      title="หน้าก่อนหน้า"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-700" />
                    </button>

                    <span className="font-extrabold text-slate-800 px-2 whitespace-nowrap">
                      หน้า {currentPage} / {totalPages}
                    </span>

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                      title="หน้าถัดไป"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-700" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 p-3.5 sm:p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 shrink-0">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium text-center sm:text-left">
            * หนังสือติดตามงานสร้างตามแบบฟอร์มบันทึกข้อความ ตชด. ระเบียบงานสารบรรณ พ.ศ. ๒๕๒๖
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer transition shrink-0"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>

      {/* Official Administrative Notice Preview Sub-Modal (บันทึกข้อความ ตชด.) */}
      {showNoticePreview && (
        <div className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 md:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[96vh] flex flex-col">
            
            {/* Header Toolbar */}
            <div className="bg-slate-900 p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm md:text-base">
                  ตัวอย่างหนังสือติดตามงานราชการ (บันทึกข้อความ ตชด.)
                </h3>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAiPolishNotice}
                  disabled={isAiPolishing}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-lg text-xs cursor-pointer transition flex items-center gap-1 shadow-xs disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isAiPolishing ? "กำลัง AI ขัดเกลา..." : "✨ ให้ Gemini AI ขัดเกลาสำนวน"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyNoticeText}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-lg text-xs cursor-pointer transition flex items-center gap-1"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? "คัดลอกแล้ว!" : "คัดลอกข้อความ"}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintNotice}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-lg text-xs cursor-pointer transition flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ A4</span>
                </button>

                <button
                  type="button"
                  disabled={exportStatus.isExporting}
                  onClick={handleExportPdf}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-emerald-700/60 text-white font-bold rounded-lg text-xs cursor-pointer transition flex items-center gap-1.5 disabled:cursor-not-allowed"
                  title="ส่งออกเอกสารราชการเป็น PDF (รองรับ iPad และสมาร์ทโฟน)"
                >
                  {exportStatus.isExporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>{exportStatus.isExporting ? "กำลังสร้าง PDF..." : "ส่งออก PDF"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowNoticePreview(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Customization Settings Bar */}
            <div className="bg-slate-100/90 p-3 border-b border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-0.5">กำหนดส่งรายงานภายในวันที่:</label>
                <input
                  type="text"
                  value={noticeDeadlineDate}
                  onChange={(e) => setNoticeDeadlineDate(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-0.5">ผู้ลงนาม (ผกก.ตชด.):</label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-0.5">ตำแหน่งผู้ลงนาม:</label>
                <input
                  type="text"
                  value={signatoryPosition}
                  onChange={(e) => setSignatoryPosition(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                />
              </div>
            </div>

            {/* Document Render Canvas A4 Container */}
            <div className="p-4 sm:p-6 overflow-y-auto overflow-x-auto flex-1 bg-slate-200/90 flex justify-center items-start">
              <div
                ref={noticePrintRef}
                className="bg-white text-slate-900 shadow-xl border border-slate-300 p-8 sm:p-10 md:p-14 w-full max-w-[210mm] min-h-[297mm] font-serif sarabun-font leading-relaxed text-sm tracking-tight space-y-5 relative shrink-0 mx-auto"
                style={{ fontFamily: "'Sarabun', 'TH Sarabun New', sans-serif" }}
              >
                {/* Official Memorandum Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.05] z-0">
                  <img
                    src={ROYAL_EMBLEM_IMAGE}
                    alt="ลายน้ำหนังสือราชการ"
                    referrerPolicy="no-referrer"
                    className="w-[120mm] h-[120mm] object-contain"
                  />
                </div>

                {/* Official Memorandum Header */}
                <div className="relative z-10 flex items-center justify-between border-b-2 border-slate-900 pb-3">
                  <div className="flex items-center gap-3.5">
                    {/* Emblem Symbol */}
                    <div className="w-13 h-13 rounded-xl p-1 bg-slate-50 border border-slate-300 flex items-center justify-center shrink-0">
                      <img
                        src={ROYAL_EMBLEM_IMAGE}
                        alt="ตราครุฑ/ตราสัญลักษณ์"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <h1 className="text-2xl font-black tracking-tight text-slate-950">บันทึกข้อความ</h1>
                      <p className="text-xs font-bold text-slate-700">หน่วยงานราชการ กองกำกับการตำรวจตระเวนชายแดน</p>
                    </div>
                  </div>
                  <div className="text-right text-xs font-bold space-y-0.5">
                    <p>ชั้นความเร็ว: <span className="text-rose-700 font-black">ด่วนที่สุด</span></p>
                    <p>เลขที่เอกสาร: ตช ๐๐๒๔.๒๑/ติดตาม กพด.</p>
                  </div>
                </div>

                {/* Memorandum Metadata Block */}
                <div className="grid grid-cols-2 gap-2 text-xs font-bold border-b border-slate-300 pb-3">
                  <div>
                    <span className="text-slate-600">ส่วนราชการ: </span>
                    <span>กองกำกับการตำรวจตระเวนชายแดน งานส่งเสริมการศึกษา</span>
                  </div>
                  <div>
                    <span className="text-slate-600">วันที่: </span>
                    <span>{formatThaiDateToday()}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-600">เรื่อง: </span>
                    <span className="font-black underline">{memoSubjectText}</span>
                  </div>
                  <div className="col-span-2 pt-1">
                    <span className="text-slate-600">เรียน: </span>
                    <span>
                      {selectedSchoolObjects.length === 1
                        ? `ครูใหญ่โรงเรียนตำรวจตระเวนชายแดน (${selectedSchoolObjects[0].name})`
                        : `ครูใหญ่โรงเรียนตำรวจตระเวนชายแดนในสังกัด จำนวน ${toThaiNumerals(selectedSchoolObjects.length)} แห่ง (ตามรายนามแนบท้าย)`}
                    </span>
                  </div>
                </div>

                {/* Official Body Text */}
                <div className="space-y-4 text-justify text-sm font-medium leading-relaxed pt-2">
                  <p className="indent-8">
                    ตามที่ กองกำกับการตำรวจตระเวนชายแดน ได้กำหนดให้โรงเรียนตำรวจตระเวนชายแดนในสังกัด ดำเนินการจัดทำและบันทึกรายงานผลความก้าวหน้าการจัดกิจกรรมตามแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด. ฉบับที่ 5 พ.ศ. 2560 - 2569) ตามพระราชดำริ สมเด็จพระกนิษฐาธิราชเจ้า กรมสมเด็จพระเทพรัตนราชสุดาฯ สยามบรมราชกุมารี {currentPeriodText} ลงในระบบติดตามรายงานฯ เพื่อรวบรวมเสนอผู้บริหารระดับสูงและคณะกรรมการขับเคลื่อนฯ นั้น
                  </p>

                  <p className="indent-8">
                    จากการตรวจสอบในระบบติดตามผลฯ ณ วันที่ {formatThaiDateToday()} พบว่า สถานศึกษาของท่านยังไม่ได้ดำเนินการบันทึกข้อมูลรายงานกิจกรรมให้ครบถ้วนสมบูรณ์ตามเป้าหมายตัวชี้วัด กพด. ทั้ง 8 ด้าน ซึ่งอาจส่งผลกระทบต่อการประเมินภาพรวมความก้าวหน้าการพัฒนาคุณภาพชีวิตเด็กและเยาวชนในถิ่นทุรกันดาร
                  </p>

                  {/* List of Targeted Schools */}
                  <div className="bg-slate-50 p-4 rounded border border-slate-300 space-y-2">
                    <p className="font-bold text-xs text-slate-900">
                      รายชื่อโรงเรียนตำรวจตระเวนชายแดนที่ต้องเร่งรัดจัดส่งรายงาน ({toThaiNumerals(selectedSchoolObjects.length)} แห่ง):
                    </p>
                    <ol className="list-decimal list-inside text-xs font-semibold space-y-1 text-slate-800 pl-2">
                      {selectedSchoolObjects.map((s, idx) => (
                        <li key={s.id}>
                          <span className="font-extrabold">{s.name}</span> (สังกัด {s.groupName.replace("กองกำกับการตำรวจตระเวนชายแดนที่", "กก.ตชด.")} จ.{s.province}) - ครูใหญ่: {getPrincipalBySchoolName(s.name)}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <p className="indent-8">
                    {customMemoBody || `จึงเรียนมาเพื่อโปรดพิจารณามอบหมายเจ้าหน้าที่ผู้รับผิดชอบ เร่งรัดการจัดทำและบันทึกข้อมูลรายงานกิจกรรมในระบบติดตามรายงานฯ ให้เรียบร้อย ภายในวันที่ ${toThaiNumerals(noticeDeadlineDate)} เพื่อกองกำกับการฯ จะได้รวบรวมสรุปนำเรียนผู้บังคับบัญชาตามลำดับชั้นต่อไป`}
                  </p>
                </div>

                {/* Sign-off Block */}
                <div className="pt-12 text-center space-y-1 w-64 ml-auto">
                  <p className="font-bold text-xs">จึงเรียนมาเพื่อโปรดพิจารณาและดำเนินการ</p>
                  <div className="h-12"></div>
                  <p className="font-bold text-sm">({signatoryName})</p>
                  <p className="text-xs font-semibold">{signatoryPosition}</p>
                </div>

                {/* Footer Note */}
                <div className="absolute bottom-6 left-10 right-10 border-t border-slate-300 pt-2 text-[10px] text-slate-500 flex justify-between">
                  <span>งานส่งเสริมการศึกษา กองกำกับการตำรวจตระเวนชายแดน</span>
                  <span>ระบบติดตามรายงาน กพด. ฉบับที่ 5</span>
                </div>

              </div>
            </div>

            {/* Sub-modal Footer */}
            <div className="bg-slate-100 p-3 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setShowNoticePreview(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer transition"
              >
                ปิดตัวอย่าง
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Automated LINE Group Reminder Sub-Modal */}
      {showLineReminderModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-emerald-500/30">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                    <span>ระบบส่งแจ้งเตือนรายงานค้างส่งเข้า LINE กลุ่ม ตชด.</span>
                    <span className="bg-emerald-500/30 text-emerald-200 text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/30 font-bold hidden sm:inline-block">
                      Automated LINE Reminders
                    </span>
                  </h3>
                  <p className="text-[11px] text-emerald-200/80 font-medium mt-0.5">
                    จัดรูปแบบข้อความสรุปรายชื่อโรงเรียนค้างส่งแยกตาม กก.ตชด. สำหรับคัดลอกส่งกลุ่มไลน์ปฏิบัติการ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLineReminderModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50">
              
              {/* Target Settings */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>รอบการประเมิน: <strong className="text-indigo-900">{currentPeriodText}</strong></span>
                  </span>
                  <span className="text-slate-500">
                    กำหนดส่งภายใน: <strong className="text-amber-700">{noticeDeadlineDate}</strong>
                  </span>
                </div>
              </div>

              {/* Message Box Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ตัวอย่างข้อความแจ้งเตือนเข้ากลุ่ม LINE (LINE Reminder Preview):</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-bold">
                    ความยาว {lineReminderText.length} ตัวอักษร
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    readOnly
                    value={lineReminderText}
                    rows={12}
                    className="w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs leading-relaxed rounded-2xl border border-slate-800 shadow-inner resize-none focus:outline-none"
                  />
                  <div className="absolute top-3 right-3">
                    <button
                      type="button"
                      onClick={handleCopyLineReminder}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1 cursor-pointer"
                    >
                      {isLineCopied ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isLineCopied ? "คัดลอกแล้ว!" : "คัดลอกข้อความ"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Share Actions */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-emerald-900">
                  <p className="font-bold flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>พร้อมส่งเข้า LINE กลุ่มผู้บริหาร / ครูใหญ่ ตชด. ทันที</span>
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    คลิกปุ่มคัดลอกแล้วนำไปวาง (Paste) ในแอปพลิเคชัน LINE หรือคลิกแชร์ผ่านอุปกรณ์มือถือ
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyLineReminder}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {isLineCopied ? <Check className="w-4 h-4 text-amber-300" /> : <Copy className="w-4 h-4" />}
                    <span>{isLineCopied ? "คัดลอกเรียบร้อย" : "คัดลอกข้อความ LINE"}</span>
                  </button>

                  {"share" in navigator && (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          navigator.share({
                            title: `แจ้งเตือนค้างส่งรายงาน กพด.๕ ${currentPeriodText}`,
                            text: lineReminderText,
                          });
                        } catch (e) {
                          console.warn("Share API error", e);
                        }
                      }}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-emerald-400" />
                      <span>แชร์ด่วน</span>
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Sub-modal Footer */}
            <div className="bg-slate-100 p-3.5 border-t border-slate-200 text-right shrink-0">
              <button
                type="button"
                onClick={() => setShowLineReminderModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}
      {/* Floating Export Status Toast */}
      {exportStatus.isExporting && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[60] bg-slate-950/95 text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md max-w-sm w-auto sm:w-full mx-auto sm:mx-0 animate-in fade-in slide-in-from-bottom-5 duration-200 no-print">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {exportStatus.progress === 100 ? (
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center animate-spin shrink-0">
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                </div>
              )}
              <span className="font-extrabold text-xs text-slate-100">
                {exportStatus.progress === 100 ? "ส่งออกเรียบร้อยแล้ว" : "กำลังส่งออกหนังสือราชการ PDF"}
              </span>
            </div>
            <span className="text-xs font-mono font-black text-amber-400 ml-2 shrink-0">
              {exportStatus.progress}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2 border border-slate-700">
            <div 
              className={`h-full transition-all duration-300 rounded-full ${
                exportStatus.progress === 100 
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400" 
                  : "bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-400"
              }`}
              style={{ width: `${exportStatus.progress}%` }}
            />
          </div>

          <p className="text-[11px] font-medium text-slate-300 truncate">
            {exportStatus.message}
          </p>

          {isMobileOrTablet() && (
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-amber-300/90 font-medium">
              <span>รองรับ iPad / แท็บเล็ต / สมาร์ทโฟน</span>
              <span>{exportStatus.progress === 100 ? "บันทึก / แชร์แล้ว" : "กำลังประมวลผล"}</span>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (isEmbedded) {
    return <div className="w-full select-text">{mainTrackerContent}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 md:p-4 overflow-y-auto no-print">
      {mainTrackerContent}
    </div>
  );
}
