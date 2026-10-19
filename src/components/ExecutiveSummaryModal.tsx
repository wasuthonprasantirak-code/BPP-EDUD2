import React, { useState, useMemo, useRef, useEffect } from "react";
import { safeLocalStorage } from "../lib/storage";
import { safeHtml2Canvas } from "../lib/html2canvasFix";
import { sanitizeWindowsFilename, triggerCrossPlatformDownload, getAdaptiveCanvasScale, isMobileOrTablet } from "../lib/windowsUtils";
import { ActivityReport, KOPODOT_GOALS, getGoalIdFromCode } from "../types";
import { ROYAL_EMBLEM_IMAGE } from "../data/emblemLogo";
import { OFFICIAL_TARGET_SCHOOLS, isSchoolMatch } from "../data/schoolsData";
import { ACTION_STATUS_META, ActionItemConfig, ActionStatus, getSmartDefaultActionItem, RESPONSIBLE_UNITS } from "./ProblemsView";
import {
  FileText,
  Printer,
  Download,
  X,
  Sparkles,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
  TrendingUp,
  Award,
  ShieldAlert,
  SlidersHorizontal,
  ChevronRight,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  FileImage,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Loader2
} from "lucide-react";

interface ExecutiveSummaryModalProps {
  reports: ActivityReport[];
  isOpen: boolean;
  onClose: () => void;
  isEmbedded?: boolean;
}

// Helper to translate numbers to Thai numerals for official document look
let globalUseArabicNumerals = true;

const toThaiNumerals = (num: number | string): string => {
  if (num === null || num === undefined) return "";
  if (globalUseArabicNumerals) return String(num);
  const arabicToThaiMap: Record<string, string> = {
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9'
  };
  return String(num).replace(/[0-9]/g, (digit) => arabicToThaiMap[digit] || digit);
};

const formatThNumber = (num: number): string => {
  return new Intl.NumberFormat("th-TH").format(num);
};

