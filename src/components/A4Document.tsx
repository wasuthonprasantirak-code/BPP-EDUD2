import { useRef, useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { ActivityReport, KOPODOT_GOALS, getGoalIdFromCode } from "../types";
import { OFFICIAL_INDICATORS } from "../data/indicatorsData";
import { ROYAL_EMBLEM_IMAGE } from "../data/emblemLogo";
import { OFFICIAL_TARGET_SCHOOLS, getPrincipalBySchoolName, isSchoolMatch, getSchoolAddressBySchoolName, getSchoolGpsBySchoolName } from "../data/schoolsData";
import { Download, FileImage, Printer, Edit, Edit3, ArrowLeftRight, Layers, Eye, FileText, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CheckCircle, CheckCircle2, Check, ZoomIn, ZoomOut, RotateCcw, RefreshCw, Filter, CalendarClock, Clock, Calendar, Search, X, MapPin, School, Move, Sparkles, Loader2, MinusCircle, PlusCircle, Minus, Plus, UserCheck, ShieldCheck, Copy, SlidersHorizontal, FolderDown, CheckSquare, Square } from "lucide-react";
import { safeHtml2Canvas } from "../lib/html2canvasFix";
import jsPDF from "jspdf";
import { parseReportDateDetails } from "./Dashboard";
import { sanitizeWindowsFilename, triggerWindowsFileDownload, triggerCrossPlatformDownload, getAdaptiveCanvasScale, isMobileOrTablet } from "../lib/windowsUtils";
import { extractReportParticipantCount } from "../lib/safeDateUtils";
import { findIndicatorForReport, getGoalsContext } from "../lib/kopodotGoalsMapping";

import { SmartFaceImage } from "./SmartFaceImage";
import { DigitalSignatureModal } from "./DigitalSignatureModal";
import { ExecutiveCommentModal } from "./ExecutiveCommentModal";
import { AdjustableSignature } from "./AdjustableSignature";
import { ReportQrCodeModal } from "./ReportQrCodeModal";

interface A4DocumentProps {
  report: ActivityReport | null;
  reports: ActivityReport[];
  isSyncing?: boolean;
  onSelectReport: (reportId: string) => void;
  onEditReport: (report: ActivityReport) => void;
  onUpdateReport?: (report: ActivityReport) => void;
  onDeleteReport: (reportId: string) => void;
  onOpenMultiPhaseTracker?: () => void;
  onOpenBatchExport?: (options?: {
    initialSelectedIds?: string[];
    initialSchoolFilter?: string;
    initialGoalFilter?: string;
    initialFormat?: "zip-pdf" | "zip-png" | "combined-pdf";
  }) => void;
  schoolFilter?: string;
  setSchoolFilter?: (schoolName: string) => void;
  goalFilter?: string;
  setGoalFilter?: (goalCode: string) => void;
  onOpenQrModal?: () => void;
  hideBanner?: boolean;
}

// Global setting / fallback: default to false (Thai numerals ๐-๙ for official government A4 documents)
let isGlobalArabicNumerals = false;

export const setGlobalArabicNumerals = (val: boolean) => {
  isGlobalArabicNumerals = val;
};

export const getGlobalArabicNumerals = () => isGlobalArabicNumerals;

// Helper to convert Thai digits (๐-๙) to Arabic / International digits (0-9)
export const toArabicNumerals = (num: number | string | undefined | null): string => {
  if (num === null || num === undefined) return "";
  const thaiToArabicMap: Record<string, string> = {
    '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
    '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9'
  };
  return String(num).replace(/[๐-๙]/g, (digit) => thaiToArabicMap[digit] || digit);
};

// Converts numbers to Thai digits (๐-๙) for A4 government documents (forceThai defaults to true for A4 paper)
export const toDocNumerals = (num: number | string | undefined | null, forceThai = true): string => {
  if (num === null || num === undefined) return "";
  const rawStr = String(num);
  if (!forceThai && isGlobalArabicNumerals) {
    return toArabicNumerals(rawStr);
  }
  const arabicToThaiMap: Record<string, string> = {
    '0': '๐', '1': '๑', '2': '๒', '3': '๓', '4': '๔',
    '5': '๕', '6': '๖', '7': '๗', '8': '๘', '9': '๙'
  };
  return rawStr.replace(/[0-9]/g, (digit) => arabicToThaiMap[digit] || digit);
};

// Main document numeral formatter (strictly converts to Thai numerals ๐-๙ for A4 paper page)
const toThaiNumerals = (num: number | string | undefined | null): string => {
  return toDocNumerals(num, true);
};

const formatThaiNumberWithComma = (val: number | string | undefined | null, forceThai = true): string => {
  if (val === null || val === undefined || val === "") return "-";
  const strVal = String(val).trim();
  const cleanedVal = toArabicNumerals(strVal).replace(/,/g, "");
  const parsed = Number(cleanedVal);
  if (!isNaN(parsed)) {
    if (!forceThai && isGlobalArabicNumerals) {
      return parsed.toLocaleString("en-US");
    }
    const formatted = parsed.toLocaleString("en-US");
    return toDocNumerals(formatted, true);
  }
  return toDocNumerals(strVal, forceThai);
};

const formatInternationalNumberWithComma = (val: number | string | undefined | null): string => {
  if (val === null || val === undefined || val === "") return "-";
  const strVal = String(val).trim();
  const parsed = Number(strVal.replace(/,/g, ""));
  if (!isNaN(parsed)) {
    return parsed.toLocaleString("en-US");
  }
  return strVal;
};

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const THAI_SHORT_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

const formatThaiFullDate = (dateStr: string): string => {
  if (!dateStr) return toDocNumerals("6 พฤษภาคม 2569");
  
  // Handle DD/MM/YYYY or D/M/YYYY
  const slashParts = dateStr.trim().split('/');
  if (slashParts.length === 3) {
    const day = parseInt(slashParts[0], 10);
    const month = parseInt(slashParts[1], 10);
    let year = parseInt(slashParts[2], 10);
    if (year < 2400) year += 543;
    if (!isNaN(day) && month >= 1 && month <= 12) {
      return toDocNumerals(`${day} ${THAI_MONTHS[month - 1]} ${year}`);
    }
  }

  // Handle YYYY-MM-DD
  const dashParts = dateStr.trim().split('-');
  if (dashParts.length === 3 && dashParts[0].length === 4) {
    let year = parseInt(dashParts[0], 10);
    const month = parseInt(dashParts[1], 10);
    const day = parseInt(dashParts[2], 10);
    if (year < 2400) year += 543;
    if (!isNaN(day) && month >= 1 && month <= 12) {
      return toDocNumerals(`${day} ${THAI_MONTHS[month - 1]} ${year}`);
    }
  }

  return toDocNumerals(dateStr);
};

// 1. Get formatted school header
const getSchoolHeader = (schoolName: string): string => {
  const match = OFFICIAL_TARGET_SCHOOLS.find(s => isSchoolMatch(schoolName, s.name));
  if (!match) {
    let cleanName = schoolName;
    if (cleanName.startsWith("โรงเรียนตำรวจตระเวนชายแดน")) {
      cleanName = cleanName.replace("โรงเรียนตำรวจตระเวนชายแดน", "รร.ตชด.");
    } else if (cleanName.startsWith("โรงเรียน")) {
      cleanName = cleanName.replace("โรงเรียน", "รร.");
    }
    return toDocNumerals(`รร.ตชด.สังกัด บก.ตชด.ภาค 2 ${cleanName}`);
  }
  
  let abbName = match.name;
  if (abbName.startsWith("โรงเรียนตำรวจตระเวนชายแดน")) {
    abbName = abbName.replace("โรงเรียนตำรวจตระเวนชายแดน", "รร.ตชด.");
  } else if (abbName.startsWith("โรงเรียน")) {
    abbName = abbName.replace("โรงเรียน", "รร.");
  }
  
  let region = "บก.ตชด.ภาค 2";
  const prov = match.province;
  if (["เชียงใหม่", "ตาก", "แม่ฮ่องสอน", "เชียงราย", "พะเยา", "น่าน", "แพร่", "ลำปาง", "ลำพูน", "อุตรดิตถ์", "พิษณุโลก", "สุโขทัย", "เพชรบูรณ์"].includes(prov)) {
    region = "บก.ตชด.ภาค 3";
  } else if (["สงขลา", "ยะลา", "นราธิวาส", "ปัตตานี", "สุราษฎร์ธานี", "นครศรีธรรมราช", "ชุมพร", "ระนอง", "พังงา", "ภูเก็ต", "กระบี่", "ตรัง", "พัทลุง", "สตูล"].includes(prov)) {
    region = "บก.ตชด.ภาค 4";
  } else if (["จันทบุรี", "ตราด", "สระแก้ว", "ฉะเชิงเทรา", "กาญจนบุรี", "ราชบุรี", "ประจวบคีรีขันธ์", "เพชรบุรี"].includes(prov)) {
    region = "บก.ตชด.ภาค 1";
  }
  
  return toDocNumerals(`รร.ตชด.สังกัด ${region} ${abbName}`);
};

// 2. Get Thai affiliation abbreviation
const getThaiAffiliation = (schoolName: string): string => {
  const match = OFFICIAL_TARGET_SCHOOLS.find(s => isSchoolMatch(schoolName, s.name));
  if (!match) return toDocNumerals("กก.ตชด.21");
  const group = match.groupName;
  if (group.includes("กองกำกับการตำรวจตระเวนชายแดนที่")) {
    const num = group.replace(/[^\d]/g, "");
    return toDocNumerals(`กก.ตชด.${num}`);
  }
  return toDocNumerals(group);
};

// 3. Get school address formatted in Thai numerals
const getThaiAddress = (schoolName: string): string => {
  const directAddr = getSchoolAddressBySchoolName(schoolName);
  if (directAddr) {
    let cleanAddr = directAddr
      .replace(/หมู่ที่\s*/g, "หมู่ ")
      .replace(/ตำบล\s*/g, "ต.")
      .replace(/อำเภอ\s*/g, "อ.");
    return toDocNumerals(cleanAddr);
  }
  const match = OFFICIAL_TARGET_SCHOOLS.find(s => isSchoolMatch(schoolName, s.name));
  if (!match) return toDocNumerals("หมู่ 3 บ้านซำปะโต ต.อาโพน อ.บัวเชด จ.สุรินทร์");
  const villageNoStr = match.villageNo ? `หมู่ ${toDocNumerals(match.villageNo)}` : "";
  const villageStr = match.village ? `บ้าน${match.village}` : "";
  const subdist = match.subdistrict ? `ต.${match.subdistrict}` : "";
  const dist = match.district ? `อ.${match.district}` : "";
  const prov = match.province ? `จ.${match.province}` : "";
  return toDocNumerals(`${villageNoStr} ${villageStr} ${subdist} ${dist} ${prov}`.trim().replace(/\s+/g, ' '));
};

// 4. Subgoal and Objective text mappings aligned with official กพด. ฉบับที่ ๕ (re-exported from kopodotGoalsMapping)

// Signature Ranks Extraction Helper
const parseNameAndRank = (fullName: string) => {
  if (!fullName) return { rank: "", cleanName: "" };
  const cleaned = fullName.replace(/\s*0[0-9-]{8,12}\s*$/, "");
  const trimmed = cleaned.trim();
  if (trimmed.startsWith("ครูใหญ่")) {
    const rest = trimmed.replace(/^ครูใหญ่\s*/, "");
    if (!rest) return { rank: "ครูใหญ่", cleanName: "" };
    return { rank: "ครูใหญ่", cleanName: rest };
  }
  const ranks = [
    "ว่าที่ พ.ต.อ.หญิง", "ว่าที่ พ.ต.อ.", "ว่าที่ พ.ต.ท.หญิง", "ว่าที่ พ.ต.ท.", "ว่าที่ พ.ต.ต.หญิง", "ว่าที่ พ.ต.ต.",
    "ว่าที่ ร.ต.อ.หญิง", "ว่าที่ ร.ต.อ.", "ว่าที่ ร.ต.ท.หญิง", "ว่าที่ ร.ต.ท.", "ว่าที่ ร.ต.ต.หญิง", "ว่าที่ ร.ต.ต.",
    "พ.ต.อ.หญิง", "พ.ต.อ.", "พ.ต.ท.หญิง", "พ.ต.ท.", "พ.ต.ต.หญิง", "พ.ต.ต.",
    "ร.ต.อ.หญิง", "ร.ต.อ.", "ร.ต.ท.หญิง", "ร.ต.ท.", "ร.ต.ต.หญิง", "ร.ต.ต.",
    "ด.ต.หญิง", "ด.ต.",
    "จ.ส.ต.หญิง", "จ.ส.ต.", "ส.ต.อ.หญิง", "ส.ต.อ.", "ส.ต.ท.หญิง", "ส.ต.ท.", "ส.ต.ต.หญิง", "ส.ต.ต.",
    "นาย", "นางสาว", "นาง", "ครูผู้สอน", "ครู"
  ];

  for (const r of ranks) {
    if (trimmed.startsWith(r)) {
      if (r === "ครู" && trimmed.startsWith("ครูใหญ่")) continue;
      const clean = trimmed.substring(r.length).trim();
      return { rank: r, cleanName: clean };
    }
  }

  return { rank: "", cleanName: trimmed };
};

const getCleanSchoolAbbrev = (schoolName: string): string => {
  if (!schoolName) return "รร.ตชด.";
  let clean = schoolName.trim();
  if (clean.startsWith("โรงเรียนตำรวจตระเวนชายแดน")) {
    clean = clean.replace("โรงเรียนตำรวจตระเวนชายแดน", "รร.ตชด.");
  } else if (clean.startsWith("โรงเรียน")) {
    clean = clean.replace("โรงเรียน", "รร.");
  } else if (!clean.startsWith("รร.ตชด.") && !clean.startsWith("ศกร.ตชด.")) {
    clean = `รร.ตชด.${clean}`;
  }
  return clean;
};

// Helper to split text at parentheses onto second line
const renderWithParenthesesBreak = (text: string) => {
  if (!text) return "";
  if (text.includes("(")) {
    const openIdx = text.indexOf("(");
    const line1 = text.substring(0, openIdx).trim();
    const line2 = text.substring(openIdx).trim();
    return (
      <span className="block text-center">
        <span className="block">{line1}</span>
        <span className="block">{line2}</span>
      </span>
    );
  }
  return text;
};

// Get valid images attached to the report
const getValidImages = (imageUrl?: string, maxPx: number = 1000): string[] => {
  if (!imageUrl) return [];
  const items = imageUrl
    .split(/[\n,;]+|\s+(?=https?:\/\/)/)
    .map((url) => url.trim())
    .filter((url) => {
      if (!url || !url.startsWith("http")) return false;
      return true;
    });

  return items.map((url) => {
    if (url.includes("drive.google.com") || url.includes("lh3.googleusercontent.com")) {
      const match = url.match(/id=([a-zA-Z0-9-_]+)/) || url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}=w${maxPx}`;
      }
    }
    return url;
  });
};

const getGridConfig = (count: number) => {
  switch (count) {
    case 1:
      return { cols: "grid-cols-1 grid-rows-1" };
    case 2:
      return { cols: "grid-cols-2 grid-rows-1" };
    case 3:
      return { cols: "grid-cols-3 grid-rows-1" };
    case 4:
      return { cols: "grid-cols-2 grid-rows-2" };
    case 5:
      return { cols: "grid-cols-6 grid-rows-2" };
    case 6:
      return { cols: "grid-cols-3 grid-rows-2" };
    default:
      return { cols: "grid-cols-2 grid-rows-2" };
  }
};

const getThaiCurrentDateTime = () => {
  const now = new Date();
  const date = toThaiNumerals(String(now.getDate()).padStart(2, "0"));
  const month = toThaiNumerals(String(now.getMonth() + 1).padStart(2, "0"));
  const year = toThaiNumerals(String(now.getFullYear() + 543));
  const hours = toThaiNumerals(String(now.getHours()).padStart(2, "0"));
  const minutes = toThaiNumerals(String(now.getMinutes()).padStart(2, "0"));
  return `${date}/${month}/${year} ${hours}:${minutes} น.`;
};

const formatReportUpdatedDateTime = (lastUpdatedStr?: string, dateStringFallback?: string): string => {
  if (lastUpdatedStr) {
    const match = lastUpdatedStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*(\d{1,2}):(\d{2}))?/);
    if (match) {
      const day = match[1].padStart(2, "0");
      const month = match[2].padStart(2, "0");
      let year = parseInt(match[3], 10);
      if (year < 2400) year += 543;
      const hh = match[4] ? match[4].padStart(2, "0") : "21";
      const mm = match[5] ? match[5].padStart(2, "0") : "50";
      return `รายงานเมื่อ: ${toThaiNumerals(`${day}/${month}/${year}`)} ${toThaiNumerals(`${hh}:${mm}`)} น.`;
    }

    const d = new Date(lastUpdatedStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      let year = d.getFullYear();
      if (year < 2400) year += 543;
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `รายงานเมื่อ: ${toThaiNumerals(`${day}/${month}/${year}`)} ${toThaiNumerals(`${hh}:${mm}`)} น.`;
    }
  }

  if (dateStringFallback) {
    const d = new Date(dateStringFallback);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      let year = d.getFullYear();
      if (year < 2400) year += 543;
      return `รายงานเมื่อ: ${toThaiNumerals(`${day}/${month}/${year}`)} ${toThaiNumerals("21:50")} น.`;
    }
  }

  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear() + 543);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `รายงานเมื่อ: ${toThaiNumerals(`${day}/${month}/${year}`)} ${toThaiNumerals(`${hh}:${mm}`)} น.`;
};

function ReportQRCode({ value }: { value: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(value, {
      margin: 1,
      width: 160,
      color: {
        dark: "#0f172a",
        light: "#ffffff"
      }
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => console.error("QR Code Error:", err));

    return () => {
      isMounted = false;
    };
  }, [value]);

  if (!qrDataUrl) {
    return (
      <div className="w-10 h-10 border border-slate-200 rounded p-0.5 shrink-0 bg-white flex items-center justify-center text-[8px] text-slate-400 font-bold">
        QR
      </div>
    );
  }

  return (
    <img
      src={qrDataUrl}
      alt="QR Code"
      className="border border-slate-200 p-0.5 rounded shrink-0 bg-white object-contain"
      style={{ width: "40.75px", height: "42.75px" }}
    />
  );
}

// Single Printable A4 Paper Sheet Component
interface SingleSheetProps {
  key?: string;
  report: ActivityReport;
  reports?: ActivityReport[];
  pageIndex: number;
  totalPages: number;
  isSelected: boolean;
  onSelectReport: (id: string) => void;
  onEditReport: (report: ActivityReport) => void;
  onUpdateReport?: (report: ActivityReport) => void;
  isBatchSelected?: boolean;
  onToggleBatchSelect?: (id: string) => void;
  onOpenBatchExport?: (options?: {
    initialSelectedIds?: string[];
    initialSchoolFilter?: string;
    initialGoalFilter?: string;
    initialFormat?: "zip-pdf" | "zip-png" | "combined-pdf";
  }) => void;
  selectedBatchIds?: string[];
  batchSelectedCount?: number;
}

function SingleA4PaperSheet({
  report,
  reports = [],
  pageIndex,
  totalPages,
  isSelected,
  onSelectReport,
  onEditReport,
  onUpdateReport,
  isBatchSelected = false,
  onToggleBatchSelect,
  onOpenBatchExport,
  selectedBatchIds = [],
  batchSelectedCount = 0,
}: SingleSheetProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(() => {
    if (typeof window !== "undefined") {
      const w = window.innerWidth;
      const isTabletUA = (/iPad|Android|Tablet/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent)) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isTablet = (w >= 640 && w < 1280) || isTabletUA;
      if (isTablet) return 0.85;
      if (w < 640) return Number((Math.max(240, w - 24) / 794).toFixed(3));
    }
    return 0.95;
  });
  const [isExporting, setIsExporting] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<{
    isDownloading: boolean;
    type: "PNG" | "PDF";
    progress: number;
    stepMessage: string;
    isSuccess: boolean;
  }>({
    isDownloading: false,
    type: "PDF",
    progress: 0,
    stepMessage: "",
    isSuccess: false,
  });
  const [selectedRating, setSelectedRating] = useState<"ดีเยี่ยม" | "ดี" | "พอใช้" | null>("ดีเยี่ยม");
  const [teacherModalData, setTeacherModalData] = useState<{
    type: 'principal' | 'reporter';
    name: string;
    position: string;
    school: string;
  } | null>(null);
  const [copiedTeacherName, setCopiedTeacherName] = useState(false);

  const [exportStatePDF, setExportStatePDF] = useState<"idle" | "exporting" | "success">("idle");
  const [exportStatePNG, setExportStatePNG] = useState<"idle" | "exporting" | "success">("idle");
  const [exportStatePrint, setExportStatePrint] = useState<"idle" | "exporting" | "success">("idle");
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printPreviewImg, setPrintPreviewImg] = useState<string | null>(null);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [isPrintTipDismissed, setIsPrintTipDismissed] = useState(false);

  // Keyboard shortcut for Escape key and page navigation when print preview is open
  useEffect(() => {
    if (!isPrintPreviewOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPrintPreviewOpen(false);
      } else if (e.key === "ArrowLeft" && pageIndex > 0) {
        if (reports && reports[pageIndex - 1]) {
          onSelectReport(reports[pageIndex - 1].id);
        }
      } else if (e.key === "ArrowRight" && pageIndex < totalPages - 1) {
        if (reports && reports[pageIndex + 1]) {
          onSelectReport(reports[pageIndex + 1].id);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPrintPreviewOpen, pageIndex, totalPages, reports, onSelectReport]);

  // Continuously refresh print preview render whenever the selected report page changes
  useEffect(() => {
    if (!isPrintPreviewOpen) return;
    let isCancelled = false;
    const updatePreviewForSelectedPage = async () => {
      setIsPreparingPrint(true);
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (isCancelled) return;
      const element = documentRef.current;
      if (!element) {
        setIsPreparingPrint(false);
        return;
      }
      try {
        await waitForImages(element);
        const canvas = await safeHtml2Canvas(element, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
        });
        if (!isCancelled) {
          const previewDataUrl = canvas.toDataURL("image/png");
          setPrintPreviewImg(previewDataUrl);
        }
      } catch (err) {
        console.error("Failed to render preview for selected page:", err);
      } finally {
        if (!isCancelled) {
          setIsPreparingPrint(false);
        }
      }
    };
    updatePreviewForSelectedPage();
    return () => {
      isCancelled = true;
    };
  }, [report.id, isPrintPreviewOpen]);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [useAiSummary, setUseAiSummary] = useState(false);

  // Executive Comment & Digital Signature States
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);
  const [sigTarget, setSigTarget] = useState<"approver" | "reporter" | null>(null);

  const [localComment, setLocalComment] = useState<string>(report.executiveComment || "");
  const [localApproverSig, setLocalApproverSig] = useState<string>(report.approverSignatureUrl || "");
  const [localReporterSig, setLocalReporterSig] = useState<string>(report.reporterSignatureUrl || "");

  const [approverSigTransform, setApproverSigTransform] = useState<{ x: number; y: number; scale: number }>({ x: 0, y: 0, scale: 1 });
  const [reporterSigTransform, setReporterSigTransform] = useState<{ x: number; y: number; scale: number }>({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    setLocalComment(report.executiveComment || "");
    setLocalApproverSig(report.approverSignatureUrl || "");
    setLocalReporterSig(report.reporterSignatureUrl || "");
  }, [report.executiveComment, report.approverSignatureUrl, report.reporterSignatureUrl, report.id]);

  const handleSaveExecutiveComment = (newComment: string) => {
    setLocalComment(newComment);
    const updated = { ...report, executiveComment: newComment };
    if (onUpdateReport) {
      onUpdateReport(updated);
    }
  };

  const handleSaveDigitalSignature = (sigUrl: string) => {
    if (sigTarget === "approver") {
      setLocalApproverSig(sigUrl);
      const updated = { ...report, approverSignatureUrl: sigUrl };
      if (onUpdateReport) onUpdateReport(updated);
    } else if (sigTarget === "reporter") {
      setLocalReporterSig(sigUrl);
      const updated = { ...report, reporterSignatureUrl: sigUrl };
      if (onUpdateReport) onUpdateReport(updated);
    }
  };

  const cleanDetails = (report.details && report.details.trim() !== "-" && report.details.trim() !== "")
    ? report.details.trim()
    : "";
  const rawDetailsText = cleanDetails || `การดำเนินกิจกรรม ${report.activityName || "พัฒนาเด็กและเยาวชน"} ในพื้นที่โรงเรียน เพื่อส่งเสริมพัฒนาการและการเรียนรู้ของนักเรียน`;

  // Client-Side Deterministic Extractive Condenser (Preserves 100% Original Text Facts)
  const condenseThaiDetailsExtractiveClient = (text: string, maxChars = 220): string => {
    if (!text) return "ดำเนินกิจกรรมพัฒนาเด็กและเยาวชนตามแผนงาน";
    const cleaned = text
      .replace(/\r\n/g, "\n")
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length <= maxChars) return cleaned;

    const clauses = cleaned.split(/(?<=[.!?])\s+|(?<=\s[๑-๙1-9]\.\s)|(?=\s*๒\.\s*)|(?=\s*2\.\s*)|(?=\s*๓\.\s*)|(?=\s*3\.\s*)|(?<=\s*;\s*)/);
    let accumulated = "";
    for (const clause of clauses) {
      const trimmed = clause.trim();
      if (!trimmed) continue;
      if ((accumulated + (accumulated ? " " : "") + trimmed).length <= maxChars) {
        accumulated += (accumulated ? " " : "") + trimmed;
      } else {
        break;
      }
    }
    return accumulated || cleaned.slice(0, maxChars).trim();
  };

  // Load cached AI summary if available for this report
  useEffect(() => {
    if (!report?.id) return;
    const cacheKey = `ai_summary_faithful_${report.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setAiSummary(cached);
    } else {
      setAiSummary(null);
      setUseAiSummary(false);
    }
  }, [report?.id, report?.details]);

  const handleAiSummarizeDetails = async (forceRegenerate = false) => {
    if (!rawDetailsText.trim()) return;

    if (aiSummary && !forceRegenerate) {
      setUseAiSummary((prev) => !prev);
      return;
    }

    setIsSummarizing(true);
    try {
      const res = await fetch("/api/gemini/summarize-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: rawDetailsText,
          activityName: report.activityName,
          schoolName: report.schoolName,
          goalName: currentGoal?.title || report.goalCode,
          targetLength: "standard"
        })
      });

      if (res.ok) {
        const data = await res.json();
        const resultText = (data.result || data.draft || "").trim();
        if (resultText) {
          const cacheKey = `ai_summary_faithful_${report.id}`;
          sessionStorage.setItem(cacheKey, resultText);
          setAiSummary(resultText);
          setUseAiSummary(true);
          return;
        }
      }
    } catch (err) {
      console.warn("AI Faithful Summarization endpoint error, using smart extractive fallback:", err);
    } finally {
      setIsSummarizing(false);
    }

    // Deterministic Extractive Fallback (Guaranteed to be 100% faithful from original text)
    const fallback = condenseThaiDetailsExtractiveClient(rawDetailsText, 200);
    const cacheKey = `ai_summary_faithful_${report.id}`;
    sessionStorage.setItem(cacheKey, fallback);
    setAiSummary(fallback);
    setUseAiSummary(true);
  };

  const lastCalculatedWidthRef = useRef<number>(0);
  const lastScaleRef = useRef<number>(scale);
  const rafScaleIdRef = useRef<number | null>(null);

  useEffect(() => {
    const calculateScale = () => {
      // Observe the parent wrapper or viewport rather than self to prevent feedback loop
      const container = containerRef.current?.parentElement || containerRef.current;
      if (!container) return;
      let containerWidth = container.clientWidth;
      
      // Resilient fallback for zero-width on initial render, offscreen, or unmounted tabs
      if (containerWidth <= 0) {
        containerWidth = typeof window !== "undefined" ? window.innerWidth : 800;
      }

      // Ignore trivial sub-pixel adjustments (< 8px) to completely prevent layout oscillation loops on iPad
      if (Math.abs(containerWidth - lastCalculatedWidthRef.current) < 8 && lastCalculatedWidthRef.current > 0) {
        return;
      }
      lastCalculatedWidthRef.current = containerWidth;
      
      const width = typeof window !== "undefined" ? window.innerWidth : containerWidth;
      const isTabletUA = typeof navigator !== "undefined" && (
        (/iPad|Android|Tablet/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent)) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      );
      const isTabletScreen = (width >= 640 && width < 1280) || (containerWidth >= 600 && containerWidth < 1200);
      const isTablet = isTabletScreen || isTabletUA;

      let finalScale: number;
      if (isTablet) {
        // ในมุมมองแท็บเล็ต: ตั้งค่าการซูมหน้ากระดาษเป็น 85% (0.85) ตามคำสั่งของผู้ใช้งาน
        finalScale = 0.85;
      } else {
        // Subtract appropriate responsive padding to prevent document from touching the container edge
        const padding = containerWidth >= 1024 ? 48 : (containerWidth >= 768 ? 32 : 24);
        const availableWidth = Math.max(240, containerWidth - padding);
        
        // Calculate fit scale to ensure the 794px width A4 sheet fits the viewport beautifully
        const fitScale = Number((availableWidth / 794).toFixed(3));
        
        // Cap base scale at 0.95 to match the original PC template layout on wide viewports, while supporting scaling down to 0.15
        finalScale = Math.min(0.95, Math.max(0.15, fitScale));
      }
      
      if (Math.abs(finalScale - lastScaleRef.current) >= 0.015 || lastScaleRef.current === 0) {
        lastScaleRef.current = finalScale;
        setScale(finalScale);
      }
    };

    const handleResizeThrottled = () => {
      if (rafScaleIdRef.current) {
        cancelAnimationFrame(rafScaleIdRef.current);
      }
      rafScaleIdRef.current = requestAnimationFrame(() => {
        calculateScale();
      });
    };

    calculateScale();

    // Observe parent element to prevent self-observing size loop
    const targetElement = containerRef.current?.parentElement || containerRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (targetElement && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleResizeThrottled);
      resizeObserver.observe(targetElement);
    }
    window.addEventListener("resize", handleResizeThrottled, { passive: true });

    return () => {
      if (rafScaleIdRef.current) {
        cancelAnimationFrame(rafScaleIdRef.current);
      }
      window.removeEventListener("resize", handleResizeThrottled);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [report]);

  const currentGoal = KOPODOT_GOALS.find((g) => g.id === getGoalIdFromCode(report.goalCode));

  // Compute single primary indicator from data source using intelligent mapping
  const primaryIndicator = useMemo(() => {
    return findIndicatorForReport(report, currentGoal?.id);
  }, [report, currentGoal?.id]);

  const goalsContext = useMemo(() => {
    return getGoalsContext(report.goalCode, primaryIndicator, report.activityName);
  }, [report.goalCode, primaryIndicator, report.activityName]);

  const rawApprover = report.approverName && !["ครูใหญ่", "ผู้บังคับบัญชา", "ครูใหญ่โรงเรียนตำรวจตระเวนชายแดน"].includes(report.approverName.trim()) 
    ? report.approverName.trim() 
    : (report.reportedBy && !["ครูใหญ่", "ครูผู้ดูแลเด็ก", "ครูผู้สอน", "ครูทำหน้าที่ครูใหญ่", "ผู้บังคับบัญชา"].includes(report.reportedBy.trim()) ? report.reportedBy.trim() : "");
  const mappedPrincipal = getPrincipalBySchoolName(report.schoolName);
  const effectiveApproverName = (mappedPrincipal && mappedPrincipal !== "ไม่ระบุชื่อครูใหญ่")
    ? mappedPrincipal
    : (rawApprover && rawApprover !== "พ.ต.ท.หญิง ปวีณา ทาระวิมล" ? rawApprover : "ไม่ระบุชื่อครูใหญ่");

  const { rank: approverRank, cleanName: approverCleanName } = parseNameAndRank(effectiveApproverName);
  const { rank: reporterRank, cleanName: reporterCleanName } = parseNameAndRank(report.reportedBy);

  const matchSchool = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(report.schoolName, s.name));
  const exactSchoolName = matchSchool ? matchSchool.name : report.schoolName;
  const cleanSchool = getCleanSchoolAbbrev(exactSchoolName);

  let rawPos = report.approverPosition ? report.approverPosition.replace(/^ตำแหน่ง\s*/, "").trim() : "";
  let formattedApproverPosition = `ครูใหญ่ ${cleanSchool}`;

  if (
    rawPos &&
    !["ครูใหญ่", "ผู้อำนวยการ", "ผู้กำกับการ", "ครูใหญ่โรงเรียน"].includes(rawPos) &&
    !rawPos.includes("ผู้กำกับการ") &&
    (rawPos.startsWith("ครูใหญ่ ") || rawPos.startsWith("ผู้อำนวยการ "))
  ) {
    formattedApproverPosition = rawPos;
  }

  const photoSlots = getValidImages(report.imageUrl);
  let displayPhotos = photoSlots.slice(0, 6);
  // หากมีภาพอัปโหลดเข้ามา 3 ภาพ ให้ตัดออก 1 ภาพ และแสดงเพียง 2 ภาพ
  if (displayPhotos.length === 3) {
    displayPhotos = displayPhotos.slice(0, 2);
  }
  const gridConfig = getGridConfig(displayPhotos.length);

  const cleanProjectName = (report.projectName || "")
    .replace(/แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร\s*\(กพด\.\)?/g, "")
    .replace(/แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร/g, "")
    .replace(/โครงการหลักตามแผน กพด\./g, "")
    .replace(/\(กพด\.\)/g, "")
    .trim();

  const displayActivityTitle = cleanProjectName && cleanProjectName !== report.activityName
    ? `${cleanProjectName} ${report.activityName}`
    : report.activityName;

  const [zoomFactor, setZoomFactor] = useState(1.0);
  const [focalMode, setFocalMode] = useState<"face" | "top" | "center">("face");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Lightbox Fullscreen Photo Preview State
  const [lightboxImageIndex, setLightboxImageIndex] = useState<number | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [lightboxRotate, setLightboxRotate] = useState<number>(0);

  // Keyboard navigation for Lightbox (Esc, Left, Right arrows)
  useEffect(() => {
    if (lightboxImageIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxImageIndex(null);
      } else if (e.key === "ArrowLeft") {
        setLightboxImageIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : displayPhotos.length - 1));
        setLightboxZoom(1);
        setLightboxRotate(0);
      } else if (e.key === "ArrowRight") {
        setLightboxImageIndex((prev) => (prev !== null && prev < displayPhotos.length - 1 ? prev + 1 : 0));
        setLightboxZoom(1);
        setLightboxRotate(0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxImageIndex, displayPhotos.length]);

  // Lock body & main container scroll when Lightbox is active to prevent background scrolling
  useEffect(() => {
    const mainEl = document.querySelector("main");
    const preventDefault = (e: Event) => {
      // Only prevent if within the modal to block background rubber-banding
      e.preventDefault();
    };

    if (lightboxImageIndex !== null) {
      document.body.style.overflow = "hidden";
      if (mainEl) {
        mainEl.style.overflow = "hidden";
      }
      // Disable touch swipe scroll on mobile devices while lightbox is active
      document.addEventListener("touchmove", preventDefault, { passive: false });
    } else {
      document.body.style.overflow = "";
      if (mainEl) {
        mainEl.style.overflow = "";
      }
    }

    return () => {
      document.body.style.overflow = "";
      if (mainEl) {
        mainEl.style.overflow = "";
      }
      document.removeEventListener("touchmove", preventDefault);
    };
  }, [lightboxImageIndex]);

  // Mini Calendar Filter State
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const [calendarViewYear, setCalendarViewYear] = useState<number>(() => {
    if (report) {
      const dt = parseReportDateDetails(report);
      if (dt && !isNaN(dt.yearCE)) {
        return dt.yearCE;
      }
    }
    return 2026;
  });

  const [calendarViewMonth, setCalendarViewMonth] = useState<number>(() => {
    if (report) {
      const dt = parseReportDateDetails(report);
      if (dt && !isNaN(dt.month)) {
        return dt.month - 1;
      }
    }
    return 6; // July
  });

  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string | null>(null);

  // Sync calendar view when active report changes
  useEffect(() => {
    if (report) {
      const dt = parseReportDateDetails(report);
      if (dt && !isNaN(dt.yearCE) && !isNaN(dt.month)) {
        setCalendarViewYear(dt.yearCE);
        setCalendarViewMonth(dt.month - 1);
      }
    }
  }, [report]);

  // Close calendar popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCalendarOpen]);

  // Map dates to reports
  const reportDatesMap = useMemo(() => {
    const map: Record<string, ActivityReport[]> = {};
    if (!reports) return map;
    reports.forEach((r) => {
      const dt = parseReportDateDetails(r);
      if (dt && !isNaN(dt.yearCE) && !isNaN(dt.month) && !isNaN(dt.day)) {
        const key = `${dt.yearCE}-${String(dt.month).padStart(2, "0")}-${String(dt.day).padStart(2, "0")}`;
        if (!map[key]) map[key] = [];
        map[key].push(r);
      }
    });
    return map;
  }, [reports]);

  // Formatted details of current report's date
  const currentReportDateDetails = useMemo(() => {
    if (!report) return null;
    const dt = parseReportDateDetails(report);
    if (!dt || isNaN(dt.yearCE) || isNaN(dt.month) || isNaN(dt.day)) return null;
    return {
      yearAD: dt.yearCE,
      yearBE: dt.yearBE,
      month: dt.month,
      day: dt.day,
      dateKey: `${dt.yearCE}-${String(dt.month).padStart(2, "0")}-${String(dt.day).padStart(2, "0")}`
    };
  }, [report]);

  // Days grid for the mini month calendar
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(calendarViewYear, calendarViewMonth, 1).getDay();
    const totalDays = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();

    const cells: ({ day: number; dateKey: string } | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateKey = `${calendarViewYear}-${String(calendarViewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, dateKey });
    }
    return cells;
  }, [calendarViewYear, calendarViewMonth]);

  // Reports matching currently selected date
  const activeDateReports = useMemo(() => {
    if (!selectedCalendarDateKey) return [];
    return reportDatesMap[selectedCalendarDateKey] || [];
  }, [selectedCalendarDateKey, reportDatesMap]);

  // State for free drag/positioning of images
  const [imageOffsets, setImageOffsets] = useState<{
    [key: number]: { x: number; y: number; zoom: number };
  }>({});
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [initialDragOffset, setInitialDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleImageMouseDown = (e: React.MouseEvent, imgIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDragIndex(imgIdx);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    const current = imageOffsets[imgIdx] || { x: 0, y: 0, zoom: 1 };
    setInitialDragOffset({ x: current.x, y: current.y });
  };

  const handleImageTouchStart = (e: React.TouchEvent, imgIdx: number) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setActiveDragIndex(imgIdx);
      setDragStartPos({ x: touch.clientX, y: touch.clientY });
      const current = imageOffsets[imgIdx] || { x: 0, y: 0, zoom: 1 };
      setInitialDragOffset({ x: current.x, y: current.y });
    }
  };

  useEffect(() => {
    if (activeDragIndex === null || !dragStartPos) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartPos.x;
      const deltaY = e.clientY - dragStartPos.y;
      setImageOffsets((prev) => {
        const current = prev[activeDragIndex] || { x: 0, y: 0, zoom: 1 };
        return {
          ...prev,
          [activeDragIndex]: {
            ...current,
            x: initialDragOffset.x + deltaX,
            y: initialDragOffset.y + deltaY,
          },
        };
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - dragStartPos.x;
        const deltaY = touch.clientY - dragStartPos.y;
        setImageOffsets((prev) => {
          const current = prev[activeDragIndex] || { x: 0, y: 0, zoom: 1 };
          return {
            ...prev,
            [activeDragIndex]: {
              ...current,
              x: initialDragOffset.x + deltaX,
              y: initialDragOffset.y + deltaY,
            },
          };
        });
      }
    };

    const handleDragEnd = () => {
      setActiveDragIndex(null);
      setDragStartPos(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleDragEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [activeDragIndex, dragStartPos, initialDragOffset]);

  const handleImageZoom = (imgIdx: number, delta: number) => {
    setImageOffsets((prev) => {
      const current = prev[imgIdx] || { x: 0, y: 0, zoom: 1 };
      const nextZoom = Math.max(0.6, Math.min(3.5, Number((current.zoom + delta).toFixed(2))));
      return {
        ...prev,
        [imgIdx]: { ...current, zoom: nextZoom },
      };
    });
  };

  const resetSingleImageOffset = (imgIdx: number) => {
    setImageOffsets((prev) => {
      const next = { ...prev };
      delete next[imgIdx];
      return next;
    });
  };

  const resetAllImageOffsets = () => {
    setImageOffsets({});
  };

  const hasModifiedImages = Object.keys(imageOffsets).length > 0;

  const waitForImages = async (element: HTMLElement) => {
    const images = Array.from(element.querySelectorAll("img"));
    const promises = images.map((img) => {
      if (img.complete) {
        if (img.decode) {
          return img.decode().catch(() => {});
        }
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        img.onload = () => {
          if (img.decode) {
            img.decode().then(resolve).catch(() => resolve());
          } else {
            resolve();
          }
        };
        img.onerror = () => resolve();
      });
    });
    await Promise.all(promises);
  };

  const handleExportImage = async () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    setIsExporting(true);
    setExportStatePNG("exporting");
    setDownloadStatus({
      isDownloading: true,
      type: "PNG",
      progress: 20,
      stepMessage: `กำลังจัดเตรียมหน้าเอกสารมาตรฐาน A4 หน้า ${pageIndex + 1}...`,
      isSuccess: false,
    });

    // Allow state and scale transition to settle for crisp snapshot
    if (document.fonts?.ready) {
      try { await document.fonts.ready; } catch { /* ignore */ }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const isMobile = isMobileOrTablet();
      setDownloadStatus((prev) => ({
        ...prev,
        progress: 50,
        stepMessage: isMobile
          ? `กำลังประมวลผลเรนเดอร์ภาพมาตรฐานกระดาษ A4 สำหรับ iPad/สมาร์ทโฟน...`
          : `กำลังประมวลผลเรนเดอร์ภาพมาตรฐานกระดาษ A4 (กว้าง 210 มม. × สูง 297 มม.)...`,
      }));

      const element = documentRef.current;
      if (!element) {
        console.error("Export PNG failed: documentRef element is missing");
        alert("ไม่พบเอกสารสำหรับส่งออกรูปภาพ");
        setExportStatePNG("idle");
        return;
      }

      // Wait for all images to be loaded & decoded before snapshotting
      await waitForImages(element);

      // Adaptive scale: 2.0 on mobile/iPad to prevent WebKit canvas memory crash, 2.5 on desktop for high-DPI crispness
      const adaptiveScale = getAdaptiveCanvasScale(2.5);

      // Render naturally using the exact same visual layout and proportions as print preview
      const renderedCanvas = await safeHtml2Canvas(element, {
        scale: adaptiveScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
        onclone: (clonedDoc) => {
          clonedDoc.documentElement.style.fontSize = "16px";
          clonedDoc.body.style.fontSize = "16px";
        },
      });

      setDownloadStatus((prev) => ({
        ...prev,
        progress: 85,
        stepMessage: `กำลังแปลงและจัดเตรียมไฟล์รูปภาพความละเอียดสูง...`,
      }));

      const finalCanvas = renderedCanvas;

      setDownloadStatus((prev) => ({
        ...prev,
        progress: 90,
        stepMessage: isMobile 
          ? `กำลังเตรียมบันทึก/แชร์รูปภาพสำหรับ iPad / สมาร์ทโฟน...` 
          : `กำลังบันทึกไฟล์รูปภาพมาตรฐาน A4 ลงเครื่อง...`,
      }));

      const rawFileName = `รายงานกพด5_${report.id}_${(report.activityName || "เอกสาร").substring(0, 25)}.png`;
      const fileName = sanitizeWindowsFilename(rawFileName, `report_${report.id}.png`);

      // Optimized for iPadOS/iOS Safari, Android, Windows, and cross-platform browsers
      if (finalCanvas.toBlob) {
        await new Promise<void>((resolve) => {
          finalCanvas.toBlob(async (blob) => {
            if (blob) {
              await triggerCrossPlatformDownload(blob, fileName, {
                mimeType: "image/png",
                title: fileName,
              });
            } else {
              const dataUrl = finalCanvas.toDataURL("image/png");
              await triggerCrossPlatformDownload(dataUrl, fileName, {
                mimeType: "image/png",
                title: fileName,
              });
            }
            resolve();
          }, "image/png");
        });
      } else {
        const dataUrl = finalCanvas.toDataURL("image/png");
        await triggerCrossPlatformDownload(dataUrl, fileName, {
          mimeType: "image/png",
          title: fileName,
        });

        // Release canvas bitmap memory
        finalCanvas.width = 1;
        finalCanvas.height = 1;
        if (renderedCanvas && renderedCanvas !== finalCanvas) {
          renderedCanvas.width = 1;
          renderedCanvas.height = 1;
        }
      }

      setDownloadStatus((prev) => ({
        ...prev,
        progress: 100,
        stepMessage: isMobile
          ? `ส่งออกภาพสำเร็จ! (สามารถบันทึกไปยัง "รูปภาพ" หรือแชร์ได้)`
          : `ดาวน์โหลดภาพขนาดมาตรฐาน A4 (210 × 297 มม.) สำเร็จเรียบร้อย!`,
        isSuccess: true,
      }));
      setExportStatePNG("success");
      setTimeout(() => {
        setExportStatePNG("idle");
      }, 3500);
    } catch (error) {
      console.error("Export PNG failed:", error);
      setDownloadStatus((prev) => ({
        ...prev,
        progress: 100,
        stepMessage: `เกิดข้อผิดพลาดในการดาวน์โหลดรูปภาพ`,
        isSuccess: false,
      }));
      setExportStatePNG("idle");
      alert("เกิดข้อผิดพลาดในการส่งออกเป็นรูปภาพ");
    } finally {
      setIsExporting(false);
      setTimeout(() => {
        setDownloadStatus((prev) => ({ ...prev, isDownloading: false }));
      }, 3000);
    }
  };

  const handleExportPDF = async () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    setIsExporting(true);
    setExportStatePDF("exporting");
    setDownloadStatus({
      isDownloading: true,
      type: "PDF",
      progress: 20,
      stepMessage: `กำลังจัดเตรียมหน้าเอกสาร A4 หน้า ${pageIndex + 1}...`,
      isSuccess: false,
    });

    if (document.fonts?.ready) {
      try { await document.fonts.ready; } catch { /* ignore */ }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const isMobile = isMobileOrTablet();
      setDownloadStatus((prev) => ({
        ...prev,
        progress: 55,
        stepMessage: isMobile
          ? `กำลังประมวลผลเรนเดอร์ PDF สำหรับ iPad / สมาร์ทโฟน...`
          : `กำลังประมวลผลเรนเดอร์ไฟล์ PDF ความละเอียดสูง...`,
      }));

      const element = documentRef.current;
      if (!element) {
        console.error("Export PDF failed: documentRef element is missing");
        alert("ไม่พบเอกสารสำหรับส่งออก PDF");
        setExportStatePDF("idle");
        return;
      }

      // Wait for all images to be loaded & decoded before snapshotting
      await waitForImages(element);

      // Adaptive scale: 2.0 on iPad/mobile to prevent GPU memory crashes, 2.5 on desktop
      const adaptiveScale = getAdaptiveCanvasScale(2.5);

      const canvas = await safeHtml2Canvas(element, {
        scale: adaptiveScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
        onclone: (clonedDoc) => {
          clonedDoc.documentElement.style.fontSize = "16px";
          clonedDoc.body.style.fontSize = "16px";
        },
      });

      setDownloadStatus((prev) => ({
        ...prev,
        progress: 85,
        stepMessage: `กำลังสร้างโครงสร้างไฟล์ PDF มาตรฐาน A4 (210 × 297 มม.)...`,
      }));

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      
      // Release canvas bitmap memory immediately to free GPU memory
      canvas.width = 1;
      canvas.height = 1;

      const rawPdfName = `รายงานกพด5_${report.id}_${(report.activityName || "เอกสาร").substring(0, 25)}.pdf`;
      const pdfFileName = sanitizeWindowsFilename(rawPdfName, `report_${report.id}.pdf`);
      
      setDownloadStatus((prev) => ({
        ...prev,
        progress: 95,
        stepMessage: isMobile 
          ? `กำลังเตรียมบันทึก/แชร์ไฟล์ PDF ลงในเครื่อง...` 
          : `กำลังบันทึกไฟล์ PDF ลงเครื่อง...`,
      }));

      const pdfBlob = pdf.output("blob");
      await triggerCrossPlatformDownload(pdfBlob, pdfFileName, {
        mimeType: "application/pdf",
        title: pdfFileName,
      });

      setDownloadStatus((prev) => ({
        ...prev,
        progress: 100,
        stepMessage: isMobile
          ? `ส่งออก PDF สำเร็จ! (สามารถเลือก "บันทึกไปยัง 'ไฟล์'" หรือแชร์ได้)`
          : `ดาวน์โหลดหน้า ${pageIndex + 1} เป็นไฟล์ PDF สำเร็จเรียบร้อย!`,
        isSuccess: true,
      }));
      setExportStatePDF("success");
      setTimeout(() => {
        setExportStatePDF("idle");
      }, 3500);
    } catch (error) {
      console.error("Export PDF failed:", error);
      setDownloadStatus((prev) => ({
        ...prev,
        progress: 100,
        stepMessage: `เกิดข้อผิดพลาดในการดาวน์โหลด PDF`,
        isSuccess: false,
      }));
      setExportStatePDF("idle");
      alert("เกิดข้อผิดพลาดในการส่งออกเป็นไฟล์ PDF");
    } finally {
      setIsExporting(false);
      setTimeout(() => {
        setDownloadStatus((prev) => ({ ...prev, isDownloading: false }));
      }, 3000);
    }
  };

  const handlePrint = async () => {
    onSelectReport(report.id);
    if (isCollapsed) {
      setIsCollapsed(false);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Open Print Preview Modal immediately for instant visual response
    setIsPrintPreviewOpen(true);
    setIsPreparingPrint(true);
    setExportStatePrint("exporting");
    setDownloadStatus({
      isDownloading: true,
      type: "PDF",
      progress: 25,
      stepMessage: `กำลังจัดเตรียมตัวอย่างพิมพ์ A4 หน้า ${pageIndex + 1}...`,
      isSuccess: false,
    });

    if (document.fonts?.ready) {
      try { await document.fonts.ready; } catch { /* ignore */ }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      setDownloadStatus((prev) => ({
        ...prev,
        progress: 60,
        stepMessage: `กำลังประมวลผลเรนเดอร์ตัวอย่างพิมพ์ความคมชัดสูง...`,
      }));

      const element = documentRef.current;
      if (!element) {
        setIsPreparingPrint(false);
        setExportStatePrint("idle");
        return;
      }

      await waitForImages(element);

      const canvas = await safeHtml2Canvas(element, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 794,
        height: 1123,
        windowWidth: 1440,
        windowHeight: 1200,
        onclone: (clonedDoc) => {
          clonedDoc.documentElement.style.fontSize = "17.5px";
          clonedDoc.body.style.fontSize = "17.5px";
        },
      });

      const previewDataUrl = canvas.toDataURL("image/png");
      setPrintPreviewImg(previewDataUrl);
      setExportStatePrint("idle");
      setDownloadStatus((prev) => ({
        ...prev,
        progress: 100,
        stepMessage: `เตรียมตัวอย่างก่อนพิมพ์เรียบร้อย`,
        isSuccess: true,
      }));
    } catch (err) {
      console.error("Print preview generation failed:", err);
      setExportStatePrint("idle");
    } finally {
      setIsPreparingPrint(false);
      setTimeout(() => {
        setDownloadStatus((prev) => ({ ...prev, isDownloading: false }));
      }, 1500);
    }
  };

  const handleExecutePrint = () => {
    setIsPrintPreviewOpen(false);
    setExportStatePrint("exporting");
    setTimeout(() => {
      window.print();
      setExportStatePrint("success");
      setTimeout(() => {
        setExportStatePrint("idle");
      }, 3000);
    }, 250);
  };

  const currentScale = isExporting ? 1 : scale * zoomFactor;

  return (
    <div 
      id={`report-sheet-${report.id}`}
      ref={containerRef} 
      className="w-full flex flex-col items-center justify-center transition-all duration-300"
    >
      {/* Wrapper Card for Page Badge & A4 Sheet */}
      <div 
        className="w-full transition-all duration-200 mx-auto flex flex-col items-center"
        style={{
          maxWidth: `${Math.max(794, Math.round(794 * currentScale))}px`
        }}
      >
        {/* Page Badge Header */}
        <div 
          className="w-full bg-slate-100/90 text-slate-800 border border-slate-300/90 text-xs px-3 sm:px-4 py-2.5 rounded-t-2xl flex flex-col gap-2 shadow-2xs no-print transition-all"
        >
          {/* Row 1: Document Identification & Name & Real-time status */}
          <div className="flex items-center justify-between gap-2 min-w-0 w-full">
            <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
              <span className="bg-blue-600 text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded-md shadow-2xs shrink-0">
                หน้า {pageIndex + 1} / {totalPages}
              </span>
              <span className="text-slate-400 font-normal select-none hidden sm:inline">|</span>
              <span className="text-slate-500 font-semibold text-[11px] hidden sm:inline">ID:</span>
              <span className="text-indigo-950 font-mono font-extrabold text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200/90 shadow-2xs shrink-0">
                {report.id}
              </span>

              {/* Real-time Status Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300/80 shadow-2xs shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{pageIndex === 0 ? "รายงานล่าสุด" : "สถานะพร้อมพิมพ์"}</span>
              </span>

              <span className="text-slate-800 truncate text-xs sm:text-sm font-bold min-w-0" title={report.activityName}>
                {report.activityName}
              </span>
            </div>

            {/* Selection indicator on the right of Row 1 */}
            <div className="shrink-0">
              {!isSelected ? (
                <button
                  type="button"
                  onClick={() => onSelectReport(report.id)}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-extrabold px-2.5 h-7.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer text-xs whitespace-nowrap shadow-2xs"
                  title="เลือกเอกสารนี้"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="whitespace-nowrap">เลือกเอกสารนี้</span>
                </button>
              ) : (
                <span className="bg-emerald-600 text-white font-extrabold px-2.5 h-7.5 rounded-lg flex items-center justify-center gap-1 text-xs whitespace-nowrap shadow-2xs" title="กำลังดูเอกสารนี้อยู่">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">กำลังดูอยู่</span>
                </span>
              )}
            </div>
          </div>

          {/* Row 2: Action Toolbar & Zoom Controls */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/80 w-full min-w-0 flex-wrap sm:flex-nowrap">
            {/* Size Control Pill Box matching uploaded screenshot */}
            <div className="flex items-center gap-1 bg-white px-2 h-8 rounded-xl border border-slate-300 text-slate-700 shadow-2xs shrink-0 select-none">
              <span className="text-xs font-extrabold text-slate-700 whitespace-nowrap">ขนาด:</span>

              <button
                type="button"
                onClick={() => setZoomFactor((prev) => Math.max(0.4, +(prev - 0.05).toFixed(2)))}
                title="ลดขนาดเอกสาร"
                className="p-0.5 text-slate-400 hover:text-indigo-600 transition cursor-pointer active:scale-90"
              >
                <MinusCircle className="w-4 h-4" />
              </button>

              <span className="font-mono text-xs sm:text-sm font-black text-indigo-600 min-w-[32px] text-center whitespace-nowrap">
                {Math.round(currentScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomFactor((prev) => Math.min(2.0, +(prev + 0.05).toFixed(2)))}
                title="เพิ่มขนาดเอกสาร"
                className="p-0.5 text-slate-400 hover:text-indigo-600 transition cursor-pointer active:scale-90"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Actions Toolbar */}
            <div className="flex items-center gap-1.5 text-[11px] shrink-0">
              {/* Button 1: Export PDF */}
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isExporting || exportStatePDF === "exporting"}
                className={`font-black px-2.5 sm:px-3 h-8 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs text-xs whitespace-nowrap shrink-0 ${
                  exportStatePDF === "success"
                    ? "bg-emerald-600 text-white border border-emerald-500"
                    : "bg-rose-600 hover:bg-rose-700 active:scale-95 text-white"
                }`}
                title="ส่งออกเอกสารเป็นไฟล์ PDF"
              >
                {exportStatePDF === "exporting" || (isExporting && downloadStatus.type === "PDF" && !downloadStatus.isSuccess) ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-rose-100 animate-spin shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">กำลังส่งออก...</span>
                  </>
                ) : exportStatePDF === "success" ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">ส่งออกสำเร็จ</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-rose-100 shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">ส่งออก PDF</span>
                  </>
                )}
              </button>

              {/* Button 3: Export PNG */}
              <button
                type="button"
                onClick={handleExportImage}
                disabled={isExporting || exportStatePNG === "exporting"}
                className={`font-extrabold px-2.5 sm:px-3 h-8 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer text-xs whitespace-nowrap shrink-0 shadow-2xs ${
                  exportStatePNG === "success"
                    ? "bg-emerald-600 text-white border border-emerald-500"
                    : "bg-white hover:bg-slate-50 text-emerald-700 border border-slate-300"
                }`}
                title="ส่งออกเป็นรูปภาพ PNG"
              >
                {exportStatePNG === "exporting" || (isExporting && downloadStatus.type === "PNG" && !downloadStatus.isSuccess) ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">กำลังส่งออก...</span>
                  </>
                ) : exportStatePNG === "success" ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">ส่งออกสำเร็จ</span>
                  </>
                ) : (
                  <>
                    <FileImage className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">ส่งออก PNG</span>
                  </>
                )}
              </button>

              {/* Button 4: Export Multi-Pages (Batch Export) */}
              {onOpenBatchExport && (
                <button
                  type="button"
                  onClick={() => {
                    const idsToExport = selectedBatchIds && selectedBatchIds.length > 0
                      ? selectedBatchIds
                      : [report.id];
                    onOpenBatchExport({
                      initialSelectedIds: idsToExport,
                      initialSchoolFilter: report.schoolName,
                      initialGoalFilter: report.goalCode,
                      initialFormat: "combined-pdf",
                    });
                  }}
                  className="font-black px-2.5 sm:px-3 h-8 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs text-xs whitespace-nowrap shrink-0 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white border border-indigo-500"
                  title="ส่งออกเอกสารหลายหน้าพร้อมกัน (รวมเป็น PDF เล่มเดียว หรือ ZIP แยกฉบับ)"
                >
                  <FolderDown className="w-3.5 h-3.5 text-indigo-100 shrink-0" />
                  <span className="hidden sm:inline whitespace-nowrap">ส่งออกหลายหน้า</span>
                </button>
              )}

              {/* Button 5: Checkbox for Batch Selection */}
              {onToggleBatchSelect && (
                <button
                  type="button"
                  onClick={() => onToggleBatchSelect(report.id)}
                  className={`h-8 px-2 sm:px-2.5 rounded-lg border text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0 ${
                    isBatchSelected
                      ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                      : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
                  }`}
                  title={isBatchSelected ? "ยกเลิกการเลือกหน้านี้จากการส่งออกกลุ่ม" : "เลือกหน้านี้เพื่อส่งออกกลุ่มพร้อมกัน"}
                >
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] ${
                    isBatchSelected ? "bg-white text-amber-600 border-white font-black" : "border-slate-400 bg-white"
                  }`}>
                    {isBatchSelected ? "✓" : ""}
                  </span>
                  <span className="hidden md:inline whitespace-nowrap text-[11px]">
                    {isBatchSelected ? "เลือกแล้ว" : "เลือกหน้านี้"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* A4 Paper Scaled Container */}
        {isCollapsed ? (
          <div 
            onClick={() => setIsCollapsed(false)}
            className="w-full bg-slate-100 border border-t-0 border-slate-300/90 rounded-b-2xl py-6 px-4 text-center text-slate-600 font-bold text-xs space-y-1 cursor-pointer hover:bg-slate-200/70 transition shadow-2xs no-print"
          >
            <div className="flex items-center justify-center gap-2 text-slate-700">
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>ซ่อนการแสดงผลเอกสาร [ID: {report.id}] แล้ว — คลิกที่นี่เพื่อเปิดแสดงผล</span>
            </div>
          </div>
        ) : (
          <div 
            className="w-full flex justify-center items-center bg-slate-200/80 p-3 sm:p-4 md:p-6 border border-t-0 border-slate-300 rounded-b-2xl overflow-x-auto shadow-sm transition-all duration-300 ease-out"
            style={{
              minHeight: `${Math.round(1123 * currentScale + 36)}px`
            }}
          >
            <div 
              className="a4-scaler-wrapper relative shrink-0 mx-auto"
              style={{
                width: `${Math.round(794 * currentScale)}px`,
                height: `${Math.round(1123 * currentScale)}px`,
                transition: "none",
              }}
            >
              <div
                style={{
                  width: "794px",
                  height: "1123px",
                  transform: `scale(${currentScale})`,
                  transformOrigin: "top left",
                  position: "absolute",
                  left: 0,
                  top: 0,
                  transition: isExporting ? "none" : "transform 0.2s ease-out",
                }}
              >
                {/* Physical A4 Sheet */}
                <div
                  id={pageIndex === 0 ? "a4-print-area" : undefined}
                  ref={documentRef}
                  className={`a4-page a4-paper sarabun-font bg-white ${isExporting ? "shadow-none border-0" : "shadow-xl border border-slate-350"} w-[794px] h-[1123px] pl-[113px] pr-[75px] pt-[50px] pb-[45px] text-slate-900 flex flex-col justify-between relative shrink-0 text-[16px] leading-tight select-none overflow-hidden print-page`}
                  style={{
                    boxSizing: "border-box",
                    WebkitTextSizeAdjust: "none",
                    textSizeAdjust: "none",
                    width: "794px",
                    minWidth: "794px",
                    maxWidth: "794px",
                    height: "1123px",
                    minHeight: "1123px",
                    maxHeight: "1123px"
                  }}
                >
            {/* Top Header Block */}
            <div className="space-y-1.5 flex-1 flex flex-col min-h-0" style={{ width: "636px", paddingLeft: "4px", marginTop: "0px", marginLeft: "-9px" }}>
              
              {/* Document Header Title */}
              <div 
                className="space-y-0.5" 
                style={{ 
                  marginTop: "-12px", 
                  lineHeight: "19.6px", 
                  marginLeft: "-11px",
                  width: "637.333px"
                }}
              >
                <div className="relative flex items-center justify-center w-full min-h-[68px] pb-0.5" style={{ paddingBottom: "0.4375px", marginBottom: "2.4375px", paddingTop: "5px", marginTop: "1px" }}>
                  {/* Royal Emblem on Left */}
                  <img 
                    src={ROYAL_EMBLEM_IMAGE}
                    alt="ตราสัญลักษณ์โครงการพระราชดำริฯ"
                    referrerPolicy="no-referrer"
                    className="absolute left-0 top-0 object-contain shrink-0"
                    style={{ height: "65.9531px", width: "71.9688px", marginLeft: "6px", marginTop: "2px" }}
                  />

                  {/* Header Title Text - Centered */}
                  <div className="text-center space-y-0.5 flex-1 px-12" style={{ paddingTop: "0px", paddingLeft: "60px", paddingBottom: "0px", marginTop: "-10px" }}>
                    <h2 className="font-extrabold tracking-tight text-slate-950 leading-snug text-center max-w-full text-[19px] mt-[10px] ml-[5px]">
                      {toThaiNumerals("รายงานผลการปฏิบัติงานกิจกรรมตามแผน กพด. (ฉบับที่ 5)")}
                    </h2>
                    <h3 className="font-bold text-slate-800 text-center leading-snug text-[13px]">
                      {getSchoolHeader(report.schoolName)}
                    </h3>
                    <p 
                      className="font-normal text-slate-600 text-center leading-snug text-[13px]"
                      style={{ marginTop: "0.1875px", paddingBottom: "5px", fontSize: "13px" }}
                    >
                      รายงานประจำวันที่ {formatThaiFullDate(report.dateString || "6 พฤษภาคม 2569")}
                    </p>
                  </div>
                </div>
                <div className="w-full h-[1.5px] bg-slate-900 mt-1 mb-1.5" />
              </div>

              {/* SECTION 1: ข้อมูลทั่วไป */}
              <div className="space-y-0.5">
                <h4 className="font-extrabold text-[15px] text-slate-950 leading-snug" style={{ marginBottom: "0.4375px", marginTop: "-10px", fontSize: "15px", marginLeft: "-7px" }}>
                  {toDocNumerals("1.")} ข้อมูลทั่วไป
                </h4>
                <div className="pl-4 space-y-0.5 text-slate-800">
                  <div className="grid grid-cols-2 gap-4 items-baseline" style={{ marginLeft: "0px" }}>
                    <p className="text-[13.5px] leading-normal whitespace-nowrap overflow-visible" style={{ marginLeft: "-23px", fontSize: "13.5px" }}>
                      <span className="font-bold text-slate-800" style={{ marginLeft: "0px" }}>สังกัด/หน่วยงาน:</span>{" "}
                      <span className="font-medium text-slate-900">{getThaiAffiliation(report.schoolName)}</span>
                    </p>
                    <p className="text-[13.5px] leading-normal whitespace-nowrap overflow-visible flex items-center gap-1">
                      <span className="font-bold text-slate-800" style={{ marginLeft: "-90px" }}>ครูใหญ่:</span>{" "}
                      {isExporting ? (
                        <span className="font-medium text-slate-900 text-[13.5px]">{toThaiNumerals(effectiveApproverName || report.approverName || "-")}</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setTeacherModalData({
                              type: 'principal',
                              name: effectiveApproverName || report.approverName || "ครูใหญ่ประจำสถานศึกษา",
                              position: formattedApproverPosition,
                              school: exactSchoolName
                            })}
                            className="font-medium text-slate-900 hover:text-indigo-600 bg-indigo-50/60 hover:bg-indigo-100/80 px-2 py-0.5 rounded-md border border-indigo-200/70 transition-all cursor-pointer text-inherit inline-flex items-center gap-1 shadow-2xs no-print text-[13.5px]"
                            title="คลิกเพื่อเปิดหน้าต่างลอยแสดงข้อมูลครูใหญ่"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span style={{ fontSize: "13.5px" }}>{toThaiNumerals(effectiveApproverName || report.approverName || "-")}</span>
                          </button>
                          <span className="hidden print:inline font-medium text-slate-900 text-[13.5px]">{toThaiNumerals(effectiveApproverName || report.approverName || "-")}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div style={{ marginLeft: "0px" }}>
                    <p className="w-full text-[13.5px] leading-normal whitespace-nowrap overflow-visible" style={{ marginLeft: "-24px", marginTop: "-3px", fontSize: "13.5px" }}>
                      <span className="font-bold text-slate-800" style={{ marginLeft: "0px" }}>ที่ตั้ง:</span>{" "}
                      <span className="font-medium text-slate-900">{getThaiAddress(report.schoolName)}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: เป้าหมายหลักที่ดำเนินการ */}
              <div className="space-y-0.5 pt-0.5">
                <h4 className="font-extrabold text-[15px] text-slate-950 leading-snug" style={{ marginTop: "-10px", marginBottom: "-0.5625px", fontSize: "15px", marginLeft: "-6px" }}>
                  {toDocNumerals("2.")} เป้าหมายหลักที่ดำเนินการ
                </h4>
                <div className="pl-4 space-y-1 text-slate-900">
                  <p className="font-bold text-slate-950 text-[13.5px] leading-snug" style={{ marginLeft: "-24px", marginTop: "4px" }}>
                    เป้าหมายหลักที่ {toThaiNumerals(currentGoal?.id || "3")} {toThaiNumerals(currentGoal?.title || "ส่งเสริมศักยภาพของเด็กและเยาวชนทางวิชาการและจริยธรรม")}
                  </p>
                  
                  {primaryIndicator && (
                    <div className="rounded-lg px-1 h-auto" style={{ paddingTop: "3.3125px", paddingBottom: "3.3125px", marginLeft: "0px", marginTop: "-2px" }}>
                      <span className="text-slate-950 font-bold text-[13.5px] leading-snug block" style={{ marginLeft: "-28px" }}>
                        ตัวชี้วัด กพด. (ฉบับที่ {toDocNumerals("5")}):
                      </span>
                      <p className="text-[13.5px] text-slate-800 font-medium leading-relaxed pl-2 break-words whitespace-pre-wrap" style={{ marginLeft: "-29px", fontSize: "13.5px", width: "630.25px" }}>
                        - {toThaiNumerals(`${primaryIndicator.code} ${primaryIndicator.name}`)}
                      </p>
                    </div>
                  )}

                  <div className="rounded-lg px-1 h-auto" style={{ paddingTop: "1.3125px", paddingBottom: "2px", marginTop: "-12px" }}>
                    <span className="text-slate-950 font-bold text-[13.5px] leading-snug block" style={{ marginLeft: "-28px", marginTop: "-9px" }}>เป้าหมายย่อย:</span>
                    <p className="text-[13.5px] text-slate-800 font-medium leading-relaxed pl-2 break-words whitespace-pre-wrap" style={{ fontSize: "13.5px", marginLeft: "-31px", marginBottom: "2px" }}>
                      - {toThaiNumerals(goalsContext.subGoal)}
                    </p>
                  </div>

                  <div className="rounded-lg px-1 h-auto" style={{ paddingTop: "1px", paddingBottom: "1px", marginTop: "-10px" }}>
                    <span className="text-slate-950 font-bold text-[13.5px] leading-snug block" style={{ marginLeft: "-28px", marginTop: "-9px" }}>เป้าหมายตามวัตถุประสงค์:</span>
                    <p className="text-[13.5px] text-slate-800 font-medium leading-relaxed pl-2 break-words whitespace-pre-wrap" style={{ width: "625.562px", fontSize: "13.5px", marginLeft: "-31px", marginTop: report.id === 'REP-SHEET-7178' ? "-7px" : undefined }}>
                      - {toThaiNumerals(goalsContext.objective)}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 3: รายละเอียดการดำเนินกิจกรรม */}
              <div className="space-y-0.5 pt-0.5">
                <div className="flex items-center justify-between" style={{ marginTop: "-13px", marginLeft: "0px" }}>
                  <h4 className="font-extrabold text-[15px] text-slate-950 leading-snug" style={{ fontSize: "15px", marginLeft: "-6px" }}>
                    {toDocNumerals("3.")} รายละเอียดการดำเนินกิจกรรม
                  </h4>

                  {/* AI Summarize Toggle / Action Button (Print Hidden & Export Hidden) */}
                  <div className={`${isExporting ? "!hidden" : "flex"} print:hidden items-center gap-1.5`} data-html2canvas-ignore="true">
                    {useAiSummary && aiSummary && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-800 text-[9.5px] font-bold border border-purple-200/90 shadow-2xs" title="ย่อสรุปโดยรักษาข้อเท็จจริงเดิม 100% ไม่บิดเบือนเนื้อหา" data-html2canvas-ignore="true">
                        <Sparkles className="w-2.5 h-2.5 text-purple-600 animate-pulse" />
                        <span className="text-[9.5px]">ย่อสรุปคงสาระสำคัญ 100%</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAiSummarizeDetails(false)}
                      disabled={isSummarizing}
                      data-html2canvas-ignore="true"
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition shadow-2xs cursor-pointer border ${
                        useAiSummary
                          ? "bg-purple-600 text-white border-purple-700 hover:bg-purple-700 active:scale-95"
                          : "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200 hover:border-purple-300 active:scale-95"
                      }`}
                      title={useAiSummary ? "คลิกเพื่อสลับกลับเป็นข้อความต้นฉบับเต็ม" : "คลิกเพื่อให้ AI ย่อสรุปข้อความรายละเอียดกิจกรรมให้กระชับ โดยคงข้อเท็จจริงเดิมครบถ้วน 100%"}
                    >
                      {isSummarizing ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                          <span className="text-[10px]">กำลังย่อสรุป...</span>
                        </>
                      ) : useAiSummary ? (
                        <>
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span className="text-[10px]">แสดงต้นฉบับเต็ม</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                          <span className="text-[10px]">ย่อข้อมูลด้วย AI</span>
                        </>
                      )}
                    </button>

                    {useAiSummary && (
                      <button
                        type="button"
                        onClick={() => handleAiSummarizeDetails(true)}
                        disabled={isSummarizing}
                        data-html2canvas-ignore="true"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-white text-purple-700 hover:bg-purple-50 border border-purple-200 hover:border-purple-300 transition shadow-2xs cursor-pointer active:scale-95"
                        title="สั่งให้ AI ประมวลผลย่อสรุปใหม่โดยคงข้อเท็จจริงเดิม"
                      >
                        <RefreshCw className={`w-2.5 h-2.5 text-purple-600 ${isSummarizing ? "animate-spin" : ""}`} />
                        <span className="text-[10px]">สรุปใหม่</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="pl-4 space-y-1 text-slate-800">
                  <div className="flex justify-between gap-4 pb-0.5">
                    <p className="w-full text-[13.5px] leading-snug" style={{ fontSize: "13.5px", marginTop: "3px", marginLeft: "-23px" }}>
                      <span className="font-bold text-slate-950" style={{ fontSize: "13.5px" }}>ชื่อกิจกรรม:</span>{" "}
                      <span className="font-normal text-slate-900" style={{ fontSize: "13.5px" }}>{toThaiNumerals(displayActivityTitle)}</span>
                    </p>
                  </div>

                  {(() => {
                    const currentDetailsText = (useAiSummary && aiSummary) ? aiSummary : rawDetailsText;
                    const len = currentDetailsText.length;
                    const dynamicLineHeight = len > 300 ? "17px" : len > 200 ? "18px" : "19px";

                    return (
                       <div className="relative" style={{ marginTop: "-10px" }}>
                        <div 
                          className="rounded-lg px-1 text-slate-900 font-normal transition-all min-h-[32px] h-auto overflow-visible flex items-center bg-transparent" 
                          style={{ 
                            paddingTop: "3.3125px",
                            paddingBottom: "3.3125px",
                            fontSize: "13.5px",
                            lineHeight: dynamicLineHeight,
                            marginTop: "0px",
                            marginLeft: "0px"
                          }}
                        >
                          <p 
                            className="w-full text-justify leading-relaxed [text-align-last:left] [text-justify:inter-word] break-words whitespace-pre-wrap" 
                            style={{ 
                              marginTop: "-9px", 
                              marginLeft: "-28px",
                              textAlign: "justify",
                              textJustify: "inter-word",
                              textAlignLast: "left",
                              wordBreak: "break-word",
                              fontSize: "13.5px"
                            }}
                          >
                            <span className="font-bold text-slate-950 text-[13.5px] inline mr-1" style={{ marginLeft: "0px" }}>รายละเอียดกิจกรรม:</span>{" "}
                            <span className="font-medium text-slate-900" style={{ width: "auto", marginLeft: "0px", paddingTop: "0px", paddingLeft: "0px", marginTop: "0px" }}>{toThaiNumerals(currentDetailsText)}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between gap-4 pt-0.5" style={{ marginTop: "-8px", marginLeft: "-16px" }}>
                    <p className="flex-1 min-w-0 text-[13.5px] leading-snug" style={{ marginLeft: "-31px", marginTop: "-9px", fontSize: "13.5px" }}>
                      <span className="font-bold text-slate-950 text-[13.5px]" style={{ marginLeft: "24px" }}>กลุ่มเป้าหมาย/ชั้นเรียน:</span>{" "}
                      <span className="font-normal text-slate-800 text-[13.5px]">{toThaiNumerals(report.targetGroup || "-")}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 4: ภาพประกอบกิจกรรม */}
              <div className="space-y-0.5 pt-0.5 flex-1 flex flex-col min-h-0" style={{ paddingTop: "3.4375px", marginTop: "-30px", marginBottom: "0.4375px" }}>
                <h4 className="font-extrabold text-[15px] text-slate-950 shrink-0 flex flex-nowrap items-center justify-between gap-1 leading-snug" style={{ marginTop: "-9px", marginLeft: "-11px", marginBottom: "5.5px", fontSize: "15px" }}>
                  <div className="flex items-center space-x-2">
                    <span style={{ fontSize: "15px", marginLeft: "5px" }}>{toDocNumerals("4.")} ภาพประกอบกิจกรรม</span>
                  </div>
                  <div className="shrink-0 flex items-center justify-end text-[13.5px] whitespace-nowrap font-normal text-slate-800 gap-3">
                    <div>
                      <span className="font-bold text-slate-950 text-[13.5px]" style={{ fontSize: "13.5px" }}>จำนวนผู้เข้าร่วม:</span>
                      <span className="font-normal text-slate-800 text-[13.5px] mx-1.5" style={{ fontSize: "13.5px" }}>
                        {formatThaiNumberWithComma(extractReportParticipantCount(report))}
                      </span>
                      <span className="font-bold text-slate-950 text-[13.5px]" style={{ fontSize: "13.5px" }}>คน</span>
                    </div>
                    {report.citizensCount !== undefined && report.citizensCount > 0 && (
                      <div className="flex items-center">
                        <span className="w-1 h-3 bg-slate-300 rounded-full mx-1.5 inline-block" />
                        <span className="font-bold text-slate-950 text-[13.5px]" style={{ fontSize: "13.5px" }}>จำนวนประชาชน:</span>
                        <span className="font-normal text-slate-800 text-[13.5px] mx-1.5" style={{ fontSize: "13.5px" }}>
                          {formatThaiNumberWithComma(report.citizensCount)}
                        </span>
                        <span className="font-bold text-slate-950 text-[13.5px]" style={{ fontSize: "13.5px" }}>คน</span>
                      </div>
                    )}
                  </div>
                </h4>
                {displayPhotos.length > 0 ? (
                  <div 
                    className={`grid gap-1 flex-1 min-h-0 ${gridConfig.cols}`}
                    style={{ 
                      paddingTop: "0px", 
                      marginTop: "10px", 
                      width: "640px", 
                      paddingLeft: "-0.5px",
                      marginLeft: "-6px",
                      gap: "4.375px"
                    }}
                  >
                    {displayPhotos.map((src, imgIdx) => {
                      let spanClass = "";
                      if (displayPhotos.length === 5) {
                        spanClass = imgIdx < 3 ? "col-span-2" : "col-span-3";
                      }

                      return (
                        <div 
                          key={imgIdx} 
                          onClick={() => {
                            setLightboxImageIndex(imgIdx);
                            setLightboxZoom(1);
                          }}
                          className={`rounded-lg overflow-hidden border border-slate-200/90 shadow-2xs bg-slate-100 relative h-full w-full min-h-0 select-none group cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all duration-200 ${spanClass}`}
                          title="คลิกเพื่อเปิดดูภาพขนาดเต็ม (Zoom Lightbox)"
                        >
                          <div className="w-full h-full relative overflow-hidden pointer-events-none">
                            <SmartFaceImage 
                              src={src} 
                              alt={`ภาพกิจกรรมที่ ${imgIdx + 1}`} 
                              showControls={false}
                              defaultPosition="50% 20%"
                            />
                          </div>

                          {/* Hover Overlay with Zoom Icon */}
                          <div 
                            data-html2canvas-ignore="true"
                            className="absolute inset-0 bg-slate-950/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none no-print"
                          >
                            <div className="px-2.5 py-1.5 bg-slate-900/85 text-white rounded-xl backdrop-blur-xs shadow-lg flex items-center gap-1.5 text-xs font-bold transform scale-90 group-hover:scale-100 transition-transform border border-white/20">
                              <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="text-[11px]">คลิกดูภาพเต็ม</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div 
                    className="pl-5 flex-1 flex flex-col min-h-0"
                    style={{ marginLeft: "-14px" }}
                  >
                    <div className="border border-dashed border-slate-300 rounded-xl py-3 px-4 bg-slate-50/70 text-center text-slate-500 space-y-1 flex-1 flex flex-col justify-center items-center">
                      <p className="text-[14px] font-bold text-slate-600">
                        ไม่มีภาพประกอบกิจกรรม
                      </p>
                      <p className="text-[13px] text-slate-400 font-medium">
                        (ยังไม่ได้แนบไฟล์รูปภาพในระบบรายงานกิจกรรมนี้)
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Content Area: Evaluation, Comments and Signatures */}
            <div className="border-t border-slate-200/80 shrink-0" style={{ paddingTop: "7px", paddingBottom: "0px", marginBottom: "0px", marginTop: "-4px" }}>
              <div className="grid grid-cols-2 gap-6 items-stretch" style={{ width: "636.4px", height: "148px", gap: "26.25px" }}>
                {/* Left Column: Comments & Approver Signature */}
                <div className="flex flex-col items-center justify-between text-center space-y-1 h-full">
                  <div className="w-full flex flex-col items-center text-center space-y-0.5">
                    <div className="flex flex-col items-center justify-center w-full px-1 gap-0.5">
                      <h5 className="font-extrabold text-[12px] text-slate-900 leading-tight text-center">
                        ความเห็นของผู้ตรวจ / ผู้บังคับบัญชา
                      </h5>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectReport(report.id);
                          setIsCommentModalOpen(true);
                        }}
                        data-html2canvas-ignore="true"
                        className="print:hidden text-[10px] font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/90 px-2 py-0.5 rounded-md flex items-center gap-1 transition cursor-pointer"
                        title="เลือกข้อคิดเห็นสำเร็จรูปสำหรับผู้บริหาร"
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>เลือกข้อคิดเห็นสำเร็จรูป</span>
                      </button>
                    </div>

                    {/* Comment display area */}
                    <div 
                      onClick={() => {
                        onSelectReport(report.id);
                        setIsCommentModalOpen(true);
                      }}
                      className="w-full flex flex-col justify-center py-0.5 px-2 my-0.5 cursor-pointer hover:bg-indigo-50/40 rounded transition-colors group relative"
                      title="คลิกเพื่อเลือกหรือแก้ไขข้อคิดเห็นสำเร็จรูป"
                      style={{ marginLeft: "0px", paddingTop: "0px", marginTop: "-3px" }}
                    >
                      {localComment ? (
                        <p className="text-[11.5px] font-semibold text-slate-900 leading-tight text-left px-1 my-auto">
                          {toThaiNumerals(localComment)}
                        </p>
                      ) : (
                        <div className="w-full flex flex-col justify-center space-y-3 pt-1.5 pb-0.5 px-3">
                          <div className="border-b border-dotted border-slate-400 w-full relative flex justify-center">
                            <span data-html2canvas-ignore="true" className="text-[9px] text-slate-400 print:hidden font-normal opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3.5">
                              (คลิกเพื่อเลือกข้อคิดเห็นสำเร็จรูป)
                            </span>
                          </div>
                          <div className="border-b border-dotted border-slate-400 w-full"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-0.5 flex flex-col items-center w-full max-w-[280px] mt-auto">
                    {/* Combined Inline Row: ลงชื่อ + ยศ + ลายเซ็นดิจิทัล (แบบสารบัญตำรวจ) */}
                    {localApproverSig ? (
                      <div className="w-full flex items-center justify-center gap-1.5 min-h-[36px] my-0.5 relative z-[30]" style={{ gap: "6.56px" }}>
                        <span className="font-normal text-slate-800 text-[12px] whitespace-nowrap shrink-0">
                          ลงชื่อ {approverRank ? <span className="font-semibold">{approverRank}</span> : ""}
                        </span>

                        <AdjustableSignature
                          signatureUrl={localApproverSig}
                          alt="Approver Signature"
                          roleLabel="ครูใหญ่ / ผู้ตรวจ"
                          onOpenModal={() => {
                            onSelectReport(report.id);
                            setSigTarget("approver");
                            setIsSigModalOpen(true);
                          }}
                          onClear={() => {
                            setLocalApproverSig("");
                            const updated = { ...report, approverSignatureUrl: "" };
                            if (onUpdateReport) onUpdateReport(updated);
                          }}
                          initialTransform={approverSigTransform}
                          onTransformChange={(tf) => setApproverSigTransform(tf)}
                          isExporting={isExporting}
                        />
                      </div>
                    ) : isExporting ? (
                      <div className="w-full flex items-center justify-center text-center min-h-[32px] my-0.5">
                        <span className="font-normal text-slate-900 text-[12px] whitespace-nowrap">
                          ลงชื่อ {approverRank ? <span className="font-semibold">{approverRank} </span> : ""}
                          <span className="font-normal tracking-wider text-slate-400 select-none">...................................................</span>
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="hidden print:flex w-full items-center justify-center text-center min-h-[32px] my-0.5">
                          <span className="font-normal text-slate-900 text-[12px] whitespace-nowrap">
                            ลงชื่อ {approverRank ? <span className="font-semibold">{approverRank} </span> : ""}
                            <span className="font-normal tracking-wider text-slate-400 select-none">...................................................</span>
                          </span>
                        </div>
                        <div className="w-full flex items-center justify-center gap-1.5 min-h-[36px] my-0.5 relative z-[30] no-print">
                          <span className="font-normal text-slate-800 text-[12px] whitespace-nowrap shrink-0">
                            ลงชื่อ {approverRank ? <span className="font-semibold">{approverRank} </span> : ""}
                          </span>
                          <div 
                            onClick={() => {
                              onSelectReport(report.id);
                              setSigTarget("approver");
                              setIsSigModalOpen(true);
                            }}
                            className="group/sig flex items-center gap-1.5 cursor-pointer hover:bg-indigo-50/80 px-2 py-0.5 rounded-lg border border-dashed border-slate-300 hover:border-indigo-300 transition-all"
                            title="คลิกเพื่อเซ็นชื่อหรืออัปโหลดลายเซ็นดิจิทัล"
                          >
                            <span className="font-normal text-slate-400 text-[11px] tracking-wider select-none">........................</span>
                            <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 group-hover/sig:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                              <Edit3 className="w-3 h-3 text-indigo-600" />
                              <span>เซ็นชื่อ</span>
                            </span>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="text-center pt-0.5 w-full">
                      {approverCleanName ? (
                        <p className="font-normal text-slate-900 text-[12px]">
                          ({approverCleanName})
                        </p>
                      ) : effectiveApproverName ? (
                        <p className="font-normal text-slate-900 text-[12px]">
                          ({effectiveApproverName})
                        </p>
                      ) : (
                        <p className="font-normal text-slate-400 text-[12px]">(...................................................)</p>
                      )}
                      <div className="text-slate-600 text-[11.5px] leading-tight font-medium pt-0.5">
                        {report.schoolName && report.schoolName.includes("เนวิน") ? (
                          <span className="block text-center">
                            <span className="block">ตำแหน่ง ครูใหญ่ รร.ตชด.</span>
                            <span className="block">ดร.เนวิน สคริม ชอว์</span>
                          </span>
                        ) : (
                          renderWithParenthesesBreak(
                            formattedApproverPosition.startsWith("ตำแหน่ง") 
                              ? toThaiNumerals(formattedApproverPosition) 
                              : `ตำแหน่ง ${toThaiNumerals(formattedApproverPosition)}`
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Rating & Reporter Signature */}
                <div className="flex flex-col items-center justify-between text-center space-y-1 h-full">
                  <div className="w-full flex flex-col items-center text-center space-y-0.5">
                    <h5 className="font-extrabold text-[12px] text-slate-900 leading-tight">
                      การประเมินการดำเนินกิจกรรม
                    </h5>
                    
                    <div className="w-full h-7 flex items-center justify-center gap-4 py-0.5 font-bold text-[12.5px] text-slate-800 select-none" style={{ gap: "17.5px", marginTop: "1px" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedRating(selectedRating === "ดีเยี่ยม" ? null : "ดีเยี่ยม")}
                        className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0 text-inherit font-inherit"
                        title="คลิกเพื่อเลือก/ยกเลิก"
                      >
                        <span 
                          className="text-[17px] leading-none"
                          style={{
                            color: selectedRating === "ดีเยี่ยม" ? "rgb(37, 99, 235)" : "rgb(156, 163, 175)"
                          }}
                        >
                          {selectedRating === "ดีเยี่ยม" ? "☑" : "☐"}
                        </span>
                        <span>ดีเยี่ยม</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedRating(selectedRating === "ดี" ? null : "ดี")}
                        className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0 text-inherit font-inherit"
                        title="คลิกเพื่อเลือก/ยกเลิก"
                      >
                        <span 
                          className="text-[17px] leading-none"
                          style={{
                            color: selectedRating === "ดี" ? "rgb(37, 99, 235)" : "rgb(156, 163, 175)"
                          }}
                        >
                          {selectedRating === "ดี" ? "☑" : "☐"}
                        </span>
                        <span>ดี</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedRating(selectedRating === "พอใช้" ? null : "พอใช้")}
                        className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0 text-inherit font-inherit"
                        title="คลิกเพื่อเลือก/ยกเลิก"
                      >
                        <span 
                          className="text-[17px] leading-none"
                          style={{
                            color: selectedRating === "พอใช้" ? "rgb(37, 99, 235)" : "rgb(156, 163, 175)"
                          }}
                        >
                          {selectedRating === "พอใช้" ? "☑" : "☐"}
                        </span>
                        <span>พอใช้</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-0.5 flex flex-col items-center w-full max-w-[280px] mt-auto">
                    {/* Combined Inline Row: ลงชื่อ + ยศ + ลายเซ็นดิจิทัล (แบบสารบัญตำรวจ) */}
                    {localReporterSig ? (
                      <div className="w-full flex items-center justify-center gap-1.5 min-h-[36px] my-0.5 relative z-[30]" style={{ gap: "6.56px" }}>
                        <span className="font-normal text-slate-800 text-[12px] whitespace-nowrap shrink-0">
                          ลงชื่อ {reporterRank && !["นาย", "นาง", "นางสาว"].includes(reporterRank) ? <span className="font-semibold">{reporterRank}</span> : ""}
                        </span>

                        <AdjustableSignature
                          signatureUrl={localReporterSig}
                          alt="Reporter Signature"
                          roleLabel="ครูผู้รับผิดชอบ"
                          onOpenModal={() => {
                            onSelectReport(report.id);
                            setSigTarget("reporter");
                            setIsSigModalOpen(true);
                          }}
                          onClear={() => {
                            setLocalReporterSig("");
                            const updated = { ...report, reporterSignatureUrl: "" };
                            if (onUpdateReport) onUpdateReport(updated);
                          }}
                          initialTransform={reporterSigTransform}
                          onTransformChange={(tf) => setReporterSigTransform(tf)}
                          isExporting={isExporting}
                        />
                      </div>
                    ) : isExporting ? (
                      <div className="w-full flex items-center justify-center text-center min-h-[32px] my-0.5">
                        <span className="font-normal text-slate-900 text-[12px] whitespace-nowrap">
                          ลงชื่อ {reporterRank && !["นาย", "นาง", "นางสาว"].includes(reporterRank) ? <span className="font-semibold">{reporterRank} </span> : ""}
                          <span className="font-normal tracking-wider text-slate-400 select-none">...................................................</span>
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="hidden print:flex w-full items-center justify-center text-center min-h-[32px] my-0.5">
                          <span className="font-normal text-slate-900 text-[12px] whitespace-nowrap">
                            ลงชื่อ {reporterRank && !["นาย", "นาง", "นางสาว"].includes(reporterRank) ? <span className="font-semibold">{reporterRank} </span> : ""}
                            <span className="font-normal tracking-wider text-slate-400 select-none">...................................................</span>
                          </span>
                        </div>
                        <div className="w-full flex items-center justify-center gap-1.5 min-h-[36px] my-0.5 relative z-[30] no-print">
                          <span className="font-normal text-slate-800 text-[12px] whitespace-nowrap shrink-0">
                            ลงชื่อ {reporterRank && !["นาย", "นาง", "นางสาว"].includes(reporterRank) ? <span className="font-semibold">{reporterRank} </span> : ""}
                          </span>
                          <div 
                            onClick={() => {
                              onSelectReport(report.id);
                              setSigTarget("reporter");
                              setIsSigModalOpen(true);
                            }}
                            className="group/sig flex items-center gap-1.5 cursor-pointer hover:bg-indigo-50/80 px-2 py-0.5 rounded-lg border border-dashed border-slate-300 hover:border-indigo-300 transition-all"
                            title="คลิกเพื่อเซ็นชื่อหรืออัปโหลดลายเซ็นดิจิทัล"
                          >
                            <span className="font-normal text-slate-400 text-[11px] tracking-wider select-none">........................</span>
                            <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 group-hover/sig:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                              <Edit3 className="w-3 h-3 text-indigo-600" />
                              <span>เซ็นชื่อ</span>
                            </span>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="text-center pt-0.5 w-full">
                      {["นาย", "นาง", "นางสาว"].includes(reporterRank) ? (
                        <p className="font-normal text-slate-900 text-[12px]">
                          ({reporterRank}{reporterCleanName})
                        </p>
                      ) : reporterCleanName ? (
                        <p className="font-normal text-slate-900 text-[12px]">
                          ({reporterCleanName})
                        </p>
                      ) : report.reportedBy ? (
                        <p className="font-normal text-slate-900 text-[12px]">
                          ({report.reportedBy})
                        </p>
                      ) : (
                        <p className="font-normal text-slate-400 text-[12px]">(...................................................)</p>
                      )}
                      <div className="text-slate-600 text-[11.5px] leading-tight font-medium pt-0.5">
                        {renderWithParenthesesBreak(toThaiNumerals(report.reportPosition || "ครูผู้รับผิดชอบ"))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer Block */}
              <div 
                className="border-t border-slate-200/90 flex items-end justify-between text-[11px] text-slate-500 font-medium"
                style={{ width: "636px", paddingTop: "-4.625px", marginTop: "23.375px", marginLeft: "0px" }}
              >
                <div className="space-y-0.5 text-left">
                  <p>{toThaiNumerals("รายงานผลการปฏิบัติงานกิจกรรมตามแผน กพด. (ฉบับที่ ๕)")}</p>
                  <p>พิมพ์เมื่อ: {getThaiCurrentDateTime()}</p>
                </div>

                <div className="flex items-center gap-2.5 text-right">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-600 text-[11px]">สแกนเพื่อดูข้อมูลต้นฉบับ</p>
                    <p className="text-[10.5px] text-slate-500">{formatReportUpdatedDateTime(report.lastUpdated, report.dateString)}</p>
                  </div>
                  <ReportQRCode value="https://drive.google.com/file/d/1Qvias_Otlx9IdUJATHqi-FLqFhjOR3V6/view?usp=sharing" />
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  )}

      {/* Floating Download Status Toast / Overlay Banner */}
      {downloadStatus.isDownloading && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 bg-slate-950/95 text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md max-w-sm w-auto sm:w-full mx-auto sm:mx-0 animate-in fade-in slide-in-from-bottom-5 duration-200 no-print">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {downloadStatus.isSuccess ? (
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center animate-spin shrink-0">
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                </div>
              )}
              <span className="font-extrabold text-xs text-slate-100">
                {downloadStatus.isSuccess ? "ดาวน์โหลดเรียบร้อยแล้ว" : `กำลังส่งออกหน้า ${pageIndex + 1} (${downloadStatus.type})`}
              </span>
            </div>
            <span className="text-xs font-mono font-black text-amber-400 ml-2 shrink-0">
              {downloadStatus.progress}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2 border border-slate-700">
            <div 
              className={`h-full transition-all duration-300 rounded-full ${
                downloadStatus.isSuccess 
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400" 
                  : "bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-400"
              }`}
              style={{ width: `${downloadStatus.progress}%` }}
            />
          </div>

          <p className="text-[11px] font-medium text-slate-300 truncate">
            {downloadStatus.stepMessage}
          </p>

          {isMobileOrTablet() && (
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-amber-300/90 font-medium">
              <span>รองรับ iPad / แท็บเล็ต / สมาร์ทโฟน</span>
              <span>{downloadStatus.isSuccess ? "บันทึก / แชร์แล้ว" : "กำลังประมวลผล"}</span>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Fullscreen Photo Viewer Modal */}
      {lightboxImageIndex !== null && displayPhotos[lightboxImageIndex] && createPortal(
        <div 
          data-html2canvas-ignore="true"
          className="fixed inset-0 z-[999999] bg-[#0c0d12]/95 backdrop-blur-md flex flex-col justify-between p-4 select-none animate-in fade-in duration-200 no-print"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setLightboxImageIndex(null);
            }
          }}
        >
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 w-full max-w-7xl mx-auto shrink-0 z-50">
            {/* Left Badge/Pill */}
            <div className="flex items-center gap-2 bg-[#181a20]/90 border border-slate-800 px-4 py-2 rounded-full text-white text-xs font-bold shadow-xl">
              <span className="text-sm">🖼️</span>
              <span className="tracking-wide">ภาพประกอบการปฏิบัติงาน</span>
            </div>

            {/* Right Controls Pill */}
            <div className="flex items-center gap-1 bg-[#181a20]/95 border border-slate-800/80 p-1 rounded-full shadow-2xl text-white">
              <button
                type="button"
                onClick={() => setLightboxZoom((prev) => Math.min(3, prev + 0.25))}
                className="px-3.5 py-1.5 rounded-full hover:bg-slate-800 text-slate-100 hover:text-white transition-all duration-200 flex items-center gap-1.5 text-xs font-bold cursor-pointer border-0 bg-transparent"
              >
                <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
                <span>ขยาย</span>
              </button>

              <button
                type="button"
                onClick={() => setLightboxZoom((prev) => Math.max(0.5, prev - 0.25))}
                className="px-3.5 py-1.5 rounded-full hover:bg-slate-800 text-slate-100 hover:text-white transition-all duration-200 flex items-center gap-1.5 text-xs font-bold cursor-pointer border-0 bg-transparent"
              >
                <ZoomOut className="w-3.5 h-3.5 text-indigo-400" />
                <span>ย่อ</span>
              </button>

              <button
                type="button"
                onClick={() => setLightboxRotate((prev) => (prev + 90) % 360)}
                className="px-3.5 py-1.5 rounded-full hover:bg-slate-800 text-slate-100 hover:text-white transition-all duration-200 flex items-center gap-1.5 text-xs font-bold cursor-pointer border-0 bg-transparent"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                <span>หมุน</span>
              </button>

              <a
                href={displayPhotos[lightboxImageIndex]}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-full hover:bg-slate-800 text-slate-100 hover:text-white transition-all duration-200 flex items-center gap-1.5 text-xs font-bold cursor-pointer border-0 bg-transparent decoration-none"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400 rotate-45" />
                <span>เปิดภาพต้นฉบับ</span>
              </a>

              <button
                type="button"
                onClick={() => setLightboxImageIndex(null)}
                className="p-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition-all duration-200 cursor-pointer ml-1.5 border-0"
                title="ปิดหน้าต่าง (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Image Viewport with Previous & Next Navigation */}
          <div 
            className="relative flex-1 w-full max-w-5xl mx-auto flex items-center justify-center overflow-hidden my-2 p-2 bg-transparent border-0 shadow-none group"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setLightboxImageIndex(null);
              }
            }}
          >
            {/* Prev Button */}
            {displayPhotos.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setLightboxImageIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : displayPhotos.length - 1));
                  setLightboxZoom(1);
                  setLightboxRotate(0);
                }}
                className="absolute left-4 z-20 p-3 rounded-full bg-[#181a20]/95 hover:bg-slate-800 text-white shadow-2xl transition cursor-pointer active:scale-95 border-0"
                title="ภาพก่อนหน้า (ลูกศรซ้าย)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Centered Image View */}
            <div className="relative max-h-[66vh] max-w-full flex items-center justify-center p-2 overflow-hidden">
              <img
                src={displayPhotos[lightboxImageIndex]}
                alt={`ภาพกิจกรรมที่ ${lightboxImageIndex + 1}`}
                referrerPolicy="no-referrer"
                onDoubleClick={() => setLightboxRotate((prev) => (prev + 90) % 360)}
                onClick={() => setLightboxZoom((prev) => (prev === 1 ? 1.5 : 1))}
                style={{
                  transform: `scale(${lightboxZoom}) rotate(${lightboxRotate}deg)`,
                  transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                className="max-h-[62vh] max-w-full object-contain rounded-xl shadow-2xl cursor-pointer"
                title="ดับเบิลคลิกเพื่อหมุนภาพ • คลิกธรรมดาเพื่อขยาย"
              />

              {/* Floating Tooltip/Caption inside image center on hover */}
              <div className="absolute pointer-events-none bg-slate-950/75 border border-white/10 px-3.5 py-1.5 rounded-lg text-white/95 text-xs font-bold shadow-md backdrop-blur-xs transform -translate-y-1/2 -translate-x-1/2 top-1/2 left-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                คลิกที่ภาพเพื่อขยาย หรือใช้ปุ่มควบคุมด้านบน
              </div>
            </div>

            {/* Next Button */}
            {displayPhotos.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setLightboxImageIndex((prev) => (prev !== null && prev < displayPhotos.length - 1 ? prev + 1 : 0));
                  setLightboxZoom(1);
                  setLightboxRotate(0);
                }}
                className="absolute right-4 z-20 p-3 rounded-full bg-[#181a20]/95 hover:bg-slate-800 text-white shadow-2xl transition cursor-pointer active:scale-95 border-0"
                title="ภาพถัดไป (ลูกศรขวา)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Bottom Caption and Thumbnails Strip */}
          <div className="flex flex-col items-center gap-3 shrink-0 w-full">
            {displayPhotos.length > 1 && (
              <div className="flex items-center justify-center gap-2 bg-[#181a20]/80 border border-slate-800 p-2 rounded-2xl overflow-x-auto max-w-xl mx-auto w-full">
                {displayPhotos.map((thumbSrc, tIdx) => (
                  <button
                    key={tIdx}
                    type="button"
                    onClick={() => {
                      setLightboxImageIndex(tIdx);
                      setLightboxZoom(1);
                      setLightboxRotate(0);
                    }}
                    className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 border-0 ${
                      tIdx === lightboxImageIndex
                        ? "ring-2 ring-indigo-500 scale-105 opacity-100"
                        : "opacity-40 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={thumbSrc}
                      alt={`Thumbnail ${tIdx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Bottom Info text exactly as shown in screenshot */}
            <div className="text-[11px] font-medium text-slate-400 py-1 tracking-wide text-center w-full">
              คลิกที่ภาพเพื่อขยาย • ดับเบิลคลิกหรือกดปุ่มด้านบนเพื่อหมุนภาพ • คลิกด้านนอกเพื่อปิด
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Teacher Name Modal / Floating Window (No vertical scrolling) */}
      {teacherModalData && createPortal(
        <div 
          data-html2canvas-ignore="true"
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs select-none animate-in fade-in duration-200 no-print"
          onClick={() => setTeacherModalData(null)}
        >
          <div 
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 px-6 pt-4 pb-3 text-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                    {teacherModalData.type === 'principal' ? (
                      <ShieldCheck className="w-5 h-5 text-indigo-300" />
                    ) : (
                      <UserCheck className="w-5 h-5 text-indigo-300" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-black tracking-wider uppercase text-indigo-200 block">
                      {teacherModalData.type === 'principal' ? 'ข้อมูลผู้อนุมัติ / ผู้บังคับบัญชา' : 'ข้อมูลครูผู้ปฏิบัติงาน / ผู้รายงาน'}
                    </span>
                    <h3 className="font-extrabold text-sm sm:text-base text-white">
                      {teacherModalData.type === 'principal' ? 'ครูใหญ่ประจำสถานศึกษา' : 'ครูผู้รับผิดชอบโครงการ'}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTeacherModalData(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer border-0"
                  title="ปิดหน้าต่างลอย"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Role Switcher Tabs inside Modal Header */}
              <div className="flex rounded-xl bg-slate-950/40 p-1 gap-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setTeacherModalData(prev => prev ? { ...prev, type: 'reporter' } : null)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-0 ${
                    teacherModalData.type === 'reporter' ? 'bg-white text-indigo-950' : 'text-white/80 hover:text-white bg-transparent'
                  }`}
                >
                  ผู้รับผิดชอบโครงการ
                </button>
                <button
                  type="button"
                  onClick={() => setTeacherModalData(prev => prev ? { ...prev, type: 'principal' } : null)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-0 ${
                    teacherModalData.type === 'principal' ? 'bg-white text-indigo-950' : 'text-white/80 hover:text-white bg-transparent'
                  }`}
                >
                  ผู้อนุมัติ/ครูใหญ่
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block uppercase">ชื่อ-นามสกุล</label>
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-extrabold text-sm text-slate-800">{teacherModalData.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(teacherModalData.name);
                      setCopiedTeacherName(true);
                      setTimeout(() => setCopiedTeacherName(false), 2000);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition cursor-pointer border-0 bg-transparent"
                    title="คัดลอกรายชื่อ"
                  >
                    {copiedTeacherName ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block uppercase">ตำแหน่ง / บทบาท</label>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold">
                  {teacherModalData.position || (teacherModalData.type === 'principal' ? 'ครูใหญ่ประจำสถานศึกษา' : 'ครูผู้รับผิดชอบโครงการ')}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block uppercase">สถานศึกษา / สังกัด</label>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold">
                  {teacherModalData.school || report.schoolName}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setTeacherModalData(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer border-0"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Print Preview Dialog (ตัวอย่างก่อนพิมพ์สมจริงเหมือน PDF - Full Dark Workspace) */}
      {isPrintPreviewOpen && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0f19] text-slate-100 no-print animate-in fade-in duration-200 select-none">
          {/* Top Header Bar */}
          <div className="px-4 sm:px-6 py-3 bg-[#0d1322] border-b border-slate-800/90 flex items-center justify-between gap-3 shadow-md shrink-0">
            {/* Left: Title & Info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-inner">
                <Printer className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm sm:text-base text-white tracking-tight">
                    ตัวอย่างก่อนพิมพ์
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    (Print Preview)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-900/60 text-blue-300 border border-blue-700/50 text-[11px] font-bold">
                    A4 Portrait
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {report.schoolName} {report.gradeLevel ? `ชั้น${report.gradeLevel}` : (report.activityName ? `• ${report.activityName}` : '')}
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleExportPDF()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
                title="ส่งออกเอกสารเป็นไฟล์ PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>PDF</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportImage()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
                title="ส่งออกเอกสารเป็นรูปภาพ PNG"
              >
                <FileImage className="w-3.5 h-3.5 text-emerald-400" />
                <span>รูปภาพ</span>
              </button>
              <button
                type="button"
                onClick={handleExecutePrint}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black transition cursor-pointer shadow-lg shadow-blue-900/50"
                title="ส่งคำสั่งพิมพ์ไปยังเครื่องพิมพ์"
              >
                <Printer className="w-4 h-4" />
                <span>สั่งพิมพ์หน้านี้</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPrintPreviewOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition cursor-pointer ml-1"
                title="ปิดหน้าต่างตัวอย่าง (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Warning / Tip Notification Bar */}
          {!isPrintTipDismissed && (
            <div className="bg-[#12192c] border-b border-indigo-950/90 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-slate-300 shrink-0">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="text-sm shrink-0">💡</span>
                <div className="leading-snug">
                  <strong className="text-amber-300 font-bold mr-1.5">คำแนะนำการพิมพ์:</strong>
                  <span>ในกล่องพิมพ์ของระบบ ให้เลือกขนาดกระดาษ <strong className="text-white">A4</strong> และติ๊กเปิด <strong className="text-emerald-400">☑ กราฟิกพื้นหลัง (Background graphics)</strong> เพื่อให้ตราสัญลักษณ์และสีแถบหัวข้อคมชัด</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintTipDismissed(true)}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-white/10 rounded-md transition cursor-pointer shrink-0"
                title="ซ่อนคำแนะนำ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Main Preview Canvas (A4 Sheet Render) */}
          <div className="flex-1 bg-[#141b2d] p-4 sm:p-8 md:p-10 overflow-y-auto flex items-center justify-center relative">
            {printPreviewImg ? (
              <div className="bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border border-slate-700/60 max-w-[760px] w-full overflow-hidden my-auto rounded-[2px] transition-all relative">
                <img
                  src={printPreviewImg}
                  alt="ตัวอย่างเอกสาร A4 ก่อนพิมพ์"
                  className="w-full h-auto object-contain block select-none pointer-events-none"
                />
                {isPreparingPrint && (
                  <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-2xs flex items-center justify-center">
                    <div className="bg-slate-900/90 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xl border border-slate-700">
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      <span>กำลังโหลดหน้า {pageIndex + 1}...</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                <p className="text-sm font-bold text-slate-300">กำลังประมวลผลตัวอย่างเอกสารหน้า {pageIndex + 1}...</p>
              </div>
            )}
          </div>

          {/* Bottom Status / Control Bar */}
          <div className="px-4 sm:px-6 py-2.5 bg-[#090d16] border-t border-slate-800/90 text-[11px] sm:text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span>
                เอกสารหน้า <strong className="text-slate-200">{pageIndex + 1}</strong> จาก <strong className="text-slate-200">{totalPages}</strong> ในระบบ
              </span>
              <span className="text-slate-600">|</span>
              <span className="hidden sm:inline">
                ขนาดกระดาษมาตรฐาน A4: 210 × 297 มม. (794 × 1123 พิกเซล)
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
              <span>
                กดปุ่ม <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 text-[10px]">ESC</kbd> เพื่อปิด
              </span>
              {totalPages > 1 && (
                <>
                  <span className="text-slate-600">|</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={pageIndex <= 0 || isPreparingPrint}
                      onClick={() => {
                        if (reports && reports[pageIndex - 1]) {
                          onSelectReport(reports[pageIndex - 1].id);
                        }
                      }}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none border border-slate-700 rounded text-slate-300 text-[11px] font-bold cursor-pointer transition active:scale-95"
                      title="หน้าก่อนหน้า (←)"
                    >
                      ←
                    </button>
                    <span className="text-slate-200 font-bold px-1">{pageIndex + 1} / {totalPages}</span>
                    <button
                      type="button"
                      disabled={pageIndex >= totalPages - 1 || isPreparingPrint}
                      onClick={() => {
                        if (reports && reports[pageIndex + 1]) {
                          onSelectReport(reports[pageIndex + 1].id);
                        }
                      }}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none border border-slate-700 rounded text-slate-300 text-[11px] font-bold cursor-pointer transition active:scale-95"
                      title="หน้าถัดไป (→)"
                    >
                      →
                    </button>
                    <span className="text-slate-400 ml-1 font-sans">เพื่อเปลี่ยนหน้า</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modals for Executive Preset Comments and Digital Signatures */}
      {isCommentModalOpen && (
        <ExecutiveCommentModal
          isOpen={isCommentModalOpen}
          onClose={() => setIsCommentModalOpen(false)}
          currentComment={localComment}
          onSaveComment={handleSaveExecutiveComment}
          approverName={effectiveApproverName || report.approverName}
          approverPosition={formattedApproverPosition}
        />
      )}

      {isSigModalOpen && (
        <DigitalSignatureModal
          isOpen={isSigModalOpen}
          onClose={() => {
            setIsSigModalOpen(false);
            setSigTarget(null);
          }}
          title={sigTarget === "approver" ? "บันทึกลายเซ็นดิจิทัล - ผู้ตรวจ/ครูใหญ่" : "บันทึกลายเซ็นดิจิทัล - ครูผู้รับผิดชอบ"}
          signatoryName={sigTarget === "approver" ? (effectiveApproverName || report.approverName || "ผู้อนุมัติ") : (reporterCleanName || report.reportedBy || "ผู้รายงาน")}
          signatoryPosition={sigTarget === "approver" ? formattedApproverPosition : (report.reportPosition || "ครูผู้รับผิดชอบ")}
          existingSignatureUrl={sigTarget === "approver" ? localApproverSig : localReporterSig}
          onSaveSignature={handleSaveDigitalSignature}
        />
      )}
    </div>
    </div>
  );
}

export default function A4Document({
  report,
  reports,
  isSyncing,
  onSelectReport,
  onEditReport,
  onUpdateReport,
  onDeleteReport,
  onOpenMultiPhaseTracker,
  onOpenBatchExport,
  schoolFilter,
  setSchoolFilter,
  goalFilter,
  setGoalFilter,
  onOpenQrModal,
  hideBanner = false,
}: A4DocumentProps) {
  const [topSearch, setTopSearch] = useState("");
  const [showLocalQrModal, setShowLocalQrModal] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const topCalendarRef = useRef<HTMLDivElement>(null);

  const [calendarViewYear, setCalendarViewYear] = useState<number>(() => {
    if (report) {
      const dt = parseReportDateDetails(report);
      if (dt && !isNaN(dt.yearCE)) {
        return dt.yearCE;
      }
    }
    return 2026;
  });

  const [calendarViewMonth, setCalendarViewMonth] = useState<number>(() => {
    if (report) {
      const dt = parseReportDateDetails(report);
      if (dt && !isNaN(dt.month)) {
        return dt.month - 1;
      }
    }
    return 6; // July
  });

  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string | null>(null);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("all");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState<string>("all");

  // Sync calendar view when active report changes
  useEffect(() => {
    if (report) {
      const dt = parseReportDateDetails(report);
      if (dt && !isNaN(dt.yearCE) && !isNaN(dt.month)) {
        setCalendarViewYear(dt.yearCE);
        setCalendarViewMonth(dt.month - 1);
      }
    }
  }, [report]);

  // Close calendar popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (topCalendarRef.current && !topCalendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCalendarOpen]);

  // Map dates to reports
  const reportDatesMap = useMemo(() => {
    const map: Record<string, ActivityReport[]> = {};
    if (!reports) return map;
    reports.forEach((r) => {
      const dt = parseReportDateDetails(r);
      if (dt && !isNaN(dt.yearCE) && !isNaN(dt.month) && !isNaN(dt.day)) {
        const key = `${dt.yearCE}-${String(dt.month).padStart(2, "0")}-${String(dt.day).padStart(2, "0")}`;
        if (!map[key]) map[key] = [];
        map[key].push(r);
      }
    });
    return map;
  }, [reports]);

  // Days grid for the mini month calendar
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(calendarViewYear, calendarViewMonth, 1).getDay();
    const totalDays = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();

    const cells: ({ day: number; dateKey: string } | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateKey = `${calendarViewYear}-${String(calendarViewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, dateKey });
    }
    return cells;
  }, [calendarViewYear, calendarViewMonth]);
  const activeDateReports = useMemo(() => {
    if (!selectedCalendarDateKey) return [];
    return reportDatesMap[selectedCalendarDateKey] || [];
  }, [selectedCalendarDateKey, reportDatesMap]);

  // Cascading Location, Organization, GPS & Goal search filters
  const [selectedProvince, setSelectedProvince] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [selectedSubdistrict, setSelectedSubdistrict] = useState<string>("all");
  const [selectedVillage, setSelectedVillage] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [gpsFilter, setGpsFilter] = useState<"all" | "has_gps" | "no_gps">("all");
  const [selectedGoal, setSelectedGoal] = useState<string>("all");

  // State for batching pages (showing 20 pages at a time) and mode
  const [visibleCount, setVisibleCount] = useState<number>(20);
  const [viewMode, setViewMode] = useState<"stream" | "single">("stream");
  const [useArabicNumerals, setUseArabicNumerals] = useState<boolean>(false);

  // Multi-page batch export selection state
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());

  const handleToggleBatchSelect = (id: string) => {
    setSelectedBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllBatch = () => {
    const next = new Set(filteredReports.map((r) => r.id));
    setSelectedBatchIds(next);
  };

  const handleClearBatchSelect = () => {
    setSelectedBatchIds(new Set());
  };

  // Collapsible filter section - default to minimized (false)
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  // Smartphone view - hide filter section automatically by default (false)
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  // Keep global numeral format state synchronized
  useEffect(() => {
    setGlobalArabicNumerals(useArabicNumerals);
  }, [useArabicNumerals]);

  // Dynamically available options
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

  // Reset visible batch count to 30 whenever filter conditions change
  useEffect(() => {
    setVisibleCount(30);
  }, [
    topSearch,
    selectedAcademicYear,
    selectedQuarter,
    selectedMonth,
    selectedWeek,
    selectedProvince,
    selectedDistrict,
    selectedSubdistrict,
    selectedVillage,
    selectedGroup,
    gpsFilter,
    selectedGoal,
    schoolFilter,
    goalFilter,
    selectedCalendarDateKey,
  ]);

  // Dynamically available academic years from report dataset (Start from first year 2569 onwards, filter out old years)
  const availableAcademicYears = useMemo(() => {
    const yearsSet = new Set<number>();
    reports.forEach((r) => {
      const dt = parseReportDateDetails(r);
      if (dt) {
        if (dt.academicYearBE >= 2569) yearsSet.add(dt.academicYearBE);
        if (dt.yearBE >= 2569) yearsSet.add(dt.yearBE);
      }
    });
    const sorted = Array.from(yearsSet).filter((y) => y >= 2569).sort((a, b) => b - a);
    if (sorted.length === 0) return ["2569"];
    return sorted.map(String);
  }, [reports]);

  // Dynamically available weeks generated from report dataset (7-day intervals)
  const availableWeeks = useMemo(() => {
    let minTime = Infinity;
    let maxTime = -Infinity;

    reports.forEach((r) => {
      const dt = parseReportDateDetails(r);
      if (dt && dt.dateObj) {
        const t = dt.dateObj.getTime();
        if (!isNaN(t)) {
          if (t < minTime) minTime = t;
          if (t > maxTime) maxTime = t;
        }
      }
    });

    const now = new Date();
    if (minTime === Infinity) {
      minTime = new Date(2026, 4, 1).getTime(); // May 1, 2026
    }
    if (maxTime === -Infinity || maxTime < now.getTime()) {
      maxTime = now.getTime();
    }

    const startDate = new Date(minTime);
    const startDay = startDate.getDay();
    const startSunday = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - startDay, 0, 0, 0, 0);

    const endLimit = new Date(maxTime);
    const endSaturday = new Date(endLimit.getFullYear(), endLimit.getMonth(), endLimit.getDate() + (6 - endLimit.getDay()), 23, 59, 59, 999);

    const list: Array<{
      id: string;
      weekNum: number;
      label: string;
      shortLabel: string;
      startMs: number;
      endMs: number;
    }> = [];

    const cursor = new Date(startSunday);
    let weekNum = 1;

    while (cursor.getTime() <= endSaturday.getTime()) {
      const wStart = new Date(cursor);
      const wEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 6, 23, 59, 59, 999);

      const startD = wStart.getDate();
      const endD = wEnd.getDate();
      const startM = wStart.getMonth();
      const endM = wEnd.getMonth();
      const yearBE = wEnd.getFullYear() + 543;

      const dateRangeStr = startM === endM
        ? `${toThaiNumerals(startD)}–${toThaiNumerals(endD)} ${THAI_SHORT_MONTHS[endM]} ${toThaiNumerals(yearBE)}`
        : `${toThaiNumerals(startD)} ${THAI_SHORT_MONTHS[startM]}–${toThaiNumerals(endD)} ${THAI_SHORT_MONTHS[endM]} ${toThaiNumerals(yearBE)}`;

      const wNumThai = toThaiNumerals(weekNum);

      list.push({
        id: `week_${weekNum}`,
        weekNum,
        label: `สัปดาห์ที่ ${wNumThai} (${dateRangeStr})`,
        shortLabel: `สัปดาห์ที่ ${wNumThai}`,
        startMs: wStart.getTime(),
        endMs: wEnd.getTime(),
      });

      cursor.setDate(cursor.getDate() + 7);
      weekNum++;
    }

    return list;
  }, [reports]);

  // Filtered reports list by keyword, GPS, location, group, goal, and time period
  const filteredReports = useMemo(() => {
    const list = reports.filter((r) => {
      // 0. Filter by active schoolFilter prop if present
      if (schoolFilter && schoolFilter.trim()) {
        const sf = schoolFilter.toLowerCase().trim();
        const sfNorm = sf.replace(/[^a-z0-9ก-๙]/g, '').replace('ชำปะโต', 'ซำปะโต');
        const schoolNameLower = (r.schoolName || "").toLowerCase();
        const schoolNameNorm = schoolNameLower.replace(/[^a-z0-9ก-๙]/g, '').replace('ชำปะโต', 'ซำปะโต');
        const schoolNameCore = schoolNameNorm.replace(/รรตชด|โรงเรียนตำรวจตระเวนชายแดน|ศกรตชด|ศศช/g, '');

        const isMatch = isSchoolMatch(sf, r.schoolName) ||
          schoolNameLower.includes(sf) ||
          sf.includes(schoolNameLower) ||
          (sfNorm.length >= 2 && (
            schoolNameNorm.includes(sfNorm) ||
            schoolNameCore.includes(sfNorm) ||
            sfNorm.includes(schoolNameCore)
          ));

        if (!isMatch) return false;
      }

      // 1. Keyword search (schoolName, activityName, projectName, dateString, location, reportedBy, id, GPS)
      if (topSearch.trim()) {
        const q = topSearch.toLowerCase().trim();
        const qNorm = q.replace(/[^a-z0-9ก-๙]/g, '').replace('ชำปะโต', 'ซำปะโต');
        const schoolNameLower = (r.schoolName || "").toLowerCase();
        const schoolNameNorm = schoolNameLower.replace(/[^a-z0-9ก-๙]/g, '').replace('ชำปะโต', 'ซำปะโต');
        const schoolNameCore = schoolNameNorm.replace(/รรตชด|โรงเรียนตำรวจตระเวนชายแดน|ศกรตชด|ศศช/g, '');

        const gps = getSchoolGpsBySchoolName(r.schoolName);
        const gpsString = gps ? `${gps[0]},${gps[1]}` : "";

        const matchSchoolName =
          schoolNameLower.includes(q) ||
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
          (r.location || "").toLowerCase().includes(q) ||
          (r.id || "").toLowerCase().includes(q) ||
          gpsString.includes(q);

        if (!matchSchoolName && !matchOther) return false;
      }

      // 2. Goal code filter
      if (selectedGoal !== "all") {
        const targetGoalId = getGoalIdFromCode(selectedGoal);
        const reportGoalId = getGoalIdFromCode(r.goalCode);
        if (targetGoalId !== reportGoalId) {
          return false;
        }
      }

      // 3. GPS filter
      if (gpsFilter !== "all") {
        const hasGps = getSchoolGpsBySchoolName(r.schoolName) !== null;
        if (gpsFilter === "has_gps" && !hasGps) return false;
        if (gpsFilter === "no_gps" && hasGps) return false;
      }

      // 4. Location & Organization Filters
      const schoolMatch = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(r.schoolName, s.name));
      if (selectedProvince !== "all") {
        if (!schoolMatch || schoolMatch.province !== selectedProvince) return false;
      }
      if (selectedDistrict !== "all") {
        if (!schoolMatch || schoolMatch.district !== selectedDistrict) return false;
      }
      if (selectedSubdistrict !== "all") {
        if (!schoolMatch || schoolMatch.subdistrict !== selectedSubdistrict) return false;
      }
      if (selectedVillage !== "all") {
        if (!schoolMatch || schoolMatch.village !== selectedVillage) return false;
      }
      if (selectedGroup !== "all") {
        const groupCode = selectedGroup.replace(/[^\d]/g, "");
        if (schoolMatch) {
          if (!schoolMatch.groupName.includes(groupCode)) return false;
        } else {
          if (!r.schoolName.includes(groupCode)) return false;
        }
      }

      // 5. Time period & Calendar Date filters
      const dt = parseReportDateDetails(r);
      if (selectedCalendarDateKey) {
        if (!dt || isNaN(dt.yearCE) || isNaN(dt.month) || isNaN(dt.day)) return false;
        const key = `${dt.yearCE}-${String(dt.month).padStart(2, "0")}-${String(dt.day).padStart(2, "0")}`;
        if (key !== selectedCalendarDateKey) return false;
      }

      if (!dt) return true; // Keep if no date available

      if (selectedAcademicYear !== "all") {
        const yr = Number(selectedAcademicYear);
        if (dt.academicYearBE !== yr && dt.yearBE !== yr) return false;
      }

      if (selectedQuarter !== "all" && dt.quarter !== selectedQuarter) return false;

      if (selectedMonth !== "all" && String(dt.month) !== selectedMonth) return false;

      if (selectedWeek !== "all") {
        const targetWeek = availableWeeks.find((w) => w.id === selectedWeek);
        if (targetWeek && dt && dt.dateObj) {
          const reportTime = dt.dateObj.getTime();
          if (reportTime < targetWeek.startMs || reportTime > targetWeek.endMs) {
            return false;
          }
        }
      }

      return true;
    });

    // Sort filtered list strictly from latest submitted / report ID descending
    return [...list].sort((a, b) => {
      const numA = parseInt(String(a.id).replace(/[^\d]/g, "")) || 0;
      const numB = parseInt(String(b.id).replace(/[^\d]/g, "")) || 0;
      if (numA !== numB) {
        return numB - numA;
      }
      if (a.timestamp && b.timestamp) {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        if (!isNaN(timeA) && !isNaN(timeB)) {
          return timeB - timeA;
        }
      }
      return 0;
    });
  }, [
    reports, schoolFilter, topSearch, selectedGoal, gpsFilter,
    selectedProvince, selectedDistrict, selectedSubdistrict, selectedVillage, selectedGroup,
    selectedAcademicYear, selectedQuarter, selectedMonth, selectedWeek, availableWeeks, selectedCalendarDateKey
  ]);

  // Ensure active report is automatically selected to the latest report on filter change
  useEffect(() => {
    if (filteredReports.length > 0) {
      const exists = report && filteredReports.some((r) => r.id === report.id);
      if (!exists) {
        onSelectReport(filteredReports[0].id);
      }
    }
  }, [filteredReports, report, onSelectReport]);

  const resetFilters = () => {
    setTopSearch("");
    setSelectedCalendarDateKey(null);
    setSelectedAcademicYear("all");
    setSelectedQuarter("all");
    setSelectedMonth("all");
    setSelectedWeek("all");
    setSelectedProvince("all");
    setSelectedDistrict("all");
    setSelectedSubdistrict("all");
    setSelectedVillage("all");
    setSelectedGroup("all");
    setGpsFilter("all");
    setSelectedGoal("all");
    setSchoolFilter?.("");
    setGoalFilter?.("all");
  };

  const currentReport = useMemo(() => {
    if (report && filteredReports.some((r) => r.id === report.id)) {
      return report;
    }
    return filteredReports.length > 0 ? filteredReports[0] : null;
  }, [report, filteredReports]);

  const handlePrintPDF = () => {
    window.print();
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 20, filteredReports.length));
  };

  const hasActiveFilters = 
    topSearch.trim() !== "" || 
    Boolean(schoolFilter && schoolFilter.trim() !== "") ||
    Boolean(selectedCalendarDateKey) ||
    selectedAcademicYear !== "all" || 
    selectedQuarter !== "all" || 
    selectedMonth !== "all" ||
    selectedWeek !== "all" ||
    selectedProvince !== "all" ||
    selectedDistrict !== "all" ||
    selectedSubdistrict !== "all" ||
    selectedVillage !== "all" ||
    selectedGroup !== "all" ||
    gpsFilter !== "all" ||
    selectedGoal !== "all";

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (topSearch.trim() !== "") count++;
    if (schoolFilter && schoolFilter.trim() !== "") count++;
    if (selectedGoal !== "all") count++;
    if (selectedCalendarDateKey) count++;
    if (selectedAcademicYear !== "all") count++;
    if (selectedQuarter !== "all") count++;
    if (selectedMonth !== "all") count++;
    if (selectedWeek !== "all") count++;
    if (selectedProvince !== "all") count++;
    if (selectedDistrict !== "all") count++;
    if (selectedSubdistrict !== "all") count++;
    if (selectedVillage !== "all") count++;
    if (selectedGroup !== "all") count++;
    if (gpsFilter !== "all") count++;
    return count;
  }, [
    topSearch,
    schoolFilter,
    selectedGoal,
    selectedCalendarDateKey,
    selectedAcademicYear,
    selectedQuarter,
    selectedMonth,
    selectedWeek,
    selectedProvince,
    selectedDistrict,
    selectedSubdistrict,
    selectedVillage,
    selectedGroup,
    gpsFilter,
  ]);

  const handleResetAllFilters = () => {
    setTopSearch("");
    setSelectedCalendarDateKey(null);
    setSchoolFilter?.("");
    setSelectedGoal("all");
    setGoalFilter?.("all");
    setSelectedAcademicYear("all");
    setSelectedQuarter("all");
    setSelectedMonth("all");
    setSelectedWeek("all");
    setSelectedProvince("all");
    setSelectedDistrict("all");
    setSelectedSubdistrict("all");
    setSelectedVillage("all");
    setSelectedGroup("all");
    setGpsFilter("all");
  };

  const displayedReports = viewMode === "single" 
    ? (currentReport ? [currentReport] : []) 
    : filteredReports.slice(0, visibleCount);

  const currentReportIndex = filteredReports.findIndex((r) => r.id === currentReport?.id);
  const safeCurrentIndex = currentReportIndex !== -1 ? currentReportIndex : 0;

  if (reports.length === 0) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center text-slate-600 max-w-xl mx-auto shadow-2xs space-y-4 my-8">
        <div className="relative inline-flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
          </span>
        </div>
        <div className="space-y-1.5">
          <h3 className="typo-app-h3 text-slate-800">กำลังโหลดข้อมูล...</h3>
          <p className="typo-app-subtext text-slate-500 max-w-md mx-auto">
            กำลังประมวลผลและเตรียมข้อมูลรายงานเอกสาร A4 กรุณารอสักครู่
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">

      {/* Mobile Smartphone Filter Toggle Bar (ซ่อนตัวกรองโดยอัตโนมัติในมุมมองสมาร์ทโฟนเพื่อเพิ่มพื้นที่อ่านเอกสาร) */}
      <div className="sm:hidden no-print">
        <button
          type="button"
          onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer shadow-2xs ${
            isMobileFilterOpen
              ? "bg-indigo-50/90 border-indigo-200 text-indigo-950"
              : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-700 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="text-xs font-black text-slate-900 tracking-tight truncate">
                ตัวกรองและค้นหาเอกสารรายงาน
              </span>
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shrink-0">
                  {activeFiltersCount}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 text-indigo-700 text-[11px] font-extrabold">
            <span>{isMobileFilterOpen ? "ซ่อนตัวกรอง" : "แตะเพื่อค้นหา"}</span>
            {isMobileFilterOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </div>
        </button>
      </div>

      {/* Time Period, Location & Search Filter Card (ตัวกรองค้นหาเอกสารรายงาน A4 ครบวงจร - ซ่อนอัตโนมัติในมุมมองสมาร์ทโฟน) */}
      <div className={`${isMobileFilterOpen ? "block" : "hidden"} sm:block bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5 no-print transition-all duration-200`}>
        
        {/* Filter Card Header Bar with Collapse/Expand Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-700 shrink-0 shadow-2xs">
              <SlidersHorizontal className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="typo-app-h3 text-slate-900 leading-tight">
                  ตัวกรองและค้นหาเอกสารรายงาน A4
                </h3>
                {hasActiveFilters && (
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-amber-500 text-white shadow-2xs animate-pulse">
                    กรองอยู่ {formatInternationalNumberWithComma(activeFiltersCount)} เงื่อนไข
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0">
                  พบ {formatInternationalNumberWithComma(filteredReports.length)} รายงาน
                </span>
              </div>
              <p className="typo-app-subtext text-slate-500 mt-0.5">
                กำหนดเงื่อนไขค้นหา พื้นที่ สังกัด กก.ตชด. ด้านเป้าหมาย กพด. และกรอบเวลาปฏิบัติงาน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="h-9 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                title="ล้างตัวกรองทั้งหมด"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-xs">ล้างตัวกรอง</span>
              </button>
            )}

            {/* Mobile-only button to close filter section */}
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(false)}
              className="sm:hidden h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
              title="ซ่อนตัวกรองในมุมมองมือถือ"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>ซ่อน</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={`h-9 px-3.5 rounded-xl text-xs font-black transition-all shadow-2xs cursor-pointer flex items-center gap-2 border ${
                isFilterExpanded
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100/80"
                  : "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700"
              }`}
            >
              {isFilterExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>ย่อตัวกรอง</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>ขยายตัวกรองค้นหา</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Selected Calendar Date Active Filter Banner */}
        {selectedCalendarDateKey && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs font-bold text-indigo-950">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>กำลังกรองเฉพาะรายงานวันที่: <span className="text-indigo-700 font-extrabold">{formatThaiFullDate(selectedCalendarDateKey)}</span> (พบ {formatInternationalNumberWithComma(filteredReports.length)} รายงาน)</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCalendarDateKey(null)}
              className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 rounded-lg text-xs font-extrabold transition cursor-pointer shrink-0"
            >
              แสดงรายงานทุกวันที่
            </button>
          </div>
        )}

        {schoolFilter && (
          <div className="bg-indigo-50 border border-indigo-200/80 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-bold text-indigo-950">
            <div className="flex items-center gap-2">
              <School className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>กำลังกรองเอกสารรายงานเฉพาะโรงเรียน: <span className="text-indigo-600 font-black">{schoolFilter}</span> (พบทั้งหมด {formatInternationalNumberWithComma(filteredReports.length)} รายการ)</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setTopSearch("");
                setSchoolFilter?.("");
              }}
              className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-lg transition-all shadow-2xs font-extrabold cursor-pointer text-xs shrink-0 self-end sm:self-auto"
            >
              แสดงรายงานโรงเรียนทั้งหมด
            </button>
          </div>
        )}

        {selectedGoal !== "all" && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-bold text-amber-950">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">
                กำลังกรองแสดงผลเฉพาะ<span className="text-amber-700 font-black mx-1">
                  {KOPODOT_GOALS.find(g => getGoalIdFromCode(g.code) === getGoalIdFromCode(selectedGoal))?.code || selectedGoal}: {KOPODOT_GOALS.find(g => getGoalIdFromCode(g.code) === getGoalIdFromCode(selectedGoal))?.title || ""}
                </span>
                (พบ {formatInternationalNumberWithComma(filteredReports.length)} รายการ • เรียงจากล่าสุดเป็นหน้าแรก)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedGoal("all");
                setGoalFilter?.("all");
              }}
              className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-lg transition-all shadow-2xs font-extrabold cursor-pointer text-xs shrink-0 self-end sm:self-auto flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>แสดงทั้งหมด (ทุกเป้าหมาย)</span>
            </button>
          </div>
        )}

        {/* Quick Search & GPS Filter Row - จัดระเบียบรวมเป็นหนึ่งเดียว (Unified Search & GPS Filter Bar) */}
        <div className="flex flex-col sm:flex-row items-stretch bg-white border border-slate-300 hover:border-indigo-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-xl shadow-2xs transition-all divide-y sm:divide-y-0 sm:divide-x divide-slate-200 overflow-hidden">
          {/* Keyword Search Input (Left part) */}
          <div className="relative flex-1 flex items-center min-w-0">
            <Search className="w-4 h-4 text-indigo-500 absolute left-3 sm:left-3.5 pointer-events-none shrink-0" />
            <input
              type="text"
              placeholder="ค้นหาชื่อโรงเรียน (หรือชื่อใกล้เคียง), กิจกรรม, วันที่ทำกิจกรรม, พิกัด GPS, ที่อยู่..."
              value={topSearch}
              onChange={(e) => setTopSearch(e.target.value)}
              className="w-full h-10 sm:h-11 text-xs pl-9 sm:pl-10 pr-9 bg-transparent border-0 font-bold text-slate-800 focus:outline-none placeholder:font-normal placeholder:text-slate-400 leading-normal"
            />
            {topSearch && (
              <button
                type="button"
                onClick={() => setTopSearch("")}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
                title="ล้างคำค้น"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* GPS Filter Dropdown (Right integrated part) */}
          <div className="relative flex items-center shrink-0 sm:w-60 bg-slate-50/70 hover:bg-slate-50 transition-colors">
            <div className="pl-3 pr-1 text-emerald-600 flex items-center pointer-events-none">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
            </div>
            <select
              value={gpsFilter}
              onChange={(e) => setGpsFilter(e.target.value as "all" | "has_gps" | "no_gps")}
              className={`w-full h-10 sm:h-11 text-xs pl-1.5 pr-7 bg-transparent border-0 font-bold cursor-pointer transition focus:outline-none appearance-none ${
                gpsFilter !== "all" ? "text-emerald-800 font-extrabold" : "text-slate-700"
              }`}
            >
              <option value="all">พิกัด GPS ทั้งหมด</option>
              <option value="has_gps">📍 มีพิกัด GPS ปักหมุดแล้ว</option>
              <option value="no_gps">❓ ยังไม่มีพิกัด GPS</option>
            </select>
            <div className="absolute right-2.5 pointer-events-none text-slate-400">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Expanded Detailed Filters (Cascading Locations & Time Periods) */}
        {isFilterExpanded && (
          <div className="space-y-4 pt-3 border-t border-indigo-100/80 animate-in fade-in-50 duration-200">
            {/* Cascading Location & Organization Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-2.5 min-w-0 w-full text-[15.5px]">
              {/* 1. จังหวัด */}
              <div className="space-y-1 min-w-0 text-[15.5px]" style={{ fontSize: "15.5px" }}>
                <label className="block text-[15.5px] font-extrabold text-indigo-800 truncate whitespace-nowrap flex items-center gap-1" style={{ fontSize: "15.5px" }} title={`1. จังหวัด (${provinces.length - 1})`}>
                  <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block shrink-0"></span>
                  <span className="truncate">1. จังหวัด ({provinces.length - 1})</span>
                </label>
                <select
                  value={selectedProvince}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  style={{ fontSize: "15.5px" }}
                  className={`w-full h-10 sm:h-11 text-[15.5px] px-2 sm:px-2.5 rounded-xl font-bold transition cursor-pointer shadow-2xs ${
                    selectedProvince !== "all"
                      ? "bg-indigo-50 border-2 border-indigo-600 text-indigo-950 ring-2 ring-indigo-500/20"
                      : "bg-white border-2 border-slate-300 text-slate-800 hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  }`}
                >
                  {provinces.map((prov) => (
                    <option key={prov} value={prov} style={{ fontSize: "15.5px" }}>
                      {prov === "all" ? "ทุกจังหวัด" : prov}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. อำเภอ */}
              <div className="space-y-1 min-w-0 text-[15.5px]" style={{ fontSize: "15.5px" }}>
                <label className="block text-[15.5px] font-extrabold text-blue-800 truncate whitespace-nowrap flex items-center gap-1" style={{ fontSize: "15.5px" }} title={`2. อำเภอ (${districts.length - 1})`}>
                  <span className="w-2 h-2 rounded-full bg-blue-600 inline-block shrink-0"></span>
                  <span className="truncate">2. อำเภอ ({districts.length - 1})</span>
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  disabled={districts.length <= 1}
                  style={{ fontSize: "15.5px" }}
                  className={`w-full h-10 sm:h-11 text-[15.5px] px-2 sm:px-2.5 rounded-xl font-bold transition cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 shadow-2xs ${
                    selectedDistrict !== "all"
                      ? "bg-blue-50 border-2 border-blue-600 text-blue-950 ring-2 ring-blue-500/20"
                      : "bg-white border-2 border-slate-300 text-slate-800 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  }`}
                >
                  {districts.map((dist) => (
                    <option key={dist} value={dist} style={{ fontSize: "15.5px" }}>
                      {dist === "all" ? "ทุกอำเภอ" : dist}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. ตำบล */}
              <div className="space-y-1 min-w-0 text-[15.5px]" style={{ fontSize: "15.5px" }}>
                <label className="block text-[15.5px] font-extrabold text-teal-800 truncate whitespace-nowrap flex items-center gap-1" style={{ fontSize: "15.5px" }} title={`3. ตำบล (${subdistricts.length - 1})`}>
                  <span className="w-2 h-2 rounded-full bg-teal-600 inline-block shrink-0"></span>
                  <span className="truncate">3. ตำบล ({subdistricts.length - 1})</span>
                </label>
                <select
                  value={selectedSubdistrict}
                  onChange={(e) => handleSubdistrictChange(e.target.value)}
                  disabled={subdistricts.length <= 1}
                  style={{ fontSize: "15.5px" }}
                  className={`w-full h-10 sm:h-11 text-[15.5px] px-2 sm:px-2.5 rounded-xl font-bold transition cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 shadow-2xs ${
                    selectedSubdistrict !== "all"
                      ? "bg-teal-50 border-2 border-teal-600 text-teal-950 ring-2 ring-teal-500/20"
                      : "bg-white border-2 border-slate-300 text-slate-800 hover:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  }`}
                >
                  {subdistricts.map((subdist) => (
                    <option key={subdist} value={subdist} style={{ fontSize: "15.5px" }}>
                      {subdist === "all" ? "ทุกตำบล" : subdist}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. หมู่บ้าน */}
              <div className="space-y-1 min-w-0 text-[15.5px]" style={{ fontSize: "15.5px" }}>
                <label className="block text-[15.5px] font-extrabold text-emerald-800 truncate whitespace-nowrap flex items-center gap-1" style={{ fontSize: "15.5px" }} title={`4. หมู่บ้าน (${villages.length - 1})`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block shrink-0"></span>
                  <span className="truncate">4. หมู่บ้าน ({villages.length - 1})</span>
                </label>
                <select
                  value={selectedVillage}
                  onChange={(e) => setSelectedVillage(e.target.value)}
                  disabled={villages.length <= 1}
                  style={{ fontSize: "15.5px" }}
                  className={`w-full h-10 sm:h-11 text-[15.5px] px-2 sm:px-2.5 rounded-xl font-bold transition cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 shadow-2xs ${
                    selectedVillage !== "all"
                      ? "bg-emerald-50 border-2 border-emerald-600 text-emerald-950 ring-2 ring-emerald-500/20"
                      : "bg-white border-2 border-slate-300 text-slate-800 hover:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  }`}
                >
                  {villages.map((v) => (
                    <option key={v} value={v} style={{ fontSize: "15.5px" }}>
                      {v === "all" ? "ทุกหมู่บ้าน" : `บ้าน${v}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. สังกัด กก.ตชด. */}
              <div className="space-y-1 min-w-0 text-[15.5px]" style={{ fontSize: "15.5px" }}>
                <label className="block text-[15.5px] font-extrabold text-purple-800 truncate whitespace-nowrap flex items-center gap-1" style={{ fontSize: "15.5px" }} title="5. สังกัด กก.ตชด.">
                  <span className="w-2 h-2 rounded-full bg-purple-600 inline-block shrink-0"></span>
                  <span className="truncate">5. สังกัด กก.ตชด.</span>
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  style={{ fontSize: "15.5px" }}
                  className={`w-full h-10 sm:h-11 text-[15.5px] px-2 sm:px-2.5 rounded-xl font-bold transition cursor-pointer shadow-2xs ${
                    selectedGroup !== "all"
                      ? "bg-purple-50 border-2 border-purple-600 text-purple-950 ring-2 ring-purple-500/20"
                      : "bg-white border-2 border-slate-300 text-slate-800 hover:border-purple-400 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  }`}
                >
                  {groups.map((g) => (
                    <option key={g} value={g} style={{ fontSize: "15.5px" }}>
                      {g === "all" ? "ทุกสังกัด (21-24)" : g.replace("กองกำกับการตำรวจตระเวนชายแดนที่", "กก.ตชด.")}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. ด้านเป้าหมาย กพด. */}
              <div className="space-y-1 min-w-0 text-[15.5px]" style={{ fontSize: "15.5px" }}>
                <label className="block text-[15.5px] font-extrabold text-amber-800 truncate whitespace-nowrap flex items-center gap-1" style={{ fontSize: "15.5px" }} title="6. ด้านเป้าหมาย (8 ด้าน)">
                  <span className="w-2 h-2 rounded-full bg-amber-600 inline-block shrink-0"></span>
                  <span className="truncate">6. ด้านเป้าหมาย</span>
                </label>
                <select
                  value={selectedGoal}
                  onChange={(e) => setSelectedGoal(e.target.value)}
                  style={{ fontSize: "15.5px" }}
                  className={`w-full h-10 sm:h-11 text-[15.5px] px-2 sm:px-2.5 rounded-xl font-bold transition cursor-pointer shadow-2xs ${
                    selectedGoal !== "all"
                      ? "bg-amber-50 border-2 border-amber-600 text-amber-950 ring-2 ring-amber-500/20"
                      : "bg-white border-2 border-slate-300 text-slate-800 hover:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  }`}
                >
                  <option value="all" style={{ fontSize: "15.5px" }}>ทุกด้าน (8 ด้าน)</option>
                  {KOPODOT_GOALS.map((g) => (
                    <option key={g.code} value={g.code} style={{ fontSize: "15.5px" }}>
                      {g.code}: {g.title.substring(0, 16)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Time & Period Filters Section (ปีการศึกษา, ไตรมาส, เดือน, สัปดาห์ที่เลือก) */}
            <div className="pt-3 border-t border-indigo-100/80">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11.5px] sm:text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4 text-indigo-600" />
                  <span>กรอบเวลาและสัปดาห์ปฏิบัติงาน (Time & Weekly Filter)</span>
                </div>
                {selectedWeek !== "all" && (
                  <span className="text-[11px] font-black text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-lg border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>เปิดใช้งานตัวกรองสัปดาห์</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                {/* 1. ปีการศึกษา */}
                <div className="space-y-1 min-w-0">
                  <label className="block text-[11px] font-extrabold text-indigo-800 truncate flex items-center gap-1" title="ปีการศึกษา">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block shrink-0"></span>
                    <span className="truncate">ปีการศึกษา</span>
                  </label>
                  <select
                    value={selectedAcademicYear}
                    onChange={(e) => setSelectedAcademicYear(e.target.value)}
                    className={`w-full h-9 sm:h-10 text-[11.5px] sm:text-xs px-2 sm:px-2.5 rounded-xl font-bold transition cursor-pointer shadow-2xs ${
                      selectedAcademicYear !== "all"
                        ? "bg-indigo-50 border-2 border-indigo-600 text-indigo-950 ring-2 ring-indigo-500/20"
                        : "bg-white border-2 border-slate-300 text-slate-800 hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    }`}
                  >
                    <option value="all">ทุกปีการศึกษา</option>
                    {availableAcademicYears.map((yr) => (
                      <option key={yr} value={yr}>
                        ปีการศึกษา {yr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. ไตรมาส */}
                <div className="space-y-1 min-w-0">
                  <label className="block text-[11px] font-extrabold text-amber-800 truncate flex items-center gap-1" title="ไตรมาส">
                    <span className="w-2 h-2 rounded-full bg-amber-600 inline-block shrink-0"></span>
                    <span className="truncate">ไตรมาส</span>
                  </label>
                  <select
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(e.target.value)}
                    className={`w-full h-9 sm:h-10 text-[11.5px] sm:text-xs px-2 sm:px-2.5 rounded-xl font-bold transition cursor-pointer shadow-2xs ${
                      selectedQuarter !== "all"
                        ? "bg-amber-50 border-2 border-amber-600 text-amber-950 ring-2 ring-amber-500/20"
                        : "bg-white border-2 border-slate-300 text-slate-800 hover:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    }`}
                  >
                    <option value="all">ทุกไตรมาส</option>
                    <option value="Q1">ไตรมาส 1 (ม.ค.-มี.ค.)</option>
                    <option value="Q2">ไตรมาส 2 (เม.ย.-มิ.ย.)</option>
                    <option value="Q3">ไตรมาส 3 (ก.ค.-ก.ย.)</option>
                    <option value="Q4">ไตรมาส 4 (ต.ค.-ธ.ค.)</option>
                  </select>
                </div>

                {/* 3. เดือน */}
                <div className="space-y-1 min-w-0">
                  <label className="block text-[11px] font-extrabold text-blue-800 truncate flex items-center gap-1" title="เดือน">
                    <span className="w-2 h-2 rounded-full bg-blue-600 inline-block shrink-0"></span>
                    <span className="truncate">เดือน</span>
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className={`w-full h-9 sm:h-10 text-[11.5px] sm:text-xs px-2 sm:px-2.5 rounded-xl font-bold transition cursor-pointer shadow-2xs ${
                      selectedMonth !== "all"
                        ? "bg-blue-50 border-2 border-blue-600 text-blue-950 ring-2 ring-blue-500/20"
                        : "bg-white border-2 border-slate-300 text-slate-800 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  >
                    <option value="all">ทุกเดือน</option>
                    {THAI_MONTHS.map((mName, idx) => (
                      <option key={idx + 1} value={String(idx + 1)}>
                        {mName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. สัปดาห์ที่เลือก (Selected Week) */}
                <div className="space-y-1 min-w-0">
                  <label className="block text-[11px] font-extrabold text-emerald-900 truncate flex items-center gap-1" title="สัปดาห์ที่เลือก">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block shrink-0"></span>
                    <span className="truncate font-black">สัปดาห์ที่เลือก ({availableWeeks.length} รอบ)</span>
                  </label>
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    className={`w-full h-9 sm:h-10 text-[11.5px] sm:text-xs px-2 sm:px-2.5 rounded-xl font-bold transition cursor-pointer shadow-2xs ${
                      selectedWeek !== "all"
                        ? "bg-emerald-50 border-2 border-emerald-600 text-emerald-950 ring-2 ring-emerald-500/20 font-extrabold"
                        : "bg-white border-2 border-slate-300 text-slate-800 hover:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    }`}
                  >
                    <option value="all">ทุกสัปดาห์ (สะสมทั้งหมด)</option>
                    {availableWeeks.map((wk) => (
                      <option key={wk.id} value={wk.id}>
                        {wk.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Controls Toolbar - จัดระเบียบใหม่ทั้งหมดระดับเวิลด์คลาส */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs no-print w-full min-w-0 flex flex-col gap-3.5 transition-all">
        {/* Row 1: Title and Status Info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 min-w-0 w-full pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Layers className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 
                  className="text-[12px] sm:text-[18px] lg:text-[20px] font-black text-slate-900 leading-tight tracking-tight"
                >
                  เครื่องมือจัดระเบียบและเลือกแสดงผลรายงาน A4
                </h3>
              </div>
              <p 
                style={{ fontSize: "9.5px" }}
                className="text-[9.5px] text-slate-500 mt-0.5 leading-snug font-medium"
              >
                สลับโหมดการดูเอกสาร เลือกหน้าเอกสาร และส่งออกรายงานฉบับสมบูรณ์
              </p>
            </div>
          </div>

          {/* Right Action Tools: Numerals Toggle + Batch Export Button */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {/* Numerals Format Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextVal = !useArabicNumerals;
                setUseArabicNumerals(nextVal);
                setGlobalArabicNumerals(nextVal);
              }}
              className={`h-9 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border shadow-2xs shrink-0 ${
                !useArabicNumerals
                  ? "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-xs"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
              title={useArabicNumerals ? "กำลังแสดงเลขสากล (1, 2, 3) - คลิกเพื่อสลับเป็นเลขไทยตามแบบราชการ" : "กำลังแสดงเลขไทย (๑, ๒, ๓) สำหรับหน้ากระดาษ A4 ตามระเบียบงานสารบรรณราชการ - คลิกเพื่อสลับเป็นเลขสากล"}
            >
              <span className="font-mono text-xs font-black">{useArabicNumerals ? "123" : "๑๒๓"}</span>
              <span className="text-[11px] whitespace-nowrap">{useArabicNumerals ? "เลขสากล" : "เลขไทยราชการ"}</span>
            </button>

            {/* Multi-Page Batch Export Button */}
            {onOpenBatchExport && (
              <button
                type="button"
                onClick={() => {
                  const selectedIds = selectedBatchIds.size > 0
                    ? Array.from(selectedBatchIds)
                    : filteredReports.map((r) => r.id);
                  onOpenBatchExport({
                    initialSelectedIds: selectedIds,
                    initialSchoolFilter: schoolFilter,
                    initialGoalFilter: goalFilter,
                    initialFormat: "combined-pdf",
                  });
                }}
                className="h-9 px-3.5 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 border border-indigo-500/80 active:scale-95"
                title={`ส่งออกหลายหน้าพร้อมกัน (${selectedBatchIds.size > 0 ? `เลือกไว้ ${selectedBatchIds.size} หน้า` : `ทั้งหมด ${filteredReports.length} หน้าตามตัวกรอง`})`}
              >
                <FolderDown className="w-3.5 h-3.5 text-indigo-100 shrink-0" />
                <span className="whitespace-nowrap font-black">ส่งออกหลายหน้า</span>
                <span className="bg-white/20 text-white text-[10.5px] px-1.5 py-0.5 rounded-full font-mono font-black">
                  {selectedBatchIds.size > 0 ? selectedBatchIds.size : filteredReports.length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Mode Switcher, Document Selector Dropdown, Pagination & Batch Selection */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5 min-w-0 w-full">
          {/* View Mode Switcher + Selected count indicator */}
          <div className="flex items-center justify-between sm:justify-start gap-2.5 shrink-0">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/90 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("stream")}
                className={`h-8 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                  viewMode === "stream" 
                    ? "bg-white text-indigo-900 shadow-2xs font-black" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title={`ดูเอกสารต่อเนื่อง (${formatInternationalNumberWithComma(Math.min(visibleCount, filteredReports.length))} หน้า)`}
              >
                <Layers className={`w-3.5 h-3.5 shrink-0 ${viewMode === "stream" ? "text-indigo-600" : "text-slate-400"}`} />
                <span className="whitespace-nowrap">ดูทั้งหมดต่อเนื่อง ({formatInternationalNumberWithComma(Math.min(visibleCount, filteredReports.length))})</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("single")}
                className={`h-8 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                  viewMode === "single" 
                    ? "bg-white text-indigo-900 shadow-2xs font-black" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="ดูเฉพาะหน้าเอกสารที่เลือก"
              >
                <FileText className={`w-3.5 h-3.5 shrink-0 ${viewMode === "single" ? "text-indigo-600" : "text-slate-400"}`} />
                <span className="whitespace-nowrap">ดูทีละหน้า</span>
              </button>
            </div>

            {selectedBatchIds.size > 0 && (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold animate-fadeIn">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                <span>เลือกแล้ว {formatInternationalNumberWithComma(selectedBatchIds.size)} หน้า</span>
              </div>
            )}
          </div>

          {/* Document Selector & Quick Prev/Next Navigation + Integrated Select All Button */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 min-w-0 flex-1 xl:justify-end">
            <select
              value={currentReport ? currentReport.id : ""}
              onChange={(e) => {
                const targetId = e.target.value;
                onSelectReport(targetId);
                if (viewMode === "stream") {
                  setTimeout(() => {
                    const el = document.getElementById(`report-sheet-${targetId}`);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }, 120);
                }
              }}
              className="flex-1 min-w-[200px] h-9 text-xs px-3 bg-white border border-slate-300 hover:border-indigo-400 focus:border-indigo-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-800 cursor-pointer shadow-2xs transition-all truncate"
            >
              {filteredReports.map((r, idx) => (
                <option key={r.id} value={r.id}>
                  #{idx + 1} [{r.id}] {r.activityName.substring(0, 35)}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 shrink-0 self-auto">
              {/* Quick Page Flip Navigation */}
              {filteredReports.length > 1 && (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/90 shrink-0">
                  <button
                    type="button"
                    disabled={safeCurrentIndex <= 0}
                    onClick={() => {
                      if (safeCurrentIndex > 0 && filteredReports[safeCurrentIndex - 1]) {
                        const prevId = filteredReports[safeCurrentIndex - 1].id;
                        onSelectReport(prevId);
                        if (viewMode === "stream") {
                          setTimeout(() => {
                            const el = document.getElementById(`report-sheet-${prevId}`);
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                          }, 120);
                        }
                      }
                    }}
                    className="w-7 h-7 bg-white hover:bg-indigo-50 disabled:opacity-30 disabled:pointer-events-none text-indigo-700 font-black rounded-lg flex items-center justify-center text-xs transition cursor-pointer shadow-2xs active:scale-95"
                    title="เอกสารหน้าก่อนหน้า"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-black text-slate-800 px-2 whitespace-nowrap min-w-[50px] text-center">
                    {safeCurrentIndex + 1} / {filteredReports.length}
                  </span>
                  <button
                    type="button"
                    disabled={safeCurrentIndex >= filteredReports.length - 1}
                    onClick={() => {
                      if (safeCurrentIndex < filteredReports.length - 1 && filteredReports[safeCurrentIndex + 1]) {
                        const nextId = filteredReports[safeCurrentIndex + 1].id;
                        onSelectReport(nextId);
                        if (viewMode === "stream") {
                          setTimeout(() => {
                            const el = document.getElementById(`report-sheet-${nextId}`);
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                          }, 120);
                        }
                      }
                    }}
                    className="w-7 h-7 bg-white hover:bg-indigo-50 disabled:opacity-30 disabled:pointer-events-none text-indigo-700 font-black rounded-lg flex items-center justify-center text-xs transition cursor-pointer shadow-2xs active:scale-95"
                    title="เอกสารหน้าถัดไป"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Quick Select All / Deselect All for Batch Export - รวมไว้ในแถวเดียวกับส่วนที่เลือกอย่างลงตัว */}
              {onOpenBatchExport && (
                <div className="flex items-center shrink-0">
                  {selectedBatchIds.size < filteredReports.length ? (
                    <button
                      type="button"
                      onClick={handleSelectAllBatch}
                      className="h-9 px-3 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 border border-slate-300 hover:border-indigo-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                      title="เลือกเอกสารที่แสดงทั้งหมดสำหรับส่งออกกลุ่ม"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="whitespace-nowrap">เลือกทั้งหมด</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleClearBatchSelect}
                      className="h-9 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                      title="ยกเลิกการเลือกทั้งหมด"
                    >
                      <X className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="whitespace-nowrap">ล้างที่เลือก</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CSS Styles for Print rendering */}
      <style>{`
        .sarabun-font, .sarabun-font * {
          font-family: 'Sarabun', 'TH Sarabun New', 'TH SarabunPSK', sans-serif !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body, #root, main, div {
            background: #ffffff !important;
            box-shadow: none !important;
          }
          .no-print, .no-print * {
            display: none !important;
            height: 0 !important;
            width: 0 !important;
            overflow: hidden !important;
          }
          body * {
            visibility: hidden;
          }
          .print-page, .print-page * {
            visibility: visible !important;
          }
          .a4-scaler-wrapper {
            transform: none !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-page {
            position: relative !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 auto !important;
            padding: 15mm 20mm 15mm 30mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            page-break-after: always;
            page-break-inside: avoid;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* Main Document List / Stream Container */}
      {filteredReports.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-3 shadow-xs">
          <Filter className="w-10 h-10 text-indigo-400 mx-auto animate-pulse" />
          <h4 className="font-bold text-slate-800 text-base">ไม่พบเอกสารรายงานที่ตรงกับตัวกรอง</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            ลองปรับเปลี่ยนคำค้นหา หรือเลือกปีการศึกษา/ไตรมาส/เดือนเป็น "ทั้งหมด" เพื่อดูเอกสารรายงานทั้งหมด
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition cursor-pointer inline-flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>ล้างตัวกรองทั้งหมด</span>
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {displayedReports.map((itemReport, idx) => {
            const actualIndex = filteredReports.findIndex((r) => r.id === itemReport.id);
            const sheetPageIndex = actualIndex !== -1 ? actualIndex : idx;
            return (
              <SingleA4PaperSheet
                key={itemReport.id}
                report={itemReport}
                reports={filteredReports}
                pageIndex={sheetPageIndex}
                totalPages={filteredReports.length}
                isSelected={currentReport ? itemReport.id === currentReport.id : false}
                onSelectReport={onSelectReport}
                onEditReport={onEditReport}
                onUpdateReport={onUpdateReport}
                isBatchSelected={selectedBatchIds.has(itemReport.id)}
                onToggleBatchSelect={handleToggleBatchSelect}
                onOpenBatchExport={onOpenBatchExport}
                selectedBatchIds={Array.from(selectedBatchIds)}
                batchSelectedCount={selectedBatchIds.size}
              />
            );
          })}

          {/* Load More Reports Button (เมื่อแสดงโหมดดูเอกสารโดยตรง) */}
          {viewMode === "stream" && (
            <div className="text-center py-6 no-print space-y-3">
              {visibleCount < filteredReports.length ? (
                <div className="space-y-2">
                  <button
                    onClick={handleLoadMore}
                    className="bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-sm px-8 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all inline-flex items-center space-x-2 cursor-pointer border border-blue-500"
                  >
                    <ChevronDown className="w-5 h-5 animate-bounce" />
                    <span>ดูรายงานเพิ่มเติม (แสดงอีก 20 หน้า)</span>
                    <span className="bg-blue-800 text-blue-100 text-xs px-2 py-0.5 rounded-full font-mono ml-2">
                      +{Math.min(20, filteredReports.length - visibleCount)}
                    </span>
                  </button>
                  <p className="text-[11px] text-slate-500 font-medium">
                    กำลังแสดงผล {formatInternationalNumberWithComma(visibleCount)} หน้า จากทั้งหมด {formatInternationalNumberWithComma(filteredReports.length)} รายงาน (เหลืออีก {formatInternationalNumberWithComma(filteredReports.length - visibleCount)} รายงาน)
                  </p>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>แสดงผลรายงานทั้งหมด {formatInternationalNumberWithComma(filteredReports.length)} หน้า ครบถ้วนแล้ว</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showLocalQrModal && (
        <ReportQrCodeModal
          isOpen={showLocalQrModal}
          onClose={() => setShowLocalQrModal(false)}
        />
      )}

      {/* Floating Multi-Page Batch Export Bar */}
      {selectedBatchIds.size > 0 && onOpenBatchExport && (
        <div className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-2 sm:gap-3 max-w-[95vw] flex-wrap sm:flex-nowrap animate-in slide-in-from-bottom-5 duration-300 no-print">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
              {selectedBatchIds.size}
            </div>
            <div className="text-xs">
              <span className="font-extrabold text-white">เลือกไว้ {selectedBatchIds.size} หน้า</span>
              <span className="text-slate-400 text-[10px] hidden sm:inline ml-1">จาก {filteredReports.length} หน้า</span>
            </div>
          </div>

          <div className="h-5 w-px bg-white/20 hidden sm:block shrink-0" />

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                onOpenBatchExport({
                  initialSelectedIds: Array.from(selectedBatchIds),
                  initialSchoolFilter: schoolFilter,
                  initialGoalFilter: goalFilter,
                  initialFormat: "combined-pdf",
                });
              }}
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs px-2.5 sm:px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              title="ส่งออกเอกสารที่เลือกทั้งหมดรวมเป็นไฟล์ PDF เดียวหลายหน้า"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-200" />
              <span>รวมเป็น PDF เดียว ({selectedBatchIds.size} หน้า)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenBatchExport({
                  initialSelectedIds: Array.from(selectedBatchIds),
                  initialSchoolFilter: schoolFilter,
                  initialGoalFilter: goalFilter,
                  initialFormat: "zip-pdf",
                });
              }}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs px-2.5 sm:px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              title="ส่งออกเอกสารที่เลือกแยกเป็นไฟล์ PDF ในโฟลเดอร์ ZIP"
            >
              <FolderDown className="w-3.5 h-3.5 text-blue-200" />
              <span>ZIP (PDF)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenBatchExport({
                  initialSelectedIds: Array.from(selectedBatchIds),
                  initialSchoolFilter: schoolFilter,
                  initialGoalFilter: goalFilter,
                  initialFormat: "zip-png",
                });
              }}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer shadow-xs whitespace-nowrap hidden md:flex"
              title="ส่งออกเอกสารที่เลือกเป็นไฟล์ภาพ PNG ในโฟลเดอร์ ZIP"
            >
              <FileImage className="w-3.5 h-3.5 text-emerald-200" />
              <span>ZIP (PNG)</span>
            </button>

            <button
              type="button"
              onClick={handleClearBatchSelect}
              className="text-slate-400 hover:text-white text-xs px-2 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title="ยกเลิกการเลือกทั้งหมด"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ล้าง</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
