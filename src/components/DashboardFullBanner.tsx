import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  GraduationCap, 
  Layers, 
  QrCode, 
  Maximize2, 
  Image as ImageIcon,
  Clock,
  CheckCircle2,
  Activity,
  Sparkles
} from "lucide-react";
import { ROYAL_EMBLEM_IMAGE } from "../data/emblemLogo";
import defaultDashboardBanner from "../assets/dashboard-banner.jpg";
import { ActivityReport } from "../types";
import { parseSafeDate } from "../lib/safeDateUtils";
import { 
  getBannerForPage, 
  getSafeBannerUrl,
  BUNDLED_DEFAULT_BANNER,
  recordBannerLoadFailure,
  subscribeToBannerChanges, 
  isPageBannerCustomized,
  isAppPublished,
  subscribeToPublishStatus
} from "../lib/bannerStorage";

export interface DashboardFullBannerProps {
  pageKey?: string;
  overviewStats?: {
    totalTargetSchools?: number;
    coveragePercent?: number;
    totalActiveSchools?: number;
    todayReportsCount?: number;
    todaySchoolsCount?: number;
  };
  kpis?: {
    total?: number;
    completed?: number;
  };
  onOpenQrModal?: () => void;
  onOpenCustomizer?: (pageKey: string) => void;
  className?: string;
  reports?: ActivityReport[];
  dailyReportStats?: Array<{
    dateLabel?: string;
    reportsCount?: number;
    schoolsCount?: number;
    percent?: number;
    dateObj?: Date;
    rawDate?: string;
  }>;
  latestUpdateInfo?: {
    dateFormatted?: string;
    elapsedText?: string;
    reportedBy?: string;
    schoolName?: string;
    status?: string;
  };
}

/**
 * Universal robust timestamp parser for reports handling:
 * - DD/MM/YYYY, HH:mm:ss (e.g. 30/6/2026, 19:14:40)
 * - DD/MM/YYYY HH:mm:ss or DD/MM/YYYY
 * - ISO strings (e.g. 2026-06-30T19:14:40)
 * - Thai Buddhist years (>2400)
 * - Thai named months
 */
function parseFullTimestamp(rawInput: any): Date | null {
  if (!rawInput) return null;
  if (rawInput instanceof Date) return isNaN(rawInput.getTime()) ? null : rawInput;
  if (typeof rawInput === "number") {
    const d = new Date(rawInput);
    return isNaN(d.getTime()) ? null : d;
  }
  let str = String(rawInput).trim();
  if (!str || str === "-" || str === "2569" || str === "2026") return null;

  // 1. Match DD/MM/YYYY with optional time
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    if (year > 2400) year -= 543;
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Standard ISO parser
  const cleanIso = str.replace(" ", "T");
  const isoParsed = new Date(cleanIso);
  if (!isNaN(isoParsed.getTime())) {
    if (isoParsed.getFullYear() > 2400) {
      isoParsed.setFullYear(isoParsed.getFullYear() - 543);
    }
    return isoParsed;
  }

  // 3. Fallback to parseSafeDate from safeDateUtils
  const safeDt = parseSafeDate(str);
  if (safeDt && !isNaN(safeDt.getTime())) {
    return safeDt;
  }

  return null;
}

function formatThaiDateTime(dt: Date | null): string {
  if (!dt) return "30 มิ.ย. พ.ศ. 2569 เวลา 19:14 น.";
  const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const d = dt.getDate();
  const m = thaiMonths[dt.getMonth()];
  const y = dt.getFullYear() + 543;
  const h = dt.getHours().toString().padStart(2, "0");
  const min = dt.getMinutes().toString().padStart(2, "0");
  return `${d} ${m} พ.ศ. ${y} เวลา ${h}:${min} น.`;
}

function calculateElapsedText(dt: Date | null): string {
  if (!dt) return "ล่าสุด";
  const now = new Date();
  const diffMs = now.getTime() - dt.getTime();
  if (diffMs > 0) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) {
      if (diffHours > 0) {
        return `วันนี้ (ผ่านมา ${diffHours} ชม. ${diffMins % 60} นาที)`;
      }
      return `วันนี้ (ผ่านมา ${diffMins} นาที)`;
    } else if (diffDays === 1) {
      return "เมื่อวานนี้";
    } else if (diffDays <= 30) {
      return `${diffDays} วันที่ผ่านมา`;
    }
  }
  return "ล่าสุด";
}

