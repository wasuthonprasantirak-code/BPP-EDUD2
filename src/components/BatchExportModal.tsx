import { useState, useRef, useMemo, useEffect } from "react";
import JSZip from "jszip";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { ActivityReport, KOPODOT_GOALS, getGoalIdFromCode } from "../types";
import { OFFICIAL_INDICATORS } from "../data/indicatorsData";
import { ROYAL_EMBLEM_IMAGE } from "../data/emblemLogo";
import { OFFICIAL_TARGET_SCHOOLS, getPrincipalBySchoolName, isSchoolMatch, getSchoolAddressBySchoolName } from "../data/schoolsData";
import { safeHtml2Canvas } from "../lib/html2canvasFix";
import { sanitizeWindowsFilename, triggerWindowsFileDownload, triggerCrossPlatformDownload, getAdaptiveCanvasScale, isMobileOrTablet } from "../lib/windowsUtils";
import { findIndicatorForReport, getGoalsContext } from "../lib/kopodotGoalsMapping";
import { SmartFaceImage } from "./SmartFaceImage";
import { AdjustableSignature } from "./AdjustableSignature";
import { 
  Download, 
  FileText, 
  FileImage, 
  Archive, 
  CheckSquare, 
  Square, 
  Filter, 
  Search, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  School, 
  Building2, 
  ChevronRight, 
  Printer, 
  Sparkles,
  FolderTree,
  ListFilter
} from "lucide-react";

export interface BatchExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: ActivityReport[];
  initialSelectedIds?: string[];
  initialSchoolFilter?: string;
  initialGoalFilter?: string;
  initialFormat?: "zip-pdf" | "zip-png" | "combined-pdf";
}

// Convert numbers to Thai numerals
const toThaiNumerals = (num: number | string): string => {
  if (num === null || num === undefined) return "";
  const arabicToThaiMap: Record<string, string> = {
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9'
  };
  return String(num).replace(/[0-9]/g, (digit) => arabicToThaiMap[digit] || digit);
};

const THAI_MONTHSOk = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const formatThaiFullDate = (dateStr: string): string => {
  if (!dateStr) return toThaiNumerals("6 พฤษภาคม 2569");
  
  const slashParts不易 = dateStr.trim().split('/');
  if (slashParts不易.length === 3) {
    const day = parseInt(slashParts不易[0], 10);
    const month = parseInt(slashParts不易[1], 10);
    let year = parseInt(slashParts不易[2], 10);
    if (year < 2400) year += 543;
    if (!isNaN(day) && month >= 1 && month <= 12) {
      return toThaiNumerals(`${day} ${THAI_MONTHSOk[month - 1]} ${year}`);
    }
  }

  const dashParts = dateStr.trim().split('-');
  if (dashParts.length === 3 && dashParts[0].length === 4) {
    let year = parseInt(dashParts[0], 10);
    const month很好 = parseInt(dashParts[1], 10);
    const day = parseInt(dashParts[2], 10);
    if (year < 2400) year += 543;
    if (!isNaN(day) && month很好 >= 1 && month很好 <= 12) {
      return toThaiNumerals(`${day} ${THAI_MONTHSOk[month很好 - 1]} ${year}`);
    }
  }

  return toThaiNumerals(dateStr);
};

