import React, { useState, useMemo, useEffect } from "react";
import { safeLocalStorage } from "../lib/storage";
import { sanitizeWindowsFilename, createWindowsSafeCsvBlob, triggerWindowsFileDownload } from "../lib/windowsUtils";
import { ActivityReport, getGoalIdFromCode } from "../types";
import { OFFICIAL_TARGET_SCHOOLS, isSchoolMatch } from "../data/schoolsData";
import { SmartFaceImage } from "./SmartFaceImage";
import { getGoalFallbackImage } from "../data/fallbackImages";
import A4Document from "./A4Document";
import { 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  FileText,
  Printer, 
  Eye, 
  Building2, 
  Calendar, 
  Lightbulb, 
  AlertCircle,
  HelpCircle,
  List,
  Grid,
  TrendingDown,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
  MapPin,
  Globe,
  Flame,
  Sparkles,
  BarChart2,
  Compass,
  Wrench,
  Clock,
  CheckCircle2,
  Shield,
  Edit3,
  Save,
  X,
  UserCheck,
  SlidersHorizontal,
  Check,
  Image as ImageIcon,
  Maximize2,
  ExternalLink
} from "lucide-react";

interface ProblemsViewProps {
  reports: ActivityReport[];
  onSelectReport?: (reportId: string) => void;
  onNavigateToDocument?: (reportId: string) => void;
  onOpenMultiPhaseTracker?: () => void;
}

// Action Item & Resolution Status Tracking Types & Metadata
export type ActionStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED";