export const DashboardFullBanner: React.FC<DashboardFullBannerProps> = ({
  pageKey = "dashboard",
  overviewStats = {
    totalTargetSchools: 53,
    coveragePercent: 100,
    totalActiveSchools: 53,
  },
  kpis = {
    total: 0,
    completed: 0,
  },
  onOpenQrModal,
  onOpenCustomizer,
  className = "",
  reports = [],
  dailyReportStats = [],
  latestUpdateInfo,
}) => {
  const targetPageKey = pageKey || "dashboard";

  // Dynamic page banner with subscription
  const [bannerUrl, setBannerUrl] = useState<string>(() => getBannerForPage(targetPageKey));
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);
  const [isFlashUpdated, setIsFlashUpdated] = useState<boolean>(false);
  const [isPublished, setIsPublished] = useState<boolean>(() => isAppPublished());
  const prevLatestIdRef = useRef<string | null>(null);

  useEffect(() => {
    setIsPublished(isAppPublished());
    const unsubPublish = subscribeToPublishStatus((pub) => {
      setIsPublished(pub);
    });
    return () => unsubPublish();
  }, []);

  useEffect(() => {
    setBannerUrl(getBannerForPage(targetPageKey));
    setImageLoadError(false);

    const unsubscribe = subscribeToBannerChanges((changedKey, newUrl) => {
      if (changedKey === targetPageKey || changedKey === "all") {
        setBannerUrl(newUrl || getBannerForPage(targetPageKey));
        setImageLoadError(false);
      }
    });
    return () => unsubscribe();
  }, [targetPageKey]);

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat("th-TH").format(val || 0);
  };

  // Determine latest report data with accurate chronological timestamp sorting
  const latestReport = useMemo(() => {
    if (!reports || reports.length === 0) return null;
    const validReports = [...reports].filter(r => r && (r.timestamp || r.lastUpdated || r.dateString || r.id));
    if (validReports.length === 0) return reports[0];
    
    return validReports.sort((a, b) => {
      const getMillis = (item: ActivityReport) => {
        const d = parseFullTimestamp(item.lastUpdated || item.timestamp || item.dateString);
        return d ? d.getTime() : 0;
      };
      const diff = getMillis(b) - getMillis(a);
      if (diff !== 0) return diff;
      const numA = parseInt(String(a.id).replace(/[^\d]/g, "")) || 0;
      const numB = parseInt(String(b.id).replace(/[^\d]/g, "")) || 0;
      return numB - numA;
    })[0];
  }, [reports]);

  // Trigger flash update effect whenever component opens (mounts), a new report is added, or data updates
  useEffect(() => {
    setIsFlashUpdated(true);
    const timer = setTimeout(() => setIsFlashUpdated(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (latestReport?.id) {
      if (prevLatestIdRef.current && prevLatestIdRef.current !== latestReport.id) {
        setIsFlashUpdated(true);
        const timer = setTimeout(() => setIsFlashUpdated(false), 3500);
        return () => clearTimeout(timer);
      }
      prevLatestIdRef.current = latestReport.id;
    }
  }, [latestReport?.id, latestReport?.lastUpdated, reports?.length, latestUpdateInfo]);

  // Parsed date object for latest report
  const parsedLatestDate = useMemo(() => {
    const rawDate = latestReport?.lastUpdated || latestReport?.timestamp || latestReport?.dateString;
    return parseFullTimestamp(rawDate);
  }, [latestReport]);

  // Date and Time Text
  const displayTimestamp = useMemo(() => {
    if (latestUpdateInfo?.dateFormatted) return latestUpdateInfo.dateFormatted;
    if (parsedLatestDate) {
      return formatThaiDateTime(parsedLatestDate);
    }
    return "30 มิ.ย. พ.ศ. 2569 เวลา 19:14 น.";
  }, [parsedLatestDate, latestUpdateInfo]);

  // Elapsed Time Text
  const displayElapsed = useMemo(() => {
    if (latestUpdateInfo?.elapsedText) return latestUpdateInfo.elapsedText;
    if (parsedLatestDate) {
      return calculateElapsedText(parsedLatestDate);
    }
    return "ล่าสุด";
  }, [parsedLatestDate, latestUpdateInfo]);

  // Reporter School Name
  const displaySchool = useMemo(() => {
    if (latestUpdateInfo?.schoolName) return latestUpdateInfo.schoolName;
    if (latestReport?.schoolName) return latestReport.schoolName;
    return "รร.ตชด.บ้านโคกแสลง";
  }, [latestReport, latestUpdateInfo]);

  // Status text of the latest report
  const displayStatus = useMemo(() => {
    if (latestUpdateInfo?.status) return latestUpdateInfo.status;
    if (latestReport?.status) return latestReport.status;
    return "เสร็จสิ้น";
  }, [latestReport, latestUpdateInfo]);

  // Reporter Name & Initial
  const displayReporter = useMemo(() => {
    if (latestUpdateInfo?.reportedBy) return latestUpdateInfo.reportedBy;
    if (latestReport?.reportedBy && 
        !latestReport.reportedBy.startsWith("http") &&
        !latestReport.reportedBy.includes("ไม่ระบุ") &&
        latestReport.reportedBy.trim().length > 2) {
      if (latestReport.reportedBy === "ครูผู้รับผิดชอบโครงการ" && latestReport.schoolName) {
        return `ครูผู้รับผิดชอบ (${latestReport.schoolName})`;
      }
      return latestReport.reportedBy;
    }
    return displaySchool ? `ครูผู้รับผิดชอบ (${displaySchool})` : "ครูผู้รับผิดชอบโครงการ";
  }, [latestReport, latestUpdateInfo, displaySchool]);

  const reporterInitial = useMemo(() => {
    const clean = displayReporter.replace(/^(น\.ส\.|นางสาว|นาย|นาง|ด\.ต\.|ร\.ต\.อ\.|พ\.ต\.ท\.|พ\.ต\.ต\.|ส\.ต\.อ\.|ส\.ต\.ท\.|ส\.ต\.ต\.|จ\.ส\.ต\.|ครู)\s*/i, "").trim();
    const match = clean.match(/[\u0E01-\u0E2E]/);
    return match ? match[0] : (clean.charAt(0) || "ค");
  }, [displayReporter]);

  // คำนวณยอดรายงาน และ รร. ที่ส่งแล้ว ประจำวันนี้ (Today's reports & submitted schools / latest date reports)
  const todayReportStats = useMemo(() => {
    // 1. ถ้ามี dailyReportStats ส่งมาจาก Dashboard (ที่มีการคำนวณและเรียงลำดับวันล่าสุดอย่างแม่นยำ)
    if (dailyReportStats && dailyReportStats.length > 0) {
      const latest = dailyReportStats[0];
      return {
        count: latest.reportsCount || 0,
        schoolsCount: latest.schoolsCount || 0,
        percent: latest.percent || 0,
        label: "รายงานล่าสุด วันนี้",
        schoolLabel: "รร.ที่ส่งแล้ว วันนี้",
      };
    }

    if (overviewStats?.todayReportsCount !== undefined && overviewStats?.todaySchoolsCount !== undefined) {
      const totalTarget = overviewStats.totalTargetSchools || 53;
      return {
        count: overviewStats.todayReportsCount,
        schoolsCount: overviewStats.todaySchoolsCount,
        percent: totalTarget > 0 ? Math.round((overviewStats.todaySchoolsCount / totalTarget) * 100) : 0,
        label: "รายงานล่าสุด วันนี้",
        schoolLabel: "รร.ที่ส่งแล้ว วันนี้",
      };
    }

    if (!reports || reports.length === 0) {
      return { 
        count: overviewStats?.todayReportsCount || 0, 
        schoolsCount: 0, 
        percent: 0,
        label: "รายงานล่าสุด วันนี้", 
        schoolLabel: "รร.ที่ส่งแล้ว วันนี้" 
      };
    }

    const now = new Date();
    const nowDay = now.getDate();
    const nowMonth = now.getMonth();
    const nowYear = now.getFullYear();

    // 2. ตรวจสอบรายงานของ "วันนี้" ตามวันเวลาจริง
    const todayReports = reports.filter((r) => {
      const raw = r.lastUpdated || r.timestamp || r.dateString;
      const d = parseFullTimestamp(raw);
      if (!d) return false;
      const yr = d.getFullYear() > 2400 ? d.getFullYear() - 543 : d.getFullYear();
      return d.getDate() === nowDay && d.getMonth() === nowMonth && (yr === nowYear || yr === nowYear + 543);
    });

    const targetCount = overviewStats?.totalTargetSchools || 53;

    if (todayReports.length > 0) {
      const schoolsSet = new Set<string>();
      todayReports.forEach((r) => {
        if (r.schoolName && r.schoolName.trim()) {
          schoolsSet.add(r.schoolName.trim());
        }
      });
      return {
        count: overviewStats?.todayReportsCount !== undefined && overviewStats.todayReportsCount >= 0
          ? overviewStats.todayReportsCount
          : todayReports.length,
        schoolsCount: schoolsSet.size,
        percent: targetCount > 0 ? Math.round((schoolsSet.size / targetCount) * 100) : 0,
        label: "รายงานล่าสุด วันนี้",
        schoolLabel: "รร.ที่ส่งแล้ว วันนี้",
      };
    }

    // 3. หากยังไม่มีรายงานส่งเข้ามาในวันของปฏิทินปัจจุบัน ให้แสดงยอดรายงานของ "วันล่าสุดที่มีการส่งรายงาน"
    const dateCountMap = new Map<string, { count: number; dateObj: Date; schoolsSet: Set<string> }>();
    reports.forEach((r) => {
      const raw = r.lastUpdated || r.timestamp || r.dateString;
      const d = parseFullTimestamp(raw);
      if (d) {
        const yr = d.getFullYear() > 2400 ? d.getFullYear() - 543 : d.getFullYear();
        const key = `${yr}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const prev = dateCountMap.get(key);
        if (prev) {
          prev.count++;
          if (r.schoolName && r.schoolName.trim()) prev.schoolsSet.add(r.schoolName.trim());
        } else {
          const s = new Set<string>();
          if (r.schoolName && r.schoolName.trim()) s.add(r.schoolName.trim());
          dateCountMap.set(key, { count: 1, dateObj: d, schoolsSet: s });
        }
      }
    });

    if (dateCountMap.size > 0) {
      const sorted = Array.from(dateCountMap.values()).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
      const latest = sorted[0];
      return {
        count: overviewStats?.todayReportsCount !== undefined && overviewStats.todayReportsCount >= 0
          ? overviewStats.todayReportsCount
          : latest.count,
        schoolsCount: latest.schoolsSet.size,
        percent: targetCount > 0 ? Math.round((latest.schoolsSet.size / targetCount) * 100) : 0,
        label: "รายงานล่าสุด วันนี้",
        schoolLabel: "รร.ที่ส่งแล้ว วันนี้",
      };
    }

    return {
      count: overviewStats?.todayReportsCount || 0,
      schoolsCount: 0,
      percent: 0,
      label: "รายงานล่าสุด วันนี้",
      schoolLabel: "รร.ที่ส่งแล้ว วันนี้",
    };
  }, [reports, overviewStats?.todayReportsCount, overviewStats?.todaySchoolsCount, overviewStats?.totalTargetSchools, dailyReportStats]);

  return (
    <div className={`w-full space-y-3.5 ${className}`}>

      {/* ========================================================================= */}
      {/* 1. TOP FULL-WIDTH PANORAMIC BANNER CONTAINER (รูปแบบที่ 1) */}
      {/* ========================================================================= */}
      <div 
        id="grand-royal-patronage-full-banner"
        className="group relative w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:shadow-sm transition-all duration-300"
      >
        {/* Royal Prestige Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-purple-600 to-indigo-700 z-20" />

        {/* Floating Customizer Button (ซ่อนอัตโนมัติเมื่ออยู่ในโหมดเผยแพร่เพื่อป้องกันผู้ใช้แก้ไข) */}
        {onOpenCustomizer && !isPublished && (
          <div className="banner-customizer-btn-container absolute top-3.5 right-3.5 z-30 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
            <button
              type="button"
              onClick={() => onOpenCustomizer(targetPageKey)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold backdrop-blur-md shadow-md border border-white/20 transition-all active:scale-95 cursor-pointer"
              title="เปลี่ยนภาพแบนเนอร์"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>เปลี่ยนแบนเนอร์</span>
              {isPageBannerCustomized(targetPageKey) && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </button>
          </div>
        )}

        {/* Image Rendering Area with Graceful Fallback */}
        {!imageLoadError ? (
          <div className="relative w-full aspect-[3/1] bg-slate-50 flex items-center justify-center overflow-hidden">
            <img
              src={getSafeBannerUrl(bannerUrl) || defaultDashboardBanner || "/dashboard-banner.jpg"}
              alt="แบนเนอร์หลักประจำระบบ กพด. ฉบับที่ 5 - แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร ตามพระราชดำริ กองบังคับการตำรวจตระเวนชายแดน ภาค 2"
              title="แบนเนอร์หลักประจำระบบ กพด. ฉบับที่ 5 - แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร ตามพระราชดำริ กองบังคับการตำรวจตระเวนชายแดน ภาค 2"
              className="w-full h-full object-cover object-center block select-none pointer-events-auto transition-transform duration-700 ease-out group-hover:scale-[1.008]"
              loading="eager"
              decoding="async"
              draggable={false}
              referrerPolicy="no-referrer"
              onError={() => {
                if (bannerUrl !== defaultDashboardBanner) {
                  recordBannerLoadFailure(targetPageKey);
                  setBannerUrl(defaultDashboardBanner);
                } else {
                  setImageLoadError(true);
                }
              }}
            />
          </div>
        ) : (
          /* High-Fidelity Vector Graphic Recreation (Fallback before image is loaded) */
          <div 
            className="relative w-full overflow-hidden p-6 sm:p-8 md:p-10 bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/50 min-h-[200px] sm:min-h-[240px] flex flex-col justify-between"
          >
            {/* Ambient Background Curves */}
            <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-purple-200/20 blur-3xl pointer-events-none" />
            <div className="absolute right-1/3 -bottom-10 w-80 h-80 rounded-full bg-amber-100/30 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Left Main Information */}
              <div className="space-y-3 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>โครงการตามพระราชดำริ • กพด. ฉบับที่ 5 (พ.ศ. 2568–2569)</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-purple-950 tracking-tight leading-tight">
                  ระบบรายงานกิจกรรม กพด. ฉบับที่ 5
                </h1>

                <p className="text-sm sm:text-base md:text-lg font-bold text-slate-700 leading-snug">
                  แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร ตามพระราชดำริ
                </p>

                {/* Sub-Jurisdiction & Target Badges */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <div className="flex items-center gap-2 bg-white/90 border border-purple-200/90 rounded-xl px-3 py-1.5 shadow-2xs">
                    <img 
                      src={ROYAL_EMBLEM_IMAGE} 
                      alt="ตรา บก.ตชด.ภาค 2" 
                      className="w-6 h-6 object-contain"
                      referrerPolicy="no-referrer" 
                    />
                    <span className="text-xs sm:text-sm font-extrabold text-purple-950">
                      กองบังคับการตำรวจตระเวนชายแดน ภาค 2
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs sm:text-sm font-bold shadow-2xs">
                    <GraduationCap className="w-4 h-4 text-purple-700" />
                    <span>53 โรงเรียน ตชด.</span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs sm:text-sm font-bold shadow-2xs">
                    <span className="text-amber-500 font-bold">★</span>
                    <span>8 เป้าหมายหลัก</span>
                  </div>
                </div>
              </div>

              {/* Right Visual / Official Badge */}
              <div className="hidden lg:flex flex-col items-center justify-center p-4 bg-white/80 border border-purple-100 rounded-2xl shadow-2xs text-center min-w-[200px]">
                <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mb-2">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <p className="text-xs font-black text-purple-950">แบนเนอร์ทางการ กพด.5</p>
                <p className="text-[11px] text-slate-500 mt-0.5">บก.ตชด.ภาค 2</p>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Latest Update Bottom Bar (แถบการอัปเดตล่าสุดด้านล่างของแบนเนอร์ - อัปเดตทันทีเมื่อมีงานใหม่เข้ามา) */}
        <div 
          id="banner-latest-update-bar"
          className={`w-full bg-[#181d28] border-t border-slate-800/90 px-2 sm:px-2.5 md:px-3.5 py-1 sm:py-1.5 flex items-center justify-between gap-1.5 sm:gap-2 text-white shadow-inner relative z-10 overflow-x-auto no-scrollbar transition-colors duration-700 ${
            isFlashUpdated ? "bg-indigo-950/90 ring-1 ring-indigo-400" : ""
          }`}
        >
          {/* Left: REAL-TIME Pill, Divider, Clock, Latest Update text, Elapsed Pill, School Tag */}
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0 whitespace-nowrap">
            {/* Real-time pulse pill (ป้ายสถานะระบบ Live Sync) */}
            <span 
              id="banner-status-badge-realtime"
              className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full border text-[7.5px] sm:text-[8px] md:text-[8.5px] lg:text-[9.5px] font-black tracking-wide shrink-0 shadow-2xs transition-all duration-300 ${
                isFlashUpdated
                  ? "bg-indigo-900/90 border-indigo-400 text-indigo-200 ring-2 ring-indigo-400/50"
                  : "bg-emerald-950/90 border-emerald-500/50 text-emerald-400"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_5px_rgba(52,211,153,0.9)] ${
                isFlashUpdated ? "bg-indigo-300" : "bg-emerald-400"
              }`} />
              <span>{isFlashUpdated ? "NEW UPDATE" : "REAL-TIME"}</span>
            </span>

            {/* Vertical Divider */}
            <span className="text-slate-600 text-[9px] font-light select-none shrink-0">|</span>

            {/* Clock & Update Time */}
            <div className="flex items-center gap-1 shrink-0">
              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 shrink-0" />
              <span className="text-slate-300 text-[7.5px] sm:text-[8px] md:text-[8.5px] lg:text-[9.5px] font-medium">อัปเดตล่าสุด:</span>
              <span className="text-white text-[7.5px] sm:text-[8px] md:text-[8.5px] lg:text-[9.5px] font-bold font-mono tracking-tight">
                {displayTimestamp}
              </span>
            </div>

            {/* Time Elapsed Pill */}
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[7px] sm:text-[7.5px] md:text-[8px] lg:text-[9px] font-semibold shrink-0 shadow-2xs">
              {displayElapsed}
            </span>

            {/* Latest Reporting School Pill */}
            <div className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/70 text-amber-300 text-[7.5px] sm:text-[8px] md:text-[8.5px] lg:text-[9.5px] font-semibold shrink-0">
              <GraduationCap className="w-2.5 h-2.5 text-amber-400 shrink-0" />
              <span>{displaySchool}</span>
            </div>
          </div>

          {/* Right: Reporter Capsule Avatar & Name */}
          <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700/70 shrink-0 shadow-2xs whitespace-nowrap">
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[7.5px] sm:text-[8px] font-black shadow-xs shrink-0 ring-1 ring-white/20">
              {reporterInitial}
            </div>
            <div className="flex items-center gap-1 text-[7.5px] sm:text-[8px] md:text-[8.5px] lg:text-[9.5px]">
              <span className="text-slate-300 font-medium">ผู้รายงาน:</span>
              <span className="text-white font-bold tracking-tight">{displayReporter}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. EXECUTIVE STATUS & QUICK ACTION BAR (วางอยู่ด้านล่างอย่างลงตัว) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
        {/* Left 8 Cols: Jurisdictional Status & Real-time Coverage (Modern Glass Layer) */}
        <div className="group relative md:col-span-8 flex items-center p-3 sm:p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 hover:border-purple-300/80 shadow-2xs hover:shadow-xs transition-all duration-300 overflow-hidden">
          {/* Subtle Top Ambient Lighting Accent */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-400/40 via-amber-400/40 to-indigo-400/40 pointer-events-none" />
          
          {/* Glass Refraction Ambient Sheen */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-50/25 via-transparent to-indigo-50/20 pointer-events-none rounded-2xl" />

          {/* Metrics - Glass Surface Chips (Fitted responsively across PC, Tablet & Mobile) */}
          <div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-3 w-full">
            <div className="flex flex-col items-center justify-center py-2 px-1.5 sm:px-3 rounded-xl bg-blue-50/80 hover:bg-blue-100/70 border border-blue-200/80 shadow-2xs transition-colors text-center w-full">
              <span className="text-[10px] sm:text-xs font-bold text-blue-700 whitespace-nowrap" title="รร.ที่ส่งแล้วประจำวันนี้">
                {todayReportStats.schoolLabel}
              </span>
              <span className="text-xs sm:text-sm md:text-[25.5px] font-black text-blue-900 mt-0.5 whitespace-nowrap leading-tight">
                {formatNumber(todayReportStats.schoolsCount)} <span className="text-[10px] sm:text-xs md:text-sm font-bold text-blue-600">/ {overviewStats.totalTargetSchools || 53} รร.</span>
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-2 px-1.5 sm:px-3 rounded-xl bg-emerald-50/80 hover:bg-emerald-100/70 border border-emerald-200/80 shadow-2xs transition-colors text-center w-full">
              <span className="text-[10px] sm:text-xs font-bold text-emerald-700 whitespace-nowrap" title="ยอดรายงานล่าสุด ประจำวันนี้">
                {todayReportStats.label}
              </span>
              <span className="text-xs sm:text-sm md:text-[25.5px] font-black text-emerald-700 mt-0.5 whitespace-nowrap leading-tight">
                {formatNumber(todayReportStats.count)} <span className="text-[10px] sm:text-xs md:text-sm font-bold text-emerald-600">รายการ</span>
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-2 px-1.5 sm:px-3 rounded-xl bg-purple-50/80 hover:bg-purple-100/70 border border-purple-200/80 shadow-2xs transition-colors text-center w-full">
              <span className="text-[10px] sm:text-xs font-bold text-purple-700 whitespace-nowrap">บันทึกสะสม</span>
              <span className="text-xs sm:text-sm md:text-[25.5px] font-black text-purple-900 mt-0.5 whitespace-nowrap leading-tight">
                {formatNumber(kpis.total)} <span className="text-[10px] sm:text-xs md:text-sm font-bold text-purple-700">รายการ</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Quick QR Code Action Card for Reporting */}
        <div className="md:col-span-4">
          <button
            type="button"
            onClick={onOpenQrModal}
            className="group w-full flex items-center justify-between gap-3 p-3 rounded-2xl bg-gradient-to-r from-purple-50/90 to-indigo-50/90 hover:from-purple-100 hover:to-indigo-100 border border-purple-200/90 hover:border-purple-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer text-left"
            title="คลิกเพื่อขยายดู QR Code สำหรับสแกนเขียนรายงาน กพด.5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative p-1 bg-white rounded-xl border border-purple-200/80 shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                <img 
                  src="/images/qr-report-form.png" 
                  alt="QR Code สำหรับสแกนเขียนรายงาน"
                  className="w-9 h-9 object-contain rounded" 
                />
                <div className="absolute -bottom-1 -right-1 p-0.5 bg-purple-700 text-white rounded-full shadow-xs">
                  <QrCode className="w-2.5 h-2.5" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-black text-purple-950 truncate">
                  สแกนเขียนรายงาน
                </p>
                <p className="text-[11px] text-slate-600 truncate">
                  Linktree บก.ตชด.ภาค 2
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-purple-700 group-hover:text-purple-900 shrink-0 pl-1">
              <span>ขยาย QR</span>
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};


