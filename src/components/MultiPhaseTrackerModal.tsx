import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { ActivityReport, ReportStatus, KOPODOT_GOALS } from "../types";
import { OFFICIAL_TARGET_SCHOOLS } from "../data/schoolsData";
import {
  GitCommit,
  TrendingUp,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
  X,
  Layers,
  ChevronRight,
  FileText,
  AlertTriangle,
  Award,
  BarChart2,
  Edit3,
  Save,
  Check,
  Zap,
  Image as ImageIcon,
  Eye,
  Maximize2,
  Camera,
  ExternalLink
} from "lucide-react";

// Helper function to extract valid image URL from report
function getGoalId(goalCode: string): number {
  const m = goalCode.match(/\d+/);
  if (m) return parseInt(m[0], 10);
  return 1;
}

function getReportImage(report: ActivityReport, periodIndex: number = 0): string {
  if (report.imageUrl && report.imageUrl.trim()) {
    const urls = report.imageUrl.split(",").map(s => s.trim()).filter(Boolean);
    if (urls.length > 0) {
      const url = urls[0];
      const driveMatch = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (driveMatch && driveMatch[1]) {
        return `https://lh3.googleusercontent.com/d/${driveMatch[1]}=w800`;
      }
      return url;
    }
  }
  return "";
}

interface MultiPhaseTrackerModalProps {
  reports: ActivityReport[];
  isOpen: boolean;
  onClose: () => void;
  onSelectReport?: (reportId: string) => void;
  onAddNewPhaseReport?: (newReport: Omit<ActivityReport, "id" | "lastUpdated">) => void;
  initialSchoolName?: string;
  initialActivityName?: string;
  isEmbedded?: boolean;
}

interface ProjectPhaseGroup {
  projectKey: string;
  schoolName: string;
  projectName: string;
  activityName: string;
  goalCode: string;
  phases: {
    periodNumber: number; // 1, 2, 3...
    periodLabel: string; // e.g. "งวดที่ 1/2569"
    report: ActivityReport;
  }[];
}

