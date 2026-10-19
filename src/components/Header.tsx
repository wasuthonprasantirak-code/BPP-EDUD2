import { useState, useEffect, useRef } from "react";
import { ROYAL_EMBLEM_IMAGE } from "../data/emblemLogo";
import { isFirebaseEnabled, isFirestoreQuotaExceeded } from "../lib/firebase";
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  FileText, 
  RefreshCw, 
  Compass, 
  TrendingUp, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Download,
  PlusCircle,
  ShieldAlert,
  AlertTriangle,
  Image as ImageIcon,
  Video,
  Wrench,
  ChevronDown,
  X,
  Layers,
  ArrowRightLeft,
  Wifi,
  WifiOff,
  CalendarCheck,
  Sun,
  BookOpen,
  FileCheck,
  HelpCircle,
  Tv,
  School,
  BarChart3,
  Map,
  Trophy,
  ClipboardList,
  Award,
  Zap
} from "lucide-react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onResetData: () => void;
  onAutoFetchData?: () => void;
  onOpenGeminiAssistant?: () => void;
  onOpenSubmissionTracker?: () => void;
  onOpenPhotoGallery?: () => void;
  onOpenExecutiveSummary?: () => void;
  onOpenExecutiveOnePage?: () => void;
  onOpenMultiPhaseTracker?: () => void;
  onOpenBatchExport?: () => void;
  onOpenColumnMapper?: () => void;
  onOpenOfflineModal?: () => void;
  onOpenBannerCustomizer?: (pageKey?: string) => void;
  isOnline?: boolean;
  offlineDraftsCount?: number;
  isSimulatedOffline?: boolean;
  isSyncing: boolean;
  sheetSynced: boolean;
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
}

