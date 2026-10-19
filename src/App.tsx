import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { ActivityReport, ReportStatus } from "./types";
import { safeLocalStorage } from "./lib/storage";
import { OFFICIAL_TARGET_SCHOOLS, isSchoolMatch, getPrincipalBySchoolName } from "./data/schoolsData";
import Header from "./components/Header";
import { isFirebaseEnabled, isFirestoreQuotaExceeded, saveReportToFirestore, syncReportsToFirestore, loadReportsFromFirestore, deleteReportFromFirestore, subscribeToFirestoreReports } from "./lib/firebase";
import { parseSafeDate, parseParticipantCountFromText, extractReportParticipantCount } from "./lib/safeDateUtils";
import { findIndicatorForReport } from "./lib/kopodotGoalsMapping";
import { parseCSV } from "./lib/sheetParser";

// Direct static core components for instant tab navigation and zero-latency switching
import Dashboard from "./components/Dashboard";
import IndicatorsDatabase from "./components/IndicatorsDatabase";
import KpiConsistencyExplorer from "./components/KpiConsistencyExplorer";
import SheetManager from "./components/SheetManager";
import A4Document from "./components/A4Document";
import ProblemsView from "./components/ProblemsView";
import SchoolCalendarGuide from "./components/SchoolCalendarGuide";
import DailyRoutineGuide from "./components/DailyRoutineGuide";
import ChildDevPlan5Guide from "./components/ChildDevPlan5Guide";
import AnnualReport2568View from "./components/AnnualReport2568View";
import SystemUserManual from "./components/SystemUserManual";
import ExecutiveStationView from "./components/ExecutiveStationView";
import SubmissionTrackerModal from "./components/SubmissionTrackerModal";
import SchoolDirectoryModal from "./components/SchoolDirectoryModal";
import ActivityPhotoGalleryModal from "./components/ActivityPhotoGalleryModal";
import ActivityVideoGalleryModal from "./components/ActivityVideoGalleryModal";
import MultiPhaseTrackerModal from "./components/MultiPhaseTrackerModal";
import GISMapCard from "./components/GISMapCard";
import PredictiveTrendsView from "./components/PredictiveTrendsView";
import { UniversalPageBanner } from "./components/UniversalPageBanner";
import { DashboardFullBanner } from "./components/DashboardFullBanner";
import { BannerCustomizerModal } from "./components/BannerCustomizerModal";
import { initBannerSynchronization, isAppPublished, subscribeToPublishStatus } from "./lib/bannerStorage";

// Safe Resilient Lazy Loading with Auto-Retry for heavy export tools and rich modals
function safeLazy<T extends React.ComponentType<any>>(
  importFn: () => Promise<any>,
  namedExport?: string
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const m = await importFn();
      if (namedExport && m[namedExport]) {
        return { default: m[namedExport] };
      }
      return { default: m.default || (namedExport ? m[namedExport] : m[Object.keys(m)[0]]) };
    } catch (err) {
      console.warn("Retrying lazy module import...", err);
      await new Promise((r) => setTimeout(r, 600));
      const m = await importFn();
      if (namedExport && m[namedExport]) {
        return { default: m[namedExport] };
      }
      return { default: m.default || (namedExport ? m[namedExport] : m[Object.keys(m)[0]]) };
    }
  }) as unknown as React.LazyExoticComponent<T>;
}

const BatchExportModal = safeLazy(() => import("./components/BatchExportModal"), "BatchExportModal");
const ExecutiveSummaryModal = safeLazy(() => import("./components/ExecutiveSummaryModal"), "ExecutiveSummaryModal");
const ExecutiveOnePageView = safeLazy(
  () => import("./components/ExecutiveOnePageView").then((m) => ({ default: m.ExecutiveOnePageView })),
  "ExecutiveOnePageView"
);
const ColumnMapperModal = safeLazy(() => import("./components/ColumnMapperModal"), "ColumnMapperModal");
const OfflineSyncModal = safeLazy(() => import("./components/OfflineSyncModal"), "OfflineSyncModal");
const GeminiAssistantModal = safeLazy(() => import("./components/GeminiAssistantModal"), "default");
const ReportForm = safeLazy(() => import("./components/ReportForm"), "default");
const PeriodicAndCumulativeAnalysis = safeLazy(
  () => import("./components/PeriodicAndCumulativeAnalysis").then((m) => ({ default: m.PeriodicAndCumulativeAnalysis })),
  "PeriodicAndCumulativeAnalysis"
);
const RankingsAndHonorView = safeLazy(
  () => import("./components/RankingsAndHonorView").then((m) => ({ default: m.RankingsAndHonorView })),
  "RankingsAndHonorView"
);
const ReportsDirectoryView = safeLazy(
  () => import("./components/ReportsDirectoryView").then((m) => ({ default: m.ReportsDirectoryView })),
  "ReportsDirectoryView"
);

import type { ColumnMappingConfig } from "./components/ColumnMapperModal";
import type { OfflineDraftReport } from "./components/OfflineSyncModal";
import { indexedDbEngine, getReportsFromIndexedDB, saveReportsToIndexedDB, saveSyncMetadata, getSyncMetadata } from "./lib/indexedDbStorage";
import { fetchWithSWR } from "./lib/swrCache";
import { calculateSystemAggregates, persistSystemAggregates } from "./lib/aggregatesEngine";
import { executeBatchAggregateSync } from "./lib/aggregatesBatchPipeline";

import { ROYAL_EMBLEM_IMAGE } from "./data/emblemLogo";
import { ClipboardList, PlusCircle, AlertCircle, FileSpreadsheet, PlayCircle, ExternalLink, Sparkles, ShieldAlert, Image as ImageIcon, Wrench, ChevronDown, Download, X, FileText, Layers, LayoutDashboard, AlertTriangle, FileCheck, Video, HelpCircle, CalendarCheck, Sun, BookOpen, Compass, Map as MapIcon, Tv, ArrowUp, BarChart3, Trophy, QrCode, Loader2, RefreshCw, PanelLeftOpen, Menu, TrendingUp } from "lucide-react";
import { ReportQrCodeModal } from "./components/ReportQrCodeModal";

// Module-level pure helper functions
const sanitizeReports = (items: ActivityReport[]): ActivityReport[] => {
  return items.map((report) => {
    const sn = (report.schoolName || "").trim();
    const match = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(sn, s.name));
    const cleanReportedBy = (report.reportedBy || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s*0[0-9-]{8,12}\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
    return {
      ...report,
      schoolName: match ? match.name : sn,
      reportedBy: cleanReportedBy
    };
  });
};