export const MultiPhaseTrackerModal: React.FC<MultiPhaseTrackerModalProps> = ({
  reports,
  isOpen,
  onClose,
  onSelectReport,
  onAddNewPhaseReport,
  initialSchoolName = "",
  initialActivityName = "",
  isEmbedded = false
}) => {
  const [selectedSchool, setSelectedSchool] = useState<string>(initialSchoolName || "ALL");
  const [searchTerm, setSearchTerm] = useState<string>(initialActivityName || "");
  const [phaseFilter, setPhaseFilter] = useState<"ALL" | "MULTI_PHASE" | "FULL_3_PHASES">("ALL");
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !isEmbedded) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, isEmbedded]);

  // New Phase Add Modal State
  const [isAddingPhase, setIsAddingPhase] = useState<boolean>(false);
  const [targetGroupForNewPhase, setTargetGroupForNewPhase] = useState<ProjectPhaseGroup | null>(null);
  const [nextPeriodNumber, setNextPeriodNumber] = useState<number>(2);

  // New Phase Form fields
  const [newPhaseDate, setNewPhaseDate] = useState<string>("15 สิงหาคม 2569");
  const [newPhaseParticipants, setNewPhaseParticipants] = useState<number>(0);
  const [newPhaseDetails, setNewPhaseDetails] = useState<string>("");
  const [newPhaseQuantOutcome, setNewPhaseQuantOutcome] = useState<string>("");
  const [newPhaseQualOutcome, setNewPhaseQualOutcome] = useState<string>("");
  const [newPhaseProblems, setNewPhaseProblems] = useState<string>("ไม่มีปัญหาอุปสรรคสำคัญ");
  const [newPhaseSuggestions, setNewPhaseSuggestions] = useState<string>("");
  const [newPhaseStatus, setNewPhaseStatus] = useState<ReportStatus>(ReportStatus.COMPLETED);
  const [newPhaseImageUrl, setNewPhaseImageUrl] = useState<string>("");

  // Photo Lightbox State
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    periodLabel?: string;
    schoolName?: string;
    reportId?: string;
  } | null>(null);

  // Group reports by School + Project/Activity Name
  const projectPhaseGroups = useMemo<ProjectPhaseGroup[]>(() => {
    const map = new Map<string, ProjectPhaseGroup>();

    reports.forEach((r) => {
      // Clean activity key
      const normActivity = (r.activityName || r.projectName || "กิจกรรมพัฒนา")
        .replace(/\(งวดที่\s*\d+\)/gi, "")
        .replace(/งวดที่\s*\d+/gi, "")
        .replace(/\(งวด\s*\d+\)/gi, "")
        .replace(/งวด\s*\d+/gi, "")
        .replace(/\(ระยะที่\s*\d+\)/gi, "")
        .replace(/ระยะที่\s*\d+/gi, "")
        .trim();
      const schoolKey = (r.schoolName || "โรงเรียน ตชด.").trim();
      const groupKey = `${schoolKey}::${normActivity}`;

      // Helper to extract period number (e.g., "งวดที่ 1" -> 1, "งวด 2" -> 2)
      let pNum = -1;
      const match = (r.reportingPeriod || "").match(/(?:งวดที่|งวด|ระยะที่|ระยะ|ไตรมาสที่|ไตรมาส|ครั้งที่)\s*(\d+)/i) || 
                    (r.activityName || "").match(/(?:งวดที่|งวด|ระยะที่|ระยะ|ไตรมาสที่|ไตรมาส|ครั้งที่)\s*(\d+)/i);
      if (match) {
        pNum = parseInt(match[1], 10);
      }

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          projectKey: groupKey,
          schoolName: schoolKey,
          projectName: r.projectName || "โครงการตามพระราชดำริ",
          activityName: normActivity,
          goalCode: r.goalCode,
          phases: []
        });
      }

      const existingGroup = map.get(groupKey)!;
      // Prevent exact duplicate phase entries
      if (!existingGroup.phases.some(p => p.report.id === r.id)) {
        existingGroup.phases.push({
          periodNumber: pNum,
          periodLabel: r.reportingPeriod || (pNum > 0 ? `งวดที่ ${pNum}/2569` : ""),
          report: r
        });
      }
    });

    // Sort & re-index phases within each group strictly so phases display sequentially (งวด 1 ➔ งวด 2 ➔ งวด 3 ➔ ...)
    const result = Array.from(map.values()).map(group => {
      // Sort phases chronologically by period number, report date, or ID
      group.phases.sort((a, b) => {
        if (a.periodNumber > 0 && b.periodNumber > 0 && a.periodNumber !== b.periodNumber) {
          return a.periodNumber - b.periodNumber;
        }
        const dateA = a.report.dateString || "";
        const dateB = b.report.dateString || "";
        if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB);
        return (a.report.id || "").localeCompare(b.report.id || "");
      });

      // If period numbers duplicate or are unassigned, assign sequential 1-based period numbers
      const numbers = group.phases.map(p => p.periodNumber);
      const uniquePositiveNumbers = new Set(numbers.filter(n => n > 0));
      const needsSequentialIndexing = uniquePositiveNumbers.size !== group.phases.length;

      group.phases.forEach((p, idx) => {
        if (needsSequentialIndexing) {
          p.periodNumber = idx + 1;
          p.periodLabel = `งวดที่ ${idx + 1}/2569`;
        } else {
          if (!p.periodLabel || p.periodLabel.trim() === "") {
            p.periodLabel = `งวดที่ ${p.periodNumber}/2569`;
          }
        }
      });

      return group;
    });

    return result;
  }, [reports]);

  // Filtered Groups
  const filteredGroups = useMemo(() => {
    return projectPhaseGroups.filter(g => {
      if (selectedSchool !== "ALL" && g.schoolName !== selectedSchool) return false;
      if (phaseFilter === "MULTI_PHASE" && g.phases.length < 2) return false;
      if (phaseFilter === "FULL_3_PHASES" && g.phases.length < 3) return false;
      if (searchTerm.trim().length > 0) {
        const q = searchTerm.toLowerCase().trim();
        return (
          g.activityName.toLowerCase().includes(q) ||
          g.projectName.toLowerCase().includes(q) ||
          g.schoolName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [projectPhaseGroups, selectedSchool, phaseFilter, searchTerm]);

  // Lock body scroll when tracker modal or image preview lightbox is open
  useEffect(() => {
    if (isOpen || previewImage) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, previewImage]);

  // Currently Active Selected Group for detailed timeline view
  const activeGroup = useMemo(() => {
    if (selectedGroupKey) {
      const found = filteredGroups.find(g => g.projectKey === selectedGroupKey);
      if (found) return found;
    }
    return filteredGroups[0] || null;
  }, [filteredGroups, selectedGroupKey]);

  // Open modal to add a new phase to an existing project group
  const handleOpenAddPhaseModal = (group: ProjectPhaseGroup) => {
    const maxPeriod = group.phases.reduce((max, p) => Math.max(max, p.periodNumber), 0);
    const nextP = maxPeriod + 1;
    const lastReport = group.phases[group.phases.length - 1]?.report;

    setTargetGroupForNewPhase(group);
    setNextPeriodNumber(nextP);
    setNewPhaseParticipants(lastReport?.participantsCount || 30);
    setNewPhaseDetails(`ติดตามผลความก้าวหน้าโครงการต่อเนื่องในงวดที่ ${nextP} / 2569...`);
    setNewPhaseQuantOutcome(`ดำเนินการต่อเนื่องสำเร็จตามเป้าหมายงวดที่ ${nextP}`);
    setNewPhaseQualOutcome(lastReport?.qualitativeOutcome || "นักเรียนได้รับการพัฒนาศักยภาพอย่างต่อเนื่อง");
    setNewPhaseProblems("ไม่มีปัญหาอุปสรรคสำคัญ");
    setNewPhaseSuggestions("ควรรักษาระดับการดำเนินงานให้เป็นไปตามแผน");
    setNewPhaseStatus(ReportStatus.COMPLETED);
    setNewPhaseImageUrl(lastReport?.imageUrl || "");
    setIsAddingPhase(true);
  };

  // Submit new phase report
  const handleSaveNewPhase = () => {
    if (!targetGroupForNewPhase) return;
    const baseReport = targetGroupForNewPhase.phases[0]?.report;

    const newReportPayload: Omit<ActivityReport, "id" | "lastUpdated"> = {
      projectName: targetGroupForNewPhase.projectName,
      activityName: `${targetGroupForNewPhase.activityName} (งวดที่ ${nextPeriodNumber})`,
      goalCode: targetGroupForNewPhase.goalCode,
      kpiCode: baseReport?.kpiCode || "KPI-MULTI",
      schoolName: targetGroupForNewPhase.schoolName,
      reportingPeriod: `งวดที่ ${nextPeriodNumber}/2569`,
      dateString: newPhaseDate,
      location: baseReport?.location || targetGroupForNewPhase.schoolName,
      targetGroup: baseReport?.targetGroup || "นักเรียนและครู ตชด.",
      participantsCount: Number(newPhaseParticipants) || 0,
      objectives: baseReport?.objectives || "ติดตามความก้าวหน้าโครงการต่อเนื่อง",
      details: newPhaseDetails,
      quantitativeOutcome: newPhaseQuantOutcome,
      qualitativeOutcome: newPhaseQualOutcome,
      problems: newPhaseProblems,
      suggestions: newPhaseSuggestions,
      reportedBy: baseReport?.reportedBy || "ผู้ดูแลโครงการ ตชด.",
      reportPosition: baseReport?.reportPosition || "ครูใหญ่ / ผู้รับผิดชอบโครงการ",
      approverName: baseReport?.approverName || "ผอ.โรงเรียน ตชด.",
      approverPosition: baseReport?.approverPosition || "ผู้อำนวยการโรงเรียน",
      status: newPhaseStatus,
      imageUrl: newPhaseImageUrl || baseReport?.imageUrl
    };

    if (onAddNewPhaseReport) {
      onAddNewPhaseReport(newReportPayload);
    }

    setIsAddingPhase(false);
    setTargetGroupForNewPhase(null);
  };

  if (!isOpen && !isEmbedded) return null;

  const mainCard = (
    <div className={`bg-white w-full ${isEmbedded ? "max-w-full min-h-[750px]" : "max-w-6xl max-h-[92vh] my-auto shadow-2xl"} rounded-3xl border border-slate-200 flex flex-col overflow-hidden text-xs sm:text-[13px] md:text-[13.5px]`}>
      {/* Top Header (Hidden in embedded view to avoid duplication with UniversalPageBanner) */}
      {!isEmbedded && (
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/50">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-xl shadow-md ring-2 ring-indigo-400/30 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 
                  className="no-h2-override text-[11px] sm:text-xs md:text-sm lg:text-base font-black tracking-tight text-white leading-snug whitespace-nowrap overflow-hidden text-ellipsis"
                  style={{ color: "#ffffff" }}
                  title="ระบบติดตามความก้าวหน้าโครงการต่อเนื่อง (Multi-Phase Tracking)"
                >
                  ระบบติดตามความก้าวหน้าโครงการต่อเนื่อง (Multi-Phase Tracking)
                </h2>
              </div>
              <p 
                className="text-[10px] sm:text-[11px] text-slate-300 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis"
                style={{ color: "#cbd5e1" }}
                title="ติดตามพัฒนาการของกิจกรรมเดิมรายโรงเรียนในงวดที่ 1, 2, 3 ได้อย่างต่อเนื่องและเป็นระบบ"
              >
                ติดตามพัฒนาการของกิจกรรมเดิมรายโรงเรียนในงวดที่ 1, 2, 3 ได้อย่างต่อเนื่องและเป็นระบบ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

        {/* Search & Filter Toolbar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px] sm:text-xs shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหากิจกรรม / โครงการ..."
              className="w-full pl-8.5 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[11px] sm:text-xs"
            />
          </div>

          <div>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="w-full p-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[11px] sm:text-xs"
            >
              <option value="ALL">ทุกโรงเรียน ตชด. ({OFFICIAL_TARGET_SCHOOLS.length} แห่ง)</option>
              {OFFICIAL_TARGET_SCHOOLS.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.province})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value as any)}
              className="w-full p-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[11px] sm:text-xs"
            >
              <option value="ALL">ลำดับ: งวด 1 ➔ งวด 2 ➔ งวด 3 (ทั้งหมด)</option>
              <option value="MULTI_PHASE">เฉพาะกิจกรรม 2 งวดขึ้นไป (งวด 1 ➔ 2)</option>
              <option value="FULL_3_PHASES">เฉพาะกิจกรรมครบ 3 งวด (งวด 1 ➔ 2 ➔ 3)</option>
            </select>
          </div>

          <div className="flex items-center justify-start sm:justify-end font-bold text-slate-600 gap-1.5 text-[11px] sm:text-xs">
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl whitespace-nowrap">
              พบ {filteredGroups.length} กิจกรรมต่อเนื่อง
            </span>
          </div>
        </div>

        {/* Main Split Content Area */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-slate-100/60">
          
          {/* Left Column: List of Multi-Phase Activity Groups */}
          <div className="lg:col-span-5 p-3 sm:p-4 overflow-y-auto space-y-2 max-h-[60vh] lg:max-h-none">
            <h3 className="text-[11px] sm:text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>รายการกิจกรรมที่มีหลายระยะ</span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-normal">คลิกเพื่อดูพัฒนาการ</span>
            </h3>

            {filteredGroups.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                <Layers className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">ไม่พบข้อมูลกิจกรรมต่อเนื่องตามเงื่อนไขที่เลือก</p>
                <p className="text-[11px] text-slate-400">ลองปรับการค้นหา หรือเลือกโรงเรียนอื่น</p>
              </div>
            ) : (
              filteredGroups.map((group) => {
                const isSelected = activeGroup?.projectKey === group.projectKey;
                const phaseCount = group.phases.length;
                const latestPhase = group.phases[group.phases.length - 1];
                const groupThumbUrl = getReportImage(latestPhase.report, group.phases.length - 1);

                return (
                  <div
                    key={group.projectKey}
                    onClick={() => setSelectedGroupKey(group.projectKey)}
                    className={`p-3 rounded-2xl border transition cursor-pointer relative ${
                      isSelected
                        ? "bg-gradient-to-r from-indigo-50 via-blue-50/90 to-indigo-50 text-slate-900 border-indigo-300 shadow-sm ring-2 ring-indigo-500/30"
                        : "bg-white text-slate-800 border-slate-200/90 hover:border-indigo-300 hover:bg-indigo-50/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Activity Photo Thumbnail */}
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200/80 shadow-xs bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                        {groupThumbUrl ? (
                          <img
                            src={groupThumbUrl}
                            alt={group.activityName}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover transition duration-300 hover:scale-110"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Camera className="w-5 h-5 text-slate-400" />
                        )}
                        <span className="absolute bottom-0 right-0 bg-slate-950/80 text-white text-[9px] px-1 font-black rounded-tl-md flex items-center gap-0.5">
                          <Camera className="w-2.5 h-2.5 text-indigo-300" />
                          {phaseCount}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black ${
                            isSelected ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-800"
                          }`}>
                            {group.goalCode}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black ${
                            phaseCount >= 2
                              ? isSelected ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800"
                              : isSelected ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-800"
                          }`}>
                            <GitCommit className="w-2.5 h-2.5" />
                            <span>{phaseCount} งวด</span>
                          </span>
                        </div>

                        <h4 className="text-[11px] sm:text-xs font-black leading-snug line-clamp-1">
                          {group.activityName}
                        </h4>
                        <p className={`text-[10px] sm:text-[11px] flex items-center gap-1 font-bold ${
                          isSelected ? "text-indigo-900 font-extrabold" : "text-slate-500"
                        }`}>
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="line-clamp-1">{group.schoolName}</span>
                        </p>
                      </div>
                    </div>

                    {/* Progress Step Badges */}
                    <div className="mt-2 pt-1.5 border-t border-slate-200/40 flex items-center justify-between gap-1.5 text-[9px] sm:text-[10px] font-bold">
                      <div className="flex items-center gap-1 overflow-x-auto max-w-[82%] py-0.5 scrollbar-thin">
                        {group.phases.map((p, idx) => (
                          <React.Fragment key={p.report.id}>
                            <span className={`px-1.5 py-0.5 rounded-md font-extrabold shrink-0 whitespace-nowrap ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}>
                              งวด {p.periodNumber}
                            </span>
                            {idx < group.phases.length - 1 && (
                              <ChevronRight className={`w-2.5 h-2.5 shrink-0 ${isSelected ? "text-indigo-600" : "text-slate-300"}`} />
                            )}
                          </React.Fragment>
                        ))}
                      </div>

                      <span className={isSelected ? "text-indigo-900 font-extrabold" : "text-slate-400"}>
                        {latestPhase.report.dateString || "ปี 2569"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Detailed Timeline & Evolution View */}
          <div className="lg:col-span-7 p-4 sm:p-6 overflow-y-auto space-y-6 bg-white">
            {activeGroup ? (
              <div className="space-y-6">
                
                {/* Active Group Header Box */}
                <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-50 via-slate-50 to-indigo-50/50 border border-indigo-100 space-y-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-black">
                          {activeGroup.goalCode}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{activeGroup.schoolName}</span>
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                        {activeGroup.activityName}
                      </h3>
                      <p className="text-[11px] text-slate-600 font-medium">
                        โครงการหลัก: {activeGroup.projectName}
                      </p>
                    </div>
                  </div>

                  {/* Summary Comparison Metrics */}
                  <div className="grid grid-cols-3 gap-2 pt-2 text-center border-t border-indigo-100">
                    <div className="p-1.5 bg-white rounded-xl border border-indigo-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">จำนวนงวดที่บันทึก</p>
                      <p className="text-[11px] sm:text-xs font-black text-indigo-900">{activeGroup.phases.length} งวดความก้าวหน้า</p>
                    </div>

                    <div className="p-1.5 bg-white rounded-xl border border-indigo-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">ผู้เข้าร่วมงวดล่าสุด</p>
                      <p className="text-[11px] sm:text-xs font-black text-emerald-900">
                        {activeGroup.phases[activeGroup.phases.length - 1]?.report.participantsCount || 0} คน
                      </p>
                    </div>

                    <div className="p-1.5 bg-white rounded-xl border border-indigo-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">พัฒนาการรวม</p>
                      <p className="text-[11px] sm:text-xs font-black text-indigo-600 flex items-center justify-center gap-0.5">
                        <TrendingUp className="w-3 h-3 text-emerald-600" />
                        <span>เติบโตต่อเนื่อง</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Visual Progression Gallery Banner */}
                <div className="bg-gradient-to-br from-indigo-50/90 via-slate-50 to-blue-50/80 text-slate-900 rounded-2xl p-3 space-y-2.5 border border-indigo-200/90 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-indigo-100 text-indigo-700 rounded-lg">
                        <Camera className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-[11px] sm:text-xs font-black text-slate-900">ภาพกิจกรรมเปรียบเทียบพัฒนาการรายงวด (Visual Development)</h4>
                        <p className="text-[9px] sm:text-[10px] text-slate-600 font-medium">คลิกที่ภาพเพื่อขยายใหญ่และดูรายละเอียดเต็ม</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      {activeGroup.phases.length} งวดกิจกรรม
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {activeGroup.phases.map((phase, pIdx) => {
                      const imgUrl = getReportImage(phase.report, pIdx);
                      return (
                        <div
                          key={phase.report.id}
                          onClick={() => {
                            if (imgUrl) {
                              setPreviewImage({
                                url: imgUrl,
                                title: `${activeGroup.activityName} (${phase.periodLabel})`,
                                periodLabel: phase.periodLabel,
                                schoolName: activeGroup.schoolName,
                                reportId: phase.report.id
                              });
                            }
                          }}
                          className={`group relative rounded-xl overflow-hidden border border-slate-200/90 bg-white h-36 sm:h-44 transition duration-300 shadow-2xs ${
                            imgUrl ? "cursor-pointer hover:border-indigo-400 hover:shadow-md" : "opacity-90"
                          }`}
                        >
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={phase.periodLabel}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                              <Camera className="w-5 h-5 text-slate-400 mb-1" />
                              <span className="text-[10px] text-slate-500 font-medium">ไม่มีภาพแนบในงวดนี้</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent p-2 flex flex-col justify-between pointer-events-none">
                            <span className="self-start px-2 py-0.5 rounded-md bg-indigo-600 text-white font-extrabold text-[9px] shadow-xs">
                              {phase.periodLabel}
                            </span>

                            <div className="space-y-0.5">
                              <p className="text-[11px] font-black text-white line-clamp-1 group-hover:text-amber-300 transition">
                                {phase.report.dateString || "ประจำงวด"}
                              </p>
                              <div className="flex items-center justify-between text-[9px] text-slate-200 font-medium">
                                <span>{phase.report.participantsCount} คน</span>
                                {imgUrl && (
                                  <span className="flex items-center gap-0.5 font-bold text-amber-300 group-hover:underline">
                                    <Maximize2 className="w-2.5 h-2.5" />
                                    <span>ขยาย</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Timeline Step Cards (Phase 1 -> Phase 2 -> Phase 3) */}
                <div className="space-y-3.5">
                  <h4 className="text-[11px] sm:text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ลำดับการพัฒนาการและความก้าวหน้ารายงวด (Phase Progression)</span>
                  </h4>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-indigo-200">
                    {activeGroup.phases.map((phase, idx) => {
                      const rep = phase.report;
                      const prevReport = idx > 0 ? activeGroup.phases[idx - 1].report : null;
                      const participantDelta = prevReport ? rep.participantsCount - prevReport.participantsCount : 0;
                      const phaseImgUrl = getReportImage(rep, idx);

                      return (
                        <div key={rep.id} className="relative group">
                          
                          {/* Timeline Circle Marker */}
                          <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shadow-md ring-4 ring-white">
                            {phase.periodNumber}
                          </div>

                          {/* Phase Card Content */}
                          <div className="bg-slate-50 hover:bg-slate-100/80 rounded-2xl p-3.5 border border-slate-200 space-y-2.5 transition">
                            
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-full bg-indigo-900 text-white text-[10px] sm:text-[11px] font-black">
                                  {phase.periodLabel}
                                </span>
                                <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>{rep.dateString || "ประจำงวดปี 2569"}</span>
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                  rep.status === ReportStatus.COMPLETED ? "bg-emerald-100 text-emerald-900" : "bg-sky-100 text-sky-900"
                                }`}>
                                  {rep.status}
                                </span>

                                {onSelectReport && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSelectReport(rep.id);
                                      onClose();
                                    }}
                                    className="p-1 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 rounded-lg text-[10px] sm:text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                    title="เปิดดูรายงาน A4 ฉบับเต็ม"
                                  >
                                    <FileText className="w-3 h-3" />
                                    <span>ดู A4</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Activity Photo Section for Phase */}
                            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                              {phaseImgUrl ? (
                                <div
                                  onClick={() => setPreviewImage({
                                    url: phaseImgUrl,
                                    title: `${activeGroup.activityName} (${phase.periodLabel})`,
                                    periodLabel: phase.periodLabel,
                                    schoolName: activeGroup.schoolName,
                                    reportId: rep.id
                                  })}
                                  className="relative h-80 sm:h-[400px] md:h-[480px] lg:h-[560px] w-full overflow-hidden group cursor-pointer"
                                >
                                  <img
                                    src={phaseImgUrl}
                                    alt={`ภาพกิจกรรม ${phase.periodLabel}`}
                                    className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                                    <span className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xl border border-indigo-400/40">
                                      <Eye className="w-4 h-4" />
                                      <span>คลิกขยายภาพกิจกรรม</span>
                                    </span>
                                  </div>
                                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold text-white bg-slate-950/70 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/10">
                                    <span className="flex items-center gap-1">
                                      <Camera className="w-3 h-3 text-indigo-300" />
                                      <span>ภาพบรรยากาศการดำเนินงานจริง {phase.periodLabel}</span>
                                    </span>
                                    <span className="text-indigo-200 hover:underline">ขยายเต็มจอ</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="h-32 w-full bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-1.5 p-4 text-center">
                                  <Camera className="w-6 h-6 text-slate-300" />
                                  <span className="text-xs font-semibold text-slate-500">ไม่มีรูปภาพประกอบในรายงานประจำงวดนี้</span>
                                </div>
                              )}
                            </div>

                            {/* Quantitative & Participant Growth Highlight */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] sm:text-xs">
                              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-500 uppercase block">ผู้เข้าร่วมกิจกรรม</span>
                                <p className="font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>{rep.participantsCount} คน</span>
                                  {participantDelta !== 0 && (
                                    <span className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                                      participantDelta > 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                    }`}>
                                      {participantDelta > 0 ? `+${participantDelta}` : participantDelta}
                                    </span>
                                  )}
                                </p>
                              </div>

                              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-500 uppercase block">ผลผลิตเชิงปริมาณ</span>
                                <p className="font-bold text-slate-800 line-clamp-2 mt-0.5 leading-snug">
                                  {rep.quantitativeOutcome || "เป็นไปตามเป้าหมายของงวด"}
                                </p>
                              </div>
                            </div>

                            {/* Details & Qualitative Outcome */}
                            <div className="space-y-1 text-[11px] sm:text-xs text-slate-700">
                              <p className="font-extrabold text-slate-900 flex items-center gap-1">
                                <Zap className="w-3.5 h-3.5 text-indigo-600" />
                                <span>ความก้าวหน้าในงวดนี้:</span>
                              </p>
                              <p className="bg-white p-2.5 rounded-xl border border-slate-200/80 leading-relaxed font-medium">
                                {rep.details}
                              </p>
                            </div>

                            {/* Problems & Fixes if any */}
                            {rep.problems && !rep.problems.includes("ไม่มี") && (
                              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] sm:text-xs space-y-1">
                                <p className="font-extrabold text-amber-900 flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>ปัญหาอุปสรรคและแนวทางแก้ไขในงวดนี้:</span>
                                </p>
                                <p className="text-amber-950 font-medium leading-relaxed">
                                  {rep.problems} {rep.suggestions && `• แนวทางแก้ไข: ${rep.suggestions}`}
                                </p>
                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Layers className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-bold">เลือกกิจกรรมจากฝั่งซ้ายเพื่อดูพัฒนาการต่อเนื่องรายงวด</p>
              </div>
            )}
          </div>
        </div>

        {/* Add New Phase Modal Sub-dialog */}
        {isAddingPhase && targetGroupForNewPhase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-extrabold text-xs">
                  บันทึกงวดถัดไป (+งวดที่ {nextPeriodNumber})
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {targetGroupForNewPhase.activityName}
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  โรงเรียน: {targetGroupForNewPhase.schoolName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingPhase(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-800 block mb-1">ประจำงวด (Period):</label>
                  <input
                    type="text"
                    disabled
                    value={`งวดที่ ${nextPeriodNumber}/2569`}
                    className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-700"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-800 block mb-1">วันที่ดำเนินกิจกรรม:</label>
                  <input
                    type="text"
                    value={newPhaseDate}
                    onChange={(e) => setNewPhaseDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-800 block mb-1">จำนวนผู้เข้าร่วมงวดนี้ (คน):</label>
                <input
                  type="number"
                  value={newPhaseParticipants}
                  onChange={(e) => setNewPhaseParticipants(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-800 block mb-1">รายละเอียดและขั้นตอนความก้าวหน้าในงวดนี้:</label>
                <textarea
                  rows={3}
                  value={newPhaseDetails}
                  onChange={(e) => setNewPhaseDetails(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-800 block mb-1">ผลผลิตเชิงปริมาณงวดนี้:</label>
                  <input
                    type="text"
                    value={newPhaseQuantOutcome}
                    onChange={(e) => setNewPhaseQuantOutcome(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-800 block mb-1">สถานะกิจกรรม:</label>
                  <select
                    value={newPhaseStatus}
                    onChange={(e) => setNewPhaseStatus(e.target.value as ReportStatus)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 text-xs"
                  >
                    <option value={ReportStatus.COMPLETED}>เสร็จสิ้น (Completed)</option>
                    <option value={ReportStatus.IN_PROGRESS}>กำลังดำเนินการ (In Progress)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-800 block mb-1">รูปภาพกิจกรรม (URL รูปภาพ หรือ ลิงก์ Google Drive):</label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/thumbnail?id=... หรือ URL ภาพ"
                  value={newPhaseImageUrl}
                  onChange={(e) => setNewPhaseImageUrl(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 text-xs"
                />
                {newPhaseImageUrl && (
                  <div className="mt-2 relative w-20 h-20 rounded-xl overflow-hidden border border-slate-300 shadow-xs">
                    <img src={newPhaseImageUrl} alt="ตัวอย่าง" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddingPhase(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveNewPhase}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกความก้าวหน้างวดที่ {nextPeriodNumber}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {previewImage && createPortal(
        <div className="fixed inset-0 z-[999999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-1 sm:p-3 md:p-5 animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[96dvh] sm:h-[94dvh] md:h-[90dvh] max-h-[98dvh]">
            
            {/* Lightbox Header */}
            <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-md text-xs font-black">
                  {previewImage.periodLabel || "ภาพกิจกรรม"}
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white line-clamp-1">{previewImage.title}</h3>
                  <p className="text-xs text-slate-400">{previewImage.schoolName}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Lightbox Image Body */}
            <div className="flex-1 p-4 bg-slate-950 flex items-center justify-center overflow-auto min-h-[280px]">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[68vh] w-auto max-w-full object-contain rounded-2xl shadow-xl border border-slate-800"
              />
            </div>

            {/* Lightbox Footer Actions */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <p className="text-slate-400 font-medium">ภาพบันทึกพัฒนาการโครงการตามพระราชดำริ (กพด.)</p>
              
              <div className="flex items-center gap-2">
                {previewImage.reportId && onSelectReport && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectReport(previewImage.reportId!);
                      setPreviewImage(null);
                      onClose();
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <FileText className="w-4 h-4" />
                    <span>เปิดดูรายงาน A4 ฉบับเต็ม</span>
                  </button>
                )}

                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>เปิดลิงก์ภาพต้นฉบับ</span>
                </a>

                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );

  if (isEmbedded) {
    return mainCard;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto no-print-bg">
      {mainCard}
    </div>
  );
};

export default MultiPhaseTrackerModal;