export default function Header({ 
  activeTab, 
  setActiveTab, 
  onResetData, 
  onAutoFetchData, 
  onOpenGeminiAssistant,
  onOpenSubmissionTracker,
  onOpenPhotoGallery,
  onOpenExecutiveSummary,
  onOpenExecutiveOnePage,
  onOpenMultiPhaseTracker,
  onOpenBatchExport,
  onOpenColumnMapper,
  onOpenOfflineModal,
  onOpenBannerCustomizer,
  isOnline = true,
  offlineDraftsCount = 0,
  isSimulatedOffline = false,
  isSyncing, 
  sheetSynced,
  isSidebarCollapsed,
  setIsSidebarCollapsed: setExternalCollapsed
}: HeaderProps) {
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const width = window.innerWidth;
      // Mobile (<640px) and tablet range (640px - 1279px) default to collapsed sidebar
      const isTabletUA = (/iPad|Android|Tablet/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent)) ||
                         (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && navigator.userAgent.includes("Macintosh"));
      return width < 1280 || isTabletUA;
    }
    return true;
  });

  const isCollapsed = isSidebarCollapsed !== undefined ? isSidebarCollapsed : internalCollapsed;
  const setIsCollapsed = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === "function" ? val(isCollapsed) : val;
    if (setExternalCollapsed) {
      setExternalCollapsed(nextVal);
    } else {
      setInternalCollapsed(nextVal);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("bpp_sidebar_collapsed", String(nextVal));
    }
  };

  const [isToolsOpen, setIsToolsOpen] = useState<boolean>(true);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState<boolean>(false);
  const mobileToolsRef = useRef<HTMLDivElement>(null);

  const [isTurboMode, setIsTurboMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kopodot_turbo_speed") === "true";
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      if (isTurboMode) {
        root.classList.add("turbo-boost");
        localStorage.setItem("kopodot_turbo_speed", "true");
      } else {
        root.classList.remove("turbo-boost");
        localStorage.setItem("kopodot_turbo_speed", "false");
      }
    }
  }, [isTurboMode]);

  // Auto collapse sidebar on tablet screens by default (on mount and only on major screen breakpoint changes)
  useEffect(() => {
    let lastWidth = typeof window !== "undefined" ? window.innerWidth : 1280;

    const checkTabletDevice = () => {
      const width = window.innerWidth;
      // Only check if width changed significantly (prevent iPad address bar scroll triggering resize loop)
      if (Math.abs(width - lastWidth) < 40) return;
      lastWidth = width;

      const isTabletWidth = width >= 640 && width < 1280;
      if (isTabletWidth && !isCollapsed) {
        setIsCollapsed(true);
      }
    };

    window.addEventListener("resize", checkTabletDevice, { passive: true });
    return () => window.removeEventListener("resize", checkTabletDevice);
  }, [isCollapsed]);

  // Close mobile tools dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileToolsRef.current && !mobileToolsRef.current.contains(event.target as Node)) {
        setIsMobileToolsOpen(false);
      }
    };
    if (isMobileToolsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileToolsOpen]);

  const tabs = [
    // 1. บริหาร & ภาพรวมยุทธศาสตร์ (Executive & Strategic Overview)
    { id: "dashboard", label: "แผงควบคุมหลัก", icon: LayoutDashboard, category: "1. บริหาร & ภาพรวมยุทธศาสตร์", priority: "high" },
    { id: "geminiAssistant", label: "ผู้ช่วยอัจฉริยะ AI กพด.๕", icon: Sparkles, category: "1. บริหาร & ภาพรวมยุทธศาสตร์", priority: "high" },
    { id: "predictiveTrends", label: "วิเคราะห์เชิงคาดการณ์ AI (Early Warning)", icon: TrendingUp, category: "1. บริหาร & ภาพรวมยุทธศาสตร์", priority: "high" },
    { id: "executiveStation", label: "สถานีนำเสนอผู้บังคับบัญชา", icon: Tv, category: "1. บริหาร & ภาพรวมยุทธศาสตร์", priority: "high" },
    { id: "thailandMap", label: "แผนที่สารสนเทศ GIS ตชด.", icon: Map, category: "1. บริหาร & ภาพรวมยุทธศาสตร์", priority: "high" },
    { id: "rankingsAndHonor", label: "อันดับความดี & ประกาศเกียรติคุณ", icon: Trophy, category: "1. บริหาร & ภาพรวมยุทธศาสตร์", priority: "high" },

    // 2. จัดการเอกสาร & รายงาน (Reports & Documents)
    { id: "document", label: "เอกสารรายงาน A4", icon: FileText, category: "2. จัดการเอกสาร & รายงาน", priority: "high" },
    { id: "reportsDirectory", label: "แฟ้มรายงานทั้งหมด", icon: ClipboardList, category: "2. จัดการเอกสาร & รายงาน", priority: "high" },
    { id: "periodicAnalysis", label: "วิเคราะห์รายสัปดาห์/เดือน/สะสม", icon: BarChart3, category: "2. จัดการเอกสาร & รายงาน", priority: "high" },
    { id: "report2568", label: "รายงานดำเนินงานปี 2568", icon: FileCheck, category: "2. จัดการเอกสาร & รายงาน", priority: "medium" },

    // 3. กำกับ ติดตาม & ตรวจสอบคุณภาพ (Monitoring & Quality Audit)
    { id: "submissionTracker", label: "ติดตามการส่งรายงาน", icon: ShieldAlert, category: "3. กำกับ ติดตาม & ตรวจสอบคุณภาพ", priority: "high" },
    { id: "multiPhaseTracker", label: "ติดตามกิจกรรมหลายระยะ", icon: Layers, category: "3. กำกับ ติดตาม & ตรวจสอบคุณภาพ", priority: "medium" },
    { id: "problems", label: "ปัญหาและอุปสรรค", icon: AlertTriangle, category: "3. กำกับ ติดตาม & ตรวจสอบคุณภาพ", priority: "medium" },
    { id: "schoolDirectory", label: "ฐานข้อมูล 53 โรงเรียน ตชด.", icon: School, category: "3. กำกับ ติดตาม & ตรวจสอบคุณภาพ", priority: "medium" },

    // 4. สื่อกิจกรรม & คลังมัลติมีเดีย (Media Gallery)
    { id: "photoGallery", label: "คลังภาพกิจกรรม กพด.", icon: ImageIcon, category: "4. สื่อกิจกรรม & คลังมัลติมีเดีย", priority: "low" },
    { id: "videoGallery", label: "คลังวิดีโอกิจกรรม กพด.", icon: Video, category: "4. สื่อกิจกรรม & คลังมัลติมีเดีย", priority: "low" },

    // 5. คู่มือปฏิบัติงาน & แผนงาน (Manuals & Operational Guides)
    { id: "systemUserManual", label: "คู่มือการใช้งานระบบ", icon: HelpCircle, category: "5. คู่มือปฏิบัติงาน & แผนงาน", priority: "low" },
    { id: "calendarGuide", label: "คู่มือและปฏิทินงาน กพด.", icon: CalendarCheck, category: "5. คู่มือปฏิบัติงาน & แผนงาน", priority: "low" },
    { id: "dailyRoutine", label: "คู่มือปฏิบัติกิจวัตรรายวัน", icon: Sun, category: "5. คู่มือปฏิบัติงาน & แผนงาน", priority: "low" },
    { id: "plan5Guide", label: "เอกสาร กพด. ฉบับที่ 5 (PDF)", icon: BookOpen, category: "5. คู่มือปฏิบัติงาน & แผนงาน", priority: "low" },
    { id: "indicators", label: "หลักเกณฑ์และตัวชี้วัด", icon: Compass, category: "5. คู่มือปฏิบัติงาน & แผนงาน", priority: "low" },
  ];

  const SYSTEM_EMBLEM_URL = ROYAL_EMBLEM_IMAGE;
  const activeTabObj = tabs.find((t) => t.id === activeTab);

  return (
    <>
      {/* Tablet & Mobile Scrim / Backdrop: when sidebar is expanded in tablet/mobile mode (screen width < 1280px),
          provide a soft blur backdrop and auto-close when clicking outside */}
      {!isCollapsed && (
        <div
          onClick={() => setIsCollapsed(true)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 xl:hidden no-print transition-opacity duration-300 animate-in fade-in cursor-pointer"
          aria-label="ปิดเมนูแถบข้าง"
        />
      )}

      {/* Tablet Spacer: keeps exactly w-16 layout footprint on tablet screens so the main viewport (Dashboard, charts, cards)
          maintains 100% of its exact width and never distorts or loses proportion when the sidebar expands as an overlay */}
      {!isCollapsed && (
        <div
          className="hidden sm:block xl:hidden w-16 shrink-0 h-screen no-print pointer-events-none"
          aria-hidden="true"
        />
      )}

      <aside className={`
        ${isCollapsed 
          ? "hidden sm:flex sm:w-16 xl:w-16 sm:relative z-40" 
          : "flex w-72 sm:w-72 xl:w-64 fixed sm:absolute xl:relative top-0 left-0 z-50 shadow-2xl xl:shadow-none animate-in slide-in-from-left duration-200"
        } bg-white border-b sm:border-b-0 sm:border-r border-slate-200 flex-col shrink-0 no-print transition-all duration-300 sticky top-0 h-screen sm:h-screen z-40
      `}>
        {/* Sidebar Header / Logo (Locked / Sticky) */}
        <div className={`flex h-14 border-b border-slate-200 flex-row items-center justify-between shrink-0 transition-all duration-300 sticky top-0 z-40 bg-white ${
          isCollapsed ? "px-2 justify-center" : "px-3.5 gap-2.5"
        }`}>
          <button
            onClick={() => {
              setActiveTab("dashboard");
              if (typeof window !== "undefined" && window.innerWidth < 1280) {
                setIsCollapsed(true);
              }
            }}
            className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer hover:opacity-85 transition-opacity focus:outline-none focus:ring-2 focus:ring-indigo-500/20 rounded-xl p-1 flex-1"
            title="กลับสู่หน้าแรก (แผงควบคุมหลัก)"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-50 p-1 border border-slate-200/90 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden transition-all">
              <img 
                src={SYSTEM_EMBLEM_URL} 
                alt="ตราสัญลักษณ์โครงการ กพด." 
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 overflow-hidden flex flex-col justify-center flex-1">
                <h1 className="no-h1-override font-black text-xs leading-snug text-slate-900 tracking-tight truncate" title="รายงานการปฏิบัติกิจกรรม กพด.">
                  รายงานปฏิบัติกิจกรรม กพด.
                </h1>
                <p className="text-[10px] text-amber-600 font-bold tracking-wide truncate shrink-0" title="รร.ตชด. สังกัด บก.ตชด.ภาค 2 (53 โรงเรียน)">
                  รร.ตชด. ภาค 2 (53 รร.)
                </p>
              </div>
            )}
          </button>

          {/* Desktop / Tablet Collapse / Expand Toggle Button - Centered directly on border line */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden sm:flex items-center justify-center w-6 h-6 rounded-lg bg-white text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 shadow-md transition-all cursor-pointer shrink-0 absolute -right-3 top-4 z-50 hover:scale-110 active:scale-95"
            title={isCollapsed ? "ขยายเมนู (Expand Sidebar)" : "ย่อเมนู (Collapse Sidebar)"}
            aria-label={isCollapsed ? "ขยายเมนู" : "ย่อเมนู"}
          >
            {isCollapsed ? <PanelLeftOpen className="w-3.5 h-3.5 text-indigo-600" /> : <PanelLeftClose className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          {/* Smartphone Close Button (when sidebar is open as drawer) */}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="sm:hidden flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-all cursor-pointer active:scale-95 shrink-0"
              title="ปิดเมนูแถบข้าง"
              aria-label="ปิดเมนูแถบข้าง"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>
          )}
        </div>

        {/* Navigation tabs */}
        <nav className={`flex-1 ${isCollapsed ? "px-1.5 py-2.5" : "px-2.5 py-2.5"} flex flex-col justify-start max-w-full overflow-y-auto overflow-x-hidden text-xs space-y-2.5`}>
          {/* Desktop & Tablet Navigation List (Clean Grouped Categories) */}
          <div className={`flex flex-col ${isCollapsed ? "space-y-2" : "space-y-3"} w-full`}>
            {Array.from(new Set(tabs.map((t) => t.category))).map((categoryName, idx) => {
              const categoryTabs = tabs.filter((t) => t.category === categoryName && t.id !== "executiveOnePage");
              const catLevel = idx + 1;

              return (
                <div key={categoryName} className="space-y-0.5">
                  {!isCollapsed && (
                    <div className="pt-2 pb-1 px-2 flex items-center justify-between text-[11px] font-bold text-slate-500 tracking-wide select-none">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            catLevel === 1 
                              ? "bg-indigo-600" 
                              : catLevel === 2 
                              ? "bg-blue-600" 
                              : catLevel === 3 
                              ? "bg-emerald-600" 
                              : catLevel === 4
                              ? "bg-purple-600"
                              : "bg-amber-600"
                          } shrink-0`}
                        />
                        <span className="truncate">{categoryName}</span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0">{categoryTabs.length}</span>
                    </div>
                  )}
                  {categoryTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          if (typeof window !== "undefined" && window.innerWidth < 1280) {
                            setIsCollapsed(true);
                          }
                        }}
                        title={tab.label}
                        className={`relative flex items-center ${
                          isCollapsed ? "w-10 h-10 justify-center p-0 mx-auto" : "w-full justify-between px-2.5 py-1.5 gap-2"
                        } rounded-xl text-xs transition-all font-semibold whitespace-nowrap cursor-pointer group ${
                          isActive
                            ? "bg-indigo-600 text-white font-bold shadow-xs shadow-indigo-600/20"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium"
                        }`}
                      >
                        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2.5 min-w-0"}`}>
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                              isActive ? "text-amber-300" : "text-slate-500 group-hover:text-indigo-600"
                            }`}
                          />
                          {!isCollapsed && <span className="truncate text-xs">{tab.label}</span>}
                        </div>
                        {!isCollapsed && isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Grouped 'บริการและเอกสารภายนอก' (External Tools) Section */}
          <div className="pt-2 my-1 border-t border-slate-200/80 shrink-0">
            {!isCollapsed ? (
              <div className="space-y-1">
                <button
                  onClick={() => setIsToolsOpen(!isToolsOpen)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 tracking-wide cursor-pointer rounded-lg hover:bg-slate-100 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                    <span>เอกสาร & ลิงก์ภายนอก</span>
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isToolsOpen ? "rotate-180" : ""}`} />
                </button>

                {isToolsOpen && (
                  <div className="space-y-0.5 pt-0.5">
                    <a
                      href="https://linktr.ee/BPPSchoolCoachDivision2"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/80 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <School className="w-4 h-4 text-indigo-600 shrink-0 group-hover:scale-105 transition-transform" />
                        <span className="truncate">BPPSchoolDivision2</span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              /* Collapsed Mode External Icons */
              <div className="hidden sm:flex flex-col items-center gap-1.5 py-1">
                <a
                  href="https://linktr.ee/BPPSchoolCoachDivision2"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="BPPSchoolDivision2"
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer hover:scale-105"
                >
                  <School className="w-4.5 h-4.5" />
                </a>
              </div>
            )}
          </div>

          {/* Connection and sync status bottom card */}
          <div className="pt-1 mt-auto shrink-0 pb-1">
            <div className={`bg-slate-50/90 rounded-2xl ${isCollapsed ? "hidden sm:block p-1.5 text-center w-10 mx-auto" : "p-3"} border border-slate-200/90 shadow-2xs`}>
              {isCollapsed ? (
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${sheetSynced ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}
                    title={sheetSynced ? "Google Sheet เชื่อมต่ออยู่" : "ระบบบันทึกข้อมูลในเครื่อง"}
                  />
                  {onAutoFetchData && (
                    <button
                      onClick={onAutoFetchData}
                      disabled={isSyncing}
                      title="ดึงข้อมูลทั้งหมดอัตโนมัติ"
                      className="w-7 h-7 flex items-center justify-center text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 rounded-lg font-bold shadow-xs transition cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                      สถานะระบบ
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      พร้อมใช้งาน
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 text-[11px] mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${sheetSynced ? "bg-emerald-500 animate-pulse" : "bg-amber-500"} shrink-0`} />
                      <span className="text-slate-700 font-medium truncate">
                        {sheetSynced ? "Google Sheet เชื่อมต่อแล้ว" : "โหมดออฟไลน์ / แคชในเครื่อง"}
                      </span>
                    </div>
                    {isFirebaseEnabled && (
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isFirestoreQuotaExceeded ? "bg-amber-500" : "bg-indigo-500 animate-pulse"} shrink-0`} />
                        <span className={`font-medium truncate ${isFirestoreQuotaExceeded ? "text-amber-700" : "text-slate-700"}`}>
                          {isFirestoreQuotaExceeded ? "Firestore แคชความเร็วสูง" : "Cloud Firestore ออนไลน์"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {onAutoFetchData && (
                      <button
                        onClick={onAutoFetchData}
                        disabled={isSyncing}
                        className="w-full flex items-center justify-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 rounded-xl py-1.5 font-bold shadow-xs transition cursor-pointer active:scale-98"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                        <span>{isSyncing ? "กำลังดึงข้อมูล..." : "ดึงข้อมูลอัตโนมัติ"}</span>
                      </button>
                    )}

                    <button
                      onClick={onResetData}
                      className="w-full flex items-center justify-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl py-1 font-semibold transition cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 text-slate-400" />
                      <span>คืนค่าข้อมูลเริ่มต้น</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </nav>
      </aside>

    {/* Mobile Bottom Navigation Bar (Fixed at bottom on smartphone screens) */}
    <div 
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-1 py-1 shadow-lg no-print flex items-center justify-around select-none"
      ref={mobileToolsRef}
    >
      {/* Tab 1: ผู้บังคับบัญชา */}
      <button
        onClick={() => {
          setActiveTab("executiveStation");
          setIsMobileToolsOpen(false);
        }}
        className={`flex items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer touch-manipulation flex-1 ${
          activeTab === "executiveStation"
            ? "text-indigo-600 font-extrabold"
            : "text-slate-500 hover:text-slate-900"
        }`}
        title="สถานีนำเสนอผู้บังคับบัญชา"
      >
        <div className={`p-1.5 rounded-xl transition-all ${activeTab === "executiveStation" ? "bg-indigo-50 text-indigo-600 shadow-3xs scale-105" : "hover:bg-slate-100"}`}>
          <Tv className="w-[19px] h-[19px]" />
        </div>
      </button>

      {/* Tab 2: เอกสาร A4 */}
      <button
        onClick={() => {
          setActiveTab("document");
          setIsMobileToolsOpen(false);
        }}
        className={`flex items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer touch-manipulation flex-1 ${
          activeTab === "document"
            ? "text-indigo-600 font-extrabold"
            : "text-slate-500 hover:text-slate-900"
        }`}
        title="เอกสารรายงาน A4"
      >
        <div className={`p-1.5 rounded-xl transition-all ${activeTab === "document" ? "bg-indigo-50 text-indigo-600 shadow-3xs scale-105" : "hover:bg-slate-100"}`}>
          <FileText className="w-[19px] h-[19px]" />
        </div>
      </button>

      {/* Tab 3: แดชบอร์ด */}
      <button
        onClick={() => {
          setActiveTab("dashboard");
          setIsMobileToolsOpen(false);
        }}
        className={`flex items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer touch-manipulation flex-1 ${
          activeTab === "dashboard"
            ? "text-indigo-600 font-extrabold"
            : "text-slate-500 hover:text-slate-900"
        }`}
        title="แผงควบคุมหลัก"
      >
        <div className={`p-1.5 rounded-xl transition-all ${activeTab === "dashboard" ? "bg-indigo-50 text-indigo-600 shadow-3xs scale-105" : "hover:bg-slate-100"}`}>
          <LayoutDashboard className="w-[19px] h-[19px]" />
        </div>
      </button>

      {/* Tab 4: แผนที่ GIS ตชด. (New added tab) */}
      <button
        onClick={() => {
          setActiveTab("thailandMap");
          setIsMobileToolsOpen(false);
        }}
        className={`flex items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer touch-manipulation flex-1 ${
          activeTab === "thailandMap"
            ? "text-indigo-600 font-extrabold"
            : "text-slate-500 hover:text-slate-900"
        }`}
        title="แผนที่ GIS ตชด."
      >
        <div className={`p-1.5 rounded-xl transition-all ${activeTab === "thailandMap" ? "bg-indigo-50 text-indigo-600 shadow-3xs scale-105" : "hover:bg-slate-100"}`}>
          <Map className="w-[19px] h-[19px]" />
        </div>
      </button>

      {/* Tab 5: อันดับความดี (New added tab) */}
      <button
        onClick={() => {
          setActiveTab("rankingsAndHonor");
          setIsMobileToolsOpen(false);
        }}
        className={`flex items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer touch-manipulation flex-1 ${
          activeTab === "rankingsAndHonor"
            ? "text-indigo-600 font-extrabold"
            : "text-slate-500 hover:text-slate-900"
        }`}
        title="อันดับความดีและเกียรติคุณ"
      >
        <div className={`p-1.5 rounded-xl transition-all ${activeTab === "rankingsAndHonor" ? "bg-indigo-50 text-indigo-600 shadow-3xs scale-105" : "hover:bg-slate-100"}`}>
          <Trophy className="w-[19px] h-[19px]" />
        </div>
      </button>

      {/* Tab 6: ติดตามส่งรายงาน */}
      <button
        onClick={() => {
          setActiveTab("submissionTracker");
          setIsMobileToolsOpen(false);
        }}
        className={`flex items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer touch-manipulation flex-1 ${
          activeTab === "submissionTracker"
            ? "text-indigo-600 font-extrabold"
            : "text-slate-500 hover:text-slate-900"
        }`}
        title="ติดตามส่งรายงาน ตชด."
      >
        <div className={`p-1.5 rounded-xl transition-all ${activeTab === "submissionTracker" ? "bg-indigo-50 text-indigo-600 shadow-3xs scale-105" : "hover:bg-slate-100"}`}>
          <ShieldAlert className="w-[19px] h-[19px]" />
        </div>
      </button>

      {/* Tab 7: เมนูแถบข้างระบบ (Sidebar Trigger) */}
      <button
        onClick={() => {
          setIsMobileToolsOpen(false);
          setIsCollapsed((prev) => !prev);
        }}
        className={`flex items-center justify-center min-h-[44px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer touch-manipulation flex-1 ${
          !isCollapsed
            ? "text-indigo-600 font-extrabold"
            : "text-slate-500 hover:text-slate-900"
        }`}
        title="เปิดเมนูแถบข้าง (Sidebar)"
      >
        <div className={`p-1.5 rounded-xl transition-all ${!isCollapsed ? "bg-indigo-50 text-indigo-600 shadow-3xs scale-105" : "hover:bg-slate-100"}`}>
          <PanelLeftOpen className="w-[19px] h-[19px]" />
        </div>
      </button>

      {/* Mobile Full Tools Popup Drawer (Bottom Sheet) */}
      {isMobileToolsOpen && (
        <div className="fixed inset-x-0 bottom-16 z-50 bg-slate-50 rounded-t-3xl border-t border-slate-200 shadow-2xl p-4 sm:p-5 space-y-4 max-h-[78vh] overflow-y-auto animate-in slide-in-from-bottom-5 duration-200 text-left no-print">
          {/* Header of Drawer */}
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-3xs">
                <Wrench className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight">
                  เมนูและเครื่องมือระบบทั้งหมด
                </span>
                <span className="text-[9px] text-slate-500 font-bold">
                  ตชด.ภาค 2 • ระบบข้อมูลสารสนเทศ กพด.5
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsMobileToolsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/70 transition cursor-pointer"
              title="ปิดเมนู"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* SECTION 1: ส่วนควบคุมพิเศษ & สมาร์ทอินเทล (Smart Intel & Special Controls) */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">
              1. ระบบอัจฉริยะและการซิงค์ (Smart Intel)
            </p>
            <div className="grid grid-cols-1 gap-2">
              {/* Gemini AI Multi-Turn Chatbot Quick Access */}
              <button
                onClick={() => {
                  setActiveTab("geminiAssistant");
                  setIsMobileToolsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer active:scale-95 shadow-2xs ${
                  activeTab === "geminiAssistant"
                    ? "bg-indigo-700 text-white border-indigo-700 ring-2 ring-indigo-400/50"
                    : "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white border-indigo-500"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-extrabold tracking-tight">🤖 ผู้ช่วยอัจฉริยะ AI กพด.๕ (ถาม-ตอบระบบ)</span>
                    <span className="text-[9px] text-indigo-100 font-medium opacity-90">Multi-Turn Gemini 3.5 Flash & 3.1 Pro Chatbot</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/80 shrink-0" />
              </button>

              {/* AI Executive Summary & Audit Quick Access */}
              <button
                onClick={() => {
                  if (onOpenExecutiveOnePage) {
                    onOpenExecutiveOnePage();
                  } else {
                    setActiveTab("executiveOnePage");
                  }
                  setIsMobileToolsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer active:scale-95 shadow-2xs ${
                  activeTab === "executiveOnePage"
                    ? "bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400/50"
                    : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white border-amber-400"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Sparkles className="w-4 h-4 text-amber-200 shrink-0 animate-pulse" />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-extrabold tracking-tight">✨ AI สรุปรายงาน 1 หน้า & ตรวจข้อมูล</span>
                    <span className="text-[9px] text-amber-100 font-medium opacity-90">Executive Summary & Audit Scan</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/80 shrink-0" />
              </button>

              {/* Offline Mode Switcher */}
              {onOpenOfflineModal && (
                <button
                  onClick={() => {
                    onOpenOfflineModal();
                    setIsMobileToolsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-2xs active:scale-95 ${
                    !isOnline || isSimulatedOffline
                      ? "bg-amber-100 text-amber-950 border-amber-300"
                      : offlineDraftsCount > 0
                        ? "bg-indigo-50 text-indigo-950 border-indigo-200"
                        : "bg-white text-slate-800 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {!isOnline || isSimulatedOffline ? (
                      <WifiOff className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                    ) : (
                      <Wifi className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-extrabold text-slate-800">โหมดทำงานออฟไลน์ภาคสนาม</span>
                      <span className="text-[9px] text-slate-500 font-medium">บันทึกข้อมูลแบบไม่มีอินเทอร์เน็ต</span>
                    </div>
                  </div>
                  {offlineDraftsCount > 0 ? (
                    <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">
                      +{offlineDraftsCount} แบบร่าง
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* SECTION 2: คลังเมนูและแฟ้มข้อมูล (Categorized Navigation Grids) */}
          <div className="space-y-4 pt-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">
              2. คลังแฟ้มงานและสารสนเทศ (System Directories)
            </p>
            
            {Array.from(new Set(tabs.map((t) => t.category))).map((categoryName) => {
              const categoryTabs = tabs.filter((t) => t.category === categoryName && t.id !== "executiveOnePage");
              if (categoryTabs.length === 0) return null;

              return (
                <div key={categoryName} className="bg-white border border-slate-200/70 rounded-2xl p-3 space-y-2.5 shadow-3xs">
                  <p className="text-[10.5px] font-black text-indigo-950 tracking-wide border-b border-slate-100 pb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    {categoryName}
                  </p>
                  
                  {/* Grid-cols-2 replaces grid-cols-1 for a much more organized, clean and compact mobile presentation */}
                  <div className="grid grid-cols-2 gap-2">
                    {categoryTabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setIsMobileToolsOpen(false);
                          }}
                          className={`flex flex-col items-start gap-1.5 p-2.5 rounded-xl text-[11px] font-bold transition-all text-left border active:scale-95 ${
                            isActive
                              ? "bg-gradient-to-r from-indigo-700 to-indigo-800 text-white border-indigo-800 shadow-sm font-black ring-1 ring-indigo-400/20"
                              : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-amber-300" : "text-indigo-600"}`} />
                          <span className="leading-snug break-words w-full text-[10.5px] font-bold line-clamp-2" style={{ whiteSpace: "normal" }}>
                            {tab.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SECTION 3: แหล่งข้อมูลภายนอก & บริการอำนวยความสะดวก (External Tools & Utilities) */}
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">
              3. บริการภายนอกและบำรุงรักษาระบบ (External Services & Tools)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* เขียนรายงานใหม่ */}
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSe1I3ZOG8PDvHkKIMEhrHwp3yd1kP0VfwDYWKBBaLuX7B8Jyg/viewform?usp=header"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl text-xs font-extrabold text-blue-700 bg-blue-50 border border-blue-200 shadow-3xs active:scale-97 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <PlusCircle className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-extrabold text-blue-900">เขียนรายงานผ่าน Google Forms</span>
                    <span className="text-[9px] text-blue-500 font-medium">บันทึกผลงานโครงการ กพด.5</span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 opacity-70 shrink-0" />
              </a>

              {/* คลังเอกสารโครงการ */}
              <a
                href="https://www.psproject.org/?p=3074"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 shadow-3xs active:scale-97 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-extrabold text-slate-800">คลังเอกสารโครงการ กพด.</span>
                    <span className="text-[9px] text-slate-500 font-medium">สแกนและสืบค้นเอกสารหลักสูตร</span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0" />
              </a>

              {/* BPPSchoolDivision2 */}
              <a
                href="https://linktr.ee/BPPSchoolCoachDivision2"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 shadow-3xs active:scale-97 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <School className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-extrabold text-indigo-900">BPPSchool Division 2</span>
                    <span className="text-[9px] text-indigo-500 font-medium">ลิงก์ข้อมูลฝ่ายสนับสนุน ตชด.ภาค 2</span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 opacity-70 shrink-0" />
              </a>

              {/* Turbo Mode */}
              <button
                onClick={() => {
                  setIsTurboMode(!isTurboMode);
                  setIsMobileToolsOpen(false);
                  if (!isTurboMode) {
                    alert("⚡ เปิดใช้งานโหมดประมวลผลความเร็วสูง (0ms UI Transitions & Max Speed Enabled)");
                  } else {
                    alert("🐢 กลับสู่โหมดประมวลผลความเร็วปกติ");
                  }
                }}
                className={`flex items-center justify-between p-3 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-3xs active:scale-97 ${
                  isTurboMode
                    ? "bg-amber-500 text-white border-amber-600 animate-pulse"
                    : "bg-white text-slate-800 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Zap className={`w-4 h-4 ${isTurboMode ? "text-yellow-200 animate-bounce" : "text-amber-500"} shrink-0`} />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-extrabold">เร่งสปีดเครื่อง (Turbo Speed Mode)</span>
                    <span className="text-[9px] text-slate-500 font-medium">ลดอนิเมชั่น เพิ่มการเรนเดอร์สูงสุด</span>
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${isTurboMode ? "bg-white text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                  {isTurboMode ? "เปิดอยู่" : "ปิด"}
                </span>
              </button>

              {/* Banner Customizer */}
              {onOpenBannerCustomizer && (
                <button
                  onClick={() => {
                    onOpenBannerCustomizer(activeTab);
                    setIsMobileToolsOpen(false);
                  }}
                  className="flex items-center justify-between p-3 rounded-xl text-xs font-extrabold text-purple-900 bg-purple-50 hover:bg-purple-100/80 border border-purple-200 shadow-3xs active:scale-97 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-extrabold text-purple-900">จัดการแบนเนอร์ประจำหน้า</span>
                      <span className="text-[9px] text-purple-600 font-medium">เปลี่ยนแบนเนอร์เฉพาะหน้าหรือทุกหน้า</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-400 shrink-0" />
                </button>
              )}

              {/* Batch Export */}
              {onOpenBatchExport && (
                <button
                  onClick={() => {
                    onOpenBatchExport();
                    setIsMobileToolsOpen(false);
                  }}
                  className="flex items-center justify-between p-3 rounded-xl text-xs font-extrabold text-slate-800 bg-white border border-slate-200 shadow-3xs active:scale-97 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Download className="w-4 h-4 text-slate-600 shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-extrabold text-slate-800">ส่งออกข้อมูลกลุ่ม (Batch ZIP)</span>
                      <span className="text-[9px] text-slate-500 font-medium">ดาวน์โหลดรายงานทั้งตำบล/กลุ่มโรงเรียน</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              )}

              {/* แจ้งแก้ไข/ลบข้อมูล */}
              <button
                onClick={() => {
                  setActiveTab("dashboard");
                  setIsMobileToolsOpen(false);
                  setTimeout(() => {
                    window.dispatchEvent(new Event("openCorrectionModal"));
                  }, 50);
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black shadow-3xs active:scale-97 transition-all cursor-pointer text-left w-full"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold text-rose-900">แจ้งแก้ไข / ลบรายงาน</span>
                  <span className="text-[9px] text-rose-500 font-medium">ติดต่อผู้ดูแลระบบเพื่อแก้ไขข้อมูล</span>
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 4: บำรุงรักษาฐานข้อมูล (Database Sync & Reset) */}
          <div className="pt-2 border-t border-slate-200/80 space-y-2">
            {onAutoFetchData && (
              <button
                onClick={() => {
                  onAutoFetchData();
                  setIsMobileToolsOpen(false);
                }}
                disabled={isSyncing}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-xl py-2.5 font-extrabold shadow-md transition-all cursor-pointer active:scale-98"
              >
                <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? "animate-spin" : ""}`} />
                <span className="whitespace-nowrap">
                  {isSyncing ? "กำลังเชื่อมข้อมูลฐานคลาวด์..." : "ดึงข้อมูลจาก Google Sheets ใหม่ทันที"}
                </span>
              </button>
            )}

            <button
              onClick={() => {
                if (confirm("คุณแน่ใจหรือไม่ว่าต้องการคืนค่าข้อมูลเริ่มต้น? ข้อมูลที่บันทึกไว้ในเครื่องจะถูกแทนที่ด้วยข้อมูลสุ่มชุดต้นแบบ")) {
                  onResetData();
                  setIsMobileToolsOpen(false);
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-250 rounded-xl py-2 font-bold transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>คืนค่าข้อมูลเริ่มต้นระบบ (Database Hard Reset)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  </>
);
}

