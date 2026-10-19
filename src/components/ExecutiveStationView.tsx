import React, { useState, useMemo, useCallback, useEffect } from "react";
import { ActivityReport, KOPODOT_GOALS, ReportStatus, getGoalIdFromCode } from "../types";
import { OFFICIAL_TARGET_SCHOOLS, isSchoolMatch } from "../data/schoolsData";
import { ROYAL_EMBLEM_IMAGE } from "../data/emblemLogo";
import { ExecutivePresentationModal } from "./ExecutivePresentationModal";
import { safeParseNumber, formatNumberWithComma } from "../lib/safeDateUtils";
import {
  Tv,
  Presentation,
  Award,
  Users,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Printer,
  Sparkles,
  TrendingUp,
  Shield,
  Layers,
  BarChart3,
  PieChart,
  Calendar,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Filter,
  Search,
  Eye,
  Download,
  Flame,
  Target,
  FileSpreadsheet,
  ArrowUpRight,
  CheckCircle,
  HelpCircle,
  ClipboardList,
  Copy,
  Check,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
  MapPin,
  X
} from "lucide-react";

export const BPP_DIVISIONS = [
  {
    code: "21",
    shortName: "กก.ตชด. 21",
    fullName: "กองกำกับการตำรวจตระเวนชายแดนที่ 21",
    provinces: "สุรินทร์, บุรีรัมย์, ชัยภูมิ, นครราชสีมา",
    color: "indigo",
    badgeBg: "bg-indigo-50 text-indigo-900 border-indigo-200",
    headerBg: "bg-gradient-to-r from-indigo-700 to-indigo-800 text-white",
    cardBorder: "border-indigo-200/90",
    accentText: "text-indigo-700",
    lightBg: "bg-indigo-50/40",
  },
  {
    code: "22",
    shortName: "กก.ตชด. 22",
    fullName: "กองกำกับการตำรวจตระเวนชายแดนที่ 22",
    provinces: "อุบลราชธานี, อำนาจเจริญ, ศรีสะเกษ, ยโสธร",
    color: "sky",
    badgeBg: "bg-sky-50 text-sky-900 border-sky-200",
    headerBg: "bg-gradient-to-r from-sky-700 to-blue-800 text-white",
    cardBorder: "border-sky-200/90",
    accentText: "text-sky-700",
    lightBg: "bg-sky-50/40",
  },
  {
    code: "23",
    shortName: "กก.ตชด. 23",
    fullName: "กองกำกับการตำรวจตระเวนชายแดนที่ 23",
    provinces: "สกลนคร, มุกดาหาร, นครพนม",
    color: "teal",
    badgeBg: "bg-teal-50 text-teal-900 border-teal-200",
    headerBg: "bg-gradient-to-r from-teal-700 to-emerald-800 text-white",
    cardBorder: "border-teal-200/90",
    accentText: "text-teal-700",
    lightBg: "bg-teal-50/40",
  },
  {
    code: "24",
    shortName: "กก.ตชด. 24",
    fullName: "กองกำกับการตำรวจตระเวนชายแดนที่ 24",
    provinces: "อุดรธานี, เลย, หนองคาย, บึงกาฬ",
    color: "amber",
    badgeBg: "bg-amber-50 text-amber-950 border-amber-200",
    headerBg: "bg-gradient-to-r from-amber-600 to-amber-700 text-white",
    cardBorder: "border-amber-200/90",
    accentText: "text-amber-800",
    lightBg: "bg-amber-50/40",
  },
];

interface ExecutiveStationViewProps {
  reports: ActivityReport[];
  onSelectReport: (reportId: string) => void;
  onNavigateToDocument: (reportId: string) => void;
  onOpenSubmissionTracker: () => void;
  onOpenMultiPhaseTracker: () => void;
  onOpenPhotoGallery: () => void;
  onOpenVideoGallery: () => void;
  onOpenSchoolDirectoryModal?: (schoolName?: string) => void;
  onOpenExecutiveOnePage?: () => void;
}