const sortByLatestFirst = (items: ActivityReport[]): ActivityReport[] => {
  const sanitized = sanitizeReports(items);
  return [...sanitized].sort((a, b) => {
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
};

const parseThaiNumber = (text: string): number => {
  if (!text) return 1;
  const thDigits: Record<string, number> = { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9 };
  for (const char of text) {
    if (thDigits[char] !== undefined) return thDigits[char];
  }
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
};

// parseCSV is imported from ./lib/sheetParser for 100% dynamic mapping and accuracy

// Premium, elegant loading placeholder matching the design system guidelines
const ViewLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-5 animate-fadeIn bg-white rounded-2xl border border-slate-100/80 shadow-2xs">
    <div className="relative w-12 h-12 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border-4 border-slate-100/80"></div>
      <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
      <Loader2 className="w-6 h-6 animate-spin text-indigo-600 relative z-10" />
    </div>
    <div className="text-center space-y-1">
      <h4 className="typo-app-chart-title text-indigo-950 text-sm font-black">กำลังเชื่อมต่อสถาปัตยกรรมโมดูล...</h4>
      <p className="typo-app-subtext text-slate-500 text-xs">ระบบกำลังจัดระเบียบโครงสร้างข้อมูลเชิงสถิติและเตรียมสไตล์ชีทวิชาการ</p>
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("document");
  const [isTabChanging, setIsTabChanging] = useState<boolean>(false);
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>(() => ({ document: true }));
  const [schoolFilter, setSchoolFilter] = useState<string>("");
  const [goalFilter, setGoalFilter] = useState<string>("all");
  const [reports, setReports] = useState<ActivityReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [editingReport, setEditingReport] = useState<ActivityReport | null>(null);
  const [isEditingSchoolLocked, setIsEditingSchoolLocked] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const width = window.innerWidth;
      const isTabletUA = (/iPad|Android|Tablet/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent)) ||
                         (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && navigator.userAgent.includes("Macintosh"));
      return width < 1280 || isTabletUA;
    }
    return true;
  });
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState<boolean>(false);
  const [isSubmissionTrackerOpen, setIsSubmissionTrackerOpen] = useState<boolean>(false);
  const [isPhotoGalleryOpen, setIsPhotoGalleryOpen] = useState<boolean>(false);
  const [isExecutiveSummaryOpen, setIsExecutiveSummaryOpen] = useState<boolean>(false);
  const [isMultiPhaseTrackerOpen, setIsMultiPhaseTrackerOpen] = useState<boolean>(false);
  const [isBatchExportOpen, setIsBatchExportOpen] = useState<boolean>(false);
  const [batchExportOptions, setBatchExportOptions] = useState<{
    initialSelectedIds?: string[];
    initialSchoolFilter?: string;
    initialGoalFilter?: string;
    initialFormat?: "zip-pdf" | "zip-png" | "combined-pdf";
  }>({});

  const handleOpenBatchExport = (options?: {
    initialSelectedIds?: string[];
    initialSchoolFilter?: string;
    initialGoalFilter?: string;
    initialFormat?: "zip-pdf" | "zip-png" | "combined-pdf";
  }) => {
    setBatchExportOptions(options || {});
    setIsBatchExportOpen(true);
  };
  const [isColumnMapperOpen, setIsColumnMapperOpen] = useState<boolean>(false);
  const [isSchoolDirectoryOpen, setIsSchoolDirectoryOpen] = useState<boolean>(false);
  const [targetSchoolForModal, setTargetSchoolForModal] = useState<string>("");
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState<boolean>(false);
  const [isReportQrModalOpen, setIsReportQrModalOpen] = useState<boolean>(false);
  const [isBannerCustomizerOpen, setIsBannerCustomizerOpen] = useState<boolean>(false);
  const [bannerCustomizerPageKey, setBannerCustomizerPageKey] = useState<string>("dashboard");
  const [newReportToast, setNewReportToast] = useState<{ count: number; message: string } | null>(null);

  const handleOpenBannerCustomizer = (pageKey?: string) => {
    setBannerCustomizerPageKey(pageKey || activeTab || "dashboard");
    setIsBannerCustomizerOpen(true);
  };

  const handleOpenSchoolModal = (schoolName: string) => {
    setTargetSchoolForModal(schoolName || "");
    setIsSchoolDirectoryOpen(true);
  };

  // Prevent page background scrolling when floating overlay modals are active
  useEffect(() => {
    const isAnyModalOpen =
      isGeminiModalOpen ||
      isSubmissionTrackerOpen ||
      isExecutiveSummaryOpen ||
      isSchoolDirectoryOpen ||
      isMultiPhaseTrackerOpen ||
      isPhotoGalleryOpen ||
      isBatchExportOpen ||
      isColumnMapperOpen ||
      isOfflineModalOpen ||
      editingReport !== null;

    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [
    isGeminiModalOpen,
    isSubmissionTrackerOpen,
    isExecutiveSummaryOpen,
    isSchoolDirectoryOpen,
    isMultiPhaseTrackerOpen,
    isPhotoGalleryOpen,
    isBatchExportOpen,
    isColumnMapperOpen,
    isOfflineModalOpen,
    editingReport
  ]);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof window !== "undefined" ? navigator.onLine : true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [offlineDrafts, setOfflineDrafts] = useState<OfflineDraftReport[]>(() => {
    const cached = safeLocalStorage.getItem("kopodot_offline_drafts_v1");
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { return []; }
    }
    return [];
  });
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("วันนี้ 20:30 น.");
  
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [sheetSynced, setSheetSynced] = useState<boolean>(false);

  const mainRef = useRef<HTMLElement>(null);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState<boolean>(false);
  const lastScrollPosRef = useRef<number>(0);

  // Track visited tabs and instantly scroll to top on tab changes
  useEffect(() => {
    setIsTabChanging(true);
    setIsHeaderHidden(false);
    lastScrollPosRef.current = 0;
    const timer = setTimeout(() => {
      setIsTabChanging(false);
    }, 400);

    setVisitedTabs(prev => prev[activeTab] ? prev : { ...prev, [activeTab]: true });
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }

    return () => clearTimeout(timer);
  }, [activeTab]);

  // Synchronize Page Banners with Server & Cloud Firestore on load and across sessions
  useEffect(() => {
    const unsubscribe = initBannerSynchronization();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Synchronize Published Mode with document body & html
  const [isPublished, setIsPublished] = useState<boolean>(() => isAppPublished());

  useEffect(() => {
    const updatePublishDom = (published: boolean) => {
      setIsPublished(published);
      document.body.classList.toggle("is-published", published);
      document.documentElement.setAttribute("data-published", String(published));
    };
    updatePublishDom(isAppPublished());
    const unsub = subscribeToPublishStatus(updatePublishDom);
    return () => unsub();
  }, []);

  // Auto-hide Header on Scroll & Show Back-to-Top Button
  useEffect(() => {
    const handleScroll = () => {
      const mainScroll = mainRef.current ? mainRef.current.scrollTop : 0;
      const windowScroll = typeof window !== "undefined" ? window.scrollY : 0;
      const currentScroll = Math.max(mainScroll, windowScroll);

      // Back to top indicator
      if (currentScroll > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }

      // Auto-hide header when scrolling down past top banner threshold
      const delta = currentScroll - lastScrollPosRef.current;
      if (currentScroll <= 15) {
        setIsHeaderHidden(false);
      } else if (delta > 4 && currentScroll > 35) {
        // Scrolling down: Hide header to maximize screen real-estate
        setIsHeaderHidden(true);
      } else if (delta < -8) {
        // Scrolling up: Reveal header
        setIsHeaderHidden(false);
      }

      lastScrollPosRef.current = currentScroll;
    };

    const mainEl = mainRef.current;
    if (mainEl) {
      mainEl.addEventListener("scroll", handleScroll, { passive: true });
    }
    if (typeof window !== "undefined") {
      window.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      if (mainEl) {
        mainEl.removeEventListener("scroll", handleScroll);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  const scrollToTop = () => {
    if (mainRef.current) {
      mainRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
    if (typeof window !== "undefined") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  // Hydrate offline drafts from IndexedDB on startup
  useEffect(() => {
    indexedDbEngine.getAllDrafts().then((dbDrafts) => {
      if (dbDrafts && dbDrafts.length > 0) {
        setOfflineDrafts((prev) => {
          const mergedMap = new Map<string, OfflineDraftReport>();
          prev.forEach((d) => mergedMap.set(d.id, d));
          dbDrafts.forEach((d) => mergedMap.set(d.id, d as OfflineDraftReport));
          return Array.from(mergedMap.values());
        });
      }
    }).catch(() => {});
  }, []);

  // Network connection status listeners & Auto-sync on reconnection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-trigger sync if drafts exist in IndexedDB or LocalStorage
      indexedDbEngine.getAllDrafts().then((drafts) => {
        if (drafts && drafts.length > 0) {
          handleSyncOfflineDraftsNow();
        } else {
          const cached = safeLocalStorage.getItem("kopodot_offline_drafts_v1");
          if (cached) {
            try {
              const parsed: OfflineDraftReport[] = JSON.parse(cached);
              if (parsed.length > 0) {
                handleSyncOfflineDraftsNow();
              }
            } catch (e) {}
          }
        }
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const saveOfflineDraftsToStorage = (drafts: OfflineDraftReport[]) => {
    setOfflineDrafts(drafts);
    safeLocalStorage.setItem("kopodot_offline_drafts_v1", JSON.stringify(drafts));
    // Also persist to IndexedDB
    indexedDbEngine.clearAllDrafts().then(() => {
      drafts.forEach((d) => {
        indexedDbEngine.saveDraft(d as any);
      });
    }).catch(() => {});
  };

  // Helper to sanitize school names and keep all reports intact
  const sanitizeReports = (items: ActivityReport[]): ActivityReport[] => {
    return items.map((report) => {
      const sn = (report.schoolName || "").trim();
      const match = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(sn, s.name));
      const cleanReportedBy = (report.reportedBy || "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s*0[0-9-]{8,12}\s*$/, "")
        .replace(/\s+/g, " ")
        .trim();
      return {
        ...report,
        schoolName: match ? match.name : sn,
        reportedBy: cleanReportedBy
      };
    });
  };

  // Helper to sort reports with latest submitted report first (นับจากวันเวลาที่ส่งจริง latest timestamp descending or REP-XXXX)
  const sortByLatestFirst = (items: ActivityReport[]): ActivityReport[] => {
    const sanitized = sanitizeReports(items);
    return [...sanitized].sort((a, b) => {
      const getMillis = (item: ActivityReport) => {
        const d = parseSafeDate(item.timestamp || item.lastUpdated || (item as any).createdAt || item.dateString);
        return d ? d.getTime() : 0;
      };
      const timeA = getMillis(a);
      const timeB = getMillis(b);
      if (timeA !== timeB) {
        return timeB - timeA;
      }
      const numA = parseInt(String(a.id).replace(/[^\d]/g, "")) || 0;
      const numB = parseInt(String(b.id).replace(/[^\d]/g, "")) || 0;
      return numB - numA;
    });
  };

  // 1. Initial SWR (Stale-While-Revalidate) + IndexedDB + Background Revalidation Load
  useEffect(() => {
    let isMounted = true;

    const loadDataWithSWREngine = async () => {
      const isValidRealDataset = (items: any): items is ActivityReport[] => {
        return Array.isArray(items) && items.length > 0 && items.some(r => r && (r.activityName || r.schoolName));
      };

      // Function to fetch network data (Google Sheets / API Fallback) and merge with Cloud Firestore
      const fetchLatestNetworkData = async (): Promise<ActivityReport[]> => {
        let cachedFirestoreReports: ActivityReport[] = [];

        // 1. Fetch from Firestore (super fast, cached)
        if (isFirebaseEnabled && !isFirestoreQuotaExceeded) {
          try {
            const firestoreReports = await loadReportsFromFirestore();
            if (firestoreReports && firestoreReports.length > 0) {
              cachedFirestoreReports = firestoreReports;
              console.log(`[Firebase Optimizer] Loaded ${cachedFirestoreReports.length} reports from Firestore cache.`);
            }
          } catch (err) {
            console.warn("[Firebase Optimizer] Notice reading Firestore cache:", err);
          }
        }

        // 2. Trigger asynchronous background sync of Google Sheets data without blocking the fast return!
        const runBackgroundGoogleSheetsSync = async () => {
          try {
            console.log("[Firebase Optimizer] Background sync with Google Sheets started...");
            const liveRes = await fetch("/api/fetch-live-sheet");
            let sheetReports: ActivityReport[] = [];
            if (liveRes.ok) {
              const json = await liveRes.json();
              if (json.success && json.csvText) {
                const parsed = parseCSV(json.csvText);
                if (parsed && parsed.length > 0) {
                  sheetReports = parsed;
                }
              }
            } else {
              // Fallback to server archive
              const fullRes = await fetch("/api/real-reports");
              if (fullRes.ok) {
                const fullDataset = await fullRes.json() as ActivityReport[];
                if (isValidRealDataset(fullDataset)) {
                  sheetReports = fullDataset;
                }
              }
            }

            if (sheetReports.length > 0 && isFirebaseEnabled && !isFirestoreQuotaExceeded) {
              // Only sync the 50 most recent reports to keep Firestore cache extremely fast and within free-tier write quotas
              const activeSheetReports = sortByLatestFirst(sheetReports).slice(0, 50);

              // Check if any active sheet reports are missing from Firestore, or need updating
              const existingMap = new Map<string, ActivityReport>();
              cachedFirestoreReports.forEach(r => existingMap.set(r.id, r));

              const reportsToUpload: ActivityReport[] = [];
              activeSheetReports.forEach(sheetRep => {
                const matched = existingMap.get(sheetRep.id);
                // If it is missing from Firestore entirely, upload it as backup/cache
                if (!matched) {
                  reportsToUpload.push(sheetRep);
                }
              });

              if (reportsToUpload.length > 0) {
                console.log(`[Firebase Optimizer] Backing up ${reportsToUpload.length} active reports from Google Sheets to Cloud Firestore.`);
                // Slice to max 50 items per bulk upload to avoid queue exhaustion
                const safeUploadList = reportsToUpload.slice(0, 50);
                await syncReportsToFirestore(safeUploadList);
                
                // Now load the fully synchronized dataset from Firestore to update the client
                const updatedFirestoreReports = await loadReportsFromFirestore();
                if (updatedFirestoreReports && updatedFirestoreReports.length > 0) {
                  const sorted = sortByLatestFirst(updatedFirestoreReports);
                  if (isMounted) {
                    setReports(sorted);
                    setSelectedReportId(prev => (prev && sorted.some(r => r.id === prev)) ? prev : (sorted[0]?.id || ""));
                    console.log("[Firebase Optimizer] UI successfully updated with newly synced Google Sheets data.");
                  }
                }
              } else {
                console.log("[Firebase Optimizer] Google Sheets is fully synchronized with Cloud Firestore. No new backups needed.");
              }
            }
          } catch (syncErr) {
            console.warn("[Firebase Optimizer] Background sync error:", syncErr);
          }
        };

        // Start background synchronization
        runBackgroundGoogleSheetsSync();

        // If we have cached Firestore reports, return them instantly to the client!
        if (cachedFirestoreReports.length > 0) {
          return sortByLatestFirst(cachedFirestoreReports);
        }

        // On first-ever app load when Firestore is completely empty, perform synchronous fallback to ensure we load baseline data
        let networkReports: ActivityReport[] = [];
        try {
          const liveRes = await fetch("/api/fetch-live-sheet");
          if (liveRes.ok) {
            const json = await liveRes.json();
            if (json.success && json.csvText) {
              const parsed = parseCSV(json.csvText);
              if (parsed && parsed.length > 0) {
                networkReports = parsed;
              }
            }
          }
        } catch (e) {
          console.warn("[SWR Fallback] Live sheet error:", e);
        }

        if (networkReports.length === 0) {
          try {
            const fullRes = await fetch("/api/real-reports");
            if (fullRes.ok) {
              const fullDataset = await fullRes.json() as ActivityReport[];
              if (isValidRealDataset(fullDataset)) {
                networkReports = fullDataset;
              }
            }
          } catch (e) {
            console.warn("[SWR Fallback] Server archive error:", e);
          }
        }

        // Pre-warm the Firestore cache with a small subset of Google Sheets baseline (max 30 items)
        if (networkReports.length > 0 && isFirebaseEnabled) {
          const warmUpSubset = sortByLatestFirst(networkReports).slice(0, 30);
          syncReportsToFirestore(warmUpSubset).catch(err => console.warn("[Firebase Pre-warm Error]", err));
        }

        return sortByLatestFirst(networkReports);
      };

      // 1. Check IndexedDB & LocalStorage Cache first for instant 0ms rendering
      try {
        const idbReports = await getReportsFromIndexedDB();
        if (isValidRealDataset(idbReports)) {
          const sorted = sortByLatestFirst(idbReports as ActivityReport[]);
          if (isMounted) {
            setReports(sorted);
            setSelectedReportId(prev => (prev && sorted.some(r => r.id === prev)) ? prev : (sorted[0]?.id || ""));
            setSheetSynced(true);
            const meta = await getSyncMetadata();
            if (meta && meta.lastSyncTimestamp) {
              setLastSyncedTime("อัปเดตแคช (" + new Date(meta.lastSyncTimestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.)");
            }
          }
        } else {
          // Fallback to IndexedDB (LocalStorage cannot store 18MB dataset without quota crash)
          safeLocalStorage.removeItem("kopodot_reports_plan5_v3");
          safeLocalStorage.removeItem("kopodot_reports_plan5");
        }
      } catch (err) {
        console.warn("[SWR] Cache read error:", err);
      }

      // 2. Perform SWR Background Revalidate
      setIsSyncing(true);
      try {
        const swrResult = await fetchWithSWR(
          fetchLatestNetworkData,
          (freshData, timestamp) => {
            if (isMounted && freshData && freshData.length > 0) {
              const sorted = sortByLatestFirst(freshData);
              setReports(sorted);
              setSelectedReportId(prev => (prev && sorted.some(r => r.id === prev)) ? prev : (sorted[0]?.id || ""));
              setSheetSynced(true);
              setLastSyncedTime("อัปเดตล่าสุด (" + new Date(timestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.)");
              safeLocalStorage.setItem("kopodot_reports_count", String(sorted.length));
              safeLocalStorage.setItem("kopodot_sheet_synced", "true");
              indexedDbEngine.cacheReports(sorted).catch(() => {});
            }
          }
        );

        if (isMounted && swrResult.data && swrResult.data.length > 0) {
          const sorted = sortByLatestFirst(swrResult.data);
          setReports(sorted);
          setSelectedReportId(prev => (prev && sorted.some(r => r.id === prev)) ? prev : (sorted[0]?.id || ""));
          setSheetSynced(true);
          if (swrResult.source === "network") {
            setLastSyncedTime("อัปเดตล่าสุด (" + new Date(swrResult.timestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.)");
            safeLocalStorage.setItem("kopodot_reports_count", String(sorted.length));
            safeLocalStorage.setItem("kopodot_sheet_synced", "true");
            indexedDbEngine.cacheReports(sorted).catch(() => {});
          }
        }
      } catch (err) {
        console.warn("[SWR] Revalidation error:", err);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    };

    loadDataWithSWREngine();

    return () => {
      isMounted = false;
    };
  }, []);

  // Pre-calculate system aggregates whenever reports change to guarantee instant 0ms dashboard renders
  useEffect(() => {
    if (reports && reports.length > 0) {
      const aggregates = calculateSystemAggregates(reports);
      persistSystemAggregates(aggregates).catch((err) => {
        console.warn("[App] Error persisting aggregates:", err);
      });
      // Background trigger for periodic batch sync (Monthly/Yearly breakdown documents)
      executeBatchAggregateSync(reports).catch(() => {});
    }
  }, [reports]);

  // Real-Time Firestore Subscription Listener for auto-updates when new reports arrive
  useEffect(() => {
    if (!isFirebaseEnabled || isFirestoreQuotaExceeded) return;

    const unsubscribe = subscribeToFirestoreReports((firestoreReports) => {
      if (!firestoreReports || firestoreReports.length === 0) return;

      setReports((prevReports) => {
        const prevMap = new Map<string, ActivityReport>();
        (prevReports || []).forEach((r) => prevMap.set(r.id, r));

        let addedCount = 0;
        firestoreReports.forEach((fr) => {
          if (!prevMap.has(fr.id)) {
            addedCount++;
          }
          prevMap.set(fr.id, {
            ...(prevMap.get(fr.id) || {}),
            ...fr,
          });
        });

        const updatedList = Array.from(prevMap.values());
        const sorted = sortByLatestFirst(updatedList);

        safeLocalStorage.setItem("kopodot_reports_count", String(sorted.length));
        indexedDbEngine.cacheReports(sorted).catch(() => {});

        if (addedCount > 0 && prevReports.length > 0) {
          setNewReportToast({
            count: addedCount,
            message: `พบรายงานใหม่จากระบบเข้ามา ${addedCount} รายการ — อัปเดตเรียลไทม์อัตโนมัติแล้ว`,
          });
        }

        setLastSyncedTime("เรียลไทม์ (" + new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.)");
        return sorted;
      });
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // Background Polling for Google Sheets (Every 90s) for continuous auto-updates without iPad thrashing
  useEffect(() => {
    const interval = setInterval(async () => {
      // Pause polling when iPad tab or screen is sleeping/hidden to prevent memory & connection churn
      if (typeof document !== "undefined" && document.hidden) return;

      try {
        const liveRes = await fetch("/api/fetch-live-sheet");
        if (!liveRes.ok) return;
        const json = await liveRes.json();
        if (!json.success || !json.csvText) return;

        const parsed = parseCSV(json.csvText);
        if (!parsed || parsed.length === 0) return;

        setReports((prevReports) => {
          if (!prevReports || prevReports.length === 0) return prevReports;

          const prevMap = new Map<string, ActivityReport>();
          prevReports.forEach((r) => prevMap.set(r.id, r));

          let addedCount = 0;
          parsed.forEach((sheetRep) => {
            if (!prevMap.has(sheetRep.id)) {
              addedCount++;
            }
            prevMap.set(sheetRep.id, {
              ...(prevMap.get(sheetRep.id) || {}),
              ...sheetRep,
            });
          });

          if (addedCount === 0) return prevReports;

          const updatedList = Array.from(prevMap.values());
          const sorted = sortByLatestFirst(updatedList);

          safeLocalStorage.setItem("kopodot_reports_count", String(sorted.length));
          indexedDbEngine.cacheReports(sorted).catch(() => {});

          setNewReportToast({
            count: addedCount,
            message: `มีรายงานใหม่เข้ามา ${addedCount} รายการ — อัปเดตอัตโนมัติเรียบร้อยแล้ว`,
          });

          setLastSyncedTime("อัปเดตอัตโนมัติ (" + new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.)");

          if (isFirebaseEnabled && !isFirestoreQuotaExceeded) {
            const newlyDiscovered = sorted.filter(r => !prevReports.some(pr => pr.id === r.id));
            if (newlyDiscovered.length > 0) {
              syncReportsToFirestore(newlyDiscovered.slice(0, 30)).catch(() => {});
            }
          }

          return sorted;
        });
      } catch (e) {
        // silent background poll error
      }
    }, 90000);

    return () => clearInterval(interval);
  }, []);

  // Cross-Tab Synchronization via BroadcastChannel
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel("kopodot_reports_sync_channel");

    channel.onmessage = (event) => {
      if (event.data?.type === "REPORT_UPDATED" && Array.isArray(event.data?.reports)) {
        const sorted = sortByLatestFirst(event.data.reports);
        setReports(sorted);
        setLastSyncedTime("ซิงก์ข้ามแท็บ (" + new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.)");
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  // Auto-dismiss Toast Timer
  useEffect(() => {
    if (newReportToast) {
      const timer = setTimeout(() => {
        setNewReportToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [newReportToast]);

  // 2. Persist State Changes with Broadcast Notification
  const notifyOtherTabs = (updatedList: ActivityReport[]) => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const channel = new BroadcastChannel("kopodot_reports_sync_channel");
        channel.postMessage({ type: "REPORT_UPDATED", reports: updatedList });
        channel.close();
      } catch (e) {}
    }
  };

  const saveReportsToStorage = (updatedReports: ActivityReport[]) => {
    const sorted = sortByLatestFirst(updatedReports);
    setReports(sorted);
    safeLocalStorage.setItem("kopodot_reports_count", String(sorted.length));
    indexedDbEngine.cacheReports(sorted).catch(() => {});
    notifyOtherTabs(sorted);
  };

  // Helper to parse Thai numeral digits ("1", "2", ...)
  const parseThaiNumber = (text: string): number => {
    if (!text) return 1;
    const thDigits: Record<string, number> = { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9 };
    for (const char of text) {
      if (thDigits[char] !== undefined) return thDigits[char];
    }
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : 1;
  };

  // 4. Handle CSV upload from Google Sheet sync
  const handleSyncCSV = (csvText: string) => {
    setIsSyncing(true);
    try {
      const parsed = parseCSV(csvText);
      if (parsed.length > 0) {
        saveReportsToStorage(parsed);
        setSelectedReportId(parsed[0].id);
        setSheetSynced(true);
        safeLocalStorage.setItem("kopodot_sheet_synced", "true");
      } else {
        alert("โครงสร้างไฟล์ CSV ไม่ถูกต้อง หรือไม่มีแถวข้อมูลในตาราง กรุณาลองตรวจสอบใหม่อีกครั้ง");
      }
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถแยกวิเคราะห์ CSV ได้สำเร็จ โปรดตรวจสอบรูปแบบส่วนหัวคอลัมน์");
    } finally {
      setIsSyncing(false);
    }
  };

  // Offline Form Drafting Handlers
  const handleSaveOfflineDraft = (draftReport: ActivityReport) => {
    const timestampStr = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
    const draftId = draftReport.id && !draftReport.id.startsWith("REP-OFFLINE") 
      ? draftReport.id 
      : `REP-OFFLINE-${Date.now().toString().slice(-6)}`;

    const formattedDraft: OfflineDraftReport = {
      ...draftReport,
      id: draftId,
      isOfflineDraft: true,
      offlineCreatedTime: timestampStr,
      lastUpdated: new Date().toISOString()
    };

    // 1. Add to offlineDrafts queue
    const filteredDrafts = offlineDrafts.filter(d => d.id !== formattedDraft.id);
    const updatedDrafts = [formattedDraft, ...filteredDrafts];
    saveOfflineDraftsToStorage(updatedDrafts);

    // 2. Merge into active reports list for instant local preview and offline caching
    const existingIndex = reports.findIndex(r => r.id === formattedDraft.id);
    let updatedReports: ActivityReport[];
    if (existingIndex >= 0) {
      updatedReports = [...reports];
      updatedReports[existingIndex] = formattedDraft;
    } else {
      updatedReports = [formattedDraft, ...reports];
    }
    
    saveReportsToStorage(updatedReports);
    setSelectedReportId(formattedDraft.id);

    // Background Cloud Firestore Save for permanent safety
    if (isFirebaseEnabled) {
      saveReportToFirestore(formattedDraft).catch(err => console.warn("[Firebase Save Draft Error]", err));
    }

    alert(`บันทึกแบบร่างออฟไลน์ภาคสนามเรียบร้อยแล้ว!\nกิจกรรม: ${formattedDraft.activityName}\nโรงเรียน: ${formattedDraft.schoolName}\n\nระบบจะทำการซิงก์ข้อมูลขึ้น Google Sheet อัตโนมัติและบันทึกสู่ Cloud Firestore ทันทีเมื่อมีสัญญาณอินเทอร์เน็ต`);
  };

  const handleDeleteOfflineDraft = (draftId: string) => {
    const updatedDrafts = offlineDrafts.filter(d => d.id !== draftId);
    saveOfflineDraftsToStorage(updatedDrafts);
    if (isFirebaseEnabled) {
      deleteReportFromFirestore(draftId).catch(err => console.warn("[Firebase Delete Draft Error]", err));
    }
  };

  const handleSyncOfflineDraftsNow = async (): Promise<number> => {
    if (offlineDrafts.length === 0) return 0;
    setIsSyncing(true);
    let count = 0;

    try {
      // Simulate/post each draft to live backend storage
      const draftsToSync = [...offlineDrafts];
      let currentReports = [...reports];

      draftsToSync.forEach(draft => {
        const syncedReport: ActivityReport = {
          ...draft,
          status: ReportStatus.COMPLETED
        };
        const idx = currentReports.findIndex(r => r.id === draft.id);
        if (idx >= 0) {
          currentReports[idx] = syncedReport;
        } else {
          currentReports.unshift(syncedReport);
        }
        count++;
      });

      saveReportsToStorage(currentReports);

      // Sync all of these drafts to Firestore as completed reports
      if (isFirebaseEnabled) {
        const firestoreList = draftsToSync.map(draft => ({
          ...draft,
          status: ReportStatus.COMPLETED
        }));
        await syncReportsToFirestore(firestoreList).catch(err => console.warn("[Firebase Sync Drafts Error]", err));
      }

      saveOfflineDraftsToStorage([]); // Clear offline queue after successful sync
      setSheetSynced(true);
      setLastSyncedTime("เมื่อสักครู่ (" + new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.)");

      // Attempt live fetch to merge Google Sheet state
      await handleForceLiveSync();
    } catch (err) {
      console.warn("Offline sync error:", err);
    } finally {
      setIsSyncing(false);
    }

    return count;
  };

  // 5. App-level callbacks
  const handleSelectReport = (id: string) => {
    setSelectedReportId(id);
    setActiveTab("document");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const handleForceLiveSync = async (): Promise<number> => {
    setIsSyncing(true);
    try {
      const liveRes = await fetch("/api/fetch-live-sheet");
      if (liveRes.ok) {
        const json = await liveRes.json();
        if (json.success && json.csvText) {
          const parsed = parseCSV(json.csvText);
          if (parsed && parsed.length > 0) {
            const currentCount = reports.length;
            const sorted = sortByLatestFirst(parsed);
            saveReportsToStorage(sorted);
            setSelectedReportId(sorted[0].id);
            setSheetSynced(true);
            setLastSyncedTime(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.");
            const diff = sorted.length - currentCount;
            return diff > 0 ? diff : 0;
          }
        }
      }
    } catch (err) {
      console.warn("Force sync error:", err);
    } finally {
      setIsSyncing(false);
    }
    return 0;
  };

  const handleEditReport = (report: ActivityReport) => {
    setIsEditingSchoolLocked(false);
    setEditingReport(report);
  };

  const handleUpdateReport = (updatedReport: ActivityReport) => {
    const updatedList = reports.map((r) => (r.id === updatedReport.id ? updatedReport : r));
    saveReportsToStorage(updatedList);
    if (isFirebaseEnabled) {
      saveReportToFirestore(updatedReport).catch((err) => {
        console.warn("[Firebase Save Update Error]", err);
      });
    }
  };

  const handleBookSchoolReport = (schoolName: string) => {
    const targetSchool = OFFICIAL_TARGET_SCHOOLS.find((s) => isSchoolMatch(s.name, schoolName) || s.name === schoolName);
    const principal = getPrincipalBySchoolName(schoolName);
    const defaultLocation = targetSchool 
      ? `โรงเรียน${targetSchool.name} ต.${targetSchool.subdistrict} อ.${targetSchool.district} จ.${targetSchool.province}`
      : schoolName;

    const newReport: ActivityReport = {
      id: `REP-BOOK-${Date.now().toString().slice(-6)}`,
      schoolName: schoolName,
      projectName: "โครงการพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร ตามพระราชดำริฯ",
      activityName: "",
      goalCode: "ด้านที่ 1",
      kpiCode: "",
      reportingPeriod: "ไตรมาส 2/2569",
      dateString: "1 กันยายน 2569",
      location: defaultLocation,
      targetGroup: "นักเรียนและเยาวชนในพื้นที่",
      participantsCount: 50,
      citizensCount: 0,
      objectives: "เพื่อส่งเสริมและพัฒนาศักยภาพของนักเรียนตามวัตถุประสงค์แผน กพด. ฉบับที่ 5",
      details: "ดำเนินการจัดกิจกรรมร่วมกับคณะครู นักเรียน และชุมชนในพื้นที่",
      quantitativeOutcome: "นักเรียนเข้าร่วมกิจกรรมจำนวน 50 คน",
      qualitativeOutcome: "นักเรียนได้รับความรู้ ทักษะ และพัฒนาการตามเกณฑ์มาตรฐาน",
      problems: "ไม่มีปัญหาและอุปสรรคในการดำเนินงาน",
      suggestions: "ควรขยายผลและติดตามการดำเนินงานอย่างต่อเนื่อง",
      reportedBy: "",
      reportPosition: "ครูผู้รับผิดชอบโครงการ",
      approverName: (principal && principal !== "ไม่ระบุชื่อครูใหญ่") ? principal : "ครูใหญ่",
      approverPosition: "ครูใหญ่",
      status: ReportStatus.COMPLETED,
      lastUpdated: new Date().toISOString()
    };

    setIsEditingSchoolLocked(true);
    setEditingReport(newReport);
  };

  const handleDeleteReport = (id: string) => {
    const updated = reports.filter((r) => r.id !== id);
    saveReportsToStorage(updated);
    if (selectedReportId === id && updated.length > 0) {
      setSelectedReportId(updated[0]?.id || "");
    }
    if (isFirebaseEnabled) {
      deleteReportFromFirestore(id).catch(err => console.warn("[Firebase Delete Error]", err));
    }
  };

  const handleSaveForm = (updatedReport: ActivityReport) => {
    const exists = reports.some((r) => r.id === updatedReport.id);
    let updatedList;
    if (exists) {
      updatedList = reports.map((r) => (r.id === updatedReport.id ? updatedReport : r));
    } else {
      updatedList = [updatedReport, ...reports];
    }
    saveReportsToStorage(updatedList);

    if (isFirebaseEnabled) {
      saveReportToFirestore(updatedReport).catch(err => console.warn("[Firebase Save Form Error]", err));
    }

    setEditingReport(null);
    setSelectedReportId(updatedReport.id);
  };

  const handleResetData = async () => {
    if (confirm("คุณแน่ใจว่าต้องการคืนค่าข้อมูลจริงเริ่มต้นใช่หรือไม่? ข้อมูลทั้งหมดจะถูกรีเซ็ตกลับไปที่ฐานข้อมูลหลัก 602 รายการ")) {
      setIsSyncing(true);
      try {
        const res = await fetch("/api/real-reports");
        if (res.ok) {
          const realDataset = await res.json() as ActivityReport[];
          saveReportsToStorage(realDataset);
          if (realDataset.length > 0) {
            setSelectedReportId(realDataset[0].id);
          }
          setSheetSynced(true);
          try {
            localStorage.setItem("kopodot_sheet_synced", "true");
          } catch (storageError) {
            console.warn("Failed to write to localStorage:", storageError);
          }
        } else {
          alert("ไม่สามารถดึงข้อมูลเริ่มต้นได้จากเซิร์ฟเวอร์");
        }
      } catch (err) {
        console.warn("Reset failed", err);
        alert("เกิดข้อผิดพลาดในการดึงข้อมูลเริ่มต้น");
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // 6. Automatic Fetch All Data from Source
  const handleAutoFetchAllData = async () => {
    setIsSyncing(true);
    try {
      // Step 1: Attempt to fetch live CSV directly via server proxy
      const liveRes = await fetch("/api/fetch-live-sheet");
      if (liveRes.ok) {
        const json = await liveRes.json();
        if (json.success && json.csvText) {
          const parsed = parseCSV(json.csvText);
          if (parsed && parsed.length > 0) {
            const sorted = sortByLatestFirst(parsed);
            saveReportsToStorage(sorted);
            setSelectedReportId(sorted[0].id);
            setSheetSynced(true);
            try {
              localStorage.setItem("kopodot_sheet_synced", "true");
            } catch (err) {}
            alert(`ดึงข้อมูลอัตโนมัติจาก Google Sheets สำเร็จเรียบร้อยแล้ว! นำเข้าข้อมูลทั้งหมด ${sorted.length.toLocaleString()} แถวรายการเพื่อประมวลผล`);
            setIsSyncing(false);
            return;
          }
        }
      }

      // Step 2: Fallback to complete pre-parsed dataset from server
      const realRes = await fetch("/api/real-reports");
      if (realRes.ok) {
        const text = await realRes.text();
        let parsed: any = null;
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          console.warn("Failed to parse JSON from /api/real-reports:", e);
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sorted = sortByLatestFirst(parsed);
          saveReportsToStorage(sorted);
          setSelectedReportId(sorted[0].id);
          setSheetSynced(true);
          try {
            localStorage.setItem("kopodot_sheet_synced", "true");
          } catch (err) {}
          alert(`ดึงข้อมูลทั้งหมดจากฐานข้อมูลหลักสำเร็จเรียบร้อยแล้ว! ประมวลผลแฟ้มรายงานทั้งหมด ${sorted.length.toLocaleString()} แถวข้อมูล`);
          setIsSyncing(false);
          return;
        }
      }

      alert("เกิดข้อผิดพลาดในการดึงข้อมูลอัตโนมัติ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
    } catch (err) {
      console.error("Auto fetch failed:", err);
      alert("ไม่สามารถดึงข้อมูลอัตโนมัติได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSyncing(false);
    }
  };

  const selectedReport = reports.find((r) => r.id === selectedReportId) || reports[0] || null;

  const handleAddNewPhaseReport = (newReportData: Omit<ActivityReport, "id" | "lastUpdated">) => {
    const newId = `REP-MP-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const fullReport: ActivityReport = {
      ...newReportData,
      id: newId,
      lastUpdated: nowIso
    };

    const updatedList = [fullReport, ...reports];
    saveReportsToStorage(updatedList);
    setSelectedReportId(newId);

    if (isFirebaseEnabled) {
      saveReportToFirestore(fullReport).catch(err => console.warn("[Firebase Save Phase Error]", err));
    }
  };

  const isFullScreenGallery = activeTab === "photoGallery" || activeTab === "videoGallery";

  return (
    <div className={`h-screen h-[100dvh] max-h-screen max-h-[100dvh] overflow-hidden bg-[#F8FAFC] flex flex-col sm:flex-row font-sans text-slate-800 max-w-full`}>
      {/* Top Header inside main content - Displayed at VERY TOP on Smartphone View */}
      {!isFullScreenGallery && (
        <header className={`flex sm:hidden bg-white/95 backdrop-blur-md border-b border-slate-200 px-2.5 items-center justify-between no-print shrink-0 sticky top-0 z-40 shadow-2xs w-full gap-1.5 transition-all duration-300 ease-in-out ${
          isHeaderHidden
            ? "-translate-y-full opacity-0 pointer-events-none max-h-0 h-0 py-0 overflow-hidden border-b-0"
            : "h-14 max-h-14 opacity-100 translate-y-0"
        }`}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(prev => !prev)}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 flex items-center justify-center shrink-0 border border-slate-200 shadow-3xs active:scale-95 transition-all cursor-pointer"
              title="เปิด/ปิด เมนูแถบข้าง (Sidebar Menu)"
              aria-label="เปิดเมนูแถบข้าง"
            >
              <Menu className="w-4 h-4 text-slate-700" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-3xs flex items-center justify-center shrink-0">
              {activeTab === "executiveStation" && <Tv className="w-4 h-4 text-amber-500" />}
              {activeTab === "predictiveTrends" && <TrendingUp className="w-4 h-4 text-purple-600 animate-pulse" />}
              {activeTab === "periodicAnalysis" && <BarChart3 className="w-4 h-4 text-indigo-600" />}
              {activeTab === "rankingsAndHonor" && <Trophy className="w-4 h-4 text-amber-500" />}
              {activeTab === "document" && <FileText className="w-4 h-4 text-indigo-600" />}
              {activeTab === "dashboard" && <LayoutDashboard className="w-4 h-4 text-indigo-600" />}
              {activeTab === "multiPhaseTracker" && <Layers className="w-4 h-4 text-indigo-600" />}
              {activeTab === "submissionTracker" && <ShieldAlert className="w-4 h-4 text-indigo-600" />}
              {activeTab === "problems" && <AlertTriangle className="w-4 h-4 text-amber-600" />}
              {activeTab === "report2568" && <FileCheck className="w-4 h-4 text-indigo-600" />}
              {activeTab === "geminiAssistant" && <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />}
              {activeTab === "photoGallery" && <ImageIcon className="w-4 h-4 text-indigo-600" />}
              {activeTab === "videoGallery" && <Video className="w-4 h-4 text-indigo-600" />}
              {activeTab === "systemUserManual" && <HelpCircle className="w-4 h-4 text-indigo-600" />}
              {activeTab === "calendarGuide" && <CalendarCheck className="w-4 h-4 text-indigo-600" />}
              {activeTab === "dailyRoutine" && <Sun className="w-4 h-4 text-amber-500" />}
              {activeTab === "plan5Guide" && <BookOpen className="w-4 h-4 text-indigo-600" />}
              {activeTab === "indicators" && <Compass className="w-4 h-4 text-indigo-600" />}
            </div>
            <div className="flex flex-col min-w-0 justify-center flex-1">
              <h2 className="font-black text-slate-900 tracking-tight leading-snug truncate text-[11px]">
                {activeTab === "executiveStation" && "สถานีนำเสนอเชิงยุทธศาสตร์"}
                {activeTab === "predictiveTrends" && "วิเคราะห์เชิงคาดการณ์ AI"}
                {activeTab === "periodicAnalysis" && "ระบบวิเคราะห์รายงานรอบระยะเวลา"}
                {activeTab === "rankingsAndHonor" && "อันดับความดีและเกียรติคุณ"}
                {activeTab === "document" && "แสดงตัวอย่างรายงานขนาด A4"}
                {activeTab === "dashboard" && "แผงควบคุมสถิติหลัก กพด.5"}
                {activeTab === "multiPhaseTracker" && "ระบบติดตามความก้าวหน้าโครงการ"}
                {activeTab === "submissionTracker" && "ระบบติดตามการส่งรายงานรายโรง"}
                {activeTab === "problems" && "ศูนย์ข้อมูลปัญหารายงานแผน กพด.5"}
                {activeTab === "report2568" && "รายงานผลการดำเนินงาน กพด.5 ปี 68"}
                {activeTab === "geminiAssistant" && "ผู้ช่วยอัจฉริยะ AI กพด.5"}
                {activeTab === "photoGallery" && "คลังภาพกิจกรรมตามพระราชดำริฯ"}
                {activeTab === "videoGallery" && "คลังคลิปและสื่อวิดีโอกิจกรรม"}
                {activeTab === "systemUserManual" && "คู่มือขั้นตอนระเบียบวิธีระบบ"}
                {activeTab === "calendarGuide" && "คู่มือปฏิบัติการและปฏิทินงาน"}
                {activeTab === "dailyRoutine" && "คู่มือสุขภาวะและพัฒนาการเด็ก"}
                {activeTab === "plan5Guide" && "เอกสารหลักเกณฑ์แผน กพด.5"}
                {activeTab === "indicators" && "ฐานข้อมูลตัวชี้วัดกิจกรรม กพด.5"}
              </h2>
              <p 
                style={{ fontSize: "8px" }}
                className="font-extrabold text-slate-500 leading-tight truncate text-[8px]"
              >
                ตชด.ภาค 2 • กพด. ฉบับที่ 5
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0 my-auto">
            <button
              type="button"
              onClick={() => setIsReportQrModalOpen(true)}
              className="inline-flex items-center justify-center gap-1 h-8 px-2 rounded-xl text-[10.5px] font-black bg-slate-50 active:scale-95 text-slate-700 hover:text-slate-900 transition-all cursor-pointer border border-slate-200 shadow-3xs shrink-0"
              title="QR Code สำหรับสแกนเขียนรายงาน"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>คิวอาร์ QR</span>
            </button>
 
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSe1I3ZOG8PDvHkKIMEhrHwp3yd1kP0VfwDYWKBBaLuX7B8Jyg/viewform?usp=header"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-xl text-[10.5px] font-black bg-indigo-600 active:scale-95 text-white transition-all cursor-pointer shadow-sm hover:bg-indigo-700 shrink-0"
              title="เขียนรายงานผลงานใหม่ผ่าน Google Forms"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>เขียนรายงาน</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-85 shrink-0" />
            </a>
          </div>
        </header>
      )}

      {/* Navigation Sidebar (Hidden in full-screen Photo & Video galleries) */}
      {!isFullScreenGallery && (
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onResetData={handleResetData}
          onAutoFetchData={handleAutoFetchAllData}
          onOpenGeminiAssistant={() => setActiveTab("geminiAssistant")}
          onOpenSubmissionTracker={() => setActiveTab("submissionTracker")}
          onOpenPhotoGallery={() => setActiveTab("photoGallery")}
          onOpenMultiPhaseTracker={() => setActiveTab("multiPhaseTracker")}
          onOpenExecutiveOnePage={() => setActiveTab("executiveOnePage")}
          onOpenBatchExport={handleOpenBatchExport}
          onOpenColumnMapper={() => setIsColumnMapperOpen(true)}
          onOpenOfflineModal={() => setIsOfflineModalOpen(true)}
          onOpenBannerCustomizer={!isPublished ? handleOpenBannerCustomizer : undefined}
          isOnline={isOnline}
          offlineDraftsCount={offlineDrafts.length}
          isSimulatedOffline={isSimulatedOffline}
          isSyncing={isSyncing}
          sheetSynced={sheetSynced}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
        />
      )}

      {/* Main Area */}
      <div className={`flex-1 min-w-0 min-h-0 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out ${isFullScreenGallery ? "w-full h-screen" : ""}`}>
        
        {/* Top Header inside main content - Displayed on Tablet & Desktop */}
        {!isFullScreenGallery && (
          <header className={`hidden sm:flex bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 items-center justify-between no-print shrink-0 sticky top-0 z-30 shadow-2xs transition-all duration-300 ease-in-out ${
            isHeaderHidden
              ? "-translate-y-full opacity-0 pointer-events-none max-h-0 h-0 py-0 overflow-hidden border-b-0"
              : "h-14 max-h-14 opacity-100 translate-y-0"
          }`}>
            <div className="flex items-center gap-3 min-w-0 mr-4">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200/90 shadow-2xs flex items-center justify-center shrink-0">
                {activeTab === "executiveStation" && <Tv className="w-4 h-4 text-amber-500" />}
                {activeTab === "predictiveTrends" && <TrendingUp className="w-4 h-4 text-purple-600" />}
                {activeTab === "periodicAnalysis" && <BarChart3 className="w-4 h-4 text-indigo-600" />}
                {activeTab === "rankingsAndHonor" && <Trophy className="w-4 h-4 text-amber-500" />}
                {activeTab === "document" && <FileText className="w-4 h-4 text-indigo-600" />}
                {activeTab === "dashboard" && <LayoutDashboard className="w-4 h-4 text-indigo-600" />}
                {activeTab === "thailandMap" && <MapIcon className="w-4 h-4 text-indigo-600" />}
                {activeTab === "multiPhaseTracker" && <Layers className="w-4 h-4 text-indigo-600" />}
                {activeTab === "submissionTracker" && <ShieldAlert className="w-4 h-4 text-indigo-600" />}
                {activeTab === "problems" && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                {activeTab === "report2568" && <FileCheck className="w-4 h-4 text-indigo-600" />}
                {activeTab === "geminiAssistant" && <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />}
                {activeTab === "photoGallery" && <ImageIcon className="w-4 h-4 text-indigo-600" />}
                {activeTab === "videoGallery" && <Video className="w-4 h-4 text-indigo-600" />}
                {activeTab === "systemUserManual" && <HelpCircle className="w-4 h-4 text-indigo-600" />}
                {activeTab === "calendarGuide" && <CalendarCheck className="w-4 h-4 text-indigo-600" />}
                {activeTab === "dailyRoutine" && <Sun className="w-4 h-4 text-amber-500" />}
                {activeTab === "plan5Guide" && <BookOpen className="w-4 h-4 text-indigo-600" />}
                {activeTab === "indicators" && <Compass className="w-4 h-4 text-indigo-600" />}
              </div>
              <div className="flex flex-col min-w-0 justify-center">
                <h2 
                  style={{ fontSize: "14px" }}
                  className="text-[14px] font-black text-slate-900 tracking-tight leading-snug truncate"
                >
                  {activeTab === "executiveStation" && "สถานีนำเสนอและสรุปผลเชิงยุทธศาสตร์สำหรับผู้บังคับบัญชา"}
                  {activeTab === "predictiveTrends" && "ระบบวิเคราะห์เชิงคาดการณ์ (Predictive Trends AI) & เตือนภัยล่วงหน้า"}
                  {activeTab === "periodicAnalysis" && "ระบบวิเคราะห์ข้อมูลรอบระยะเวลา รายสัปดาห์ รายเดือน และรายงานสะสม 53 โรงเรียน"}
                  {activeTab === "rankingsAndHonor" && "อันดับความดีและประกาศเกียรติคุณ"}
                  {activeTab === "document" && "แสดงตัวอย่างรายงานกิจกรรมขนาดเอกสาร A4"}
                  {activeTab === "dashboard" && "แผงควบคุมสถิติหลัก"}
                  {activeTab === "thailandMap" && "แผนที่ภูมิสารสนเทศ (GIS) ติดตามและวิเคราะห์รายงาน 53 โรงเรียน ตชด."}
                  {activeTab === "multiPhaseTracker" && "ระบบติดตามความก้าวหน้าโครงการและกิจกรรมหลายระยะ (งวด 1-3)"}
                  {activeTab === "submissionTracker" && "ระบบติดตามการส่งรายงานรายโรงเรียน และออกหนังสือติดตามงานอัตโนมัติ"}
                  {activeTab === "problems" && "ศูนย์ข้อมูลวิเคราะห์ปัญหาและอุปสรรคการดำเนินงานแผน กพด. ฉบับที่ 5"}
                  {activeTab === "report2568" && "รายงานผลการดำเนินงาน กพด.5 ประจำปีงบประมาณ 2568"}
                  {activeTab === "geminiAssistant" && "ผู้ช่วยอัจฉริยะ AI กพด.5 (Google Gemini)"}
                  {activeTab === "photoGallery" && "คลังภาพและประมวลภาพกิจกรรมโครงการตามพระราชดำริฯ"}
                  {activeTab === "videoGallery" && "คลังคลิปวิดีโอกิจกรรมและสื่อมัลติมีเดีย โครงการตามพระราชดำริฯ กพด."}
                  {activeTab === "systemUserManual" && "คู่มืออธิบายระเบียบและแนวทางขั้นตอนการใช้งานระบบ กพด.5"}
                  {activeTab === "calendarGuide" && "คู่มือปฏิบัติการและปฏิทินงาน กพด. ฉบับที่ 5"}
                  {activeTab === "dailyRoutine" && "คู่มือปฏิบัติกิจวัตรรายวันเพื่อสุขภาวะและพัฒนาการเด็ก"}
                  {activeTab === "plan5Guide" && "เอกสารแผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร ฉบับที่ 5 (พ.ศ. 2560–2569)"}
                  {activeTab === "indicators" && "ฐานข้อมูลหลักเกณฑ์การจัดกิจกรรมและตัวชี้วัดแผน กพด. ฉบับที่ 5"}
                </h2>
                <p 
                  style={{ fontSize: "10px" }}
                  className="text-[10px] font-medium text-slate-500 leading-tight truncate mt-0.5"
                >
                  โรงเรียนตำรวจตระเวนชายแดน สังกัด บก.ตชด.ภาค 2 (53 โรงเรียน)
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0 my-auto">
              {!isPublished && (
                <button
                  type="button"
                  id="header-change-banner-btn"
                  onClick={() => handleOpenBannerCustomizer(activeTab)}
                  className="header-banner-customizer-btn inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 transition cursor-pointer border border-purple-200/80 shrink-0 whitespace-nowrap active:scale-95 shadow-2xs"
                  title="เปลี่ยนหรือกำหนดภาพแบนเนอร์ของหน้านี้"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="whitespace-nowrap hidden lg:inline">เปลี่ยนแบนเนอร์</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsReportQrModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer border border-indigo-200/80 shrink-0 whitespace-nowrap active:scale-95 shadow-2xs"
                title="เปิดดู QR Code สำหรับสแกนเขียนรายงาน"
              >
                <QrCode className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="whitespace-nowrap hidden md:inline">QR รายงาน</span>
              </button>

              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSe1I3ZOG8PDvHkKIMEhrHwp3yd1kP0VfwDYWKBBaLuX7B8Jyg/viewform?usp=header"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer shadow-2xs shrink-0 whitespace-nowrap active:scale-95"
                title="เขียนรายงานผลงานใหม่ผ่าน Google Forms"
              >
                <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">เขียนรายงานใหม่</span>
                <ExternalLink className="w-3 h-3 opacity-80 shrink-0" />
              </a>

              <a
                href="https://www.psproject.org/?p=3074"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200/80 shrink-0 whitespace-nowrap active:scale-95"
                title="คลังเอกสารโครงการ กพด."
              >
                <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="whitespace-nowrap">คลังเอกสาร</span>
                <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
              </a>
            </div>
          </header>
        )}

        {/* Content Area - Optimized for Mobile, Tablet (iPad), and Desktop */}
        <main ref={mainRef} className={`relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full transition-all duration-300 ease-in-out typo-app-body overscroll-contain touch-pan-y ${
          isFullScreenGallery 
            ? "p-0 h-full max-w-full bg-slate-50" 
            : "p-4 sm:p-6 md:p-8 pb-24 sm:pb-12 w-full max-w-[1760px] mx-auto h-full"
        }`}>
          {/* Dynamic transition loading state */}
          {isTabChanging && (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 transition-all duration-300 min-h-[400px] bg-slate-50/90 backdrop-blur-2xs">
              <div className="bg-white border border-slate-200/90 text-slate-900 shadow-xl rounded-2xl p-6 sm:p-8 flex flex-col items-center max-w-sm text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="relative w-14 h-14 flex items-center justify-center mb-4">
                  <div className="absolute inset-0 rounded-full animate-ping opacity-75 bg-indigo-100/60"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600 relative z-10" />
                </div>
                <h3 className="text-sm font-black mb-1.5 typo-app-chart-title text-indigo-950">
                  กำลังจัดระเบียบโครงสร้างข้อมูล...
                </h3>
                <p className="text-xs text-slate-500 font-medium typo-app-subtext">
                  ระบบกำลังประมวลผลโมดูลแผน กพด. ฉบับที่ 5 และโหลดความเร็วสูงพิเศษ
                </p>
              </div>
            </div>
          )}

          {/* Dynamic view rendering */}
          <div className={isFullScreenGallery ? "w-full min-h-screen" : "space-y-5 sm:space-y-6 lg:space-y-7 w-full"}>
            <Suspense fallback={<ViewLoader />}>
              {visitedTabs["executiveOnePage"] && (
                <div className={activeTab === "executiveOnePage" ? "block animate-tab-fade" : "hidden"}>
                  <UniversalPageBanner pageKey="executiveOnePage" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <ExecutiveOnePageView
                    reports={reports}
                    onNavigateToDocument={(id) => {
                      setSelectedReportId(id);
                      setActiveTab("document");
                    }}
                    onOpenDashboard={() => setActiveTab("dashboard")}
                  />
                </div>
              )}

              {visitedTabs["executiveStation"] && (
                <div className={activeTab === "executiveStation" ? "block animate-tab-fade" : "hidden"}>
                  <UniversalPageBanner pageKey="executiveStation" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <ExecutiveStationView
                    reports={reports}
                    onSelectReport={handleSelectReport}
                    onNavigateToDocument={(id) => {
                      setSelectedReportId(id);
                      setActiveTab("document");
                    }}
                    onOpenSubmissionTracker={() => setActiveTab("submissionTracker")}
                    onOpenMultiPhaseTracker={() => setActiveTab("multiPhaseTracker")}
                    onOpenPhotoGallery={() => setActiveTab("photoGallery")}
                    onOpenVideoGallery={() => setActiveTab("videoGallery")}
                    onOpenSchoolDirectoryModal={handleOpenSchoolModal}
                    onOpenExecutiveOnePage={() => setActiveTab("executiveOnePage")}
                  />
                </div>
              )}

              {visitedTabs["periodicAnalysis"] && (
                <div className={activeTab === "periodicAnalysis" ? "block animate-tab-fade" : "hidden"}>
                  <UniversalPageBanner pageKey="periodicAnalysis" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <PeriodicAndCumulativeAnalysis
                    reports={reports}
                    selectedDivision="ALL"
                    onSelectDivision={() => {}}
                    useArabicNumerals={true}
                  />
                </div>
              )}

              {visitedTabs["rankingsAndHonor"] && (
                <div className={activeTab === "rankingsAndHonor" ? "block animate-tab-fade" : "hidden"}>
                  <UniversalPageBanner pageKey="rankingsAndHonor" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <RankingsAndHonorView
                    reports={reports}
                    onSelectReport={handleSelectReport}
                    onNavigateToDocument={(id) => {
                      setSelectedReportId(id);
                      setActiveTab("document");
                    }}
                    onOpenDashboard={() => setActiveTab("dashboard")}
                    onSelectSchoolFilter={(schoolName) => {
                      setSchoolFilter(schoolName);
                      setGoalFilter("all");
                      setActiveTab("document");
                    }}
                  />
                </div>
              )}

              {visitedTabs["dashboard"] && (
                <div className={activeTab === "dashboard" ? "block animate-tab-fade" : "hidden"}>
                  <Dashboard 
                    isActive={activeTab === "dashboard"}
                    reports={reports} 
                    onSelectReport={handleSelectReport} 
                    onAutoFetchData={handleAutoFetchAllData}
                    onOpenAnnualReport2568={() => setActiveTab("report2568")}
                    onOpenExecutiveStation={() => setActiveTab("executiveStation")}
                    onOpenRankingsAndHonor={() => setActiveTab("rankingsAndHonor")}
                    onOpenReportsDirectory={() => setActiveTab("reportsDirectory")}
                    onOpenKpiConsistencyExplorer={() => setActiveTab("kpiConsistencyExplorer")}
                    onOpenExecutiveSummary={() => setIsExecutiveSummaryOpen(true)}
                    onOpenExecutiveOnePage={() => setActiveTab("executiveOnePage")}
                    onOpenSubmissionTracker={() => setActiveTab("submissionTracker")}
                    onOpenPhotoGallery={() => setActiveTab("photoGallery")}
                    onOpenVideoGallery={() => setActiveTab("videoGallery")}
                    onOpenMultiPhaseTracker={() => setActiveTab("multiPhaseTracker")}
                    onOpenBatchExport={() => setIsBatchExportOpen(true)}
                    onOpenColumnMapper={() => setIsColumnMapperOpen(true)}
                    onOpenOfflineModal={() => setIsOfflineModalOpen(true)}
                    onOpenSchoolDirectoryModal={handleOpenSchoolModal}
                    onBookSchoolReport={handleBookSchoolReport}
                    onOpenThailandMap={() => setActiveTab("thailandMap")}
                    onOpenBannerCustomizer={!isPublished ? handleOpenBannerCustomizer : undefined}
                    isOnline={isOnline && !isSimulatedOffline}
                    offlineDraftsCount={offlineDrafts.length}
                    isSyncing={isSyncing}
                    onSelectSchoolFilter={(schoolName) => {
                      setSchoolFilter(schoolName);
                      setGoalFilter("all");
                      setActiveTab("document");
                    }}
                    onSelectGoalFilter={(goalCode) => {
                      setGoalFilter(goalCode);
                      setSchoolFilter("");
                      setActiveTab("document");
                    }}
                  />
                </div>
              )}

              {activeTab === "thailandMap" && (
                <div className="block animate-tab-fade">
                  <UniversalPageBanner pageKey="thailandMap" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <GISMapCard
                    reports={reports}
                    onSelectSchoolFilter={(schoolName) => {
                      setSchoolFilter(schoolName);
                      setGoalFilter("all");
                      setActiveTab("document");
                    }}
                    onFilterDashboardSchool={(schoolName) => {
                      setSchoolFilter(schoolName);
                      setActiveTab("dashboard");
                    }}
                    selectedSchoolFilter={schoolFilter}
                    onOpenSchoolDirectoryModal={handleOpenSchoolModal}
                  />
                </div>
              )}

              {activeTab === "schoolDirectory" && (
                <div className="block animate-tab-fade">
                  <UniversalPageBanner pageKey="schoolDirectory" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <SchoolDirectoryModal
                    isOpen={true}
                    isEmbedded={true}
                    onClose={() => setActiveTab("dashboard")}
                    onBookSchool={handleBookSchoolReport}
                    onSelectSchool={(schoolName) => {
                      setSchoolFilter(schoolName);
                      setGoalFilter("all");
                      setActiveTab("document");
                    }}
                  />
                </div>
              )}

              {activeTab === "multiPhaseTracker" && (
                <div className="block animate-tab-fade">
                  <UniversalPageBanner pageKey="multiPhaseTracker" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <MultiPhaseTrackerModal
                    isOpen={true}
                    isEmbedded={true}
                    onClose={() => setActiveTab("dashboard")}
                    reports={reports}
                    onSelectReport={(reportId) => {
                      setSelectedReportId(reportId);
                      setActiveTab("document");
                    }}
                    onAddNewPhaseReport={handleAddNewPhaseReport}
                  />
                </div>
              )}

              {activeTab === "submissionTracker" && (
                <div className="block animate-tab-fade">
                  <UniversalPageBanner pageKey="submissionTracker" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <SubmissionTrackerModal
                    isOpen={true}
                    isEmbedded={true}
                    onClose={() => setActiveTab("dashboard")}
                    reports={reports}
                  />
                </div>
              )}

              {activeTab === "photoGallery" && (
                <div className="block animate-tab-fade">
                  <UniversalPageBanner pageKey="photoGallery" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <ActivityPhotoGalleryModal
                    isOpen={true}
                    isEmbedded={true}
                    onClose={() => setActiveTab("document")}
                    reports={reports}
                    onSelectReport={(reportId) => {
                      setSelectedReportId(reportId);
                      setActiveTab("document");
                    }}
                  />
                </div>
              )}

              {activeTab === "videoGallery" && (
                <div className="block animate-tab-fade">
                  <UniversalPageBanner pageKey="videoGallery" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <ActivityVideoGalleryModal
                    isOpen={true}
                    isEmbedded={true}
                    onClose={() => setActiveTab("document")}
                    reports={reports}
                    onSelectReport={(reportId) => {
                      setSelectedReportId(reportId);
                      setActiveTab("document");
                    }}
                  />
                </div>
              )}

              {activeTab === "geminiAssistant" && (
                <div className="block animate-tab-fade">
                  <UniversalPageBanner pageKey="geminiAssistant" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <GeminiAssistantModal
                    isOpen={true}
                    isEmbedded={true}
                    onClose={() => setActiveTab("dashboard")}
                    totalReportsCount={reports.length}
                    selectedSchoolName={selectedReport?.schoolName}
                  />
                </div>
              )}

              {activeTab === "predictiveTrends" && (
                <div className="block animate-tab-fade">
                  <UniversalPageBanner pageKey="predictiveTrends" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <PredictiveTrendsView
                    reports={reports}
                    onSelectSchool={(schoolName) => {
                      setSchoolFilter(schoolName);
                      setActiveTab("dashboard");
                    }}
                    onNavigateToDocument={(schoolName) => {
                      const foundReport = reports.find((r) => isSchoolMatch(r.schoolName || "", schoolName));
                      if (foundReport) {
                        setSelectedReportId(foundReport.id);
                      }
                      setSchoolFilter(schoolName);
                      setActiveTab("document");
                    }}
                  />
                </div>
              )}

              {visitedTabs["report2568"] && (
                <div className={activeTab === "report2568" ? "block animate-tab-fade" : "hidden"}>
                  <AnnualReport2568View onOpenBannerCustomizer={!isPublished ? handleOpenBannerCustomizer : undefined} />
                </div>
              )}

              {visitedTabs["systemUserManual"] && (
                <div className={activeTab === "systemUserManual" ? "block animate-tab-fade" : "hidden"}>
                  <UniversalPageBanner pageKey="systemUserManual" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <SystemUserManual />
                </div>
              )}

              {visitedTabs["plan5Guide"] && (
                <div className={activeTab === "plan5Guide" ? "block animate-tab-fade" : "hidden"}>
                  <UniversalPageBanner pageKey="plan5Guide" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <ChildDevPlan5Guide />
                </div>
              )}

              {visitedTabs["calendarGuide"] && (
                <div className={activeTab === "calendarGuide" ? "block animate-tab-fade" : "hidden"}>
                  <UniversalPageBanner pageKey="calendarGuide" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <SchoolCalendarGuide />
                </div>
              )}

              {visitedTabs["dailyRoutine"] && (
                <div className={activeTab === "dailyRoutine" ? "block animate-tab-fade" : "hidden"}>
                  <UniversalPageBanner pageKey="dailyRoutine" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <DailyRoutineGuide />
                </div>
              )}

              {visitedTabs["indicators"] && (
                <div className={activeTab === "indicators" ? "block animate-tab-fade" : "hidden"}>
                  <UniversalPageBanner pageKey="indicators" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <IndicatorsDatabase />
                </div>
              )}

              {visitedTabs["kpiConsistencyExplorer"] && (
                <div className={activeTab === "kpiConsistencyExplorer" ? "block animate-tab-fade" : "hidden"}>
                  <UniversalPageBanner pageKey="kpiConsistencyExplorer" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <KpiConsistencyExplorer
                    reports={reports}
                    onSelectReport={(id) => {
                      setSelectedReportId(id);
                      setActiveTab("document");
                    }}
                  />
                </div>
              )}

              {visitedTabs["problems"] && (
                <div className={activeTab === "problems" ? "block animate-tab-fade" : "hidden"}>
                  <UniversalPageBanner pageKey="problems" onOpenCustomizer={handleOpenBannerCustomizer} className="mb-4 no-print" />
                  <ProblemsView
                    reports={reports}
                    onSelectReport={setSelectedReportId}
                    onNavigateToDocument={(id) => {
                      setSelectedReportId(id);
                      setActiveTab("document");
                    }}
                    onOpenMultiPhaseTracker={() => setActiveTab("multiPhaseTracker")}
                  />
                </div>
              )}

              {visitedTabs["reportsDirectory"] && (
                <div className={activeTab === "reportsDirectory" ? "block animate-tab-fade" : "hidden"}>
                  <ReportsDirectoryView
                    reports={reports}
                    onSelectReport={(reportId) => {
                      setSelectedReportId(reportId);
                      setActiveTab("document");
                    }}
                    onOpenDashboard={() => setActiveTab("dashboard")}
                    onOpenExecutiveOnePage={() => setActiveTab("executiveOnePage")}
                    onOpenBannerCustomizer={!isPublished ? handleOpenBannerCustomizer : undefined}
                  />
                </div>
              )}

              {visitedTabs["document"] && (
                <div className={activeTab === "document" ? "block animate-tab-fade" : "hidden"}>
                  <DashboardFullBanner
                    pageKey="document"
                    reports={reports}
                    kpis={{ total: reports.length, completed: reports.length }}
                    onOpenQrModal={() => setIsReportQrModalOpen(true)}
                    onOpenCustomizer={handleOpenBannerCustomizer}
                    className="mb-4 no-print"
                  />
                  <A4Document
                    report={selectedReport}
                    reports={reports}
                    isSyncing={isSyncing}
                    onSelectReport={setSelectedReportId}
                    onEditReport={handleEditReport}
                    onUpdateReport={handleUpdateReport}
                    onDeleteReport={handleDeleteReport}
                    onOpenMultiPhaseTracker={() => setActiveTab("multiPhaseTracker")}
                    onOpenBatchExport={handleOpenBatchExport}
                    schoolFilter={schoolFilter}
                    setSchoolFilter={setSchoolFilter}
                    goalFilter={goalFilter}
                    setGoalFilter={setGoalFilter}
                    onOpenQrModal={() => setIsReportQrModalOpen(true)}
                  />
                </div>
              )}
            </Suspense>
          </div>
        </main>

        <Suspense fallback={null}>
          <ReportQrCodeModal
            isOpen={isReportQrModalOpen}
            onClose={() => setIsReportQrModalOpen(false)}
          />

          {isBatchExportOpen && (
            <BatchExportModal
              isOpen={isBatchExportOpen}
              onClose={() => setIsBatchExportOpen(false)}
              reports={reports}
              initialSelectedIds={batchExportOptions.initialSelectedIds}
              initialSchoolFilter={batchExportOptions.initialSchoolFilter}
              initialGoalFilter={batchExportOptions.initialGoalFilter}
              initialFormat={batchExportOptions.initialFormat}
            />
          )}

          {isColumnMapperOpen && (
            <ColumnMapperModal
              isOpen={isColumnMapperOpen}
              onClose={() => setIsColumnMapperOpen(false)}
              onApplyMapping={(mapping) => {
                // Re-sync with active mapping schema applied
                handleForceLiveSync();
              }}
              onForceSync={handleForceLiveSync}
              isSyncing={isSyncing}
              lastSyncedTime={lastSyncedTime}
              totalReportsCount={reports.length}
            />
          )}

          {/* Offline-First Field PWA Sync Modal */}
          {isOfflineModalOpen && (
            <OfflineSyncModal
              isOpen={isOfflineModalOpen}
              onClose={() => setIsOfflineModalOpen(false)}
              isOnline={isOnline}
              offlineDrafts={offlineDrafts}
              onDeleteDraft={handleDeleteOfflineDraft}
              onSyncDraftsNow={handleSyncOfflineDraftsNow}
              onSelectDraftToEdit={(draft) => {
                setEditingReport(draft);
              }}
              onToggleSimulateOffline={() => {
                setIsSimulatedOffline(!isSimulatedOffline);
              }}
              isSimulatedOffline={isSimulatedOffline}
            />
          )}

          {/* Universal Banner Customizer Modal */}
          <BannerCustomizerModal
            isOpen={isBannerCustomizerOpen}
            onClose={() => setIsBannerCustomizerOpen(false)}
            currentPageKey={bannerCustomizerPageKey}
          />
        </Suspense>
        
        {/* Mini Status Footer */}
        <footer className="bg-white border-t border-slate-200/80 py-1.5 text-center text-[10px] text-slate-400 no-print mt-auto shrink-0">
          <div className="px-4 sm:px-6 space-y-0.5 max-w-full overflow-hidden leading-tight">
            <p className="font-semibold text-slate-500 text-[9.5px] sm:text-[10.5px] whitespace-nowrap truncate">ระบบติดตามการรายงานผลการจัดกิจกรรม แผนพัฒนาเด็กและเยาวชนในถิ่นทุรกันดาร (กพด. ฉบับที่ 5)</p>
            <p className="text-[9px] sm:text-[10px] whitespace-nowrap truncate text-slate-400">© 2569 โรงเรียนตำรวจตระเวนชายแดนในสังกัดกองบังคับการตำรวจตระเวนชายแดนภาค 2</p>
          </div>
        </footer>
      </div>

      <Suspense fallback={null}>
        {/* Gemini AI Interactive Assistant Modal */}
        {isGeminiModalOpen && (
          <GeminiAssistantModal
            isOpen={isGeminiModalOpen}
            onClose={() => setIsGeminiModalOpen(false)}
            totalReportsCount={reports.length}
            selectedSchoolName={selectedReport?.schoolName}
          />
        )}

        {/* Submission Tracker & Official Notice System Modal */}
        {isSubmissionTrackerOpen && (
          <SubmissionTrackerModal
            isOpen={isSubmissionTrackerOpen}
            onClose={() => setIsSubmissionTrackerOpen(false)}
            reports={reports}
          />
        )}

        {/* Executive Summary Modal */}
        {isExecutiveSummaryOpen && (
          <ExecutiveSummaryModal
            isOpen={isExecutiveSummaryOpen}
            onClose={() => setIsExecutiveSummaryOpen(false)}
            reports={reports}
          />
        )}

        {/* 53 Schools Directory Modal */}
        {isSchoolDirectoryOpen && (
          <SchoolDirectoryModal
            isOpen={isSchoolDirectoryOpen}
            initialSchoolName={targetSchoolForModal}
            onClose={() => {
              setIsSchoolDirectoryOpen(false);
              setTargetSchoolForModal("");
            }}
            onBookSchool={(schoolName) => {
              setIsSchoolDirectoryOpen(false);
              setTargetSchoolForModal("");
              handleBookSchoolReport(schoolName);
            }}
            onSelectSchool={(schoolName) => {
              setSchoolFilter(schoolName);
              setGoalFilter("all");
              setActiveTab("document");
              setIsSchoolDirectoryOpen(false);
              setTargetSchoolForModal("");
            }}
          />
        )}

        {/* Multi-Phase Activity Progress Tracker Modal */}
        {isMultiPhaseTrackerOpen && (
          <MultiPhaseTrackerModal
            isOpen={isMultiPhaseTrackerOpen}
            onClose={() => setIsMultiPhaseTrackerOpen(false)}
            reports={reports}
            onSelectReport={(reportId) => {
              setSelectedReportId(reportId);
              setActiveTab("document");
            }}
            onAddNewPhaseReport={handleAddNewPhaseReport}
          />
        )}

        {/* Activity Photo Gallery & Multimedia Hub Modal */}
        {isPhotoGalleryOpen && (
          <ActivityPhotoGalleryModal
            isOpen={isPhotoGalleryOpen}
            onClose={() => setIsPhotoGalleryOpen(false)}
            reports={reports}
            onSelectReport={(reportId) => {
              setSelectedReportId(reportId);
              setActiveTab("document");
            }}
          />
        )}

        {/* Full-screen Overlay Editing Form */}
        {editingReport && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs no-print">
            <div className="w-full max-h-[90vh] overflow-y-auto rounded-xl animate-scaleUp">
              <ReportForm
                report={editingReport}
                isSchoolLocked={isEditingSchoolLocked}
                onSave={handleSaveForm}
                onSaveOfflineDraft={handleSaveOfflineDraft}
                onClose={() => {
                  setEditingReport(null);
                  setIsEditingSchoolLocked(false);
                }}
              />
            </div>
          </div>
        )}
      </Suspense>

      {/* Real-time Auto-Update Toast Notification Banner */}
      {newReportToast && (
        <div className="fixed bottom-20 right-6 z-50 flex items-center gap-3.5 bg-slate-900/95 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-emerald-500/40 backdrop-blur-md animate-slideUp max-w-md no-print">
          <div className="relative flex items-center justify-center shrink-0">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <div className="flex-1 text-xs">
            <p className="font-extrabold text-emerald-400 flex items-center gap-1.5">
              <span>🟢 ระบบอัปเดตรายงานใหม่อัตโนมัติ</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">Live Auto-Sync</span>
            </p>
            <p className="text-slate-200 mt-0.5 leading-tight">{newReportToast.message}</p>
          </div>
          <button
            onClick={() => setNewReportToast(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="ปิดการแจ้งเตือน"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 border border-indigo-500/20 no-print cursor-pointer ${
          showScrollTop 
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" 
            : "opacity-0 translate-y-4 scale-75 pointer-events-none"
        }`}
        title="เลื่อนขึ้นบนสุด"
        id="scroll-to-top-btn"
      >
        <ArrowUp className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
      </button>
    </div>
  );
}