export const ExecutiveSummaryModal: React.FC<ExecutiveSummaryModalProps> = ({
  reports,
  isOpen,
  onClose,
  isEmbedded = false
}) => {
  // Filter States
  const [selectedPeriod, setSelectedPeriod] = useState<string>("WEEKLY_FRIDAY");
  const [selectedRegion, setSelectedRegion] = useState<string>("ALL");
  const [selectedGoal, setSelectedGoal] = useState<string>("ALL");
  const [useArabicNumerals, setUseArabicNumerals] = useState<boolean>(true);
  const [customReportTitle, setCustomReportTitle] = useState<string>("");

  useEffect(() => {
    globalUseArabicNumerals = useArabicNumerals;
  }, [useArabicNumerals]);

  useEffect(() => {
    if (isOpen && !isEmbedded) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, isEmbedded]);

  // Helper to get Friday date for a given week offset (0 = latest/current Friday, 1 = 1 week ago, etc.)
  const getFridayCutoffDateObj = (weeksAgo: number = 0): Date => {
    const now = new Date();
    const day = now.getDay(); // 0: Sun, 1: Mon, ..., 5: Fri, 6: Sat
    let diffToFriday = day >= 5 ? day - 5 : day + 2;
    diffToFriday += weeksAgo * 7;

    const fridayDate = new Date(now);
    fridayDate.setDate(now.getDate() - diffToFriday);
    fridayDate.setHours(23, 59, 59, 999);
    return fridayDate;
  };

  const formatFridayDateText = (date: Date): string => {
    const dayNum = date.getDate();
    const thaiMonths = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    const monthStr = thaiMonths[date.getMonth()];
    const yearStr = (date.getFullYear() + 543).toString();
    return `วันศุกร์ที่ ${toThaiNumerals(dayNum)} ${monthStr} พ.ศ. ${toThaiNumerals(yearStr)}`;
  };

  // Helper to format Thai date for Friday cut-off
  const getFridayCutoffDateText = (period: string): string => {
    if (period === "WEEKLY_PREVIOUS" || period === "WEEKLY_PREVIOUS_1") {
      return formatFridayDateText(getFridayCutoffDateObj(1));
    } else if (period === "WEEKLY_PREVIOUS_2") {
      return formatFridayDateText(getFridayCutoffDateObj(2));
    } else if (period === "WEEKLY_PREVIOUS_3") {
      return formatFridayDateText(getFridayCutoffDateObj(3));
    } else if (period === "WEEKLY_FRIDAY") {
      return formatFridayDateText(getFridayCutoffDateObj(0));
    } else if (period === "WEEKLY_ACCUMULATED_ALL") {
      return `${formatFridayDateText(getFridayCutoffDateObj(5))} ถึง ${formatFridayDateText(getFridayCutoffDateObj(0))} (สะสมทุกวันศุกร์)`;
    } else if (period === "WEEKLY_LAST_4_WEEKS") {
      return `${formatFridayDateText(getFridayCutoffDateObj(3))} ถึง ${formatFridayDateText(getFridayCutoffDateObj(0))} (4 สัปดาห์ล่าสุด)`;
    } else if (period === "WEEKLY_LAST_8_WEEKS") {
      return `${formatFridayDateText(getFridayCutoffDateObj(7))} ถึง ${formatFridayDateText(getFridayCutoffDateObj(0))} (8 สัปดาห์ล่าสุด)`;
    }
    return formatFridayDateText(getFridayCutoffDateObj(0));
  };

  const [executiveNote, setExecutiveNote] = useState<string>(
    `การดำเนินงานกิจกรรมโครงการตามพระราชดำริ กพด. ประจำสัปดาห์ (ตัดรอบรายงานทุกวันศุกร์) มีความก้าวหน้าตามเป้าหมายตัวชี้วัดเป็นอย่างดี รร.ตชด. ในสังกัด บก.ตชด.ภาค 2 ได้บันทึกและจัดส่งรายงานการดำเนินงานครบถ้วนเรียบร้อยแล้ว`
  );
  const [signerName, setSignerName] = useState<string>("");
  const [signerTitle, setSignerTitle] = useState<string>("ผู้อำนวยการศูนย์อำนวยการโครงการตามพระราชดำริ ตชด.");
  
  const reportTitleText = customReportTitle && customReportTitle !== "CUSTOM_TEXT" ? customReportTitle : (selectedPeriod.startsWith("WEEKLY")
    ? "รายงานสรุปผลการปฏิบัติงานประจำสัปดาห์สำหรับผู้บริหาร"
    : "รายงานสรุปภาพรวมสำหรับผู้บริหาร");
  
  // Interactive A4 Paper Scale & Fullscreen state
  const [zoomFactor, setZoomFactor] = useState<number>(0.95);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [autoScale, setAutoScale] = useState<number>(1);
  const paperWrapperRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const lastSummaryWidthRef = useRef<number>(0);
  const lastSummaryScaleRef = useRef<number>(1);
  const summaryRafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const targetEl = paperWrapperRef.current?.parentElement || paperWrapperRef.current;
    if (!targetEl) return;

    const calculateScale = () => {
      const container = paperWrapperRef.current?.parentElement || paperWrapperRef.current;
      if (!container) return;
      const width = container.clientWidth;
      if (width <= 0) return;

      // Hysteresis threshold to prevent scrollbar oscillation loop
      if (Math.abs(width - lastSummaryWidthRef.current) < 6 && lastSummaryWidthRef.current > 0) {
        return;
      }
      lastSummaryWidthRef.current = width;

      const targetWidth = 840;
      const availableWidth = width - 32;
      let newScale = 1;
      if (availableWidth < targetWidth) {
        newScale = Math.max(0.35, Math.min(1, Number((availableWidth / 794).toFixed(3))));
      }

      if (Math.abs(newScale - lastSummaryScaleRef.current) >= 0.015 || lastSummaryScaleRef.current === 0) {
        lastSummaryScaleRef.current = newScale;
        setAutoScale(newScale);
      }
    };

    const handleThrottledResize = () => {
      if (summaryRafIdRef.current) cancelAnimationFrame(summaryRafIdRef.current);
      summaryRafIdRef.current = requestAnimationFrame(() => {
        calculateScale();
      });
    };

    calculateScale();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(handleThrottledResize);
      observer.observe(targetEl);
    }
    window.addEventListener("resize", handleThrottledResize, { passive: true });

    return () => {
      if (summaryRafIdRef.current) cancelAnimationFrame(summaryRafIdRef.current);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", handleThrottledResize);
    };
  }, [isOpen, isFullScreen]);

  const effectiveScale = Number((autoScale * zoomFactor).toFixed(2));

  // Region helpers
  const getRegionForSchool = (schoolName: string) => {
    const s = (schoolName || "").trim();
    const match = OFFICIAL_TARGET_SCHOOLS.find(item => item.name === s || item.name.includes(s));
    if (!match) return "บก.ตชด. ภาค 2";
    const prov = match.province;
    if (["เชียงใหม่", "ตาก", "แม่ฮ่องสอน", "เชียงราย", "พะเยา", "น่าน", "แพร่", "ลำปาง", "ลำพูน", "อุตรดิตถ์", "พิษณุโลก", "สุโขทัย", "เพชรบูรณ์"].includes(prov)) {
      return "บก.ตชด. ภาค 3";
    } else if (["สงขลา", "ยะลา", "นราธิวาส", "ปัตตานี", "สุราษฎร์ธานี", "นครศรีธรรมราช", "ชุมพร", "ระนอง", "พังงา", "ภูเก็ต", "กระบี่", "ตรัง", "พัทลุง", "สตูล"].includes(prov)) {
      return "บก.ตชด. ภาค 4";
    } else if (["จันทบุรี", "ตราด", "สระแก้ว", "ฉะเชิงเทรา", "กาญจนบุรี", "ราชบุรี", "ประจวบคีรีขันธ์", "เพชรบุรี"].includes(prov)) {
      return "บก.ตชด. ภาค 1";
    }
    return "บก.ตชด. ภาค 2";
  };

  // Helper to load action item tracking map
  const getActionItem = (report: ActivityReport): ActionItemConfig => {
    try {
      const saved = safeLocalStorage.getItem("bpp_action_items_tracking");
      if (saved) {
        const map = JSON.parse(saved);
        if (map[report.id]) return map[report.id];
      }
    } catch (e) {}
    return getSmartDefaultActionItem(report);
  };

  // Filtered dataset for Executive Summary
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (selectedGoal !== "ALL" && !r.goalCode.includes(selectedGoal) && r.goalCode !== selectedGoal) return false;
      if (selectedRegion !== "ALL") {
        const reg = getRegionForSchool(r.schoolName);
        if (selectedRegion === "REGION_1" && reg !== "บก.ตชด. ภาค 1") return false;
        if (selectedRegion === "REGION_2" && reg !== "บก.ตชด. ภาค 2") return false;
        if (selectedRegion === "REGION_3" && reg !== "บก.ตชด. ภาค 3") return false;
        if (selectedRegion === "REGION_4" && reg !== "บก.ตชด. ภาค 4") return false;
      }
      return true;
    });
  }, [reports, selectedRegion, selectedGoal]);

  // Aggregate Metrics
  const summaryData = useMemo(() => {
    const totalCount = filteredReports.length;
    const schoolsSet = new Set(filteredReports.map(r => r.schoolName).filter(Boolean));
    const totalSchools = schoolsSet.size;
    const totalParticipants = filteredReports.reduce((sum, r) => sum + (r.participantsCount || 0), 0);

    // Goal breakdown
    const goalCounts = KOPODOT_GOALS.map(g => {
      const cnt = filteredReports.filter(r => r.goalCode.includes(`ด้านที่ ${g.id}`) || r.goalCode === `ด้านที่ ${g.id}`).length;
      return {
        id: g.id,
        title: g.title,
        count: cnt,
        percent: totalCount > 0 ? Math.round((cnt / totalCount) * 100) : 0
      };
    });

    // Region breakdown
    const regionCounts: Record<string, number> = {
      "บก.ตชด. ภาค 1": 0,
      "บก.ตชด. ภาค 2": 0,
      "บก.ตชด. ภาค 3": 0,
      "บก.ตชด. ภาค 4": 0,
    };
    filteredReports.forEach(r => {
      const reg = getRegionForSchool(r.schoolName);
      regionCounts[reg] = (regionCounts[reg] || 0) + 1;
    });

    // Problems & Action Items Breakdown
    const problemReports = filteredReports.filter(r => r.problems && r.problems.trim().length > 3 && !r.problems.includes("ไม่มี") && !r.problems.includes("-"));
    let pendingCount = 0;
    let inProgressCount = 0;
    let resolvedCount = 0;
    const unitMap: Record<string, number> = {};

    problemReports.forEach(r => {
      const action = getActionItem(r);
      if (action.status === "RESOLVED") resolvedCount++;
      else if (action.status === "IN_PROGRESS") inProgressCount++;
      else pendingCount++;

      unitMap[action.responsibleUnit] = (unitMap[action.responsibleUnit] || 0) + 1;
    });

    const topResponsibleUnits = Object.entries(unitMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const resolutionRate = problemReports.length > 0
      ? Math.round(((resolvedCount + (inProgressCount * 0.5)) / problemReports.length) * 100)
      : 100;

    return {
      totalCount,
      totalSchools,
      totalParticipants,
      goalCounts,
      regionCounts,
      totalProblems: problemReports.length,
      pendingCount,
      inProgressCount,
      resolvedCount,
      resolutionRate,
      topResponsibleUnits,
      problemReportsList: problemReports.slice(0, 8) // Top representative problem cases
    };
  }, [filteredReports]);

  // Compute multi-round Friday cutoff dates list for continuous week document generation
  const fridayRounds = useMemo(() => {
    if (selectedPeriod === "WEEKLY_ACCUMULATED_ALL") {
      const list = [];
      for (let w = 5; w >= 0; w--) {
        const dateObj = getFridayCutoffDateObj(w);
        list.push({
          id: `week-${w}`,
          weeksAgo: w,
          label: formatFridayDateText(dateObj),
          weekNum: 6 - w
        });
      }
      return list;
    } else if (selectedPeriod === "WEEKLY_LAST_4_WEEKS") {
      const list = [];
      for (let w = 3; w >= 0; w--) {
        const dateObj = getFridayCutoffDateObj(w);
        list.push({
          id: `week-${w}`,
          weeksAgo: w,
          label: formatFridayDateText(dateObj),
          weekNum: 4 - w
        });
      }
      return list;
    } else if (selectedPeriod === "WEEKLY_LAST_8_WEEKS") {
      const list = [];
      for (let w = 7; w >= 0; w--) {
        const dateObj = getFridayCutoffDateObj(w);
        list.push({
          id: `week-${w}`,
          weeksAgo: w,
          label: formatFridayDateText(dateObj),
          weekNum: 8 - w
        });
      }
      return list;
    } else if (selectedPeriod === "WEEKLY_PREVIOUS_1") {
      const dateObj = getFridayCutoffDateObj(1);
      return [{ id: "week-1", weeksAgo: 1, label: formatFridayDateText(dateObj), weekNum: 1 }];
    } else if (selectedPeriod === "WEEKLY_PREVIOUS_2") {
      const dateObj = getFridayCutoffDateObj(2);
      return [{ id: "week-2", weeksAgo: 2, label: formatFridayDateText(dateObj), weekNum: 2 }];
    } else if (selectedPeriod === "WEEKLY_PREVIOUS_3") {
      const dateObj = getFridayCutoffDateObj(3);
      return [{ id: "week-3", weeksAgo: 3, label: formatFridayDateText(dateObj), weekNum: 3 }];
    } else if (selectedPeriod === "WEEKLY_FRIDAY") {
      const dateObj = getFridayCutoffDateObj(0);
      return [{ id: "week-0", weeksAgo: 0, label: formatFridayDateText(dateObj), weekNum: 1 }];
    } else {
      return [{ id: "all", weeksAgo: -1, label: "ภาพรวมสะสมปีงบประมาณ 2569", weekNum: 1 }];
    }
  }, [selectedPeriod]);

  // Helper to compute summary for specific reports in a Friday round
  const computeRoundSummaryData = (reportList: ActivityReport[]) => {
    const totalCount = reportList.length;
    const matchedSchools = OFFICIAL_TARGET_SCHOOLS.filter(s =>
      reportList.some(r => isSchoolMatch(r.schoolName, s.name))
    );
    const extraSchools = new Set(
      reportList
        .map(r => r.schoolName)
        .filter(name => Boolean(name) && !OFFICIAL_TARGET_SCHOOLS.some(s => isSchoolMatch(name, s.name)))
    );
    const totalSchools = matchedSchools.length + extraSchools.size;
    const totalParticipants = reportList.reduce((sum, r) => sum + (r.participantsCount || 0), 0);

    const goalCounts = KOPODOT_GOALS.map(g => {
      const cnt = reportList.filter(r => getGoalIdFromCode(r.goalCode) === g.id).length;
      return {
        id: g.id,
        title: g.title,
        count: cnt,
        percent: totalCount > 0 ? Math.round((cnt / totalCount) * 100) : 0
      };
    });

    const problemReports = reportList.filter(r => r.problems && r.problems.trim().length > 3 && !r.problems.includes("ไม่มี") && !r.problems.includes("-"));
    let pendingCount = 0;
    let inProgressCount = 0;
    let resolvedCount = 0;

    problemReports.forEach(r => {
      const action = getActionItem(r);
      if (action.status === "RESOLVED") resolvedCount++;
      else if (action.status === "IN_PROGRESS") inProgressCount++;
      else pendingCount++;
    });

    const resolutionRate = problemReports.length > 0
      ? Math.round(((resolvedCount + (inProgressCount * 0.5)) / problemReports.length) * 100)
      : 100;

    return {
      totalCount,
      totalSchools,
      totalParticipants,
      goalCounts,
      totalProblems: problemReports.length,
      pendingCount,
      inProgressCount,
      resolvedCount,
      resolutionRate,
      problemReportsList: problemReports
    };
  };

  const roundsWithPagesMemo = useMemo(() => {
    const totalRounds = fridayRounds.length;
    let totalPagesRendered = 0;
    
    const rounds = fridayRounds.map((round, rIdx) => {
      let roundReports = filteredReports;
      if (totalRounds > 1 && round.weeksAgo >= 0) {
        const chunkSize = Math.max(1, Math.ceil(filteredReports.length / totalRounds));
        const start = rIdx * chunkSize;
        const sliced = filteredReports.slice(start, start + chunkSize);
        roundReports = sliced.length > 0 ? sliced : filteredReports.slice(0, Math.min(6, filteredReports.length));
      }

      const roundSummary = computeRoundSummaryData(roundReports);
      const problemsList = roundSummary.problemReportsList;
      const itemsPerPage = 8;
      let chunksCount = 1;
      if (problemsList.length > 0) {
        chunksCount = Math.ceil(problemsList.length / itemsPerPage);
      }
      const totalPagesForRound = 1 + chunksCount;
      totalPagesRendered += totalPagesForRound;

      return {
        round,
        roundReports,
        roundSummary,
        problemsList,
        itemsPerPage,
        totalPagesForRound
      };
    });

    const totalHeight = totalPagesRendered * 1123 + (totalPagesRendered - 1) * 32;

    return { rounds, totalHeight };
  }, [fridayRounds, filteredReports]);

  const { rounds: roundsWithPages, totalHeight } = roundsWithPagesMemo;

  const [exportStatus, setExportStatus] = useState<{
    isExporting: boolean;
    progress: number;
    message: string;
  }>({
    isExporting: false,
    progress: 0,
    message: "",
  });

  // Handle Document Print via Native Print Window
  const handlePrint = () => {
    window.print();
  };

  // Handle Exporting PNG Image
  const handleExportPng = async () => {
    if (!paperWrapperRef.current) return;
    const isMobile = isMobileOrTablet();
    setExportStatus({
      isExporting: true,
      progress: 20,
      message: isMobile 
        ? "กำลังเตรียมหน้าสรุปภาพรวมสำหรับ iPad / สมาร์ทโฟน..." 
        : "กำลังจัดเตรียมหน้าสรุปภาพรวมผู้บริหาร...",
    });
    await new Promise((resolve) => setTimeout(resolve, 150));
    try {
      const el = paperWrapperRef.current;
      if (!el) return;
      const adaptiveScale = getAdaptiveCanvasScale(2);
      setExportStatus((prev) => ({
        ...prev,
        progress: 60,
        message: "กำลังเรนเดอร์ภาพความละเอียดสูง...",
      }));

      const canvas = await safeHtml2Canvas(el, {
        scale: adaptiveScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      setExportStatus((prev) => ({
        ...prev,
        progress: 90,
        message: isMobile ? "กำลังเปิดกล่องบันทึก/แชร์รูปภาพ..." : "กำลังบันทึกไฟล์รูปภาพ...",
      }));

      const dataUrl = canvas.toDataURL("image/png");
      const fileName = sanitizeWindowsFilename(`รายงานสรุปภาพรวมผู้บริหาร_ตชด_${new Date().toISOString().slice(0, 10)}.png`);

      await triggerCrossPlatformDownload(dataUrl, fileName, {
        mimeType: "image/png",
        title: fileName,
      });

      setExportStatus({
        isExporting: true,
        progress: 100,
        message: isMobile 
          ? "ส่งออกรูปภาพสำเร็จ! (เลือกบันทึกไปยังรูปภาพหรือแชร์)" 
          : "ดาวน์โหลดไฟล์รูปภาพ PNG สำเร็จ!",
      });

      setTimeout(() => {
        setExportStatus({ isExporting: false, progress: 0, message: "" });
      }, 2800);
    } catch (e) {
      console.error("Failed to export PNG", e);
      setExportStatus({
        isExporting: true,
        progress: 100,
        message: "เกิดข้อผิดพลาดในการส่งออกเป็นรูปภาพ PNG",
      });
      setTimeout(() => {
        setExportStatus({ isExporting: false, progress: 0, message: "" });
      }, 3000);
    }
  };

  // Handle Exporting Word (.doc) File
  const handleExportWord = async () => {
    const isMobile = isMobileOrTablet();
    setExportStatus({
      isExporting: true,
      progress: 30,
      message: "กำลังสร้างไฟล์เอกสาร...",
    });
    try {
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>รายงานสรุปภาพรวมผู้บริหาร (Executive Summary)</title>
        <style>
          body { font-family: 'TH Sarabun PSK', 'Angsana New', 'Sarabun', sans-serif; font-size: 16pt; line-height: 1.4; color: #111; margin: 20px; }
          h1 { font-size: 20pt; text-align: center; font-weight: bold; margin-bottom: 5px; }
          h2 { font-size: 18pt; text-align: center; font-weight: bold; margin-bottom: 20px; color: #1e3a8a; }
          h3 { font-size: 16pt; font-weight: bold; border-bottom: 2px solid #1e3a8a; padding-bottom: 4px; margin-top: 20px; color: #1e3a8a; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #94a3b8; padding: 8px 12px; font-size: 14pt; }
          th { background-color: #f1f5f9; font-weight: bold; text-align: center; }
          .badge-resolved { color: #047857; font-weight: bold; }
          .badge-progress { color: #0284c7; font-weight: bold; }
          .badge-pending { color: #d97706; font-weight: bold; }
          .box { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin: 10px 0; }
          .text-center { text-align: center; }
        </style>
      </head>
      <body>
        <div style='text-align: center; margin-bottom: 12px;'>
          <img src='${ROYAL_EMBLEM_IMAGE}' width='65' height='68' alt='ตราสัญลักษณ์ กพด.' style='display: inline-block;' />
        </div>
        <h1>${reportTitleText} (EXECUTIVE SUMMARY REPORT)</h1>
        <h2>โครงการตามพระราชดำริ สมเด็จพระกนิษฐาธิราชเจ้า กรมสมเด็จพระเทพรัตนราชสุดาฯ สยามบรมราชกุมารี</h2>
        <p class='text-center'><strong>กองบังคับการตำรวจตระเวนชายแดนภาค ${toThaiNumerals(2)} (บก.ตชด.ภาค ${toThaiNumerals(2)}) ${selectedPeriod.startsWith("WEEKLY") ? `• รอบรายงานประจำสัปดาห์ (${getFridayCutoffDateText(selectedPeriod)})` : `• ประจำปีงบประมาณ ${toThaiNumerals(2569)}`}</strong></p>
        <hr/>
        
        <h3>${toThaiNumerals(1)}. สรุปตัวเลขสถิติสำคัญภาพรวม (Executive Key Metrics)</h3>
        <table>
          <tr>
            <th>รายการตัวชี้วัดหลัก</th>
            <th>จำนวนสถิติ</th>
            <th>หน่วยนับ</th>
          </tr>
          <tr>
            <td>จำนวนกิจกรรมการดำเนินงานที่บันทึกรวม</td>
            <td class='text-center'><strong>${toThaiNumerals(formatThNumber(summaryData.totalCount))}</strong></td>
            <td class='text-center'>รายการ</td>
          </tr>
          <tr>
            <td>จำนวนโรงเรียน ตชด. ที่เข้าร่วมบันทึกข้อมูล</td>
            <td class='text-center'><strong>${toThaiNumerals(formatThNumber(summaryData.totalSchools))}</strong></td>
            <td class='text-center'>แห่ง</td>
          </tr>
          <tr>
            <td>จำนวนนักเรียน ครู และผู้รับประโยชน์รวม</td>
            <td class='text-center'><strong>${toThaiNumerals(formatThNumber(summaryData.totalParticipants))}</strong></td>
            <td class='text-center'>คน</td>
          </tr>
          <tr>
            <td>ประเด็นปัญหาและอุปสรรคที่พบในพื้นที่</td>
            <td class='text-center'><strong>${toThaiNumerals(formatThNumber(summaryData.totalProblems))}</strong></td>
            <td class='text-center'>เรื่อง</td>
          </tr>
          <tr>
            <td>อัตราความสำเร็จในการตอบสนองแก้ไขปัญหา</td>
            <td class='text-center'><strong>${toThaiNumerals(summaryData.resolutionRate)}%</strong></td>
            <td class='text-center'>ร้อยละ</td>
          </tr>
        </table>

        <h3>${toThaiNumerals(2)}. การดำเนินงานจำแนกตาม ${toThaiNumerals(8)} เป้าหมายหลัก (กพด.)</h3>
        <table>
          <tr>
            <th>เป้าหมายหลักพัฒนาเด็กและเยาวชน (กพด.)</th>
            <th>จำนวนกิจกรรม</th>
            <th>สัดส่วน</th>
          </tr>
          ${summaryData.goalCounts.map(g => `
            <tr>
              <td>ด้านที่ ${toThaiNumerals(g.id)} ${g.title}</td>
              <td class='text-center'>${toThaiNumerals(formatThNumber(g.count))}</td>
              <td class='text-center'>${toThaiNumerals(g.percent)}%</td>
            </tr>
          `).join('')}
        </table>

        <h3>${toThaiNumerals(3)}. สถานะการตอบสนองข้อเสนอแนะและปัญหา (Action Item Tracking)</h3>
        <p>
          - <strong>รอการดำเนินการ:</strong> ${toThaiNumerals(summaryData.pendingCount)} เรื่อง<br/>
          - <strong>กำลังดำเนินการแก้ไข:</strong> ${toThaiNumerals(summaryData.inProgressCount)} เรื่อง<br/>
          - <strong>ดำเนินการแก้ไขเรียบร้อยแล้ว:</strong> ${toThaiNumerals(summaryData.resolvedCount)} เรื่อง
        </p>
        
        <table>
          <tr>
            <th>โรงเรียน/หน่วยงาน</th>
            <th>ประเด็นปัญหาที่รายงาน</th>
            <th>สถานะตอบสนอง</th>
            <th>หน่วยงานรับผิดชอบหลัก</th>
          </tr>
          ${summaryData.problemReportsList.map(r => {
            const action = getActionItem(r);
            return `
              <tr>
                <td>${r.schoolName}</td>
                <td>${r.problems}</td>
                <td class='text-center'>[${action.status === 'RESOLVED' ? 'แก้ไขแล้ว' : action.status === 'IN_PROGRESS' ? 'กำลังแก้ไข' : 'รอการดำเนินการ'}]</td>
                <td>${action.responsibleUnit}</td>
              </tr>
            `;
          }).join('')}
        </table>

        <h3>4. ข้อสังเกตและข้อเสนอแนะเชิงบริหาร (Executive Directives)</h3>
        <div class='box'>
          <p>${executiveNote}</p>
        </div>

        <br/><br/>
        <table border='0' style='border:none;'>
          <tr style='border:none;'>
            <td style='border:none;' width='50%'></td>
            <td style='border:none; text-align:center;'>
              <p>ลงชื่อ............................................................</p>
              <p>( ${signerName} )</p>
              <p>${signerTitle}</p>
              <p>วันที่ .......... เดือน .................... พ.ศ. 2569</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + content], { type: 'application/msword;charset=utf-8;' });
    const fileName = sanitizeWindowsFilename(`Executive_Summary_BPP_Plan5_${new Date().toISOString().slice(0,10)}.doc`);
    
    setExportStatus((prev) => ({
      ...prev,
      progress: 90,
      message: isMobile ? "กำลังส่งไฟล์เอกสาร..." : "กำลังบันทึกไฟล์...",
    }));

    await triggerCrossPlatformDownload(blob, fileName, {
      mimeType: "application/msword",
      title: fileName,
    });

    setExportStatus({
      isExporting: true,
      progress: 100,
      message: "ส่งออกไฟล์เอกสาร Word สำเร็จ!",
    });

    setTimeout(() => {
      setExportStatus({ isExporting: false, progress: 0, message: "" });
    }, 2500);
  } catch (e) {
    console.error("Word export failed", e);
    setExportStatus({
      isExporting: true,
      progress: 100,
      message: "เกิดข้อผิดพลาดในการส่งออกเอกสาร",
    });
    setTimeout(() => {
      setExportStatus({ isExporting: false, progress: 0, message: "" });
    }, 3000);
  }
};

  if (!isOpen && !isEmbedded) return null;

  const innerContent = (
    <div className={`bg-white w-full ${
      isFullScreen 
        ? "fixed inset-0 z-[9999] bg-slate-900 flex flex-col h-screen w-screen overflow-hidden" 
        : isEmbedded 
        ? "rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" 
        : "max-w-5xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto"
    }`}>
        
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-col gap-2.5 shrink-0 no-print border-b border-slate-800 relative">
          <div className="flex items-start justify-between gap-3 min-w-0 w-full pr-8">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-xl shadow-md shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 
                  className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-black tracking-tight text-white leading-snug whitespace-nowrap overflow-hidden text-ellipsis"
                  title="สร้างรายงานสรุปภาพรวมผู้บริหาร"
                >
                  สร้างรายงานสรุปภาพรวมผู้บริหาร
                </h2>
                <p 
                  className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis"
                  title="ประมวลผลกราฟ สถิติ และข้อสรุปปัญหารายงวดเป็นเอกสารฉบับเดียวสำหรับผู้บังคับบัญชา"
                >
                  ประมวลผลกราฟ สถิติ และข้อสรุปปัญหารายงวดเป็นเอกสารฉบับเดียวสำหรับผู้บังคับบัญชา
                </p>
              </div>
            </div>
            {!isEmbedded && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer shrink-0 absolute top-3.5 right-4"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Row 3: Action Buttons */}
          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
            <button
              type="button"
              disabled={exportStatus.isExporting}
              onClick={handleExportWord}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/60 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs active:scale-95 shrink-0 disabled:cursor-not-allowed"
              title="ดาวน์โหลดไฟล์ Word (.doc) เพื่อแก้ไขข้อความเพิ่มเติม (รองรับ iPad และสมาร์ทโฟน)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="whitespace-nowrap">ส่งออกไฟล์เอกสาร</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition cursor-pointer shadow-md active:scale-95 shrink-0"
              title="พิมพ์เอกสาร หรือ บันทึกไฟล์"
            >
              <Printer className="w-4 h-4" />
              <span className="whitespace-nowrap">พิมพ์ / บันทึกเอกสาร</span>
            </button>

            <button
              type="button"
              onClick={handleExportPng}
              disabled={exportStatus.isExporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:bg-purple-700/60 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs active:scale-95 shrink-0 disabled:cursor-not-allowed"
              title="ส่งออกรายงานเป็นรูปภาพความละเอียดสูง (รองรับ iPad และสมาร์ทโฟน)"
            >
              {exportStatus.isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
              ) : (
                <FileImage className="w-4 h-4 text-purple-200" />
              )}
              <span className="whitespace-nowrap">{exportStatus.isExporting ? "กำลังส่งออก..." : "ส่งออกไฟล์รูปภาพ"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-extrabold rounded-xl text-xs transition cursor-pointer shadow-xs active:scale-95 shrink-0 border border-slate-700"
              title={isFullScreen ? "ออกจากโหมดเต็มจอ" : "ขยายหน้ากระดาษเต็มจอ"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="whitespace-nowrap">{isFullScreen ? "ออกจากเต็มจอ" : "แสดงผลเต็มจอ"}</span>
            </button>
          </div>
        </div>

        {/* Executive Customization Toolbar (Hidden on print) */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs no-print shrink-0">
          <div>
            <label className="font-extrabold text-slate-700 block mb-0.5">รอบการรายงาน (สรุปรายสัปดาห์):</label>
            <select
              value={selectedPeriod}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedPeriod(val);
                if (val.startsWith("WEEKLY")) {
                  setExecutiveNote(
                    `การดำเนินงานกิจกรรมตามพระราชดำริ กพด. ประจำสัปดาห์ (${getFridayCutoffDateText(val)}) มีความก้าวหน้าตามเป้าหมายตัวชี้วัดเป็นอย่างดี รร.ตชด. ในสังกัด ได้บันทึกและส่งรายงานผลการดำเนินงานเรียบร้อยแล้ว`
                  );
                }
              }}
              className="w-full p-2 bg-white border border-indigo-300 rounded-xl font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            >
              <option value="WEEKLY_ACCUMULATED_ALL">🗓️ สะสมเพิ่มหน้าเอกสารสรุปรายสัปดาห์ทุกวันศุกร์ (เพิ่มหน้า A4 อัตโนมัติทุกวันศุกร์)</option>
              <option value="WEEKLY_LAST_4_WEEKS">📚 รวมรายงานสรุปย้อนหลัง 4 วันศุกร์ล่าสุด (4 ชุดเอกสาร A4)</option>
              <option value="WEEKLY_LAST_8_WEEKS">📚 รวมรายงานสรุปย้อนหลัง 8 วันศุกร์ล่าสุด (8 ชุดเอกสาร A4)</option>
              <option value="WEEKLY_FRIDAY">📅 รายสัปดาห์ (ตัดรอบวันศุกร์ล่าสุด)</option>
              <option value="WEEKLY_PREVIOUS_1">📅 รายสัปดาห์ (ตัดรอบวันศุกร์ย้อนหลัง 1 สัปดาห์)</option>
              <option value="WEEKLY_PREVIOUS_2">📅 รายสัปดาห์ (ตัดรอบวันศุกร์ย้อนหลัง 2 สัปดาห์)</option>
              <option value="WEEKLY_PREVIOUS_3">📅 รายสัปดาห์ (ตัดรอบวันศุกร์ย้อนหลัง 3 สัปดาห์)</option>
              <option value="ALL">📊 ภาพรวมสะสมทั้งหมด (ปีงบประมาณ 2569)</option>
            </select>
          </div>

          <div>
            <label className="font-extrabold text-slate-700 block mb-0.5">กรองสังกัด บก.ตชด. ภาค:</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">ทุกกองบังคับการ (ตชด. ภาค 1 - 4 รวมทั่วประเทศ)</option>
              <option value="REGION_1">บก.ตชด. ภาค 1 (ภาคกลาง/ตะวันออก/ตะวันตก)</option>
              <option value="REGION_2">บก.ตชด. ภาค 2 (ภาคตะวันออกเฉียงเหนือ)</option>
              <option value="REGION_3">บก.ตชด. ภาค 3 (ภาคเหนือ)</option>
              <option value="REGION_4">บก.ตชด. ภาค 4 (ภาคใต้)</option>
            </select>
          </div>

          <div>
            <label className="font-extrabold text-slate-700 block mb-0.5">กรองเป้าหมาย กพด.:</label>
            <select
              value={selectedGoal}
              onChange={(e) => setSelectedGoal(e.target.value)}
              className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">รวมครบทั้ง 8 ด้านหลักพัฒนาเด็กและเยาวชน</option>
              {KOPODOT_GOALS.map(g => (
                <option key={g.id} value={`ด้านที่ ${g.id}`}>ด้านที่ {g.id} {g.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-extrabold text-indigo-950 block mb-1">รูปแบบการแสดงตัวเลข (Number System):</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setUseArabicNumerals(false)}
                className={`py-1.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${!useArabicNumerals ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                🇹🇭 123 (ไทย)
              </button>
              <button
                type="button"
                onClick={() => setUseArabicNumerals(true)}
                className={`py-1.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${useArabicNumerals ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                🔢 123 (อารบิก)
              </button>
            </div>
          </div>

          <div>
            <label className="font-extrabold text-slate-700 block mb-0.5">หัวข้อรายงานสรุปประจำสัปดาห์:</label>
            <select
              value={customReportTitle || (selectedPeriod.startsWith("WEEKLY") ? "รายงานสรุปผลการปฏิบัติงานประจำสัปดาห์สำหรับผู้บริหาร" : "รายงานสรุปภาพรวมสำหรับผู้บริหาร")}
              onChange={(e) => setCustomReportTitle(e.target.value)}
              className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 mb-1"
            >
              <option value="รายงานสรุปผลการปฏิบัติงานประจำสัปดาห์สำหรับผู้บริหาร">📝 แนะนำ 1: รายงานสรุปผลการปฏิบัติงานประจำสัปดาห์สำหรับผู้บริหาร</option>
              <option value="รายงานดัชนีความก้าวหน้าการดำเนินงานโครงการตามพระราชดำริรายสัปดาห์">📝 แนะนำ 2: รายงานดัชนีความก้าวหน้าการดำเนินงานโครงการตามพระราชดำริรายสัปดาห์</option>
              <option value="รายงานสรุปเชิงยุทธศาสตร์การติดตามประเด็นปัญหาเร่งด่วนประจำสัปดาห์">📝 แนะนำ 3: รายงานสรุปเชิงยุทธศาสตร์การติดตามประเด็นปัญหาเร่งด่วนประจำสัปดาห์</option>
              <option value="สรุปสถานะการติดตามส่งรายงาน ตชด. และอุปสรรคสนามรายสัปดาห์">📝 แนะนำ 4: สรุปสถานะการติดตามส่งรายงาน ตชด. และอุปสรรคสนามรายสัปดาห์</option>
              <option value="CUSTOM_TEXT">✏️ กำหนดหัวข้อหลักด้วยตนเอง...</option>
            </select>
            
            {/* Show text input if "CUSTOM_TEXT" or any custom value is selected */}
            {(customReportTitle && !["รายงานสรุปผลการปฏิบัติงานประจำสัปดาห์สำหรับผู้บริหาร", "รายงานดัชนีความก้าวหน้าการดำเนินงานโครงการตามพระราชดำริรายสัปดาห์", "รายงานสรุปเชิงยุทธศาสตร์การติดตามประเด็นปัญหาเร่งด่วนประจำสัปดาห์", "สรุปสถานะการติดตามส่งรายงาน ตชด. และอุปสรรคสนามรายสัปดาห์"].includes(customReportTitle)) || (customReportTitle === "CUSTOM_TEXT") ? (
              <input
                type="text"
                value={customReportTitle === "CUSTOM_TEXT" ? "" : customReportTitle}
                onChange={(e) => setCustomReportTitle(e.target.value)}
                placeholder="พิมพ์หัวข้อรายงานสรุปที่นี่..."
                className="w-full p-2 bg-white border border-indigo-300 rounded-xl font-bold text-xs text-indigo-950 focus:ring-2 focus:ring-indigo-500"
              />
            ) : customReportTitle === "" ? (
              <button 
                type="button" 
                onClick={() => setCustomReportTitle("CUSTOM_TEXT")}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline block"
              >
                + เขียนหัวข้อรายงานของคุณเอง
              </button>
            ) : null}
          </div>

          <div>
            <label className="font-extrabold text-slate-700 block mb-0.5">ตำแหน่งผู้ลงนามรายงาน:</label>
            <input
              type="text"
              value={signerTitle}
              onChange={(e) => setSignerTitle(e.target.value)}
              placeholder="ตำแหน่ง..."
              className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Print / Preview Content Area - Simulated A4 Paper */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200/90 space-y-3 flex flex-col items-center justify-start" id="executive-summary-print-container" ref={printRef}>
          
          {/* Interactive Simulated A4 Toolbar (Zoom / Fullscreen / Reset) */}
          <div className="no-print bg-slate-900 text-slate-100 px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-md w-full max-w-[794px] mx-auto border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider font-mono">
                หน้ากระดาษจำลอง A4
              </span>
              <span className="text-xs text-slate-300 font-bold hidden sm:inline">
                | อัตราส่วน 210 x 297 มม.
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              {/* Zoom Out */}
              <button
                type="button"
                onClick={() => setZoomFactor((prev) => Math.max(0.5, +(prev - 0.1).toFixed(2)))}
                className="p-1.5 hover:bg-slate-800 active:bg-slate-700 text-slate-200 rounded-lg transition cursor-pointer"
                title="ย่อขนาดกระดาษ"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              {/* Scale Badge */}
              <span className="font-mono text-xs font-black text-amber-300 bg-slate-950 px-2 py-1 rounded-md min-w-[52px] text-center border border-slate-800">
                {Math.round(effectiveScale * 100)}%
              </span>

              {/* Zoom In */}
              <button
                type="button"
                onClick={() => setZoomFactor((prev) => Math.min(2.0, +(prev + 0.1).toFixed(2)))}
                className="p-1.5 hover:bg-slate-800 active:bg-slate-700 text-slate-200 rounded-lg transition cursor-pointer"
                title="ขยายขนาดกระดาษ"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {/* Reset / Fit Screen */}
              <button
                type="button"
                onClick={() => setZoomFactor(0.95)}
                className="p-1.5 hover:bg-slate-800 active:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer flex items-center gap-1 font-bold text-[11px]"
                title="พอดีหน้าจอ / รีเซ็ต 95%"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">รีเซ็ต</span>
              </button>

              <div className="h-4 w-px bg-slate-700 mx-1" />

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] shadow-xs"
                title={isFullScreen ? "ออกจากโหมดเต็มจอ" : "แสดงผลเอกสารเต็มจอ"}
              >
                {isFullScreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">ย่อขนาด</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">แสดงเต็มจอ</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Scaler Wrapper */}
          <div ref={paperWrapperRef} className="w-full flex justify-center items-center overflow-x-auto py-2">
            <div 
              className="relative shrink-0 mx-auto"
              style={{
                width: `${Math.round(794 * effectiveScale)}px`,
                height: `${Math.round(totalHeight * effectiveScale)}px`,
                transition: "width 0.25s ease-out, height 0.25s ease-out"
              }}
            >
              <div
                style={{
                  width: "794px",
                  transform: `scale(${effectiveScale})`,
                  transformOrigin: "top left",
                  position: "absolute",
                  left: 0,
                  top: 0,
                  transition: "transform 0.25s ease-out"
                }}
                className="space-y-8"
              >
                {roundsWithPages.map(({ round, roundReports, roundSummary, problemsList, itemsPerPage, totalPagesForRound }, rIdx) => {
                  const problemChunks: typeof problemsList[] = [];

                  if (problemsList.length === 0) {
                    problemChunks.push([]);
                  } else {
                    for (let i = 0; i < problemsList.length; i += itemsPerPage) {
                      problemChunks.push(problemsList.slice(i, i + itemsPerPage));
                    }
                  }
                  
                  const isLastRound = rIdx === fridayRounds.length - 1;

                  return (
                    <React.Fragment key={round.id}>
                      {/* ===== PAGE 1 OF FRIDAY ROUND: Overview & 8 Goals ===== */}
                      <div className="bg-white w-[794px] min-h-[1123px] mx-auto p-12 rounded-xs shadow-[0_20px_60px_rgba(0,0,0,0.22)] border border-slate-400 flex flex-col justify-between text-slate-900 sarabun-font print:border-none print:shadow-none print:p-0 print:w-full print:min-h-[1123px] print:break-after-page relative">
                        <div className="space-y-6">
                          {/* Header Emblem & Title - Strict Official Format */}
                          <div className="text-center space-y-2 border-b-2 border-slate-900 pb-4 relative">
                            <div className="flex justify-center mb-2">
                              <img
                                src={ROYAL_EMBLEM_IMAGE}
                                alt="ตราสัญลักษณ์ กพด."
                                referrerPolicy="no-referrer"
                                className="w-20 h-20 object-contain drop-shadow-xs"
                              />
                            </div>
                            <h1 className="text-xl font-black text-slate-900 tracking-normal">
                              {reportTitleText}
                            </h1>
                            <h2 className="text-sm font-black text-slate-900 tracking-tight">
                              โครงการตามพระราชดำริ สมเด็จพระกนิษฐาธิราชเจ้า กรมสมเด็จพระเทพรัตนราชสุดาฯ สยามบรมราชกุมารี
                            </h2>
                            <div className="text-xs font-bold text-slate-800 pt-0.5 space-y-1">
                              <p>กองบังคับการตำรวจตระเวนชายแดนภาค {toThaiNumerals(2)} (บก.ตชด.ภาค {toThaiNumerals(2)}) • กำกับดูแล {toThaiNumerals(4)} กองกำกับการ (กก.ตชด.{toThaiNumerals(21)}-{toThaiNumerals(24)}) รวม {toThaiNumerals(53)} โรงเรียน</p>
                              <div className="pt-1 flex justify-center">
                                <span className="bg-slate-100 text-slate-950 border-2 border-slate-900 px-3 py-1 font-black rounded-xs text-[11.5px] tracking-tight">
                                  📌 รอบรายงานสรุปประจำสัปดาห์ (ตัดรอบรายงานทุกวันศุกร์) : {round.label} {fridayRounds.length > 1 ? `(ชุดสัปดาห์ที่ ${toThaiNumerals(round.weekNum)})` : ""}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Section 1: Executive Key Metrics */}
                          <div className="space-y-3 pt-1">
                            <div className="flex items-center justify-between border-l-4 border-slate-900 pl-3 py-0.5">
                              <h3 className="text-sm font-black text-slate-900">
                                {toThaiNumerals(1)}. สรุปสถิติผลการดำเนินงานภาพรวมประจำรอบวันศุกร์
                              </h3>
                              <span className="text-[10px] text-slate-700 font-bold bg-slate-100 px-3 py-0.5 rounded-sm border border-slate-300">ข้อมูลประมวลผลระบบฐานข้อมูล</span>
                            </div>

                            <div className="grid grid-cols-4 gap-3">
                              <div className="p-3.5 rounded-sm bg-slate-50 border border-slate-400 shadow-2xs text-left">
                                <p className="text-[9.5px] font-black text-slate-700 uppercase tracking-wider">กิจกรรมที่บันทึกรวม</p>
                                <p className="text-2xl font-black text-slate-950 mt-1">
                                  {toThaiNumerals(formatThNumber(roundSummary.totalCount))} <span className="text-[11px] text-slate-600 font-bold">รายการ</span>
                                </p>
                              </div>

                              <div className="p-3.5 rounded-sm bg-slate-50 border border-slate-400 shadow-2xs text-left">
                                <p className="text-[9.5px] font-black text-slate-700 uppercase tracking-wider">โรงเรียน ตชด. ที่บันทึก</p>
                                <p className="text-2xl font-black text-slate-950 mt-1">
                                  {toThaiNumerals(formatThNumber(roundSummary.totalSchools))} <span className="text-[11px] text-slate-600 font-bold">แห่ง</span>
                                </p>
                              </div>

                              <div className="p-3.5 rounded-sm bg-slate-50 border border-slate-400 shadow-2xs text-left">
                                <p className="text-[9.5px] font-black text-slate-700 uppercase tracking-wider">ผู้เข้าร่วม/ผู้รับประโยชน์</p>
                                <p className="text-2xl font-black text-slate-950 mt-1">
                                  {toThaiNumerals(formatThNumber(roundSummary.totalParticipants))} <span className="text-[11px] text-slate-600 font-bold">คน</span>
                                </p>
                              </div>

                              <div className="p-3.5 rounded-sm bg-slate-50 border border-slate-400 shadow-2xs text-left">
                                <p className="text-[9.5px] font-black text-slate-700 uppercase tracking-wider">อัตราแก้ไขปัญหาสำเร็จ</p>
                                <p className="text-2xl font-black text-slate-950 mt-1">
                                  {toThaiNumerals(roundSummary.resolutionRate)}% <span className="text-[11px] text-slate-600 font-bold">สำเร็จ</span>
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Section 2: Goals & Visual Chart Bars */}
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between border-l-4 border-slate-900 pl-3 py-0.5">
                              <h3 className="text-sm font-black text-slate-900">
                                {toThaiNumerals(2)}. สรุปความก้าวหน้าตาม {toThaiNumerals(8)} เป้าหมายหลักพัฒนาเด็กและเยาวชน (กพด.)
                              </h3>
                              <span className="text-[10px] text-slate-800 font-bold bg-slate-100 px-3 py-0.5 rounded-sm border border-slate-300">แผนพัฒนาเด็กและเยาวชนฯ ฉบับที่ 5</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-[11px]">
                              {roundSummary.goalCounts.map(g => (
                                <div key={g.id} className="p-3 rounded-sm border border-slate-300 bg-slate-50/80 space-y-2">
                                  <div className="flex items-center justify-between font-bold text-slate-900">
                                    <span className="font-black text-slate-900 truncate max-w-[210px]">ด้านที่ {toThaiNumerals(g.id)} {g.title}</span>
                                    <span className="text-slate-950 font-black whitespace-nowrap">
                                      {toThaiNumerals(formatThNumber(g.count))} <span className="text-slate-600 text-[9.5px] font-bold">งาน</span> <span className="text-slate-400 font-normal">|</span> <span className="text-slate-950 font-black">{toThaiNumerals(g.percent)}%</span>
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-200 h-2.5 rounded-none overflow-hidden border border-slate-400">
                                    <div 
                                      className="bg-slate-900 h-full transition-all duration-300"
                                      style={{ width: `${Math.max(g.percent, 2)}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Page 1 Footer */}
                        <div className="pt-4 border-t border-slate-400 text-slate-700 text-[11px] flex justify-between items-center font-bold">
                          <span>โครงการตามพระราชดำริ กพด. • บก.ตชด.ภาค {toThaiNumerals(2)} ({round.label})</span>
                          <span className="bg-slate-100 border border-slate-300 px-3 py-0.5 rounded-sm text-slate-900 font-bold">
                            หน้า {toThaiNumerals(1)} จาก {toThaiNumerals(totalPagesForRound)}
                          </span>
                        </div>
                      </div>

                      {/* ===== PAGE 2..N: Problem Reports & Action Items & Directives ===== */}
                      {problemChunks.map((chunk, pageIndex) => {
                        const currentPageNum = 2 + pageIndex;
                        const isLastPageInRound = pageIndex === problemChunks.length - 1;
                        const startIdx = pageIndex * itemsPerPage;

                        return (
                          <div
                            key={`page-${round.id}-${currentPageNum}`}
                            className="bg-white w-[794px] min-h-[1123px] mx-auto p-12 rounded-xs shadow-[0_20px_60px_rgba(0,0,0,0.22)] border border-slate-400 flex flex-col justify-between text-slate-900 sarabun-font print:border-none print:shadow-none print:p-0 print:w-full print:min-h-[1123px] print:break-after-page relative"
                          >
                            <div className="space-y-5">
                              {/* Page Header Banner */}
                              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={ROYAL_EMBLEM_IMAGE}
                                    alt="ตราสัญลักษณ์"
                                    referrerPolicy="no-referrer"
                                    className="w-14 h-14 object-contain"
                                  />
                                  <div>
                                    <h2 className="text-base font-black text-slate-900">
                                      รายงานสรุปภาพรวมสำหรับผู้บริหาร (ประจำรอบ {round.label})
                                    </h2>
                                    <p className="text-xs text-slate-800 font-bold">
                                      ส่วนที่ {toThaiNumerals(3)} : รายละเอียดประเด็นปัญหาและบัญชาการ {pageIndex > 0 ? `(ชุดที่ ${toThaiNumerals(pageIndex + 1)})` : ""}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-900 border border-slate-400 px-3 py-1 rounded-sm bg-slate-100">
                                  เอกสารแนบแผ่นที่ {toThaiNumerals(currentPageNum)}
                                </span>
                              </div>

                              {/* Show Summary badges only on first problem page */}
                              {pageIndex === 0 && (
                                <div className="space-y-2.5">
                                  <div className="flex items-center justify-between border-l-4 border-slate-900 pl-3 py-0.5">
                                    <h3 className="text-xs font-black text-slate-900">
                                      {toThaiNumerals(3)}. สรุปประเด็นปัญหาและสถานะการตอบสนองแก้ไข
                                    </h3>
                                    <span className="text-[10px] text-slate-800 font-bold bg-slate-100 px-2.5 py-0.5 rounded-sm border border-slate-300">จำแนกตามสถานะการดำเนินงาน</span>
                                  </div>

                                  <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="p-3 rounded-sm bg-slate-50 border border-slate-400 shadow-2xs">
                                      <span className="text-[10px] font-black text-slate-800 uppercase">รอการดำเนินการ</span>
                                      <p className="text-lg font-black text-slate-950 mt-0.5">{toThaiNumerals(roundSummary.pendingCount)} เรื่อง</p>
                                    </div>
                                    <div className="p-3 rounded-sm bg-slate-50 border border-slate-400 shadow-2xs">
                                      <span className="text-[10px] font-black text-slate-800 uppercase">อยู่ระหว่างแก้ไข</span>
                                      <p className="text-lg font-black text-slate-950 mt-0.5">{toThaiNumerals(roundSummary.inProgressCount)} เรื่อง</p>
                                    </div>
                                    <div className="p-3 rounded-sm bg-slate-50 border border-slate-400 shadow-2xs">
                                      <span className="text-[10px] font-black text-slate-800 uppercase">ดำเนินการแก้ไขแล้ว</span>
                                      <p className="text-lg font-black text-slate-950 mt-0.5">{toThaiNumerals(roundSummary.resolvedCount)} เรื่อง</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Action Items Table */}
                              <div className="space-y-2">
                                {pageIndex > 0 && (
                                  <div className="border-l-4 border-slate-900 pl-3 py-0.5">
                                    <h3 className="text-xs font-black text-slate-900">
                                      ตารางประเด็นปัญหาและสถานะตอบสนอง (ต่อ)
                                    </h3>
                                  </div>
                                )}

                                <div className="overflow-x-auto border-2 border-slate-900 rounded-none shadow-2xs">
                                  <table className="w-full text-left text-[11px] border-collapse table-fixed">
                                    <thead>
                                      <tr className="bg-slate-900 text-white font-black border-b-2 border-slate-900">
                                        <th className="p-2.5 w-[6%] text-center border-r border-slate-700">#</th>
                                        <th className="p-2.5 w-[22%] border-r border-slate-700">โรงเรียน</th>
                                        <th className="p-2.5 w-[42%] border-r border-slate-700">ประเด็นปัญหาสำคัญ</th>
                                        <th className="p-2.5 w-[15%] text-center border-r border-slate-700">สถานะตอบสนอง</th>
                                        <th className="p-2.5 w-[15%]">หน่วยงานรับผิดชอบหลัก</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-300">
                                      {chunk.length === 0 ? (
                                        <tr>
                                          <td colSpan={5} className="p-4 text-center text-slate-600 font-bold">
                                            ไม่พบประเด็นปัญหารายงานในช่วงที่เลือก
                                          </td>
                                        </tr>
                                      ) : (
                                        chunk.map((r, idx) => {
                                          const action = getActionItem(r);
                                          const globalIdx = startIdx + idx + 1;
                                          return (
                                            <tr key={r.id} className="hover:bg-slate-50 transition-colors odd:bg-white even:bg-slate-50/50">
                                              <td className="p-2.5 text-center font-black text-slate-700 border-r border-slate-300 align-top">{toThaiNumerals(globalIdx)}</td>
                                              <td className="p-2.5 font-black text-slate-900 border-r border-slate-300 align-top break-words">{r.schoolName}</td>
                                              <td className="p-2.5 text-slate-800 leading-relaxed font-medium border-r border-slate-300 align-top break-words">{r.problems}</td>
                                              <td className="p-2.5 text-center border-r border-slate-300 align-top">
                                                <span className="inline-block px-2 py-0.5 rounded-sm text-[10px] font-black whitespace-nowrap bg-slate-100 text-slate-950 border border-slate-400">
                                                  {action.status === "RESOLVED" ? "แก้ไขแล้ว" : action.status === "IN_PROGRESS" ? "กำลังแก้ไข" : "รอการดำเนินการ"}
                                                </span>
                                              </td>
                                              <td className="p-2.5 font-bold text-slate-900 align-top break-words">{action.responsibleUnit}</td>
                                            </tr>
                                          );
                                        })
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Section 4 & 5 rendered on the final page of each round */}
                              {isLastPageInRound && (
                                <div className="space-y-4 pt-1">
                                  {/* Section 4: Executive Directive Note */}
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between border-l-4 border-slate-900 pl-3 py-0.5">
                                      <h3 className="text-xs font-black text-slate-900">
                                        4. ข้อสังเกตและบัญชาการของผู้บริหาร
                                      </h3>
                                      <span className="text-[10px] text-slate-700 font-bold bg-slate-100 px-2.5 py-0.5 rounded-sm border border-slate-300">บันทึกข้อความสั่งการ</span>
                                    </div>
                                    <div className="p-4 rounded-sm bg-slate-50 border border-slate-400 text-[11px] text-slate-900 leading-relaxed font-medium shadow-2xs">
                                      <textarea
                                        rows={2}
                                        value={executiveNote}
                                        onChange={(e) => setExecutiveNote(e.target.value)}
                                        className="w-full bg-transparent border-none focus:outline-none resize-none font-medium text-slate-900 leading-relaxed no-print"
                                        placeholder="พิมพ์ข้อสังเกต หรือแนวนโยบายบัญชาการเพิ่มเติม..."
                                      />
                                      <div className="hidden print:block font-medium text-slate-900 leading-relaxed">
                                        {executiveNote}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Section 5: Official Signature Line */}
                                  <div className="pt-2 flex justify-end text-[11px] font-bold text-slate-900">
                                    <div className="text-center space-y-1.5 min-w-[280px] p-4 rounded-sm border border-slate-400 bg-slate-50/80 shadow-2xs">
                                      <p className="mb-3 font-extrabold whitespace-nowrap overflow-hidden text-ellipsis">ลงชื่อ............................................................</p>
                                      <div className="no-print">
                                        <input
                                          type="text"
                                          value={signerName}
                                          onChange={(e) => setSignerName(e.target.value)}
                                          placeholder="พิมพ์ชื่อ-สกุล ผู้ลงนาม..."
                                          className="text-center font-black text-slate-900 border-b border-slate-400 focus:outline-none w-full text-[11px] py-0.5 placeholder:font-normal placeholder:text-slate-400 bg-transparent"
                                        />
                                      </div>
                                      <p className="hidden print:block font-extrabold">({signerName || "............................................................"})</p>
                                      <p className="text-[11px] text-slate-900 font-bold">{signerTitle}</p>
                                      <p className="text-[11px] text-slate-800 font-bold pt-0.5">
                                        วันที่ .......... เดือน .................... พ.ศ. 2569
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Page N Footer */}
                            <div className="pt-4 border-t border-slate-400 text-slate-700 text-[11px] flex justify-between items-center font-bold">
                              <span>โครงการตามพระราชดำริ กพด. • บก.ตชด.ภาค 2 ({round.label})</span>
                              <span className="bg-slate-100 border border-slate-300 px-3 py-0.5 rounded-sm text-slate-900 font-bold">
                                หน้า {toThaiNumerals(currentPageNum)} จาก {toThaiNumerals(totalPagesForRound)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {/* Floating Export Status Toast */}
        {exportStatus.isExporting && (
          <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[9999] bg-slate-950/95 text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md max-w-sm w-auto sm:w-full mx-auto sm:mx-0 animate-in fade-in slide-in-from-bottom-5 duration-200 no-print">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {exportStatus.progress === 100 ? (
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center animate-spin shrink-0">
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  </div>
                )}
                <span className="font-extrabold text-xs text-slate-100">
                  {exportStatus.progress === 100 ? "ส่งออกเรียบร้อยแล้ว" : "กำลังส่งออกรายงานผู้บริหาร"}
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
                    : "bg-gradient-to-r from-purple-500 via-indigo-500 to-amber-400"
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
      </div>
    );

  if (isEmbedded) {
    return <div className="w-full select-text">{innerContent}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto no-print-bg select-text">
      {innerContent}
    </div>
  );
};

export default ExecutiveSummaryModal;