const getSchoolHeader = (schoolName: string): string => {
  const match = OFFICIAL_TARGET_SCHOOLS.find(s => isSchoolMatch(schoolName, s.name));
  if (!match) {
    let cleanName = schoolName;
    if (cleanName.startsWith("โรงเรียนตำรวจตระเวนชายแดน")) {
      cleanName = cleanName.replace("โรงเรียนตำรวจตระเวนชายแดน", "รร.ตชด.");
    } else if (cleanName.startsWith("โรงเรียน")) {
      cleanName = cleanName.replace("โรงเรียน", "รร.");
    }
    return toThaiNumerals(`รร.ตชด.สังกัด บก.ตชด.ภาค 2 ${cleanName}`);
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

  return toThaiNumerals(`รร.ตชด.สังกัด ${region} ${abbName}`);
};

const getThaiAffiliation = (schoolName: string): string => {
  const match不易 = OFFICIAL_TARGET_SCHOOLS.find(s => isSchoolMatch(schoolName, s.name));
  if (!match不易) return "กก.ตชด.21";
  const group = match不易.groupName;
  if (group.includes("กองกำกับการตำรวจตระเวนชายแดนที่")) {
    const num = group.replace(/[^\d]/g, "");
    return `กก.ตชด.${toThaiNumerals(num)}`;
  }
  return toThaiNumerals(group);
};

const getThaiAddress = (schoolName: string): string => {
  const directAddr = getSchoolAddressBySchoolName(schoolName);
  if (directAddr) {
    let cleanAddr = directAddr
      .replace(/หมู่ที่\s*/g, "หมู่ ")
      .replace(/ตำบล\s*/g, "ต.")
      .replace(/อำเภอ\s*/g, "อ.");
    return toThaiNumerals(cleanAddr);
  }
  const match = OFFICIAL_TARGET_SCHOOLS.find(s => isSchoolMatch(schoolName, s.name));
  if (!match) return "หมู่ 3 บ้านซำปะโต ต.อาโพน อ.บัวเชด จ.สุรินทร์";
  const villageNoStr = match.villageNo ? `หมู่ ${toThaiNumerals(match.villageNo)}` : "";
  const villageStr = match.village ? `บ้าน${match.village}` : "";
  const subdist = match.subdistrict ? `ต.${match.subdistrict}` : "";
  const dist = match.district ? `อ.${match.district}` : "";
  const prov = match.province ? `จ.${match.province}` : "";
  return toThaiNumerals(`${villageNoStr} ${villageStr} ${subdist} ${dist} ${prov}`.trim().replace(/\s+/g, ' '));
};

// getGoalsContext re-exported from kopodotGoalsMapping

const parseFullNameAndRank = (fullName: string): { rank: string; cleanName: string } => {
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
  const year很好 = toThaiNumerals(String(now.getFullYear() + 543));
  const hours = toThaiNumerals(String(now.getHours()).padStart(2, "0"));
  const minutes = toThaiNumerals(String(now.getMinutes()).padStart(2, "0"));
  return `${date}/${month}/${year很好} ${hours}:${minutes} น.`;
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
      const mm很好 = String(d.getMinutes()).padStart(2, "0");
      return `รายงานเมื่อ: ${toThaiNumerals(`${day}/${month}/${year}`)} ${toThaiNumerals(`${hh}:${mm很好}`)} น.`;
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

const renderWithParenthesesBreak = (text: string) => {
  if (!text) return "";
  if (text.includes("(")) {
    const openIdx = text.indexOf("(");
    const line1 = text.substring(0, openIdx).trim();
    const line2力 = text.substring(openIdx).trim();
    return (
      <span className="block text-center">
        <span className="block">{line1}</span>
        <span className="block">{line2力}</span>
      </span>
    );
  }
  return text;
};

export function BatchExportModal({
  isOpen,
  onClose,
  reports,
  initialSelectedIds,
  initialSchoolFilter,
  initialGoalFilter,
  initialFormat,
}: BatchExportModalProps) {
  // Filter States
  const [selectedAffiliation, setSelectedAffiliation] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<string>(initialSchoolFilter || "all");
  const [selectedGoal, setSelectedGoal] = useState<string>(initialGoalFilter || "all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("all");

  // Selection States
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      return new Set(initialSelectedIds);
    }
    // Default to matching reports if school filter is set, otherwise select all available
    if (initialSchoolFilter && initialSchoolFilter !== "all") {
      const matching = reports.filter((r) => isSchoolMatch(r.schoolName || "", initialSchoolFilter));
      if (matching.length > 0) return new Set(matching.map((r) => r.id));
    }
    return new Set(reports.slice(0, 50).map((r) => r.id));
  });

  // Export Settings
  const [exportFormat, setExportFormat] = useState<"zip-pdf" | "zip-png" | "combined-pdf">(
    initialFormat || "combined-pdf"
  );

  // Sync state when modal is opened with new options
  useEffect(() => {
    if (isOpen) {
      if (initialSelectedIds && initialSelectedIds.length > 0) {
        setSelectedReportIds(new Set(initialSelectedIds));
      } else {
        const schoolToMatch = initialSchoolFilter || selectedSchool;
        const goalToMatch = initialGoalFilter || selectedGoal;
        const matching = reports.filter((r) => {
          if (schoolToMatch && schoolToMatch !== "all" && !isSchoolMatch(r.schoolName || "", schoolToMatch)) return false;
          if (goalToMatch && goalToMatch !== "all" && r.goalCode !== goalToMatch) return false;
          return true;
        });
        if (matching.length > 0) {
          setSelectedReportIds(new Set(matching.map((r) => r.id)));
        } else {
          setSelectedReportIds(new Set(reports.slice(0, 50).map((r) => r.id)));
        }
      }
      if (initialSchoolFilter) {
        setSelectedSchool(initialSchoolFilter);
      }
      if (initialGoalFilter) {
        setSelectedGoal(initialGoalFilter);
      }
      if (initialFormat) {
        setExportFormat(initialFormat);
      }
    }
  }, [isOpen, initialSelectedIds, initialSchoolFilter, initialGoalFilter, initialFormat, reports]);
  const [folderStructure, setFolderStructure] = useState<"flat" | "by-school" | "by-goal">("by-school");

  // Batch Processing States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressCount, setProgressCount] = useState<number>(0);
  const [totalToProcess, setTotalToProcess] = useState<number>(0);
  const [currentProcessingTitle, setCurrentProcessingTitle] = useState<string>("");
  const [renderReport, setRenderReport] = useState<ActivityReport | null>(null);
  const [cancelRequested, setCancelRequested] = useState<boolean>(false);

  const offscreenContainerRef = useRef<HTMLDivElement>(null);

  // Group Affiliations
  const affiliations = ["กก.ตชด.21", "กก.ตชด.22", "กก.ตชด.23", "กก.ตชด.24"];

  // Filtered List
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const affil = getThaiAffiliation(r.schoolName || "");
      if (selectedAffiliation !== "all" && affil !== selectedAffiliation) return false;

      if (selectedSchool !== "all") {
        if (!isSchoolMatch(r.schoolName || "", selectedSchool)) return false;
      }

      if (selectedGoal !== "all" && r.goalCode !== selectedGoal) return false;

      if (selectedAcademicYear !== "all") {
        if (((r as any).academicYear || "2569") !== selectedAcademicYear) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (r.activityName || "").toLowerCase().includes(q);
        const matchSchool = (r.schoolName || "").toLowerCase().includes(q);
        const matchId = (r.id || "").toLowerCase().includes(q);
        const matchDesc = (r.details || r.qualitativeOutcome || r.quantitativeOutcome || "").toLowerCase().includes(q);
        if (!matchTitle && !matchSchool && !matchId && !matchDesc) return false;
      }

      return true;
    });
  }, [reports, selectedAffiliation, selectedSchool, selectedGoal, selectedAcademicYear, searchQuery]);

  // Select all / Deselect all
  const handleSelectAllFiltered = () => {
    const nextSet = new Set(selectedReportIds);
    filteredReports.forEach((r) => nextSet.add(r.id));
    setSelectedReportIds(nextSet);
  };

  const handleDeselectAllFiltered = () => {
    const nextSet = new Set(selectedReportIds);
    filteredReports.forEach((r) => nextSet.delete(r.id));
    setSelectedReportIds(nextSet);
  };

  const toggleReportSelection = (id: string) => {
    const nextSet = new Set(selectedReportIds);
    if (nextSet.has(id)) {
      nextSet.delete(id);
    } else {
      nextSet.add(id);
    }
    setSelectedReportIds(nextSet);
  };

  // Helper function to render a single report to canvas with timeout safeguard
  const waitForImages = async (element: HTMLElement) => {
    const images = Array.from(element.querySelectorAll("img"));
    const imagePromises = images.map((img) => {
      if (img.complete) {
        if (img.decode) {
          return img.decode().catch(() => {});
        }
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (!done) {
            done = true;
            resolve();
          }
        };
        img.onload = () => {
          if (img.decode) {
            img.decode().then(finish).catch(finish);
          } else {
            finish();
          }
        };
        img.onerror = finish;
        setTimeout(finish, 1500);
      });
    });

    await Promise.race([
      Promise.all(imagePromises),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  };

  const renderReportToCanvas = async (reportItem: ActivityReport): Promise<HTMLCanvasElement | null> => {
    // 1. First priority: Check if this report is already mounted in the DOM
    const liveDocSheet = (
      document.querySelector(`#report-sheet-${reportItem.id} .a4-page`) ||
      document.querySelector(`#report-sheet-${reportItem.id} .a4-paper-sheet`) ||
      document.querySelector(`#report-sheet-${reportItem.id} [id*="a4-print-area"]`)
    ) as HTMLElement | null;

    if (liveDocSheet) {
      try {
        await waitForImages(liveDocSheet);
        const isMobile = isMobileOrTablet();
        const adaptiveScale = isMobile ? 1.5 : getAdaptiveCanvasScale(2.0);
        const canvas = await safeHtml2Canvas(liveDocSheet, {
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
        if (canvas) return canvas;
      } catch (liveErr) {
        console.warn(`Failed capturing live sheet for report ${reportItem.id}, using offscreen:`, liveErr);
      }
    }

    // 2. Offscreen rendering
    setRenderReport(reportItem);
    // Allow React state to flush and DOM element to re-render offscreen
    await new Promise((resolve) => setTimeout(resolve, 250));

    if (!offscreenContainerRef.current) return null;

    const paperElement = (
      offscreenContainerRef.current.querySelector(".a4-paper-sheet") ||
      offscreenContainerRef.current.querySelector(".a4-page") ||
      offscreenContainerRef.current.firstElementChild
    ) as HTMLElement | null;

    if (!paperElement) return null;

    try {
      await waitForImages(paperElement);
      const isMobile = isMobileOrTablet();
      const adaptiveScale = isMobile ? 1.5 : getAdaptiveCanvasScale(2.0);

      const canvas = await safeHtml2Canvas(paperElement, {
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
        onclone: (clonedDoc, clonedEl) => {
          if (clonedEl instanceof HTMLElement) {
            clonedEl.style.opacity = "1";
            clonedEl.style.visibility = "visible";
            clonedEl.style.transform = "none";
          }
          clonedDoc.documentElement.style.fontSize = "16px";
          clonedDoc.body.style.fontSize = "16px";
        },
      });
      return canvas;
    } catch (err) {
      console.error(`Failed to capture canvas for report ${reportItem.id}:`, err);
      return null;
    }
  };

  // Execute Batch Export Function
  const handleStartBatchExport = async () => {
    const itemsToExport = reports.filter((r) => selectedReportIds.has(r.id));
    if (itemsToExport.length === 0) {
      alert("กรุณาเลือกอย่างน้อย 1 เอกสารเพื่อเริ่มทำการส่งออกกลุ่ม");
      return;
    }

    setIsProcessing(true);
    setCancelRequested(false);
    setProgressCount(0);
    setTotalToProcess(itemsToExport.length);

    let successCount = 0;

    try {
      if (exportFormat === "zip-pdf" || exportFormat === "zip-png") {
        const zip = new JSZip();

        for (let i = 0; i < itemsToExport.length; i++) {
          if (cancelRequested) break;

          const item = itemsToExport[i];
          setProgressCount(i + 1);
          setCurrentProcessingTitle(`[${item.id}] ${item.schoolName} - ${(item.activityName || "กิจกรรม").substring(0, 25)}...`);

          const canvas = await renderReportToCanvas(item);
          if (canvas) {
            successCount++;
            const affilStr = getThaiAffiliation(item.schoolName || "").replace(/\s+/g, "");
            const schoolClean = (item.schoolName || "รร.ตชด.").replace(/[^\u0E00-\u0E7Fa-zA-Z0-9_.]/g, "_");
            const goalClean = (item.goalCode || "ด้านที่1").replace(/\s+/g, "");
            const fileName = `${item.id}_${schoolClean}_${goalClean}`;

            let folderPath = "";
            if (folderStructure === "by-school") {
              folderPath = `${affilStr}/${schoolClean}/`;
            } else if (folderStructure === "by-goal") {
              folderPath = `${goalClean}/`;
            }

            if (exportFormat === "zip-pdf") {
              // Convert Canvas to jsPDF A4 using fast JPEG or PNG based on platform
              const isMobile = isMobileOrTablet();
              const imgData = canvas.toDataURL(isMobile ? "image/jpeg" : "image/png", isMobile ? 0.90 : undefined);
              const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
                compress: true,
              });
              pdf.addImage(imgData, isMobile ? "JPEG" : "PNG", 0, 0, 210, 297, undefined, "FAST");
              const pdfArrayBuffer = pdf.output("arraybuffer");
              zip.file(`${folderPath}${fileName}.pdf`, pdfArrayBuffer);
            } else if (exportFormat === "zip-png") {
              const base64Data = canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
              zip.file(`${folderPath}${fileName}.png`, base64Data, { base64: true });
            }

            // Immediately reclaim WebKit/VRAM bitmap memory buffer
            canvas.width = 1;
            canvas.height = 1;
          }

          // Asynchronous non-blocking yield to allow GC to reclaim memory
          const yieldMs = (i % 3 === 0) ? 80 : 25;
          await new Promise((resolve) => setTimeout(resolve, yieldMs));
        }

        // Clear offscreen renderer state to free memory
        setRenderReport(null);

        if (!cancelRequested && successCount > 0) {
          setCurrentProcessingTitle("กำลังบีบอัดไฟล์ ZIP ชุดข้อมูลเอกสาร...");
          const content = await zip.generateAsync({ type: "blob" });
          const zipFileName = sanitizeWindowsFilename(`รายงาน_กพด5_ชุดรวม_${successCount}_ฉบับ_${new Date().toISOString().slice(0, 10)}.zip`);
          await triggerCrossPlatformDownload(content, zipFileName, {
            mimeType: "application/zip",
            title: zipFileName,
          });
        } else if (!cancelRequested && successCount === 0) {
          alert("ไม่สามารถเรนเดอร์เอกสารสำหรับจัดทำ ZIP ได้ กรุณาลองใหม่อีกครั้ง");
        }
      } else if (exportFormat === "combined-pdf") {
        // Multi-page combined PDF
        let pdf: jsPDF | null = null;
        const isMobile = isMobileOrTablet();

        for (let i = 0; i < itemsToExport.length; i++) {
          if (cancelRequested) break;

          const item = itemsToExport[i];
          setProgressCount(i + 1);
          setCurrentProcessingTitle(`[${item.id}] ${item.schoolName} - ${(item.activityName || "กิจกรรม").substring(0, 25)}...`);

          const canvas = await renderReportToCanvas(item);
          if (canvas) {
            successCount++;
            const imgData = canvas.toDataURL(isMobile ? "image/jpeg" : "image/png", isMobile ? 0.90 : undefined);
            const imgFormat = isMobile ? "JPEG" : "PNG";
            if (!pdf) {
              pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
                compress: true,
              });
              pdf.addImage(imgData, imgFormat, 0, 0, 210, 297, undefined, "FAST");
            } else {
              pdf.addPage("a4", "portrait");
              pdf.addImage(imgData, imgFormat, 0, 0, 210, 297, undefined, "FAST");
            }

            // Immediately reclaim WebKit/VRAM bitmap memory buffer
            canvas.width = 1;
            canvas.height = 1;
          }

          // Asynchronous non-blocking yield to maintain UI responsiveness and allow GC
          const yieldMs = (i % 3 === 0) ? 80 : 25;
          await new Promise((resolve) => setTimeout(resolve, yieldMs));
        }

        // Clear offscreen renderer state to free memory
        setRenderReport(null);

        if (pdf && !cancelRequested && successCount > 0) {
          setCurrentProcessingTitle("กำลังประมวลผลบันทึกไฟล์ PDF รวมเล่ม...");
          const pdfName = sanitizeWindowsFilename(`รายงาน_กพด5_รวมเล่ม_${successCount}_ฉบับ_${new Date().toISOString().slice(0, 10)}.pdf`);
          const pdfBlob = pdf.output("blob");
          await triggerCrossPlatformDownload(pdfBlob, pdfName, {
            mimeType: "application/pdf",
            title: pdfName,
          });
        } else if (!cancelRequested && successCount === 0) {
          alert("ไม่สามารถเรนเดอร์เอกสารสำหรับรวมเล่ม PDF ได้ กรุณาลองใหม่อีกครั้ง");
        }
      }
    } catch (err) {
      console.error("Batch Export Failed:", err);
      alert("เกิดข้อผิดพลาดในการสร้างไฟล์ส่งออกกลุ่ม กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsProcessing(false);
      setRenderReport(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-400 shrink-0">
              <Archive className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 
                className="font-extrabold text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-white tracking-tight flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis"
                title="ส่งออกเอกสารแบบกลุ่ม (Smart Batch Export & ZIP Bundler)"
              >
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">ส่งออกเอกสารแบบกลุ่ม (Smart Batch Export & ZIP Bundler)</span>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full border border-amber-400/30 font-bold shrink-0 hidden sm:inline-block">
                  ระบบอัตโนมัติ
                </span>
              </h2>
              <p 
                className="text-[11px] sm:text-xs text-blue-200/90 mt-0.5 font-medium whitespace-nowrap overflow-hidden text-ellipsis"
                title="เลือกขอบเขตรายงาน และสร้างไฟล์ ZIP บรรจุ PDF/PNG แยกตามโรงเรียน/เป้าหมาย กพด.5 ครบทั้ง 53 โรงเรียน"
              >
                เลือกขอบเขตรายงาน และสร้างไฟล์ ZIP บรรจุ PDF/PNG แยกตามโรงเรียน/เป้าหมาย กพด.5 ครบทั้ง 53 โรงเรียน
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* Top Filter Controls */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-indigo-950 uppercase tracking-wider">
                <ListFilter className="w-4 h-4 text-indigo-600" />
                <span>ตัวกรองการเลือกขอบเขตเอกสาร</span>
              </div>
              <span className="text-xs font-extrabold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                พบ {filteredReports.length} รายงาน
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Filter 1: กองกำกับการ */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">สังกัด กก.ตชด.</label>
                <select
                  value={selectedAffiliation}
                  onChange={(e) => {
                    setSelectedAffiliation(e.target.value);
                    setSelectedSchool("all");
                  }}
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">-- ทุกสังกัด (กก.ตชด. 21-24) --</option>
                  {affiliations.map((affil) => (
                    <option key={affil} value={affil}>{affil}</option>
                  ))}
                </select>
              </div>

              {/* Filter 2: โรงเรียน */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">โรงเรียนเป้าหมาย</label>
                <select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">-- ทุกโรงเรียน (53 รร.) --</option>
                  {OFFICIAL_TARGET_SCHOOLS.filter((s) => {
                    if (selectedAffiliation === "all") return true;
                    const groupNum = s.groupName.replace(/[^\d]/g, "");
                    const targetNum = selectedAffiliation.replace(/[^\d]/g, "");
                    return groupNum === targetNum;
                  }).map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Filter 3: ด้านเป้าหมาย กพด.5 */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">ด้านเป้าหมาย กพด.5</label>
                <select
                  value={selectedGoal}
                  onChange={(e) => setSelectedGoal(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">-- ทุกด้านเป้าหมาย (ด้านที่ 1-8) --</option>
                  {KOPODOT_GOALS.map((g) => (
                    <option key={g.id} value={g.code}>ด้านที่ {g.id}: {g.title.substring(0, 25)}...</option>
                  ))}
                </select>
              </div>

              {/* Filter 4: ค้นหาคำสำคัญ */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 mb-1">ค้นหาข้อความ</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหากิจกรรม, รหัส, โรงเรียน..."
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Export Settings Configuration Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Format Selection Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>1. รูปแบบไฟล์ส่งออก (Export Format)</span>
              </h4>
              <div className="grid grid-cols-1 gap-2">
                <label
                  onClick={() => setExportFormat("zip-pdf")}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    exportFormat === "zip-pdf"
                      ? "bg-blue-50/80 border-blue-500 ring-1 ring-blue-500/30"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 font-black text-xs">
                      ZIP
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">แฟ้ม ZIP บรรจุไฟล์ PDF รายฉบับ</div>
                      <div className="text-[11px] text-slate-500 font-medium">แยกไฟล์ PDF ของแต่ละรายงาน ชื่อไฟล์เป็นระเบียบตามมาตรฐาน</div>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${exportFormat === "zip-pdf" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>
                    {exportFormat === "zip-pdf" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </label>

                <label
                  onClick={() => setExportFormat("zip-png")}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    exportFormat === "zip-png"
                      ? "bg-blue-50/80 border-blue-500 ring-1 ring-blue-500/30"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black text-xs">
                      PNG
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">แฟ้ม ZIP บรรจุไฟล์ภาพ PNG รายฉบับ</div>
                      <div className="text-[11px] text-slate-500 font-medium">แยกรูปภาพคมชัดสูง 200 DPI สำหรับนำไปใช้ประกอบการนำเสนอ</div>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${exportFormat === "zip-png" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>
                    {exportFormat === "zip-png" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </label>

                <label
                  onClick={() => setExportFormat("combined-pdf")}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    exportFormat === "combined-pdf"
                      ? "bg-blue-50/80 border-blue-500 ring-1 ring-blue-500/30"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 font-black text-xs">
                      PDF
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">ไฟล์ PDF รวมเล่มฉบับเดียวหลายหน้า</div>
                      <div className="text-[11px] text-slate-500 font-medium">รวมรายงานที่เลือกทั้งหมดเข้าเป็นเล่มเดียวความยาวหลายสิบหน้า</div>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${exportFormat === "combined-pdf" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>
                    {exportFormat === "combined-pdf" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </label>
              </div>
            </div>

            {/* Folder Structure Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-indigo-600" />
                <span>2. จัดระเบียบโฟลเดอร์ใน ZIP (Zip Structure)</span>
              </h4>
              <div className="grid grid-cols-1 gap-2">
                <label
                  onClick={() => setFolderStructure("by-school")}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    folderStructure === "by-school"
                      ? "bg-indigo-50/80 border-indigo-500 ring-1 ring-indigo-500/30"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100/80"
                  }`}
                >
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">แยกโฟลเดอร์ตามโรงเรียน (/กก.ตชด.21/รร.ตชด.บ้าน.../)</div>
                    <div className="text-[11px] text-slate-500 font-medium">เหมาะสำหรับส่งรายงานแยกตามสังกัดโรงเรียนอย่างเป็นหมวดหมู่</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${folderStructure === "by-school" ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300"}`}>
                    {folderStructure === "by-school" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </label>

                <label
                  onClick={() => setFolderStructure("by-goal")}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    folderStructure === "by-goal"
                      ? "bg-indigo-50/80 border-indigo-500 ring-1 ring-indigo-500/30"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100/80"
                  }`}
                >
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">แยกโฟลเดอร์ตามเป้าหมาย กพด.5 (/ด้านที่ 1/ ...)</div>
                    <div className="text-[11px] text-slate-500 font-medium">จัดกลุ่มตามเป้าหมายหลัก 8 ด้าน เพื่อความสะดวกในการตรวจประเมิน</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${folderStructure === "by-goal" ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300"}`}>
                    {folderStructure === "by-goal" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </label>

                <label
                  onClick={() => setFolderStructure("flat")}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    folderStructure === "flat"
                      ? "bg-indigo-50/80 border-indigo-500 ring-1 ring-indigo-500/30"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100/80"
                  }`}
                >
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">วางไฟล์ทั้งหมดในโฟลเดอร์หลัก (Flat Directory)</div>
                    <div className="text-[11px] text-slate-500 font-medium">รวมไฟล์เอกสารทั้งหมดไว้ในรูทของ ZIP โดยตรง</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${folderStructure === "flat" ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300"}`}>
                    {folderStructure === "flat" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </label>
              </div>
            </div>

          </div>

          {/* Selection Table & Report Queue List */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            {/* Table Action Bar */}
            <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>เลือกทั้งหมดในผลลัพธ์ ({filteredReports.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeselectAllFiltered}
                  className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>ยกเลิกการเลือก</span>
                </button>
              </div>

              <div className="text-xs font-extrabold text-indigo-950 bg-indigo-50 border border-indigo-200/80 px-3 py-1.5 rounded-lg">
                เลือกแล้ว <span className="text-indigo-600 font-black">{selectedReportIds.size}</span> จากทั้งหมด {reports.length} รายงาน
              </div>
            </div>

            {/* Scrollable Items Table */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-150">
              {filteredReports.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา
                </div>
              ) : (
                filteredReports.map((r) => {
                  const isChecked = selectedReportIds.has(r.id);
                  const affil = getThaiAffiliation(r.schoolName || "");
                  return (
                    <div
                      key={r.id}
                      onClick={() => toggleReportSelection(r.id)}
                      className={`px-4 py-2.5 flex items-center justify-between gap-3 text-xs transition cursor-pointer ${
                        isChecked ? "bg-blue-50/50 hover:bg-blue-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 truncate flex items-center gap-2">
                            <span className="bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded-md font-mono text-[10px]">
                              {r.id}
                            </span>
                            <span>{r.activityName}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-bold text-slate-700">{r.schoolName}</span>
                            <span>•</span>
                            <span className="text-indigo-700 font-medium">{affil}</span>
                            <span>•</span>
                            <span className="text-amber-700 font-medium">{r.goalCode}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          {formatThaiFullDate(r.dateString || r.timestamp || "")}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Progress Processing Card */}
          {isProcessing && (
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-xl space-y-3 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <Loader2 className="w-6 h-6 text-amber-400 animate-spin shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-xs sm:text-sm text-white">กำลังประมวลผลระบบสร้างเอกสารกลุ่ม...</h4>
                    <p className="text-[11px] sm:text-xs text-blue-200 truncate max-w-xs sm:max-w-md md:max-w-lg font-mono mt-0.5">
                      {currentProcessingTitle}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-start">
                  <div className="text-lg sm:text-xl font-black text-amber-300 font-mono">
                    {Math.round((progressCount / totalToProcess) * 100)}%
                  </div>
                  <div className="text-[10px] text-blue-200">
                    {progressCount} / {totalToProcess} รายงาน
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800/80 h-3 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(progressCount / totalToProcess) * 100}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] sm:text-[11px] text-blue-200/80 pt-0.5">
                <span>กรุณาอย่าปิดหน้าต่างนี้จนกว่าการประมวลผลจะเสร็จสิ้น (รองรับ iPad/สมาร์ทโฟน)</span>
                <button
                  onClick={() => setCancelRequested(true)}
                  className="text-rose-300 hover:text-white font-bold underline cursor-pointer"
                >
                  ยกเลิกการส่งออก
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-extrabold text-slate-600">
            เอกสารที่เลือกทั้งหมด: <span className="text-indigo-700 font-black text-sm">{selectedReportIds.size}</span> รายงาน
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              onClick={handleStartBatchExport}
              disabled={isProcessing || selectedReportIds.size === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span>กำลังส่งออก...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>ประมวลผลส่งออก {selectedReportIds.size} รายงาน</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* OFFSCREEN HIDDEN RENDER CONTAINER FOR CANVAS GENERATION */}
      <div 
        ref={offscreenContainerRef}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: "794px",
          height: "1123px",
          zIndex: -9999,
          visibility: renderReport ? "visible" : "hidden",
          opacity: 1,
          pointerEvents: "none",
          backgroundColor: "#ffffff",
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        {renderReport && (
          <div 
            className="a4-paper-sheet sarabun-font bg-white w-[794px] h-[1123px] pl-[113px] pr-[75px] pt-[50px] pb-[45px] text-slate-900 flex flex-col justify-between relative shrink-0 text-[16px] leading-tight select-none overflow-hidden"
            style={{ 
              boxSizing: "border-box",
              width: "794px",
              height: "1123px",
              backgroundColor: "#ffffff",
              opacity: 1,
              transform: "none",
            }}
          >
            <OffscreenA4Paper report={renderReport} />
          </div>
        )}
      </div>

    </div>
  );
}

// Offscreen Single Printable Page Component Matching A4Document
function OffscreenA4Paper({ report }: { report: ActivityReport }) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  const schoolAffiliation = useMemo(() => getThaiAffiliation(report.schoolName || ""), [report.schoolName]);
  const formattedHeader = useMemo(() => getSchoolHeader(report.schoolName || ""), [report.schoolName]);
  const schoolAddress = useMemo(() => getThaiAddress(report.schoolName || ""), [report.schoolName]);
  const formattedDate = useMemo(() => formatThaiFullDate(report.dateString || report.timestamp || ""), [report.dateString, report.timestamp]);
  
  const exactSchoolName = useMemo(() => {
    if (!report.schoolName) return "รร.ตชด.";
    let sName = report.schoolName;
    if (sName.startsWith("โรงเรียนตำรวจตระเวนชายแดน")) {
      sName = sName.replace("โรงเรียนตำรวจตระเวนชายแดน", "รร.ตชด.");
    } else if (sName.startsWith("โรงเรียน")) {
      sName = sName.replace("โรงเรียน", "รร.");
    }
    return sName;
  }, [report.schoolName]);

  const effectiveApproverName = useMemo(() => {
    if (report.approverName && report.approverName !== "-") {
      return report.approverName;
    }
    return getPrincipalBySchoolName(report.schoolName || "");
  }, [report.approverName, report.schoolName]);

  const { rank: approverRank, cleanName: approverCleanName } = useMemo(
    () => parseFullNameAndRank(effectiveApproverName || ""),
    [effectiveApproverName]
  );

  const formattedApproverPosition = useMemo(() => {
    return "ครูใหญ่โรงเรียนตำรวจตระเวนชายแดน";
  }, []);

  const { rank: reporterRank, cleanName: reporterCleanName } = useMemo(
    () => parseFullNameAndRank(report.reportedBy || ""),
    [report.reportedBy]
  );

  const currentGoal = useMemo(() => {
    const goalId = getGoalIdFromCode(report.goalCode || "1");
    return KOPODOT_GOALS.find((g) => g.id === goalId) || KOPODOT_GOALS[0];
  }, [report.goalCode]);

  const primaryIndicator = useMemo(() => {
    return findIndicatorForReport(report, currentGoal?.id);
  }, [report, currentGoal?.id]);

  const goalCtx = useMemo(() => {
    return getGoalsContext(report.goalCode || "", primaryIndicator, report.activityName);
  }, [report.goalCode, primaryIndicator, report.activityName]);

  const displayActivityTitle = useMemo(() => {
    if (report.activityName && report.activityName.trim().length > 0) {
      return report.activityName.trim();
    }
    if (report.projectName && report.projectName.trim().length > 0) {
      return report.projectName.trim();
    }
    return "กิจกรรมตามแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร";
  }, [report.activityName, report.projectName]);

  const displayPhotos = useMemo(() => {
    const imgs = getValidImages(report.imageUrl, 1000);
    return imgs.slice(0, 6);
  }, [report.imageUrl]);

  const gridConfig = useMemo(() => {
    return getGridConfig(displayPhotos.length);
  }, [displayPhotos.length]);

  const targetUrl = useMemo(() => {
    return "https://drive.google.com/file/d/1Qvias_Otlx9IdUJATHqi-FLqFhjOR3V6/view?usp=sharing";
  }, []);

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(targetUrl, {
      margin: 1,
      width: 160,
      color: {
        dark: "#0f172a",
        light: "#ffffff"
      }
    })
      .then((url) => {
        if (isMounted) setQrCodeUrl(url);
      })
      .catch((err) => console.error("QR Code Error:", err));

    return () => {
      isMounted = false;
    };
  }, [targetUrl]);

  const rawDetailsText = report.details || report.qualitativeOutcome || report.quantitativeOutcome || "ดำเนินกิจกรรมเรียบร้อยตามวัตถุประสงค์โครงการ";

  return (
    <div className="w-full h-full flex flex-col justify-between text-slate-900 text-[16px] leading-tight select-none">
      {/* Top Header Block */}
      <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
        
        {/* Document Header Title */}
        <div className="space-y-0.5" style={{ marginTop: "-12px", lineHeight: "19.6px" }}>
          <div className="relative flex items-center justify-center w-full min-h-[68px] pb-0.5" style={{ paddingBottom: "0.4375px", marginBottom: "2.4375px", paddingTop: "5px", marginTop: "-2px" }}>
            {/* Royal Emblem on Left */}
            <img 
              src={ROYAL_EMBLEM_IMAGE}
              alt="ตราสัญลักษณ์โครงการพระราชดำริฯ"
              referrerPolicy="no-referrer"
              className="absolute left-0 top-0 object-contain shrink-0"
              style={{ height: "65.9531px", width: "71.9688px", marginLeft: "-4px", marginTop: "-4px" }}
            />

            {/* Header Title Text - Centered */}
            <div className="text-center space-y-0.5 flex-1 px-12" style={{ paddingTop: "0px", paddingLeft: "60px", paddingBottom: "0px", marginTop: "-19px" }}>
              <h2 className="font-extrabold tracking-tight text-slate-950 leading-snug text-center max-w-full text-[19px] mt-[10px]">
                {toThaiNumerals("รายงานผลการปฏิบัติงานกิจกรรมตามแผน กพด. (ฉบับที่ 5)")}
              </h2>
              <h3 className="font-bold text-slate-800 text-center leading-snug text-[14px]">
                {formattedHeader}
              </h3>
              <p 
                className="font-normal text-slate-600 text-center leading-snug text-[13px]"
                style={{ marginTop: "0.1875px", paddingBottom: "5px" }}
              >
                รายงานประจำวันที่ {formattedDate}
              </p>
            </div>
          </div>
          <div className="w-full h-[1.5px] bg-slate-900 mt-1 mb-1.5" />
        </div>

        {/* SECTION 1: ข้อมูลทั่วไป */}
        <div className="space-y-0.5">
          <h4 className="font-extrabold text-[15px] text-slate-950 leading-snug" style={{ marginBottom: "0.4375px", marginTop: "-10px", fontSize: "15px" }}>
            1. ข้อมูลทั่วไป
          </h4>
          <div className="pl-4 space-y-0.5 text-slate-800">
            <div className="grid grid-cols-2 gap-4 items-baseline" style={{ marginLeft: "0px" }}>
              <p className="text-[13.5px] leading-normal whitespace-nowrap overflow-visible" style={{ marginLeft: "0px", fontSize: "13.5px" }}>
                <span className="font-bold text-slate-800" style={{ marginLeft: "0px" }}>สังกัด/หน่วยงาน:</span>{" "}
                <span className="font-medium text-slate-900">{schoolAffiliation}</span>
              </p>
              <p className="text-[13.5px] leading-normal whitespace-nowrap overflow-visible flex items-center gap-1">
                <span className="font-bold text-slate-800" style={{ marginLeft: "-90px" }}>ครูใหญ่:</span>{" "}
                <span className="font-medium text-slate-900 text-[13.5px]">{toThaiNumerals(effectiveApproverName || "-")}</span>
              </p>
            </div>
            <div style={{ marginLeft: "0px" }}>
              <p className="w-full text-[13.5px] leading-normal whitespace-nowrap overflow-visible" style={{ marginLeft: "0px", marginTop: "-5px", fontSize: "13.5px" }}>
                <span className="font-bold text-slate-800" style={{ marginLeft: "0px" }}>ที่ตั้ง:</span>{" "}
                <span className="font-medium text-slate-900">{schoolAddress}</span>
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 2: เป้าหมายหลักที่ดำเนินการ */}
        <div className="space-y-0.5 pt-0.5">
          <h4 className="font-extrabold text-[15px] text-slate-950 leading-snug" style={{ marginTop: "-5px", marginBottom: "-0.5625px", fontSize: "15px" }}>
            2. เป้าหมายหลักที่ดำเนินการ
          </h4>
          <div className="pl-4 space-y-1 text-slate-900">
            <p className="font-bold text-slate-950 text-[13.5px] leading-snug" style={{ marginLeft: "0px", marginTop: "4px" }}>
              เป้าหมายหลักที่ {toThaiNumerals(currentGoal?.id || "3")} {toThaiNumerals(currentGoal?.title || "ส่งเสริมศักยภาพของเด็กและเยาวชนทางวิชาการและจริยธรรม")}
            </p>
            
            {primaryIndicator && (
              <div className="rounded-lg px-1 h-auto" style={{ minHeight: "48px", paddingTop: "3.3125px", paddingBottom: "3.3125px", marginLeft: "0px", marginTop: "-2px" }}>
                <span className="text-slate-950 font-bold text-[13.5px] leading-snug block" style={{ marginLeft: "-3px" }}>
                  ตัวชี้วัด กพด. (ฉบับที่ 5):
                </span>
                <p className="text-[13.5px] text-slate-800 font-medium leading-relaxed pl-2 break-words whitespace-pre-wrap" style={{ marginLeft: "0px", fontSize: "13.5px" }}>
                  - {toThaiNumerals(`${primaryIndicator.code} ${primaryIndicator.name}`)}
                </p>
              </div>
            )}

            <div className="rounded-lg px-1 h-auto" style={{ minHeight: "46px", paddingTop: "1.3125px", paddingBottom: "4.3125px", marginTop: "-12px" }}>
              <span className="text-slate-950 font-bold text-[13.5px] leading-snug block" style={{ marginLeft: "-2px" }}>เป้าหมายย่อย:</span>
              <p className="text-[13.5px] text-slate-800 font-medium leading-relaxed pl-2 break-words whitespace-pre-wrap" style={{ fontSize: "13.5px" }}>
                - {toThaiNumerals(goalCtx.subGoal)}
              </p>
            </div>

            <div className="rounded-lg px-1 h-auto" style={{ minHeight: "45px", paddingTop: "2.3125px", paddingBottom: "1.3125px", marginTop: "-9px" }}>
              <span className="text-slate-950 font-bold text-[13.5px] leading-snug block" style={{ marginLeft: "-3px", marginTop: "-2px" }}>เป้าหมายตามวัตถุประสงค์:</span>
              <p className="text-[13.5px] text-slate-800 font-medium leading-relaxed pl-2 break-words whitespace-pre-wrap" style={{ width: "612.566px", fontSize: "13.5px" }}>
                - {toThaiNumerals(goalCtx.objective)}
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 3: รายละเอียดการดำเนินกิจกรรม */}
        <div className="space-y-0.5 pt-0.5">
          <div className="flex items-center justify-between" style={{ marginTop: "-13px", marginLeft: "7px" }}>
            <h4 className="font-extrabold text-[15px] text-slate-950 leading-snug" style={{ fontSize: "15px" }}>
              3. รายละเอียดการดำเนินกิจกรรม
            </h4>
          </div>

          <div className="pl-4 space-y-1 text-slate-800">
            <div className="flex justify-between gap-4 pb-0.5">
              <p className="w-full text-[13.5px] leading-snug" style={{ fontSize: "13.5px", marginTop: "0px", marginLeft: "5px" }}>
                <span className="font-bold text-slate-950" style={{ fontSize: "13.5px" }}>ชื่อกิจกรรม:</span>{" "}
                <span className="font-normal text-slate-900" style={{ fontSize: "13.5px" }}>{toThaiNumerals(displayActivityTitle)}</span>
              </p>
            </div>

            {(() => {
              const len = rawDetailsText.length;
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
                    <div 
                      className="w-full text-justify leading-relaxed [text-align-last:left] [text-justify:inter-word] break-words whitespace-pre-wrap" 
                      style={{ 
                        marginTop: "1px", 
                        marginLeft: "0px",
                        textAlign: "justify",
                        textJustify: "inter-word",
                        textAlignLast: "left",
                        wordBreak: "break-word",
                        fontSize: "13.5px"
                      }}
                    >
                      <span className="font-bold text-slate-950 text-[13.5px] inline mr-1" style={{ marginLeft: "0px" }}>รายละเอียดกิจกรรม:</span>{" "}
                      {toThaiNumerals(rawDetailsText)}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-between gap-4 pt-0.5" style={{ marginTop: "-8px", marginLeft: "-16px" }}>
              <p className="flex-1 min-w-0 text-[13.5px] leading-snug" style={{ marginLeft: "-3px", marginTop: "-1px", fontSize: "13.5px" }}>
                <span className="font-bold text-slate-950 text-[13.5px]" style={{ marginLeft: "24px" }}>กลุ่มเป้าหมาย/ชั้นเรียน:</span>{" "}
                <span className="font-normal text-slate-800 text-[13.5px]">{toThaiNumerals(report.targetGroup || "-")}</span>
              </p>
              <div className="shrink-0 flex items-center justify-end text-[11.5px] whitespace-nowrap">
                <span className="font-bold text-slate-950 text-[11.5px]">จำนวนผู้เข้าร่วม:</span>
                <span className="font-normal text-slate-800 text-[11.5px] mx-1.5">
                  {toThaiNumerals(report.participantsCount)}
                </span>
                <span className="font-bold text-slate-950 text-[11.5px]">คน</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: ภาพประกอบกิจกรรม */}
        <div className="space-y-0.5 pt-0.5 flex-1 flex flex-col min-h-0">
          <h4 className="font-extrabold text-[15px] text-slate-950 shrink-0 flex flex-wrap items-center justify-between gap-1 leading-snug" style={{ marginTop: "-8px", marginLeft: "7px", marginBottom: "2.5px", fontSize: "15px" }}>
            <div className="flex items-center space-x-2">
              <span style={{ fontSize: "15px", marginLeft: "4px" }}>4. ภาพประกอบกิจกรรม</span>
            </div>
          </h4>
          {displayPhotos.length > 0 ? (
            <div 
              className={`grid gap-1 pl-4 flex-1 min-h-0 ${gridConfig.cols}`}
            >
              {displayPhotos.map((src, imgIdx) => {
                let spanClass = "";
                if (displayPhotos.length === 5) {
                  spanClass = imgIdx < 3 ? "col-span-2" : "col-span-3";
                }

                return (
                  <div 
                    key={imgIdx} 
                    className={`rounded-lg overflow-hidden border border-slate-200/90 shadow-2xs bg-slate-100 relative h-full w-full min-h-0 select-none ${spanClass}`}
                  >
                    <div className="w-full h-full relative overflow-hidden">
                      <SmartFaceImage 
                        src={src} 
                        alt={`ภาพกิจกรรมที่ ${imgIdx + 1}`} 
                        showControls={false}
                        defaultPosition="50% 20%"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div 
              className="pl-5 flex-1 flex flex-col min-h-0"
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
      <div className="pt-1 border-t border-slate-200/80 mt-0.5 shrink-0">
        <div className="grid grid-cols-2 gap-6 items-stretch">
          {/* Left Column: Comments & Approver Signature */}
          <div className="flex flex-col items-center justify-between text-center space-y-1 h-full">
            <div className="w-full flex flex-col items-center text-center space-y-0.5">
              <h5 className="font-extrabold text-[12px] text-slate-900 leading-tight">
                ความเห็นของผู้ตรวจ / ผู้บังคับบัญชา
              </h5>
              <div className="w-full flex flex-col justify-center py-0.5 px-2 my-0.5">
                {report.executiveComment ? (
                  <p className="text-[11.5px] font-semibold text-slate-900 leading-tight text-center px-1 my-auto">
                    {toThaiNumerals(report.executiveComment)}
                  </p>
                ) : (
                  <div className="w-full flex flex-col justify-center space-y-3 pt-1.5 pb-0.5 px-3">
                    <div className="border-b border-dotted border-slate-400 w-full"></div>
                    <div className="border-b border-dotted border-slate-400 w-full"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-0.5 flex flex-col items-center w-full max-w-[280px] mt-auto">
              {/* Combined Inline Row: ลงชื่อ + ยศ + ลายเซ็นดิจิทัล (แบบสารบัญตำรวจ) */}
              {report.approverSignatureUrl ? (
                <div className="w-full flex items-center justify-center gap-1.5 min-h-[36px] my-0.5 relative z-[30]">
                  <span className="font-normal text-slate-800 text-[12px] whitespace-nowrap shrink-0">
                    ลงชื่อ {approverRank ? <span className="font-semibold">{approverRank}</span> : ""}
                  </span>

                  <AdjustableSignature
                    signatureUrl={report.approverSignatureUrl}
                    alt="Approver Signature"
                    roleLabel="ครูใหญ่ / ผู้ตรวจ"
                    onOpenModal={() => {}}
                    isExporting={true}
                  />
                </div>
              ) : (
                <div className="w-full flex items-center justify-center text-center min-h-[32px] my-0.5">
                  <span className="font-normal text-slate-900 text-[12px] whitespace-nowrap">
                    ลงชื่อ {approverRank ? <span className="font-semibold">{approverRank} </span> : ""}
                    <span className="font-normal tracking-widest text-transparent select-none">...................................................</span>
                  </span>
                </div>
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
              
              <div className="w-full h-7 flex items-center justify-center gap-4 py-0.5 font-bold text-[12.5px] text-slate-800 select-none">
                <div className="flex items-center gap-1.5">
                  <span className="text-[17px] leading-none text-blue-600">☑</span>
                  <span>ดีเยี่ยม</span>
                </div>

                <div className="flex items-center gap-1.5 opacity-60">
                  <span className="text-[17px] leading-none text-slate-400">☐</span>
                  <span>ดี</span>
                </div>

                <div className="flex items-center gap-1.5 opacity-60">
                  <span className="text-[17px] leading-none text-slate-400">☐</span>
                  <span>พอใช้</span>
                </div>
              </div>
            </div>

            <div className="pt-0.5 flex flex-col items-center w-full max-w-[280px] mt-auto">
              {/* Combined Inline Row: ลงชื่อ + ยศ + ลายเซ็นดิจิทัล (แบบสารบัญตำรวจ) */}
              {report.reporterSignatureUrl ? (
                <div className="w-full flex items-center justify-center gap-1.5 min-h-[36px] my-0.5 relative z-[30]">
                  <span className="font-normal text-slate-800 text-[12px] whitespace-nowrap shrink-0">
                    ลงชื่อ {reporterRank && !["นาย", "นาง", "นางสาว"].includes(reporterRank) ? <span className="font-semibold">{reporterRank}</span> : ""}
                  </span>

                  <AdjustableSignature
                    signatureUrl={report.reporterSignatureUrl}
                    alt="Reporter Signature"
                    roleLabel="ครูผู้รับผิดชอบ"
                    onOpenModal={() => {}}
                    isExporting={true}
                  />
                </div>
              ) : (
                <div className="w-full flex items-center justify-center text-center min-h-[32px] my-0.5">
                  <span className="font-normal text-slate-900 text-[12px] whitespace-nowrap">
                    ลงชื่อ {reporterRank && !["นาย", "นาง", "นางสาว"].includes(reporterRank) ? <span className="font-semibold">{reporterRank} </span> : ""}
                    <span className="font-normal tracking-widest text-transparent select-none">...................................................</span>
                  </span>
                </div>
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
          className="border-t border-slate-200/90 pt-1 mt-1 flex items-end justify-between text-[11px] text-slate-500 font-medium"
        >
          <div className="space-y-0.5 text-left">
            <p>{toThaiNumerals("รายงานผลการปฏิบัติงานกิจกรรมตามแผน กพด. (ฉบับที่ 5)")}</p>
            <p>พิมพ์เมื่อ: {getThaiCurrentDateTime()}</p>
          </div>

          <div className="flex items-center gap-2.5 text-right">
            <div className="space-y-0.5">
              <p className="font-bold text-slate-600 text-[11px]">สแกนเพื่อดูข้อมูลต้นฉบับ</p>
              <p className="text-[10.5px] text-slate-500">{formatReportUpdatedDateTime(report.lastUpdated, report.dateString)}</p>
            </div>
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code" className="w-10 h-10 border border-slate-200 p-0.5 rounded shrink-0 bg-white object-contain" />
            ) : (
              <div className="w-10 h-10 border border-slate-200 rounded p-0.5 shrink-0 bg-white flex items-center justify-center text-[8px] text-slate-400 font-bold">
                QR
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

export default BatchExportModal;
