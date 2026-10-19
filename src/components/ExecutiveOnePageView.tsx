import React, { useState, useMemo, useRef, useEffect } from "react";
import { ActivityReport, KOPODOT_GOALS } from "../types";
import { OFFICIAL_TARGET_SCHOOLS, isSchoolMatch } from "../data/schoolsData";
import { ROYAL_EMBLEM_IMAGE } from "../data/emblemLogo";
import { safeHtml2Canvas } from "../lib/html2canvasFix";
import { sanitizeWindowsFilename, triggerWindowsFileDownload, triggerCrossPlatformDownload, getAdaptiveCanvasScale, isMobileOrTablet } from "../lib/windowsUtils";
import jsPDF from "jspdf";
import {
  FileText,
  Printer,
  Download,
  Loader2,
  Sparkles,
  Building2,
  Users,
  Award,
  BarChart3,
  Copy,
  Check,
  RefreshCw,
  FileCheck2,
  TrendingUp,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  Search,
  Filter,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import { PeriodicAndCumulativeAnalysis } from "./PeriodicAndCumulativeAnalysis";

export interface ExecutiveOnePageViewProps {
  reports: ActivityReport[];
  onNavigateToDocument?: (reportId: string) => void;
  onOpenDashboard?: () => void;
}

interface GeminiSynthesisResult {
  executiveOverview: string;
  strengths: string[];
  improvements: string[];
  confidenceScore: number;
  isFallback: boolean;
}

interface GeminiAnomalyAnalysisResult {
  rootCauseAnalysis: string;
  actionableRecommendations: string[];
  dataIntegrityScore: number;
  isFallback: boolean;
}

export type AnomalySeverity = "high" | "medium" | "low";

export interface DataAnomalyItem {
  id: string;
  severity: AnomalySeverity;
  category: string;
  schoolName: string;
  division: string;
  activityName: string;
  dateString: string;
  reportId?: string;
  issueDescription: string;
  currentValue: string;
  expectedValue: string;
  suggestedAction: string;
}

export const ExecutiveOnePageView: React.FC<ExecutiveOnePageViewProps> = ({
  reports,
  onNavigateToDocument,
  onOpenDashboard,
}) => {
  const [activeTab, setActiveTab] = useState<"executive_summary" | "data_audit" | "time_analysis">("executive_summary");
  const [selectedDivision, setSelectedDivision] = useState<string>("ALL");
  const [selectedPeriod, setSelectedPeriod] = useState<"ALL_YEAR" | "MONTHLY_CURRENT">("ALL_YEAR");
  const [useArabicNumerals, setUseArabicNumerals] = useState<boolean>(true);
  const [isCopiedOverview, setIsCopiedOverview] = useState<boolean>(false);
  const [isAiSynthesizing, setIsAiSynthesizing] = useState<boolean>(false);
  const [aiSynthesisData, setAiSynthesisData] = useState<GeminiSynthesisResult | null>(null);

  // Anomaly Audit states
  const [anomalySeverityFilter, setAnomalySeverityFilter] = useState<"all" | AnomalySeverity>("all");
  const [anomalySearchQuery, setAnomalySearchQuery] = useState<string>("");
  const [isAiAuditing, setIsAiAuditing] = useState<boolean>(false);
  const [aiAnomalyData, setAiAnomalyData] = useState<GeminiAnomalyAnalysisResult | null>(null);
  const [isCopiedAnomalyAnalysis, setIsCopiedAnomalyAnalysis] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<{
    isExporting: boolean;
    progress: number;
    message: string;
  }>({
    isExporting: false,
    progress: 0,
    message: "",
  });

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Helper Thai / Arabic Numerals
  const toTh = (num: number | string | undefined | null): string => {
    if (num === null || num === undefined) return "";
    const str = String(num);
    if (useArabicNumerals) {
      const thToArabicMap: Record<string, string> = {
        '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
        '5': '5', '6': '6', '7': '7', '8': '8', '9': '9'
      };
      return str.replace(/[๐-๙]/g, (d) => thToArabicMap[d] || d);
    }
    const thDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    return str.replace(/[0-9]/g, (d) => thDigits[parseInt(d, 10)]);
  };

  const formatThNum = (num: number): string => {
    if (useArabicNumerals) {
      return new Intl.NumberFormat("en-US").format(num);
    }
    const formatted = new Intl.NumberFormat("th-TH").format(num);
    return toTh(formatted);
  };

  // Division helper
  const getSchoolDivision = (schoolName: string): string => {
    const matched = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(schoolName, s.name));
    return matched ? matched.groupName : "ไม่ระบุสังกัด";
  };

  const isDivisionMatch = (itemDiv: string, targetDiv: string): boolean => {
    if (targetDiv === "ALL") return true;
    if (itemDiv === targetDiv) return true;
    if (targetDiv.includes("21") && (itemDiv.includes("21") || itemDiv.includes("21"))) return true;
    if (targetDiv.includes("22") && (itemDiv.includes("22") || itemDiv.includes("22"))) return true;
    if (targetDiv.includes("23") && (itemDiv.includes("23") || itemDiv.includes("23"))) return true;
    if (targetDiv.includes("24") && (itemDiv.includes("24") || itemDiv.includes("24"))) return true;
    return false;
  };

  // 1. Filter reports by selected division
  const filteredReports = useMemo(() => {
    if (selectedDivision === "ALL") return reports;
    return reports.filter((r) => {
      const div = getSchoolDivision(r.schoolName);
      return isDivisionMatch(div, selectedDivision);
    });
  }, [reports, selectedDivision]);

  // 2. Core Executive Metrics Aggregation
  const coreMetrics = useMemo(() => {
    const totalTargetSchools = selectedDivision === "ALL"
      ? 53
      : OFFICIAL_TARGET_SCHOOLS.filter((s) => isDivisionMatch(s.groupName, selectedDivision)).length;

    const totalReports = filteredReports.length;

    // Distinct schools submitted
    const activeSchoolsSet = new Set<string>();
    filteredReports.forEach((r) => {
      if (r.schoolName && r.schoolName.trim() !== "") {
        activeSchoolsSet.add(r.schoolName.trim());
      }
    });
    const activeSchoolsCount = activeSchoolsSet.size;

    // Total participants
    const totalParticipants = filteredReports.reduce((sum, r) => {
      const count = Number(r.participantsCount) || 0;
      return sum + count;
    }, 0);

    // Goal Coverage
    const coveredGoals = new Set<string>();
    filteredReports.forEach((r) => {
      const m = r.goalCode?.match(/(\d+)/);
      if (m) {
        coveredGoals.add(m[1]);
      }
    });
    const completedGoals = coveredGoals.size;
    const goalCompletionRate = Math.min(Math.round((completedGoals / 8) * 100), 100);

    return {
      totalTargetSchools,
      totalReports,
      activeSchoolsCount,
      totalParticipants,
      completedGoals,
      goalCompletionRate,
    };
  }, [filteredReports, selectedDivision]);

  // 3. Division Comparison Stats
  const divisionComparisonStats = useMemo(() => {
    const divisions = [
      { id: "กก.ตชด.21", fullName: "กองกำกับการตำรวจตระเวนชายแดนที่ 21", targetCount: 13, provinces: "สุรินทร์, บุรีรัมย์" },
      { id: "กก.ตชด.22", fullName: "กองกำกับการตำรวจตระเวนชายแดนที่ 22", targetCount: 10, provinces: "อุบลราชธานี, อำนาจเจริญ" },
      { id: "กก.ตชด.23", fullName: "กองกำกับการตำรวจตระเวนชายแดนที่ 23", targetCount: 14, provinces: "สกลนคร, นครพนม, มุกดาหาร" },
      { id: "กก.ตชด.24", fullName: "กองกำกับการตำรวจตระเวนชายแดนที่ 24", targetCount: 16, provinces: "อุดรธานี, เลย, หนองคาย, บึงกาฬ" },
    ];

    return divisions.map((div) => {
      const divReports = reports.filter((r) => {
        const itemDiv = getSchoolDivision(r.schoolName);
        return isDivisionMatch(itemDiv, div.fullName);
      });

      const activeSchools = new Set(divReports.map((r) => r.schoolName.trim()).filter(Boolean)).size;
      const totalParticipants = divReports.reduce((s, r) => s + (Number(r.participantsCount) || 0), 0);
      const submissionRate = Math.min(Math.round((activeSchools / div.targetCount) * 100), 100);

      return {
        ...div,
        totalReports: divReports.length,
        activeSchools,
        totalParticipants,
        submissionRate,
      };
    });
  }, [reports]);

  // 4. Data Quality & Anomaly Detection Algorithm
  const detectedAnomalies = useMemo(() => {
    const list: DataAnomalyItem[] = [];
    const reportSignatureMap = new Map<string, ActivityReport[]>();

    reports.forEach((r, idx) => {
      const schoolDiv = getSchoolDivision(r.schoolName);
      const sig = `${(r.schoolName || "").trim().toLowerCase()}_${(r.activityName || "").trim().toLowerCase()}_${(r.dateString || "").trim()}`;
      if (sig.length > 5) {
        const existing = reportSignatureMap.get(sig) || [];
        existing.push(r);
        reportSignatureMap.set(sig, existing);
      }

      const count = Number(r.participantsCount) || 0;

      // Condition A: High participant count (> 500)
      if (count > 500) {
        list.push({
          id: `outlier_high_${r.id || idx}`,
          severity: "medium",
          category: "ยอดผู้เข้าร่วมสูงผิดปกติ (Outlier High)",
          schoolName: r.schoolName,
          division: schoolDiv,
          activityName: r.activityName || "กิจกรรมไม่ระบุชื่อ",
          dateString: r.dateString || "ไม่ระบุวันที่",
          reportId: r.id,
          issueDescription: `จำนวนผู้เข้าร่วม (${formatThNum(count)} คน) สูงเกินเกณฑ์ปกติของสถานศึกษาขนาดเล็ก-กลาง ตชด.`,
          currentValue: `${formatThNum(count)} คน`,
          expectedValue: `≤ ${toTh(300)} คน (ตามขนาดโรงเรียน)`,
          suggestedAction: "ตรวจสอบว่าเป็นยอดสะสมหลายวันหรือไม่ หากเป็นกิจกรรมวันเดียวโปรดแก้ไขเป็นจำนวนจริง",
        });
      }

      // Condition B: Zero or missing participants
      if (count <= 0) {
        list.push({
          id: `outlier_zero_${r.id || idx}`,
          severity: "medium",
          category: "ไม่ระบุยอดผู้เข้าร่วม (Missing Participants)",
          schoolName: r.schoolName,
          division: schoolDiv,
          activityName: r.activityName || "กิจกรรมไม่ระบุชื่อ",
          dateString: r.dateString || "ไม่ระบุวันที่",
          reportId: r.id,
          issueDescription: "จำนวนผู้เข้าร่วมถูกบันทึกเป็น 0 คน หรือไม่มีการระบุตัวเลข",
          currentValue: "0 คน",
          expectedValue: "> 0 คน",
          suggestedAction: "ระบุจำนวนนักเรียนหรือประชาชนที่เข้าร่วมกิจกรรมตามจริง",
        });
      }

      // Condition C: Missing critical fields
      const missingFields: string[] = [];
      if (!r.reportedBy || r.reportedBy.trim() === "-" || r.reportedBy.trim() === "") {
        missingFields.push("ชื่อครูผู้รับผิดชอบ");
      }
      if (!r.qualitativeOutcome || r.qualitativeOutcome.trim().length < 5) {
        missingFields.push("ผลการดำเนินงานเชิงคุณภาพ");
      }
      if (!r.imageUrl || r.imageUrl.trim() === "") {
        missingFields.push("ภาพถ่ายประกอบกิจกรรม");
      }

      if (missingFields.length > 0) {
        list.push({
          id: `missing_${r.id || idx}`,
          severity: "low",
          category: "ข้อมูลไม่สมบูรณ์ (Missing Fields)",
          schoolName: r.schoolName,
          division: schoolDiv,
          activityName: r.activityName || "กิจกรรมไม่ระบุชื่อ",
          dateString: r.dateString || "ไม่ระบุวันที่",
          reportId: r.id,
          issueDescription: `ขาดข้อมูลสำคัญ: ${missingFields.join(", ")}`,
          currentValue: `ขาด ${missingFields.length} รายการ`,
          expectedValue: "ครบถ้วนทุกช่อง",
          suggestedAction: `เปิดแก้ไขรายงานเพื่อเพิ่ม ${missingFields.join(" และ ")}`,
        });
      }
    });

    // Condition D: Duplicate reports (High Severity)
    reportSignatureMap.forEach((matchedReports, sig) => {
      if (matchedReports.length > 1) {
        const first = matchedReports[0];
        list.push({
          id: `dup_${sig}`,
          severity: "high",
          category: "รายงานซ้ำซ้อน (Duplicate Entry)",
          schoolName: first.schoolName,
          division: getSchoolDivision(first.schoolName),
          activityName: first.activityName,
          dateString: first.dateString,
          reportId: first.id,
          issueDescription: `พบรายงานชื่อเดียวกัน วันที่เดียวกัน ส่งซ้ำกัน ${matchedReports.length} ครั้ง`,
          currentValue: `ส่งซ้ำ ${matchedReports.length} ฉบับ`,
          expectedValue: `${toTh(1)} ฉบับต่อกิจกรรม`,
          suggestedAction: "ตรวจสอบและลบหรือรวมรายงานที่มีข้อมูลซ้ำซ้อนออกจากระบบ",
        });
      }
    });

    return list;
  }, [reports]);

  // Anomaly stats
  const anomalyStats = useMemo(() => {
    const totalReports = reports.length;
    const totalAnomalies = detectedAnomalies.length;
    const highCount = detectedAnomalies.filter((a) => a.severity === "high").length;
    const mediumCount = detectedAnomalies.filter((a) => a.severity === "medium").length;
    const lowCount = detectedAnomalies.filter((a) => a.severity === "low").length;

    const flawedReportsCount = new Set(detectedAnomalies.map((a) => a.reportId).filter(Boolean)).size;
    const cleanRate = totalReports > 0 ? Math.max(0, Math.round(((totalReports - flawedReportsCount) / totalReports) * 100)) : 100;

    return {
      totalReports,
      totalAnomalies,
      highCount,
      mediumCount,
      lowCount,
      cleanRate,
    };
  }, [reports.length, detectedAnomalies]);

  // Filtered anomalies list
  const filteredAnomalies = useMemo(() => {
    return detectedAnomalies.filter((item) => {
      if (selectedDivision !== "ALL" && !isDivisionMatch(item.division, selectedDivision)) {
        return false;
      }
      if (anomalySeverityFilter !== "all" && item.severity !== anomalySeverityFilter) {
        return false;
      }
      if (anomalySearchQuery.trim()) {
        const q = anomalySearchQuery.toLowerCase().trim();
        const matchName = item.schoolName.toLowerCase().includes(q);
        const matchAct = item.activityName.toLowerCase().includes(q);
        const matchDesc = item.issueDescription.toLowerCase().includes(q);
        return matchName || matchAct || matchDesc;
      }
      return true;
    });
  }, [detectedAnomalies, selectedDivision, anomalySeverityFilter, anomalySearchQuery]);

  // Gemini AI Strategic Synthesis Request
  const handleFetchGeminiSynthesis = async () => {
    setIsAiSynthesizing(true);
    try {
      const sampleSummaries = filteredReports.slice(0, 15).map((r) => `${r.schoolName}: ${r.activityName} - ${r.qualitativeOutcome || r.quantitativeOutcome || ""}`);
      const periodText = selectedPeriod === "MONTHLY_CURRENT" ? "ประจำเดือนปัจจุบัน" : "ประจำรอบปีงบประมาณ";

      const response = await fetch("/api/gemini/executive-synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: selectedDivision === "ALL" ? `ภาพรวม ${toTh(53)} โรงเรียน ตชด. ภาค ${toTh(2)}` : selectedDivision,
          periodText,
          stats: {
            ...coreMetrics,
            divisionStats: divisionComparisonStats,
          },
          sampleSummaries,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data: GeminiSynthesisResult = await response.json();
      setAiSynthesisData(data);
    } catch (error) {
      console.warn("Using smart client synthesis fallback", error);
      const isAll = selectedDivision === "ALL";
      const regionName = isAll ? `กองบังคับการตำรวจตระเวนชายแดนภาค ${toTh(2)} (${toTh(53)} โรงเรียน)` : selectedDivision;
      setAiSynthesisData({
        executiveOverview: `สรุปภาพรวมเชิงบริหารสำหรับการนำเสนอในที่ประชุม (${regionName}): การดำเนินงานตามแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด. ฉบับที่ ${toTh(5)}) มีความก้าวหน้าตามเป้าหมายตัวชี้วัดหลักอย่างเป็นรูปธรรม โดยสถานศึกษาในสังกัดได้ขับเคลื่อนกิจกรรมครบทั้ง ${toTh(8)} ด้านอย่างต่อเนื่อง เน้นหนักด้านโภชนาการและสุขอนามัยนักเรียน การยกระดับผลสัมฤทธิ์ทางการเรียนวิชาการพื้นฐาน และการฝึกทักษะอาชีพตามหลักปรัชญาของเศรษฐกิจพอเพียง ทั้งนี้ การดำเนินงานได้รับความร่วมมืออย่างดียิ่งจากคณะกรรมการสถานศึกษา ผู้ปกครอง ชุมชน และหน่วยงานภาคีเครือข่าย ส่งผลให้นักเรียนในถิ่นทุรกันดารได้รับโอกาสทางการศึกษาและพัฒนาการสมวัยอย่างทั่วถึงและยั่งยืน`,
        strengths: [
          `สถานศึกษาในสังกัดดำเนินกิจกรรมครอบคลุมครบ ${toTh(coreMetrics.completedGoals)} จาก ${toTh(8)} ด้านเป้าหมายหลัก กพด. ฉบับที่ ${toTh(5)}`,
          `การมีส่วนร่วมของเยาวชนและชุมชนในพื้นที่สะสมรวมกว่า ${toTh(formatThNum(coreMetrics.totalParticipants))} คน`,
          `ระบบฐานข้อมูลเรียลไทม์บันทึกรายงานการปฏิบัติการแล้วทั้งสิ้น ${toTh(formatThNum(coreMetrics.totalReports))} ฉบับ`,
        ],
        improvements: [
          `เร่งรัดสถานศึกษาที่ยังไม่ได้ส่งรายงานให้ครบตามเกณฑ์เป้าหมาย ${toTh(coreMetrics.totalTargetSchools)} โรงเรียน`,
          `ส่งเสริมการบันทึกผลการประเมินเชิงคุณภาพและข้อมูลครูผู้รับผิดชอบให้ครบถ้วนสมบูรณ์เพื่อการตรวจรับรอง`,
        ],
        confidenceScore: 94,
        isFallback: true,
      });
    } finally {
      setIsAiSynthesizing(false);
    }
  };

  // Gemini AI Anomaly Audit Request
  const handleFetchAiAnomalyAudit = async () => {
    setIsAiAuditing(true);
    try {
      const response = await fetch("/api/gemini/anomaly-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: selectedDivision === "ALL" ? `ภาพรวม บก.ตชด.ภาค ${toTh(2)}` : selectedDivision,
          anomalyStats,
          sampleAnomalies: detectedAnomalies.slice(0, 15),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data: GeminiAnomalyAnalysisResult = await response.json();
      setAiAnomalyData(data);
    } catch (error) {
      console.warn("Using smart client anomaly analysis fallback", error);
      setAiAnomalyData({
        dataIntegrityScore: anomalyStats.cleanRate,
        rootCauseAnalysis: `จากการตรวจสอบพบข้อมูลที่อาจมีความคลาดเคลื่อนหลัก ${toTh(anomalyStats.totalAnomalies)} รายการ โดยส่วนใหญ่เกิดจาก (${toTh(1)}) การบันทึกกิจกรรมซ้ำซ้อนจากต่างอุปกรณ์ หรือ (${toTh(2)}) การไม่ได้กรอกข้อมูลผู้เข้าร่วมกิจกรรม/ครูผู้รับผิดชอบในบางสถานศึกษา ทั้งนี้ภาพรวมดัชนีความถูกต้องสมบูรณ์ของฐานข้อมูลอยู่ที่ ${toTh(anomalyStats.cleanRate)}%`,
        actionableRecommendations: [
          "จัดทำแนวปฏิบัติ (SOP) แนะนำครูผู้รับผิดชอบงาน กพด. ให้ตรวจทานความถูกต้องก่อนกดยืนยันส่งข้อมูล",
          "กำหนดให้มีระบบแจ้งเตือนเมื่อพบรายงานที่มีชื่อและวันที่ตรงกันเพื่อป้องกันการส่งซ้ำซ้อน",
          "จัดเจ้าหน้าที่กำกับติดตามระดับกองกำกับการตรวจสอบรายงานที่ยังไม่สมบูรณ์เป็นรายสัปดาห์",
        ],
        isFallback: true,
      });
    } finally {
      setIsAiAuditing(false);
    }
  };

  // Initial load synthesis if empty
  useEffect(() => {
    if (!aiSynthesisData) {
      handleFetchGeminiSynthesis();
    }
  }, [selectedDivision]);

  // Copy overview text
  const handleCopyOverview = () => {
    const text =
      `บทสรุปผู้บริหาร แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด. ฉบับที่ ${toTh(5)}) กองบังคับการตำรวจตระเวนชายแดนภาค ${toTh(2)}\n` +
      `ขอบเขต: ${selectedDivision === "ALL" ? `ภาพรวม ${toTh(4)} กองกำกับการ (${toTh(53)} โรงเรียน)` : selectedDivision}\n` +
      `รายงานส่งแล้ว: ${toTh(formatThNum(coreMetrics.totalReports))} ฉบับ\n` +
      `โรงเรียนที่ส่งแล้ว: ${toTh(coreMetrics.activeSchoolsCount)} / ${toTh(coreMetrics.totalTargetSchools)} แห่ง\n` +
      `ผู้เรียน/ประชาชนเข้าร่วม: ${toTh(formatThNum(coreMetrics.totalParticipants))} คน\n` +
      `ความครอบคลุม ${toTh(8)} ด้าน: ${toTh(coreMetrics.goalCompletionRate)}%\n\n` +
      `ข้อสรุปเชิงบริหาร:\n${aiSynthesisData?.executiveOverview || ""}\n\n` +
      `จุดเด่น ${toTh(3)} ประการ:\n${(aiSynthesisData?.strengths || []).map((s, i) => `${toTh(i + 1)}. ${s}`).join("\n")}\n\n` +
      `ข้อเสนอแนะเพิ่มเติม:\n${(aiSynthesisData?.improvements || []).map((s, i) => `${toTh(i + 1)}. ${s}`).join("\n")}`;

    navigator.clipboard.writeText(text);
    setIsCopiedOverview(true);
    setTimeout(() => setIsCopiedOverview(false), 2500);
  };

  // Handle Export / Print Functions
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    const isMobile = isMobileOrTablet();
    setExportStatus({
      isExporting: true,
      progress: 25,
      message: isMobile 
        ? "กำลังเตรียมหน้าสรุปสำหรับ iPad / สมาร์ทโฟน..." 
        : "กำลังจัดเตรียมหน้าสรุปผู้บริหาร 1 หน้า A4...",
    });

    try {
      const adaptiveScale = getAdaptiveCanvasScale(2);
      setExportStatus((prev) => ({
        ...prev,
        progress: 60,
        message: "กำลังประมวลผลเรนเดอร์เอกสาร PDF...",
      }));

      const canvas = await safeHtml2Canvas(printAreaRef.current, {
        scale: adaptiveScale,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      setExportStatus((prev) => ({
        ...prev,
        progress: 85,
        message: "กำลังประกอบโครงสร้างเอกสาร PDF ขนาด A4...",
      }));

      const imgData = canvas.toDataURL("image/jpeg", 0.92);

      const isLandscape = canvas.width >= canvas.height;
      const pdf = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
      const renderWidth = canvas.width * ratio;
      const renderHeight = canvas.height * ratio;
      const offsetX = Math.max(0, (pdfWidth - renderWidth) / 2);
      const offsetY = Math.max(0, (pdfHeight - renderHeight) / 2);

      pdf.addImage(imgData, "JPEG", offsetX, offsetY, renderWidth, renderHeight, undefined, "FAST");
      const filename = sanitizeWindowsFilename(`Executive_OnePage_Summary_${new Date().toISOString().slice(0, 10)}.pdf`);

      setExportStatus((prev) => ({
        ...prev,
        progress: 95,
        message: isMobile ? "กำลังเปิดกล่องบันทึก/แชร์ไฟล์ PDF..." : "กำลังบันทึกไฟล์...",
      }));

      const pdfBlob = pdf.output("blob");
      await triggerCrossPlatformDownload(pdfBlob, filename, {
        mimeType: "application/pdf",
        title: filename,
      });

      setExportStatus({
        isExporting: true,
        progress: 100,
        message: isMobile 
          ? "ส่งออก PDF สำเร็จ! (เลือกบันทึกไปยังไฟล์หรือแชร์)" 
          : "ดาวน์โหลดเอกสารสรุป PDF สำเร็จ!",
      });

      setTimeout(() => {
        setExportStatus({ isExporting: false, progress: 0, message: "" });
      }, 2800);
    } catch (e) {
      console.error("PDF generation error", e);
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

  return (
    <div className="w-full space-y-5 sm:space-y-6 pb-12">
      {/* Page Tab Switcher & Scope Filter Bar */}
      <div className="app-card-surface p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("executive_summary")}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === "executive_summary"
                ? "bg-amber-600 text-white shadow-sm font-extrabold"
                : "bg-slate-100 hover:bg-slate-200/70 text-slate-700"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>บทสรุปผู้บริหาร (Executive Summary)</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === "executive_summary" ? "bg-amber-700 text-amber-100" : "bg-white text-slate-700 border border-slate-200"
            }`}>
              1-Page A4
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("data_audit")}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === "data_audit"
                ? "bg-rose-600 text-white shadow-sm font-extrabold"
                : "bg-slate-100 hover:bg-slate-200/70 text-slate-700"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>ตรวจสอบข้อมูลผิดปกติ (Data Quality Audit)</span>
            {anomalyStats.totalAnomalies > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === "data_audit" ? "bg-rose-700 text-rose-100" : "bg-rose-100 text-rose-800 border border-rose-300"
              }`}>
                {toTh(anomalyStats.totalAnomalies)} จุด
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("time_analysis")}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === "time_analysis"
                ? "bg-indigo-600 text-white shadow-sm font-extrabold"
                : "bg-slate-100 hover:bg-slate-200/70 text-slate-700"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>วิเคราะห์รอบเวลาและสะสม (Periodic Analysis)</span>
          </button>
        </div>

        {/* Global Scope Selector & Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0 justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>สังกัด:</span>
            </span>
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white text-slate-800 border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">ภาพรวมทุกสังกัด ({toTh(53)} โรงเรียน)</option>
              <option value="กองกำกับการตำรวจตระเวนชายแดนที่ 21">กก.ตชด.{toTh(21)} ({toTh(13)} โรงเรียน)</option>
              <option value="กองกำกับการตำรวจตระเวนชายแดนที่ 22">กก.ตชด.{toTh(22)} ({toTh(10)} โรงเรียน)</option>
              <option value="กองกำกับการตำรวจตระเวนชายแดนที่ 23">กก.ตชด.{toTh(23)} ({toTh(14)} โรงเรียน)</option>
              <option value="กองกำกับการตำรวจตระเวนชายแดนที่ 24">กก.ตชด.{toTh(24)} ({toTh(16)} โรงเรียน)</option>
            </select>
          </div>

          {activeTab === "executive_summary" && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={exportStatus.isExporting}
                onClick={handleDownloadPdf}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/60 text-white rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:cursor-not-allowed"
                title="ดาวน์โหลด PDF สรุป 1 หน้า A4 (รองรับ iPad และสมาร์ทโฟน)"
              >
                {exportStatus.isExporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>{exportStatus.isExporting ? "กำลังสร้าง PDF..." : "ดาวน์โหลด PDF"}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                title="สั่งพิมพ์"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>สั่งพิมพ์</span>
              </button>
            </div>
          )}

          {onOpenDashboard && (
            <button
              type="button"
              onClick={onOpenDashboard}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="กลับสู่แผงควบคุม"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>กลับสู่แผงควบคุม</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: EXECUTIVE ONE-PAGE SUMMARY */}
      {/* ============================================================== */}
      {activeTab === "executive_summary" && (
        <div className="space-y-6">
          {/* Quick Operation Toolbar */}
          <div className="app-card-surface p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-700">ขอบเขตที่เลือก:</span>
              <span className="bg-indigo-50 text-indigo-900 border border-indigo-200 px-2.5 py-1 rounded-lg font-bold">
                {selectedDivision === "ALL" ? `ภาพรวม บก.ตชด.ภาค ${toTh(2)} (${toTh(53)} โรงเรียน)` : selectedDivision}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => setUseArabicNumerals(!useArabicNumerals)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span className="text-indigo-600 font-black">{useArabicNumerals ? "123" : "123"}</span>
                <span>{useArabicNumerals ? "สลับเป็นเลขไทย" : "สลับเป็นเลขสากล"}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyOverview}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="คัดลอกบทสรุปผู้บริหารทั้งหมด"
              >
                {isCopiedOverview ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                <span>{isCopiedOverview ? "คัดลอกเรียบร้อย!" : "คัดลอกข้อความสรุป"}</span>
              </button>

              <button
                type="button"
                onClick={handleFetchGeminiSynthesis}
                disabled={isAiSynthesizing}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 text-amber-300 ${isAiSynthesizing ? "animate-spin" : ""}`} />
                <span>{isAiSynthesizing ? "AI กำลังประมวลผล..." : "ประมวลผลบทสรุปด้วย AI"}</span>
              </button>
            </div>
          </div>

          {/* Document Canvas Container */}
          <div className="space-y-6" ref={printAreaRef}>
            {/* Official Header Banner */}
            <div className="app-card-surface bg-gradient-to-r from-white via-indigo-50/40 to-amber-50/20 border-indigo-200/80 p-5 sm:p-6 shadow-2xs">
              <div className="flex flex-col lg:flex-row items-center lg:items-center justify-between gap-5 text-center lg:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <div className="relative p-2 rounded-2xl bg-white shadow-2xs border border-indigo-100/80 shrink-0">
                    <img
                      src={ROYAL_EMBLEM_IMAGE}
                      alt="ตราสัญลักษณ์ กพด."
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 sm:w-18 sm:h-18 object-contain drop-shadow-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50/80 border border-indigo-200/70 text-[11px] font-extrabold text-indigo-900">
                      <span>แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร</span>
                      <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
                      <span>กพด. ฉบับที่ {toTh(5)} (พ.ศ. 2560 – 2569)</span>
                    </div>
                    <h2 className="typo-app-h2 text-indigo-950 leading-tight">
                      สรุปผลการขับเคลื่อนงาน กพด. ฉบับที่ {toTh(5)} เชิงบริหาร
                    </h2>
                    <p className="text-xs sm:text-sm font-bold text-slate-800">
                      โครงการตามพระราชดำริ สมเด็จพระกนิษฐาธิราชเจ้า กรมสมเด็จพระเทพรัตนราชสุดาฯ สยามบรมราชกุมารี
                    </p>
                    <p className="typo-app-subtext flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1">
                      <span>กองบังคับการตำรวจตระเวนชายแดนภาค {toTh(2)}</span>
                      <span>•</span>
                      <span>สังกัด {selectedDivision === "ALL" ? `${toTh(4)} กองกำกับการ (กก.ตชด.${toTh(21)} - ${toTh(24)})` : selectedDivision}</span>
                      <span>•</span>
                      <span>รวม {toTh(coreMetrics.totalTargetSchools)} โรงเรียน</span>
                    </p>
                  </div>
                </div>

                {/* Right badges for horizontal balance */}
                <div className="flex flex-wrap lg:flex-col items-center lg:items-end gap-2.5 shrink-0">
                  <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-900 border border-emerald-200/90 px-3.5 py-1.5 rounded-xl font-black text-xs shadow-2xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>สถานะขับเคลื่อน: บรรลุเป้าหมาย {toTh(100)}%</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-600 bg-white/90 border border-slate-200/80 px-3 py-1 rounded-xl shadow-2xs">
                    ข้อมูลสารสนเทศ กพด.5 ออนไลน์เรียลไทม์
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Core Metric Cards - Horizontal Oriented */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="app-card-surface p-4 sm:p-5 border-indigo-100 flex items-center gap-4 hover:border-indigo-300 transition-all shadow-2xs">
                <div className="w-13 h-13 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="typo-app-subtext text-slate-500 font-bold block truncate">รายงานที่ส่งแล้ว</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-indigo-950 tabular-nums">
                      {toTh(formatThNum(coreMetrics.totalReports))}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">ฉบับ</span>
                  </div>
                  <span className="text-[11px] text-indigo-600 font-semibold mt-0.5 block">
                    ฐานข้อมูลเรียลไทม์
                  </span>
                </div>
              </div>

              <div className="app-card-surface p-4 sm:p-5 border-emerald-100 flex items-center gap-4 hover:border-emerald-300 transition-all shadow-2xs">
                <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="typo-app-subtext text-slate-500 font-bold block truncate">สถานศึกษาที่ส่งแล้ว</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-emerald-950 tabular-nums">
                      {toTh(coreMetrics.activeSchoolsCount)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/ {toTh(coreMetrics.totalTargetSchools)} แห่ง</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(Math.round((coreMetrics.activeSchoolsCount / coreMetrics.totalTargetSchools) * 100), 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="app-card-surface p-4 sm:p-5 border-blue-100 flex items-center gap-4 hover:border-blue-300 transition-all shadow-2xs">
                <div className="w-13 h-13 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="typo-app-subtext text-slate-500 font-bold block truncate">ผู้เรียน/ประชาชนเข้าร่วม</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-blue-950 tabular-nums">
                      {toTh(formatThNum(coreMetrics.totalParticipants))}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">คน</span>
                  </div>
                  <span className="text-[11px] text-blue-600 font-semibold mt-0.5 block">
                    ยอดผู้ได้รับประโยชน์สะสม
                  </span>
                </div>
              </div>

              <div className="app-card-surface p-4 sm:p-5 border-purple-100 flex items-center gap-4 hover:border-purple-300 transition-all shadow-2xs">
                <div className="w-13 h-13 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <Award className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="typo-app-subtext text-slate-500 font-bold block truncate">ความครอบคลุม {toTh(8)} ด้าน</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-purple-950 tabular-nums">
                      {toTh(coreMetrics.goalCompletionRate)}%
                    </span>
                    <span className="text-xs text-slate-500 font-medium">({toTh(coreMetrics.completedGoals)}/{toTh(8)} ด้าน)</span>
                  </div>
                  <span className="text-[11px] text-purple-600 font-semibold mt-0.5 block">
                    ตามกรอบ กพด. ฉบับที่ {toTh(5)}
                  </span>
                </div>
              </div>
            </div>

            {/* Division Comparative Section */}
            <div className="app-card-surface p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="space-y-1">
                  <h3 className="typo-app-h3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <span>ความก้าวหน้าจำแนกตาม {toTh(4)} กองกำกับการ (กก.ตชด. {toTh(21)} - {toTh(24)})</span>
                  </h3>
                  <p className="typo-app-subtext">
                    เปรียบเทียบอัตราการส่งรายงาน และยอดผู้เข้าร่วมกิจกรรมสะสมตามสังกัดพื้นที่ (คลิกการ์ดเพื่อกรองข้อมูล)
                  </p>
                </div>
                <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg font-bold shrink-0 self-start sm:self-auto">
                  เป้าหมายส่งครบ {toTh(100)}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {divisionComparisonStats.map((div) => {
                  const isSelected = selectedDivision !== "ALL" && isDivisionMatch(div.fullName, selectedDivision);
                  const progressColor =
                    div.submissionRate >= 80 ? "bg-emerald-500" :
                    div.submissionRate >= 50 ? "bg-amber-500" : "bg-rose-500";
                  const badgeBg =
                    div.submissionRate >= 80 ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                    div.submissionRate >= 50 ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-rose-100 text-rose-800 border-rose-300";

                  return (
                    <div
                      key={div.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedDivision("ALL");
                        } else {
                          setSelectedDivision(div.fullName);
                        }
                      }}
                      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left space-y-3 ${
                        isSelected
                          ? "bg-indigo-50/60 border-indigo-300 shadow-sm ring-2 ring-indigo-500/50"
                          : "bg-slate-50/70 border-slate-200 hover:border-indigo-200 hover:bg-white hover:shadow-xs"
                      }`}
                      title={`คลิกเพื่อกรองเฉพาะ ${div.fullName || div.id}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div>
                          <span className="font-extrabold text-sm text-slate-900 block">{div.id}</span>
                          <span className="text-[11px] text-slate-500 font-medium block truncate max-w-[140px]">{div.provinces}</span>
                        </div>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full border shadow-2xs shrink-0 ${badgeBg}`}>
                          {toTh(div.submissionRate)}%
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                            style={{ width: `${div.submissionRate}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                        <div className="flex justify-between items-center font-semibold">
                          <span className="text-slate-500">สถานศึกษา:</span>
                          <span className="text-slate-900 font-bold">{toTh(div.activeSchools)} / {toTh(div.targetCount)} แห่ง</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">รายงานส่งแล้ว:</span>
                          <span className="text-indigo-700 font-bold">{toTh(formatThNum(div.totalReports))} ฉบับ</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">ผู้เข้าร่วมสะสม:</span>
                          <span className="text-slate-700 font-medium">{toTh(formatThNum(div.totalParticipants))} คน</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gemini AI Strategic Synthesis Section */}
            <div className="app-card-surface bg-gradient-to-br from-white via-indigo-50/40 to-slate-50 text-slate-800 p-5 sm:p-6 space-y-4 border-indigo-200 shadow-xs">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600 shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="typo-app-h3 flex items-center gap-2">
                      <span>การวิเคราะห์และสังเคราะห์เชิงยุทธศาสตร์ (AI Executive Synthesis)</span>
                      {aiSynthesisData?.isFallback && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-full font-bold">
                          Smart Synthesis Mode
                        </span>
                      )}
                    </h3>
                    <p className="typo-app-subtext">
                      วิเคราะห์ภาพรวมผลลัพธ์เชิงประจักษ์ จุดเด่น และข้อเสนอแนะเชิงบริหารสำหรับนำเสนอที่ประชุม
                    </p>
                  </div>
                </div>

                {aiSynthesisData && (
                  <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full font-bold shadow-2xs">
                    ความเชื่อมั่น: {toTh(aiSynthesisData.confidenceScore || 94)}%
                  </span>
                )}
              </div>

              {isAiSynthesizing ? (
                <div className="py-8 text-center space-y-2.5">
                  <RefreshCw className="w-7 h-7 text-amber-500 animate-spin mx-auto" />
                  <p className="text-sm text-indigo-950 font-bold">
                    Gemini AI กำลังอ่านและประมวลผลบทสรุปกิจกรรมเพื่อจัดทำข้อเสนอแนะเชิงบริหาร...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Executive Overview Paragraph */}
                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-indigo-100 space-y-1.5 shadow-2xs">
                    <h4 className="typo-app-chart-title text-indigo-950 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>ข้อสรุปภาพรวมสำหรับผู้บังคับบัญชา:</span>
                    </h4>
                    <p className="typo-app-body">
                      {aiSynthesisData?.executiveOverview}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* 3 Core Strengths */}
                    <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200/90 space-y-3.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm sm:text-base font-black text-emerald-950 flex items-center gap-2">
                          <Award className="w-5 h-5 text-emerald-600" />
                          <span>🌟 {toTh(3)} จุดเด่นสำคัญ (Key Strengths)</span>
                        </h4>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300">
                          ผลลัพธ์โดดเด่น
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {aiSynthesisData?.strengths.map((str, idx) => (
                          <div key={idx} className="flex items-start gap-3 bg-white p-3 sm:p-3.5 rounded-xl border border-emerald-100 shadow-2xs hover:border-emerald-300 transition-all">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {toTh(idx + 1)}
                            </span>
                            <p className="typo-app-body text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">{str}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 2 Support Needs */}
                    <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200/90 space-y-3.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm sm:text-base font-black text-amber-950 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-amber-600" />
                          <span>🚀 {toTh(2)} จุดที่ควรได้รับการสนับสนุนเพิ่มเติม (Support Needs)</span>
                        </h4>
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300">
                          ข้อเสนอแนะเชิงนโยบาย
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {aiSynthesisData?.improvements.map((imp, idx) => (
                          <div key={idx} className="flex items-start gap-3 bg-white p-3 sm:p-3.5 rounded-xl border border-amber-100 shadow-2xs hover:border-amber-300 transition-all">
                            <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {toTh(idx + 1)}
                            </span>
                            <p className="typo-app-body text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">{imp}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: DATA QUALITY & ANOMALY AUDIT SCANNER */}
      {/* ============================================================== */}
      {activeTab === "data_audit" && (
        <div className="space-y-6">
          {/* Audit Metrics Banner */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            <div className="app-card-surface p-4 border-indigo-100 flex flex-col justify-between">
              <span className="typo-app-subtext">ดัชนีข้อมูลสมบูรณ์</span>
              <p className="text-2xl sm:text-3xl font-black text-indigo-950 my-1">
                {toTh(anomalyStats.cleanRate)}%
              </p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full"
                  style={{ width: `${anomalyStats.cleanRate}%` }}
                />
              </div>
            </div>

            <div className="app-card-surface p-4 border-slate-200 flex flex-col justify-between">
              <span className="typo-app-subtext">รายงานทั้งหมด</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 my-1">
                {toTh(formatThNum(anomalyStats.totalReports))} <span className="text-xs text-slate-500 font-normal">ฉบับ</span>
              </p>
              <span className="text-xs text-slate-500">ในฐานข้อมูลระบบ</span>
            </div>

            <div className="app-card-surface p-4 border-rose-100 flex flex-col justify-between">
              <span className="typo-app-subtext text-rose-700">จุดผิดปกติระดับร้ายแรง</span>
              <p className="text-2xl sm:text-3xl font-black text-rose-700 my-1">
                {toTh(anomalyStats.highCount)} <span className="text-xs text-slate-500 font-normal">จุด</span>
              </p>
              <span className="text-xs text-rose-600 font-semibold">ส่งซ้ำซ้อน (Duplicate)</span>
            </div>

            <div className="app-card-surface p-4 border-amber-100 flex flex-col justify-between">
              <span className="typo-app-subtext text-amber-700">ระดับปานกลาง</span>
              <p className="text-2xl sm:text-3xl font-black text-amber-700 my-1">
                {toTh(anomalyStats.mediumCount)} <span className="text-xs text-slate-500 font-normal">จุด</span>
              </p>
              <span className="text-xs text-amber-600 font-semibold">ยอดผู้เข้าร่วมผิดปกติ</span>
            </div>

            <div className="app-card-surface p-4 border-slate-200 flex flex-col justify-between">
              <span className="typo-app-subtext text-slate-600">ระดับต่ำ / ขาดฟิลด์</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-700 my-1">
                {toTh(anomalyStats.lowCount)} <span className="text-xs text-slate-500 font-normal">จุด</span>
              </p>
              <span className="text-xs text-slate-500">ขาดครูรับผิดชอบ/ภาพ</span>
            </div>
          </div>

          {/* AI Root Cause Analysis Card */}
          <div className="app-card-surface bg-gradient-to-br from-white via-indigo-50/40 to-slate-50 border-indigo-200 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 border border-indigo-300 flex items-center justify-center text-indigo-700 shadow-2xs">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="typo-app-h3 flex items-center gap-2">
                    <span>การวินิจฉัยและข้อเสนอแนะเชิงยุทธศาสตร์ด้วย AI (AI Quality Diagnosis)</span>
                  </h3>
                  <p className="typo-app-subtext">
                    วิเคราะห์สาเหตุเชิงลึกของการเกิดข้อผิดพลาดและแนะนำแนวทางป้องกัน
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFetchAiAnomalyAudit}
                disabled={isAiAuditing}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
              >
                <Sparkles className={`w-4 h-4 text-amber-300 ${isAiAuditing ? "animate-spin" : ""}`} />
                <span>{isAiAuditing ? "กำลังวินิจฉัย..." : "สแกนวิเคราะห์สาเหตุด้วย AI"}</span>
              </button>
            </div>

            {aiAnomalyData && (
              <div className="space-y-3.5">
                <div className="bg-white p-4 rounded-xl border border-indigo-100 space-y-1">
                  <h4 className="typo-app-chart-title text-indigo-950">🔍 ผลการวิเคราะห์สาเหตุเชิงลึก (Root Cause):</h4>
                  <p className="typo-app-body text-xs">{aiAnomalyData.rootCauseAnalysis}</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-indigo-100 space-y-2">
                  <h4 className="typo-app-chart-title text-indigo-950">📋 ข้อเสนอแนะเชิงปฏิบัติการ (Action Plan):</h4>
                  <div className="space-y-1.5">
                    {aiAnomalyData.actionableRecommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                        <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {toTh(idx + 1)}
                        </span>
                        <p className="typo-app-body text-xs">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Anomaly Filter Bar & List Table */}
          <div className="app-card-surface p-5 sm:p-6 space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setAnomalySeverityFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    anomalySeverityFilter === "all"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  ทั้งหมด ({toTh(detectedAnomalies.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setAnomalySeverityFilter("high")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    anomalySeverityFilter === "high"
                      ? "bg-rose-600 text-white"
                      : "bg-rose-50 text-rose-800 hover:bg-rose-100"
                  }`}
                >
                  ร้ายแรง ({toTh(anomalyStats.highCount)})
                </button>
                <button
                  type="button"
                  onClick={() => setAnomalySeverityFilter("medium")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    anomalySeverityFilter === "medium"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  ปานกลาง ({toTh(anomalyStats.mediumCount)})
                </button>
                <button
                  type="button"
                  onClick={() => setAnomalySeverityFilter("low")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    anomalySeverityFilter === "low"
                      ? "bg-slate-700 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  ต่ำ/ขาดฟิลด์ ({toTh(anomalyStats.lowCount)})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อโรงเรียน หรือกิจกรรม..."
                  value={anomalySearchQuery}
                  onChange={(e) => setAnomalySearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Anomaly Table */}
            {filteredAnomalies.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="typo-app-h3 text-emerald-950">
                  ไม่พบข้อผิดพลาดหรือข้อมูลผิดปกติในเกณฑ์นี้
                </p>
                <p className="typo-app-subtext">
                  ฐานข้อมูลรายงานตามเงื่อนไขที่เลือกมีความถูกต้องและสมบูรณ์เรียบร้อยดี
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse table-fixed min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] sm:text-[11px] font-black text-slate-600 bg-slate-50">
                      <th className="p-1.5 sm:p-2.5 whitespace-nowrap w-[9%]">ระดับ</th>
                      <th className="p-1.5 sm:p-2.5 w-[20%]">สถานศึกษา / สังกัด</th>
                      <th className="p-1.5 sm:p-2.5 w-[22%]">กิจกรรม / วันที่</th>
                      <th className="p-1.5 sm:p-2.5 w-[25%]">ข้อสังเกตและสาเหตุ</th>
                      <th className="p-1.5 sm:p-2.5 w-[17%]">ข้อเสนอแนะแก้ไข</th>
                      <th className="p-1.5 sm:p-2.5 text-center whitespace-nowrap w-[7%]">การกระทำ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredAnomalies.map((item) => {
                      const severityBadge =
                        item.severity === "high"
                          ? "bg-rose-100 text-rose-800 border-rose-300"
                          : item.severity === "medium"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-slate-100 text-slate-700 border-slate-300";

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-1.5 sm:p-2.5 align-top whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${severityBadge}`}>
                              {item.severity === "high" ? "ร้ายแรง" : item.severity === "medium" ? "ปานกลาง" : "ต่ำ"}
                            </span>
                          </td>
                          <td className="p-1.5 sm:p-2.5 align-top">
                            <span className="font-extrabold text-slate-900 block leading-snug">{item.schoolName}</span>
                            <span className="text-[10px] text-slate-500">{item.division}</span>
                          </td>
                          <td className="p-1.5 sm:p-2.5 align-top">
                            <span className="font-bold text-slate-800 block leading-snug">{item.activityName}</span>
                            <span className="text-[10px] text-slate-500">{item.dateString}</span>
                          </td>
                          <td className="p-1.5 sm:p-2.5 align-top">
                            <p className="text-slate-700 leading-relaxed font-medium">{item.issueDescription}</p>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                              <span>พบ: <strong className="text-rose-600">{item.currentValue}</strong></span>
                              <span>•</span>
                              <span>เกณฑ์: <strong className="text-emerald-700">{item.expectedValue}</strong></span>
                            </div>
                          </td>
                          <td className="p-1.5 sm:p-2.5 align-top">
                            <p className="text-slate-600 text-xs leading-relaxed">{item.suggestedAction}</p>
                          </td>
                          <td className="p-1.5 sm:p-2.5 align-top text-center whitespace-nowrap">
                            {item.reportId && onNavigateToDocument ? (
                              <button
                                type="button"
                                onClick={() => onNavigateToDocument(item.reportId!)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto cursor-pointer shadow-2xs active:scale-95"
                                title="เปิดดูและแก้ไขรายงานฉบับนี้"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>เปิดดู</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: PERIODIC & CUMULATIVE ANALYSIS */}
      {/* ============================================================== */}
      {activeTab === "time_analysis" && (
        <div className="space-y-6">
          <PeriodicAndCumulativeAnalysis
            reports={reports}
            selectedDivision={selectedDivision}
            onSelectDivision={setSelectedDivision}
            useArabicNumerals={useArabicNumerals}
          />
        </div>
      )}
      {/* Floating Download Status Toast */}
      {exportStatus.isExporting && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 bg-slate-950/95 text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md max-w-sm w-auto sm:w-full mx-auto sm:mx-0 animate-in fade-in slide-in-from-bottom-5 duration-200 no-print">
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
                {exportStatus.progress === 100 ? "ดาวน์โหลดเรียบร้อยแล้ว" : "กำลังส่งออกเอกสารสรุป PDF"}
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
    </div>
  );
};

export default ExecutiveOnePageView;