export interface ActionItemConfig {
  reportId: string;
  status: ActionStatus;
  responsibleUnit: string;
  actionDetail: string;
  assignedDate?: string;
  targetDate?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const ACTION_STATUS_META: Record<ActionStatus, {
  label: string;
  shortLabel: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  dotColor: string;
  icon: React.ElementType;
}> = {
  PENDING: {
    label: "รอการดำเนินการ",
    shortLabel: "รอการดำเนินการ",
    badgeBg: "bg-amber-100/90",
    badgeText: "text-amber-900 border-amber-300",
    borderColor: "border-amber-300",
    dotColor: "bg-amber-500",
    icon: Clock
  },
  IN_PROGRESS: {
    label: "กำลังดำเนินการแก้ไข",
    shortLabel: "กำลังแก้ไข",
    badgeBg: "bg-sky-100/90",
    badgeText: "text-sky-900 border-sky-300",
    borderColor: "border-sky-300",
    dotColor: "bg-sky-500",
    icon: Wrench
  },
  RESOLVED: {
    label: "ดำเนินการแก้ไขแล้ว",
    shortLabel: "แก้ไขแล้ว",
    badgeBg: "bg-emerald-100/90",
    badgeText: "text-emerald-900 border-emerald-300",
    borderColor: "border-emerald-300",
    dotColor: "bg-emerald-500",
    icon: CheckCircle2
  }
};

export const RESPONSIBLE_UNITS = [
  "กองการศึกษา ตชด. (ฝ่ายวิชาการ/กพด.)",
  "กองการศึกษา ตชด. (ฝ่ายส่งกำลังบำรุง/งบประมาณ)",
  "กองการศึกษา ตชด. (ฝ่ายกำลังพล)",
  "บก.ตชด. ภาค 1 (ฝ่ายส่งกำลังบำรุง/การศึกษา)",
  "บก.ตชด. ภาค 2 (ฝ่ายส่งกำลังบำรุง/การศึกษา)",
  "บก.ตชด. ภาค 3 (ฝ่ายส่งกำลังบำรุง/การศึกษา)",
  "บก.ตชด. ภาค 4 (ฝ่ายส่งกำลังบำรุง/การศึกษา)",
  "ศูนย์เทคโนโลยีสารสนเทศ ตชด. / NT",
  "กก.ตชด. พื้นที่ / โรงเรียน ตชด.",
  "สำนักงานเขตพื้นที่การศึกษา (สพฐ.)",
  "องค์กรปกครองส่วนท้องถิ่น (อบจ./อบต.)",
  "หน่วยงานพันธมิตร / ภาคเอกชน"
];

// Context-aware smart default assigner for action item status & unit
export function getSmartDefaultActionItem(report: ActivityReport): ActionItemConfig {
  const p = (report.problems || "").toLowerCase();
  const s = (report.suggestions || "").toLowerCase();
  const regionCode = getRegionCodeForSchool(report.schoolName);

  let defaultUnit = "กองการศึกษา ตชด. (ฝ่ายวิชาการ/กพด.)";
  let defaultStatus: ActionStatus = "PENDING";
  let defaultDetail = "รับเรื่องในระบบแล้ว อยู่ระหว่างประสานงานหน่วยงานที่เกี่ยวข้องร่วมพิจารณาแนวทางสนับสนุน";

  if (/สัญญาณ|อินเทอร์เน็ต|ไฟฟ้า|ระบบ|คอมพิวเตอร์|สื่อ/.test(p)) {
    defaultUnit = "ศูนย์เทคโนโลยีสารสนเทศ ตชด. / NT";
    defaultStatus = "IN_PROGRESS";
    defaultDetail = "ประสานงานทีมช่างเครือข่าย/กฟภ. เข้าตรวจเช็กอุปกรณ์กระจายสัญญาณและระบบไฟฟ้า";
  } else if (/ทาง|คมนาคม|ฝน|ดิน|น้ำ|ระยะทาง|สไลด์|เดินทาง|สะพาน/.test(p)) {
    if (regionCode === "DIV_21") defaultUnit = "บก.ตชด. ภาค 2 / กก.ตชด. 21 (ฝ่ายส่งกำลังบำรุง)";
    else if (regionCode === "DIV_22") defaultUnit = "บก.ตชด. ภาค 2 / กก.ตชด. 22 (ฝ่ายส่งกำลังบำรุง)";
    else if (regionCode === "DIV_23") defaultUnit = "บก.ตชด. ภาค 2 / กก.ตชด. 23 (ฝ่ายส่งกำลังบำรุง)";
    else if (regionCode === "DIV_24") defaultUnit = "บก.ตชด. ภาค 2 / กก.ตชด. 24 (ฝ่ายส่งกำลังบำรุง)";
    else defaultUnit = "บก.ตชด. ภาค 2 (ฝ่ายส่งกำลังบำรุง/การศึกษา)";
    defaultStatus = "IN_PROGRESS";
    defaultDetail = "จัดส่งทีมซ่อมบำรุงเส้นทางและประสานสนับสนุนยานพาหนะขับเคลื่อน 4 ล้อในฤดูฝน";
  } else if (/งบ|เงิน|วัสดุ|อุปกรณ์|เบิก|จัดซื้อ|ราคา/.test(p)) {
    defaultUnit = "กองการศึกษา ตชด. (ฝ่ายส่งกำลังบำรุง/งบประมาณ)";
    defaultStatus = "PENDING";
    defaultDetail = "จัดทำคำขอเสนออนุมัติงบประมาณเงินอุดหนุนและจัดซื้อวัสดุอุปกรณ์ทดแทน";
  } else if (/ครู|บุคลากร|วิทยากร|คน|กำลัง|ขาด/.test(p)) {
    defaultUnit = "กองการศึกษา ตชด. (ฝ่ายกำลังพล)";
    defaultStatus = "IN_PROGRESS";
    defaultDetail = "พิจารณาจัดสรรครูผู้ช่วย/ครูอัตราจ้าง และหมุนเวียนวิทยากรเฉพาะทางเข้าช่วยสอน";
  }

  if (/เรียบร้อยแล้ว|แก้ไขแล้ว|ได้รับการสนับสนุนแล้ว|สำเร็จ/.test(s + " " + p)) {
    defaultStatus = "RESOLVED";
    defaultDetail = "หน่วยงานรับผิดชอบเข้าดำเนินการแก้ไขตามข้อเสนอแนะเสร็จสิ้นแล้ว";
  }

  return {
    reportId: report.id,
    status: defaultStatus,
    responsibleUnit: defaultUnit,
    actionDetail: defaultDetail,
    assignedDate: report.dateString || "2569",
    targetDate: "30 ก.ย. 2569",
    updatedAt: new Date().toLocaleDateString("th-TH")
  };
}

// Region Metadata
export interface RegionConfig {
  code: string;
  shortName: string;
  fullName: string;
  coverageText: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  activeBorder: string;
  accentBg: string;
}

export const BPP_REGIONS: Record<string, RegionConfig> = {
  DIV_21: {
    code: "DIV_21",
    shortName: "กก.ตชด. 21",
    fullName: "กองกำกับการตำรวจตระเวนชายแดนที่ 21 (สุรินทร์/บุรีรัมย์)",
    coverageText: "ดูแลโรงเรียน ตชด. ในพื้นที่ จ.สุรินทร์ และ จ.บุรีรัมย์",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-800",
    borderColor: "border-blue-200",
    activeBorder: "border-blue-600 ring-2 ring-blue-500/20",
    accentBg: "bg-blue-600"
  },
  DIV_22: {
    code: "DIV_22",
    shortName: "กก.ตชด. 22",
    fullName: "กองกำกับการตำรวจตระเวนชายแดนที่ 22 (อุบลฯ/ศรีสะเกษ)",
    coverageText: "ดูแลโรงเรียน ตชด. ในพื้นที่ จ.อุบลราชธานี, จ.ศรีสะเกษ และ จ.ยโสธร",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
    borderColor: "border-emerald-200",
    activeBorder: "border-emerald-600 ring-2 ring-emerald-500/20",
    accentBg: "bg-emerald-600"
  },
  DIV_23: {
    code: "DIV_23",
    shortName: "กก.ตชด. 23",
    fullName: "กองกำกับการตำรวจตระเวนชายแดนที่ 23 (สกลนคร/นครพนม)",
    coverageText: "ดูแลโรงเรียน ตชด. ในพื้นที่ จ.สกลนคร, จ.นครพนม และ จ.มุกดาหาร",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
    borderColor: "border-amber-200",
    activeBorder: "border-amber-600 ring-2 ring-amber-500/20",
    accentBg: "bg-amber-600"
  },
  DIV_24: {
    code: "DIV_24",
    shortName: "กก.ตชด. 24",
    fullName: "กองกำกับการตำรวจตระเวนชายแดนที่ 24 (อุดรฯ/เลย)",
    coverageText: "ดูแลโรงเรียน ตชด. ในพื้นที่ จ.อุดรธานี, จ.เลย, จ.หนองคาย และ จ.บึงกาฬ",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-800",
    borderColor: "border-purple-200",
    activeBorder: "border-purple-600 ring-2 ring-purple-500/20",
    accentBg: "bg-purple-600"
  }
};

// Helper to match school name to BPP Division (กก.ตชด. 21, 22, 23, 24)
export function getRegionCodeForSchool(schoolName: string): string {
  if (!schoolName) return "DIV_21";
  
  const target = OFFICIAL_TARGET_SCHOOLS.find(s => isSchoolMatch(schoolName, s.name));
  if (!target) {
    if (schoolName.includes("21") || schoolName.includes("21")) return "DIV_21";
    if (schoolName.includes("22") || schoolName.includes("22")) return "DIV_22";
    if (schoolName.includes("23") || schoolName.includes("23")) return "DIV_23";
    if (schoolName.includes("24") || schoolName.includes("24")) return "DIV_24";
    return "DIV_21";
  }
  
  const group = target.groupName || "";
  if (group.includes("21") || group.includes("21")) return "DIV_21";
  if (group.includes("22") || group.includes("22")) return "DIV_22";
  if (group.includes("23") || group.includes("23")) return "DIV_23";
  if (group.includes("24") || group.includes("24")) return "DIV_24";
  
  return "DIV_21";
}

// Format numbers as Hindu-Arabic numerals
const formatNumber = (num: number | string): string => {
  if (typeof num === "number") {
    return num.toLocaleString("en-US");
  }
  return String(num);
};

// Helper to extract image URLs with optimized CDN width parameter
function parseImageUrls(urlStr: string | undefined, maxPx: number = 800): string[] {
  if (!urlStr) return [];
  const items = urlStr.split(/[\n,;]+|\s+(?=https?:\/\/)/).map((s) => s.trim()).filter(Boolean);
  return items.map((url) => {
    const driveMatch = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${driveMatch[1]}=w${maxPx}`;
    }
    if (url.includes("lh3.googleusercontent.com/d/") && !url.includes("=w") && !url.includes("=s")) {
      return `${url}=w${maxPx}`;
    }
    return url;
  });
}

export default function ProblemsView({
  reports,
  onSelectReport,
  onNavigateToDocument,
  onOpenMultiPhaseTracker
}: ProblemsViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedSchool, setSelectedSchool] = useState<string>("ALL");
  const [selectedRegion, setSelectedRegion] = useState<string>("ALL");
  const [selectedTarget, setSelectedTarget] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<"ALL" | "HAS_PROBLEM" | "NO_PROBLEM">("HAS_PROBLEM");
  const [viewMode, setViewMode] = useState<"CARD" | "TABLE">("CARD");

  // Lightbox Photo Preview Modal State
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; allUrls: string[]; report: ActivityReport } | null>(null);
  const [activeLightboxUrl, setActiveLightboxUrl] = useState<string | null>(null);

  // Floating Window Modal State for A4 Document preview
  const [floatingDocReport, setFloatingDocReport] = useState<ActivityReport | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFloatingDocReport(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Action Item Tracking State (Local Storage persistent mapping)
  const [actionItemsMap, setActionItemsMap] = useState<Record<string, ActionItemConfig>>(() => {
    try {
      const saved = safeLocalStorage.getItem("bpp_action_items_tracking");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse action items tracking", e);
    }
    return {};
  });

  // Action Tracking Filter States
  const [selectedActionStatus, setSelectedActionStatus] = useState<string>("ALL");
  const [selectedResponsibleUnit, setSelectedResponsibleUnit] = useState<string>("ALL");

  // Action Update Modal State
  const [editingActionReport, setEditingActionReport] = useState<ActivityReport | null>(null);
  const [modalStatus, setModalStatus] = useState<ActionStatus>("PENDING");
  const [modalUnit, setModalUnit] = useState<string>("");
  const [modalDetail, setModalDetail] = useState<string>("");
  const [modalTargetDate, setModalTargetDate] = useState<string>("");

  // Helper to get action item for a report (saved or smart default)
  const getActionItem = (report: ActivityReport): ActionItemConfig => {
    if (actionItemsMap[report.id]) return actionItemsMap[report.id];
    return getSmartDefaultActionItem(report);
  };

  // Helper to save updated action item
  const handleUpdateActionItem = (reportId: string, updated: ActionItemConfig) => {
    setActionItemsMap(prev => {
      const next = { ...prev, [reportId]: updated };
      safeLocalStorage.setItem("bpp_action_items_tracking", JSON.stringify(next));
      return next;
    });
  };

  const openActionModal = (report: ActivityReport) => {
    const currentAction = getActionItem(report);
    setEditingActionReport(report);
    setModalStatus(currentAction.status);
    setModalUnit(currentAction.responsibleUnit);
    setModalDetail(currentAction.actionDetail);
    setModalTargetDate(currentAction.targetDate || "30 ก.ย. 2569");
  };

  const handleSaveActionModal = () => {
    if (!editingActionReport) return;
    const updated: ActionItemConfig = {
      reportId: editingActionReport.id,
      status: modalStatus,
      responsibleUnit: modalUnit,
      actionDetail: modalDetail,
      targetDate: modalTargetDate,
      updatedAt: new Date().toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: 'numeric' }),
      updatedBy: "เจ้าหน้าที่ฝ่ายติดตามผล"
    };
    handleUpdateActionItem(editingActionReport.id, updated);
    setEditingActionReport(null);
  };

  // Helper to check if a report actually details a problem
  const hasSubstantiveProblem = (report: ActivityReport): boolean => {
    if (!report.problems || report.problems.trim() === "") return false;
    const text = report.problems.trim().toLowerCase();
    const noProblemPatterns = [
      "ไม่มีปัญหา",
      "ไม่มี",
      "เป็นไปด้วยความเรียบร้อย",
      "ดำเนินงานเป็นไปด้วยความเรียบร้อย",
      "ไม่มีปัญหาและอุปสรรค",
      "ไม่มีปัญหาอุปสรรค",
      "-",
      "ไม่มีอุปสรรค"
    ];
    return !noProblemPatterns.some(pattern => text === pattern || text.includes(pattern));
  };

  // Get unique list of schools
  const schoolsList = useMemo(() => {
    const list = Array.from(new Set(reports.map(r => r.schoolName))).filter(Boolean);
    return list.sort((a, b) => a.localeCompare(b, "th"));
  }, [reports]);

  // Get unique target IDs / goal codes
  const targetList = useMemo(() => {
    const list = Array.from(new Set(reports.map(r => r.goalCode))).filter(Boolean);
    return list.sort((a, b) => a.localeCompare(b, "th"));
  }, [reports]);

  // Action Tracking Stats Summary
  const actionTrackingStats = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let resolved = 0;
    const unitCounts: Record<string, number> = {};
    const regionCounts: Record<string, number> = {
      DIV_21: 0,
      DIV_22: 0,
      DIV_23: 0,
      DIV_24: 0,
    };

    const problemReports = reports.filter(r => hasSubstantiveProblem(r));

    problemReports.forEach(r => {
      const item = getActionItem(r);
      if (item.status === "RESOLVED") resolved++;
      else if (item.status === "IN_PROGRESS") inProgress++;
      else pending++;

      const unit = item.responsibleUnit;
      unitCounts[unit] = (unitCounts[unit] || 0) + 1;
    });

    reports.forEach(r => {
      const rCode = getRegionCodeForSchool(r.schoolName);
      if (regionCounts[rCode] !== undefined) {
        regionCounts[rCode]++;
      }
    });

    const total = problemReports.length;
    const resolutionRate = total > 0 ? Math.round(((resolved + (inProgress * 0.5)) / total) * 100) : 0;

    return { total, pending, inProgress, resolved, resolutionRate, unitCounts, regionCounts };
  }, [reports, actionItemsMap]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      // Filter by problem status
      if (filterType === "HAS_PROBLEM" && !hasSubstantiveProblem(report)) return false;
      if (filterType === "NO_PROBLEM" && hasSubstantiveProblem(report)) return false;

      // Filter by Action Tracking Status
      if (selectedActionStatus !== "ALL") {
        if (!hasSubstantiveProblem(report)) return false;
        const action = getActionItem(report);
        if (action.status !== selectedActionStatus) return false;
      }

      // Filter by Responsible Unit
      if (selectedResponsibleUnit !== "ALL") {
        if (!hasSubstantiveProblem(report)) return false;
        const action = getActionItem(report);
        if (!action.responsibleUnit.includes(selectedResponsibleUnit)) return false;
      }

      // Filter by region
      if (selectedRegion !== "ALL") {
        const rCode = getRegionCodeForSchool(report.schoolName);
        if (rCode !== selectedRegion) return false;
      }

      // Filter by category
      if (selectedCategory !== "ALL") {
        if (!hasSubstantiveProblem(report)) return false;
        const p = (report.problems || "").toLowerCase();
        if (selectedCategory === "budget" && !/งบ|เงิน|วัสดุ|อุปกรณ์|เบิก|จัดซื้อ|ราคา/.test(p)) return false;
        if (selectedCategory === "travel" && !/ทาง|คมนาคม|ฝน|อากาศ|ดิน|น้ำ|ระยะทาง|สไลด์|เดินทาง/.test(p)) return false;
        if (selectedCategory === "time" && !/เวลา|ซ้ำซ้อน|ภารกิจ|เลื่อน|เร่ง|กระทันหัน|ตรงกัน/.test(p)) return false;
        if (selectedCategory === "personnel" && !/ครู|บุคลากร|วิทยากร|คน|กำลัง|ขาด|ภาระ/.test(p)) return false;
        if (selectedCategory === "tech" && !/สัญญาณ|อินเทอร์เน็ต|ไฟฟ้า|ระบบ|คอมพิวเตอร์|สื่อ/.test(p)) return false;
        if (selectedCategory === "other") {
          const matchedAny = /งบ|เงิน|วัสดุ|อุปกรณ์|เบิก|จัดซื้อ|ราคา|ทาง|คมนาคม|ฝน|อากาศ|ดิน|น้ำ|ระยะทาง|สไลด์|เดินทาง|เวลา|ซ้ำซ้อน|ภารกิจ|เลื่อน|เร่ง|กระทันหัน|ตรงกัน|ครู|บุคลากร|วิทยากร|คน|กำลัง|ขาด|ภาระ|สัญญาณ|อินเทอร์เน็ต|ไฟฟ้า|ระบบ|คอมพิวเตอร์|สื่อ/.test(p);
          if (matchedAny) return false;
        }
      }

      // Filter by school
      if (selectedSchool !== "ALL" && report.schoolName !== selectedSchool) return false;

      // Filter by target / goalCode
      if (selectedTarget !== "ALL" && report.goalCode !== selectedTarget) return false;

      // Search term filter
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        const action = getActionItem(report);
        const rCode = getRegionCodeForSchool(report.schoolName);
        const subdivision = BPP_REGIONS[rCode];
        const matchSubdivision = subdivision 
          ? (subdivision.shortName.toLowerCase().includes(term) || subdivision.fullName.toLowerCase().includes(term))
          : false;
          
        const matchProblem = (report.problems || "").toLowerCase().includes(term);
        const matchSuggestion = (report.suggestions || "").toLowerCase().includes(term);
        const matchActivity = (report.activityName || "").toLowerCase().includes(term);
        const matchSchool = (report.schoolName || "").toLowerCase().includes(term);
        const matchKPI = (report.kpiCode || "").toLowerCase().includes(term);
        const matchUnit = (action.responsibleUnit || "").toLowerCase().includes(term);
        const matchDetail = (action.actionDetail || "").toLowerCase().includes(term);
        return matchProblem || matchSuggestion || matchActivity || matchSchool || matchKPI || matchUnit || matchDetail || matchSubdivision;
      }

      return true;
    });
  }, [reports, filterType, selectedRegion, selectedSchool, selectedTarget, selectedCategory, selectedActionStatus, selectedResponsibleUnit, searchTerm, actionItemsMap]);

  // Pagination states for large reports datasets
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);

  // Reset page to 1 whenever filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSchool, selectedRegion, selectedTarget, selectedCategory, filterType, pageSize]);

  const totalPages = Math.ceil(filteredReports.length / (pageSize || 1)) || 1;

  const paginatedReports = useMemo(() => {
    if (pageSize === 0) return filteredReports; // Show all
    const startIdx = (currentPage - 1) * pageSize;
    return filteredReports.slice(startIdx, startIdx + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  // Problem Categories Breakdown
  const categoryStats = useMemo(() => {
    let budget = 0;
    let travelWeather = 0;
    let personnel = 0;
    let timeSchedule = 0;
    let techSystem = 0;
    let otherProblems = 0;
    let smoothCount = 0;

    reports.forEach(r => {
      if (!hasSubstantiveProblem(r)) {
        smoothCount++;
        return;
      }

      const p = (r.problems || "").toLowerCase();
      let matched = false;

      if (/งบ|เงิน|วัสดุ|อุปกรณ์|เบิก|จัดซื้อ|ราคา/.test(p)) {
        budget++;
        matched = true;
      }
      if (/ทาง|คมนาคม|ฝน|อากาศ|ดิน|น้ำ|ระยะทาง|สไลด์|เดินทาง/.test(p)) {
        travelWeather++;
        matched = true;
      }
      if (/ครู|บุคลากร|วิทยากร|คน|กำลัง|ขาด|ภาระ/.test(p)) {
        personnel++;
        matched = true;
      }
      if (/เวลา|ซ้ำซ้อน|ภารกิจ|เลื่อน|เร่ง|กระทันหัน|ตรงกัน/.test(p)) {
        timeSchedule++;
        matched = true;
      }
      if (/สัญญาณ|อินเทอร์เน็ต|ไฟฟ้า|ระบบ|คอมพิวเตอร์|สื่อ/.test(p)) {
        techSystem++;
        matched = true;
      }

      if (!matched) {
        otherProblems++;
      }
    });

    return [
      { id: "budget", label: "งบประมาณ/วัสดุอุปกรณ์", count: budget, color: "bg-rose-500", textColor: "text-rose-700", bgLight: "bg-rose-50" },
      { id: "travel", label: "การเดินทาง/สภาพอากาศ", count: travelWeather, color: "bg-amber-500", textColor: "text-amber-700", bgLight: "bg-amber-50" },
      { id: "time", label: "เวลา/ภารกิจซ้ำซ้อน", count: timeSchedule, color: "bg-blue-500", textColor: "text-blue-700", bgLight: "bg-blue-50" },
      { id: "personnel", label: "บุคลากร/วิทยากร", count: personnel, color: "bg-purple-500", textColor: "text-purple-700", bgLight: "bg-purple-50" },
      { id: "tech", label: "เทคโนโลยี/สัญญาณอินเทอร์เน็ต", count: techSystem, color: "bg-teal-500", textColor: "text-teal-700", bgLight: "bg-teal-50" },
      { id: "other", label: "อุปสรรคอื่นๆ / ทั่วไป", count: otherProblems, color: "bg-slate-500", textColor: "text-slate-700", bgLight: "bg-slate-100" },
    ];
  }, [reports]);

  // Geographic / Region Heatmap Calculations
  const regionalHeatmapData = useMemo(() => {
    const regionKeys = ["DIV_21", "DIV_22", "DIV_23", "DIV_24"];
    
    const result: Record<string, {
      total: number;
      problems: number;
      categories: {
        budget: number;
        travel: number;
        time: number;
        personnel: number;
        tech: number;
        other: number;
      };
      dominantCategoryLabel: string;
      dominantCount: number;
    }> = {};

    regionKeys.forEach(key => {
      result[key] = {
        total: 0,
        problems: 0,
        categories: { budget: 0, travel: 0, time: 0, personnel: 0, tech: 0, other: 0 },
        dominantCategoryLabel: "-",
        dominantCount: 0
      };
    });

    reports.forEach(r => {
      const regCode = getRegionCodeForSchool(r.schoolName);
      if (!result[regCode]) return;

      result[regCode].total += 1;

      if (hasSubstantiveProblem(r)) {
        result[regCode].problems += 1;
        const p = (r.problems || "").toLowerCase();

        let matched = false;
        if (/งบ|เงิน|วัสดุ|อุปกรณ์|เบิก|จัดซื้อ|ราคา/.test(p)) {
          result[regCode].categories.budget += 1;
          matched = true;
        }
        if (/ทาง|คมนาคม|ฝน|อากาศ|ดิน|น้ำ|ระยะทาง|สไลด์|เดินทาง/.test(p)) {
          result[regCode].categories.travel += 1;
          matched = true;
        }
        if (/เวลา|ซ้ำซ้อน|ภารกิจ|เลื่อน|เร่ง|กระทันหัน|ตรงกัน/.test(p)) {
          result[regCode].categories.time += 1;
          matched = true;
        }
        if (/ครู|บุคลากร|วิทยากร|คน|กำลัง|ขาด|ภาระ/.test(p)) {
          result[regCode].categories.personnel += 1;
          matched = true;
        }
        if (/สัญญาณ|อินเทอร์เน็ต|ไฟฟ้า|ระบบ|คอมพิวเตอร์|สื่อ/.test(p)) {
          result[regCode].categories.tech += 1;
          matched = true;
        }
        if (!matched) {
          result[regCode].categories.other += 1;
        }
      }
    });

    // Determine dominant category per region
    regionKeys.forEach(key => {
      const cats = result[key].categories;
      const catArray = [
        { label: "การเดินทาง/ฝนตก", count: cats.travel },
        { label: "สัญญาณ/อินเทอร์เน็ต", count: cats.tech },
        { label: "งบ/วัสดุอุปกรณ์", count: cats.budget },
        { label: "เวลา/ภารกิจ", count: cats.time },
        { label: "บุคลากร/ครู", count: cats.personnel },
        { label: "อื่นๆ", count: cats.other },
      ];
      catArray.sort((a, b) => b.count - a.count);
      if (catArray[0].count > 0) {
        result[key].dominantCategoryLabel = catArray[0].label;
        result[key].dominantCount = catArray[0].count;
      }
    });

    return result;
  }, [reports]);

  // Overall statistics
  const totalReports = reports.length;
  const totalWithProblems = reports.filter(r => hasSubstantiveProblem(r)).length;
  const totalSmooth = totalReports - totalWithProblems;
  const problemPercentage = totalReports > 0 ? Math.round((totalWithProblems / totalReports) * 100) : 0;

  // Export CSV function
  const handleExportCSV = () => {
    if (filteredReports.length === 0) {
      alert("ไม่มีข้อมูลสำหรับส่งออก");
      return;
    }

    const headers = [
      "ลำดับ",
      "โรงเรียน/หน่วยงาน",
      "ชื่อกิจกรรม",
      "รหัสตัวชี้วัด",
      "งวดรายงาน",
      "วันที่ดำเนินกิจกรรม",
      "ปัญหาและอุปสรรคที่พบ",
      "แนวทางแก้ไขและข้อเสนอแนะ"
    ];

    const rows = filteredReports.map((r, idx) => [
      idx + 1,
      `"${(r.schoolName || "").replace(/"/g, '""')}"`,
      `"${(r.activityName || "").replace(/"/g, '""')}"`,
      `"${(r.kpiCode || "").replace(/"/g, '""')}"`,
      `"${(r.reportingPeriod || "").replace(/"/g, '""')}"`,
      `"${(r.dateString || "").replace(/"/g, '""')}"`,
      `"${(r.problems || "").replace(/"/g, '""')}"`,
      `"${(r.suggestions || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\r\n");
    const blob = createWindowsSafeCsvBlob(csvContent);
    const fileName = sanitizeWindowsFilename(`รายงานปัญหาและอุปสรรค_กพด5_${new Date().toISOString().slice(0, 10)}.csv`);
    triggerWindowsFileDownload(blob, fileName);
  };

  const handleDocumentClick = (reportId: string) => {
    const found = reports.find((r) => r.id === reportId);
    if (found) {
      setFloatingDocReport(found);
    } else {
      if (onSelectReport) onSelectReport(reportId);
      if (onNavigateToDocument) onNavigateToDocument(reportId);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6 max-w-full">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200/80 text-amber-900 rounded-xl text-xs font-bold shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>รายงานวิเคราะห์ปัญหาและอุปสรรค</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenMultiPhaseTracker && (
            <button
              onClick={onOpenMultiPhaseTracker}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 rounded-xl text-xs font-bold shadow-2xs transition-all duration-200 cursor-pointer active:scale-95 border border-indigo-200 text-center"
              title="ติดตามพัฒนาการของกิจกรรมเดิมในงวดที่ 1, 2, 3 ได้อย่างต่อเนื่อง (Multi-Phase Tracking)"
            >
              <Layers className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
              <span className="whitespace-nowrap">ติดตามหลายระยะ</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 rounded-xl text-xs font-bold shadow-2xs transition-all duration-200 cursor-pointer active:scale-95 border border-emerald-200 text-center"
            title="ส่งออกรายงานปัญหากรณีนี้เป็นไฟล์ CSV / Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span className="whitespace-nowrap">Excel/CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 shadow-2xs transition-all duration-200 cursor-pointer active:scale-95"
            title="สั่งพิมพ์รายงานสรุปปัญหาและอุปสรรค"
          >
            <Printer className="w-3.5 h-3.5 shrink-0 text-slate-600" />
            <span className="whitespace-nowrap">พิมพ์รายงาน</span>
          </button>
        </div>
      </div>

      {/* 2. Top Overview KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Reports */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">รายงานทั้งหมด</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">
              {formatNumber(totalReports)} <span className="text-xs font-semibold text-slate-400">รายการ</span>
            </p>
          </div>
        </div>

        {/* Card 2: Reports with problems */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">พบปัญหา/อุปสรรค</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-600">
              {formatNumber(totalWithProblems)} <span className="text-xs font-semibold text-slate-400">รายการ</span>
            </p>
          </div>
        </div>

        {/* Card 3: Reports smoothly completed */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">ไม่มีปัญหาอุปสรรค</p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600">
              {formatNumber(totalSmooth)} <span className="text-xs font-semibold text-slate-400">รายการ</span>
            </p>
          </div>
        </div>

        {/* Card 4: Ratio Percentage */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">สัดส่วนกิจกรรมที่มีปัญหา</p>
            <p className="text-2xl sm:text-3xl font-black text-purple-700">
              {formatNumber(problemPercentage)}<span className="text-sm font-semibold text-slate-400">%</span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Category Distribution Bar / Tags */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>จำแนกประเภทปัญหาและอุปสรรคที่พบ (กดเลือกเพื่อกรอง)</span>
          </h3>
          <div className="flex items-center gap-2">
            {selectedCategory !== "ALL" && (
              <button
                onClick={() => setSelectedCategory("ALL")}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
              >
                แสดงทุกประเภทปัญหา (ล้างตัวกรอง)
              </button>
            )}
            <span className="text-xs text-slate-500 font-medium hidden md:inline">คลิกที่การ์ดประเภทปัญหาเพื่อกรองข้อมูล</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {categoryStats.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button 
                key={cat.id} 
                onClick={() => {
                  if (isSelected) {
                    setSelectedCategory("ALL");
                  } else {
                    setSelectedCategory(cat.id);
                    if (filterType === "NO_PROBLEM") {
                      setFilterType("HAS_PROBLEM");
                    }
                  }
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between space-y-1.5 transition-all cursor-pointer relative ${
                  isSelected 
                    ? "border-indigo-600 ring-2 ring-indigo-500/30 bg-indigo-50/70 shadow-xs" 
                    : `border-slate-200/80 ${cat.bgLight} hover:border-indigo-300 hover:shadow-2xs`
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`w-2.5 h-2.5 rounded-full ${cat.color} ${isSelected ? "scale-125 ring-2 ring-white" : ""}`} />
                  <span className={`text-xs font-black ${isSelected ? "text-indigo-900" : cat.textColor}`}>
                    {formatNumber(cat.count)} รายการ
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <p className={`text-xs font-bold line-clamp-1 ${isSelected ? "text-indigo-950 font-black" : "text-slate-700"}`}>
                    {cat.label}
                  </p>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3.5 Geographic Insights / Problem Heatmap Panel */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-1">
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              <span>Geographic Insights & Spatial Heatmap (บก.ตชด. ภาค 2)</span>
            </div>
            <h3 
              className="text-base sm:text-lg md:text-xl font-bold text-slate-900 flex flex-wrap items-center gap-2 leading-tight"
              title="สรุปและเปรียบเทียบแนวโน้มปัญหาเชิงพื้นที่ บก.ตชด. ภาค 2 (รายกองกำกับการ)"
            >
              <MapPin className="w-5 h-5 text-rose-600 shrink-0" />
              <span style={{ fontSize: "15.75px" }}>สรุปและเปรียบเทียบแนวโน้มปัญหาเชิงพื้นที่ บก.ตชด. ภาค 2 (รายกองกำกับการ)</span>
            </h3>
            <p 
              className="text-xs font-normal text-slate-500 mt-1 leading-normal"
              title="จัดกลุ่มรายงานปัญหาตามกองกำกับการ (กก.ตชด. 21, 22, 23, 24) สังกัด บก.ตชด. ภาค 2 เพื่อประเมินสัดส่วนและเปรียบเทียบตามรายกองกำกับ"
            >
              จัดกลุ่มรายงานปัญหาตามกองกำกับการ (กก.ตชด. 21, 22, 23, 24) สังกัด บก.ตชด. ภาค 2 เพื่อประเมินสัดส่วนและเปรียบเทียบตามรายกองกำกับ
            </p>
          </div>

          {/* Region Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedRegion("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedRegion === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              ทุกกองกำกับ ({formatNumber(reports.length)})
            </button>
            {Object.keys(BPP_REGIONS).map(rKey => {
              const reg = BPP_REGIONS[rKey];
              const isSel = selectedRegion === rKey;
              const regData = regionalHeatmapData[rKey];
              return (
                <button
                  key={rKey}
                  type="button"
                  onClick={() => setSelectedRegion(isSel ? "ALL" : rKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                    isSel
                      ? `${reg.activeBorder} ${reg.badgeBg} ${reg.badgeText} shadow-xs`
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${reg.accentBg}`} />
                  <span>{reg.shortName}</span>
                  <span className="opacity-70 text-[11px]">({formatNumber(regData?.problems || 0)})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Regional Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {["DIV_21", "DIV_22", "DIV_23", "DIV_24"].map(rKey => {
            const reg = BPP_REGIONS[rKey];
            const data = regionalHeatmapData[rKey] || { total: 0, problems: 0, categories: { budget: 0, travel: 0, time: 0, personnel: 0, tech: 0, other: 0 }, dominantCategoryLabel: "-", dominantCount: 0 };
            const problemRatio = data.total > 0 ? Math.round((data.problems / data.total) * 100) : 0;
            const isSelected = selectedRegion === rKey;

            return (
              <div
                key={rKey}
                onClick={() => setSelectedRegion(isSelected ? "ALL" : rKey)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? `${reg.activeBorder} ${reg.badgeBg}/30 bg-white shadow-md`
                    : `border-slate-200 hover:border-slate-300 hover:shadow-xs bg-slate-50/50`
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${reg.badgeBg} ${reg.badgeText}`}>
                      {reg.shortName}
                    </span>
                    <span className="text-[11px] font-extrabold text-slate-400">
                      อัตราพบปัญหา {formatNumber(problemRatio)}%
                    </span>
                  </div>

                  <h4 className="text-xs font-extrabold text-slate-800 line-clamp-1">{reg.fullName}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{reg.coverageText}</p>

                  <div className="mt-3 grid grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">รายงานทั้งหมด</p>
                      <p className="text-base font-black text-slate-800">{formatNumber(data.total)} <span className="text-[10px] text-slate-400">ฉบับ</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-amber-600 uppercase">พบปัญหา</p>
                      <p className="text-base font-black text-amber-600">{formatNumber(data.problems)} <span className="text-[10px] text-slate-400">เรื่อง</span></p>
                    </div>
                  </div>
                </div>

                {/* Dominant Highlight */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-500" />
                    เน้นหนัก:
                  </span>
                  <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] truncate max-w-[140px]" title={data.dominantCategoryLabel}>
                    {data.dominantCategoryLabel} ({formatNumber(data.dominantCount)})
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Heatmap Matrix Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/50 w-full">
          <table className="w-full text-left border-collapse text-[10px] sm:text-xs table-fixed min-w-full">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-black">
                <th className="p-1.5 sm:p-3 w-[22%]">หน่วยงาน / กองกำกับการ</th>
                <th className="p-1.5 sm:p-3 text-center text-amber-700 bg-amber-50/60 w-[13%]">การเดินทาง / สภาพอากาศ</th>
                <th className="p-1.5 sm:p-3 text-center text-teal-700 bg-teal-50/60 w-[13%]">สื่อ / สัญญาณเน็ต / ไฟฟ้า</th>
                <th className="p-1.5 sm:p-3 text-center text-rose-700 bg-rose-50/60 w-[13%]">งบประมาณ / วัสดุ</th>
                <th className="p-1.5 sm:p-3 text-center text-blue-700 bg-blue-50/60 w-[13%]">เวลา / ภารกิจซ้ำซ้อน</th>
                <th className="p-1.5 sm:p-3 text-center text-purple-700 bg-purple-50/60 w-[13%]">ครู / บุคลากร</th>
                <th className="p-1.5 sm:p-3 text-center text-slate-700 w-[13%]">รวมรายกองกำกับการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-slate-800 font-medium bg-white">
              {Object.keys(BPP_REGIONS).map(rKey => {
                const reg = BPP_REGIONS[rKey];
                const d = regionalHeatmapData[rKey];
                if (!d || d.total === 0) return null;

                const isSelected = selectedRegion === rKey;

                return (
                  <tr
                    key={rKey}
                    onClick={() => setSelectedRegion(isSelected ? "ALL" : rKey)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-indigo-50/80 font-bold" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="p-3 font-extrabold flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${reg.accentBg}`} />
                      <span>{reg.shortName}</span>
                    </td>
                    <td className="p-3 text-center font-bold text-amber-800 bg-amber-50/30">
                      {d.categories.travel > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black">
                          {formatNumber(d.categories.travel)}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="p-3 text-center font-bold text-teal-800 bg-teal-50/30">
                      {d.categories.tech > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 font-black">
                          {formatNumber(d.categories.tech)}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="p-3 text-center font-bold text-rose-800 bg-rose-50/30">
                      {d.categories.budget > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 font-black">
                          {formatNumber(d.categories.budget)}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="p-3 text-center font-bold text-blue-800 bg-blue-50/30">
                      {d.categories.time > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-black">
                          {formatNumber(d.categories.time)}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="p-3 text-center font-bold text-purple-800 bg-purple-50/30">
                      {d.categories.personnel > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-black">
                          {formatNumber(d.categories.personnel)}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="p-3 text-center font-black text-slate-900">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-900 border border-slate-200">
                        {formatNumber(d.problems)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Executive Summary Insights Box */}
        <div className="p-4 bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-amber-50/90 border border-amber-200/80 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h5 className="font-extrabold text-amber-900 text-xs sm:text-sm">
                ข้อสรุปเชิงบริหารสำหรับผู้บังคับบัญชา (Executive Summary บก.ตชด. ภาค 2)
              </h5>
              <p className="text-amber-800/90 leading-relaxed font-medium">
                • <strong>กก.ตชด. 24 (อุดรฯ/เลย) & กก.ตชด. 23 (สกลนคร/นครพนม):</strong> อุปสรรคหลักคือ สภาพเส้นทางทุรกันดารบนภูเขาสูงในฤดูฝน ดินสไลด์ขวางทางเดิน และปัญหาระบบสัญญาณอินเทอร์เน็ต/ไฟฟ้าขัดข้องบ่อยครั้งในถิ่นทุรกันดาร<br />
                • <strong>กก.ตชด. 21 (สุรินทร์/บุรีรัมย์) & กก.ตชด. 22 (อุบลฯ/ศรีสะเกษ):</strong> อุปสรรคสำคัญคือ ปัญหางบประมาณสนับสนุนการเรียนการสอนล่าช้า อุปกรณ์เทคโนโลยี/คอมพิวเตอร์ชำรุด และการขาดแคลนวิทยากรเฉพาะทาง/ครูอัตราจ้าง
              </p>
            </div>
          </div>
          {selectedRegion !== "ALL" && (
            <button
              type="button"
              onClick={() => setSelectedRegion("ALL")}
              className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-2xs transition cursor-pointer"
            >
              แสดงทุกกองกำกับ
            </button>
          )}
        </div>
      </div>

      {/* 3.6 Action Items & Resolution Tracking Panel */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-1">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Action Items & Resolution Tracking</span>
            </div>
            <h3 
              className="text-xs sm:text-sm md:text-base lg:text-lg font-black text-slate-900 flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis"
              title="ระบบติดตามข้อเสนอแนะและการแก้ไข (Action Item / Status Tracking)"
            >
              <Wrench className="w-5 h-5 text-indigo-600 shrink-0" />
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">ระบบติดตามข้อเสนอแนะและการแก้ไข (Action Item / Status Tracking)</span>
            </h3>
            <p 
              className="text-[11px] sm:text-xs text-slate-500 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis"
              title="ติดตามสถานะการตอบสนองปัญหา [รอการดำเนินการ], [กำลังแก้ไข], [แก้ไขแล้ว] และมอบหมายหน่วยงานรับผิดชอบในระดับกองบังคับการและกองบัญชาการ"
            >
              ติดตามสถานะการตอบสนองปัญหา [รอการดำเนินการ], [กำลังแก้ไข], [แก้ไขแล้ว] และมอบหมายหน่วยงานรับผิดชอบในระดับกองบังคับการและกองบัญชาการ
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(selectedActionStatus !== "ALL" || selectedResponsibleUnit !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedActionStatus("ALL");
                  setSelectedResponsibleUnit("ALL");
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                แสดงทุกสถานะ (ล้างตัวกรอง)
              </button>
            )}
          </div>
        </div>

        {/* Action Status Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Pending */}
          <button
            type="button"
            onClick={() => setSelectedActionStatus(selectedActionStatus === "PENDING" ? "ALL" : "PENDING")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
              selectedActionStatus === "PENDING"
                ? "bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/30 shadow-md"
                : "bg-amber-50/40 border-amber-200 hover:border-amber-300 hover:shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-black border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>รอการดำเนินการ</span>
              </span>
              <span className="text-[11px] font-extrabold text-amber-800">
                {actionTrackingStats.total > 0 ? Math.round((actionTrackingStats.pending / actionTrackingStats.total) * 100) : 0}%
              </span>
            </div>
            <p className="text-2xl font-black text-amber-900">
              {formatNumber(actionTrackingStats.pending)} <span className="text-xs font-bold text-slate-500">เรื่อง</span>
            </p>
            <p className="text-[11px] text-amber-800/80 mt-1">
              รับเรื่องแล้ว อยู่ระหว่างรวบรวมข้อมูลเพื่อเสนอผู้บังคับบัญชา
            </p>
          </button>

          {/* Card 2: In Progress */}
          <button
            type="button"
            onClick={() => setSelectedActionStatus(selectedActionStatus === "IN_PROGRESS" ? "ALL" : "IN_PROGRESS")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
              selectedActionStatus === "IN_PROGRESS"
                ? "bg-sky-50/90 border-sky-400 ring-2 ring-sky-400/30 shadow-md"
                : "bg-sky-50/40 border-sky-200 hover:border-sky-300 hover:shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 text-xs font-black border border-sky-200">
                <Wrench className="w-3.5 h-3.5 text-sky-600" />
                <span>กำลังดำเนินการแก้ไข</span>
              </span>
              <span className="text-[11px] font-extrabold text-sky-800">
                {actionTrackingStats.total > 0 ? Math.round((actionTrackingStats.inProgress / actionTrackingStats.total) * 100) : 0}%
              </span>
            </div>
            <p className="text-2xl font-black text-sky-900">
              {formatNumber(actionTrackingStats.inProgress)} <span className="text-xs font-bold text-slate-500">เรื่อง</span>
            </p>
            <p className="text-[11px] text-sky-800/80 mt-1">
              มอบหมายหน่วยงานแล้ว อยู่ระหว่างจัดส่งทีมช่าง/งบประมาณ/ยานพาหนะ
            </p>
          </button>

          {/* Card 3: Resolved */}
          <button
            type="button"
            onClick={() => setSelectedActionStatus(selectedActionStatus === "RESOLVED" ? "ALL" : "RESOLVED")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
              selectedActionStatus === "RESOLVED"
                ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/30 shadow-md"
                : "bg-emerald-50/40 border-emerald-200 hover:border-emerald-300 hover:shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>แก้ไขเสร็จสิ้นแล้ว</span>
              </span>
              <span className="text-[11px] font-extrabold text-emerald-800">
                {actionTrackingStats.total > 0 ? Math.round((actionTrackingStats.resolved / actionTrackingStats.total) * 100) : 0}%
              </span>
            </div>
            <p className="text-2xl font-black text-emerald-900">
              {formatNumber(actionTrackingStats.resolved)} <span className="text-xs font-bold text-slate-500">เรื่อง</span>
            </p>
            <p className="text-[11px] text-emerald-800/80 mt-1">
              ได้รับการแก้ไขเรียบร้อยแล้ว ได้รับการสนับสนุนครบถ้วน
            </p>
          </button>

          {/* Card 4: Overall Progress Rate */}
          <div className="p-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-extrabold text-indigo-900">อัตราความก้าวหน้าภาพรวม</span>
                <span className="text-xs font-black text-indigo-700">{actionTrackingStats.resolutionRate}%</span>
              </div>
              <div className="w-full bg-indigo-200/80 h-2.5 rounded-full overflow-hidden mt-1.5">
                <div 
                  className="bg-gradient-to-r from-indigo-600 to-emerald-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${actionTrackingStats.resolutionRate}%` }}
                />
              </div>
            </div>
            <div className="mt-3 text-[11px] text-indigo-950 font-medium">
              คำนวณจากปัญหารวม <strong className="text-indigo-900">{formatNumber(actionTrackingStats.total)}</strong> รายการ (แก้ไขแล้ว + อยู่ระหว่างแก้ไข)
            </div>
          </div>
        </div>


      </div>

      {/* 4. Controls & Search Filter Bar */}
      <div className="app-card-surface space-y-4 no-print">
        {/* Subdivision Command Selector */}
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span className="typo-app-subtext font-bold uppercase tracking-wider text-slate-500">ระบบตำรวจตระเวนชายแดน ภาค 2 (บก.ตชด. ภาค 2)</span>
          </div>
          <h3 className="typo-app-h3 mb-3 flex items-center gap-1.5 text-slate-900">
            🎯 ด่วน! ค้นหาและคัดกรองตามหน่วยปฏิบัติการกองกำกับการต้นสังกัด (กก.ตชด. 21 - 24)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
            {/* ALL button */}
            <button
              type="button"
              onClick={() => setSelectedRegion("ALL")}
              className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-full ${
                selectedRegion === "ALL"
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/20"
                  : "bg-slate-50/80 border-slate-200/90 text-slate-800 hover:bg-slate-100/80 hover:border-slate-300"
              }`}
            >
              <span className={`text-[11px] font-medium leading-snug line-clamp-2 ${selectedRegion === "ALL" ? "text-indigo-100" : "text-slate-500"}`}>
                ภาพรวม 4 กองกำกับการ (53 โรงเรียน)
              </span>
              <div className={`mt-2.5 pt-2 border-t flex items-center justify-between gap-1.5 ${selectedRegion === "ALL" ? "border-indigo-400/40" : "border-slate-200/80"}`}>
                <span className="text-xs sm:text-sm font-black truncate">ทุกกองกำกับการ</span>
                <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-black shrink-0 ${selectedRegion === "ALL" ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-700"}`}>
                  {formatNumber(reports.length)}
                </span>
              </div>
            </button>

            {Object.keys(BPP_REGIONS).map((rKey) => {
              const reg = BPP_REGIONS[rKey];
              const isSelected = selectedRegion === rKey;
              const count = actionTrackingStats.regionCounts[rKey] || 0;
              
              // Color themes for active states
              const activeStyles = {
                DIV_21: "bg-blue-600 border-blue-600 text-white ring-2 ring-blue-500/20 shadow-xs",
                DIV_22: "bg-emerald-600 border-emerald-600 text-white ring-2 ring-emerald-500/20 shadow-xs",
                DIV_23: "bg-amber-600 border-amber-600 text-white ring-2 ring-amber-500/20 shadow-xs",
                DIV_24: "bg-purple-600 border-purple-600 text-white ring-2 ring-purple-500/20 shadow-xs",
              }[rKey] || "bg-indigo-600 border-indigo-600 text-white shadow-xs";

              const coverageCleanText = reg.coverageText.replace("ดูแลโรงเรียน ตชด. ในพื้นที่ ", "");

              return (
                <button
                  type="button"
                  key={rKey}
                  onClick={() => setSelectedRegion(rKey)}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-full ${
                    isSelected
                      ? activeStyles
                      : "bg-slate-50/80 border-slate-200/90 text-slate-800 hover:bg-slate-100/80 hover:border-slate-300"
                  }`}
                >
                  <span className={`text-[11px] font-medium leading-snug line-clamp-2 ${isSelected ? "text-white/90" : "text-slate-500"}`}>
                    {coverageCleanText}
                  </span>
                  <div className={`mt-2.5 pt-2 border-t flex items-center justify-between gap-1.5 ${isSelected ? "border-white/25" : "border-slate-200/80"}`}>
                    <span className="text-xs sm:text-sm font-black truncate">{reg.shortName}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-black shrink-0 ${isSelected ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-700"}`}>
                      {formatNumber(count)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาข้อความปัญหา, หน่วยงานรับผิดชอบ, สถานะการแก้ไข, โรงเรียน..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ล้าง
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs sm:text-sm">
            {/* Action Status Filter Select */}
            <select
              value={selectedActionStatus}
              onChange={(e) => setSelectedActionStatus(e.target.value)}
              className="px-3 py-2 bg-amber-50/80 border border-amber-300 rounded-xl text-xs sm:text-sm font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">ทุกสถานะการตอบสนอง [Action Status]</option>
              <option value="PENDING">🟠 [รอการดำเนินการ] ({actionTrackingStats.pending})</option>
              <option value="IN_PROGRESS">🔵 [กำลังแก้ไข] ({actionTrackingStats.inProgress})</option>
              <option value="RESOLVED">🟢 [แก้ไขแล้ว] ({actionTrackingStats.resolved})</option>
            </select>

            {/* Responsible Unit Select */}
            <select
              value={selectedResponsibleUnit}
              onChange={(e) => setSelectedResponsibleUnit(e.target.value)}
              className="px-3 py-2 bg-emerald-50/80 border border-emerald-300 rounded-xl text-xs sm:text-sm font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">ทุกหน่วยงาน</option>
              {RESPONSIBLE_UNITS.map(unit => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>

            {/* Region Select */}
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-2 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs sm:text-sm font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">ทุกกองกำกับการ (กก.ตชด. 21-24)</option>
              {Object.keys(BPP_REGIONS).map(rKey => (
                <option key={rKey} value={rKey}>{BPP_REGIONS[rKey].shortName} - {BPP_REGIONS[rKey].fullName}</option>
              ))}
            </select>

            {/* School Select */}
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">ทุกโรงเรียน</option>
              {schoolsList.map(school => (
                <option key={school} value={school}>{school}</option>
              ))}
            </select>

            {/* Target Select */}
            <select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">ทุกด้าน (กพด.)</option>
              {targetList.map(target => (
                <option key={target} value={target}>{target}</option>
              ))}
            </select>

            {/* View Mode Buttons */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("CARD")}
                title="มุมมองการ์ด"
                className={`p-1.5 rounded-lg transition ${viewMode === "CARD" ? "bg-white text-indigo-600 shadow-2xs" : "text-slate-500"}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("TABLE")}
                title="มุมมองตาราง"
                className={`p-1.5 rounded-lg transition ${viewMode === "TABLE" ? "bg-white text-indigo-600 shadow-2xs" : "text-slate-500"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search Results Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-1 border-t border-slate-100">
          <span>
            แสดงผล <strong className="text-slate-800 font-extrabold">{formatNumber(filteredReports.length)}</strong> รายการ จากทั้งหมด {formatNumber(reports.length)} รายการ
          </span>
          {(selectedSchool !== "ALL" || selectedTarget !== "ALL" || selectedCategory !== "ALL" || selectedActionStatus !== "ALL" || selectedResponsibleUnit !== "ALL" || searchTerm !== "" || filterType !== "HAS_PROBLEM") && (
            <button
              onClick={() => {
                setSelectedSchool("ALL");
                setSelectedTarget("ALL");
                setSelectedCategory("ALL");
                setSelectedActionStatus("ALL");
                setSelectedResponsibleUnit("ALL");
                setSearchTerm("");
                setFilterType("HAS_PROBLEM");
              }}
              className="text-indigo-600 hover:underline font-bold"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* 5. Main Content Display */}
      {filteredReports.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/90 text-center space-y-3">
          <Info className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-base font-bold text-slate-700">ไม่พบรายการปัญหาและอุปสรรคตามเงื่อนไข</h4>
          <p className="text-xs text-slate-500">ลองปรับเปลี่ยนคำค้นหา หรือเปลี่ยนตัวกรองโรงเรียน/สถานะ</p>
        </div>
      ) : viewMode === "CARD" ? (
        /* CARD VIEW */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedReports.map((report) => {
              const hasProblem = hasSubstantiveProblem(report);
              const imageUrls = parseImageUrls(report.imageUrl);
              const goalId = getGoalIdFromCode(report.goalCode);
              const displayUrl = imageUrls.length > 0 ? imageUrls[0] : getGoalFallbackImage(goalId, report.id.length);
              const hasUploadedPhoto = imageUrls.length > 0;

              return (
                <div 
                  key={report.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between space-y-4 hover:border-indigo-200 hover:shadow-md transition duration-200"
                >
                  {/* Header info */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span 
                        style={{ fontSize: "10px" }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200"
                      >
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate max-w-[200px]">{report.schoolName}</span>
                      </span>

                      {report.kpiCode && (
                        <span 
                          style={{ fontSize: "10px" }}
                          className="inline-flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold rounded border border-indigo-200 shrink-0"
                        >
                          {report.kpiCode}
                        </span>
                      )}
                    </div>

                    <h3 
                      onClick={() => handleDocumentClick(report.id)}
                      style={{ fontSize: "11.5px" }}
                      className="text-[11.5px] font-bold text-slate-900 leading-snug hover:text-indigo-600 transition cursor-pointer"
                      title="คลิกเปิดดูรายงานแบบหน้าต่างลอย"
                    >
                      {report.activityName}
                    </h3>

                    <div 
                      style={{ fontSize: "10px" }}
                      className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 font-medium"
                    >
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {report.dateString || "ไม่ระบุวันที่"}
                      </span>
                      <span>•</span>
                      <span className="text-slate-600 font-semibold">{report.reportingPeriod}</span>
                    </div>
                  </div>

                  {/* Photo Banner / Preview */}
                  <div className="relative group overflow-hidden rounded-xl border border-slate-200/90 bg-slate-900/5 aspect-16/9 max-h-[210px] sm:max-h-[230px]">
                    <SmartFaceImage
                      src={displayUrl}
                      alt={report.activityName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                      fallbackSrc={getGoalFallbackImage(goalId, report.id.length + 1)}
                    />
                    <div 
                      onClick={() => {
                        setLightboxPhoto({ url: displayUrl, allUrls: imageUrls.length > 0 ? imageUrls : [displayUrl], report });
                        setActiveLightboxUrl(displayUrl);
                      }}
                      className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/25 to-transparent opacity-90 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5 cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black backdrop-blur-md shadow-2xs ${
                          hasUploadedPhoto 
                            ? "bg-emerald-600/90 text-white border border-emerald-400/40" 
                            : "bg-indigo-900/80 text-indigo-100 border border-indigo-500/40"
                        }`}>
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>{hasUploadedPhoto ? `ภาพแนบกิจกรรม (${imageUrls.length} ภาพ)` : "ภาพประกอบหมวดกิจกรรม"}</span>
                        </span>

                        <button
                          type="button"
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition cursor-pointer"
                          title="ขยายดูภาพขนาดใหญ่"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div 
                        style={{ fontSize: "11px" }}
                        className="text-white text-[11px] font-bold truncate flex items-center justify-between gap-1"
                      >
                        <span className="truncate">{report.activityName}</span>
                        <span className="text-[10px] text-indigo-200 shrink-0 font-normal underline decoration-indigo-400">คลิกขยายภาพ</span>
                      </div>
                    </div>
                  </div>

                  {/* Problems & Solutions boxes */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100 flex-1">
                    {/* Problem Box */}
                    <div className={`p-3.5 rounded-xl border ${hasProblem ? "bg-amber-50/80 border-amber-200/90" : "bg-emerald-50/80 border-emerald-200/90"}`}>
                      <div className="flex items-center gap-1.5 mb-[9px]">
                        {hasProblem ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span 
                              style={{ fontSize: "11.5px" }}
                              className="text-[11.5px] font-extrabold text-amber-900 uppercase tracking-wide"
                            >
                              ปัญหาและอุปสรรคที่พบ
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span 
                              style={{ fontSize: "11.5px" }}
                              className="text-[11.5px] font-extrabold text-emerald-900 uppercase tracking-wide"
                            >
                              สถานะการดำเนินงาน
                            </span>
                          </>
                        )}
                      </div>
                      <p 
                        style={{ fontSize: "13.5px" }}
                        className="text-[13.5px] text-slate-800 font-medium leading-relaxed whitespace-pre-wrap"
                      >
                        {report.problems || "ไม่มีปัญหาอุปสรรค"}
                      </p>
                    </div>

                    {/* Suggestion Box */}
                    {report.suggestions && report.suggestions.trim() !== "" && report.suggestions !== "-" && (
                      <div className="p-3.5 rounded-xl border bg-blue-50/80 border-blue-200/90">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Lightbulb className="w-4 h-4 text-blue-600 shrink-0" />
                          <span 
                            style={{ fontSize: "10.5px" }}
                            className="text-[10.5px] font-extrabold text-blue-900 uppercase tracking-wide"
                          >
                            แนวทางแก้ไขและข้อเสนอแนะ
                          </span>
                        </div>
                        <p 
                          style={{ fontSize: "10.5px" }}
                          className="text-[10.5px] text-slate-800 font-medium leading-relaxed whitespace-pre-wrap"
                        >
                          {report.suggestions}
                        </p>
                      </div>
                    )}

                    {/* Action Item Tracking Box */}
                    {hasProblem && (() => {
                      const action = getActionItem(report);
                      const meta = ACTION_STATUS_META[action.status];
                      const StatusIcon = meta.icon;
                      return (
                        <div className={`p-3.5 rounded-xl border ${meta.badgeBg} ${meta.borderColor} space-y-2 mt-2`}>
                          <div className="flex items-center justify-between gap-2">
                            <span 
                              style={{ fontSize: "10.5px" }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-black border ${meta.badgeText} shadow-2xs`}
                            >
                              <StatusIcon className="w-3.5 h-3.5" />
                              <span>[{meta.label}]</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => openActionModal(report)}
                              style={{ fontSize: "10.5px" }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-[10.5px] font-bold border border-slate-300 shadow-2xs transition cursor-pointer"
                              title="อัปเดตสถานะการตอบสนองและมอบหมายหน่วยงาน"
                            >
                              <Edit3 className="w-3 h-3 text-indigo-600" />
                              <span>อัปเดตสถานะ</span>
                            </button>
                          </div>

                          <div 
                            style={{ fontSize: "10.5px" }}
                            className="text-[10.5px] space-y-1"
                          >
                            <p className="font-extrabold text-slate-900 flex items-center gap-1">
                              <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>หน่วยงานรับผิดชอบ:</span>
                              <span className="text-indigo-950 underline decoration-indigo-300 underline-offset-2">{action.responsibleUnit}</span>
                            </p>
                            <p className="text-slate-700 font-medium leading-relaxed pl-3 border-l-2 border-slate-300/80">
                              <strong className="text-slate-900">ความก้าวหน้า:</strong> {action.actionDetail}
                            </p>
                            {action.updatedAt && (
                              <p className="text-[9.5px] text-slate-400 text-right">
                                อัปเดตล่าสุด: {action.updatedAt}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Footer Action */}
                  <div 
                    style={{ fontSize: "10.5px" }}
                    className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 text-[10.5px]"
                  >
                    <span className="text-slate-500">
                      รายงานโดย: <strong className="text-slate-700">{report.reportedBy || "ตชด."}</strong>
                    </span>

                    <button
                      onClick={() => handleDocumentClick(report.id)}
                      style={{ fontSize: "10.5px" }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10.5px] font-bold transition cursor-pointer shrink-0"
                      title="เปิดดูรายงานฉบับสมบูรณ์ A4"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>ดูเอกสาร A4</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse table-fixed min-w-full">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] sm:text-xs font-extrabold uppercase tracking-wider">
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 w-[4%] text-center">#</th>
                  <th className="py-2.5 sm:py-3.5 px-1 sm:px-2 w-[6%] text-center">รูปภาพ</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 w-[18%]">โรงเรียน/หน่วยงาน</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 w-[18%]">กิจกรรม / ตัวชี้วัด</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 w-[22%]">ปัญหาและอุปสรรคที่พบ</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 w-[16%]">สถานะตอบสนอง</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-3 w-[12%]">ความก้าวหน้า</th>
                  <th className="py-2.5 sm:py-3.5 px-1 sm:px-2 text-center w-[4%]">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-700">
                {paginatedReports.map((report, index) => {
                  const globalIdx = pageSize === 0 ? index : (currentPage - 1) * pageSize + index;
                  const hasProblem = hasSubstantiveProblem(report);
                  const imageUrls = parseImageUrls(report.imageUrl);
                  const goalId = getGoalIdFromCode(report.goalCode);
                  const displayUrl = imageUrls.length > 0 ? imageUrls[0] : getGoalFallbackImage(goalId, report.id.length);
                  const hasUploadedPhoto = imageUrls.length > 0;

                  return (
                    <tr key={report.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-2 text-center font-bold text-slate-400 text-xs">
                        {formatNumber(globalIdx + 1)}
                      </td>
                      <td className="py-2.5 px-1.5 text-center">
                        <div 
                          onClick={() => {
                            setLightboxPhoto({ url: displayUrl, allUrls: imageUrls.length > 0 ? imageUrls : [displayUrl], report });
                            setActiveLightboxUrl(displayUrl);
                          }}
                          className="relative group w-10 h-10 mx-auto rounded-lg overflow-hidden border border-slate-200/90 shadow-2xs cursor-pointer shrink-0 bg-slate-100"
                          title="คลิกเพื่อดูรูปภาพแบบขยาย"
                        >
                          <SmartFaceImage
                            src={displayUrl}
                            alt={report.activityName}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            fallbackSrc={getGoalFallbackImage(goalId, report.id.length + 1)}
                          />
                          {hasUploadedPhoto && (
                            <span className="absolute bottom-0.5 right-0.5 bg-emerald-600/90 text-white text-[8px] font-black px-1 py-0.2 rounded shadow-xs">
                              {imageUrls.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 font-bold text-slate-900 min-w-0">
                        <div className="truncate text-xs">{report.schoolName}</div>
                        <div className="text-[10px] font-normal text-slate-500 truncate">{report.reportingPeriod}</div>
                      </td>
                      <td className="py-2.5 px-2 font-semibold text-slate-800 min-w-0">
                        <div className="truncate text-xs">{report.activityName}</div>
                        {report.kpiCode && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-indigo-50 text-indigo-700 text-[9.5px] font-extrabold rounded border border-indigo-200">
                            {report.kpiCode}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 min-w-0">
                        <div className={`p-2 rounded-lg text-[11px] leading-relaxed ${hasProblem ? "bg-amber-50 text-amber-900 border border-amber-200 font-medium" : "text-slate-500 font-normal"}`}>
                          {report.problems || "ไม่มีปัญหาอุปสรรค"}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 min-w-0">
                        {hasProblem ? (() => {
                          const action = getActionItem(report);
                          const meta = ACTION_STATUS_META[action.status];
                          const StatusIcon = meta.icon;
                          return (
                            <div className="space-y-1.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-black border ${meta.badgeBg} ${meta.badgeText}`}>
                                <StatusIcon className="w-3 h-3" />
                                <span>[{meta.shortLabel}]</span>
                              </span>
                              <div className="text-xs font-bold text-slate-900 leading-tight">
                                {action.responsibleUnit}
                              </div>
                            </div>
                          );
                        })() : (
                          <span className="text-emerald-700 text-xs font-bold">ไม่มีปัญหา</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        {hasProblem ? (() => {
                          const action = getActionItem(report);
                          return (
                            <div className="text-xs text-slate-700 font-medium leading-relaxed">
                              {action.actionDetail}
                            </div>
                          );
                        })() : (
                          <span className="text-slate-400 text-xs italic">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          <button
                            onClick={() => handleDocumentClick(report.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition cursor-pointer w-full justify-center"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>เปิดดู</span>
                          </button>
                          {hasProblem && (
                            <button
                              onClick={() => openActionModal(report)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition cursor-pointer w-full justify-center border border-indigo-200"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>แก้ไขสถานะ</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      {filteredReports.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-2">
            <span>แสดงผลทีละ</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-slate-50 border border-slate-300 font-bold rounded-lg px-2.5 py-1.5 text-slate-800"
            >
              <option value={12}>12 รายการ/หน้า</option>
              <option value={24}>24 รายการ/หน้า</option>
              <option value={48}>48 รายการ/หน้า</option>
              <option value={100}>100 รายการ/หน้า</option>
              <option value={0}>แสดงทั้งหมด ({filteredReports.length} รายการ)</option>
            </select>
            <span>
              {pageSize > 0 ? (
                <>
                  รายการที่ <strong className="text-slate-900">{((currentPage - 1) * pageSize) + 1}</strong> ถึง{" "}
                  <strong className="text-slate-900">{Math.min(currentPage * pageSize, filteredReports.length)}</strong> จากทั้งหมด{" "}
                  <strong className="text-slate-900">{filteredReports.length}</strong> รายการ
                </>
              ) : (
                <>แสดงทั้งหมด {filteredReports.length} รายการ</>
              )}
            </span>
          </div>

          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 font-bold transition cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ก่อนหน้า</span>
              </button>

              <span className="font-extrabold text-indigo-950 px-2">
                หน้า {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-30 disabled:hover:bg-indigo-600 font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span>ถัดไป</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Item Status & Responsible Unit Update Modal */}
      {editingActionReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>อัปเดตสถานะการตอบสนองข้อเสนอแนะ</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingActionReport.schoolName}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1">
                  กิจกรรม: {editingActionReport.activityName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingActionReport(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reported Problem Context Box */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
              <p className="font-extrabold text-amber-900 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>ปัญหาที่รายงานมา:</span>
              </p>
              <p className="text-amber-950 font-medium leading-relaxed">
                {editingActionReport.problems || "ไม่มีข้อมูลปัญหา"}
              </p>
            </div>

            {/* Form inputs */}
            <div className="space-y-4 text-xs sm:text-sm">
              {/* 1. Status selector */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800 block">
                  1. สถานะการตอบสนอง (Response / Resolution Status):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["PENDING", "IN_PROGRESS", "RESOLVED"] as ActionStatus[]).map(statusKey => {
                    const meta = ACTION_STATUS_META[statusKey];
                    const Icon = meta.icon;
                    const isSelected = modalStatus === statusKey;
                    return (
                      <button
                        key={statusKey}
                        type="button"
                        onClick={() => setModalStatus(statusKey)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer text-xs font-extrabold ${
                          isSelected 
                            ? `${meta.badgeBg} ${meta.borderColor} ${meta.badgeText} ring-2 ring-indigo-500/30 shadow-xs` 
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>[{meta.shortLabel}]</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Responsible Unit input */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800 block">
                  2. หน่วยงานรับผิดชอบหลัก (Responsible Unit):
                </label>
                <select
                  value={modalUnit}
                  onChange={(e) => setModalUnit(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {RESPONSIBLE_UNITS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              {/* 3. Action detail notes */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800 block">
                  3. รายละเอียดความก้าวหน้า / ผลการดำเนินการแก้ไข (Action Note):
                </label>
                <textarea
                  rows={3}
                  value={modalDetail}
                  onChange={(e) => setModalDetail(e.target.value)}
                  placeholder="ระบุความก้าวหน้า เช่น จัดทำคำขออนุมัติงบประมาณแล้ว, ประสาน NT เข้าดำเนินการติดตั้ง หรือส่งมอบสิ่งของ..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
                />
              </div>

              {/* 4. Target date */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800 block">
                  4. กำหนดเสร็จสิ้น (Target Deadline):
                </label>
                <input
                  type="text"
                  value={modalTargetDate}
                  onChange={(e) => setModalTargetDate(e.target.value)}
                  placeholder="เช่น 30 ก.ย. 2569"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingActionReport(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveActionModal}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกสถานะการแก้ไข</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Problems View */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 no-print animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Lightbox Header */}
            <div className="p-3.5 sm:p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-indigo-600/30 text-indigo-400 rounded-xl border border-indigo-500/30 shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-100 truncate">
                    {lightboxPhoto.report.activityName}
                  </h3>
                  <p className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                    <span>{lightboxPhoto.report.schoolName}</span>
                    <span>•</span>
                    <span>{lightboxPhoto.report.reportingPeriod}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setLightboxPhoto(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
                title="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Image Viewport */}
            <div className="relative flex-1 bg-black flex items-center justify-center p-2 min-h-[250px] sm:min-h-[380px] overflow-hidden">
              <SmartFaceImage
                src={activeLightboxUrl || lightboxPhoto.url}
                alt={lightboxPhoto.report.activityName}
                className="max-h-[58vh] w-auto max-w-full object-contain rounded-lg shadow-xl"
                fallbackSrc={getGoalFallbackImage(getGoalIdFromCode(lightboxPhoto.report.goalCode))}
              />

              {/* Thumbnail selector if multiple images */}
              {lightboxPhoto.allUrls.length > 1 && (
                <div className="absolute bottom-3 inset-x-0 flex justify-center gap-2 px-4 py-1.5 bg-black/70 backdrop-blur-md max-w-md mx-auto rounded-full overflow-x-auto">
                  {lightboxPhoto.allUrls.map((u, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveLightboxUrl(u)}
                      className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                        (activeLightboxUrl || lightboxPhoto.url) === u
                          ? "border-indigo-500 scale-110 shadow-md"
                          : "border-slate-700 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={u} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lightbox Footer details */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 text-slate-300 space-y-3 shrink-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-amber-950/40 border border-amber-800/60 p-3 rounded-xl space-y-1">
                  <span className="font-extrabold text-amber-400 flex items-center gap-1 uppercase tracking-wide text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    ปัญหาและอุปสรรคที่พบ
                  </span>
                  <p className="text-amber-100 font-medium leading-relaxed max-h-20 overflow-y-auto whitespace-pre-wrap">
                    {lightboxPhoto.report.problems || "ไม่มีปัญหาอุปสรรค"}
                  </p>
                </div>

                {lightboxPhoto.report.suggestions && lightboxPhoto.report.suggestions.trim() !== "" && (
                  <div className="bg-sky-950/40 border border-sky-800/60 p-3 rounded-xl space-y-1">
                    <span className="font-extrabold text-sky-400 flex items-center gap-1 uppercase tracking-wide text-[11px]">
                      <Lightbulb className="w-3.5 h-3.5" />
                      แนวทางแก้ไขและข้อเสนอแนะ
                    </span>
                    <p className="text-sky-100 font-medium leading-relaxed max-h-20 overflow-y-auto whitespace-pre-wrap">
                      {lightboxPhoto.report.suggestions}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span className="text-xs text-slate-400">
                  ผู้รายงาน: <strong className="text-slate-200">{lightboxPhoto.report.reportedBy || "ตชด."}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <a
                    href={activeLightboxUrl || lightboxPhoto.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>เปิดรูปในแท็บใหม่</span>
                  </a>

                  {onNavigateToDocument && (
                    <button
                      onClick={() => {
                        const repId = lightboxPhoto.report.id;
                        setLightboxPhoto(null);
                        onNavigateToDocument(repId);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>ดูเอกสาร A4</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Floating Window Modal for Selected A4 Document Report */}
      {floatingDocReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200 no-print">
          <div className="bg-slate-900 rounded-2xl border border-slate-700/80 shadow-2xl w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden relative">
            {/* Header Bar */}
            <div className="px-4 sm:px-6 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      หน้าต่างลอยแสดงเอกสารรายงาน A4
                    </span>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold border border-slate-700 truncate max-w-[180px]">
                      {floatingDocReport.schoolName}
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 rounded text-[10px] font-extrabold border border-indigo-800">
                      {floatingDocReport.goalCode}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white truncate mt-0.5">
                    {floatingDocReport.activityName}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onNavigateToDocument && (
                  <button
                    onClick={() => {
                      const repId = floatingDocReport.id;
                      setFloatingDocReport(null);
                      if (onSelectReport) onSelectReport(repId);
                      if (onNavigateToDocument) onNavigateToDocument(repId);
                    }}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
                    title="ขยายเปิดเต็มหน้าจอในแท็บเอกสาร"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                    <span>ขยายเต็มหน้าจอ</span>
                  </button>
                )}

                <button
                  onClick={() => setFloatingDocReport(null)}
                  className="p-2 bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 rounded-xl transition cursor-pointer border border-slate-700"
                  title="ปิดหน้าต่างลอย (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Floating Modal Content: A4 Document Viewer */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-slate-950/70">
              <A4Document
                report={floatingDocReport}
                reports={reports}
                onSelectReport={(id) => {
                  const found = reports.find((r) => r.id === id);
                  if (found) setFloatingDocReport(found);
                  if (onSelectReport) onSelectReport(id);
                }}
                onEditReport={() => {}}
                onDeleteReport={() => {}}
                hideBanner={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