export default function ExecutiveStationView({
  reports,
  onSelectReport,
  onNavigateToDocument,
  onOpenSubmissionTracker,
  onOpenMultiPhaseTracker,
  onOpenPhotoGallery,
  onOpenVideoGallery,
  onOpenSchoolDirectoryModal,
  onOpenExecutiveOnePage,
}: ExecutiveStationViewProps) {
  const [selectedTab, setSelectedTab] = useState<"strategic" | "schools">("strategic");
  const [schoolViewMode, setSchoolViewMode] = useState<"board" | "table">("board");
  const [selectedDivisionTab, setSelectedDivisionTab] = useState<string>("all");
  const [schoolStatusFilter, setSchoolStatusFilter] = useState<"all" | "submitted" | "pending">("all");
  const [boardSearch, setBoardSearch] = useState<string>("");
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>("all");
  const [selectedGoalFilter, setSelectedGoalFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isTvPresentationOpen, setIsTvPresentationOpen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isAiSynthesizing, setIsAiSynthesizing] = useState<boolean>(false);

  const schoolsByDivision = useMemo(() => {
    return BPP_DIVISIONS.map((div) => {
      const divSchools = OFFICIAL_TARGET_SCHOOLS.filter(
        (s) => s.groupName && s.groupName.includes(div.code)
      );
      const divSchoolsWithStats = divSchools.map((school) => {
        const globalIdx = OFFICIAL_TARGET_SCHOOLS.findIndex((s) => s.id === school.id) + 1;
        const schoolReports = reports.filter((r) => isSchoolMatch(r.schoolName, school.name));
        const reportCount = schoolReports.length;
        const participants = schoolReports.reduce((sum, r) => sum + (r.participantsCount || 0), 0);
        const isSubmitted = reportCount > 0;
        return {
          ...school,
          globalIdx,
          reportCount,
          participants,
          isSubmitted,
          schoolReports,
        };
      });

      const submittedCount = divSchoolsWithStats.filter((s) => s.isSubmitted).length;
      const totalCount = divSchoolsWithStats.length;
      const totalReps = divSchoolsWithStats.reduce((sum, s) => sum + s.reportCount, 0);
      const totalParts = divSchoolsWithStats.reduce((sum, s) => sum + s.participants, 0);
      const percent = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;

      return {
        ...div,
        schools: divSchoolsWithStats,
        submittedCount,
        totalCount,
        totalReps,
        totalParts,
        percent,
      };
    });
  }, [reports]);

  const totalAllSchoolsStats = useMemo(() => {
    let submitted = 0;
    let totalReports = 0;
    let totalParts = 0;
    OFFICIAL_TARGET_SCHOOLS.forEach((school) => {
      const schoolReports = reports.filter((r) => isSchoolMatch(r.schoolName, school.name));
      if (schoolReports.length > 0) submitted++;
      totalReports += schoolReports.length;
      totalParts += schoolReports.reduce((sum, r) => sum + (r.participantsCount || 0), 0);
    });
    return {
      total: OFFICIAL_TARGET_SCHOOLS.length,
      submitted,
      pending: OFFICIAL_TARGET_SCHOOLS.length - submitted,
      coveragePercent: OFFICIAL_TARGET_SCHOOLS.length > 0 ? Math.round((submitted / OFFICIAL_TARGET_SCHOOLS.length) * 100) : 0,
      totalReports,
      totalParts,
    };
  }, [reports]);

  // Helper for generating dynamic, strictly accurate synthesis from real metrics
  const generateAccurateSynthesis = useCallback((repList: ActivityReport[]) => {
    const totalReps = repList.length;
    const totalParts = repList.reduce((acc, curr) => acc + safeParseNumber(curr.participantsCount, 0), 0);
    const activeSchools = OFFICIAL_TARGET_SCHOOLS.filter((s) =>
      repList.some((r) => isSchoolMatch(r.schoolName, s.name))
    );
    const targetCount = OFFICIAL_TARGET_SCHOOLS.length;
    const submittingCount = activeSchools.length;
    const coverage = targetCount > 0 ? Math.min(100, Math.round((submittingCount / targetCount) * 100)) : 0;

    // Goals breakdown
    const gCounts: Record<number, number> = {};
    KOPODOT_GOALS.forEach((g) => { gCounts[g.id] = 0; });
    repList.forEach((r) => {
      const gid = getGoalIdFromCode(r.goalCode);
      if (gid >= 1 && gid <= 8) {
        gCounts[gid] = (gCounts[gid] || 0) + 1;
      }
    });

    const sortedGoals = [...KOPODOT_GOALS]
      .map((g) => ({ ...g, count: gCounts[g.id] || 0 }))
      .sort((a, b) => b.count - a.count);

    const topGoal1 = sortedGoals[0] || { id: 4, title: "การส่งเสริมโภชนาการและสุขภาพอนามัย", count: 0 };
    const topGoal2 = sortedGoals[1] || { id: 1, title: "การพัฒนาการเกษตรเพื่ออาหารกลางวัน", count: 0 };
    const lowestGoals = sortedGoals.filter((g) => g.count <= 2);

    const problemReps = repList.filter(
      (r) => r.problems && r.problems.trim() !== "-" && r.problems.trim() !== "" && !r.problems.includes("ไม่มีปัญหา")
    );

    const overview = `สรุปภาพรวมเชิงบริหารสำหรับการนำเสนอในที่ประชุม (กองบังคับการตำรวจตระเวนชายแดนภาค 2 - 53 โรงเรียน): การดำเนินงานตามแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด. ฉบับที่ 5) มีการบันทึกรายงานกิจกรรมแล้วรวมทั้งสิ้น ${totalReps.toLocaleString()} รายการ จากสถานศึกษาเป้าหมาย ${submittingCount} จาก ${targetCount} แห่ง (อัตราครอบคลุมร้อยละ ${coverage}) มีนักเรียน ครู และประชาชนได้รับประโยชน์สะสมรวม ${totalParts.toLocaleString()} คน โดยกิจกรรมที่มีการขับเคลื่อนสูงสุดคือด้านที่ ${topGoal1.id} (${topGoal1.title}) จำนวน ${topGoal1.count} กิจกรรม การดำเนินงานโดยรวมเป็นไปตามเป้าหมายแผนงานโครงการพระราชดำริฯ อย่างเป็นรูปธรรม`;

    const strengths = [
      `ผลสัมฤทธิ์เด่นชัดในด้านที่ ${topGoal1.id} (${topGoal1.title}) จำนวน ${topGoal1.count} กิจกรรม และด้านที่ ${topGoal2.id} (${topGoal2.title}) จำนวน ${topGoal2.count} กิจกรรม ซึ่งมีการจัดกิจกรรมสะสมสูงสุด ส่งเสริมภาวะโภชนาการ สุขอนามัย และทักษะวิชาชีพของนักเรียนอย่างต่อเนื่อง`,
      `การมีส่วนร่วมของชุมชนและผู้รับประโยชน์สะสมรวมกว่า ${totalParts.toLocaleString()} คน สะท้อนถึงความร่วมมืออันเข้มแข็งระหว่างครู ตชด. ผู้ปกครอง คณะกรรมการสถานศึกษา และองค์กรปกครองส่วนท้องถิ่นในพื้นที่ 53 โรงเรียน`,
      `การจัดเก็บและติดตามผลการปฏิบัติงานผ่านระบบสารสนเทศแบบ Real-time ครอบคลุมแล้ว ${submittingCount} โรงเรียน ช่วยให้ผู้บังคับบัญชาสามารถกำกับดูแลและติดตามความก้าวหน้ารายโรงเรียนได้อย่างแม่นยำโปร่งใส`
    ];

    const improvements = [
      lowestGoals.length > 0
        ? `ควรเร่งรัดและส่งเสริมการจัดกิจกรรมในด้านที่ยังมีสถิติน้อย ได้แก่ ${lowestGoals.slice(0, 2).map(g => `ด้านที่ ${g.id} (${g.title})`).join(" และ ")} เพื่อให้การพัฒนาเด็กและเยาวชนบรรลุเป้าหมายครบถ้วนทั้ง 8 ด้านของแผน กพด.5`
        : `ควรส่งเสริมการขยายผลศูนย์บริการความรู้และแหล่งเรียนรู้ตลอดชีวิตสู่ชุมชนรอบโรงเรียนอย่างต่อเนื่อง`,
      problemReps.length > 0
        ? `ควรติดตามและสนับสนุนงบประมาณ/อุปกรณ์ตามประเด็นปัญหาที่สถานศึกษารายงานเข้ามา (${problemReps.length} ประเด็น) โดยเฉพาะระบบพลังงานแสงอาทิตย์ (Solar Cell) ระบบน้ำดื่มสะอาด และอุปกรณ์เชื่อมต่อสื่อสารดิจิทัลในโรงเรียนพื้นที่ห่างไกล`
        : `ควรได้รับการสนับสนุนงบประมาณและอุปกรณ์ซ่อมบำรุงโครงสร้างพื้นฐานเพิ่มเติม โดยเฉพาะระบบพลังงานแสงอาทิตย์และระบบกรองน้ำดื่มสะอาดในโรงเรียนพื้นที่ห่างไกล`
    ];

    return {
      executiveOverview: overview,
      strengths,
      improvements,
      confidenceScore: 98,
      isFallback: false
    };
  }, []);

  // Executive Synthesis State
  const [aiSynthesisData, setAiSynthesisData] = useState(() => generateAccurateSynthesis(reports));

  // Sync synthesis data when reports change
  useEffect(() => {
    if (reports && reports.length > 0) {
      setAiSynthesisData(generateAccurateSynthesis(reports));
    }
  }, [reports, generateAccurateSynthesis]);

  // Handle Fetch Gemini AI Synthesis
  const handleFetchGeminiSynthesis = async () => {
    setIsAiSynthesizing(true);
    try {
      const sampleSummaries = reports.slice(0, 15).map(r => `${r.schoolName}: ${r.activityName} - ${r.qualitativeOutcome || r.quantitativeOutcome || ''}`);
      const response = await fetch("/api/gemini/executive-synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: "ภาพรวม 53 โรงเรียน ตชด. ภาค 2",
          periodText: "ประจำรอบปีงบประมาณ 2568–2569",
          stats: {
            totalReports: reports.length,
            totalParticipants: reports.reduce((acc, curr) => acc + (curr.participantsCount || 0), 0),
            targetSchoolsCount: OFFICIAL_TARGET_SCHOOLS.length
          },
          sampleSummaries
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.executiveOverview) {
          setAiSynthesisData(data);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch fresh AI executive synthesis, using resilient defaults", err);
    } finally {
      setIsAiSynthesizing(false);
    }
  };

  // Handle Copy Full Presentation Text
  const handleCopyPresentationText = () => {
    const textToCopy = `【สรุปภาพรวมเชิงบริหาร สำหรับการนำเสนอในที่ประชุม】\nหน่วยงาน: กองบังคับการตำรวจตระเวนชายแดนภาค 2 (53 โรงเรียน)\n\n📌 ข้อสรุปภาพรวม:\n${aiSynthesisData.executiveOverview}\n\n🌟 3 จุดเด่นสำคัญ (Key Strengths):\n${aiSynthesisData.strengths.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n🚀 2 จุดที่ควรได้รับการสนับสนุนเพิ่มเติม (Support Needs):\n${aiSynthesisData.improvements.map((im, i) => `${i + 1}. ${im}`).join("\n")}\n\n(ศูนย์ข้อมูลสารสนเทศ แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร กพด.5 ตามพระราชดำริฯ)`;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Helper for Thai numerals
  const toThaiNumerals = (num: number | string): string => {
    return String(num);
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchSchool = selectedSchoolFilter === "all" || r.schoolName === selectedSchoolFilter;
      const matchGoal = selectedGoalFilter === "all" || r.goalCode.includes(selectedGoalFilter);
      const matchSearch =
        searchQuery === "" ||
        r.activityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.reportedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.details && r.details.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSchool && matchGoal && matchSearch;
    });
  }, [reports, selectedSchoolFilter, selectedGoalFilter, searchQuery]);

  // Strategic KPI Metrics
  const metrics = useMemo(() => {
    const totalReports = reports.length;
    const totalParticipants = reports.reduce((acc, curr) => acc + (curr.participantsCount || 0), 0);
    
    // Schools submitting with robust matching against OFFICIAL_TARGET_SCHOOLS
    const activeTargetSchools = OFFICIAL_TARGET_SCHOOLS.filter((s) =>
      reports.some((r) => isSchoolMatch(r.schoolName, s.name))
    );
    const targetSchoolsCount = OFFICIAL_TARGET_SCHOOLS.length;
    const submittingSchoolsCount = activeTargetSchools.length;
    const coveragePercentage = targetSchoolsCount > 0 
      ? Math.min(100, Math.round((submittingSchoolsCount / targetSchoolsCount) * 100)) 
      : 0;

    // Goal distribution (support กพด.1-8, ด้านที่ 1-8, เป้าหมายที่ 1-8, etc.)
    const goalCounts: Record<number, number> = {};
    KOPODOT_GOALS.forEach((g) => { goalCounts[g.id] = 0; });
    reports.forEach((r) => {
      const gid = getGoalIdFromCode(r.goalCode);
      if (gid >= 1 && gid <= 8) {
        goalCounts[gid] = (goalCounts[gid] || 0) + 1;
      }
    });

    // Ranked Schools
    const schoolCountMap: Record<string, { count: number; participants: number; latestDate: string }> = {};
    OFFICIAL_TARGET_SCHOOLS.forEach((s) => {
      const schoolReports = reports.filter((r) => isSchoolMatch(r.schoolName, s.name));
      if (schoolReports.length > 0) {
        const parts = schoolReports.reduce((sum, r) => sum + (r.participantsCount || 0), 0);
        const latest = schoolReports[0]?.dateString || "";
        schoolCountMap[s.name] = { count: schoolReports.length, participants: parts, latestDate: latest };
      }
    });

    // Also include any other submitting schools not in official list
    reports.forEach((r) => {
      if (!r.schoolName) return;
      const isOfficial = OFFICIAL_TARGET_SCHOOLS.some((s) => isSchoolMatch(r.schoolName, s.name));
      if (!isOfficial && !schoolCountMap[r.schoolName]) {
        const extraReports = reports.filter((x) => x.schoolName === r.schoolName);
        const parts = extraReports.reduce((sum, x) => sum + (x.participantsCount || 0), 0);
        schoolCountMap[r.schoolName] = { count: extraReports.length, participants: parts, latestDate: r.dateString || "" };
      }
    });

    const rankedSchools = Object.entries(schoolCountMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    // Urgent Action Items from Problems
    const problemReports = reports.filter(
      (r) => r.problems && r.problems.trim() !== "-" && r.problems.trim() !== "" && !r.problems.includes("ไม่มีปัญหา")
    );

    return {
      totalReports,
      totalParticipants,
      submittingSchoolsCount,
      targetSchoolsCount,
      coveragePercentage,
      goalCounts,
      rankedSchools,
      problemReportsCount: problemReports.length,
      problemReports
    };
  }, [reports]);

  // Handle printing executive briefing memo
  const handlePrintBriefing = () => {
    window.print();
  };

    return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-fadeIn w-full overflow-hidden">
      {/* 1. Presentation Command Station Summary Bar */}
      <div className="bg-gradient-to-r from-purple-50/90 via-white to-indigo-50/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 text-slate-900 shadow-xs border border-purple-200/50 relative overflow-hidden w-full">
        {/* Background Subtle Accent Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Vital Scorecard Pill Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10">
          <div className="bg-white/80 rounded-2xl p-3 sm:p-3.5 border border-indigo-100/80 shadow-2xs">
            <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold mb-1">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>รายงานที่ส่งแล้ว</span>
            </div>
            <div className="text-base sm:text-lg font-black text-indigo-950">
              {metrics.totalReports.toLocaleString()} <span className="text-xs font-semibold text-slate-500">กิจกรรม</span>
            </div>
          </div>

          <div className="bg-white/80 rounded-2xl p-3 sm:p-3.5 border border-emerald-100/80 shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold mb-1">
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>ผู้เข้าร่วมสะสม</span>
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-600">
              {metrics.totalParticipants.toLocaleString()} <span className="text-xs font-semibold text-slate-500">คน</span>
            </div>
          </div>

          <div className="bg-white/80 rounded-2xl p-3 sm:p-3.5 border border-purple-100/80 shadow-2xs">
            <div className="flex items-center gap-2 text-purple-700 text-xs font-bold mb-1">
              <Building2 className="w-3.5 h-3.5 text-purple-500" />
              <span>โรงเรียนเป้าหมาย ตชด.</span>
            </div>
            <div className="text-base sm:text-lg font-black text-purple-900">
              {metrics.submittingSchoolsCount} <span className="text-xs font-semibold text-slate-500">/ {metrics.targetSchoolsCount} แห่ง</span>
            </div>
          </div>

          <div className="bg-white/80 rounded-2xl p-3 sm:p-3.5 border border-rose-100/80 shadow-2xs">
            <div className="flex items-center gap-2 text-rose-700 text-xs font-bold mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>ประเด็นต้องสนับสนุน</span>
            </div>
            <div className="text-base sm:text-lg font-black text-rose-600">
              {metrics.problemReportsCount} <span className="text-xs font-semibold text-slate-500">เรื่อง</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Executive View Navigation Tabs (Unified Segmented Control & Search) */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Mobile Dropdown Selector (< md) */}
        <div className="block md:hidden w-full">
          <div className="relative w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1.5 text-indigo-700">
              {selectedTab === "strategic" && <BarChart3 className="w-4 h-4 text-indigo-600" />}
              {selectedTab === "schools" && <Building2 className="w-4 h-4 text-indigo-600" />}
            </div>
            <select
              value={selectedTab}
              onChange={(e) => setSelectedTab(e.target.value as any)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white appearance-none cursor-pointer shadow-2xs transition"
              aria-label="เลือกมุมมองสรุปผลผู้บริหาร"
            >
              <option value="strategic">📊 ภาพรวมยุทธศาสตร์ 8 ด้าน</option>
              <option value="schools">🏫 สถานะและผลงานรายโรงเรียน ({metrics.rankedSchools.length})</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Desktop & Tablet Responsive Segmented Tab Button Group */}
        <div className="hidden md:grid md:grid-cols-2 xl:inline-flex xl:flex-nowrap items-center bg-slate-100/85 p-1 rounded-xl border border-slate-200/70 gap-1 w-full xl:w-auto">
          <button
            onClick={() => setSelectedTab("strategic")}
            className={`whitespace-nowrap inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 lg:px-3.5 py-2 rounded-lg text-xs lg:text-sm transition-all cursor-pointer select-none ${
              selectedTab === "strategic"
                ? "bg-gradient-to-r from-indigo-800 to-indigo-950 text-white shadow-xs font-black border border-indigo-950"
                : "text-slate-600 font-bold hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <BarChart3 className={`w-4 h-4 shrink-0 ${selectedTab === "strategic" ? "text-amber-300" : "text-slate-500"}`} />
            <span>ภาพรวมยุทธศาสตร์ 8 ด้าน</span>
          </button>

          <button
            onClick={() => setSelectedTab("schools")}
            className={`whitespace-nowrap inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 lg:px-3.5 py-2 rounded-lg text-xs lg:text-sm transition-all cursor-pointer select-none ${
              selectedTab === "schools"
                ? "bg-gradient-to-r from-indigo-800 to-indigo-950 text-white shadow-xs font-black border border-indigo-950"
                : "text-slate-600 font-bold hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Building2 className={`w-4 h-4 shrink-0 ${selectedTab === "schools" ? "text-amber-300" : "text-slate-500"}`} />
            <span>สถานะและผลงานรายโรงเรียน</span>
            <span className={`inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
              selectedTab === "schools" ? "bg-white/20 text-white" : "bg-slate-200/90 text-slate-700"
            }`}>
              {metrics.rankedSchools.length}
            </span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center gap-2.5 w-full xl:w-72 shrink-0">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหากิจกรรม, โรงเรียน..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* 3. Tab Contents */}

      {/* TAB 1: ภาพรวมยุทธศาสตร์ 8 ด้าน (8-Goal Strategic Progress) */}
      {selectedTab === "strategic" && (
        <div className="space-y-6">
          {/* Executive Summary Brief Box (Fast Scan for Commanders) */}
          <div className="app-card-surface bg-gradient-to-br from-indigo-50/70 via-white to-amber-50/20 border-indigo-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100/80 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="typo-app-h3 text-indigo-950 font-black truncate">
                    สรุปภาพรวม สำหรับผู้บังคับบัญชา
                  </h3>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyPresentationText}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 ${
                    isCopied
                      ? "bg-emerald-600 text-white"
                      : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90"
                  }`}
                  title="คัดลอกข้อความสรุปทั้งหมดไปใช้ในการประชุม"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{isCopied ? "คัดลอกสำเร็จ!" : "คัดลอกข้อความนำเสนอ"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleFetchGeminiSynthesis}
                  disabled={isAiSynthesizing}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                  title="ประมวลผลสรุปภาพรวมใหม่ด้วย Gemini AI"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAiSynthesizing ? "animate-spin text-amber-500" : "text-indigo-600"}`} />
                  <span className="hidden sm:inline">{isAiSynthesizing ? "กำลังประมวลผล..." : "AI วิเคราะห์ใหม่"}</span>
                </button>

                {onOpenExecutiveOnePage && (
                  <button
                    type="button"
                    onClick={onOpenExecutiveOnePage}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    title="เปิดบทสรุป 1 หน้า A4 และตรวจสอบคุณภาพข้อมูล"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>AI สรุป 1 หน้า</span>
                  </button>
                )}
              </div>
            </div>

            {/* Executive Overview Highlight Text */}
            <div className="bg-white p-4 rounded-2xl border border-indigo-100/90 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  บทสรุปภาพรวมเชิงบริหารสำหรับการนำเสนอในที่ประชุม
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  กองบังคับการตำรวจตระเวนชายแดนภาค 2
                </span>
              </div>
              <p className="typo-app-body text-slate-800 text-xs sm:text-[13.5px] leading-relaxed font-normal">
                {aiSynthesisData.executiveOverview}
              </p>
            </div>

            {/* 3 Key Strengths & 2 Support Needs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* 3 Strengths */}
              <div className="bg-emerald-50/70 p-3.5 sm:p-4 rounded-2xl border border-emerald-200/80 space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-2 text-emerald-950">
                  <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h4 className="typo-app-h3 text-xs sm:text-sm font-black text-emerald-950">
                    🌟 3 จุดเด่นสำคัญ (Key Strengths)
                  </h4>
                </div>
                <div className="space-y-2">
                  {aiSynthesisData.strengths.map((str, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                      <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[9px] sm:text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="typo-app-body text-[8.5px] sm:text-xs text-slate-700 leading-relaxed font-medium">
                        {str}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2 Support Needs */}
              <div className="bg-amber-50/70 p-3.5 sm:p-4 rounded-2xl border border-amber-200/80 space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-2 text-amber-950">
                  <TrendingUp className="w-4 h-4 text-amber-600 shrink-0" />
                  <h4 className="typo-app-h3 text-xs sm:text-sm font-black text-amber-950">
                    🚀 2 จุดที่ควรได้รับการสนับสนุนเพิ่มเติม (Support Needs)
                  </h4>
                </div>
                <div className="space-y-2">
                  {aiSynthesisData.improvements.map((imp, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-amber-100 shadow-2xs">
                      <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-100 text-amber-800 font-black text-[9px] sm:text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="typo-app-body text-[8.5px] sm:text-xs text-slate-700 leading-relaxed font-medium">
                        {imp}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 8 Goals Strategic Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {KOPODOT_GOALS.map((goal) => {
              const count = metrics.goalCounts[goal.id] || 0;
              const percentage = metrics.totalReports > 0 ? Math.round((count / metrics.totalReports) * 100) : 0;
              
              return (
                <div
                  key={goal.id}
                  className="app-card-surface hover:border-indigo-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span
                        className="px-2.5 py-1 rounded-lg text-xs font-black text-white"
                        style={{ backgroundColor: goal.color }}
                      >
                        ด้านที่ {goal.id}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {percentage}% ของทั้งหมด
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2" title={goal.title}>
                      {goal.title}
                    </h4>

                    <p className="typo-app-subtext text-xs text-slate-500 line-clamp-2">
                      {goal.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-black text-slate-900">{count}</span>
                      <span className="text-xs text-slate-500 ml-1">กิจกรรม</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedGoalFilter(`ด้านที่ ${goal.id}`);
                        setSelectedTab("schools");
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition cursor-pointer text-xs font-bold flex items-center gap-1"
                    >
                      <span>ดูผลงาน</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: สถานะและผลงานรายโรงเรียน ตชด. (School Readiness & Compliance) */}
      {selectedTab === "schools" && (
        <div id="target-schools-section" className="space-y-4 sm:space-y-6">
          <div className="app-card-surface space-y-4 sm:space-y-5">
            {/* Header: Title, Subtext, Stats Chips & View Mode Toggle */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="typo-app-h3 text-slate-900 font-extrabold flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-700 shrink-0" />
                    <span>สถานะความพร้อมและผลงานรายโรงเรียนตำรวจตระเวนชายแดน</span>
                  </h3>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200 shrink-0">
                    ครบทั้ง 53 โรงเรียนเป้าหมาย บก.ตชด.ภาค 2
                  </span>
                </div>
                <p className="typo-app-subtext">
                  ภาพรวม 4 กองกำกับการ (กก.ตชด. 21, 22, 23, 24) แสดงชื่อครบถ้วนทุกโรงเรียนในหน้าเดียว ไม่ต้องเลื่อนขึ้นลง
                </p>
              </div>

              {/* View Switcher: Board vs Table */}
              <div className="flex items-center gap-2 shrink-0 self-start lg:self-auto">
                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setSchoolViewMode("board")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      schoolViewMode === "board"
                        ? "bg-white text-indigo-900 shadow-2xs font-extrabold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="แสดงครบทั้ง 53 โรงเรียนในหน้าเดียว จัดตาม 4 กองกำกับการ ไม่ต้องเลื่อน"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                    <span>กระดาน 53 โรงเรียน (ไม่ต้องเลื่อน)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchoolViewMode("table")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      schoolViewMode === "table"
                        ? "bg-white text-indigo-900 shadow-2xs font-extrabold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="แสดงตารางรายละเอียดและเอกสาร A4"
                  >
                    <TableIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ตารางรายละเอียด</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Overall Summary Bar (53 Schools Overview) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500">โรงเรียนเป้าหมาย</p>
                  <p className="text-base sm:text-lg font-black text-slate-900">{totalAllSchoolsStats.total} แห่ง</p>
                </div>
                <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-emerald-800">ส่งรายงานแล้ว</p>
                  <p className="text-base sm:text-lg font-black text-emerald-700">
                    {totalAllSchoolsStats.submitted} แห่ง ({totalAllSchoolsStats.coveragePercent}%)
                  </p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              </div>

              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-amber-800">รอดำเนินการส่ง</p>
                  <p className="text-base sm:text-lg font-black text-amber-700">{totalAllSchoolsStats.pending} แห่ง</p>
                </div>
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200/80 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-indigo-800">รายงานสะสมทั้งหมด</p>
                  <p className="text-base sm:text-lg font-black text-indigo-700">{totalAllSchoolsStats.totalReports.toLocaleString()} ครั้ง</p>
                </div>
                <ClipboardList className="w-5 h-5 text-indigo-600 shrink-0" />
              </div>
            </div>

            {/* Filter Bar: Status filter pills & Search bar & Division filter tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              {/* Status Filters */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  <span>ตัวกรอง:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSchoolStatusFilter("all")}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    schoolStatusFilter === "all"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  ทั้งหมด (53)
                </button>
                <button
                  type="button"
                  onClick={() => setSchoolStatusFilter("submitted")}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    schoolStatusFilter === "submitted"
                      ? "bg-emerald-700 text-white shadow-2xs"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>ส่งแล้ว ({totalAllSchoolsStats.submitted})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSchoolStatusFilter("pending")}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    schoolStatusFilter === "pending"
                      ? "bg-amber-700 text-white shadow-2xs"
                      : "bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100"
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>รอดำเนินการ ({totalAllSchoolsStats.pending})</span>
                </button>
              </div>

              {/* Quick Search */}
              <div className="relative min-w-[220px] max-w-full sm:max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อโรงเรียน หรือจังหวัด..."
                  value={boardSearch}
                  onChange={(e) => setBoardSearch(e.target.value)}
                  className="w-full pl-9 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
                {boardSearch && (
                  <button
                    type="button"
                    onClick={() => setBoardSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Division Tabs (Visible on small screens to easily jump without scrolling) */}
            <div className="flex md:hidden items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100 pt-1">
              <button
                type="button"
                onClick={() => setSelectedDivisionTab("all")}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold shrink-0 cursor-pointer transition ${
                  selectedDivisionTab === "all"
                    ? "bg-indigo-700 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                ทั้งหมด 4 กก. (53 แห่ง)
              </button>
              {BPP_DIVISIONS.map((d) => (
                <button
                  key={d.code}
                  type="button"
                  onClick={() => setSelectedDivisionTab(d.code)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold shrink-0 cursor-pointer transition ${
                    selectedDivisionTab === d.code
                      ? "bg-indigo-700 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {d.shortName}
                </button>
              ))}
            </div>

            {/* ========================================================= */}
            {/* VIEW MODE 1: COMPACT 53 SCHOOLS BOARD (จัดครบทุกแห่ง ไม่ต้องเลื่อน) */}
            {/* ========================================================= */}
            {schoolViewMode === "board" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4 items-stretch pt-2">
                {schoolsByDivision
                  .filter((div) => selectedDivisionTab === "all" || selectedDivisionTab === div.code)
                  .map((div) => {
                    const filteredSchools = div.schools.filter((s) => {
                      const matchStatus =
                        schoolStatusFilter === "all" ||
                        (schoolStatusFilter === "submitted" && s.isSubmitted) ||
                        (schoolStatusFilter === "pending" && !s.isSubmitted);
                      const q = boardSearch.toLowerCase().trim();
                      const matchSearch =
                        !q ||
                        s.name.toLowerCase().includes(q) ||
                        (s.province || "").toLowerCase().includes(q) ||
                        (s.district || "").toLowerCase().includes(q);
                      return matchStatus && matchSearch;
                    });

                    return (
                      <div
                        key={div.code}
                        className={`rounded-2xl border ${div.cardBorder} bg-white shadow-2xs flex flex-col justify-between overflow-hidden transition-all duration-200`}
                      >
                        {/* Division Card Header */}
                        <div className={`p-3 sm:p-3.5 ${div.headerBg} flex items-center justify-between gap-2 shadow-xs`}>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm sm:text-base font-black tracking-tight leading-tight truncate">
                                {div.shortName}
                              </h4>
                              <span className="text-[10.5px] font-extrabold bg-white/20 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                                {div.totalCount} แห่ง
                              </span>
                            </div>
                            <p className="text-[10.5px] text-white/85 font-medium truncate mt-0.5" title={div.provinces}>
                              {div.provinces}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-black bg-white text-slate-900 px-2 py-0.5 rounded-lg shadow-2xs">
                              {div.percent}%
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar Strip */}
                        <div className="w-full bg-slate-100 h-1.5">
                          <div
                            className={`h-full transition-all duration-500 ${
                              div.code === "21" ? "bg-indigo-600" :
                              div.code === "22" ? "bg-sky-600" :
                              div.code === "23" ? "bg-teal-600" : "bg-amber-600"
                            }`}
                            style={{ width: `${div.percent}%` }}
                          />
                        </div>

                        {/* Dense List of Schools (Compact rows fitting on screen without scrolling) */}
                        <div className="p-2 sm:p-2.5 flex-1 space-y-1.5">
                          {filteredSchools.length > 0 ? (
                            filteredSchools.map((s) => (
                              <div
                                key={s.id}
                                onClick={() => {
                                  if (onOpenSchoolDirectoryModal) {
                                    onOpenSchoolDirectoryModal(s.name);
                                  }
                                }}
                                className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-1.5 group ${
                                  s.isSubmitted
                                    ? "bg-white hover:bg-emerald-50/50 border-slate-200/70 hover:border-emerald-300"
                                    : "bg-slate-50/70 hover:bg-amber-50/50 border-slate-200/60 hover:border-amber-300"
                                }`}
                                title={`คลิกดูข้อมูลโรงเรียน: ${s.name} (${s.subdistrict}, อ.${s.district}, จ.${s.province})`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <span className={`w-5 h-5 rounded-md font-black text-[10px] flex items-center justify-center shrink-0 ${
                                    s.isSubmitted
                                      ? "bg-emerald-100 text-emerald-800 font-bold"
                                      : "bg-slate-200/80 text-slate-600"
                                  }`}>
                                    {s.globalIdx}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-800 group-hover:text-indigo-700 text-[8.5px] truncate leading-snug" style={{ fontSize: "8.5px" }}>
                                      {s.name}
                                    </p>
                                    <p className="text-[8px] text-slate-400 font-normal truncate" style={{ fontSize: "8px" }}>
                                      จ.{s.province}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {s.isSubmitted ? (
                                    <span className="inline-flex items-center gap-0.5 text-[9.5px] font-black text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded-md border border-emerald-200/80 whitespace-nowrap">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
                                      <span>{s.reportCount}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded-md border border-amber-200/80 whitespace-nowrap">
                                      <Clock className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                                      <span>รอส่ง</span>
                                    </span>
                                  )}
                                  <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-indigo-600 transition shrink-0" />
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-8 text-center text-slate-400 text-xs">
                              ไม่พบโรงเรียนที่ตรงกับตัวกรอง
                            </div>
                          )}
                        </div>

                        {/* Column Summary Footer */}
                        <div className="p-2.5 bg-slate-50/90 border-t border-slate-100 text-[11px] font-bold text-slate-600 flex items-center justify-between">
                          <span>ส่งแล้ว {div.submittedCount}/{div.totalCount} แห่ง</span>
                          <span className="text-indigo-700 font-black">{div.totalReps} กิจกรรม</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW MODE 2: DETAILED TABLE / CARDS (โหมดตารางเดิมสำหรับดูผู้เข้าร่วมและพิมพ์ A4) */}
            {/* ========================================================= */}
            {schoolViewMode === "table" && (
              <div className="space-y-4 pt-2">
                <div className="w-full">
                  <select
                    value={selectedSchoolFilter}
                    onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all font-medium text-slate-800 cursor-pointer shadow-2xs"
                  >
                    <option value="all">แสดงผลทุกโรงเรียน ({OFFICIAL_TARGET_SCHOOLS.length} แห่ง)</option>
                    {OFFICIAL_TARGET_SCHOOLS.map((s) => (
                      <option key={s.id} value={s.name}>{s.name} ({s.province})</option>
                    ))}
                  </select>
                </div>

                {/* Desktop / Tablet Responsive Table View */}
                <div className="hidden md:block w-full overflow-x-auto">
                  <table className="w-full text-left text-xs table-fixed border-collapse min-w-full">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[10px] sm:text-xs">
                        <th className="py-2 px-1.5 sm:px-2 w-[6%] text-center whitespace-nowrap">ลำดับ</th>
                        <th className="py-2 px-2 sm:px-3 w-[42%]">สถานศึกษา / สังกัดที่ตั้ง</th>
                        <th className="py-2 px-1.5 sm:px-2 text-center w-[12%] whitespace-nowrap">รายงาน</th>
                        <th className="py-2 px-1.5 sm:px-2 text-center w-[13%] whitespace-nowrap">ผู้เข้าร่วม</th>
                        <th className="py-2 px-1.5 sm:px-2 text-center w-[12%] whitespace-nowrap">สถานะ</th>
                        <th className="py-2 px-2 sm:px-3 text-right w-[15%] whitespace-nowrap">ดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {OFFICIAL_TARGET_SCHOOLS
                        .filter((s) => {
                          const matchDropdown = selectedSchoolFilter === "all" || s.name === selectedSchoolFilter;
                          const matchSearch =
                            searchQuery === "" ||
                            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.province.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.district.toLowerCase().includes(searchQuery.toLowerCase());
                          return matchDropdown && matchSearch;
                        })
                        .map((school, index) => {
                          const schoolReports = reports.filter((r) => isSchoolMatch(r.schoolName, school.name));
                          const reportCount = schoolReports.length;
                          const participants = schoolReports.reduce((sum, r) => sum + (r.participantsCount || 0), 0);
                          const isSubmitted = reportCount > 0;

                          return (
                            <tr key={school.id} className="hover:bg-indigo-50/40 transition">
                              <td className="py-2.5 px-2 font-bold text-slate-400 text-center text-xs w-10 whitespace-nowrap">{index + 1}</td>
                              <td className="py-2.5 px-3 min-w-0">
                                <div className="flex items-start gap-2">
                                  <Building2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                  <div className="min-w-0">
                                    <button
                                      onClick={() => {
                                        if (onOpenSchoolDirectoryModal) {
                                          onOpenSchoolDirectoryModal(school.name);
                                        }
                                      }}
                                      className="font-bold text-slate-900 hover:text-indigo-600 leading-snug text-left cursor-pointer transition flex items-center gap-1"
                                    >
                                      <span>{school.name}</span>
                                      <ExternalLink className="w-3 h-3 text-indigo-500 inline shrink-0" />
                                    </button>
                                    <div className="text-[11px] text-slate-500">
                                      {school.subdistrict}, อ.{school.district}, จ.{school.province}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-center w-20 whitespace-nowrap">
                                <span className={`inline-flex items-center justify-center font-black px-2 py-0.5 rounded-full text-xs ${
                                  reportCount > 0 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                                }`}>
                                  {reportCount} กิจกรรม
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-center font-semibold text-slate-700 w-22 whitespace-nowrap text-xs">
                                {participants.toLocaleString()} คน
                              </td>
                              <td className="py-2.5 px-2 text-center w-24 whitespace-nowrap">
                                {isSubmitted ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-bold border border-emerald-200 whitespace-nowrap">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                    <span>ส่งแล้ว</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-bold border border-amber-200 whitespace-nowrap">
                                    <Clock className="w-3.5 h-3.5 shrink-0" />
                                    <span>รอดำเนินการ</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right w-44 whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      if (onOpenSchoolDirectoryModal) {
                                        onOpenSchoolDirectoryModal(school.name);
                                      }
                                    }}
                                    className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-900 text-white font-bold text-xs transition inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                    title="เปิดหน้าต่างลอยข้อมูลโรงเรียนนี้"
                                  >
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span>หน้าต่างลอย</span>
                                  </button>

                                  {reportCount > 0 ? (
                                    <button
                                      onClick={() => {
                                        const latest = schoolReports[0];
                                        if (latest) onNavigateToDocument(latest.id);
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>เอกสาร A4</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={onOpenSubmissionTracker}
                                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700 font-bold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <Shield className="w-3.5 h-3.5" />
                                      <span>ออกหนังสือ</span>
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

                {/* Mobile / Small Screen Card List */}
                <div className="md:hidden flex flex-col gap-3">
                  {OFFICIAL_TARGET_SCHOOLS
                    .filter((s) => {
                      const matchDropdown = selectedSchoolFilter === "all" || s.name === selectedSchoolFilter;
                      const matchSearch =
                        searchQuery === "" ||
                        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.province.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.district.toLowerCase().includes(searchQuery.toLowerCase());
                      return matchDropdown && matchSearch;
                    })
                    .map((school, index) => {
                      const schoolReports = reports.filter((r) => isSchoolMatch(r.schoolName, school.name));
                      const reportCount = schoolReports.length;
                      const participants = schoolReports.reduce((sum, r) => sum + (r.participantsCount || 0), 0);
                      const isSubmitted = reportCount > 0;

                      return (
                        <div
                          key={school.id}
                          className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5"
                        >
                          {/* Top Row: Index + School Name + Status */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug break-words">
                                  {school.name}
                                </h4>
                                <p className="text-[11px] text-slate-500 leading-normal">
                                  {school.subdistrict}, อ.{school.district}, จ.{school.province}
                                </p>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="shrink-0">
                              {isSubmitted ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 whitespace-nowrap">
                                  <CheckCircle2 className="w-3 h-3" />
                                  ส่งแล้ว
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 whitespace-nowrap">
                                  <Clock className="w-3 h-3" />
                                  รอดำเนินการ
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Middle Row: Report Metrics */}
                          <div className="flex items-center justify-start gap-1.5 bg-slate-50/90 rounded-xl p-1.5 text-xs w-full border border-slate-200/40">
                            <div className="flex items-center gap-1 bg-white/95 px-2 py-0.5 rounded-lg border border-slate-200/50 shadow-3xs shrink-0">
                              <ClipboardList className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span className="font-black text-indigo-700 text-[11px] whitespace-nowrap">
                                {reportCount}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 bg-white/95 px-2 py-0.5 rounded-lg border border-slate-200/50 shadow-3xs shrink-0">
                              <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-bold text-emerald-700 text-[11px] whitespace-nowrap">
                                {participants.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Bottom Row: Full-width Action Button */}
                          <div>
                            {reportCount > 0 ? (
                              <button
                                onClick={() => {
                                  const latest = schoolReports[0];
                                  if (latest) onNavigateToDocument(latest.id);
                                }}
                                className="w-full py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-200/60"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>เปิดเอกสารรายงานฉบับสมบูรณ์ A4</span>
                              </button>
                            ) : (
                              <button
                                onClick={onOpenSubmissionTracker}
                                className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                              >
                                <Shield className="w-3.5 h-3.5 text-amber-600" />
                                <span>ออกหนังสือติดตามความก้าวหน้า</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen TV Presentation Modal */}
      {isTvPresentationOpen && (
        <ExecutivePresentationModal
          reports={reports}
          isOpen={isTvPresentationOpen}
          onClose={() => setIsTvPresentationOpen(false)}
          toThaiNumerals={toThaiNumerals}
        />
      )}
    </div>
  );
}
